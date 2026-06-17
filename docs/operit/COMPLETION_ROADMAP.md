# COMPLETION ROADMAP — Abyss of the Seven Lamps
**Created**: 2026-06-17 | **Version**: 1.0
**Purpose**: Master roadmap integrating all audit findings into a phased execution plan.

---

## Phase Overview

| Phase | Name | Status | Est. Hours | Dependencies |
|-------|------|--------|------------|--------------|
| 1 | Repository Acquisition | ✅ Complete | 1 | Network, git |
| 2 | Repository Audit | ✅ Complete | 3 | Phase 1 |
| 3 | Open PR Audit | ✅ Complete | 2 | Phase 1 |
| 4 | PixelLab Visual Overhaul Plan | ✅ Complete | 4 | Phase 2, 3 |
| 5 | Pixel 9 Pro Fold Optimization Plan | ✅ Complete | 3 | Phase 2 |
| 6 | Completion Roadmap (this doc) | ✅ Complete | 1 | Phase 4, 5 |
| 7 | APK Strategy | ✅ Complete | 1 | Phase 5 |
| 8 | Final Report | ✅ Complete | 2 | All above |
| **9** | **PR Restructuring** | ⬜ Not started | 4 | Phase 3 |
| **10** | **PixelLab Implementation** | ⬜ Not started | 200 | Phase 4 |
| **11** | **Fold Optimization Implementation** | ⬜ Not started | 60 | Phase 5 |
| **12** | **APK Build & Sign** | ⬜ Not started | 8 | Phase 7, 11 |
| **13** | **Testing & QA** | ⬜ Not started | 20 | Phase 10, 11, 12 |
| **14** | **Release** | ⬜ Not started | 4 | Phase 13 |

**Planning total**: 17 hours (Phases 1-8) ✅
**Implementation total**: 296 hours (Phases 9-14) ⬜
**Grand total**: ~313 hours (~8 weeks full-time)

---

## Phase Details

### Phase 9 — PR Restructuring (4 hours)
**Input**: OPEN_PR_AUDIT.md
**Actions**:
1. Close or retitle PR #1 per recommendation (Option B: merge as-is with corrected title)
2. Optionally create focused tracking issues for each of the 12+ tracks
3. Update PROJECT_STATUS.md and README to reflect merged state
**Deliverable**: Clean `main` branch with all 88 commits merged

### Phase 10 — PixelLab Visual Overhaul (200 hours)
**Input**: PIXELLAB_VISUAL_OVERHAUL_PLAN.md
**6 sub-phases**:
- **A: Foundation** (40h) — SpriteRegistry, parallel pipeline, asset loader, build tooling
- **B: Player & Enemies** (40h) — Player archetypes, 7 enemy types, 7 Warden bosses
- **C: Environment** (40h) — 8 sphere tilesets, walls, floors, props, hazards
- **D: UI & Effects** (30h) — HUD chrome, menus, particle effects, transitions
- **E: NPCs & Shrines** (25h) — NPC portraits, shrine variants, dialogue panels
- **F: Polish** (25h) — Animation curves, screen shake, color grading, final pass
**Key risk**: Asset pipeline complexity. Mitigation: ship Phase A as a standalone PR to validate.

### Phase 11 — Fold Optimization Implementation (60 hours)
**Input**: PIXEL_9_PRO_FOLD_OPTIMIZATION.md
**15 optimization targets across 5 categories**:
- **Display** (15h): DisplayManager, integer scaling, ambient letterbox panels, fold/unfold transitions
- **Android Integration** (12h): Back gesture defense, safe-area insets, status/nav bar handling
- **Performance** (15h): Canvas 2D GPU profiling, WebAudio buffer tuning, thermal throttling mitigation
- **Storage** (8h): IndexedDB migration from localStorage, service worker offline in Capacitor
- **Capacitor** (10h): Project setup, plugin integration, AndroidManifest configuration
**Key risk**: No physical Pixel 9 Pro Fold for testing. Mitigation: Android Emulator with foldable AVD.

### Phase 12 — APK Build & Sign (8 hours)
**Input**: APK_STRATEGY.md
**Actions**:
1. Initialize Capacitor project wrapping the Vite build output
2. Configure signing keystore (generate or use existing)
3. Build release APK and AAB
4. Test on device/emulator
5. Document build pipeline for reproducibility
**Deliverable**: Signed release APK + AAB

### Phase 13 — Testing & QA (20 hours)
**Coverage**:
- Unit tests: extend existing Vitest suite for new rendering pipeline
- E2E tests: extend Playwright suite for foldable viewport sizes
- Manual QA: full playthrough on Pixel 9 Pro Fold (outer + unfolded)
- Performance: FPS benchmarking, memory profiling, thermal testing
- Regression: verify web/PWA build unchanged
**Deliverable**: Test report + known issues list

### Phase 14 — Release (4 hours)
**Actions**:
1. Version bump (1.0.0)
2. Generate release notes from commit history
3. Tag release
4. Build final APK/AAB
5. Distribute (Play Store internal track or sideload)
**Deliverable**: v1.0.0 release

---

## Critical Path
```
Phase 9 (PR restructure) → Phase 10 (Visual overhaul) → Phase 13 (Testing)
Phase 9 (PR restructure) → Phase 11 (Fold optimization) → Phase 12 (APK) → Phase 13 (Testing)
Phase 13 → Phase 14 (Release)
```

Visual overhaul (200h) is the long pole. Fold optimization (60h) and APK (8h) can run in parallel.

---

## Milestone Gates

| Gate | After Phase | Criteria |
|------|-------------|----------|
| G1 | 9 | PR merged, `main` up to date |
| G2 | 10-A | SpriteRegistry working, one sprite rendering via new pipeline |
| G3 | 10-C | All game entities rendering from sprite sheets |
| G4 | 11 | Foldable display working on emulator with correct scaling |
| G5 | 12 | APK installs and runs on device |
| G6 | 13 | Full playthrough with no regressions |
| G7 | 14 | v1.0.0 released |

---

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Sprite pipeline breaks existing rendering | Medium | High | Parallel pipeline allows fallback |
| Canvas 2D performance insufficient at 4× scale | Low | High | Profile early; drop to 3× if needed |
| No physical foldable for testing | High | Medium | Emulator + remote test service |
| 200h visual overhaul too ambitious | Medium | High | Phase deliverables allow stopping at any phase |
| Capacitor build complexity | Low | Medium | Well-documented; active community |
