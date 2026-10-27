#!/usr/bin/env python3
"""
OpenLens CLI — The AI Companion for Architecture & Code Maintainability
Allows running OpenLens scans, file watching, and 1-click VS Code extension install
alongside any local project.

Usage:
  python openlens.py scan <target_directory>
  python openlens.py watch <target_directory>
  python openlens.py install-extension
  python openlens.py serve [--port 3000]
"""

from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parent
ENGINE_PATH = ROOT_DIR / "engine" / "ast_scanner.py"
RULES_PATH = ROOT_DIR / "rules" / "architecture_rules.json"
VSCODE_EXT_DIR = ROOT_DIR / "openlens-vscode"


def cmd_scan(args: argparse.Namespace) -> int:
    """Scan a target project directory and display maintainability findings."""
    target_path = Path(args.target).resolve()
    if not target_path.exists():
        print(f"Error: Target path '{target_path}' does not exist.", file=sys.stderr)
        return 1

    print(f"\n🔍 OpenLens Dev -- Scanning target project: {target_path}")

    cmd = [sys.executable, str(ENGINE_PATH)]
    if args.json:
        cmd.append("--json")
    if args.sarif:
        cmd.append("--sarif")
    if RULES_PATH.exists():
        cmd.extend(["--rules", str(RULES_PATH)])
    cmd.append(str(target_path))

    return subprocess.run(cmd).returncode


def cmd_analyze(args: argparse.Namespace) -> int:
    """Autonomously scan the target project, extract Archy architecture and Dev maintainability model, and export openlens_model.json."""
    from engine.project_analyzer import ProjectAnalyzer
    target_path = Path(args.target).resolve()
    if not target_path.exists():
        print(f"Error: Target path '{target_path}' does not exist.", file=sys.stderr)
        return 1

    print(f"\n🔍 OpenLens Autonomous Project Analyzer: {target_path}")
    print("  • Inspecting source files, imports, modules, and classes...")
    analyzer = ProjectAnalyzer(target_path)
    result = analyzer.analyze()

    out_file = Path(args.out) if args.out else ROOT_DIR / "openlens_model.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"✓ Analysis complete in {result.get('duration_ms', 0)}ms!")
    print(f"  • Files scanned:   {result.get('files_scanned', 0)}")
    print(f"  • Subsystems:      {len(result.get('boundaries', []))}")
    print(f"  • Nodes:           {len(result.get('nodes', []))}")
    print(f"  • Tech Stack:      {len(result.get('techStack', []))} detected")
    print(f"  • Design Patterns: {len(result.get('patterns', []))} detected")
    print(f"  • Dev Findings:    {len(result.get('findings', []))} issues")
    print(f"✓ Saved live project model to: {out_file}")
    return 0


def cmd_diagram(args: argparse.Namespace) -> int:
    """Generate a standalone interactive HTML architecture diagram for any target project."""
    from engine.project_analyzer import ProjectAnalyzer
    target_path = Path(args.target).resolve()
    if not target_path.exists():
        print(f"Error: Target path '{target_path}' does not exist.", file=sys.stderr)
        return 1

    print(f"\n📐 Generating OpenLens Interactive Architecture Diagram for: {target_path}")
    analyzer = ProjectAnalyzer(target_path)
    result = analyzer.analyze()

    out_file = Path(args.output) if args.output else target_path / "architecture_diagram.html"

    # Generate standalone interactive HTML
    json_data = json.dumps(result)
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{result.get('name', 'Architecture Diagram')} — OpenLens</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    :root {{ --bg: #03080f; --surface: #0a1324; --border: rgba(255,255,255,0.1); --accent: #4f8ef7; --text: #f0f4fc; --muted: #7c8faa; }}
    body[data-theme="light"] {{ --bg: #f8fafc; --surface: #ffffff; --border: rgba(0,0,0,0.1); --accent: #2563eb; --text: #0f172a; --muted: #64748b; }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); overflow: hidden; height: 100vh; display: flex; flex-direction: column; }}
    header {{ height: 50px; border-bottom: 1px solid var(--border); background: var(--surface); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; z-index: 10; }}
    .brand {{ font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; gap: 8px; }}
    .theme-toggle {{ cursor: pointer; padding: 5px 14px; border-radius: 20px; background: transparent; border: 1px solid var(--border); color: var(--text); font-size: 0.75rem; font-weight: 700; }}
    #viewport {{ flex: 1; position: relative; overflow: hidden; cursor: grab; background-image: radial-gradient(var(--border) 1px, transparent 1px); background-size: 24px 24px; }}
    #canvas {{ position: absolute; top: 0; left: 0; transform-origin: 0 0; }}
    .boundary {{ position: absolute; border-radius: 12px; pointer-events: none; border-style: dashed; }}
    .boundary-label {{ position: absolute; top: 8px; left: 14px; font-size: 0.72rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; padding: 2px 8px; border-radius: 6px; background: var(--surface); }}
    .node-card {{ position: absolute; border-radius: 8px; background: var(--surface); border: 1px solid var(--border); padding: 10px 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); cursor: pointer; transition: transform 0.15s, border-color 0.15s; }}
    .node-card:hover {{ transform: translateY(-2px); border-color: var(--accent); }}
    .node-title {{ font-weight: 700; font-size: 0.8rem; margin-bottom: 4px; }}
    .node-meta {{ font-size: 0.68rem; color: var(--muted); font-family: 'JetBrains Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
    svg {{ position: absolute; inset: 0; pointer-events: none; }}
    .info-bar {{ position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); background: var(--surface); border: 1px solid var(--border); border-radius: 30px; padding: 6px 18px; font-size: 0.75rem; color: var(--muted); box-shadow: 0 8px 24px rgba(0,0,0,0.3); z-index: 10; display: flex; gap: 14px; align-items: center; }}
  </style>
</head>
<body data-theme="dark">
  <header>
    <div class="brand"><span>🔍</span> OpenLens — <span style="color:var(--accent);">{result.get('name', 'Architecture Diagram')}</span></div>
    <button class="theme-toggle" id="theme-btn">🌓 Toggle Theme</button>
  </header>
  <div id="viewport">
    <div id="canvas">
      <svg id="svg-layer" width="4000" height="3000"></svg>
      <div id="boundaries-layer"></div>
      <div id="nodes-layer"></div>
    </div>
    <div class="info-bar">
      <span>🖱️ Drag to Pan · Scroll to Zoom</span>
      <span>|</span>
      <span>{len(result.get('nodes', []))} Components · {len(result.get('boundaries', []))} Subsystems</span>
      <span style="color:var(--accent);">✓ Self-Contained Interactive Architecture</span>
    </div>
  </div>
  <script>
    const data = {json_data};
    let scale = 0.8, panX = 40, panY = 30, isDragging = false, startX = 0, startY = 0;
    const canvas = document.getElementById('canvas');
    const viewport = document.getElementById('viewport');
    const svgLayer = document.getElementById('svg-layer');
    const bLayer = document.getElementById('boundaries-layer');
    const nLayer = document.getElementById('nodes-layer');

    function updateTransform() {{
      canvas.style.transform = `translate(${{panX}}px, ${{panY}}px) scale(${{scale}})`;
    }}

    viewport.addEventListener('mousedown', e => {{ isDragging = true; startX = e.clientX - panX; startY = e.clientY - panY; viewport.style.cursor = 'grabbing'; }});
    window.addEventListener('mousemove', e => {{ if (!isDragging) return; panX = e.clientX - startX; panY = e.clientY - startY; updateTransform(); }});
    window.addEventListener('mouseup', () => {{ isDragging = false; viewport.style.cursor = 'grab'; }});
    viewport.addEventListener('wheel', e => {{
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      scale = Math.min(2.5, Math.max(0.3, scale * zoomFactor));
      updateTransform();
    }}, {{ passive: false }});

    document.getElementById('theme-btn').addEventListener('click', () => {{
      const cur = document.body.getAttribute('data-theme');
      document.body.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
    }});

    // Render Boundaries
    (data.boundaries || []).forEach(b => {{
      const el = document.createElement('div');
      el.className = 'boundary';
      el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
      el.style.width = b.width + 'px'; el.style.height = b.height + 'px';
      el.style.borderColor = b.color || '#4f8ef7'; el.style.borderWidth = '1.5px';
      el.innerHTML = `<div class="boundary-label" style="border: 1px solid ${{b.color || '#4f8ef7'}}; color: ${{b.color || '#4f8ef7'}};">${{b.label || b.name}}</div>`;
      bLayer.appendChild(el);
    }});

    // Render Nodes
    const nodeMap = {{}};
    (data.nodes || []).forEach(n => {{
      nodeMap[n.id] = n;
      const el = document.createElement('div');
      el.className = 'node-card';
      el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
      el.style.width = (n.width || 230) + 'px'; el.style.height = (n.height || 68) + 'px';
      el.innerHTML = `<div class="node-title">${{n.label}}</div><div class="node-meta">${{n.file || n.subsystem || ''}}</div>`;
      el.addEventListener('click', () => alert(`Component: ${{n.label}}\\nFile: ${{n.file || 'N/A'}}\\nSubsystem: ${{n.subsystem || 'N/A'}}\\nLines: ${{n.lines || 'N/A'}}`));
      nLayer.appendChild(el);
    }});

    // Render Connections
    (data.connections || []).forEach(c => {{
      const fromNode = nodeMap[c.from];
      const toNode = nodeMap[c.to];
      if (fromNode && toNode) {{
        const x1 = fromNode.x + (fromNode.width || 230);
        const y1 = fromNode.y + (fromNode.height || 68) / 2;
        const x2 = toNode.x;
        const y2 = toNode.y + (toNode.height || 68) / 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const cx1 = x1 + (x2 - x1) * 0.5;
        const cx2 = x1 + (x2 - x1) * 0.5;
        path.setAttribute('d', `M ${{x1}} ${{y1}} C ${{cx1}} ${{y1}}, ${{cx2}} ${{y2}}, ${{x2}} ${{y2}}`);
        path.setAttribute('stroke', '#4f8ef7');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.6');
        svgLayer.appendChild(path);
      }}
    }});

    updateTransform();
  </script>
</body>
</html>"""

    with open(out_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"✓ Standalone Interactive HTML diagram generated in {result.get('duration_ms', 0)}ms!")
    print(f"✓ Saved to: {out_file}")
    print(f"💡 Open directly in your browser: file:///{out_file.as_posix()}")
    return 0


def cmd_watch(args: argparse.Namespace) -> int:
    """Continuously watch a project directory and scan whenever a .py file changes."""
    target_path = Path(args.target).resolve()
    if not target_path.exists():
        print(f"Error: Target path '{target_path}' does not exist.", file=sys.stderr)
        return 1

    print(f"\n👀 OpenLens Dev Watcher active on: {target_path}")
    print("Press Ctrl+C to stop watching.\n")

    mtimes: dict[Path, float] = {}

    def get_py_mtimes() -> dict[Path, float]:
        current = {}
        for p in target_path.rglob("*.py"):
            if not any(part.startswith(".") or part in ("venv", ".venv", "env", "__pycache__", "node_modules") for part in p.parts):
                try:
                    current[p] = p.stat().st_mtime
                except OSError:
                    pass
        return current

    mtimes = get_py_mtimes()
    # Run initial scan
    cmd_scan(args)

    try:
        while True:
            time.sleep(1.0)
            new_mtimes = get_py_mtimes()
            changed = [p for p, mt in new_mtimes.items() if p not in mtimes or mtimes[p] != mt]
            if changed:
                print(f"\n⚡ Detected change in {len(changed)} file(s): {[p.name for p in changed]}")
                cmd = [sys.executable, str(ENGINE_PATH)]
                if RULES_PATH.exists():
                    cmd.extend(["--rules", str(RULES_PATH)])
                cmd.extend([str(p) for p in changed])
                subprocess.run(cmd)
                mtimes = new_mtimes
    except KeyboardInterrupt:
        print("\nWatcher stopped.")
        return 0


def cmd_install_extension(_args: argparse.Namespace) -> int:
    """Installs openlens-vscode directly into the user's local VS Code extensions directory."""
    home = Path.home()
    vscode_ext_dest = home / ".vscode" / "extensions" / "openlens-vscode"

    print(f"📦 Installing OpenLens extension to: {vscode_ext_dest}")

    try:
        if vscode_ext_dest.exists():
            shutil.rmtree(vscode_ext_dest)
        shutil.copytree(VSCODE_EXT_DIR, vscode_ext_dest)
        print("✓ Successfully installed OpenLens VS Code extension!")
        print("💡 Restart VS Code or open your other project in VS Code to see live squiggly lines!")
        return 0
    except Exception as e:
        print(f"Failed to copy extension: {e}", file=sys.stderr)
        return 1


def cmd_serve(args: argparse.Namespace) -> int:
    """Launch OpenLens Archy & Dev web servers."""
    print("🚀 Starting OpenLens local web server...")
    print(f"  • Landing: http://localhost:{args.port}/index.html")
    print(f"  • Archy:   http://localhost:{args.port}/openlens-archy/index.html")
    print(f"  • Dev:     http://localhost:{args.port}/openlens-dev/index.html")
    
    cmd = ["npx", "serve", ".", "-l", str(args.port)]
    return subprocess.run(cmd, shell=True).returncode


def cmd_snowflake_status(args: argparse.Namespace) -> int:
    """Check Snowflake configuration and test live connection."""
    import asyncio
    from services.snowflake_bridge import get_bridge

    print("\n❄️  OpenLens Snowflake Intelligence Core Diagnostics (REQUIRED)")
    print("=" * 60)

    bridge = get_bridge()
    cfg = bridge.config

    print(f"  • Central Knowledge Core: Active")
    print(f"  • Account Identifier    : {cfg.account or '[Not configured]'}")
    print(f"  • Username              : {cfg.user or '[Not configured]'}")
    auth_desc = "Password" if cfg.password else (f"Key-Pair ({cfg.private_key_path})" if cfg.private_key_path else "[None]")
    print(f"  • Auth Method           : {auth_desc}")
    print(f"  • Compute Warehouse     : {cfg.warehouse}")
    print(f"  • Database              : {cfg.database}")
    print(f"  • Schema                : {cfg.schema}")
    print(f"  • Role                  : {cfg.role}")
    print("-" * 60)

    if not cfg.is_configured():
        print("⚠️  Status: NOT CONNECTED")
        print("   Snowflake is the core knowledge and analytics layer for OpenLens.")
        print("\n   To sign in or create an account in 1 click:")
        print("   → Run: python openlens.py snowflake-login")
        print("   (Or open Web Studio at http://localhost:3000 to use the interactive activation window)")
        return 1

    print("⏳ Testing live connection to Snowflake Intelligence Core...")
    diag = asyncio.run(bridge.test_connection())

    if diag.get("connected"):
        print("✅ Connection: SUCCESSFUL")
        print(f"  • Snowflake Version     : {diag.get('snowflake_version', 'Unknown')}")
        print(f"  • Current Warehouse     : {diag.get('warehouse')}")
        print(f"  • Current Role          : {diag.get('role')}")
        print(f"  • Cortex Vector Ready   : {'YES' if diag.get('cortex_available') else 'No (falls back to keyword search)'}")
        print("\n🎉 Snowflake is seamlessly connected! Architectural patterns & analytics are active.")
        return 0
    else:
        print("❌ Connection: FAILED")
        print(f"  • Error Reason          : {diag.get('message')}")
        print("  • Action Needed         : Re-run 'python openlens.py snowflake-login' to update credentials.")
        return 1


def cmd_snowflake_login(args: argparse.Namespace) -> int:
    """Interactive Snowflake account connection & sign-up onboarding helper."""
    import getpass
    import webbrowser
    import asyncio
    from services.snowflake_bridge import get_bridge, SnowflakeConfig

    print("\n❄️  OpenLens Snowflake Intelligence Core Activation")
    print("=" * 60)
    print("Snowflake is the central architectural knowledge, ADR rules,")
    print("and evaluation intelligence layer for OpenLens.\n")

    has_acc = input("Do you already have a Snowflake account? [Y/n]: ").strip().lower()
    if has_acc in ("n", "no"):
        print("\n🌐 Opening Snowflake 30-Day Free Trial ($400 Free Credits) in your browser...")
        signup_url = "https://signup.snowflake.com/"
        try:
            webbrowser.open(signup_url)
        except Exception:
            pass
        print(f"   Sign-up URL: {signup_url}")
        print("\nOnce your account is created, re-run 'python openlens.py snowflake-login' to sign in.")
        return 0

    print("\nPlease enter your Snowflake credentials:")
    account = input("  • Account Identifier (e.g. xy12345.us-east-1): ").strip()
    user = input("  • Username: ").strip()
    password = getpass.getpass("  • Password: ").strip()
    warehouse = input("  • Warehouse [OPENLENS_WH]: ").strip() or "OPENLENS_WH"
    database = input("  • Database [OPENLENS_DB]: ").strip() or "OPENLENS_DB"
    schema = input("  • Schema [KNOWLEDGE]: ").strip() or "KNOWLEDGE"
    role = input("  • Role [OPENLENS_ROLE]: ").strip() or "OPENLENS_ROLE"

    # Save to .env
    env_path = ROOT_DIR / ".env"
    env_content = f"""# OpenLens Snowflake Core Configuration
OPENLENS_SNOWFLAKE_ENABLED=true
SNOWFLAKE_ACCOUNT={account}
SNOWFLAKE_USER={user}
SNOWFLAKE_PASSWORD={password}
SNOWFLAKE_WAREHOUSE={warehouse}
SNOWFLAKE_DATABASE={database}
SNOWFLAKE_SCHEMA={schema}
SNOWFLAKE_ROLE={role}
"""
    with open(env_path, "w", encoding="utf-8") as f:
        f.write(env_content)
    print(f"\n✓ Saved credentials securely to: {env_path}")

    # Test connection
    print("⏳ Testing live connection to Snowflake...")
    bridge = get_bridge()
    asyncio.run(bridge.reconnect(SnowflakeConfig(
        account=account, user=user, password=password,
        warehouse=warehouse, database=database, schema=schema, role=role
    )))
    diag = asyncio.run(bridge.test_connection())

    if diag.get("connected"):
        print("\n🎉 SUCCESS: Connected to Snowflake Intelligence Core!")
        print(f"  • Version: {diag.get('snowflake_version')}")
        print(f"  • Warehouse: {diag.get('warehouse')}")
        print(f"  • Cortex Vector Ready: {'YES' if diag.get('cortex_available') else 'Keyword Fallback'}")
        return 0
    else:
        print(f"\n⚠️ Connection test failed: {diag.get('message')}")
        return 1


def cmd_serve_api(args: argparse.Namespace) -> int:
    """Launch the FastAPI backend gateway service."""
    port = getattr(args, "port", 8000)
    print(f"\n🚀 Starting OpenLens Backend Gateway on http://127.0.0.1:{port}")
    print(f"  • API Docs & Swagger UI : http://127.0.0.1:{port}/docs")
    print(f"  • Snowflake Diagnostics : http://127.0.0.1:{port}/integrations/snowflake/status")
    print(f"  • Health Endpoint       : http://127.0.0.1:{port}/health\n")
    cmd = [sys.executable, "-m", "uvicorn", "api.gateway:app", "--host", "0.0.0.0", "--port", str(port), "--reload"]
    return subprocess.run(cmd).returncode


def main() -> int:
    parser = argparse.ArgumentParser(
        description="OpenLens — AI-Powered Architecture & Code Maintainability Companion"
    )
    subparsers = parser.add_subparsers(dest="command")

    # scan
    scan_p = subparsers.add_parser("scan", help="Scan a target project for maintainability issues")
    scan_p.add_argument("target", nargs="?", default=".", help="Path to project directory (default: current directory)")
    scan_p.add_argument("--json", action="store_true", help="Output results as JSON")
    scan_p.add_argument("--sarif", action="store_true", help="Output results in SARIF format for IDEs")

    # watch
    watch_p = subparsers.add_parser("watch", help="Watch a project directory and scan on file save")
    watch_p.add_argument("target", nargs="?", default=".", help="Path to project directory")
    watch_p.add_argument("--json", action="store_true", help="Output results as JSON")
    watch_p.add_argument("--sarif", action="store_true", help="Output results in SARIF format")

    # analyze
    analyze_p = subparsers.add_parser("analyze", help="Autonomously scan project and generate live Archy + Dev model")
    analyze_p.add_argument("target", nargs="?", default=".", help="Path to project directory (default: current directory)")
    analyze_p.add_argument("--out", help="Output path for openlens_model.json")

    # install-extension
    subparsers.add_parser("install-extension", help="1-Click install of OpenLens VS Code extension into your IDE")

    # serve
    serve_p = subparsers.add_parser("serve", help="Launch local OpenLens web services")
    serve_p.add_argument("--port", type=int, default=3000, help="Port to listen on (default: 3000)")

    # serve-api
    serve_api_p = subparsers.add_parser("serve-api", help="Launch FastAPI backend gateway (port 8000)")
    serve_api_p.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")

    # snowflake-status
    subparsers.add_parser("snowflake-status", help="Test Snowflake connection and display diagnostics")

    # snowflake-login
    subparsers.add_parser("snowflake-login", help="Sign in or create Snowflake account for OpenLens Core")

    args = parser.parse_args()

    if args.command == "scan":
        return cmd_scan(args)
    elif args.command == "analyze":
        return cmd_analyze(args)
    elif args.command == "watch":
        return cmd_watch(args)
    elif args.command == "install-extension":
        return cmd_install_extension(args)
    elif args.command == "serve":
        return cmd_serve(args)
    elif args.command == "serve-api":
        return cmd_serve_api(args)
    elif args.command == "snowflake-status":
        return cmd_snowflake_status(args)
    elif args.command == "snowflake-login":
        return cmd_snowflake_login(args)
    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    sys.exit(main())
