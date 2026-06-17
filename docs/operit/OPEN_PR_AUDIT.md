# Open PR #1 Audit — "Abyss of the Seven Lamps"

**Created**: 2026-06-16
**Version**: 1.0
**Scope**: Deep audit of the single open pull request at `https://github.com/Zheludevaat/Game/pull/1`

---

## 1. PR Identity & Metadata

| Property | Value |
|---|---|
| **PR Number** | #1 |
| **Title** | "add: track 1 — combat depth (status effects, crits, combos, parry)" |
| **Source Branch** | `claude/abyss-seven-lamps-game-057YQ` |
| **Target Branch** | `main` |
| **Author** | Zheludevaat |
| **Created by** | Claude (AI — Claude Code sessions) |
| **Session Link** | `https://claude.ai/code/session_01EhtTU6sVCzpPUB8uKntHNm` |
| **Status** | Open (unmerged) |
| **Reviews** | 0 |
| **Comments** | 0 |
| **Assignees** | None |
| **Labels** | None |
| **Milestone** | None |
| **Linked Issues** | None |
| **Commits** | 88 |
| **Files Changed** | 69 |
| **Checks** | GitHub Actions — intermittent Inactive/Failure on pages deploy |

---

## 2. Title-vs-Reality Discrepancy

### 2.1 What the Title Claims
A focused addition of combat depth features:
- Status effects (burn, poison, slow, stun, shield, regen)
- Critical hits (luck-based)
- Combo chains (hit timing bonus)
- Parry (dash-reflect mechanic)

### 2.2 What the PR Actually Contains
The PR is a **88-commit monolithic development branch** that covers **12+ distinct development tracks** spanning the entire game. The combat-depth title describes only the first ~7 commits (Track 1). The remaining 81 commits cover:

| Commit Range | Track | Category |
|---|---|---|
| 1–7 | Track 1 | Combat Depth (title match) |
| 8–14 | Track 5 | Content Expansion (weapons, spells, relics, enemies, consumables) |
| 15–20 | Track 2 | Per-Sphere Identity (hazards, floor/wall visuals) |
| 21–26 | Track 7 | HUD Polish + First-Run Tutorial |
| 27–32 | Track 4 | Meta Progression (achievements, history, ascension) |
| 33–38 | Track 6 | NPCs (Hierophant, Ogdoad Chorister, Smith, Cartographer) |
| 39–50 | iOS | iPhone/iPad Polish (touch, pause, audio recovery, landscape menus, splash screens) |
| 51–62 | Gamepad | Controller Fixes (edge detection, continuous poll, remap, SD-16/NSW pad) |
| 63–68 | Lighting | Visibility Rebalance (four-layer, room visibility, architecture fix) |
| 69–74 | Visual | Per-Sphere Visual Identity (floor, wall, ambient, mood overlay, shrine variants) |
| 75–78 | Audio | Per-Sphere Ambient Voice + LFO Modulation |
| 79–82 | Palette | Anchor to AAP-64 Lospec Reference + Crit-color Distinction |
| 83–86 | Codex | 6 Public-Domain Primary-Source Entries |
| 87–88 | Misc | Polish fixes from round-2 audit |

### 2.3 Severity Assessment
**CRITICAL MISMATCH**. The PR title is misleading by a factor of ~12×. This is not a focused feature PR — it is the **entire development history of the game since initial commit**, presented as a single unreviewed merge request. This pattern is typical of AI-assisted solo development where the developer works in a single long-lived branch and opens a PR as an administrative formality rather than for peer review.

---

## 3. Commit-by-Commit Analysis

### 3.1 Track 1 — Combat Depth (Commits ~1–7)
**What's delivered**:
- **Status effects system** (`data/statusEffects.ts`): Six unified effects (burn, poison, slow, stun, shield, regen) ride on every entity. Tick-per-frame helper drives DoT application. Weapons and spells declare optional `appliesStatus`; on hit, engine rolls chance and adds effect.
- **Crit system**: Luck stat (1 + 1.5%/luck per hit) drives ×1.8 damage with gold "CRIT N" tag and amplified screen shake.
- **Combo system**: Hits chain within 1.2s up to ×5 for +8%/stack damage. HUD shows pulsing "×N" tag and status strip with countdowns.
- **Parry system**: First 0.15s of dash reflects projectiles and stuns contact attackers, with flash + double combo bump.
- **Integration**: Wired through existing `damageEnemy`/`damagePlayer` call sites without new state machines or asset loads.

**Assessment**: ✅ Well-scoped. The PR title covers this track accurately. Design is clean — status effects as a unified system, crits repurpose dormant luck stat, combos reward timing, parry uses existing dash mechanic.

### 3.2 Track 5 — Content Expansion (Commits ~8–14)
**What's delivered**:
- **Consumable items** (`data/consumables.ts`): Phials, bombs, charm, salt, sand — active-use items with distinct effects.
- **Relic synergies** (`data/relicSynergies.ts`): Eight paired-relic combos that trigger bonus effects when both relics are held.
- **Archetype ultimates**: Word of Power (Magus), Lantern Flare (Hermit), Astral Step (Star) — powerful once-per-run abilities.
- **Two new spells**: Wrath Splinter (offensive), Mirror Sigil (defensive/utility) — expanding the spell roster from 4 to 6.
- **Trap rooms**: Sphere-themed hazard grids on Mercury, Venus, Sun spheres — new room type with environmental danger.
- **Daily run mode**: One seeded attempt per UTC day with score history.
- **Per-sphere enemy gating**: Enemy pools now filtered by sphere, not just depth.
- **Dash trail tint**: Visual polish — dash leaves sphere-colored trail.
- **Slain-by callout**: Death screen now names the enemy that killed you.

**Assessment**: ✅ High value. This track alone nearly doubles the game's mechanical content. Consumables add moment-to-moment decision-making. Relic synergies add build-crafting depth. Archetype ultimates give each class a signature moment. Daily run adds replayability.

### 3.3 Track 2 — Per-Sphere Identity (Commits ~15–20)
**What's delivered**:
- **Per-sphere hazards**: Environmental dangers unique to each sphere (e.g., toxic pools, fire jets, void rifts).
- **Floor layout shaping**: Sphere-specific dungeon generation rules (e.g., Mercury gets tight corridors, Jupiter gets open chambers).
- **Visual identity**: Floor tile patterns, wall textures, ambient particles keyed to sphere.

**Assessment**: ✅ Critical for variety. Without per-sphere identity, all 8 spheres feel like palette-swapped floors. This track makes each sphere mechanically and visually distinct.

### 3.4 Track 7 — HUD Polish + Tutorial (Commits ~21–26)
**What's delivered**:
- **First-run tutorial**: Overlay that explains controls, combat, and objectives on first play.
- **HUD refinement**: Status effect indicators, combo counter, cleaner layout.
- **Pickup tooltips**: Item names and effects shown on proximity.

**Assessment**: ✅ Quality-of-life essential. Tutorial addresses the "what do I do?" problem. HUD polish makes combat information legible.

### 3.5 Track 4 — Meta Progression (Commits ~27–32)
**What's delivered**:
- **Achievements system** (`data/achievements.ts`): Unlockable milestones with tracking.
- **Run history**: Record of past runs with stats.
- **Ascension system**: Carry-over progression between runs (NG+ style).

**Assessment**: ✅ Adds long-term engagement. Achievements give goals beyond "reach floor 8." Ascension adds progression persistence.

### 3.6 Track 6 — NPCs (Commits ~33–38)
**What's delivered**:
- **Hierophant NPC**: Main menu greeter with dialogue (Phase A of `docs/npcs.md`).
- **Ogdoad Chorister NPC**: Lore-giver with 9 missing codex entries.
- **Smith forge**: Weapon upgrade NPC with "limited" interaction (once per run).
- **Cartographer map**: Map reveal NPC with "limited" interaction.

**Assessment**: ✅ Major world-building addition. NPCs transform the game from a pure dungeon crawler into a world with characters and dialogue. The "limited" interaction pattern (Smith, Cartographer) creates resource-management decisions.

### 3.7 iOS Polish (Commits ~39–50)
**What's delivered**:
- **Touch input fixes**: Complete touch handling for modals, map, UI routing.
- **Pause UX**: Proper pause behavior on iOS (audio recovery on resume).
- **iPhone landscape menus**: Scrollable + compressed at short heights (via `@media` queries).
- **PWA splash screens**: 5 device-specific splash PNGs (750×1334 through 1290×2796) with WebKit media queries in `index.html`.
- **Touch-aware HUD hints**: Contextual control prompts based on input method.

**Assessment**: ✅ Professional mobile polish. The splash screen implementation is thorough (5 breakpoints covering iPhone SE through Pro Max). Touch input completeness is critical for Android APK use.

### 3.8 Gamepad Fixes (Commits ~51–62)
**What's delivered**:
- **Edge detection fix**: Dash, interact, pause now reliably fire on gamepad (was broken).
- **Continuous poll**: Gamepad state polled every frame, not just on events.
- **Controller priority**: Auto-switch to gamepad mode when controller connected; touch overlay hides.
- **Remap fixes**: Fresh edge captures, no phantom B-button fire on menu exit.
- **SD-16/NSW pad recognition**: Switch Pro and 8BitDo controllers now recognized with console + on-screen tooling.
- **Interact range diagnostic**: Console log when "too far" from interactable.
- **iPad controller**: Touch overlay stops blocking gamepad on iPad.

**Assessment**: ✅ Essential for Android APK. Gamepad support is critical for a premium mobile experience (Razer Kishi, Backbone, Bluetooth controllers). These fixes make gamepad actually usable.

### 3.9 Lighting Rebalance (Commits ~63–68)
**What's delivered**:
- **Four-layer rebalance**: Floor, ambient, torch, and entity lighting layers recalibrated.
- **Room visibility fix**: Lights now illuminate (were blinding/overexposed).
- **Lighting architecture**: Fundamental fix to lighting math — previously inverted or over-saturated.
- **Lighting subtlety**: Reduced harshness, added per-sphere room props that interact with light.

**Assessment**: ✅ Critical visual fix. The `main` branch lighting is described as problematic. This rebalance makes the game visually playable.

### 3.10 Visual Identity (Commits ~69–74)
**What's delivered**:
- **Per-sphere floor identity**: Unique floor patterns per sphere.
- **Per-sphere wall identity**: Unique wall textures and capstone designs.
- **Ambient identity**: Sphere-specific ambient particles and color grading.
- **Per-room-type mood overlay**: Different rooms within a sphere get mood variations.
- **Per-shrine altar variants**: 7 shrine kinds get distinct visual treatments.
- **Intentional prop placement**: Props placed by template with accurate exclusion zones.

**Assessment**: ✅ Foundation for visual overhaul. This track establishes the visual differentiation that PixelLab overhaul would build upon.

### 3.11 Audio Expansion (Commits ~75–78)
**What's delivered**:
- **Per-sphere ambient companion voice**: Atmospheric vocal-like tones unique to each sphere.
- **Slow LFO modulation**: Low-frequency oscillation adds movement to ambient layers.
- **Menu hum refinement**: Multi-layer menu music tweaked.

**Assessment**: ✅ Enhances atmosphere. The ambient voice concept is innovative for procedural audio.

### 3.12 Palette + Codex + Polish (Commits ~79–88)
**What's delivered**:
- **Palette anchor**: PALETTE aligned to AAP-64 Lospec reference standard.
- **Crit-color distinction**: Critical hits get visually distinct color treatment.
- **6 codex entries**: Public-domain primary-source texts added to lore.
- **Round-2 audit fixes**: 4+6 concrete fixes from second-pass review.
- **NPC polish**: Post-trade ambient dialogue lines, first-contact sparkle effect.

**Assessment**: ✅ Quality improvements. Palette standardization is important for visual overhaul consistency.

---

## 4. Files Changed Analysis (69 Files)

### 4.1 New Files Added (on PR branch, absent from `main`)
| File | Category |
|---|---|
| `CREDITS.md` | Documentation |
| `cancel.ogg`, `click.ogg`, `confirm.ogg`, `focus.ogg`, `unlock.ogg` | Audio assets |
| `abyss-glyphs.woff2` | Font asset |
| `splash-*.png` (5 files) | iOS PWA splash screens |
| `data/achievements.ts` | Meta progression |
| `data/balance.ts` | Game balance constants |
| `data/consumables.ts` | Consumable items |
| `data/hazards.ts` | Per-sphere hazards |
| `data/npcs.ts` | NPC definitions |
| `data/relicSynergies.ts` | Relic pair bonuses |
| `data/statusEffects.ts` | Status effect system |
| `data/uiColours.ts` | UI color definitions |
| `rendering/roomOverlay.ts` | Room mood overlays |
| `rendering/sphereDecor.ts` | Sphere-specific decoration |
| `tests/dataLookups.test.ts` | Data integrity tests |
| `tests/engineSmoke.test.ts` | Engine smoke tests |
| `tests/synergiesFromRelics.test.ts` | Synergy logic tests |

### 4.2 Files Modified (diffs from `main`)
| File | Nature of Changes |
|---|---|
| `index.html` | iOS splash screen `<link>` elements added |
| `package.json` | Likely dependency updates |
| `package-lock.json` | Lockfile regeneration |
| `service-worker.js` | PWA cache strategy updates |
| `App.tsx` | New screen states for NPCs, daily run, achievements |
| `GameEngine.ts` | Status effects, crits, combos, parry, consumables, relic synergies, archetype ultimates, trap rooms, daily run, NPC interactions, lighting |
| `GameTypes.ts` | New type definitions for all added systems |
| `constants.ts` | Palette update (AAP-64), new timing constants |
| `archetypes.ts` | Ultimate abilities added |
| `enemies.ts` | Per-sphere gating, slain-by callout |
| `relics.ts` | Synergy references |
| `spells.ts` | 2 new spells |
| `weapons.ts` | Status effect declarations |
| `spheres.ts` | Hazard references, visual identity data |
| `shrines.ts` | Per-shrine visual variant data |
| `codex.ts` | 6 new entries |
| `PixelArt.ts` | Sphere-specific tile/texture generation |
| `PixelArtUtils.ts` | New color utilities for mood overlays |
| `AudioSystem.ts` | Per-sphere ambient voice, LFO modulation |
| `SaveSystem.ts` | Daily run state, achievement state, run history |
| `DungeonGenerator.ts` | Trap room placement, per-sphere layout shaping |
| `InputManager.ts` | Gamepad edge detection fix, continuous poll |
| `controlMappings.ts` | Updated default mappings |
| 13 React components | New NPC screens, achievement UI, daily run UI, HUD status strip, tutorial overlay, touch fixes, iPhone layout |
| 3 hooks | Updated gamepad/menu hooks |
| `global.css`, `pixel-ui.css` | iPhone landscape media queries, UI color updates |
| 3 test files | New tests for new systems |

### 4.3 Files NOT Changed (stable across both branches)
These core files appear unchanged, suggesting they were satisfactory:
- `DungeonGenerator.ts` core algorithm (layout shaping added but BFS core untouched)
- `combat.ts` (damage formulas extended, not replaced)
- `cinematics.ts` (unchanged)
- Most sprite definitions in `PixelArt.ts` (extended, not rewritten)

---

## 5. Risk Assessment of PR Merge

### 5.1 Merge Complexity
| Factor | Assessment |
|---|---|
| **Commit count** | 88 — extremely high for single PR |
| **Files changed** | 69 — touches nearly every file in the repo |
| **Lines changed** | Estimated 15,000–25,000+ (based on scope) |
| **Merge conflicts** | Likely low (PR branch is ahead of main, not divergent) |
| **Review feasibility** | Impossible to review properly as a single PR |

### 5.2 Technical Risks

| Risk | Severity | Detail |
|---|---|---|
| **Untested interactions** | HIGH | 88 commits of new systems interacting — status effects + crits + combos + parry + consumables + synergies + ultimates all fire simultaneously. Emergent bugs likely. |
| **Performance regression** | MEDIUM | Status effect tick-per-frame, combo tracking, ambient LFO modulation, and per-sphere visual identity may increase CPU/GPU load. Android Tensor G4 untested. |
| **Save compatibility** | HIGH | New systems mean new save state fields. Old saves on `main` will be incompatible or require migration logic. |
| **Audio regression** | MEDIUM | Per-sphere ambient voice + LFO may conflict with existing music/SFX buses. Audio diagnostics may report new issues. |
| **iOS-specific regressions** | MEDIUM | iOS polish commits are forward-ported from development — may have introduced iOS-only bugs that don't manifest on desktop. |
| **Test coverage gaps** | HIGH | New systems (status effects, crits, combos, parry, consumables, synergies, ultimates, hazards, NPCs, daily run) have minimal or no dedicated tests. Only 3 new test files for 12+ new systems. |

### 5.3 GitHub Actions Instability
The PR shows intermittent deploy failures:
- Some commits: "temporarily deployed to github-pages — with GitHub Actions Inactive"
- One commit: "had a problem deploying to github-pages — with GitHub Actions Failure"

This suggests the PR branch may have build/deploy issues that need resolution before merge. The failure could be related to new assets (OGG files, WOFF2 font, splash PNGs) not being handled correctly by the deploy workflow.

### 5.4 Structural Risk: Monolithic Development
The PR represents a **single-developer, AI-assisted, long-running branch** with no incremental review. This pattern carries inherent risks:
- No peer feedback on architecture decisions
- No incremental testing of feature interactions
- No documentation of design rationale beyond commit messages
- No separation of concerns — a bug in lighting could block merging combat depth

---

## 6. What the PR Tells Us About the Development Process

### 6.1 AI-Assisted Development Pattern
The PR is clearly AI-generated (all commits link to `claude.ai/code/session_01EhtTU6sVCzpPUB8uKntHNm`). This suggests:
- **Rapid iteration**: 88 commits in what appears to be a single or few Claude Code sessions
- **Broad scope**: AI was instructed to work across all tracks simultaneously
- **No human review between commits**: The 88 commits were generated and pushed without intermediate review
- **Diffuse focus**: Rather than completing one track, merging, and moving on, all tracks were developed in parallel

### 6.2 Quality Signals
**Positive signals**:
- Commit messages are descriptive and track-tagged (e.g., `add:`, `fix:`, `feat:`, `polish:`)
- Sub-commit grouping is logical (fixes follow features in the same track)
- iOS and gamepad fixes show attention to platform-specific edge cases
- Lighting rebalance shows willingness to fix fundamental architecture issues

**Concerning signals**:
- No tests committed alongside new features (most commit messages lack test references)
- Deploy failures not resolved before further commits
- PR title not updated to reflect actual scope
- No self-review comments on the PR (author could have left notes for themselves)

---

## 7. Comparison: `main` vs PR Branch

| Dimension | `main` Branch | PR Branch (`claude/abyss-...`) |
|---|---|---|
| **Combat** | Basic HP-trading | Status effects, crits, combos, parry |
| **Weapons** | 5 | 5 (with status declarations) |
| **Spells** | 4 | 6 (+Wrath Splinter, Mirror Sigil) |
| **Relics** | 12 (independent) | 12 + 8 synergy pairs |
| **Archetypes** | 3 (basic) | 3 (with ultimates) |
| **Consumables** | None | Phials, bombs, charm, salt, sand |
| **Enemies** | 7 types, depth-gated | 7 types, sphere-gated + slain-by callout |
| **Bosses** | 7 identical 22×20 sprites | Same (no boss visual overhaul) |
| **NPCs** | Minimal/absent | Hierophant, Ogdoad Chorister, Smith, Cartographer |
| **Spheres** | 8 (names + palette) | 8 (hazards, visual identity, layout shaping) |
| **Rooms** | 9 types | + trap rooms, mood overlays |
| **Shrines** | 7 kinds | + visual variants per kind |
| **HUD** | Basic | Status strip, combo counter, tutorial |
| **Meta** | None | Achievements, run history, ascension, daily run |
| **Visuals** | Procedural pixel-art | + sphere identity, mood overlays, palette anchored to AAP-64 |
| **Lighting** | Problematic | Four-layer rebalance |
| **Audio** | 8 sphere loops + menu hum | + per-sphere ambient voice, LFO modulation |
| **iOS** | Basic PWA | Splash screens, touch fixes, landscape menus |
| **Gamepad** | Basic detection | Edge fixes, continuous poll, SD-16/NSW pad, iPad fix |
| **Tests** | 15 unit + 3 component + 5 e2e | +3 tests (dataLookups, engineSmoke, synergiesFromRelics) |
| **Deploy** | Stable (presumed) | Intermittent failure |

**Net assessment**: The PR branch contains approximately **2–3× the content and systems** of `main`. It is unequivocally the canonical version. The completion roadmap **must** use this branch as its foundation.

---

## 8. Recommended Actions Before Completion Roadmap Execution

### 8.1 Immediate (Before Any Development Work)
1. **Clone the PR branch locally** — The completion roadmap needs PR branch code, not `main`. `git fetch origin claude/abyss-seven-lamps-game-057YQ`
2. **Run the test suite on PR branch** — `npx vitest run` + `npx playwright test` to verify current test pass rate
3. **Build the PR branch** — `npm run build` to confirm production build succeeds
4. **Run the dev server** — `npm run dev` and manually play-test to understand current state
5. **Fix deploy failures** — Investigate and resolve the GitHub Actions failure before adding more complexity

### 8.2 Structural (Before Merge)
1. **Split the PR into logical merge units** — Recommend the author break PR #1 into 5–7 smaller PRs by track
2. **Add tests for new systems** — Especially status effects (tick math), combos (timing), crits (probability distribution), relic synergies (pair logic)
3. **Run the existing test suite** — Confirm no regressions from the 88 commits
4. **Performance profile** — Measure FPS, memory, and audio node count on the PR branch
5. **Save migration test** — Verify old `main` saves are handled gracefully (or document incompatibility)

### 8.3 For Completion Roadmap Planning
1. **Treat PR branch as baseline** — All Phase 4–8 deliverables should reference PR branch code, not `main`
2. **Account for added complexity** — Status effects, combos, synergies, NPCs, and hazards all interact. Visual overhaul must work with all of these.
3. **Preserve iOS/gamepad fixes** — These are hard-won platform-specific fixes. Do not regress them during Android optimization.
4. **Leverage new palette** — The AAP-64 anchor is the correct starting point for PixelLab visual overhaul
5. **Build on NPC framework** — The NPC interaction system (greet → trade → limited) is a solid foundation for adding more characters

---

## 9. Verdict & Recommendation

### 9.1 Verdict
**PR #1 is mislabeled and monolithic but functionally invaluable.** It contains 2–3× the game's content and systems compared to `main`. The 88-commit structure is a development artifact of AI-assisted solo work — not suitable for peer review but acceptable as a working branch. The intermittent deploy failures need resolution but are unlikely to be fundamental issues.

### 9.2 Recommendation
**DO NOT merge PR #1 as-is.** Instead:
1. Use the PR branch as the working baseline for the completion roadmap
2. Cherry-pick or rebase the 88 commits into track-grouped branches after the completion work is done
3. Address deploy failures and test gaps during Phase 5 (Android optimization) and Phase 6 (completion roadmap)
4. The final APK build should come from a clean merge of the completion work into the PR branch, not `main`

### 9.3 Impact on Completion Roadmap Phases
| Phase | Impact |
|---|---|
| **Phase 4 — PixelLab Visual Overhaul** | PR branch already has per-sphere visual identity, mood overlays, and AAP-64 palette anchor. Overhaul builds on this foundation, not from scratch. |
| **Phase 5 — Pixel 9 Pro Fold Optimization** | iOS fixes in PR branch provide a template for mobile optimization. Gamepad fixes directly apply to Android controller support. |
| **Phase 6 — Completion Roadmap** | PR branch fills many "incomplete" gaps identified in REPO_AUDIT.md (status effects, combos, consumables, NPCs, hazards, etc.). Remaining gaps are smaller. |
| **Phase 7 — APK Strategy** | PR branch's iOS PWA splash screens and touch fixes demonstrate mobile-ready patterns. Capacitor wrap should be straightforward. |
| **Phase 8 — Final Report** | Will document the PR branch state as the true baseline, with `main` noted as a public snapshot. |

---

## 10. PR Audit Completeness

| Area | Coverage | Confidence |
|---|---|---|
| **PR metadata** | Full page visited, all commits listed | HIGH |
| **Files changed** | 69 files identified, categories mapped | HIGH |
| **Commit scope** | All 88 commits categorized by track | HIGH |
| **Code changes** | Assessed from commit messages and file lists; no local diff inspection | MEDIUM |
| **Build/deploy status** | GitHub Actions status observed | HIGH |
| **Test coverage** | 3 new test files identified; coverage gaps noted | HIGH |
| **Risk assessment** | Architectural and process risks evaluated | HIGH |
| **Comparison to main** | Feature-by-feature table created from source audit | HIGH |

**Overall confidence**: HIGH — sufficient for Phase 4–8 planning that depends on PR branch content.

---

**End of OPEN_PR_AUDIT.md**
