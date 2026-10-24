# OpenLens Architecture

**Status:** Proposed logical architecture v0.1\
**Purpose:** Describe the system architecture for OpenLens Dev and
OpenLens Archy.\
**Note:** This is a proposed architecture, not a claim that components
have already been implemented.

## 1. Architecture goals

-   Provide one extension with two modes: Dev and Archy.
-   Keep common capabilities shared without coupling every operation to
    a remote service.
-   Support hybrid local and remote inference.
-   Make analysis evidence, project rules, and evaluation results
    traceable.
-   Keep source-code access scoped and user-controlled.
-   Let Archy publish architecture constraints that Dev can check.
-   Use Snowflake for justified knowledge and evaluation workloads, not
    as a mandatory hop for every local scan.

## 2. System context

``` mermaid
flowchart LR
    U[Developer] --> IDE[VS Code Extension]
    IDE --> DEV[OpenLens Dev]
    IDE --> ARCHY[OpenLens Archy Entry]
    DEV --> LOCAL[Local Analysis Engine]
    DEV --> API[OpenLens Backend API]
    ARCHY --> WEB[Archy Web Workspace]
    WEB --> API
    API --> RET[Retrieval and Knowledge Service]
    API --> LLM[Model Gateway]
    RET --> SF[Snowflake Knowledge and Evaluation Data]
    LLM --> LOCALMODEL[Local Model Adapter]
    LLM --> REMOTEMODEL[Remote Model Adapter]
    API --> EVAL[Evaluation and Observability]
    EVAL --> SF
    ARCHY --> RULES[Architecture Decisions and Rules]
    RULES --> DEV
```

The model gateway may route a request locally or remotely according to
configuration, task requirements, model availability, and user consent.
A local static analysis task should not require Snowflake availability.

## 3. Logical components

### 3.1 VS Code extension

Responsibilities: - Provide Dev and Archy commands, status, findings,
and settings. - Collect only user-approved editor context. - Read
supported diagnostics and debugging events. - Show evidence, findings,
proposed patches, and validation status. - Open the Archy web
workspace. - Require explicit approval before applying patches or
triggering consequential actions.

The extension should not assume it can reliably capture every terminal
or runtime event. Initial automatic detection should use supported VS
Code diagnostics and debugging APIs, with user-triggered input as a
reliable fallback.

### 3.2 Local project analysis engine

Responsibilities: - Inspect selected files and project metadata. - Run
approved local static-analysis tools. - Identify exact duplication and
supported near-duplicate candidates. - Parse dependency manifests and
relevant import/reference relationships. - Filter secrets and apply
configured exclusions before remote requests. - Compare code changes
against locally available architecture rules. - Provide deterministic
findings to the shared reasoning layer.

The engine should use established tools where practical rather than
implementing every parser, linter, or detector from scratch.

### 3.3 Shared reasoning and orchestration service

Responsibilities: - Normalise findings into a common schema. - Retrieve
relevant evidence and project knowledge. - Build bounded context for
model requests. - Ask the model for explanations, prioritisation,
alternatives, or patch proposals. - Record request provenance and
validation outcomes. - Apply policy checks for privacy, permissions, and
allowed actions.

The service must distinguish deterministic tool output from
model-generated interpretation.

### 3.4 Model gateway

Responsibilities: - Expose a provider-neutral interface for inference. -
Support local and remote model adapters. - Apply routing policy based on
privacy configuration and task capability. - Enforce payload
minimisation, timeouts, cancellation, and output validation. - Return
model identity and relevant execution metadata where practical.

No model should be trusted to execute arbitrary commands or apply edits
directly. Model output is a proposal to be checked by the application.

### 3.5 Knowledge and retrieval service

Responsibilities: - Index approved documentation, curated examples, and
sanitised, user-approved resolved cases. - Retrieve relevant records for
a finding or architecture question. - Return source identifiers,
snippets, metadata, and retrieval scores. - Maintain data provenance and
remove or update stale knowledge.

Snowflake can support structured metadata, evaluation records, and
suitable search/retrieval workloads. The specific Snowflake services
must be chosen after verifying challenge constraints, service
availability, cost, and data-handling requirements.

### 3.6 OpenLens Archy web workspace

Responsibilities: - Capture requirements and constraints for new
projects. - Present architecture alternatives and trade-offs. - Render
and revise architecture diagrams. - Display technology-stack and
design-pattern recommendations. - Generate architecture decision records
and reports. - Analyse repository inventory provided with permission. -
Evaluate architecture against an explicit rubric. - Export approved
architecture rules for Dev.

The web workspace should receive only the information needed for the
requested task. If it analyses a repository remotely, the user must
understand and approve what will be transferred.

### 3.7 Evaluation and observability

Responsibilities: - Maintain a versioned benchmark of known findings and
expected outcomes. - Measure detector precision/recall where ground
truth exists. - Track patch validation outcomes and human feedback. -
Measure retrieval relevance, answer grounding, latency, and failure
rates. - Record privacy-safe aggregate metrics where permitted. -
Support reproducible comparisons between model, prompt, and rule
versions.

Do not store raw source code, secrets, or full prompts in analytics by
default. Any retention must be explicit and policy-controlled.

## 4. Primary data flows

### Flow A --- Maintainability scan

1.  User selects a project, folder, files, or changed-file scope.
2.  Extension confirms scope and exclusions.
3.  Local engine runs available deterministic checks.
4.  Findings are normalised and grouped.
5.  If requested and permitted, the backend retrieves relevant knowledge
    and asks the model for contextual interpretation.
6.  Extension shows evidence, confidence, limitations, and next actions.
7.  User can request a proposed patch.

### Flow B --- Safe refactoring

1.  A finding is selected.
2.  The system generates a minimal patch proposal.
3.  The patch is parsed and validated before display.
4.  User reviews the diff and approves or rejects it.
5.  If approved, the extension applies the patch.
6.  Available tests, linting, or type checks run with permission.
7.  The result is reported as passed, failed, or not run. The system
    does not equate passing tests with proof of correctness.

### Flow C --- Architecture design in Archy

1.  User supplies goals, requirements, constraints, and team context.
2.  Archy identifies missing high-impact information.
3.  It proposes one or more architectures and explains trade-offs.
4.  It produces diagrams, stack recommendations, pattern choices, and
    ADRs.
5.  The evaluation framework scores the proposal against explicit
    criteria.
6.  User reviews and approves architecture rules.
7.  Approved rules are made available to Dev.

### Flow D --- Existing architecture analysis

1.  User approves repository scope.
2.  Local inventory captures observable technologies, dependencies,
    imports, and file/module relationships.
3.  Archy distinguishes observations from inferred architecture.
4.  The evaluator compares observations with requirements and approved
    rules.
5.  It produces findings, a target-state proposal, and a staged
    migration plan.
6.  Dev checks later code changes against applicable rules.

## 5. Shared data contracts

Use versioned, provider-neutral schemas. Suggested conceptual records:

### Finding

-   `id`
-   `category` (duplication, unused_code, dependency, complexity,
    architecture_drift, etc.)
-   `severity`
-   `confidence`
-   `location` (file and range where available)
-   `summary`
-   `evidence[]`
-   `rationale`
-   `suggested_action`
-   `validation_status`
-   `rule_id`
-   `created_at`

### Evidence

-   `source_type` (static_tool, repository, documentation, test_result,
    retrieved_case, model_inference)
-   `source_reference`
-   `excerpt_or_summary`
-   `observed_or_inferred`
-   `timestamp_or_version`
-   `limitations`

### Architecture rule

-   `rule_id`
-   `name`
-   `description`
-   `scope`
-   `severity`
-   `rationale`
-   `verification_method`
-   `source_decision_id`
-   `version`

### Patch proposal

-   `id`
-   `finding_id`
-   `unified_diff`
-   `expected_effect`
-   `risk_notes`
-   `tests_to_run[]`
-   `approval_status`
-   `validation_results[]`

These are design contracts; exact storage formats and APIs remain
implementation decisions.

## 6. Architecture evaluation model

Archy should use a transparent rubric rather than a single opaque AI
score.

Recommended dimensions: 1. Requirements and constraint fit. 2.
Modularity and separation of concerns. 3. Maintainability and
changeability. 4. Security design and trust boundaries. 5. Reliability
and failure handling. 6. Performance and scalability assumptions. 7.
Operational complexity and deployment fit. 8. Technology and dependency
suitability. 9. Testability and observability. 10. Conformance between
intended and observed architecture.

Each assessment should include: - criterion and weight, if weighted; -
evidence and source; - finding severity; - observed fact versus
inference; - confidence and unknowns; - recommended action; - validation
method.

Weights should be configurable by project type. A prototype, a mobile
application, and a high-availability service should not automatically
receive identical weightings. A numerical score is a decision aid, not
proof of quality.

## 7. Security and privacy boundaries

-   Local analysis should be the default for source inspection when
    practical.
-   Only scoped and necessary context should be sent remotely.
-   Provide repository exclusions and controls for local versus remote
    inference.
-   Detect and redact likely secrets before external transmission.
-   Never send credentials or secrets to a language model intentionally.
-   Treat repository content and retrieved documents as untrusted data,
    not instructions.
-   Do not let model output directly execute shell commands.
-   Require approval before applying patches, installing dependencies,
    or making destructive changes.
-   Use least-privilege credentials and separate development/test
    environments.
-   Apply access controls and retention rules to any stored project or
    evaluation data.
-   Provide deletion/retention controls for saved debugging cases where
    supported.

## 8. Failure handling

-   If Snowflake or the backend is unavailable, local deterministic
    checks should still work.
-   If a model call fails, show the deterministic findings and state
    that AI interpretation was unavailable.
-   If tests cannot run, report `not run`; do not imply that a patch is
    safe.
-   If evidence is insufficient, ask for context or return an
    uncertainty statement.
-   If a repository exceeds the scan budget, offer narrower scope or an
    incremental scan.
-   If a rule cannot be verified automatically, mark it as requiring
    human review.

## 9. Deployment view

Initial development can use: - VS Code extension package. - Local Python
analysis environment. - Optional backend API for remote inference and
retrieval. - Archy web workspace. - Snowflake account/schema and
approved services for the challenge's knowledge/evaluation needs. -
Local or remote model adapter.

Secrets and credentials must be managed through environment
configuration or an approved secret manager, never hard-coded in the
repository. The deployment model should be finalised only after
challenge rules, cost limits, and privacy expectations are confirmed.

## 10. Architectural decisions to resolve

1.  Select the precise Snowflake services allowed and required by the
    challenge.
2.  Verify the selected open-source model licence and hosting strategy.
3.  Decide which operations are fully local versus remote.
4.  Select the Python static-analysis tools for the MVP.
5.  Choose a diagram format and web rendering approach.
6.  Define the evaluation dataset and baseline metrics.
7.  Define how architecture rules are versioned and distributed to Dev.
8.  Define data retention and consent for saved cases and telemetry.
