# OpenLens Development Phases

**Status:** Proposed roadmap v0.1\
**Planning style:** Milestone-based; dates and duration should be set
after confirming team size, available hours, and challenge deadline.

## Roadmap principles

-   Validate the product before expanding scope.
-   Build one integrated extension, not two disconnected products.
-   Start with Python and VS Code.
-   Prefer a narrow end-to-end workflow over many incomplete features.
-   Establish a benchmark early and measure improvements against it.
-   Do not add complex cloud infrastructure until its value is
    demonstrated.
-   Keep every phase demonstrable, testable, and reversible.

## Phase 0 --- Product and challenge validation

### Objectives

Confirm the problem, target user, product boundary, and competition
constraints.

### Tasks

-   Confirm OpenLens Dev and OpenLens Archy are two modes in one
    extension.
-   Define the first user workflow and the most important
    maintainability findings.
-   Verify Challenge-B requirements for open-source AI and Snowflake.
-   Confirm model licence, deployment limits, allowed Snowflake
    services, and any restrictions on external APIs.
-   Select a small set of sample Python repositories or create
    controlled test projects.
-   Define a baseline benchmark and acceptance criteria.
-   Decide what project information may be processed locally or
    remotely.

### Deliverables

-   Approved product scope.
-   Confirmed challenge-compliance checklist.
-   Initial benchmark specification.
-   Privacy and data-flow decision.

### Exit criteria

The team can explain the product's differentiator in one paragraph and
demonstrate that the planned AI/Snowflake approach is permitted.

## Phase 1 --- Shared extension foundation

### Objectives

Create the smallest working shell for both modes.

### Tasks

-   Set up the VS Code extension project and development workflow.
-   Add a unified OpenLens entry point with Dev and Archy commands.
-   Define shared schemas for findings, evidence, architecture rules,
    and patch proposals.
-   Add settings for project exclusions, automatic alerts, and
    local/remote processing.
-   Implement basic logging and error handling without collecting source
    content unnecessarily.
-   Add a provider-neutral model interface, even if only one adapter is
    initially implemented.

### Deliverables

-   Installable development extension.
-   Shared UI/navigation.
-   Versioned initial schemas.
-   Privacy/settings baseline.

### Exit criteria

The extension launches, both modes are reachable, and a test request can
pass through the intended interface without requiring all product
features to exist.

## Phase 2 --- OpenLens Dev: deterministic maintainability checks

### Objectives

Produce useful findings before adding complex AI reasoning.

### Tasks

-   Support a scoped scan of selected Python files or a project.
-   Integrate suitable established tools for unused imports, linting,
    and basic complexity signals.
-   Add an exact-duplication detector or integrate an appropriate tool.
-   Normalise tool results into the shared finding schema.
-   Show affected locations, categories, severity, and available
    evidence.
-   Add finding dismissal and duplicate-alert suppression.
-   Build positive and negative benchmark cases to measure false
    positives.

### Deliverables

-   Working project scan.
-   Finding panel or view.
-   Repeatable benchmark report.

### Exit criteria

The extension reliably detects a predefined set of known issues and
reports tool output without inventing findings.

## Phase 3 --- Contextual reasoning and library-first suggestions

### Objectives

Make findings understandable and useful in the context of the actual
project.

### Tasks

-   Inspect dependency manifests and relevant import/use information.
-   Add contextual explanations for supported findings.
-   Identify selected cases where an existing dependency or project
    utility may replace custom logic.
-   Require evidence for API and dependency recommendations; mark
    unknown compatibility or licence information.
-   Add optional retrieval from a curated documentation and example
    knowledge base.
-   Integrate the permitted open-source model.
-   Add local/remote routing and payload minimisation.
-   Evaluate retrieval relevance and explanation quality.

### Deliverables

-   Contextual maintainability explanations.
-   Library-first recommendations for supported scenarios.
-   Working model adapter and knowledge retrieval path.

### Exit criteria

Benchmark results show that the added reasoning provides measurable
value over deterministic findings alone, without unacceptable false
positives or privacy exposure.

## Phase 4 --- Safe refactoring workflow

### Objectives

Move from finding issues to proposing controlled improvements.

### Tasks

-   Generate minimal patch proposals for a limited set of finding types.
-   Validate patch structure and affected-file scope.
-   Show a diff before application.
-   Require explicit user approval.
-   Run available tests, linters, and type checks after applying an
    approved patch.
-   Report passed, failed, skipped, and unavailable checks separately.
-   Add recovery guidance for failed validation.
-   Test that unrelated files are not changed.

### Deliverables

-   Reviewable patch workflow.
-   Validation report.
-   Tests for approval, rejection, and failure cases.

### Exit criteria

A controlled set of refactors can be proposed and reviewed, and the
system accurately reports validation results without claiming guaranteed
correctness.

## Phase 5 --- OpenLens Archy: architecture design workspace

### Objectives

Deliver an architecture-design experience in a browser workspace
launched from the extension.

### Tasks

-   Capture requirements, quality attributes, constraints, budget, scale
    assumptions, and team capabilities.
-   Ask follow-up questions for missing high-impact information.
-   Generate architecture alternatives and explain trade-offs.
-   Recommend a technology stack and design patterns with explicit
    rationale.
-   Generate architecture diagrams and architecture decision records.
-   Implement an initial transparent evaluation rubric.
-   Show assumptions, evidence, confidence, and unknowns.
-   Export an approved architecture summary and rules.

### Deliverables

-   Archy web workspace.
-   Architecture proposal and diagram generation.
-   Initial evaluation report.
-   Exportable architecture decisions/rules.

### Exit criteria

A user can describe a sample project, review an architecture proposal,
inspect trade-offs, and receive an evaluation against explicit criteria.

## Phase 6 --- Existing-project analysis and architecture conformance

### Objectives

Connect intended architecture to observable implementation.

### Tasks

-   Inventory project files, dependencies, imports, and module
    relationships within an approved scope.
-   Separate observed facts from inferred architecture.
-   Compare the inventory with approved Archy decisions and rules.
-   Detect a limited set of architecture violations, such as forbidden
    dependency directions or boundary crossings when they can be
    measured.
-   Generate prioritised restructuring recommendations.
-   Produce incremental migration steps with validation and rollback
    considerations.
-   Feed architecture rules to Dev for future code-change checks.

### Deliverables

-   Existing-project architecture inventory.
-   Architecture conformance report.
-   Initial target-state and migration plan.
-   Dev/Archy rule exchange.

### Exit criteria

At least one architecture rule created in Archy can be evaluated against
a controlled repository, and Dev can surface a relevant violation with
evidence.

## Phase 7 --- Snowflake integration and evaluation maturity

This phase may begin earlier if required by the challenge, but the scope
should remain purposeful.

### Objectives

Demonstrate a genuine Snowflake contribution and produce reproducible
evaluation evidence.

### Tasks

-   Select permitted Snowflake services after confirming competition
    rules.
-   Create a curated knowledge/evaluation dataset with appropriate
    provenance.
-   Implement approved retrieval or evaluation-data workflows.
-   Avoid sending full source repositories or secrets by default.
-   Version benchmark cases, rules, model configuration, and prompts
    where practical.
-   Measure detector precision/recall where ground truth exists, patch
    test outcomes, retrieval relevance, answer grounding, latency, and
    cost.
-   Compare the system against a deterministic-only baseline.
-   Document limitations and negative results.

### Deliverables

-   Working, documented Snowflake integration.
-   Reproducible evaluation pipeline.
-   Benchmark report with methodology and limitations.
-   Challenge-compliance evidence.

### Exit criteria

The Snowflake component has a clear function, the open-source AI
requirement is satisfied, and evaluation results can be reproduced from
documented steps.

## Phase 8 --- Hardening and demonstration

### Objectives

Prepare a reliable, honest, and understandable demonstration.

### Tasks

-   Test unavailable model/backend/Snowflake scenarios.
-   Review privacy controls, exclusions, secret redaction, and data
    retention.
-   Verify no unapproved patch or dependency changes occur.
-   Test with clean sample projects and known failure cases.
-   Reduce noisy findings and improve failure messages.
-   Prepare a short end-to-end demo that shows a real finding, evidence,
    a proposed patch, validation, and an Archy architecture rule.
-   Document installation, configuration, supported scenarios, and known
    limitations.

### Deliverables

-   Release candidate.
-   Setup and usage documentation.
-   Test and evaluation report.
-   Reproducible demo scenario.

### Exit criteria

The demo can be repeated from a clean environment, and all claims are
supported by observable behaviour or clearly labelled as future work.

## Suggested priority if time is limited

If the deadline is tight, prioritise this thin vertical slice:

1.  VS Code extension with one shared OpenLens entry point.
2.  Python maintainability scan using established deterministic tools.
3.  Evidence-backed explanation for one or two finding categories.
4.  Reviewable patch for one limited refactor type.
5.  Archy design of a sample project with a diagram and transparent
    evaluation.
6.  One architecture rule checked by Dev.
7.  A permitted, meaningful Snowflake use and a small reproducible
    evaluation.

Do not attempt every language, automatic interception of every AI tool,
broad autonomous refactoring, or enterprise team features before this
slice works.

## Release gates

Every phase should pass these gates before moving forward:

-   **Functionality:** the defined workflow works end to end.
-   **Quality:** benchmark results and known limitations are recorded.
-   **Safety:** no unapproved code changes or unintended data transfers.
-   **Transparency:** evidence, assumptions, and validation outcomes are
    visible.
-   **Maintainability:** tests and interfaces exist for the new
    component.
-   **Challenge fit:** model licensing and Snowflake usage remain
    compliant.

## Roadmap dependencies

-   Phase 0 must precede final technology decisions.
-   Phases 1 and 2 establish the extension and deterministic baseline.
-   Phases 3 and 4 build on stable findings and schemas.
-   Phase 5 can proceed in parallel after the shared schemas are
    defined.
-   Phase 6 depends on Archy decisions and Dev's rule-evaluation path.
-   Snowflake work can start earlier when competition requirements
    demand it, but its data model should be driven by real
    retrieval/evaluation needs.
-   Hardening is continuous, with a final focused pass in Phase 8.
