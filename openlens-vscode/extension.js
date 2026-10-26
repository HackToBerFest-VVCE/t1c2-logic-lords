/**
 * OpenLens VS Code Extension
 * 
 * Provides:
 * - Real-time in-IDE squiggly diagnostics (Error, Warning, Info)
 * - Editor gutter and background highlights for high complexity & duplicates
 * - Quick Fix code actions (1-click remove unused imports, apply patches)
 * - Sidebar TreeView of all workspace maintainability findings
 * - Status bar issue indicator
 * - 1-Click launcher for OpenLens Archy Architecture Studio & Dev Studio
 */

const vscode = require('vscode');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');

let diagnosticCollection;
let statusBarItem;
let findingsTreeProvider;
let decorationTypes = {};
let latestFindings = [];

/**
 * Finds the OpenLens AST scanner script path
 */
function findScannerScript(context) {
  // 1. Look inside parent repo (when run in workspace)
  const repoEnginePath = path.join(context.extensionPath, '..', 'engine', 'ast_scanner.py');
  if (fs.existsSync(repoEnginePath)) {
    return repoEnginePath;
  }
  // 2. Look inside extension directory
  const localEnginePath = path.join(context.extensionPath, 'engine', 'ast_scanner.py');
  if (fs.existsSync(localEnginePath)) {
    return localEnginePath;
  }
  // 3. Look in active workspace root
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const wsEnginePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'engine', 'ast_scanner.py');
    if (fs.existsSync(wsEnginePath)) {
      return wsEnginePath;
    }
  }
  return repoEnginePath;
}

/**
 * Finds the Python interpreter to execute
 */
function getPythonCommand() {
  const config = vscode.workspace.getConfiguration('openlens');
  const customPath = config.get('pythonPath');
  if (customPath && customPath.trim().length > 0) {
    return customPath.trim();
  }
  // Check common python command names
  if (process.platform === 'win32') {
    return 'py';
  }
  return 'python3';
}

/**
 * Activates the extension
 */
function activate(context) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('openlens');
  context.subscriptions.push(diagnosticCollection);

  // Initialize editor decorations
  decorationTypes = {
    complexity: vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
      overviewRulerColor: '#f59e0b',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    }),
    duplication: vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(168, 85, 247, 0.08)',
      overviewRulerColor: '#a855f7',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    }),
    drift: vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      overviewRulerColor: '#ef4444',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    })
  };

  // Status Bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'openlens.scan';
  statusBarItem.text = '$(search) OpenLens: Ready';
  statusBarItem.tooltip = 'Click to scan workspace for maintainability issues';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Tree View for Sidebar
  findingsTreeProvider = new OpenLensTreeDataProvider();
  vscode.window.registerTreeDataProvider('openlens-findings-view', findingsTreeProvider);

  // Register Quick Fixes (Code Actions)
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      'python',
      new OpenLensCodeActionProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('openlens.scan', async () => {
      await scanWorkspace(context);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openlens.scanFile', async (uri) => {
      const fileUri = uri || (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri);
      if (fileUri) {
        await scanSingleFile(context, fileUri.fsPath);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openlens.openArchy', () => {
      openWebStudio(context, 'openlens-archy');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openlens.openDevStudio', () => {
      openWebStudio(context, 'openlens-dev');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openlens.clearDiagnostics', () => {
      diagnosticCollection.clear();
      latestFindings = [];
      findingsTreeProvider.refresh([]);
      clearDecorations();
      statusBarItem.text = '$(search) OpenLens: Clean';
      vscode.window.showInformationMessage('OpenLens: Cleared all diagnostics.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openlens.jumpToLocation', (fsPath, line) => {
      vscode.workspace.openTextDocument(fsPath).then(doc => {
        vscode.window.showTextDocument(doc).then(editor => {
          const targetLine = Math.max(0, line - 1);
          const range = new vscode.Range(targetLine, 0, targetLine, 0);
          editor.selection = new vscode.Selection(range.start, range.end);
          editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        });
      });
    })
  );

  // Auto-scan on Save
  vscode.workspace.onDidSaveTextDocument(async (doc) => {
    if (doc.languageId === 'python') {
      const config = vscode.workspace.getConfiguration('openlens');
      if (config.get('scanOnSave', true)) {
        await scanSingleFile(context, doc.uri.fsPath);
      }
    }
  }, null, context.subscriptions);

  // Auto-scan on Open
  vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (editor && editor.document.languageId === 'python') {
      const config = vscode.workspace.getConfiguration('openlens');
      if (config.get('scanOnOpen', true)) {
        await scanSingleFile(context, editor.document.uri.fsPath);
      }
    }
  }, null, context.subscriptions);

  // Initial scan if workspace has Python files
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    vscode.workspace.findFiles('**/*.py', '**/node_modules/**', 2).then(files => {
      if (files.length > 0) {
        scanWorkspace(context);
      }
    });
  }
}

/**
 * Scans an entire workspace or directory
 */
async function scanWorkspace(context) {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showWarningMessage('OpenLens: Please open a project folder to scan.');
    return;
  }

  const rootPath = folders[0].uri.fsPath;
  statusBarItem.text = '$(sync~spin) OpenLens: Scanning…';

  try {
    const result = await executeScanner(context, [rootPath]);
    applyScanResults(result);
    const count = result.findings ? result.findings.length : 0;
    statusBarItem.text = count === 0
      ? '$(check) OpenLens: Clean'
      : `$(alert) OpenLens: ${count} issue${count === 1 ? '' : 's'}`;
    vscode.window.showInformationMessage(
      `OpenLens Dev: Scanned ${result.files_scanned} files in ${result.duration_ms}ms. Found ${count} maintainability issues.`
    );
  } catch (err) {
    statusBarItem.text = '$(error) OpenLens: Scan Failed';
    vscode.window.showErrorMessage(`OpenLens AST Engine Error: ${err.message}`);
  }
}

/**
 * Scans a single Python file
 */
async function scanSingleFile(context, filePath) {
  try {
    const result = await executeScanner(context, [filePath]);
    applyScanResults(result, filePath);
  } catch (err) {
    console.error('OpenLens single file scan error:', err);
  }
}

/**
 * Executes the Python scanner engine
 */
function executeScanner(context, paths) {
  return new Promise((resolve, reject) => {
    const scannerScript = findScannerScript(context);
    if (!fs.existsSync(scannerScript)) {
      return reject(new Error(`OpenLens AST scanner script not found at: ${scannerScript}`));
    }

    const pythonCmd = getPythonCommand();
    const args = [scannerScript, '--json', ...paths];

    // Check for architecture rules JSON
    const wsRoot = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : null;
    if (wsRoot) {
      const candidateRules = [
        path.join(wsRoot, 'rules', 'architecture_rules.json'),
        path.join(context.extensionPath, '..', 'rules', 'architecture_rules.json')
      ];
      for (const r of candidateRules) {
        if (fs.existsSync(r)) {
          args.push('--rules', r);
          break;
        }
      }
    }

    const options = {
      cwd: wsRoot || path.dirname(scannerScript),
      maxBuffer: 10 * 1024 * 1024
    };

    cp.execFile(pythonCmd, args, options, (error, stdout, stderr) => {
      if (error && !stdout) {
        // Fallback: try "python" if "py" failed, or vice versa
        const fallbackCmd = pythonCmd === 'py' ? 'python' : 'py';
        cp.execFile(fallbackCmd, args, options, (err2, stdout2) => {
          if (err2 && !stdout2) {
            return reject(new Error(`Failed running Python: ${error.message}. Output: ${stderr}`));
          }
          try {
            const data = JSON.parse(stdout2);
            resolve(data);
          } catch (pe) {
            reject(new Error(`Failed parsing AST scanner output: ${pe.message}`));
          }
        });
        return;
      }

      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (pe) {
        reject(new Error(`Failed parsing AST scanner output: ${pe.message}`));
      }
    });
  });
}

/**
 * Translates scan results into VS Code Diagnostics & Editor Decorations
 */
function applyScanResults(scanResult, specificFile = null) {
  if (!scanResult || !scanResult.findings) return;

  if (!specificFile) {
    diagnosticCollection.clear();
    latestFindings = scanResult.findings;
  } else {
    // Remove existing diagnostics for this specific file
    const targetUri = vscode.Uri.file(specificFile);
    diagnosticCollection.delete(targetUri);
    // Merge findings
    latestFindings = latestFindings.filter(f => !f.location.startsWith(specificFile));
    latestFindings.push(...scanResult.findings);
  }

  const byFile = new Map();

  for (const f of scanResult.findings) {
    const locParts = f.location.split(':L');
    const filePath = locParts[0];
    const lineRangeStr = locParts[1] || '1';

    let startLine = 1;
    let endLine = 1;
    if (lineRangeStr.includes('-')) {
      const [s, e] = lineRangeStr.split('-');
      startLine = parseInt(s, 10) || 1;
      endLine = parseInt(e, 10) || startLine;
    } else {
      startLine = parseInt(lineRangeStr, 10) || 1;
      endLine = startLine;
    }

    // 0-indexed for VS Code Range
    const range = new vscode.Range(
      Math.max(0, startLine - 1),
      0,
      Math.max(0, endLine - 1),
      1000
    );

    // Map severity
    let severity = vscode.DiagnosticSeverity.Information;
    if (f.severity === 'critical' || f.severity === 'error') {
      severity = vscode.DiagnosticSeverity.Error;
    } else if (f.severity === 'high' || f.severity === 'medium') {
      severity = vscode.DiagnosticSeverity.Warning;
    } else if (f.category === 'unused_code') {
      severity = vscode.DiagnosticSeverity.Hint;
    }

    const message = `[OpenLens ${formatCategory(f.category)}] ${f.summary}\n\n` +
      `💡 Suggested Action: ${f.suggested_action}\n` +
      (f.rule_id ? `🏛️ Rule: ${f.rule_id}\n` : '') +
      `🧠 Rationale: ${f.rationale}`;

    const diag = new vscode.Diagnostic(range, message, severity);
    diag.source = 'OpenLens Dev';
    diag.code = f.rule_id || f.category;

    // Attach finding data for quick fix
    diag.finding = f;

    const absPath = path.isAbsolute(filePath)
      ? filePath
      : (vscode.workspace.workspaceFolders ? path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, filePath) : filePath);

    if (!byFile.has(absPath)) {
      byFile.set(absPath, []);
    }
    byFile.get(absPath).push(diag);
  }

  for (const [absPath, diags] of byFile.entries()) {
    diagnosticCollection.set(vscode.Uri.file(absPath), diags);
  }

  // Update TreeView
  findingsTreeProvider.refresh(latestFindings);

  // Update Editor Decorations
  updateEditorDecorations();
}

function updateEditorDecorations() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !editor.document) return;

  const config = vscode.workspace.getConfiguration('openlens');
  if (!config.get('enableEditorDecorations', true)) {
    clearDecorations();
    return;
  }

  const currentPath = editor.document.uri.fsPath;
  const complexityRanges = [];
  const dupRanges = [];
  const driftRanges = [];

  for (const f of latestFindings) {
    const locParts = f.location.split(':L');
    const fPath = locParts[0];
    const isThisFile = currentPath.endsWith(fPath) || currentPath.replace(/\\/g, '/').endsWith(fPath.replace(/\\/g, '/'));

    if (isThisFile) {
      const lineRangeStr = locParts[1] || '1';
      let startLine = 1;
      let endLine = 1;
      if (lineRangeStr.includes('-')) {
        const [s, e] = lineRangeStr.split('-');
        startLine = parseInt(s, 10) || 1;
        endLine = parseInt(e, 10) || startLine;
      } else {
        startLine = parseInt(lineRangeStr, 10) || 1;
        endLine = startLine;
      }
      const range = new vscode.Range(Math.max(0, startLine - 1), 0, Math.max(0, endLine - 1), 1000);

      if (f.category === 'complexity') complexityRanges.push(range);
      else if (f.category === 'duplication') dupRanges.push(range);
      else if (f.category === 'architecture_drift') driftRanges.push(range);
    }
  }

  if (decorationTypes.complexity) editor.setDecorations(decorationTypes.complexity, complexityRanges);
  if (decorationTypes.duplication) editor.setDecorations(decorationTypes.duplication, dupRanges);
  if (decorationTypes.drift) editor.setDecorations(decorationTypes.drift, driftRanges);
}

function clearDecorations() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  for (const dt of Object.values(decorationTypes)) {
    editor.setDecorations(dt, []);
  }
}

function formatCategory(cat) {
  switch (cat) {
    case 'duplication': return 'Duplication';
    case 'unused_code': return 'Unused Code';
    case 'complexity': return 'Complexity';
    case 'architecture_drift': return 'Architecture Drift';
    default: return cat;
  }
}

/**
 * Quick Fixes / Code Action Provider
 */
class OpenLensCodeActionProvider {
  provideCodeActions(document, range, context) {
    const actions = [];
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'OpenLens Dev') continue;

      // 1. Remove Unused Import Quick Fix
      if (diagnostic.message.includes('Unused import')) {
        const fix = new vscode.CodeAction('⚡ OpenLens: Remove unused import', vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        // Delete the entire line including newline
        const line = document.lineAt(diagnostic.range.start.line);
        fix.edit.delete(document.uri, line.rangeIncludingLineBreak);
        fix.isPreferred = true;
        actions.push(fix);
      }

      // 2. Open Rule in Archy
      if (diagnostic.code && String(diagnostic.code).startsWith('RULE-')) {
        const ruleAction = new vscode.CodeAction(`🏛️ OpenLens: View Rule ${diagnostic.code} in Archy`, vscode.CodeActionKind.QuickFix);
        ruleAction.command = {
          command: 'openlens.openArchy',
          title: 'Open in Archy Studio'
        };
        actions.push(ruleAction);
      }

      // 3. View Suggested Remediation Action
      const explainAction = new vscode.CodeAction('🔍 OpenLens: Show Detailed Remediation & Snowflake Pattern', vscode.CodeActionKind.QuickFix);
      explainAction.command = {
        command: 'openlens.openDevStudio',
        title: 'Open Dev Studio'
      };
      actions.push(explainAction);
    }
    return actions;
  }
}

/**
 * Sidebar TreeDataProvider
 */
class OpenLensTreeDataProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.findings = [];
  }

  refresh(findings) {
    this.findings = findings || [];
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    if (!element) {
      if (this.findings.length === 0) {
        const item = new vscode.TreeItem('No maintainability issues found. Workspace clean! 🎉');
        item.iconPath = new vscode.ThemeIcon('check');
        return [item];
      }

      // Group by Category
      const categories = ['duplication', 'unused_code', 'complexity', 'architecture_drift'];
      const catNodes = [];

      for (const cat of categories) {
        const matches = this.findings.filter(f => f.category === cat);
        if (matches.length > 0) {
          const item = new vscode.TreeItem(
            `${formatCategory(cat)} (${matches.length})`,
            vscode.TreeItemCollapsibleState.Expanded
          );
          item.contextValue = 'category';
          item.iconPath = this.getCategoryIcon(cat);
          item.children = matches;
          catNodes.push(item);
        }
      }
      return catNodes;
    } else if (element.children) {
      return element.children.map(f => {
        const locParts = f.location.split(':L');
        const fileName = path.basename(locParts[0]);
        const linePart = locParts[1] || '1';
        const startLine = parseInt(linePart.split('-')[0], 10) || 1;

        const item = new vscode.TreeItem(
          `${f.summary}`,
          vscode.TreeItemCollapsibleState.None
        );
        item.description = `${fileName}:${linePart}`;
        item.tooltip = `${f.summary}\n\n💡 Remediation: ${f.suggested_action}\n📍 ${f.location}`;
        item.iconPath = this.getSeverityIcon(f.severity);

        // Command to click and jump straight to the line
        const absPath = path.isAbsolute(locParts[0])
          ? locParts[0]
          : (vscode.workspace.workspaceFolders ? path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, locParts[0]) : locParts[0]);

        item.command = {
          command: 'openlens.jumpToLocation',
          title: 'Jump to Issue',
          arguments: [absPath, startLine]
        };
        return item;
      });
    }
    return [];
  }

  getCategoryIcon(cat) {
    switch (cat) {
      case 'duplication': return new vscode.ThemeIcon('copy');
      case 'unused_code': return new vscode.ThemeIcon('trash');
      case 'complexity': return new vscode.ThemeIcon('pulse');
      case 'architecture_drift': return new vscode.ThemeIcon('shield');
      default: return new vscode.ThemeIcon('alert');
    }
  }

  getSeverityIcon(sev) {
    switch (sev) {
      case 'critical':
      case 'error':
        return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
      case 'high':
      case 'medium':
        return new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
      default:
        return new vscode.ThemeIcon('info', new vscode.ThemeColor('editorInfo.foreground'));
    }
  }
}

/**
 * Opens Archy or Dev studio in browser
 */
function openWebStudio(context, folderName) {
  const wsRoot = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : null;
  const candidatePaths = [
    path.join(context.extensionPath, '..', folderName, 'index.html'),
    path.join(context.extensionPath, folderName, 'index.html')
  ];
  if (wsRoot) {
    candidatePaths.unshift(path.join(wsRoot, folderName, 'index.html'));
  }

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const fileUri = vscode.Uri.file(p);
      vscode.env.openExternal(fileUri);
      return;
    }
  }

  // Fallback to local server URL
  const port = folderName === 'openlens-archy' ? 3001 : 3002;
  vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}`));
}

function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.clear();
  }
  clearDecorations();
}

module.exports = {
  activate,
  deactivate
};
