# Context Budget — Abyss Completion Plan

**Created**: 2026-06-16
**Purpose**: Enforce strict context limits to prevent token exhaustion during the Abyss audit.

---

## Token Budget

| Item | Limit |
|---|---|
| Normal checkpoint reply | Under 700 words |
| File excerpts in chat | Max 80 lines total |
| Repo tree shown in chat | Max 120 lines |
| PR diff shown in chat | **NEVER** |
| Full logs shown in chat | **NEVER** |
| Source files read into chat | Only if under 200 lines AND directly needed |
| Binary assets | NEVER |

---

## Allowed Direct Reads

| File | Reason |
|---|---|
| `package.json` | Dependency/script audit |
| `README.md` | Project self-description |
| `PROJECT_STATUS.md` | If exists — progress snapshot |
| `TODO_NEXT.md` | If exists — immediate tasks |
| `docs/known-gaps.md` | If exists — documented gaps |
| `docs/release-checklist.md` | If exists — release criteria |
| `docs/mobile-qa.md` | If exists — mobile test notes |
| Selected source files | Only when under 200 lines AND directly needed |

---

## Forbidden Direct Reads

- `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`
- `node_modules/` (any file)
- `dist/`, `build/`, `coverage/`
- Large generated files (>500 lines)
- Images, audio, fonts (binary)
- Full PR diffs
- Full Git logs
- Service worker caches
- `tsconfig.json`, `vite.config.ts` (unless a specific config value is needed)

---

## Inspection Strategy

1. **Use Python/bash scanners** — write compact reports to `.md` files
2. **Read only the report summaries**, not raw outputs
3. **For PR audit**: `git diff --stat`, `git diff --name-only`, `git log --oneline` — output to file, summarize in chat in ≤5 bullets
4. **For source analysis**: Use `grep_code` or `find_files` for targeted searches; write findings to file

---

## File Outputs (already created or planned)

| File | Status | Lines |
|---|---|---|
| REPO_AUDIT.md | ✅ | 469 |
| OPEN_PR_AUDIT.md | ✅ | 409 |
| PIXELLAB_VISUAL_OVERHAUL_PLAN.md | ✅ | 628 |
| PIXEL9_FOLD_OPTIMIZATION_PLAN.md | ✅ | 628 |
| OPEN_PR_COMPACT_AUDIT.md | Pending | — |
| COMPACT_REPO_SCAN.md | Pending | — |
| COMPLETION_ROADMAP.md | Pending (Phase 6) | — |
| APK_STRATEGY.md | Pending (Phase 7) | — |
| ABYSS_COMPLETION_REPORT.md | Pending (Phase 8) | — |

---

## Chat Response Template

For every checkpoint:
1. **Files created/updated** (list only)
2. **5-10 key findings** (concise bullets)
3. **Next recommended action** (1 sentence)
4. **Approvals needed** (if any)

No file content dumps. No raw data. Summaries only.
