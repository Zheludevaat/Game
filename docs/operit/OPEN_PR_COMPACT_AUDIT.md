# Open PR Compact Audit — Abyss of the Seven Lamps
**Created**: 2026-06-17 | **Source**: OPEN_PR_AUDIT.md (408 lines → compact)

---

## PR Identity
- **PR #1**: "add: track 1 — combat depth (status effects, crits, combos, parry)"
- **Branch**: `claude/abyss-seven-lamps-game-057YQ` → `main`
- **Author**: Zheludevaat (Claude Code session)
- **Commits**: 88 | **Files**: 69 | **Reviews**: 0 | **Status**: Open

---

## Critical Finding: 12× Title-Reality Mismatch
The PR title describes ~7 commits (Track 1: combat depth). The actual PR contains **12+ development tracks** across 88 commits:

| Track | Commits | Category | Status |
|-------|---------|----------|--------|
| 1 | 1-7 | Combat Depth (title match) | ✅ Scoped |
| 5 | 8-14 | Content Expansion (weapons, spells, relics, enemies) | ⚠️ Untitled |
| 2 | 15-20 | Per-Sphere Identity (hazards, floor/wall) | ⚠️ Untitled |
| 7 | 21-26 | HUD Polish + First-Run Tutorial | ⚠️ Untitled |
| 4 | 27-32 | Meta Progression (achievements, ascension) | ⚠️ Untitled |
| 6 | 33-38 | NPCs (Hierophant, Chorister, Smith, Cartographer) | ⚠️ Untitled |
| iOS | 39-50 | iPhone/iPad Polish | ⚠️ Untitled |
| Gamepad | 51-62 | Controller Fixes | ⚠️ Untitled |
| Lighting | 63-68 | Visibility Rebalance (4-layer) | ⚠️ Untitled |
| Visual | 69-74 | Per-Sphere Visual Identity | ⚠️ Untitled |
| Audio | 75-78 | Per-Sphere Ambient Voice + LFO | ⚠️ Untitled |
| Palette | 79-82 | AAP-64 Lospec Anchor | ⚠️ Untitled |
| Codex | 83-86 | 6 Public-Domain Lore Entries | ⚠️ Untitled |
| Misc | 87-88 | Round-2 Polish Fixes | ⚠️ Untitled |

---

## Verdict
**Not a reviewable PR.** This is the entire development history of the game since initial commit, presented as a single merge request. Typical of AI-assisted solo development. The PR should be either:
- **Option A**: Closed and replaced with 12+ focused, reviewable PRs (one per track)
- **Option B**: Merged as-is with title corrected to "Full game development — all tracks"
- **Option C**: Left open as documentation artifact; merge `main` from a clean squash

**Recommendation**: Option B for pragmatic progress. The code quality is high. The PR structure is the issue, not the code.

---

## Top 3 Risks
1. **Unreviewed monolithic merge** — 88 commits touching 69 files with no peer review. High regression risk.
2. **iOS-specific code in shared branch** — touch/pause/audio recovery changes may affect other platforms.
3. **No test coverage for PR branch** — tests exist on `main` but PR branch adds no new tests for 12 tracks of changes.

---

## What's Good
- Combat depth system (Track 1) is clean: unified status effects, crits repurpose dormant luck stat, combos reward timing, parry uses existing dash
- Content expansion is comprehensive: 5 weapons, 4 spells, 12 relics, 7 enemy types + 7 Warden bosses, 30+ consumables
- Per-sphere identity work gives each of the 8 spheres distinct floor/wall/ambient/mood
- iOS and gamepad work shows platform-awareness
- AAP-64 palette anchor improves color consistency
