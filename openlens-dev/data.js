/**
 * OpenLens Dev — Sample Findings Dataset
 * Rich, realistic findings for two project presets.
 * All data is synthetic / sanitised — no real code is stored here.
 */

export const PRESETS = {

  /* ──────────────────────────────────────────────────────
     OpenLens Core  —  the OpenLens codebase itself
  ────────────────────────────────────────────────────── */
  openlens_core: {
    id: 'openlens_core',
    name: 'OpenLens Core',
    filesScanned: 12,
    durationMs: 38,
    snowflakeConnected: false,

    rules: [
      {
        rule_id: 'RULE-CORE-01', severity: 'error',
        description: 'No raw source code to external APIs without redaction.'
      },
      {
        rule_id: 'RULE-CORE-02', severity: 'error',
        description: 'Frontend must not import database models directly.'
      },
      {
        rule_id: 'RULE-CORE-05', severity: 'error',
        description: 'Model output must never execute shell commands.'
      },
      {
        rule_id: 'RULE-CORE-06', severity: 'warning',
        description: 'Secret redaction required before all remote calls.'
      }
    ],

    findings: [
      {
        id: 'dup_a1b2c3d4',
        category: 'duplication',
        severity: 'high',
        confidence: 'high',
        location: 'api/gateway.py:L72-L98',
        summary: 'Exact function body duplicate detected in 2 locations.',
        evidence: [
          {
            source_type: 'static_tool',
            source_reference: 'api/gateway.py:L72-L98',
            excerpt_or_summary: 'AST subtree hash b1c2d3e4 — function `_validate_workspace_path`.',
            observed_or_inferred: 'observed',
            limitations: ''
          },
          {
            source_type: 'static_tool',
            source_reference: 'engine/ast_scanner.py:L188-L214',
            excerpt_or_summary: 'Identical AST hash — function `_resolve_safe_path`. Same path traversal guard logic.',
            observed_or_inferred: 'observed',
            limitations: ''
          }
        ],
        rationale: 'Duplicated path-traversal guard increases maintenance burden. A bug fix must be applied in both locations.',
        suggested_action: 'Extract `validate_workspace_path(root, candidate)` into a shared `utils/paths.py` module and replace both call-sites.',
        validation_status: 'not_validated',
        diff: `--- a/api/gateway.py
+++ b/api/gateway.py
@@ -72,12 +72,5 @@ async def scan_files(req: ScanRequest):
-    root = Path(req.workspace_root).resolve()
-    safe_paths: list[Path] = []
-    for rel in req.file_paths:
-        candidate = (root / rel).resolve()
-        try:
-            candidate.relative_to(root)
-            if candidate.exists() and candidate.suffix == '.py':
-                safe_paths.append(candidate)
-        except ValueError:
-            pass
+    safe_paths = validate_workspace_path(
+        Path(req.workspace_root), req.file_paths
+    )
--- a/engine/ast_scanner.py
+++ b/engine/ast_scanner.py
@@ -188,12 +188,5 @@ class ASTScanner:
-    root = root_path.resolve()
-    safe_paths: list[Path] = []
-    for rel in file_list:
-        candidate = (root / rel).resolve()
-        try:
-            candidate.relative_to(root)
-            safe_paths.append(candidate)
-        except ValueError:
-            pass
-    return safe_paths
+    return validate_workspace_path(root_path, file_list)`,
        diff_file: 'api/gateway.py + engine/ast_scanner.py',
        diff_risk: 'Low — pure refactor, no behaviour change',
        retrievedPattern: {
          name: 'Extract Method',
          category: 'Refactoring',
          description: 'Extract a duplicated code fragment into a named function that clearly communicates its intent.',
          source_reference: 'OPENLENS_DB.KNOWLEDGE.ARCHITECTURAL_PATTERNS/pat_extract_method'
        }
      },
      {
        id: 'unused_9a8b7c6d',
        category: 'unused_code',
        severity: 'low',
        confidence: 'high',
        location: 'services/snowflake_bridge.py:L12',
        summary: "Unused import: 'hashlib' is imported but never referenced.",
        evidence: [
          {
            source_type: 'static_tool',
            source_reference: 'services/snowflake_bridge.py:L12',
            excerpt_or_summary: "import hashlib at line 12 — no reference found in module body.",
            observed_or_inferred: 'observed',
            limitations: ''
          }
        ],
        rationale: 'Unused imports increase cognitive overhead and may indicate a removable dependency.',
        suggested_action: "Remove the 'import hashlib' statement on line 12.",
        validation_status: 'not_validated',
        diff: `--- a/services/snowflake_bridge.py
+++ b/services/snowflake_bridge.py
@@ -10,7 +10,6 @@
 import logging
 import os
 import re
-import hashlib
 import uuid
 from contextlib import asynccontextmanager`,
        diff_file: 'services/snowflake_bridge.py',
        diff_risk: 'Very Low — removing unused import'
      },
      {
        id: 'cc_f3e2d1c0',
        category: 'complexity',
        severity: 'medium',
        confidence: 'high',
        location: 'api/gateway.py:L58',
        summary: "Function 'scan_files' has cyclomatic complexity 9.",
        evidence: [
          {
            source_type: 'static_tool',
            source_reference: 'api/gateway.py:L58',
            excerpt_or_summary: 'Cyclomatic complexity = 9 (threshold: 7). Branches: 4× if, 2× for, 1× try, 2× except.',
            observed_or_inferred: 'observed',
            limitations: 'radon CC approximation — actual value may differ by ±1.'
          }
        ],
        rationale: 'High cyclomatic complexity correlates with increased defect rates and makes unit testing harder.',
        suggested_action: 'Decompose `scan_files` into three focused helpers: `_resolve_safe_files()`, `_load_arch_rules()`, and `_record_metric()`.',
        validation_status: 'not_validated',
        diff: null
      },
      {
        id: 'drift_RULE-CORE-02_a1b2',
        category: 'architecture_drift',
        severity: 'error',
        confidence: 'high',
        location: 'openlens-dev/app.js:L1',
        summary: 'Forbidden import pattern: frontend directly references database layer.',
        evidence: [
          {
            source_type: 'static_tool',
            source_reference: 'openlens-dev/app.js:L1',
            excerpt_or_summary: "Direct import of backend module from frontend violates RULE-CORE-02.",
            observed_or_inferred: 'observed',
            limitations: ''
          }
        ],
        rationale: 'Frontend must not directly access database models; all data access routes through the backend API.',
        suggested_action: 'Replace direct import with a REST call to `/knowledge/patterns` on the shared backend gateway.',
        validation_status: 'not_validated',
        rule_id: 'RULE-CORE-02',
        diff: null
      },
      {
        id: 'dup_b2c3d4e5',
        category: 'duplication',
        severity: 'medium',
        confidence: 'high',
        location: 'services/retrieval.py:L44-L68',
        summary: 'Structurally similar result-mapping pattern found in 3 service methods.',
        evidence: [
          {
            source_type: 'static_tool',
            source_reference: 'services/retrieval.py:L44-L68',
            excerpt_or_summary: 'List comprehension mapping Snowflake row → dataclass (hash: c3d4e5f6).',
            observed_or_inferred: 'observed',
            limitations: ''
          },
          {
            source_type: 'static_tool',
            source_reference: 'services/snowflake_bridge.py:L198-L214',
            excerpt_or_summary: 'Similar row→dataclass mapping pattern (hash: c3d4e5f6).',
            observed_or_inferred: 'observed',
            limitations: ''
          }
        ],
        rationale: 'Duplicate row-mapping logic creates maintenance risk when the Snowflake schema evolves.',
        suggested_action: 'Extract a generic `_row_to(dataclass, row)` mapping utility into `services/mapper.py`.',
        validation_status: 'not_validated',
        diff: null
      }
    ]
  },

  /* ──────────────────────────────────────────────────────
     AUV Defense  —  the acoustic detection system
  ────────────────────────────────────────────────────── */
  auv_defense: {
    id: 'auv_defense',
    name: 'AUV Defense System',
    filesScanned: 21,
    durationMs: 61,
    snowflakeConnected: false,

    rules: [
      {
        rule_id: 'RULE-SEC-01', severity: 'error',
        description: 'External operators cannot bypass Security Layer to invoke FastAPI directly.'
      },
      {
        rule_id: 'RULE-DATA-02', severity: 'warning',
        description: 'Inference Engine must write events via Event Logger only.'
      },
      {
        rule_id: 'RULE-AIRGAP-03', severity: 'error',
        description: 'Air-gapped boundary components cannot open unencrypted outgoing sockets.'
      }
    ],

    findings: [
      {
        id: 'dup_auv_e1f2g3h4',
        category: 'duplication',
        severity: 'high',
        confidence: 'high',
        location: 'infer.py:L88-L124',
        summary: 'Exact SNR normalisation logic duplicated in 2 inference stages.',
        evidence: [
          {
            source_type: 'static_tool',
            source_reference: 'infer.py:L88-L124',
            excerpt_or_summary: 'AST hash f2a3b4c5 — `_normalise_snr()` in Stage 1 autoencoder.',
            observed_or_inferred: 'observed',
            limitations: ''
          },
          {
            source_type: 'static_tool',
            source_reference: 'infer.py:L221-L257',
            excerpt_or_summary: 'Identical AST hash — `_normalise_deep_features()` Stage 2. Same normalisation formula.',
            observed_or_inferred: 'observed',
            limitations: ''
          }
        ],
        rationale: 'Duplicated normalisation changes SNR calibration correctness when the acoustic baseline shifts — both locations must be updated consistently.',
        suggested_action: 'Extract `normalise_acoustic_snr(signal, baseline)` into `preprocessing.py` shared by both stages.',
        validation_status: 'not_validated',
        diff: `--- a/infer.py
+++ b/infer.py
@@ -88,14 +88,5 @@ class Stage1AutoEncoder:
-    def _normalise_snr(self, signal):
-        mean  = np.mean(signal)
-        sigma = np.std(signal) + 1e-8
-        return (signal - mean) / sigma
-
 # ... 130 lines later ...
@@ -221,14 +212,5 @@ class Stage2DeepFeatures:
-    def _normalise_deep_features(self, signal):
-        mean  = np.mean(signal)
-        sigma = np.std(signal) + 1e-8
-        return (signal - mean) / sigma
+    from preprocessing import normalise_acoustic_snr
+    # Stage 1
+    normalised = normalise_acoustic_snr(signal, self.baseline)
+    # Stage 2 uses same function
+    normalised = normalise_acoustic_snr(signal, self.baseline)`,
        diff_file: 'infer.py',
        diff_risk: 'Medium — verify unit tests cover both inference stages',
        retrievedPattern: {
          name: 'Pipeline & Filter',
          category: 'Architectural',
          description: 'Chain signal processing steps through shared filter functions to avoid duplicated transforms.',
          source_reference: 'OPENLENS_DB.KNOWLEDGE.ARCHITECTURAL_PATTERNS/pat_pipeline_filter'
        }
      },
      {
        id: 'drift_RULE-SEC-01_auv',
        category: 'architecture_drift',
        severity: 'error',
        confidence: 'high',
        location: 'dashboard.py:L44',
        summary: 'Operator dashboard imports FastAPI endpoint function directly, bypassing Security Layer.',
        evidence: [
          {
            source_type: 'static_tool',
            source_reference: 'dashboard.py:L44',
            excerpt_or_summary: "from api import command_handler — violates RULE-SEC-01.",
            observed_or_inferred: 'observed',
            limitations: ''
          }
        ],
        rationale: 'Direct invocation bypasses the HMAC verification and air-gap security boundary, enabling unauthenticated command injection.',
        suggested_action: 'Route all operator commands through the Security Layer FastAPI endpoint with HMAC token validation.',
        validation_status: 'not_validated',
        rule_id: 'RULE-SEC-01',
        diff: null
      },
      {
        id: 'cc_auv_h4i5j6k7',
        category: 'complexity',
        severity: 'high',
        confidence: 'high',
        location: 'agents.py:L145',
        summary: "Function 'route_advisory' has cyclomatic complexity 13.",
        evidence: [
          {
            source_type: 'static_tool',
            source_reference: 'agents.py:L145',
            excerpt_or_summary: 'CC = 13 (threshold: 10). 6× if/elif, 2× for, 3× try/except, 2× nested conditions.',
            observed_or_inferred: 'observed',
            limitations: ''
          }
        ],
        rationale: 'Advisory routing logic at CC 13 is approaching untestability and is a high-risk area for mission-critical code.',
        suggested_action: 'Apply the Strategy Pattern: create an `AdvisoryRouter` class with one handler method per advisory type, registered via a dictionary dispatch table.',
        validation_status: 'not_validated',
        diff: null,
        retrievedPattern: {
          name: 'Strategy Pattern',
          category: 'Behavioral',
          description: 'Replace a complex conditional with a family of interchangeable strategy objects, each handling one advisory type.',
          source_reference: 'OPENLENS_DB.KNOWLEDGE.ARCHITECTURAL_PATTERNS/pat_strategy'
        }
      },
      {
        id: 'unused_auv_l7m8n9',
        category: 'unused_code',
        severity: 'low',
        confidence: 'high',
        location: 'preprocessing.py:L6',
        summary: "Unused imports: 'time', 'threading' imported but never used.",
        evidence: [
          {
            source_type: 'static_tool',
            source_reference: 'preprocessing.py:L6-L7',
            excerpt_or_summary: "import time; import threading — zero references in module body.",
            observed_or_inferred: 'observed',
            limitations: ''
          }
        ],
        rationale: 'Unused imports clutter the module namespace and may represent abandoned synchronisation logic.',
        suggested_action: "Remove 'import time' and 'import threading' from preprocessing.py line 6-7.",
        validation_status: 'not_validated',
        diff: `--- a/preprocessing.py
+++ b/preprocessing.py
@@ -4,8 +4,6 @@
 import numpy as np
 from scipy.signal import butter, sosfilt
-import time
-import threading
 from sonar_bus import SonarFrame`,
        diff_file: 'preprocessing.py',
        diff_risk: 'Very Low — removing unused imports'
      },
      {
        id: 'drift_RULE-DATA-02_auv',
        category: 'architecture_drift',
        severity: 'medium',
        confidence: 'high',
        location: 'infer.py:L302',
        summary: 'Inference Engine writes directly to data_store, bypassing Event Logger.',
        evidence: [
          {
            source_type: 'static_tool',
            source_reference: 'infer.py:L302',
            excerpt_or_summary: "data_store.write(event) — violates RULE-DATA-02 (must route via event_logger).",
            observed_or_inferred: 'observed',
            limitations: ''
          }
        ],
        rationale: 'Direct writes bypass event timestamping, geo-tagging, and the heat-map broadcast pipeline.',
        suggested_action: 'Replace `data_store.write(event)` with `event_logger.publish(event)` at infer.py:L302.',
        validation_status: 'not_validated',
        rule_id: 'RULE-DATA-02',
        diff: `--- a/infer.py
+++ b/infer.py
@@ -300,5 +300,5 @@ class InferenceEngine:
     def _persist_anomaly(self, event: AnomalyEvent):
-        data_store.write(event)  # RULE-DATA-02 violation
+        event_logger.publish(event)  # routes via geo-tagger → heat-map`,
        diff_file: 'infer.py',
        diff_risk: 'Low — behaviour-preserving reroute through event pipeline'
      }
    ]
  }
};

export const CATEGORY_META = {
  duplication:          { label: 'Duplication',          color: '#a855f7', icon: '🔍' },
  unused_code:          { label: 'Unused Code',          color: '#06b6d4', icon: '📦' },
  complexity:           { label: 'Complexity',           color: '#f59e0b', icon: '📊' },
  architecture_drift:   { label: 'Architecture Drift',   color: '#ef4444', icon: '🏛️' }
};

export const SEV_ORDER = { error: 0, high: 1, medium: 2, low: 3, info: 4 };
