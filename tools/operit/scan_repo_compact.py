#!/usr/bin/env python3
"""Compact repo scanner for Abyss audit — writes COMPACT_REPO_SCAN.md without loading files into chat."""
import os, json, subprocess, sys
from pathlib import Path
from collections import Counter

REPO = Path("/sdcard/OperitWorkspace/external_repos/Game")
OUT = Path("/sdcard/OperitWorkspace/projects/abyss_completion_plan/COMPACT_REPO_SCAN.md")
MAX_TREE_DEPTH = 4
TOP_N_LARGEST = 30

def get_size(path):
    try: return path.stat().st_size
    except: return 0

def scan():
    ext_counts = Counter()
    all_files = []
    docs_found = []
    test_files = []
    asset_dirs = set()
    src_modules = set()

    for root, dirs, files in os.walk(REPO):
        # Skip forbidden dirs
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'dist', 'build', 'coverage', '.git')]
        root_path = Path(root)
        rel = root_path.relative_to(REPO)

        for f in files:
            fp = root_path / f
            size = get_size(fp)
            ext = fp.suffix.lower()
            ext_counts[ext] += 1
            all_files.append((str(rel / f), size, ext))

            # Detect docs
            if f.endswith('.md') or f in ('README', 'LICENSE', 'CREDITS'):
                docs_found.append(str(rel / f))

            # Detect test files
            if '.test.' in f or '.spec.' in f or 'test' in str(rel).lower():
                test_files.append(str(rel / f))

            # Detect asset dirs
            if ext in ('.png','.jpg','.jpeg','.webp','.svg','.gif','.woff','.woff2','.ttf','.otf','.mp3','.wav','.ogg'):
                asset_dirs.add(str(rel.parent if str(rel.parent) != '.' else '.'))

            # Detect src modules
            if str(rel).startswith('src/') and ext in ('.ts','.tsx','.js','.jsx'):
                parts = str(rel).split('/')
                if len(parts) >= 3:
                    src_modules.add('/'.join(parts[:3]))
                elif len(parts) >= 2:
                    src_modules.add('/'.join(parts[:2]))

    # Sort by size descending
    all_files.sort(key=lambda x: x[1], reverse=True)
    largest = all_files[:TOP_N_LARGEST]

    # Generate tree summary
    tree_lines = []
    def tree_walk(path, prefix="", depth=0):
        if depth > MAX_TREE_DEPTH: return
        try:
            entries = sorted(os.listdir(path))
        except: return
        dirs_list = [e for e in entries if os.path.isdir(os.path.join(path, e)) and e not in ('node_modules','dist','build','coverage','.git')]
        files_list = [e for e in entries if os.path.isfile(os.path.join(path, e))]
        for i, d in enumerate(dirs_list):
            is_last = (i == len(dirs_list)-1 and len(files_list)==0)
            tree_lines.append(f"{prefix}{'└── ' if is_last else '├── '}{d}/")
            tree_walk(os.path.join(path, d), prefix + ("    " if is_last else "│   "), depth+1)
        for i, f in enumerate(files_list):
            is_last = (i == len(files_list)-1)
            tree_lines.append(f"{prefix}{'└── ' if is_last else '├── '}{f}")

    tree_walk(REPO)

    # package.json scripts and deps
    pkg_json = REPO / "package.json"
    scripts = {}
    deps = {}
    dev_deps = {}
    if pkg_json.exists():
        try:
            pkg = json.loads(pkg_json.read_text())
            scripts = pkg.get('scripts', {})
            deps = pkg.get('dependencies', {})
            dev_deps = pkg.get('devDependencies', {})
        except: pass

    # Write report
    out = []
    out.append("# Compact Repo Scan — Abyss of the Seven Lamps\n")
    out.append(f"**Scanned**: {REPO}\n")
    out.append(f"**Date**: 2026-06-16\n\n---\n\n")

    out.append("## 1. File Counts by Extension\n")
    for ext, count in ext_counts.most_common():
        pct = (count / len(all_files) * 100) if all_files else 0
        out.append(f"- `{ext or '(no ext)'}`: {count} files ({pct:.1f}%)\n")
    out.append(f"\n**Total files counted**: {len(all_files)}\n\n---\n\n")

    out.append(f"## 2. Largest {TOP_N_LARGEST} Files\n")
    for path, size, ext in largest:
        out.append(f"- `{path}` — {size:,} bytes\n")
    out.append("\n---\n\n")

    out.append(f"## 3. Source Tree Summary (max depth {MAX_TREE_DEPTH})\n```\n")
    out.append(f"{REPO.name}/\n")
    for line in tree_lines:
        out.append(line + "\n")
    out.append("```\n\n---\n\n")

    out.append("## 4. Package Scripts\n")
    for name, cmd in scripts.items():
        out.append(f"- `{name}`: `{cmd}`\n")
    out.append("\n---\n\n")

    out.append("## 5. Dependencies\n")
    out.append("### Runtime\n")
    for name, ver in deps.items():
        out.append(f"- `{name}`: `{ver}`\n")
    out.append("### Dev\n")
    for name, ver in dev_deps.items():
        out.append(f"- `{name}`: `{ver}`\n")
    out.append("\n---\n\n")

    out.append("## 6. Important Docs Found\n")
    for d in sorted(docs_found):
        out.append(f"- `{d}`\n")
    if not docs_found:
        out.append("- (none found)\n")
    out.append("\n---\n\n")

    out.append(f"## 7. Source Modules (src/, depth 2-3)\n")
    for m in sorted(src_modules):
        out.append(f"- `{m}/`\n")
    out.append("\n---\n\n")

    out.append("## 8. Test Files Found\n")
    for t in sorted(test_files):
        out.append(f"- `{t}`\n")
    if not test_files:
        out.append("- (none found)\n")
    out.append("\n---\n\n")

    out.append("## 9. Asset Directories\n")
    for a in sorted(asset_dirs):
        out.append(f"- `{a}/`\n")
    if not asset_dirs:
        out.append("- (no assets found — all procedural)\n")
    out.append("\n---\n\n")

    out.append("## 10. Files Safe to Inspect Directly\n")
    safe = [f[0] for f in all_files if f[2] in ('.json','.md','.txt','.css','') and f[1] < 50000 and 'node_modules' not in f[0]]
    for s in sorted(safe)[:25]:
        out.append(f"- `{s}` ({next(f[1] for f in all_files if f[0]==s):,} bytes)\n")
    out.append("\n---\n\n")

    out.append("## 11. Files to Avoid Loading into Chat\n")
    avoid = [f[0] for f in all_files if f[1] > 50000 or f[2] in ('.png','.jpg','.jpeg','.webp','.woff','.woff2','.ttf','.mp3','.wav','.ogg') or 'lock' in f[0].lower()]
    for a in sorted(avoid)[:25]:
        out.append(f"- `{a}` ({next(f[1] for f in all_files if f[0]==a):,} bytes)\n")
    out.append("\n")

    OUT.write_text("".join(out), encoding="utf-8")
    print(f"Report written to {OUT} ({len(out)} lines)")

if __name__ == "__main__":
    scan()
