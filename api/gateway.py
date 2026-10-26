"""
OpenLens Backend Gateway API
Shared REST entry point for Dev and Archy modes.

Privacy design:
- Payload minimisation enforced before any remote hop.
- Secret scanning/redaction applied before model or Snowflake calls.
- Local deterministic checks ALWAYS run first; remote calls are supplementary.
- If Snowflake or the model gateway is unavailable, local results are still returned.
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from dataclasses import asdict
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Internal services
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.ast_scanner import ASTScanner, ScanResult
from engine.project_analyzer import ProjectAnalyzer
from services.snowflake_bridge import (
    SnowflakeBridge, SnowflakeConfig,
    ScanMetricPayload, FindingFeedbackPayload, EvaluationRunPayload,
    get_bridge,
)
from services.retrieval import RetrievalService
from services.model_adapter import ModelGateway, ModelGatewayConfig

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect Snowflake (non-fatal if unavailable)
    bridge = get_bridge()
    await bridge.connect()
    logger.info("Snowflake available: %s", bridge.available)
    yield
    await bridge.close()


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="OpenLens Backend Gateway",
    description=(
        "Shared reasoning and orchestration API for OpenLens Dev (VS Code) "
        "and OpenLens Archy (web workspace). "
        "Coordinates local AST analysis, Snowflake knowledge retrieval, "
        "and open-source model inference."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5500"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ScanRequest(BaseModel):
    """Files to scan — paths relative to the workspace root approved by the user."""
    file_paths: list[str] = Field(..., description="Relative file paths approved for scanning.")
    workspace_root: str = Field(..., description="Absolute path to the workspace root.")
    run_duplication: bool = True
    run_unused_imports: bool = True
    run_complexity: bool = True
    architecture_rules_path: Optional[str] = Field(
        None, description="Relative path to exported architecture rules JSON."
    )

    class Config:
        json_schema_extra = {
            "example": {
                "file_paths": ["engine/ast_scanner.py", "api/gateway.py"],
                "workspace_root": "/home/user/my_project",
                "run_duplication": True,
                "run_unused_imports": True,
                "run_complexity": True,
            }
        }


class PatternQueryRequest(BaseModel):
    query: str = Field(..., description="Natural-language description of the pattern needed.")
    category: Optional[str] = None
    applicable_layer: Optional[str] = None
    limit: int = Field(5, ge=1, le=20)


class FeedbackRequest(BaseModel):
    finding_category: str
    action: str = Field(..., pattern="^(accepted|dismissed|incorrect)$")
    language: str = "python"


class EvaluationRunRequest(BaseModel):
    suite_name: str
    suite_version: str
    model_id: str
    model_version: str
    prompt_version: str
    rule_set_version: str
    run_by: str
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    avg_latency_ms: float
    notes: str = ""


# ---------------------------------------------------------------------------
# Health / Status
# ---------------------------------------------------------------------------

@app.get("/health", tags=["status"])
async def health():
    bridge = get_bridge()
    return {
        "status": "ok",
        "snowflake_available": bridge.available,
        "version": "0.1.0",
    }


@app.get("/status", tags=["status"])
async def status():
    bridge = get_bridge()
    return {
        "services": {
            "local_ast_engine": "available",
            "snowflake": "connected" if bridge.available else "offline",
            "model_gateway": "available",
        },
        "note": (
            "Local deterministic checks run regardless of Snowflake or model availability. "
            "Remote features degrade gracefully when services are offline."
        ),
    }



# ---------------------------------------------------------------------------
# Dynamic Autonomous Project Analysis (Archy + Dev Model Generator)
# ---------------------------------------------------------------------------

@app.get("/api/project/analyze", tags=["project"])
@app.post("/api/project/analyze", tags=["project"])
async def analyze_project(path: str = "."):
    """
    Autonomously scans ANY user repository, inspects files, imports, classes, and dependencies,
    and dynamically generates the complete model representation for both Archy and Dev.
    """
    try:
        resolved_path = Path(path).resolve()
        analyzer = ProjectAnalyzer(resolved_path)
        return analyzer.analyze()
    except Exception as e:
        logger.error("Project analysis failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Dev — Maintainability Scan
# ---------------------------------------------------------------------------

@app.post("/dev/scan", tags=["dev"])
async def scan_files(req: ScanRequest):
    """
    Run deterministic AST checks on the specified files.
    Files must be within the approved workspace root.
    No source content is transmitted; analysis is performed locally.
    """
    start = time.monotonic()

    # Validate that all paths stay within the workspace root
    root = Path(req.workspace_root).resolve()
    safe_paths: list[Path] = []
    rejected: list[str] = []

    for rel in req.file_paths:
        candidate = (root / rel).resolve()
        try:
            candidate.relative_to(root)      # raises ValueError if outside root
            if candidate.exists() and candidate.suffix == ".py":
                safe_paths.append(candidate)
            else:
                rejected.append(rel)
        except ValueError:
            rejected.append(rel)             # path traversal attempt — silently skip

    if not safe_paths:
        raise HTTPException(status_code=400, detail="No valid Python files found in the approved scope.")

    # Load architecture rules if provided
    arch_rules: list[dict] = []
    if req.architecture_rules_path:
        rules_path = (root / req.architecture_rules_path).resolve()
        try:
            rules_path.relative_to(root)
            if rules_path.exists():
                import json
                data = json.loads(rules_path.read_text())
                arch_rules = data.get("rules", []) if isinstance(data, dict) else data
        except Exception:
            pass   # rules are optional; do not break the scan

    scanner = ASTScanner(
        run_duplication=req.run_duplication,
        run_unused_imports=req.run_unused_imports,
        run_complexity=req.run_complexity,
        architecture_rules=arch_rules or None,
    )

    result: ScanResult = scanner.scan(safe_paths)
    elapsed_ms = int((time.monotonic() - start) * 1000)

    # Record aggregate metric to Snowflake (privacy-safe; no source content)
    bridge = get_bridge()
    await bridge.record_scan_metric(ScanMetricPayload(
        scan_scope="file",
        file_count=result.files_scanned,
        finding_count=len(result.findings),
        scan_duration_ms=elapsed_ms,
        model_invoked=False,
        snowflake_queried=False,
        error_occurred=len(result.errors) > 0,
        error_category=result.errors[0][:64] if result.errors else None,
    ))

    return {
        "files_scanned": result.files_scanned,
        "files_rejected": rejected,
        "duration_ms": elapsed_ms,
        "finding_count": len(result.findings),
        "findings": [asdict(f) for f in result.findings],
        "errors": result.errors,
        "snowflake_metric_recorded": bridge.available,
        "note": (
            "Findings are from deterministic static analysis. "
            "Confidence and rationale are tool-observed, not AI-inferred."
        ),
    }


@app.post("/dev/feedback", tags=["dev"])
async def record_feedback(req: FeedbackRequest):
    """Record anonymised per-category finding feedback for product quality."""
    bridge = get_bridge()
    ok = await bridge.record_finding_feedback(FindingFeedbackPayload(
        finding_category=req.finding_category,
        action=req.action,
        language=req.language,
    ))
    return {"recorded": ok, "snowflake_available": bridge.available}


# ---------------------------------------------------------------------------
# Knowledge — Pattern Retrieval
# ---------------------------------------------------------------------------

@app.post("/knowledge/patterns", tags=["knowledge"])
async def search_patterns(req: PatternQueryRequest):
    """
    Semantic search over curated architectural patterns in Snowflake.
    Falls back to empty list when Snowflake is offline.
    No source code is sent in this request.
    """
    bridge = get_bridge()
    patterns = await bridge.search_patterns(
        query=req.query,
        category=req.category,
        applicable_layer=req.applicable_layer,
        limit=req.limit,
    )
    return {
        "query": req.query,
        "results": [
            {
                "pattern_id": p.pattern_id,
                "name": p.name,
                "category": p.category,
                "description": p.description,
                "rationale": p.rationale,
                "trade_offs": p.trade_offs,
                "example_snippet": p.example_snippet,
                "applicable_layers": p.applicable_layers,
                "tags": p.tags,
                "retrieval_score": p.retrieval_score,
            }
            for p in patterns
        ],
        "source": "snowflake" if bridge.available else "offline",
        "note": "Results retrieved from curated knowledge base; verify against your project context.",
    }


@app.get("/knowledge/rules/{project_id}", tags=["knowledge"])
async def get_project_rules(project_id: str):
    """Fetch active architecture rules for a project from Snowflake."""
    bridge = get_bridge()
    rules = await bridge.get_rules_for_project(project_id)
    return {
        "project_id": project_id,
        "rules": rules,
        "source": "snowflake" if bridge.available else "offline",
    }


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

@app.post("/evaluation/runs", tags=["evaluation"])
async def submit_evaluation_run(req: EvaluationRunRequest):
    """Submit a benchmark evaluation run result to Snowflake."""
    bridge = get_bridge()
    run_id = await bridge.submit_evaluation_run(EvaluationRunPayload(**req.model_dump()))
    if run_id is None and not bridge.available:
        return {"run_id": None, "status": "skipped", "reason": "Snowflake offline"}
    if run_id is None:
        raise HTTPException(status_code=500, detail="Failed to record evaluation run.")
    return {"run_id": run_id, "status": "recorded"}


# ---------------------------------------------------------------------------
# Archy — Architecture Suggestion (future AI integration point)
# ---------------------------------------------------------------------------

@app.post("/archy/suggest", tags=["archy"])
async def suggest_architecture(request: Request):
    """
    Placeholder for Archy AI-assisted architecture suggestion endpoint.
    Accepts requirements/constraints, returns architecture proposal.
    Full implementation in Phase 5 (model gateway integration).
    """
    body = await request.json()
    return {
        "status": "stub",
        "message": (
            "Architecture suggestion via open-source model gateway is in Phase 5. "
            "OpenLens Archy web workspace (openlens-archy/index.html) is available now."
        ),
        "received_requirements": list(body.keys()),
        "next_steps": [
            "Open OpenLens Archy web workspace for interactive design.",
            "Export architecture rules as JSON from the ADR panel.",
            "Load rules in Dev scan via architecture_rules_path parameter.",
        ],
    }
