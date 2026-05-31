# Known Gaps

Gaps identified during the release-readiness audit, after completing Tasks 1-16. Severity:

- **P0** — blocks release
- **P1** — must fix before public launch
- **P2** — polish or content depth
- **P3** — post-launch improvement

## P0 — Blocks Release

_None._ All automated release gates pass cleanly:

- `npm run typecheck` — passes (zero TS errors)
- `npm test` — 14 test files, 69 tests all passing
- `npm run build` — succeeds
- `npm audit --omit=dev` — 0 vulnerabilities

## P1 — Must Fix Before Public Launch

### Long-session audio QA not performed

The release checklist requires a 20-minute uninterrupted run without audio crackle, growing lag, or console errors. This has not been verified.

### Release checklist manual gates not formally signed off

While Tasks 12 and 13 covered mobile and E2E QA, the following manual gates in `docs/release-checklist.md` lack documented sign-off:

- Desktop Chrome: menu, archetype, combat, pause, map, death
- Desktop keyboard: movement, attack, cast, interact, map, pause
- Standard gamepad: movement, attack, cast, interact, map, pause, remap
- Audio sanity (menu, dungeon, boss, game over, all SFX)

Each gate should be run once and a passing result recorded.

## P2 — Polish or Content Depth

### Content hazard identities per sphere not implemented

The `docs/content-matrix.md` describes sphere-specific hazards (slow pulses for Moon, ricochet lines for Mercury, lure blooms for Venus, etc.) that do not exist in gameplay. Currently the game has no per-sphere hazard system.

### Cutscene vision partially implemented

The full cutscene set described in `docs/cutscenes.md` (pre-menu, new-game cinematic, boss intro, ending) has some cinematic components in code (prologue, epilogue, boss intros) but is not shipped as a complete, polished feature.

### NPC roster partially implemented

Of the 12 NPCs described in `docs/npcs.md`, Phase 1 shipped 6 (Mute, Echo, Hierophant, Smith, Diviner, Lampwright). The sphere-keyed wanderers (Reed-Cutter, Cartographer, Garlandkeep, Veteran) and special-event NPCs (Mendicant, Penitent) are not implemented.

## P3 — Post-Launch Improvement

### Per-sphere enemy variety limited

Most spheres have only 1-2 sphere-specific enemies plus generic types. The content-matrix describes a distinct enemy identity per sphere that could be deepened.

### Procedural music depth

Per-sphere music cues are implemented but synthesizer-based. The release checklist's composition criteria (memorable theme, 32-bar loops with 4 sections, boss cues quoting dungeon motifs) are beyond the current procedural approach.

### Full cutscene cinematic experience

The existing cinematic components are functional placeholders. The production-quality vision (hand-authored pixel keyframes, controlled pacing, parallax layering) described in `docs/cutscenes.md` is deferred.

### NPC Phase 2-4

Deeper dialogue trees, sphere-keyed wanderers, special event NPCs (Marketplace, Penitent), and the Hub-restructuring of the main menu are post-launch scope per the NPC integration plan.
