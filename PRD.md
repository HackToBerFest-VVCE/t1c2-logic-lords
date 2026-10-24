# OpenLens --- Product Requirements Document (PRD)

**Status:** Draft v0.1\
**Product family:** OpenLens\
**Products:** OpenLens Dev + OpenLens Archy\
**Initial target platform:** Visual Studio Code extension, with a
browser-based architecture workspace\
**Initial language focus:** Python\
**Challenge track:** Best Open-Source AI Project with Snowflake

## 1. Product vision

OpenLens is an AI-powered software engineering companion that helps
developers create and maintain software that stays understandable as it
evolves.

It combines two modes in one extension:

-   **OpenLens Dev:** code-level intelligence for maintainability,
    redundancy detection, library-first recommendations, debugging, and
    safe refactoring.
-   **OpenLens Archy:** architecture-level intelligence for system
    design, technology-stack selection, design-pattern recommendations,
    architecture evaluation, and restructuring plans.

Both modes share project context, evidence retrieval, evaluation
records, and user-controlled privacy settings. Archy may open a
dedicated web workspace for interactive diagrams, architecture
decisions, and evaluation reports; it is not a separate product that
requires users to leave the extension permanently.

## 2. Problem statement

AI-assisted development can accelerate implementation but can also
introduce duplicate logic, unnecessary wrappers, avoidable dependencies,
inconsistent patterns, and patches that increase complexity. These
issues may not immediately break the application, but they make future
changes harder and more expensive.

Developers also lack a convenient way to connect high-level architecture
decisions with everyday coding. Architecture diagrams and design
documents can drift away from the implementation, while code assistants
may suggest changes without checking project conventions, existing
libraries, or architecture constraints.

OpenLens aims to close this gap by helping developers:

1.  understand the existing project before changing it;
2.  prevent unnecessary complexity from entering the codebase;
3.  identify and safely address accumulated maintainability issues;
4.  make architecture decisions with explicit reasoning and trade-offs;
    and
5.  compare intended architecture with observable implementation
    evidence.

## 3. Target users

### Primary initial users

-   Students, individual developers, and small teams building Python
    projects.
-   Developers using AI coding tools who want to keep generated code
    maintainable.
-   Developers maintaining unfamiliar or rapidly evolving repositories.

### Later users

-   Professional engineering teams with architecture standards.
-   Teams that need shared rules, architecture decision records, and
    continuous conformance checks.
-   Multi-language and multi-IDE users.

## 4. Product principles

1.  **Understand before suggesting:** inspect relevant project context
    before recommending a change.
2.  **Reuse before reinventing:** prefer suitable existing functions and
    installed dependencies when appropriate.
3.  **Smallest safe change:** prefer minimal, reviewable patches over
    broad rewrites.
4.  **Evidence over confidence:** explain the evidence behind a finding
    and distinguish facts from hypotheses.
5.  **Developer remains in control:** no unapproved edits, installs,
    uploads, or destructive actions.
6.  **Privacy by design:** minimize collected context and make remote
    processing explicit and configurable.
7.  **Validate, don't assume:** tests and static checks provide
    evidence, not a universal proof of correctness.
8.  **Architecture and code stay connected:** architecture decisions
    should be inspectable and usable by Dev.
9.  **Be quiet when uncertain:** avoid repeated or low-confidence
    warnings.
10. **Useful over flashy:** measure correctness, signal quality, and
    developer time saved.

## 5. Product structure

### 5.1 OpenLens Dev

**Purpose:** Help keep source code clean, correct, and maintainable.

Capabilities: - Explain selected code and supported runtime errors. -
Detect selected forms of exact and near-duplicate code. - Identify
unused imports and other issues surfaced by deterministic tools. - Find
unnecessary wrappers or abstractions when supported by evidence. - Check
whether an existing project dependency already provides a suitable
capability. - Review a proposed change for duplication, dependency
growth, project conventions, and architecture constraints. - Propose a
minimal patch and show a diff. - Run available tests, linters, or type
checks when the user approves and the environment supports them. - Save
a developer-confirmed resolution as a reusable, sanitized debugging case
with consent.

### 5.2 OpenLens Archy

**Purpose:** Help design, understand, evaluate, and restructure software
architecture.

Capabilities: - **Design mode:** gather requirements and constraints;
propose architecture, stack, patterns, data flow, and deployment
approach. - **Analyse mode:** inspect a repository's observable files,
dependencies, imports, and module relationships. - **Evaluate mode:**
assess requirements fit, maintainability, modularity, security
considerations, reliability, performance risks, scalability assumptions,
and implementation conformance. - **Restructure mode:** recommend a
target architecture and phased migration plan, with risks and validation
gates. - Generate architecture diagrams, architecture decision records
(ADRs), and reports in a browser workspace. - Compare intended
architecture with observed repository evidence. - Expose assumptions,
trade-offs, confidence, and unanswered questions.

Archy must not present an inferred architecture as a verified fact.
Repository analysis can reveal observable relationships, but it cannot
automatically prove runtime behaviour or actual production performance.

## 6. Core user workflows

### Workflow A --- Review code for maintainability

1.  Developer opens a Python project.
2.  Developer runs a scan on the project, selected files, or changed
    files.
3.  OpenLens combines deterministic analysis with contextual reasoning.
4.  Findings are grouped by type, severity, confidence, and affected
    files.
5.  Developer opens a finding to see evidence and why it matters.
6.  Developer requests a proposed fix or dismisses the finding.
7.  If a patch is proposed, developer reviews the diff and approves
    application.
8.  OpenLens runs available checks and reports exactly what passed,
    failed, or could not run.

### Workflow B --- Library-first recommendation

1.  Developer asks for a capability or OpenLens detects a custom
    implementation candidate.
2.  OpenLens inspects declared and installed dependencies and relevant
    project usage.
3.  It compares reuse options against a custom implementation.
4.  It explains trade-offs such as dependency cost, licence,
    compatibility, maintenance, and complexity when evidence is
    available.
5.  It recommends an option or states that evidence is insufficient. It
    must not add a dependency automatically.

### Workflow C --- Design a new project with Archy

1.  Developer describes the problem, users, requirements, constraints,
    scale, budget, and team capabilities.
2.  Archy asks for missing high-impact information.
3.  Archy proposes an architecture and one or more alternatives.
4.  It explains the chosen stack, patterns, trade-offs, and assumptions.
5.  It generates diagrams and an architecture report in the web
    workspace.
6.  The developer reviews and saves the decisions as project artifacts.

### Workflow D --- Analyse and restructure an existing project

1.  Developer grants access to selected repository content.
2.  Archy inventories observable technologies, dependencies, modules,
    and relationships.
3.  It distinguishes observed facts from inferred relationships.
4.  It evaluates the project against explicit requirements and
    configured rules.
5.  It produces prioritised findings and a proposed target architecture.
6.  It recommends incremental migration steps with validation and
    rollback considerations.
7.  Dev can use approved architecture rules to check future code
    changes.

## 7. MVP scope

### In scope

-   One VS Code extension with Dev and Archy entry points.
-   Python-focused repository analysis.
-   Selected-file and project-level maintainability scan.
-   A small set of deterministic checks for duplication, unused imports,
    and basic complexity indicators, using established tools where
    suitable.
-   Context-aware explanation of findings.
-   Library-first checks based on declared project dependencies and
    available project metadata.
-   Reviewable patch suggestions; no silent changes.
-   User-triggered checks and a limited, configurable automatic
    notification flow for supported diagnostics/events.
-   Archy design workflow that captures requirements, proposes a stack
    and patterns, and creates architecture diagrams/reports in a web
    workspace.
-   Basic architecture evaluation rubric with evidence and explicit
    unknowns.
-   A small curated knowledge base and a Snowflake-backed
    retrieval/evaluation component where permitted by challenge rules.
-   Basic evaluation dataset and repeatable benchmark.

### Out of scope for the first MVP

-   Guaranteed integration with every AI coding assistant.
-   Capturing every terminal output or every language runtime
    automatically.
-   Support for all languages and IDEs.
-   Autonomous multi-file refactoring or silent file modification.
-   Automatically installing or upgrading packages.
-   Training a foundation model.
-   A complete enterprise governance platform.
-   Claims that a project is secure, scalable, or correct based only on
    static inspection.
-   Sending entire repositories to a remote service by default.

## 8. Functional requirements

  -------------------------------------------------------------------------
  ID                      Requirement               Priority
  ----------------------- ------------------------- -----------------------
  FR-01                   User can choose Dev or    Must
                          Archy from the same       
                          extension.                

  FR-02                   User can scope analysis   Must
                          to selected files or an   
                          explicitly approved       
                          project scope.            

  FR-03                   Findings include          Must
                          category, affected        
                          location, explanation,    
                          evidence, and             
                          confidence/limitations.   

  FR-04                   User can view a proposed  Must
                          patch as a diff before    
                          applying it.              

  FR-05                   No patch is applied       Must
                          without explicit user     
                          approval.                 

  FR-06                   OpenLens checks available Must
                          project dependencies      
                          before recommending a     
                          replacement library.      

  FR-07                   Archy captures            Must
                          requirements and          
                          constraints before making 
                          consequential design      
                          recommendations.          

  FR-08                   Archy produces            Must
                          architecture diagrams and 
                          an evaluation report.     

  FR-09                   Evaluation results        Must
                          distinguish observed      
                          evidence, inference, and  
                          unknowns.                 

  FR-10                   User can control local    Must
                          versus remote processing  
                          and review what context   
                          is sent.                  

  FR-11                   Remote calls and          Must
                          Snowflake use are visible 
                          in configuration or       
                          appropriate disclosure.   

  FR-12                   Available tests/static    Must
                          checks can be run with    
                          user approval and results 
                          reported accurately.      

  FR-13                   Developer-confirmed cases Should
                          can be saved only with    
                          consent and appropriate   
                          sanitization.             

  FR-14                   Architecture rules can be Should
                          shared from Archy to Dev. 

  FR-15                   Automatic alerts can be   Must
                          tuned or disabled to      
                          reduce interruptions.     
  -------------------------------------------------------------------------

## 9. Non-functional requirements

-   **Security:** never intentionally transmit detected secrets; apply
    secret scanning/redaction and minimize payloads.
-   **Privacy:** default to least-privilege access; support project
    exclusions and explicit remote-processing controls.
-   **Reliability:** errors in AI services must not prevent basic local
    checks from working.
-   **Transparency:** label generated suggestions, evidence sources,
    assumptions, and validation status.
-   **Performance:** scans should be scoped and cancellable; cache safe,
    non-sensitive results where appropriate.
-   **Maintainability:** modular extension/backend architecture,
    documented interfaces, automated tests, and clear dependency
    management.
-   **Accessibility:** keyboard-operable commands and readable reports.
-   **Portability:** avoid unnecessary dependence on one model provider;
    keep the inference interface replaceable.

## 10. Snowflake and open-source AI

Snowflake should have a real, demonstrable role rather than being
included only for branding. Suitable roles include a curated searchable
knowledge base, retrieval metadata, evaluation cases, and aggregate
product-quality analytics. The exact implementation must follow the
challenge rules, available services, budget, and data policies.

Use an open-source or open-weight model whose licence and usage terms
are verified for the intended use. Keep the model provider behind an
interface so the project can support local and remote inference.

Do not upload complete source repositories to Snowflake by default. Any
remote context must be minimised, disclosed, and approved according to
user settings.

## 11. Evaluation and success metrics

Establish a baseline before claiming improvement.

### Dev metrics

-   Precision of reported duplicate/redundancy findings.
-   False-positive rate.
-   Proportion of suggested patches that pass available tests.
-   Behaviour-preservation rate on a curated test set.
-   Applicability of library recommendations.
-   Time required to investigate and resolve benchmark issues.

### Archy metrics

-   Agreement between observed repository facts and generated inventory.
-   Coverage of explicit requirements and constraints.
-   Correctness and usefulness of architecture findings judged by
    reviewers.
-   Traceability of recommendations to evidence or stated assumptions.
-   Usefulness and feasibility of proposed migration steps.
-   Ability to identify known violations in controlled sample
    repositories.

### Product-level metrics

-   Time to first useful finding.
-   Percentage of findings accepted, dismissed, or marked incorrect.
-   User-reported usefulness.
-   Resource usage and response latency.
-   Privacy incidents and unapproved changes: target zero.

Evaluation scores must not be presented as objective truth unless the
methodology supports that interpretation. Use transparent criteria and
reviewer notes.

## 12. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Noisy or incorrect findings         Combine deterministic checks with
                                      contextual reasoning; tune
                                      thresholds and measure false
                                      positives.

  Refactor changes behaviour          Require diff review, tests where
                                      available, and explicit
                                      limitations.

  Wrong library recommendation        Inspect actual dependencies and
                                      versions; verify compatibility and
                                      licence information when available.

  Architecture hallucinations         Separate observed facts from
                                      inferences; require evidence and
                                      list unknowns.

  Sensitive code exposure             Minimise context, redact secrets,
                                      provide exclusions, and make remote
                                      processing explicit.

  Snowflake adds unnecessary          Limit cloud use to
  complexity                          retrieval/evaluation tasks that
                                      materially benefit from it.

  Scope grows too large               Keep the first release
                                      Python-focused and validate each
                                      capability before expanding.

  Existing tools already solve part   Integrate established linters and
  of the problem                      analysis tools rather than
                                      rebuilding them; differentiate
                                      through project context, evidence,
                                      architecture linkage, and safe
                                      workflow.
  -----------------------------------------------------------------------

## 13. Open questions

These should be resolved before implementation is locked: 1. Which
specific Snowflake services and deployment patterns are permitted by the
challenge? 2. Which model and licence meet the competition's open-source
requirement? 3. Is the first demo primarily an Archy workflow, a Dev
workflow, or a narrow end-to-end connection? 4. What exact Python checks
and evaluation examples will be included? 5. Which repository content is
allowed to leave the local machine? 6. How will the extension open and
authenticate to the Archy web workspace?

## 14. MVP completion criteria

The MVP is ready for demonstration when: - A user can open one extension
and access Dev and Archy. - Dev finds a known maintainability issue in a
controlled Python project and explains it with evidence. - A proposed
refactor is shown as a diff and requires approval. - Available checks
run and their results are reported accurately. - Archy can collect
requirements, generate an architecture proposal and diagram, and
evaluate a sample architecture against explicit criteria. - At least one
architecture rule can be represented as a check that Dev can use. - The
Snowflake and open-source AI components have clear, working, documented
roles. - A repeatable evaluation report shows measured results and known
limitations.
