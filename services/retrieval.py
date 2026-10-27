"""
OpenLens Retrieval Service
Retrieves curated architectural patterns and refactoring cases from Snowflake.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class RetrievalResult:
    source_id: str
    source_type: str           # 'pattern' | 'refactoring_case' | 'library'
    title: str
    summary: str
    retrieval_score: float
    source_reference: str
    observed_or_inferred: str = "observed"
    limitations: str = ""


class RetrievalService:
    """
    Retrieves evidence from the Snowflake knowledge base to support
    finding explanations and patch proposals.

    Privacy: only sanitised metadata is queried; no raw user code is sent.
    Fails gracefully when Snowflake is unavailable.
    """

    def __init__(self, bridge=None):
        self._bridge = bridge

    async def retrieve_for_finding(
        self,
        finding_category: str,
        context_summary: str,
        limit: int = 3,
    ) -> list[RetrievalResult]:
        """
        Retrieve relevant patterns and examples for a given finding category.
        Returns empty list when Snowflake is offline.
        """
        if self._bridge is None or not self._bridge.available:
            logger.debug("Retrieval skipped — Snowflake offline.")
            return []

        query = f"{finding_category}: {context_summary}"
        patterns = await self._bridge.search_patterns(query=query, limit=limit)

        return [
            RetrievalResult(
                source_id=p.pattern_id,
                source_type="pattern",
                title=p.name,
                summary=p.description,
                retrieval_score=p.retrieval_score,
                source_reference=f"OPENLENS_DB.KNOWLEDGE.ARCHITECTURAL_PATTERNS/{p.pattern_id}",
                limitations="Retrieved from curated knowledge base; validate against project context.",
            )
            for p in patterns
        ]

    async def retrieve_refactoring_cases(
        self,
        finding_category: str,
        limit: int = 3,
    ) -> list[RetrievalResult]:
        """
        Retrieve sanitised, consented refactoring examples relevant to a finding type.
        """
        if self._bridge is None or not self._bridge.available:
            return []

        try:
            tbl = self._bridge._tbl("KNOWLEDGE", "REFACTORING_CASES") if hasattr(self._bridge, "_tbl") else "OPENLENS_DB.KNOWLEDGE.REFACTORING_CASES"
            sql = f"""
                SELECT case_id, finding_category, before_snippet, after_snippet,
                       explanation, test_outcome, user_rating
                FROM {tbl}
                WHERE finding_category = :cat
                  AND consent_given = TRUE
                  AND (retention_until IS NULL OR retention_until > CURRENT_DATE())
                ORDER BY user_rating DESC NULLS LAST
                LIMIT :limit
            """
            rows = await self._bridge._execute(sql, {"cat": finding_category, "limit": limit})
            return [
                RetrievalResult(
                    source_id=row.get("CASE_ID", ""),
                    source_type="refactoring_case",
                    title=f"Refactoring case: {row.get('FINDING_CATEGORY', '')}",
                    summary=row.get("EXPLANATION", ""),
                    retrieval_score=float(row.get("USER_RATING") or 3) / 5.0,
                    source_reference=f"OPENLENS_DB.KNOWLEDGE.REFACTORING_CASES/{row.get('CASE_ID', '')}",
                    limitations="Sanitised and consented example; verify suitability for your project.",
                )
                for row in rows
            ]
        except Exception as exc:
            logger.warning("Refactoring case retrieval failed: %s", exc)
            return []
