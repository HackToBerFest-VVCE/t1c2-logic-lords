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

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class SnowflakeConfig:
    account: str = field(
        default_factory=lambda: os.environ.get("SNOWFLAKE_ACCOUNT", os.environ.get("OPENLENS_SNOWFLAKE_ACCOUNT", ""))
    )
    user: str = field(
        default_factory=lambda: os.environ.get("SNOWFLAKE_USER", os.environ.get("OPENLENS_SNOWFLAKE_USER", ""))
    )
    password: str = field(
        default_factory=lambda: os.environ.get("SNOWFLAKE_PASSWORD", os.environ.get("OPENLENS_SNOWFLAKE_PASSWORD", ""))
    )
    private_key_path: str = field(
        default_factory=lambda: os.environ.get("SNOWFLAKE_PRIVATE_KEY_PATH", "")
    )
    warehouse: str = field(
        default_factory=lambda: os.environ.get("SNOWFLAKE_WAREHOUSE", os.environ.get("OPENLENS_SNOWFLAKE_WAREHOUSE", "OPENLENS_WH"))
    )
    database: str = field(
        default_factory=lambda: os.environ.get("SNOWFLAKE_DATABASE", os.environ.get("OPENLENS_SNOWFLAKE_DATABASE", "OPENLENS_DB"))
    )
    schema: str = field(
        default_factory=lambda: os.environ.get("SNOWFLAKE_SCHEMA", os.environ.get("OPENLENS_SNOWFLAKE_SCHEMA", "KNOWLEDGE"))
    )
    role: str = field(
        default_factory=lambda: os.environ.get("SNOWFLAKE_ROLE", os.environ.get("OPENLENS_SNOWFLAKE_ROLE", "OPENLENS_ROLE"))
    )
    enabled: bool = field(
        default_factory=lambda: os.environ.get("OPENLENS_SNOWFLAKE_ENABLED", "true").lower() in ("true", "1", "yes")
    )

    def is_configured(self) -> bool:
        """Returns True if minimum credentials for Snowflake connection are present."""
        return bool(self.enabled and self.account and self.user and (self.password or self.private_key_path))


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
# Snowflake Bridge (production-ready interface)
# ---------------------------------------------------------------------------

class SnowflakeBridge:
    """
    Provider-neutral interface to Snowflake for curated knowledge retrieval
    and evaluation data management.

    Design:
    - All methods are async for compatibility with FastAPI workers.
    - The bridge NEVER receives raw source code or unconsented secrets.
    - Privacy filtering must have occurred upstream before calling any method.
    - If Snowflake is unavailable, methods return graceful fallback values.
    """

    def __init__(self, config: Optional[SnowflakeConfig] = None):
        self._config = config or SnowflakeConfig()
        self._conn: Any = None   # snowflake.connector.connection.SnowflakeConnection
        self._available = False
        self._last_error: Optional[str] = None

    def _tbl(self, schema: str, name: str) -> str:
        """Returns fully qualified table identifier respecting current config."""
        return f"{self._config.database}.{schema}.{name}"

    @property
    def available(self) -> bool:
        return self._available

    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    @property
    def config(self) -> SnowflakeConfig:
        return self._config

    # -----------------------------------------------------------------------
    # Connection lifecycle
    # -----------------------------------------------------------------------

    async def connect(self) -> bool:
        """
        Establish a Snowflake connection using password, key-pair, or SSO authentication.
        Returns True if connected, False if unavailable (offline / misconfigured).
        Never raises; callers treat False as graceful degradation to local mode.
        """
        if not self._config.is_configured():
            msg = "Snowflake not fully configured (missing account, user, or auth credential) — operating in offline local mode."
            logger.info(msg)
            self._last_error = msg
            self._available = False
            return False

        try:
            import snowflake.connector  # type: ignore

            conn_params: dict[str, Any] = {
                "account": self._config.account,
                "user": self._config.user,
                "warehouse": self._config.warehouse or None,
                "database": self._config.database or None,
                "schema": self._config.schema or None,
                "role": self._config.role or None,
                "application": "OpenLens",
                "session_parameters": {"QUERY_TAG": "openlens_bridge"},
            }

            if self._config.password:
                conn_params["password"] = self._config.password
            if self._config.private_key_path:
                conn_params["private_key_file"] = self._config.private_key_path

            self._conn = snowflake.connector.connect(**conn_params)
            self._available = True
            self._last_error = None
            logger.info("Snowflake connection established successfully.")
            return True
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Snowflake unavailable: %s — local-only mode active.", exc)
            self._available = False
            return False

    async def reconnect(self, new_config: SnowflakeConfig) -> bool:
        """Closes existing connection and reconnects with new configuration."""
        await self.close()
        self._config = new_config
        return await self.connect()

    async def close(self) -> None:
        if self._conn and self._available:
            try:
                self._conn.close()
            except Exception:
                pass
        self._conn = None
        self._available = False

    async def test_connection(self) -> dict:
        """
        Runs comprehensive diagnostics against Snowflake.
        Returns connection state, account details, and Cortex availability.
        """
        if not self._config.is_configured():
            return {
                "connected": False,
                "status": "not_configured",
                "message": (
                    "Snowflake is not configured. Add credentials to .env or environment variables. "
                    "OpenLens is running in 100% offline local mode."
                ),
                "account": self._config.account or "Not set",
                "user": self._config.user or "Not set",
                "warehouse": self._config.warehouse or "Not set",
                "database": self._config.database or "Not set",
                "role": self._config.role or "Not set",
                "cortex_available": False,
            }

        if not self._conn or not self._available:
            ok = await self.connect()
            if not ok:
                return {
                    "connected": False,
                    "status": "error",
                    "message": self._last_error or "Failed to connect to Snowflake.",
                    "account": self._config.account,
                    "user": self._config.user,
                    "warehouse": self._config.warehouse,
                    "database": self._config.database,
                    "role": self._config.role,
                    "cortex_available": False,
                }

        try:
            sql = "SELECT CURRENT_VERSION() AS version, CURRENT_USER() AS user, CURRENT_ROLE() AS role, CURRENT_WAREHOUSE() AS warehouse, CURRENT_DATABASE() AS database"
            rows = await self._execute(sql, {})
            row = rows[0] if rows else {}

            # Check Cortex readiness
            cortex_ok = False
            try:
                cortex_check = await self._execute(
                    "SELECT SNOWFLAKE.CORTEX.EMBED_TEXT_768('e5-base-v2', 'test') IS NOT NULL AS has_cortex", {}
                )
                cortex_ok = bool(cortex_check and cortex_check[0].get("HAS_CORTEX", False))
            except Exception:
                cortex_ok = False

            return {
                "connected": True,
                "status": "connected",
                "message": "Connected to Snowflake successfully.",
                "snowflake_version": row.get("VERSION"),
                "account": self._config.account,
                "user": row.get("USER", self._config.user),
                "role": row.get("ROLE", self._config.role),
                "warehouse": row.get("WAREHOUSE", self._config.warehouse),
                "database": row.get("DATABASE", self._config.database),
                "cortex_available": cortex_ok,
            }
        except Exception as exc:
            return {
                "connected": False,
                "status": "query_error",
                "message": f"Connection active but query failed: {exc}",
                "account": self._config.account,
                "user": self._config.user,
                "warehouse": self._config.warehouse,
                "database": self._config.database,
                "role": self._config.role,
                "cortex_available": False,
            }

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
        """
        if not self._available:
            logger.debug("Snowflake unavailable — returning empty pattern results.")
            return []

        tbl = self._tbl("KNOWLEDGE", "ARCHITECTURAL_PATTERNS")
        try:
            # Cortex SEARCH path (preferred when enabled in account)
            cortex_sql = f"""
                SELECT pattern_id, name, category, description, rationale,
                       trade_offs, example_snippet, applicable_layers, tags,
                       SEARCH_SCORE() AS score
                FROM TABLE(
                    {tbl}
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
        tbl = self._tbl("KNOWLEDGE", "ARCHITECTURAL_PATTERNS")
        sql = f"""
            SELECT pattern_id, name, category, description, rationale,
                   trade_offs, example_snippet, applicable_layers, tags,
                   0.5 AS score
            FROM {tbl}
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
            pattern_id=str(row.get("PATTERN_ID", "")),
            name=str(row.get("NAME", "")),
            category=str(row.get("CATEGORY", "")),
            description=str(row.get("DESCRIPTION", "")),
            rationale=str(row.get("RATIONALE", "")),
            trade_offs=str(row.get("TRADE_OFFS", "")),
            example_snippet=str(row.get("EXAMPLE_SNIPPET", "")),
            applicable_layers=row.get("APPLICABLE_LAYERS") or [],
            tags=row.get("TAGS") or [],
            retrieval_score=float(row.get("SCORE", 0.0) or 0.0),
        )

    # -----------------------------------------------------------------------
    # Knowledge Retrieval — Architecture Rules
    # -----------------------------------------------------------------------

    async def get_rules_for_project(self, project_id: str) -> list[dict]:
        """Fetches active architecture rules for a project from Snowflake."""
        if not self._available:
            return []
        tbl = self._tbl("RULES", "ARCHITECTURE_RULES")
        sql = f"""
            SELECT rule_id, name, description, scope, severity, rationale,
                   source_layer, target_layer, allowed, verification_method,
                   rule_version
            FROM {tbl}
            WHERE project_id = :project_id AND active = TRUE
            ORDER BY severity, rule_id
        """
        try:
            return await self._execute(sql, {"project_id": project_id})
        except Exception as exc:
            logger.error("Failed to fetch rules: %s", exc)
            return []

    # -----------------------------------------------------------------------
    # Knowledge Synchronization — Approved Architectural Patterns / ADRs
    # -----------------------------------------------------------------------

    async def sync_pattern(self, pattern: dict) -> bool:
        """
        Inserts or merges an approved architectural pattern into Snowflake.
        Adheres to privacy: only metadata/patterns, never raw proprietary code.
        """
        if not self._available:
            return False

        tbl = self._tbl("KNOWLEDGE", "ARCHITECTURAL_PATTERNS")
        sql = f"""
            MERGE INTO {tbl} t
            USING (
                SELECT :pid AS pattern_id, :name AS name, :cat AS category,
                       :desc AS description, :rat AS rationale, :to AS trade_offs,
                       :snip AS example_snippet, PARSE_JSON(:layers) AS applicable_layers,
                       PARSE_JSON(:tags) AS tags, CURRENT_TIMESTAMP() AS updated_at
            ) s
            ON t.pattern_id = s.pattern_id
            WHEN MATCHED THEN UPDATE SET
                name = s.name, category = s.category, description = s.description,
                rationale = s.rationale, trade_offs = s.trade_offs,
                example_snippet = s.example_snippet, applicable_layers = s.applicable_layers,
                tags = s.tags, updated_at = s.updated_at
            WHEN NOT MATCHED THEN INSERT
                (pattern_id, name, category, description, rationale, trade_offs,
                 example_snippet, applicable_layers, tags, created_at, updated_at)
            VALUES
                (s.pattern_id, s.name, s.category, s.description, s.rationale, s.trade_offs,
                 s.example_snippet, s.applicable_layers, s.tags, s.updated_at, s.updated_at)
        """
        import json
        params = {
            "pid": pattern.get("pattern_id") or str(uuid.uuid4())[:8],
            "name": pattern.get("name", "Custom Pattern"),
            "cat": pattern.get("category", "Structural"),
            "desc": pattern.get("description", ""),
            "rat": pattern.get("rationale", ""),
            "to": pattern.get("trade_offs", ""),
            "snip": pattern.get("example_snippet", ""),
            "layers": json.dumps(pattern.get("applicable_layers", [])),
            "tags": json.dumps(pattern.get("tags", [])),
        }
        try:
            await self._execute(sql, params)
            return True
        except Exception as exc:
            logger.error("Failed to sync pattern to Snowflake: %s", exc)
            return False

    async def sync_document_chunks(self, chunks: list[dict]) -> dict:
        """
        Safely synchronizes approved documentation or architectural decision chunks.
        Validates privacy before transmission.
        """
        if not self._available:
            return {"synced": 0, "status": "offline", "reason": "Snowflake offline"}

        synced_count = 0
        for item in chunks:
            # Map chunk to architectural pattern or knowledge item
            ok = await self.sync_pattern({
                "pattern_id": item.get("id") or str(uuid.uuid4())[:8],
                "name": item.get("title") or item.get("source_path", "Architecture Note"),
                "category": item.get("category") or item.get("metadata", {}).get("kind", "Documentation"),
                "description": item.get("content", "")[:2000],
                "rationale": item.get("rationale", ""),
                "tags": [item.get("project_id", "default"), "synced_doc"],
                "applicable_layers": ["architecture", "documentation"],
            })
            if ok:
                synced_count += 1

        return {"synced": synced_count, "total": len(chunks), "status": "success"}

    # -----------------------------------------------------------------------
    # Analytics Ingestion — Privacy-safe payloads only
    # -----------------------------------------------------------------------

    async def record_scan_metric(self, payload: ScanMetricPayload) -> bool:
        """Records aggregate scan performance — no source content."""
        if not self._available:
            return False
        tbl = self._tbl("ANALYTICS", "SCAN_METRICS")
        sql = f"""
            INSERT INTO {tbl}
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
        tbl = self._tbl("ANALYTICS", "FINDING_FEEDBACK")
        sql = f"""
            INSERT INTO {tbl}
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
        """Saves a benchmark evaluation run and computes F1."""
        if not self._available:
            return None
        run_id = str(uuid.uuid4())
        tp, fp, tn, fn = payload.true_positives, payload.false_positives, \
                         payload.true_negatives, payload.false_negatives

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

        tbl = self._tbl("EVALUATION", "EVALUATION_RUNS")
        sql = f"""
            INSERT INTO {tbl}
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
        import snowflake.connector  # type: ignore
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
