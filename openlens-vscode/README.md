# OpenLens VS Code Extension

> **Real-time maintainability companion in your IDE:** live squiggly lines, duplication detection, complexity scoring, architectural boundary guardrails, and 1-click Quick Fixes.

---

## ⚡ How to Run Alongside Any Project (2-Minute Demo Setup)

You can run OpenLens alongside any of your projects using either of the following standard methods:

### Method 1: Press `F5` in VS Code (Easiest for Demo)
1. Open this `OpenLens_Project` folder in VS Code.
2. Press **`F5`** (or go to **Run and Debug** $\rightarrow$ Click **"Launch Extension"**).
3. A new **Extension Development Host** VS Code window will open!
4. In that new window, **open your other project folder** (`File` $\rightarrow$ `Open Folder...`).
5. Open any Python file:
   - Notice the **OpenLens status bar item** in the bottom right (`$(search) OpenLens: X issues`).
   - Notice the **red, orange, and yellow squiggly lines** directly under problematic functions and unused imports!
   - Hover over any squiggly line to view the diagnostic, rationale, and Snowflake pattern.
   - Click the lightbulb or press `Ctrl+.` (`Cmd+.`) to use **Quick Fix** (e.g. 1-click delete unused imports).
   - Click the **OpenLens icon** in the left Activity Bar to view the tree of all findings grouped by category!

### Method 2: Install Permanently into Your VS Code
Copy this `openlens-vscode` folder into your local VS Code extensions directory:
- **Windows:** `%USERPROFILE%\.vscode\extensions\openlens-vscode`
- **macOS / Linux:** `~/.vscode/extensions/openlens-vscode`

Restart VS Code, and OpenLens will automatically activate on any Python project you open!

---

## 🛠️ Features

| Feature | Description |
|---|---|
| **Live In-IDE Squigglies** | Red (error/architecture violation), Orange/Yellow (complexity/duplication), and Blue/Gray (unused imports) directly in the code editor. |
| **Editor Highlight Zones** | Colored background and gutter marks identifying complex nested logic and duplicate functions. |
| **1-Click Quick Fixes** | Automatic line removal for unused imports and patch previews right inside the editor. |
| **Sidebar TreeView** | "OpenLens Findings" panel in the Activity Bar showing all issues grouped by category with 1-click jump to file and line. |
| **Status Bar Monitor** | Quick status readout of clean / failing checks. Click to trigger an immediate re-scan. |
| **1-Click Archy Launcher** | Command `OpenLens: Open Archy Architecture Studio` opens the visual architecture canvas in your browser. |
| **1-Click Dev Studio** | Command `OpenLens: Open Dev Studio (Browser)` opens the web maintainability explorer. |

---

## ⚙️ Commands & Shortcuts

- `Ctrl+Shift+P` $\rightarrow$ `OpenLens: Scan Workspace for Maintainability`
- `Ctrl+Shift+P` $\rightarrow$ `OpenLens: Scan Active File`
- `Ctrl+Shift+P` $\rightarrow$ `OpenLens: Open Archy Architecture Studio`
- `Ctrl+Shift+P` $\rightarrow$ `OpenLens: Open Dev Studio (Browser)`
- `Ctrl+Shift+P` $\rightarrow$ `OpenLens: Clear All Findings`
