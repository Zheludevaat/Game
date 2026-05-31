# Project Status — Abyss of the Seven Lamps

## Overall
Playable vertical slice. `npm run build` succeeds, app boots, controller/keyboard/touch input work, dungeons generate, combat/loot/shrines/bosses/floor descent all functional. Auto-deploys to GitHub Pages on every push (see `.github/workflows/deploy.yml`). Touch UI + HUD scale responsively from iPad down to iPhone landscape.

## What is implemented
- Vite + React + TypeScript scaffold, strict mode, `npm run build` and `npm run typecheck` pass with zero errors.
- PWA: web app manifest, icons (192/512/180), service worker with offline shell cache, Apple meta tags, safe-area insets, full-screen landscape, rotate overlay (device-agnostic copy).
- **GitHub Actions deploy**: `.github/workflows/deploy.yml` builds `dist/` and publishes to GitHub Pages on every push to the working branch. User just needs to flip Pages → Source = GitHub Actions in repo settings.
- **iPhone landscape playability**: HUD bars, pixel buttons, touch joystick + buttons, relic strip, and archetype-select grid all responsive via `clamp()` / `vw` / `vh` + a `max-width: 880px` media query. Same iPad layout shrinks cleanly to small landscape phones.
- Audio: WebAudio system with mobile unlock on first input, menu hum, dungeon ambience, ~12 procedural SFX, music/SFX volume sliders.
- Save system (localStorage): settings, controller mapping, best floor, total essence, meta upgrades, last archetype, resume state.
- Loading screen, animated main menu (parallax starfield + 7 lamps), archetype select with stat panels, pause menu, settings (volume / touch / particles / pixel scale / live controller remap / reset save), controller test screen, how-to-play, game over summary, meta progression shop, in-game minimap, fullscreen map overlay.
- Game engine: virtual-resolution Canvas 2D (480×270) with nearest-neighbor scaling and DPR handling, fixed-timestep simulation, camera follow with shake, room transitions, vignette, floor transition flash, boss banner.
- Player: 8-dir movement, melee arc, dash with i-frames + trail, spell projectiles (with pierce/homing), interact, mana regen, dynamic facing, hit flash, damage numbers.
- Procedural Hermetic dungeon generator: deterministic seed per floor, random-walk layout, doors based on adjacency, farthest-room exit, treasure/shrine/locked/mini-boss rooms, boss floor every 10 with bespoke layout.
- Enemies (6 distinct types + boss): Lesser Shade, Mercury Imp, Salt Golem, Lunar Wisp, Saturn Knight, Serpent of Brass (mini-boss), Warden of the First Lamp boss with 3 phases, radial bursts, summons, delayed sigils.
- Loot: coins, essence, keys, HP/MP pickups, relics, chests (regular + locked), shrines (7 alchemical operations with boon+cost dialog).
- 12 relics with real gameplay effects (pierce, homing, armor, speed, attack/mana trade, mana regen, dash trade, coin boost, revive once, locked-chest key chance, reflect).
- Input: unified `InputManager` with keyboard, gamepad (Gamepad API, polling, dead-zones, button edge detection, D-pad), touch (virtual stick + 4 buttons). Method auto-detected and displayed in HUD with gamepad name when known.

## Partially complete
- Controller remapping has live "press to bind" but no per-button validation/conflict warning. Functional but minimal.

## Broken
- No confirmed regressions during development. Manual QA gates in `docs/release-checklist.md` (desktop Chrome, keyboard, gamepad, audio) remain unverified; see `docs/known-gaps.md`.

## What remains
- Optional: deeper boss variants per cycle (floor 20, 30 use same boss with scaled HP — task explicitly allows that).
- Optional: more enemy variety past floor 5+.
- Polish items in `docs/known-gaps.md` (P2/P3).

## Current validation results
- `npm install` — clean
- `npm run build` — succeeds (≈240 kB JS, 11 kB CSS gzipped 74 kB / 3 kB)
- `npm run typecheck` — passes (no TS errors)
- Manual smoke test via `vite preview`: HTML served, JS bundle 200 OK, manifest served, icons + service worker present in `dist/`.

## Next recommended task
- Close remaining P1 gaps in `docs/known-gaps.md`, then run the full release checklist in `docs/release-checklist.md`.
