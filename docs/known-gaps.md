# Known Gaps

Gaps identified during the release-readiness audit, after completing Tasks 1-16. Severity:

- **P0** - blocks release
- **P1** - must fix before public launch
- **P2** - polish or content depth
- **P3** - post-launch improvement

## P0 - Blocks Release

_None currently known after the automated gate repair._

Required automated gates:

- `npm run typecheck`
- `npm test`
- `npm run e2e`
- `npm run build`
- `npm audit --omit=dev`

## P1 - Must Fix Before Public Launch

### Long-session audio QA not performed

The release checklist requires a 20-minute uninterrupted run without audio crackle, growing lag, or console errors. This has not been verified.

### Release checklist manual gates not formally signed off

While automated smoke coverage exists, the following manual gates in `docs/release-checklist.md` still need documented real-device or hands-on sign-off:

- Desktop Chrome: menu, archetype, combat, pause, map, death
- Desktop keyboard: movement, attack, cast, interact, map, pause
- Standard gamepad: movement, attack, cast, interact, map, pause, remap
- iPhone Safari portrait and landscape
- iPhone installed PWA
- iPad Safari landscape and split-view
- Offline PWA reload
- Audio sanity: menu, dungeon, boss, game over, prologue, epilogue, codex, all SFX

Each gate should be run once and a passing result recorded.

## P2 - Polish or Content Depth

### Content hazard identities per sphere not implemented

The `docs/content-matrix.md` describes sphere-specific hazards (slow pulses for Moon, ricochet lines for Mercury, lure blooms for Venus, etc.) that do not exist in gameplay. Currently the game has no per-sphere hazard system.

### Cutscene vision partially implemented

The full cutscene set described in `docs/cutscenes.md` is not shipped as a complete, polished feature.

### NPC roster partially implemented

Of the 12 NPCs described in `docs/npcs.md`, Phase 1 shipped 6 (Mute, Echo, Hierophant, Smith, Diviner, Lampwright). The sphere-keyed wanderers and special-event NPCs are not implemented.

## P3 - Post-Launch Improvement

### Per-sphere enemy variety limited

Most spheres have only 1-2 sphere-specific enemies plus generic types. The content-matrix describes a distinct enemy identity per sphere that could be deepened.

### Procedural music depth

Per-sphere music cues are implemented but synthesizer-based. The release checklist's composition criteria (memorable theme, 32-bar loops with 4 sections, boss cues quoting dungeon motifs) still need hands-on listening approval.

### Full cutscene cinematic experience

The existing cinematic components are functional but not yet the full production-quality vision described in `docs/cutscenes.md`.

### NPC Phase 2-4

Deeper dialogue trees, sphere-keyed wanderers, special event NPCs, and the Hub-restructuring of the main menu remain post-launch scope.
