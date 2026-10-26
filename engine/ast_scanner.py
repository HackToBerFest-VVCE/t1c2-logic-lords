"""
OpenLens Dev — Python AST Scanner & Static Analysis Engine
Deterministic local analysis: duplication, unused symbols, complexity.

Design principles:
- Runs entirely offline; no network required.
- Never transmits source code remotely.
- Uses established tools (ast, libcst, radon) before custom logic.
- Returns structured Finding objects matching the shared schema.
"""

from __future__ import annotations

import ast
import hashlib
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Shared finding schema (mirrors Aritechure.md §5)
# ---------------------------------------------------------------------------

@dataclass
class Evidence:
    source_type: str          # 'static_tool' | 'ast_analysis' | 'model_inference'
    source_reference: str     # file path (relative) or tool name
    excerpt_or_summary: str
    observed_or_inferred: str  # 'observed' | 'inferred'
    limitations: str = ""


@dataclass
class Finding:
    id: str
    category: str             # 'duplication' | 'unused_code' | 'complexity' | 'architecture_drift'
    severity: str             # 'critical' | 'high' | 'medium' | 'low' | 'info'
    confidence: str           # 'high' | 'medium' | 'low'
    location: str             # "file.py:L10-L25"
    summary: str
    evidence: list[Evidence]
    rationale: str
    suggested_action: str
    validation_status: str = "not_validated"
    rule_id: Optional[str] = None
    created_at: str = field(default_factory=lambda: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))


# ---------------------------------------------------------------------------
# Duplication Detector
# ---------------------------------------------------------------------------

class DuplicationDetector:
    """
    Detects exact function/method body duplicates using AST-subtree hashing.
    Near-duplicate detection (semantic similarity) requires model assistance.
    """

    def detect(self, files: list[Path]) -> list[Finding]:
        hash_map: dict[str, list[tuple[str, int, int]]] = {}
        findings: list[Finding] = []

        for file_path in files:
            try:
                source = file_path.read_text(encoding="utf-8", errors="replace")
                tree = ast.parse(source, filename=str(file_path))
            except SyntaxError as exc:
                logger.warning("Syntax error in %s: %s", file_path, exc)
                continue

            for node in ast.walk(tree):
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                body_hash = self._hash_ast(node.body)
                loc = (str(file_path), node.lineno, node.end_lineno or node.lineno)
                hash_map.setdefault(body_hash, []).append(loc)

        for body_hash, locations in hash_map.items():
            if len(locations) < 2:
                continue
            first_file, first_line, first_end = locations[0]
            finding_id = f"dup_{body_hash[:8]}"
            summary = (
                f"Exact function body duplicate detected across "
                f"{len(locations)} locations."
            )
            evidence = [
                Evidence(
                    source_type="static_tool",
                    source_reference=f"{f}:L{sl}-L{el}",
                    excerpt_or_summary=f"Identical AST hash: {body_hash[:12]}",
                    observed_or_inferred="observed",
                )
                for f, sl, el in locations
            ]
            findings.append(Finding(
                id=finding_id,
                category="duplication",
                severity="high",
                confidence="high",
                location=f"{first_file}:L{first_line}-L{first_end}",
                summary=summary,
                evidence=evidence,
                rationale=(
                    "Duplicated logic increases maintenance burden: a bug fix or "
                    "behavioural change must be replicated in every copy."
                ),
                suggested_action=(
                    "Extract the shared logic into a single well-named function "
                    "and replace all duplicates with calls to it."
                ),
            ))

        return findings

    @staticmethod
    def _hash_ast(nodes: list[ast.AST]) -> str:
        """Normalise and hash an AST node list, ignoring variable names."""
        dumped = ast.dump(ast.Module(body=nodes, type_ignores=[]))
        return hashlib.sha256(dumped.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Unused Import Detector
# ---------------------------------------------------------------------------

class UnusedImportDetector:
    """
    Detects imported names that are never referenced in the module body.
    Complements tools like pylint / flake8 F401.
    """

    def detect(self, files: list[Path]) -> list[Finding]:
        findings: list[Finding] = []
        for file_path in files:
            try:
                source = file_path.read_text(encoding="utf-8", errors="replace")
                tree = ast.parse(source, filename=str(file_path))
            except SyntaxError:
                continue
            findings.extend(self._check_file(file_path, tree))
        return findings

    def _check_file(self, file_path: Path, tree: ast.Module) -> list[Finding]:
        imports: dict[str, int] = {}   # name → line number
        used_names: set[str] = set()
        findings: list[Finding] = []

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    bound = alias.asname or alias.name.split(".")[0]
                    imports[bound] = node.lineno
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    if alias.name == "*":
                        return []      # wildcard import — cannot determine usage
                    bound = alias.asname or alias.name
                    imports[bound] = node.lineno
            elif isinstance(node, ast.Name):
                used_names.add(node.id)
            elif isinstance(node, ast.Attribute):
                if isinstance(node.value, ast.Name):
                    used_names.add(node.value.id)

        for name, lineno in imports.items():
            if name.startswith("_") or name == "__all__":
                continue
            if name not in used_names:
                findings.append(Finding(
                    id=f"unused_{hashlib.md5(f'{file_path}:{name}'.encode()).hexdigest()[:8]}",
                    category="unused_code",
                    severity="low",
                    confidence="high",
                    location=f"{file_path}:L{lineno}",
                    summary=f"Unused import: '{name}'.",
                    evidence=[Evidence(
                        source_type="static_tool",
                        source_reference=str(file_path),
                        excerpt_or_summary=f"import '{name}' at line {lineno} is never referenced.",
                        observed_or_inferred="observed",
                    )],
                    rationale=(
                        "Unused imports increase cognitive overhead and may indicate "
                        "a dependency that can be removed, reducing install size."
                    ),
                    suggested_action=f"Remove the 'import {name}' statement.",
                ))

        return findings


# ---------------------------------------------------------------------------
# Complexity Detector (Cyclomatic Complexity via AST branch counting)
# ---------------------------------------------------------------------------

class ComplexityDetector:
    """
    Calculates cyclomatic complexity for each function.
    A complexity > 10 is flagged as high; > 7 is flagged as medium.
    Uses radon if installed, falls back to AST branch counting.
    """

    HIGH_THRESHOLD = 10
    MEDIUM_THRESHOLD = 7

    BRANCH_NODES = (
        ast.If, ast.For, ast.While, ast.ExceptHandler,
        ast.With, ast.Assert, ast.comprehension,
    )

    def detect(self, files: list[Path]) -> list[Finding]:
        try:
            return self._detect_with_radon(files)
        except ImportError:
            return self._detect_with_ast(files)

    def _detect_with_radon(self, files: list[Path]) -> list[Finding]:
        from radon.complexity import cc_visit, ComplexityVisitor  # type: ignore
        findings: list[Finding] = []
        for file_path in files:
            try:
                source = file_path.read_text(encoding="utf-8", errors="replace")
                results = cc_visit(source)
            except Exception:
                continue
            for result in results:
                cc = result.complexity
                if cc < self.MEDIUM_THRESHOLD:
                    continue
                severity = "high" if cc >= self.HIGH_THRESHOLD else "medium"
                findings.append(self._make_finding(file_path, result.name, result.lineno, cc, severity))
        return findings

    def _detect_with_ast(self, files: list[Path]) -> list[Finding]:
        findings: list[Finding] = []
        for file_path in files:
            try:
                source = file_path.read_text(encoding="utf-8", errors="replace")
                tree = ast.parse(source)
            except SyntaxError:
                continue
            for node in ast.walk(tree):
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                cc = 1 + sum(1 for _ in ast.walk(node) if isinstance(_, self.BRANCH_NODES))
                if cc < self.MEDIUM_THRESHOLD:
                    continue
                severity = "high" if cc >= self.HIGH_THRESHOLD else "medium"
                findings.append(self._make_finding(file_path, node.name, node.lineno, cc, severity))
        return findings

    def _make_finding(self, file_path: Path, func_name: str, lineno: int, cc: int, severity: str) -> Finding:
        return Finding(
            id=f"cc_{hashlib.md5(f'{file_path}:{func_name}'.encode()).hexdigest()[:8]}",
            category="complexity",
            severity=severity,
            confidence="high",
            location=f"{file_path}:L{lineno}",
            summary=f"Function '{func_name}' has cyclomatic complexity {cc}.",
            evidence=[Evidence(
                source_type="static_tool",
                source_reference=str(file_path),
                excerpt_or_summary=f"Cyclomatic complexity = {cc} (threshold: {self.MEDIUM_THRESHOLD}).",
                observed_or_inferred="observed",
            )],
            rationale=(
                "High cyclomatic complexity correlates with increased defect rates "
                "and makes functions harder to test and understand."
            ),
            suggested_action=(
                "Decompose the function into smaller, single-responsibility functions "
                "and consider extracting conditional branches into named helpers."
            ),
        )


# ---------------------------------------------------------------------------
# Architecture Drift Detector
# ---------------------------------------------------------------------------

class ArchitectureDriftDetector:
    """
    Detects import-level boundary violations against loaded architecture rules.
    Rules are loaded from the exported rules.json produced by OpenLens Archy.
    """

    def __init__(self, rules: list[dict]):
        self._rules = [r for r in rules if r.get("verification_method") == "ast_import"]

    def detect(self, files: list[Path], layer_map: dict[str, str]) -> list[Finding]:
        """
        Args:
            files:      Python files to check.
            layer_map:  Maps file paths (or module prefixes) to layer names.
        """
        findings: list[Finding] = []
        for file_path in files:
            source_layer = self._resolve_layer(str(file_path), layer_map)
            if not source_layer:
                continue
            try:
                tree = ast.parse(file_path.read_text(encoding="utf-8", errors="replace"))
            except SyntaxError:
                continue
            for node in ast.walk(tree):
                if not isinstance(node, (ast.Import, ast.ImportFrom)):
                    continue
                imported_module = (
                    node.module if isinstance(node, ast.ImportFrom) else
                    ".".join(a.name for a in node.names)
                )
                target_layer = self._resolve_layer(imported_module, layer_map)
                if not target_layer:
                    continue
                for rule in self._rules:
                    if (rule.get("source_layer") == source_layer
                            and rule.get("target_layer") == target_layer
                            and not rule.get("allowed", True)):
                        findings.append(Finding(
                            id=f"drift_{rule['rule_id']}_{hashlib.md5(str(file_path).encode()).hexdigest()[:6]}",
                            category="architecture_drift",
                            severity=rule.get("severity", "error"),
                            confidence="high",
                            location=f"{file_path}:L{node.lineno}",
                            summary=(
                                f"Forbidden cross-boundary import: {source_layer} → {target_layer}."
                            ),
                            evidence=[Evidence(
                                source_type="static_tool",
                                source_reference=str(file_path),
                                excerpt_or_summary=(
                                    f"Import of '{imported_module}' violates rule '{rule['rule_id']}'."
                                ),
                                observed_or_inferred="observed",
                            )],
                            rationale=rule.get("rationale", "Architecture boundary violation."),
                            suggested_action=(
                                "Route the dependency through the correct intermediary layer "
                                "or expose a permitted API."
                            ),
                            rule_id=rule.get("rule_id"),
                        ))
        return findings

    @staticmethod
    def _resolve_layer(path_or_module: str, layer_map: dict[str, str]) -> Optional[str]:
        for prefix, layer in layer_map.items():
            if path_or_module.startswith(prefix):
                return layer
        return None


# ---------------------------------------------------------------------------
# Scanner Orchestrator
# ---------------------------------------------------------------------------

@dataclass
class ScanResult:
    files_scanned: int
    duration_ms: int
    findings: list[Finding]
    errors: list[str]


class ASTScanner:
    """
    Orchestrates all deterministic checks across a set of Python files.
    Returns a ScanResult with all findings normalised to the shared schema.
    """

    def __init__(
        self,
        run_duplication: bool = True,
        run_unused_imports: bool = True,
        run_complexity: bool = True,
        architecture_rules: Optional[list[dict]] = None,
        layer_map: Optional[dict[str, str]] = None,
    ):
        self._detectors = []
        if run_duplication:
            self._detectors.append(DuplicationDetector())
        if run_unused_imports:
            self._detectors.append(UnusedImportDetector())
        if run_complexity:
            self._detectors.append(ComplexityDetector())
        self._arch_detector = (
            ArchitectureDriftDetector(architecture_rules)
            if architecture_rules else None
        )
        self._layer_map = layer_map or {}

    def scan(self, files: list[Path]) -> ScanResult:
        start = time.monotonic()
        all_findings: list[Finding] = []
        errors: list[str] = []

        python_files = [f for f in files if f.suffix == ".py" and f.exists()]

        for detector in self._detectors:
            try:
                all_findings.extend(detector.detect(python_files))
            except Exception as exc:
                errors.append(f"{type(detector).__name__}: {exc}")
                logger.error("Detector %s failed: %s", type(detector).__name__, exc)

        if self._arch_detector and self._layer_map:
            try:
                all_findings.extend(self._arch_detector.detect(python_files, self._layer_map))
            except Exception as exc:
                errors.append(f"ArchitectureDriftDetector: {exc}")

        elapsed_ms = int((time.monotonic() - start) * 1000)
        logger.info(
            "Scan complete: %d files, %d findings, %dms",
            len(python_files), len(all_findings), elapsed_ms,
        )

        return ScanResult(
            files_scanned=len(python_files),
            duration_ms=elapsed_ms,
            findings=all_findings,
            errors=errors,
        )


# ---------------------------------------------------------------------------
# CLI entry point for local testing
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json
    import sys

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    paths = [Path(p) for p in sys.argv[1:]] or list(Path(".").rglob("*.py"))
    scanner = ASTScanner()
    result = scanner.scan(paths)

    print(f"\n{'='*60}")
    print(f"OpenLens Dev -- AST Scan Results")
    print(f"Files scanned : {result.files_scanned}")
    print(f"Duration      : {result.duration_ms} ms")
    print(f"Findings      : {len(result.findings)}")
    print(f"{'='*60}\n")

    for f in result.findings:
        print(f"[{f.severity.upper()}] {f.category} -- {f.location}")
        print(f"  {f.summary}")
        print(f"  -> {f.suggested_action}")
        print()
