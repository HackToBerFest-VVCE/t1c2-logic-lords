"""
OpenLens Snowflake Bridge Service
Curated knowledge retrieval and evaluation data management via Snowflake Cortex.

IMPORTANT: This module deliberately avoids transmitting raw source code or secrets.
Only sanitised, consented, structured metadata is sent to Snowflake.
"""

from __future__ import annotations

import hashlib
import logging
import os
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class SnowflakeConfig:
    account: str = field(default_factory=lambda: os.environ.get("SNOWFLAKE_ACCOUNT", ""))
    user: str = field(default_factory=lambda: os.environ.get("SNOWFLAKE_USER", ""))
    private_key_path: str = field(default_factory=lambda: os.environ.get("SNOWFLAKE_PRIVATE_KEY_PATH", ""))
    warehouse: str = field(default_factory=lambda: os.environ.get("SNOWFLAKE_WAREHOUSE", "OPENLENS_WH"))
    database: str = "OPENLENS_DB"
    role: str = field(default_factory=lambda: os.environ.get("SNOWFLAKE_ROLE", "OPENLENS_ROLE"))
    # Never hard-code credentials; always read from env or secret manager.

    def is_configured(self) -> bool:
        return bool(self.account and self.user)


# ---------------------------------------------------------------------------
# Data contracts (mirrors the SQL schema shapes)
# ---------------------------------------------------------------------------

@dataclass
class PatternResult:
    pattern_id: str
    name: str
    category: str
    description: str
    rationale: str
    trade_offs: str
    example_snippet: str
    applicable_layers: list[str]
    tags: list[str]
    retrieval_score: float = 0.0


@dataclass
class ScanMetricPayload:
    """Privacy-safe aggregate scan metric — no source content."""
    scan_scope: str          # 'file' | 'project' | 'changed_files'
    file_count: int
    finding_count: int
    scan_duration_ms: int
    model_invoked: bool
    snowflake_queried: bool
    error_occurred: bool
    error_category: Optional[str] = None


@dataclass
class FindingFeedbackPayload:
    finding_category: str
    action: str              # 'accepted' | 'dismissed' | 'incorrect'
    language: str = "python"


@dataclass
class EvaluationRunPayload:
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
# Snowflake Bridge (production-ready interface stub)
# ---------------------------------------------------------------------------

class SnowflakeBridge:
    """
    Provider-neutral interface to Snowflake for curated knowledge retrieval
    and evaluation data management.

    Design:
    - All methods are async for compatibility with FastAPI workers.
    - The bridge NEVER receives raw source code or file content.
    - Privacy filtering must have occurred upstream before calling any method.
    - If Snowflake is unavailable, methods return graceful fallback values.
    """

    def __init__(self, config: Optional[SnowflakeConfig] = None):
        self._config = config or SnowflakeConfig()
        self._conn: Any = None   # snowflake.connector.connection.SnowflakeConnection
        self._available = False

    # -----------------------------------------------------------------------
    # Connection lifecycle
    # -----------------------------------------------------------------------

    async def connect(self) -> bool:
        """
        Establish a Snowflake connection using key-pair or OAuth authentication.
        Returns True if connected, False if unavailable (offline / misconfigured).
        Never raises; callers should treat False as graceful degradation.
        """
        if not self._config.is_configured():
            logger.warning("Snowflake not configured — operating in offline mode.")
            self._available = False
            return False

        try:
            # Import inside the method so the service works without the package
            # when Snowflake is not needed locally.
            import snowflake.connector  # type: ignore

            self._conn = snowflake.connector.connect(
                account=self._config.account,
                user=self._config.user,
                private_key_file=self._config.private_key_path or None,
                warehouse=self._config.warehouse,
                database=self._config.database,
                role=self._config.role,
                application="OpenLens",
                session_parameters={"QUERY_TAG": "openlens_bridge"},
            )
            self._available = True
            logger.info("Snowflake connection established.")
            return True
        except Exception as exc:
            logger.warning("Snowflake unavailable: %s — local-only mode active.", exc)
            self._available = False
            return False

    async def close(self) -> None:
        if self._conn and self._available:
            try:
                self._conn.close()
            except Exception:
                pass
        self._available = False

    @property
    def available(self) -> bool:
        return self._available

    # -----------------------------------------------------------------------
    # Knowledge Retrieval — Architectural Patterns
    # -----------------------------------------------------------------------

    async def search_patterns(
        self,
        query: str,
        category: Optional[str] = None,
        applicable_layer: Optional[str] = None,
        limit: int = 5,
    ) -> list[PatternResult]:
        """
        Semantic search over the ARCHITECTURAL_PATTERNS table.
        Uses Snowflake Cortex SEARCH if available; falls back to LIKE query.

        Args:
            query:            Natural-language description of the needed pattern.
            category:         Optional filter — 'Behavioral' | 'Structural' | etc.
            applicable_layer: Optional filter — 'backend' | 'frontend' | etc.
            limit:            Maximum number of results.

        Returns:
            List of PatternResult, empty list if Snowflake is unavailable.
        """
        if not self._available:
            logger.debug("Snowflake unavailable — returning empty pattern results.")
            return []

        try:
            # Cortex SEARCH path (preferred when enabled in the account)
            cortex_sql = """
                SELECT pattern_id, name, category, description, rationale,
                       trade_offs, example_snippet, applicable_layers, tags,
                       SEARCH_SCORE() AS score
                FROM TABLE(
                    OPENLENS_DB.KNOWLEDGE.ARCHITECTURAL_PATTERNS
                    MATCH (description, rationale, trade_offs)
                    AGAINST (:query)
                )
                WHERE (:category IS NULL OR category = :category)
                ORDER BY score DESC
                LIMIT :limit
            """
            params = {"query": query, "category": category, "limit": limit}
            rows = await self._execute(cortex_sql, params)
            return [self._row_to_pattern(r) for r in rows]
        except Exception:
            # Fallback to plain-text LIKE search
            return await self._fallback_pattern_search(query, category, applicable_layer, limit)

    async def _fallback_pattern_search(
        self,
        query: str,
        category: Optional[str],
        applicable_layer: Optional[str],
        limit: int,
    ) -> list[PatternResult]:
        sql = """
            SELECT pattern_id, name, category, description, rationale,
                   trade_offs, example_snippet, applicable_layers, tags,
                   0.5 AS score
            FROM OPENLENS_DB.KNOWLEDGE.ARCHITECTURAL_PATTERNS
            WHERE (LOWER(description) LIKE :kw OR LOWER(name) LIKE :kw)
              AND (:category IS NULL OR category = :category)
            LIMIT :limit
        """
        kw = f"%{query.lower()[:60]}%"
        params = {"kw": kw, "category": category, "limit": limit}
        try:
            rows = await self._execute(sql, params)
            return [self._row_to_pattern(r) for r in rows]
        except Exception as exc:
            logger.error("Pattern fallback search failed: %s", exc)
            return []

    @staticmethod
    def _row_to_pattern(row: dict) -> PatternResult:
        return PatternResult(
            pattern_id=row.get("PATTERN_ID", ""),
            name=row.get("NAME", ""),
            category=row.get("CATEGORY", ""),
            description=row.get("DESCRIPTION", ""),
            rationale=row.get("RATIONALE", ""),
            trade_offs=row.get("TRADE_OFFS", ""),
            example_snippet=row.get("EXAMPLE_SNIPPET", ""),
            applicable_layers=row.get("APPLICABLE_LAYERS") or [],
            tags=row.get("TAGS") or [],
            retrieval_score=float(row.get("SCORE", 0.0)),
        )

    # -----------------------------------------------------------------------
    # Knowledge Retrieval — Architecture Rules
    # -----------------------------------------------------------------------

    async def get_rules_for_project(self, project_id: str) -> list[dict]:
        """
        Fetches active architecture rules for a project.
        Used by Dev to enforce boundary constraints against active code.
        """
        if not self._available:
            return []
        sql = """
            SELECT rule_id, name, description, scope, severity, rationale,
                   source_layer, target_layer, allowed, verification_method,
                   rule_version
            FROM OPENLENS_DB.RULES.ARCHITECTURE_RULES
            WHERE project_id = :project_id AND active = TRUE
            ORDER BY severity, rule_id
        """
        try:
            return await self._execute(sql, {"project_id": project_id})
        except Exception as exc:
            logger.error("Failed to fetch rules: %s", exc)
            return []

    # -----------------------------------------------------------------------
    # Analytics Ingestion — Privacy-safe payloads only
    # -----------------------------------------------------------------------

    async def record_scan_metric(self, payload: ScanMetricPayload) -> bool:
        """Records aggregate scan performance — no source content."""
        if not self._available:
            return False
        sql = """
            INSERT INTO OPENLENS_DB.ANALYTICS.SCAN_METRICS
                (metric_id, scan_scope, file_count, finding_count,
                 scan_duration_ms, model_invoked, snowflake_queried,
                 error_occurred, error_category, session_id)
            VALUES
                (:id, :scope, :fc, :fnc, :ms, :mi, :sq, :err, :ec, :sid)
        """
        params = {
            "id": str(uuid.uuid4()),
            "scope": payload.scan_scope,
            "fc": payload.file_count,
            "fnc": payload.finding_count,
            "ms": payload.scan_duration_ms,
            "mi": payload.model_invoked,
            "sq": payload.snowflake_queried,
            "err": payload.error_occurred,
            "ec": payload.error_category,
            "sid": self._anon_session_id(),
        }
        try:
            await self._execute(sql, params)
            return True
        except Exception as exc:
            logger.warning("Failed to record scan metric: %s", exc)
            return False

    async def record_finding_feedback(self, payload: FindingFeedbackPayload) -> bool:
        """Records anonymised per-category finding feedback."""
        if not self._available:
            return False
        sql = """
            INSERT INTO OPENLENS_DB.ANALYTICS.FINDING_FEEDBACK
                (feedback_id, finding_category, action, language, session_id)
            VALUES (:id, :cat, :action, :lang, :sid)
        """
        try:
            await self._execute(sql, {
                "id": str(uuid.uuid4()),
                "cat": payload.finding_category,
                "action": payload.action,
                "lang": payload.language,
                "sid": self._anon_session_id(),
            })
            return True
        except Exception as exc:
            logger.warning("Failed to record finding feedback: %s", exc)
            return False

    async def submit_evaluation_run(self, payload: EvaluationRunPayload) -> Optional[str]:
        """
        Saves a benchmark evaluation run and computes F1.
        Returns the run_id if successful, None on failure.
        """
        if not self._available:
            return None
        run_id = str(uuid.uuid4())
        tp, fp, tn, fn = payload.true_positives, payload.false_positives, \
                         payload.true_negatives, payload.false_negatives

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

        sql = """
            INSERT INTO OPENLENS_DB.EVALUATION.EVALUATION_RUNS
                (run_id, suite_name, suite_version, model_id, model_version,
                 prompt_version, rule_set_version, run_by, total_cases,
                 true_positives, false_positives, true_negatives, false_negatives,
                 precision_score, recall_score, f1_score, avg_latency_ms, notes)
            VALUES
                (:rid, :sn, :sv, :mid, :mv, :pv, :rv, :rb, :tc,
                 :tp, :fp, :tn, :fn, :pre, :rec, :f1, :lat, :notes)
        """
        try:
            await self._execute(sql, {
                "rid": run_id,
                "sn": payload.suite_name, "sv": payload.suite_version,
                "mid": payload.model_id, "mv": payload.model_version,
                "pv": payload.prompt_version, "rv": payload.rule_set_version,
                "rb": payload.run_by,
                "tc": tp + fp + tn + fn,
                "tp": tp, "fp": fp, "tn": tn, "fn": fn,
                "pre": round(precision, 4), "rec": round(recall, 4),
                "f1": round(f1, 4),
                "lat": payload.avg_latency_ms,
                "notes": payload.notes,
            })
            return run_id
        except Exception as exc:
            logger.error("Failed to submit evaluation run: %s", exc)
            return None

    # -----------------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------------

    async def _execute(self, sql: str, params: dict) -> list[dict]:
        """Execute a parameterised SQL query and return rows as dicts."""
        if not self._conn:
            return []
        cursor = self._conn.cursor(snowflake.connector.DictCursor)
        try:
            cursor.execute(sql, params)
            return cursor.fetchall()
        finally:
            cursor.close()

    @staticmethod
    def _anon_session_id() -> str:
        """Returns an anonymised, non-reversible session identifier."""
        raw = os.environ.get("OPENLENS_SESSION_KEY", "anonymous")
        return hashlib.sha256(raw.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Module-level singleton (initialised by gateway on startup)
# ---------------------------------------------------------------------------
_bridge: Optional[SnowflakeBridge] = None


def get_bridge() -> SnowflakeBridge:
    global _bridge
    if _bridge is None:
        _bridge = SnowflakeBridge()
    return _bridge


@asynccontextmanager
async def lifespan_bridge():
    """FastAPI lifespan context manager for bridge connect/disconnect."""
    bridge = get_bridge()
    await bridge.connect()
    try:
        yield bridge
    finally:
        await bridge.close()
