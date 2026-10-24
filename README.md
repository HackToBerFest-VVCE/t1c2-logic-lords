# 🔍 OpenLens

**Team:** `t1c2-logic-lords` | **Track:** Best Open-Source AI Project with Snowflake | **HackToBerFest-VVCE**

---

### *The AI Companion for Software Architecture & Code Maintainability*

OpenLens is an AI-powered engineering companion that prevents AI-generated code sprawl. It connects everyday coding in VS Code with high-level system architecture, ensuring software stays clean, modular, and maintainable as it evolves.

---

## ⚡ The Two Modes

OpenLens brings two synchronized modes into one VS Code extension:

| Mode | Where It Runs | What It Does |
| :--- | :--- | :--- |
| **🛠️ OpenLens Dev** | VS Code Editor | • Detects exact and near-duplicate code & unused symbols.<br>• Recommends existing dependencies before writing custom boilerplate.<br>• Generates minimal, reviewable diffs (**no silent changes**).<br>• Runs local checks offline via AST & standard Python linters. |
| **🏛️ OpenLens Archy** | Web Workspace | • Proposes architectures, tech stacks, and patterns from requirements.<br>• Generates Mermaid diagrams & Architecture Decision Records (ADRs).<br>• Audits brownfield repos for architecture drift & boundary violations.<br>• Produces phased, risk-aware restructuring plans. |

> **The Bridge:** Archy creates machine-checkable **Architecture Rules**, and Dev validates them inside VS Code during active development.

---

## 🏗️ Architecture Overview

```mermaid
flowchart LR
    IDE[VS Code Extension] --> DEV[OpenLens Dev\nLocal AST & Linters]
    IDE --> ARCHY[OpenLens Archy\nWeb Workspace]
    DEV --> API[Shared Backend API]
    ARCHY --> API
    API --> RET[Retrieval Service]
    API --> LLM[Model Gateway\nOpen-Source LLMs]
    RET --> SF[(Snowflake Knowledge &\nEvaluation Benchmarks)]
    ARCHY -.->|Exports Rules| RULES[Architecture Rules]
    RULES -.->|Enforces Constraints| DEV
```

---

## ❄️ Snowflake & Open-Source AI

* **Snowflake:** Serves as a curated, searchable knowledge base of validated architectural patterns and hosts versioned evaluation benchmarks. No complete source code is sent or stored by default.
* **Open-Source AI:** Uses open-weight models behind a provider-neutral gateway, with local secret redaction and configurable local/remote routing.
* **Privacy by Design:** Scoped scans, minimal payloads, and total user control over remote processing.

---

## 🛡️ Core Rules & Safety Guardrails

* **Evidence Over Hypotheses:** Tool-observed facts are clearly separated from AI inferences.
* **Developer in Full Control:** No unapproved edits, no silent changes, and no automatic dependency installations.
* **Preserve Behavior:** Refactoring prioritizes minimal, test-validated diffs.
* **Fail Safely:** Local deterministic analysis continues to work even if Snowflake or AI services are offline.

---

## 📚 Project Documentation

* 📄 **[PRD.md](PRD.md)** — Product Requirements Document
* 📐 **[Aritechure.md](Aritechure.md)** — Detailed System Architecture & Data Contracts
* 📋 **[phases.md](phases.md)** — 8-Phase Milestone Roadmap & Deliverables
* ⚖️ **[rules.md](rules.md)** — Behavioral, Safety, and Engineering Rules

---

**Developed with ❤️ by `t1c2-logic-lords` for HackToBerFest-VVCE.**
