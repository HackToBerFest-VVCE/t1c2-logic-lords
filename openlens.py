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
    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    sys.exit(main())
