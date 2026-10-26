-- =============================================================================
-- OpenLens Snowflake Schema
-- Knowledge Base · Evaluation Benchmarks · Architecture Rules Store
-- Team: t1c2-logic-lords | HackToBerFest-VVCE
-- Track: Best Open-Source AI Project with Snowflake
-- =============================================================================

-- NOTE: Run this script in your Snowflake account after creating the DB/schema.
-- Secrets / credentials must be managed via Snowflake Secret or env config.
-- No raw source code or personal data is stored in these tables by default.

-- ---------------------------------------------------------------------------
-- 0. DATABASE & SCHEMA SETUP
-- ---------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS OPENLENS_DB
  DATA_RETENTION_TIME_IN_DAYS = 7
  COMMENT = 'OpenLens – curated architecture knowledge, evaluation benchmarks, and aggregate analytics.';

USE DATABASE OPENLENS_DB;

CREATE SCHEMA IF NOT EXISTS KNOWLEDGE
  DATA_RETENTION_TIME_IN_DAYS = 7
  COMMENT = 'Curated architectural patterns and documentation knowledge.';

CREATE SCHEMA IF NOT EXISTS EVALUATION
  DATA_RETENTION_TIME_IN_DAYS = 7
  COMMENT = 'Versioned benchmark cases, ground-truth findings, and evaluation results.';

CREATE SCHEMA IF NOT EXISTS ANALYTICS
  DATA_RETENTION_TIME_IN_DAYS = 7
  COMMENT = 'Privacy-safe aggregate product quality metrics.';

CREATE SCHEMA IF NOT EXISTS RULES
  DATA_RETENTION_TIME_IN_DAYS = 7
  COMMENT = 'Machine-verifiable architecture rules exported by OpenLens Archy.';

-- ===========================================================================
-- 1.  KNOWLEDGE SCHEMA — Curated Patterns & Documentation
-- ===========================================================================
USE SCHEMA OPENLENS_DB.KNOWLEDGE;

-- ---------------------------------------------------------------------------
-- 1.1  ARCHITECTURAL_PATTERNS
--      Versioned, curated catalogue of approved architectural patterns.
--      Retrieved via Cortex vector search when Dev / Archy need context.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE ARCHITECTURAL_PATTERNS (
    pattern_id          VARCHAR(64)     NOT NULL PRIMARY KEY,
    name                VARCHAR(256)    NOT NULL,
    category            VARCHAR(64)     NOT NULL,  -- Behavioral | Structural | Creational | Architectural
    description         TEXT            NOT NULL,
    rationale           TEXT,
    trade_offs          TEXT,
    example_snippet     TEXT,           -- sanitised, no project-specific secrets
    applicable_layers   ARRAY,          -- e.g. ['backend', 'database']
    tags                ARRAY,
    source_url          VARCHAR(512),
    version             VARCHAR(16)     DEFAULT '1.0.0',
    created_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP(),
    updated_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

-- Cortex vector search embedding column (Snowflake Cortex EMBED_TEXT)
ALTER TABLE ARCHITECTURAL_PATTERNS
    ADD COLUMN IF NOT EXISTS pattern_embedding VECTOR(FLOAT, 768);

COMMENT ON TABLE ARCHITECTURAL_PATTERNS IS
    'Curated catalogue of software architecture patterns retrieved during Dev and Archy analysis.';

-- ---------------------------------------------------------------------------
-- 1.2  LIBRARY_KNOWLEDGE
--      Known libraries / frameworks with licence, maintenance, and compat info.
--      Used by the library-first recommendation workflow.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE LIBRARY_KNOWLEDGE (
    library_id          VARCHAR(64)     NOT NULL PRIMARY KEY,
    name                VARCHAR(128)    NOT NULL,
    ecosystem           VARCHAR(32)     NOT NULL,  -- python | node | java | etc.
    pypi_name           VARCHAR(128),
    npm_name            VARCHAR(128),
    latest_version      VARCHAR(32),
    licence             VARCHAR(64),
    is_maintained       BOOLEAN         DEFAULT TRUE,
    known_cves          ARRAY,
    common_use_cases    ARRAY,
    replaces            ARRAY,          -- list of library_ids this can replace
    compat_notes        TEXT,
    source_url          VARCHAR(512),
    last_verified_at    TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

COMMENT ON TABLE LIBRARY_KNOWLEDGE IS
    'Metadata on libraries, licences, and compatibility — used for library-first recommendations.';

-- ---------------------------------------------------------------------------
-- 1.3  REFACTORING_CASES
--      Sanitised, user-approved refactoring examples stored with consent.
--      Used for retrieval-augmented context when proposing patches.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE REFACTORING_CASES (
    case_id             VARCHAR(64)     NOT NULL PRIMARY KEY,
    finding_category    VARCHAR(64)     NOT NULL,  -- duplication | complexity | dependency | etc.
    language            VARCHAR(32)     DEFAULT 'python',
    before_snippet      TEXT            NOT NULL,  -- anonymised; no secrets
    after_snippet       TEXT            NOT NULL,
    explanation         TEXT,
    test_outcome        VARCHAR(16),               -- passed | failed | not_run
    user_rating         SMALLINT,                  -- 1-5; null if unrated
    consent_given       BOOLEAN         NOT NULL DEFAULT FALSE,
    consent_timestamp   TIMESTAMP_NTZ,
    sanitised_at        TIMESTAMP_NTZ,
    retention_until     DATE,
    created_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

ALTER TABLE REFACTORING_CASES
    ADD COLUMN IF NOT EXISTS case_embedding VECTOR(FLOAT, 768);

COMMENT ON TABLE REFACTORING_CASES IS
    'Sanitised, consented refactoring examples used for retrieval-augmented patch proposals.';

-- ===========================================================================
-- 2.  EVALUATION SCHEMA — Benchmark Cases & Results
-- ===========================================================================
USE SCHEMA OPENLENS_DB.EVALUATION;

-- ---------------------------------------------------------------------------
-- 2.1  BENCHMARK_CASES
--      Ground-truth catalogue of known findings used to measure detector quality.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE BENCHMARK_CASES (
    case_id             VARCHAR(64)     NOT NULL PRIMARY KEY,
    suite_name          VARCHAR(128)    NOT NULL,  -- e.g. 'python_dup_v1'
    suite_version       VARCHAR(16)     NOT NULL,
    finding_category    VARCHAR(64)     NOT NULL,
    language            VARCHAR(32)     DEFAULT 'python',
    expected_finding    BOOLEAN         NOT NULL,  -- true = positive case
    code_snippet        TEXT            NOT NULL,  -- synthetic / public-domain only
    ground_truth_notes  TEXT,
    severity            VARCHAR(16),               -- critical | high | medium | low | info
    created_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP(),
    deprecated_at       TIMESTAMP_NTZ
);

COMMENT ON TABLE BENCHMARK_CASES IS
    'Ground-truth benchmark catalogue for measuring detector precision and recall.';

-- ---------------------------------------------------------------------------
-- 2.2  EVALUATION_RUNS
--      Records each evaluation execution for reproducibility and comparison.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE EVALUATION_RUNS (
    run_id              VARCHAR(64)     NOT NULL PRIMARY KEY,
    suite_name          VARCHAR(128)    NOT NULL,
    suite_version       VARCHAR(16)     NOT NULL,
    model_id            VARCHAR(128),              -- open-source model identifier
    model_version       VARCHAR(64),
    prompt_version      VARCHAR(32),
    rule_set_version    VARCHAR(32),
    run_by              VARCHAR(64),               -- team member / CI
    run_timestamp       TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP(),
    total_cases         INTEGER,
    true_positives      INTEGER,
    false_positives     INTEGER,
    true_negatives      INTEGER,
    false_negatives     INTEGER,
    precision_score     FLOAT,
    recall_score        FLOAT,
    f1_score            FLOAT,
    avg_latency_ms      FLOAT,
    notes               TEXT
);

COMMENT ON TABLE EVALUATION_RUNS IS
    'Versioned evaluation run records enabling reproducible benchmark comparison.';

-- ---------------------------------------------------------------------------
-- 2.3  CASE_RESULTS
--      Per-case output for each evaluation run; allows granular error analysis.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE CASE_RESULTS (
    result_id           VARCHAR(64)     NOT NULL PRIMARY KEY,
    run_id              VARCHAR(64)     NOT NULL REFERENCES EVALUATION_RUNS(run_id),
    case_id             VARCHAR(64)     NOT NULL REFERENCES BENCHMARK_CASES(case_id),
    predicted_finding   BOOLEAN         NOT NULL,
    confidence          FLOAT,
    latency_ms          INTEGER,
    raw_output_summary  TEXT,           -- no raw source; summary only
    correct             BOOLEAN         AS (predicted_finding = BENCHMARK_CASES.expected_finding),
    evaluated_at        TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

COMMENT ON TABLE CASE_RESULTS IS
    'Per-case evaluation results linked to benchmark runs for error analysis.';

-- ---------------------------------------------------------------------------
-- 2.4  PATCH_VALIDATION_RESULTS
--      Records outcomes of proposed patch validations (test + lint + type-check).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE PATCH_VALIDATION_RESULTS (
    validation_id       VARCHAR(64)     NOT NULL PRIMARY KEY,
    finding_category    VARCHAR(64)     NOT NULL,
    patch_id            VARCHAR(64),
    test_outcome        VARCHAR(16)     NOT NULL,  -- passed | failed | not_run | error
    lint_outcome        VARCHAR(16),
    type_check_outcome  VARCHAR(16),
    behaviour_preserved BOOLEAN,
    files_changed_count SMALLINT,
    unrelated_files_changed BOOLEAN    DEFAULT FALSE,
    notes               TEXT,
    validated_at        TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

COMMENT ON TABLE PATCH_VALIDATION_RESULTS IS
    'Patch validation outcomes (tests, lint, type-check) for quality tracking.';

-- ---------------------------------------------------------------------------
-- 2.5  RETRIEVAL_QUALITY
--      Measures the relevance of Snowflake knowledge retrievals.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE RETRIEVAL_QUALITY (
    retrieval_id        VARCHAR(64)     NOT NULL PRIMARY KEY,
    query_type          VARCHAR(64)     NOT NULL,  -- pattern | library | refactoring_case
    retrieved_count     SMALLINT,
    top1_relevant       BOOLEAN,
    mrr_score           FLOAT,          -- Mean Reciprocal Rank
    ndcg_score          FLOAT,
    latency_ms          INTEGER,
    grounded            BOOLEAN,        -- was the final answer traceable to a retrieved record?
    evaluated_at        TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

COMMENT ON TABLE RETRIEVAL_QUALITY IS
    'Retrieval relevance metrics for Snowflake vector search quality.';

-- ===========================================================================
-- 3.  ANALYTICS SCHEMA — Aggregate Product Metrics (privacy-safe)
-- ===========================================================================
USE SCHEMA OPENLENS_DB.ANALYTICS;

-- ---------------------------------------------------------------------------
-- 3.1  FINDING_FEEDBACK
--      Aggregate per-category feedback from developers (no source code stored).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE FINDING_FEEDBACK (
    feedback_id         VARCHAR(64)     NOT NULL PRIMARY KEY,
    finding_category    VARCHAR(64)     NOT NULL,
    action              VARCHAR(16)     NOT NULL,  -- accepted | dismissed | incorrect
    session_id          VARCHAR(64),               -- anonymised session only
    language            VARCHAR(32)     DEFAULT 'python',
    created_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

COMMENT ON TABLE FINDING_FEEDBACK IS
    'Anonymised per-category finding feedback for product quality tracking.';

-- ---------------------------------------------------------------------------
-- 3.2  SCAN_METRICS
--      Aggregate scan performance data; no source content retained.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE SCAN_METRICS (
    metric_id           VARCHAR(64)     NOT NULL PRIMARY KEY,
    scan_scope          VARCHAR(32)     NOT NULL,  -- file | project | changed_files
    file_count          SMALLINT,
    finding_count       SMALLINT,
    scan_duration_ms    INTEGER,
    model_invoked       BOOLEAN         DEFAULT FALSE,
    snowflake_queried   BOOLEAN         DEFAULT FALSE,
    error_occurred      BOOLEAN         DEFAULT FALSE,
    error_category      VARCHAR(64),
    session_id          VARCHAR(64),
    created_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

COMMENT ON TABLE SCAN_METRICS IS
    'Aggregate scan performance metrics with no source content retained.';

-- ---------------------------------------------------------------------------
-- 3.3  ARCHY_SESSION_METRICS
--      Aggregate Archy design session data for product quality measurement.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE ARCHY_SESSION_METRICS (
    session_metric_id   VARCHAR(64)     NOT NULL PRIMARY KEY,
    workflow_type       VARCHAR(32)     NOT NULL,  -- design | analyse | evaluate | restructure
    requirements_count  SMALLINT,
    adrs_generated      SMALLINT,
    rules_exported      SMALLINT,
    diagram_exported    BOOLEAN         DEFAULT FALSE,
    session_duration_s  INTEGER,
    snowflake_queries   SMALLINT        DEFAULT 0,
    session_id          VARCHAR(64),
    created_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

COMMENT ON TABLE ARCHY_SESSION_METRICS IS
    'Aggregate Archy session performance for product quality tracking.';

-- ===========================================================================
-- 4.  RULES SCHEMA — Architecture Rules Store
-- ===========================================================================
USE SCHEMA OPENLENS_DB.RULES;

-- ---------------------------------------------------------------------------
-- 4.1  ARCHITECTURE_RULES
--      Machine-verifiable rules exported by Archy; enforced by Dev in VS Code.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE ARCHITECTURE_RULES (
    rule_id             VARCHAR(64)     NOT NULL PRIMARY KEY,
    project_id          VARCHAR(64)     NOT NULL,
    name                VARCHAR(256)    NOT NULL,
    description         TEXT,
    scope               VARCHAR(32)     NOT NULL,  -- import | file | module | service
    severity            VARCHAR(16)     NOT NULL,  -- error | warning | info
    rationale           TEXT,
    source_layer        VARCHAR(32),
    target_layer        VARCHAR(32),
    allowed             BOOLEAN         NOT NULL,
    verification_method VARCHAR(64),               -- ast_import | file_path | dependency_manifest
    source_decision_id  VARCHAR(64),               -- references ADR
    rule_version        VARCHAR(16)     DEFAULT '1.0.0',
    active              BOOLEAN         DEFAULT TRUE,
    created_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP(),
    updated_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

COMMENT ON TABLE ARCHITECTURE_RULES IS
    'Machine-verifiable architecture boundary rules exported by Archy and enforced by Dev.';

-- ---------------------------------------------------------------------------
-- 4.2  ARCHITECTURE_DECISIONS (ADRs)
--      Architecture Decision Records linked to rules and Archy sessions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE ARCHITECTURE_DECISIONS (
    decision_id         VARCHAR(64)     NOT NULL PRIMARY KEY,
    project_id          VARCHAR(64)     NOT NULL,
    title               VARCHAR(256)    NOT NULL,
    status              VARCHAR(32)     NOT NULL,  -- Accepted | Rejected | Superseded | Deprecated
    layer               VARCHAR(128),
    context_summary     TEXT,
    decision_text       TEXT            NOT NULL,
    consequences        TEXT,
    decision_date       DATE,
    superseded_by       VARCHAR(64),
    created_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

COMMENT ON TABLE ARCHITECTURE_DECISIONS IS
    'Architecture Decision Records (ADRs) authored in Archy and linked to enforced rules.';

-- ---------------------------------------------------------------------------
-- 4.3  RULE_VIOLATION_LOG
--      Log of architecture violations detected by Dev (no raw code stored).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE RULE_VIOLATION_LOG (
    violation_id        VARCHAR(64)     NOT NULL PRIMARY KEY,
    rule_id             VARCHAR(64)     NOT NULL REFERENCES ARCHITECTURE_RULES(rule_id),
    project_id          VARCHAR(64)     NOT NULL,
    file_path_hash      VARCHAR(64),               -- SHA-256 hash only; no raw path
    language            VARCHAR(32)     DEFAULT 'python',
    severity            VARCHAR(16)     NOT NULL,
    was_dismissed       BOOLEAN         DEFAULT FALSE,
    was_fixed           BOOLEAN         DEFAULT FALSE,
    detected_at         TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

COMMENT ON TABLE RULE_VIOLATION_LOG IS
    'Aggregate architecture violation log; file paths hashed for privacy.';

-- ===========================================================================
-- 5.  CORTEX VECTOR SEARCH SETUP
--     Enables semantic retrieval for pattern and refactoring case lookup.
-- ===========================================================================
USE SCHEMA OPENLENS_DB.KNOWLEDGE;

-- Create a search service on ARCHITECTURAL_PATTERNS (requires Snowflake Cortex)
-- Uncomment after enabling Cortex in your account:
/*
CREATE OR REPLACE CORTEX SEARCH SERVICE pattern_search
  ON description, rationale, trade_offs
  ATTRIBUTES category, tags, applicable_layers
  WAREHOUSE = OPENLENS_WH
  TARGET_LAG = '1 hour'
AS
  SELECT pattern_id, name, category, description, rationale, trade_offs,
         example_snippet, applicable_layers, tags, source_url, version
  FROM ARCHITECTURAL_PATTERNS;
*/

-- ===========================================================================
-- 6.  SAMPLE SEED DATA — Architectural Patterns
-- ===========================================================================
USE SCHEMA OPENLENS_DB.KNOWLEDGE;

INSERT INTO ARCHITECTURAL_PATTERNS
    (pattern_id, name, category, description, rationale, trade_offs, example_snippet,
     applicable_layers, tags, source_url, version)
VALUES
(
    'pat_strategy',
    'Strategy Pattern',
    'Behavioral',
    'Defines a family of algorithms, encapsulates each one, and makes them interchangeable without altering clients.',
    'Allows swapping concrete inference strategies (e.g. Autoencoder vs Deep Feature Extractor) at runtime without modifying orchestration code.',
    'Adds one level of indirection; appropriate when algorithm variance is expected.',
    'class InferenceStrategy(ABC):\n    @abstractmethod\n    def evaluate(self, data) -> Result: pass',
    ARRAY_CONSTRUCT('backend'),
    ARRAY_CONSTRUCT('behavioral', 'runtime-polymorphism', 'testability'),
    'https://refactoring.guru/design-patterns/strategy',
    '1.0.0'
),
(
    'pat_pub_sub',
    'Publisher-Subscriber',
    'Architectural',
    'Decouples producers from consumers via an event bus; producers publish events without knowing subscribers.',
    'Eliminates direct coupling between hardware I/O drivers and downstream analytics, preventing backpressure.',
    'Debugging distributed events is harder; ensure at-least-once or exactly-once guarantees match SLA.',
    'publisher.send_multipart([b"topic", payload.serialize()])',
    ARRAY_CONSTRUCT('backend', 'ingestion'),
    ARRAY_CONSTRUCT('messaging', 'decoupling', 'async'),
    'https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern',
    '1.0.0'
),
(
    'pat_repository',
    'Repository Pattern',
    'Structural',
    'Abstracts the data layer behind a collection-like interface, decoupling domain logic from storage details.',
    'Enables swapping storage backends (in-memory → Parquet → Snowflake) without changing business logic.',
    'Adds a mapping layer; justified when persistence strategy evolves or unit testing needs mocking.',
    'class TelemetryRepository:\n    def save_batch(self, records: list) -> None: ...\n    def query_range(self, start, end) -> DataFrame: ...',
    ARRAY_CONSTRUCT('backend', 'database'),
    ARRAY_CONSTRUCT('persistence', 'testability', 'abstraction'),
    'https://martinfowler.com/eaaCatalog/repository.html',
    '1.0.0'
),
(
    'pat_adapter',
    'Adapter Pattern',
    'Structural',
    'Converts an interface of a class into another interface clients expect, enabling otherwise incompatible interfaces to work together.',
    'Provides vendor-neutral inference interface, allowing OpenLens to route to local Ollama or remote API without changing call sites.',
    'Each new provider requires a new adapter; keep adapters thin and test them independently.',
    'class ModelGatewayAdapter(ABC):\n    async def complete(self, prompt: BoundedPrompt) -> ModelProposal: ...',
    ARRAY_CONSTRUCT('backend'),
    ARRAY_CONSTRUCT('vendor-neutrality', 'integration', 'structural'),
    'https://refactoring.guru/design-patterns/adapter',
    '1.0.0'
),
(
    'pat_pipeline_filter',
    'Pipeline & Filter',
    'Architectural',
    'Chains a sequence of processing steps (filters) connected by data channels (pipes); each filter reads input, transforms it, and writes output.',
    'Allows individual signal processing steps to be benchmarked, replaced, or reordered in isolation.',
    'Order-dependent; parallelism opportunities depend on filter independence.',
    'class SignalPipeline:\n    def process(self, raw: ndarray) -> ndarray:\n        for stage in self.filters: raw = stage.apply(raw)\n        return raw',
    ARRAY_CONSTRUCT('backend'),
    ARRAY_CONSTRUCT('data-flow', 'composability', 'testability'),
    'https://docs.microsoft.com/en-us/azure/architecture/patterns/pipes-and-filters',
    '1.0.0'
),
(
    'pat_factory_method',
    'Factory Method',
    'Creational',
    'Defines an interface for creating objects but lets subclasses or a factory function decide which class to instantiate.',
    'Centralises agent instantiation logic and isolates configuration; adding a new agent type does not require touching coordinator code.',
    'Can grow into a large switch statement; consider registry-based factories for many variants.',
    'def create_agent(agent_type: str, config: Config) -> BaseAgent:\n    registry = {"nav": NavAgent, "risk": RiskAgent}\n    return registry[agent_type](config)',
    ARRAY_CONSTRUCT('backend'),
    ARRAY_CONSTRUCT('creational', 'extensibility', 'configuration'),
    'https://refactoring.guru/design-patterns/factory-method',
    '1.0.0'
);

-- ===========================================================================
-- 7.  SAMPLE SEED DATA — Library Knowledge
-- ===========================================================================

INSERT INTO LIBRARY_KNOWLEDGE
    (library_id, name, ecosystem, pypi_name, latest_version, licence,
     is_maintained, common_use_cases, replaces, compat_notes, source_url)
VALUES
(
    'lib_fastapi',
    'FastAPI',
    'python',
    'fastapi',
    '0.111.0',
    'MIT',
    TRUE,
    ARRAY_CONSTRUCT('REST API', 'async web services', 'OpenAPI generation'),
    ARRAY_CONSTRUCT('lib_flask', 'lib_django_rest'),
    'Requires Python 3.8+; pair with uvicorn for ASGI serving.',
    'https://fastapi.tiangolo.com'
),
(
    'lib_snowflake_connector',
    'Snowflake Connector for Python',
    'python',
    'snowflake-connector-python',
    '3.8.0',
    'Apache-2.0',
    TRUE,
    ARRAY_CONSTRUCT('Snowflake SQL execution', 'data upload', 'query results'),
    ARRAY_CONSTRUCT(),
    'Requires snowflake account; use key-pair or OAuth for auth.',
    'https://docs.snowflake.com/en/developer-guide/python-connector/python-connector'
),
(
    'lib_libcst',
    'LibCST',
    'python',
    'libcst',
    '1.3.0',
    'MIT',
    TRUE,
    ARRAY_CONSTRUCT('Python CST parsing', 'codemod', 'AST analysis'),
    ARRAY_CONSTRUCT('lib_ast_builtin'),
    'Preserves formatting and comments; preferred over built-in ast for patch proposals.',
    'https://libcst.readthedocs.io'
),
(
    'lib_pydantic',
    'Pydantic',
    'python',
    'pydantic',
    '2.7.0',
    'MIT',
    TRUE,
    ARRAY_CONSTRUCT('data validation', 'schema definition', 'settings management'),
    ARRAY_CONSTRUCT(),
    'v2 API differs from v1; check migration guide when upgrading.',
    'https://docs.pydantic.dev'
);

-- ===========================================================================
-- 8.  SAMPLE SEED DATA — Benchmark Cases
-- ===========================================================================
USE SCHEMA OPENLENS_DB.EVALUATION;

INSERT INTO BENCHMARK_CASES
    (case_id, suite_name, suite_version, finding_category, language,
     expected_finding, code_snippet, ground_truth_notes, severity)
VALUES
(
    'bc_dup_001',
    'python_dup_v1',
    '1.0.0',
    'duplication',
    'python',
    TRUE,
    'def fetch_user(user_id):\n    conn = db.connect()\n    return conn.execute("SELECT * FROM users WHERE id=?", user_id)\n\n# 30 lines later:\ndef get_user_record(uid):\n    conn = db.connect()\n    return conn.execute("SELECT * FROM users WHERE id=?", uid)',
    'Exact semantic duplicate across two functions; should be consolidated.',
    'high'
),
(
    'bc_dup_002',
    'python_dup_v1',
    '1.0.0',
    'duplication',
    'python',
    FALSE,
    'def compute_tax_uk(income): return income * 0.20\ndef compute_tax_us(income): return income * 0.25',
    'Structurally similar but semantically distinct; not a duplicate.',
    'info'
),
(
    'bc_unused_001',
    'python_lint_v1',
    '1.0.0',
    'unused_code',
    'python',
    TRUE,
    'import os\nimport json\nimport hashlib  # never used below\n\ndef process(data):\n    return json.dumps(data)',
    'hashlib is imported but never referenced; unused import.',
    'medium'
),
(
    'bc_complexity_001',
    'python_complexity_v1',
    '1.0.0',
    'complexity',
    'python',
    TRUE,
    'def route_request(req):\n    if req.method == "GET":\n        if req.path == "/a":\n            if req.auth:\n                if req.version == 2:\n                    return handler_a_v2(req)\n                return handler_a(req)\n            return unauthorized()\n        elif req.path == "/b":\n            return handler_b(req)\n    elif req.method == "POST":\n        if req.path == "/c":\n            return handler_c(req)\n    return not_found()',
    'Cyclomatic complexity >7; should be decomposed.',
    'medium'
),
(
    'bc_arch_001',
    'python_arch_v1',
    '1.0.0',
    'architecture_drift',
    'python',
    TRUE,
    '# In frontend/dashboard.py\nfrom database.models import RawSensorRecord  # crosses frontend→database boundary',
    'Frontend layer directly importing database model violates layer isolation rule.',
    'high'
);

-- ===========================================================================
-- 9.  SAMPLE ARCHITECTURE RULES (RULES SCHEMA)
-- ===========================================================================
USE SCHEMA OPENLENS_DB.RULES;

INSERT INTO ARCHITECTURE_DECISIONS
    (decision_id, project_id, title, status, layer, context_summary,
     decision_text, consequences, decision_date)
VALUES
(
    'adr_core_001',
    'openlens_core',
    'Two-Mode Architecture: Dev in VS Code, Archy in Web Workspace',
    'Accepted',
    'Frontend / System',
    'Developers need code-level feedback without leaving their editor, and visual architecture tooling without IDE bloat.',
    'Provide code-level maintainability checking in the VS Code extension (Dev) and visual system design in the Archy web workspace (Archy), connected by shared rules and a common API.',
    'Prevents IDE bloat; dedicated visual workspace enables complex diagrams and trade-off evaluations without losing editor context.',
    '2026-10-18'
),
(
    'adr_core_002',
    'openlens_core',
    'Deterministic Local AST Analysis with Fail-Safe Offline Mode',
    'Accepted',
    'Backend',
    'Core local checks must not require network or Snowflake availability to provide developer value.',
    'Perform all duplication detection and linting checks locally via Python AST without requiring cloud services.',
    'Ensures sub-50ms editor feedback and complete user privacy for proprietary codebases.',
    '2026-10-19'
),
(
    'adr_core_003',
    'openlens_core',
    'Snowflake for Knowledge Retrieval and Evaluation — Not for Raw Source Code',
    'Accepted',
    'Database / Cloud',
    'Snowflake provides scalable knowledge storage and retrieval, but transmitting raw user source code violates privacy principles.',
    'Use Snowflake only for curated architecture patterns, library metadata, anonymised benchmark cases, and aggregate analytics. No raw source code or secrets transmitted.',
    'Enables enterprise-grade retrieval quality while preserving developer privacy and challenge compliance.',
    '2026-10-20'
);

INSERT INTO ARCHITECTURE_RULES
    (rule_id, project_id, name, description, scope, severity, rationale,
     source_layer, target_layer, allowed, verification_method, source_decision_id, rule_version)
VALUES
(
    'rule_core_01',
    'openlens_core',
    'No Raw Source Code to External APIs',
    'OpenLens Dev must never transmit unredacted source code, file paths, or credentials to model gateways or Snowflake without explicit user consent.',
    'service',
    'error',
    'Protects proprietary code and user privacy as a primary product principle.',
    'backend',
    'external',
    FALSE,
    'payload_inspection',
    'adr_core_003',
    '1.0.0'
),
(
    'rule_core_02',
    'openlens_core',
    'Frontend Must Not Import Database Models Directly',
    'Frontend layer components (VS Code Webview, Archy web) must not directly import or query database models. All data access goes through the backend API.',
    'import',
    'error',
    'Enforces layer separation and prevents tight coupling between presentation and persistence.',
    'frontend',
    'database',
    FALSE,
    'ast_import',
    'adr_core_001',
    '1.0.0'
),
(
    'rule_core_03',
    'openlens_core',
    'Archy Rules Must Be Versioned Before Export',
    'Architecture rules exported from Archy to Dev must include a version field and source_decision_id.',
    'file',
    'warning',
    'Ensures Dev can detect stale rules and trace every constraint to a recorded decision.',
    'frontend',
    'security',
    TRUE,
    'json_schema_validation',
    'adr_core_001',
    '1.0.0'
),
(
    'rule_core_04',
    'openlens_core',
    'Local Checks Must Run Without Snowflake',
    'Deterministic AST checks (duplication, unused imports, complexity) must complete successfully when Snowflake is unreachable.',
    'service',
    'error',
    'Guarantees developer value and privacy-preserving offline operation.',
    'backend',
    'database',
    TRUE,
    'integration_test',
    'adr_core_002',
    '1.0.0'
);

-- ===========================================================================
-- 10. USEFUL VIEWS FOR REPORTING & EVALUATION DASHBOARD
-- ===========================================================================
USE SCHEMA OPENLENS_DB.EVALUATION;

CREATE OR REPLACE VIEW V_LATEST_BENCHMARK_SCORES AS
    SELECT
        r.run_id,
        r.suite_name,
        r.suite_version,
        r.model_id,
        r.model_version,
        r.run_timestamp,
        r.true_positives,
        r.false_positives,
        r.false_negatives,
        r.precision_score,
        r.recall_score,
        r.f1_score,
        r.avg_latency_ms
    FROM EVALUATION_RUNS r
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY suite_name, suite_version, model_id
        ORDER BY run_timestamp DESC
    ) = 1;

COMMENT ON VIEW V_LATEST_BENCHMARK_SCORES IS
    'Latest benchmark scores per suite and model combination for dashboard display.';

CREATE OR REPLACE VIEW V_CATEGORY_PRECISION AS
    SELECT
        bc.finding_category,
        COUNT(*) AS total_cases,
        SUM(CASE WHEN cr.correct = TRUE THEN 1 ELSE 0 END) AS correct_predictions,
        ROUND(SUM(CASE WHEN cr.correct = TRUE THEN 1 ELSE 0 END)::FLOAT / COUNT(*), 4) AS accuracy
    FROM CASE_RESULTS cr
    JOIN BENCHMARK_CASES bc ON cr.case_id = bc.case_id
    GROUP BY bc.finding_category;

COMMENT ON VIEW V_CATEGORY_PRECISION IS
    'Per-category detection accuracy across all evaluation runs.';

USE SCHEMA OPENLENS_DB.ANALYTICS;

CREATE OR REPLACE VIEW V_FINDING_ACCEPTANCE_RATE AS
    SELECT
        finding_category,
        COUNT(*) AS total_feedback,
        SUM(CASE WHEN action = 'accepted' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN action = 'dismissed' THEN 1 ELSE 0 END) AS dismissed,
        SUM(CASE WHEN action = 'incorrect' THEN 1 ELSE 0 END) AS marked_incorrect,
        ROUND(SUM(CASE WHEN action = 'accepted' THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0), 4) AS acceptance_rate
    FROM FINDING_FEEDBACK
    GROUP BY finding_category
    ORDER BY acceptance_rate DESC;

COMMENT ON VIEW V_FINDING_ACCEPTANCE_RATE IS
    'Per-category finding acceptance vs dismissal rates for product quality monitoring.';

-- ===========================================================================
-- 11. WAREHOUSE & RESOURCE MONITOR (adjust sizes to stay within budget)
-- ===========================================================================

CREATE WAREHOUSE IF NOT EXISTS OPENLENS_WH
    WAREHOUSE_SIZE = 'X-SMALL'
    AUTO_SUSPEND = 60
    AUTO_RESUME = TRUE
    INITIALLY_SUSPENDED = TRUE
    COMMENT = 'OpenLens primary compute warehouse; auto-suspends after 60s idle.';

CREATE RESOURCE MONITOR IF NOT EXISTS OPENLENS_RM
    WITH CREDIT_QUOTA = 5          -- monthly cap; adjust per challenge budget
    FREQUENCY = MONTHLY
    START_TIMESTAMP = IMMEDIATELY
    TRIGGERS ON 80 PERCENT DO NOTIFY
             ON 100 PERCENT DO SUSPEND;

ALTER WAREHOUSE OPENLENS_WH SET RESOURCE_MONITOR = OPENLENS_RM;

-- ===========================================================================
-- END OF SCHEMA — OpenLens Snowflake Knowledge & Evaluation Store
-- ===========================================================================
