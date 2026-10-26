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
| **🛠️ OpenLens Dev** | VS Code Editor | • Detects exact and near-duplicate code & unused symbols via Python AST.<br>• Recommends existing dependencies before writing custom boilerplate.<br>• Generates minimal, reviewable diffs (**no silent changes**).<br>• Architecture boundary enforcement via exported Archy rules. |
| **🏛️ OpenLens Archy** | Web Workspace | • Interactive architecture canvas with pan, zoom, flow path tracing.<br>• Tech stack profiling from repository files.<br>• Design pattern identification with code snippets.<br>• ADRs + exportable machine-verifiable rules for Dev enforcement. |

> **The Bridge:** Archy creates machine-checkable **Architecture Rules**, and Dev validates them inside VS Code during active development.

---

## 🚀 Quick Start

### Web Workspace (no installation)
Open `index.html` directly in any modern browser, or run:
```bash
npm start
# → http://localhost:3000 — Landing page
# → http://localhost:3000/openlens-archy/ — Archy workspace
```

### Backend API (optional — for Snowflake & AI features)
```bash
pip install -r requirements.txt
uvicorn api.gateway:app --reload --port 8000
# → http://localhost:8000/docs — Interactive API docs
```

### AST Scanner (standalone)
```bash
python engine/ast_scanner.py path/to/your/python/files/
```

---

## 🏗️ Architecture Overview

```mermaid
flowchart LR
    IDE[VS Code Extension] --> DEV[OpenLens Dev\nLocal AST & Linters]
    IDE --> ARCHY[OpenLens Archy\nWeb Workspace]
    DEV --> API[Shared Backend API\nFastAPI Gateway]
    ARCHY --> API
    API --> RET[Retrieval Service]
    API --> LLM[Model Gateway\nOllama / vLLM]
    RET --> SF[(Snowflake\nKnowledge & Benchmarks)]
    ARCHY -.->|Exports Rules| RULES[Architecture Rules\nrules/architecture_rules.json]
    RULES -.->|Enforces Constraints| DEV
```

---

## ❄️ Snowflake Integration

Snowflake plays a **genuine, demonstrable role** — not a branding checkbox:

| Schema | Tables | Purpose |
|:---|:---|:---|
| `KNOWLEDGE` | `ARCHITECTURAL_PATTERNS`, `LIBRARY_KNOWLEDGE`, `REFACTORING_CASES` | Curated pattern retrieval via Cortex vector search |
| `EVALUATION` | `BENCHMARK_CASES`, `EVALUATION_RUNS`, `CASE_RESULTS`, `RETRIEVAL_QUALITY` | Versioned detector benchmarks & reproducible evaluation |
| `ANALYTICS` | `FINDING_FEEDBACK`, `SCAN_METRICS`, `ARCHY_SESSION_METRICS` | Privacy-safe aggregate product quality metrics |
| `RULES` | `ARCHITECTURE_RULES`, `ARCHITECTURE_DECISIONS`, `RULE_VIOLATION_LOG` | Machine-verifiable rules authored in Archy |

**Privacy guarantees:**
- ❌ No raw source code stored in Snowflake
- ❌ No secrets or credentials transmitted
- ✅ File paths hashed (SHA-256) before logging
- ✅ Session IDs anonymised
- ✅ Aggregate metrics only for analytics

```bash
# Run the schema in your Snowflake account
snowsql -f snowflake/schema.sql
```

---

## 🛠️ Project Structure

```
OpenLens_Project/
├── index.html                    # Landing page
├── openlens-archy/               # Archy web workspace (browser)
│   ├── index.html                # Main workspace UI
│   ├── app.js                    # Rendering, pan/zoom, interactions
│   ├── data.js                   # Architecture presets & datasets
│   ├── export.js                 # PNG/SVG/JSON/Markdown exporter
│   └── styles.css                # 3-theme design system
├── engine/
│   └── ast_scanner.py            # Python AST analysis engine
├── api/
│   └── gateway.py                # FastAPI shared backend gateway
├── services/
│   ├── snowflake_bridge.py       # Snowflake knowledge retrieval
│   ├── retrieval.py              # Pattern & case retrieval service
│   └── model_adapter.py         # Provider-neutral model gateway
├── snowflake/
│   └── schema.sql                # Full Snowflake DB schema + seed data
├── rules/
│   └── architecture_rules.json  # Exportable architecture rules (Archy → Dev)
├── requirements.txt              # Python dependencies
├── package.json                  # Node scripts
├── PRD.md                        # Product Requirements Document
├── Aritechure.md                 # System Architecture
├── phases.md                     # 8-Phase Roadmap
└── rules.md                      # Behavioral & Engineering Rules
```

---

## 🏛️ OpenLens Archy — Feature Showcase

### 🎨 3 Dynamic Themes
- **Classic** — Blueprint slate: indigo-blue accents on crisp white canvas
- **Funk** — Coral rose: vivid coral-red + amber on warm cream
- **Signal Flow** — Emerald circuit: emerald + cyan on mint-white

### ⚡ 5 Architecture Views
1. **📐 Architecture Canvas** — Interactive pan/zoom canvas with subsystem boundaries, flow path animations, PATH tracer, LENS inspector, and layer legend
2. **🛠️ Tech Stack Profile** — Vetted frameworks detected from repository files with versioning, pros/cons, and rationale
3. **🏛️ System Design** — Architecture style, SLA budgets, and topology specifications
4. **🧩 Design Patterns** — Identified patterns with code snippets and maintainability impact
5. **📁 User Files Inventory** — Evidence-based mapping of source files to architecture layers

### 📥 Multi-Format Export
- 📋 Copy Diagram to clipboard (high-res PNG)
- 🖼️ Save as PNG / JPEG (Retina 2× DPI)
- 📐 Save as SVG (infinite resolution vector)
- 📦 Export Architecture Rules (JSON for Dev)
- 📝 Export ADRs (Markdown)

---

## 🔒 Safety Guardrails

| Principle | Implementation |
|:---|:---|
| No unapproved code changes | Every patch requires explicit diff review and approval |
| No silent dependency installs | Library recommendations only; never auto-install |
| Secret redaction | Regex scanning removes API keys, tokens before remote calls |
| Fail-safe offline | Local AST checks run when Snowflake & AI are both offline |
| Minimal payloads | Only sanitised metadata leaves the local machine |
| Model output = proposal | LLM output never directly executes or modifies files |

---

## 🧠 Open-Source AI

OpenLens uses a **provider-neutral ModelGatewayAdapter** interface:

```python
class ModelGatewayAdapter(ABC):
    async def complete(self, prompt: BoundedPrompt) -> ModelProposal: ...
```

Supported adapters:
- **Ollama** (local) — `OPENLENS_MODEL_PROVIDER=ollama`
- **vLLM** (local) — extend `ModelGatewayAdapter`
- **Stub** — transparent fallback when no model is configured

All adapters apply `redact_secrets()` before transmitting. Configure via:
```bash
OPENLENS_MODEL_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OPENLENS_LOCAL_MODEL=llama3
OPENLENS_ALLOW_REMOTE=false   # remote requires explicit consent
```

---

## 📚 Project Documentation

* 📄 **[PRD.md](PRD.md)** — Product Requirements Document (v0.1)
* 📐 **[Aritechure.md](Aritechure.md)** — System Architecture & Data Contracts
* 📋 **[phases.md](phases.md)** — 8-Phase Milestone Roadmap
* ⚖️ **[rules.md](rules.md)** — Behavioral, Safety & Engineering Rules
* ❄️ **[snowflake/schema.sql](snowflake/schema.sql)** — Full Snowflake DB Schema

---

## 📊 Evaluation Metrics

OpenLens tracks measurable quality via Snowflake:

**Dev metrics:** Duplicate detection precision/recall · False-positive rate · Patch test outcome rate · Library recommendation applicability

**Archy metrics:** ADR coverage of requirements · Rule traceability to decisions · Architecture drift detection rate

**Product metrics:** Time to first finding · Finding acceptance/dismissal rate · Scan duration · Privacy incidents (target: 0)

---

**Developed with ❤️ by `t1c2-logic-lords` for HackToBerFest-VVCE.**
