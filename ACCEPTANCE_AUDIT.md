# Acceptance Audit

Every acceptance criterion from the original prompt with status.

## Primary outcome

- ✅ Run the app locally (`npm install && npm run dev` or `npm run build && npm run preview`).
- ✅ Open a beautiful pixel-art main menu (parallax stars, animated seven lamps, gold filigree panels).
- ✅ Start a new run (`New Run` button).
- ✅ Select an archetype (3 pixel cards with stats, starting relic, controller-navigable).
- ✅ Enter a procedural Hermetic dungeon.
- ✅ Move, attack, dash, cast spells, interact, pause, open map.
- ✅ Play with a Bluetooth controller through the browser Gamepad API.
- ✅ Play with keyboard or iPad touch controls.
- ✅ Clear rooms, collect loot, open chests, use shrines, descend floors, fight enemies, fight a boss.
- ✅ Add the app to iPad Home Screen as a PWA (manifest + Apple meta tags + how-to-play instructions included).
- ✅ Relaunch as full-screen PWA (`display: fullscreen` in manifest).
- ✅ Play offline after the first load (service worker caches app shell + bundle).
- ✅ See saved best floor, settings, essence, controller mapping, meta progression (localStorage persistence).

## Repository handling
- ✅ Empty repo detected, created Vite + React + TS + Canvas 2D + minimal deps.
- ✅ React for shell/menus/HUD/settings/controller test/touch/PWA help/game-over/meta.
- ✅ Canvas 2D for world/player/enemies/projectiles/particles/lighting/combat.
- ✅ No copyrighted assets, no external sprite fetches, no remote server. Procedural pixel art, gradients, particles, CSS-only UI.

## Visual target
- ✅ Top-down pixel-art dungeon crawler.
- ✅ Dark obsidian floors, deep indigo shadows, teal magical light, antique gold UI, crimson enemies, violet spell aura, bone-white glyphs, alchemical circles, animated torches, dust motes, door glyphs, shrine glow, chest sparkle, spell particles, dash trail, hit flashes, damage numbers, room-clear burst, boss warning pulse, floor transition ritual flash, parallax abyss background on menus, atmospheric minimap.
- ✅ Internal render at 480×270 virtual resolution, nearest-neighbor scaling, `image-rendering: pixelated`, DPR-aware, landscape-first, portrait rotate overlay.

## Title & theme
- ✅ Title "Abyss of the Seven Lamps", seven lamps motif on menu/loading/boss arena.
- ✅ Hermetic/alchemical/Kabbalistic/Tarot tone in room names, archetype names, shrine names, boss name.
- ✅ Symbolic room names (Salt Vault, Mercurial Passage, Lunar Cistern, Saturnine Hall, etc.).

## Core loop
- ✅ Menu → New Run → Archetype → Floor → Explore → Fight → Loot → Open chests → Activate shrines → Discover stairs → Descend → Difficulty scales → Mini-boss every 5 floors → Boss every 10 floors → Death → Summary → Save best floor + meta → Restart or return to menu.

## Player
- ✅ All listed stats (HP, MP, attack, spell power, speed, dash cooldown, dash i-frames, armor, luck, essence, coins, keys, relics, floor).
- ✅ All abilities (8-dir move, melee arc, ranged spell, dash + i-frames, interact, pause, map).
- ✅ Player sprite is hooded initiate with glowing eyes, cloak animation, dash trail, hit flash, directional facing.

## Archetypes
- ✅ Magus (balanced caster, Emerald Tablet Fragment).
- ✅ Hermit (high HP/armor melee, Black Salt Stone).
- ✅ Star (fast/fragile/lucky, Lunar Mirror Shard).
- ✅ Stats genuinely differ in-game (HP, MP, attack, spell, speed, armor, luck, dash cooldown, mana regen).

## Dungeon generation
- ✅ Deterministic seed per floor (`hashSeed(runSeed, n)`).
- ✅ Rooms on grid, start always exists, exit always exists, exit always reachable (farthest BFS room).
- ✅ Rooms connected by doors, room count scales with floor.
- ✅ Enemy difficulty scales with floor.
- ✅ Mini-boss room on floors %5 (non-boss), boss room on floors %10.
- ✅ Minimap with discovered rooms, current highlighted, room type colour-coded after discovery.

## Room types
- ✅ Start, Enemy, Treasure, Shrine, Locked, Exit, MiniBoss, Boss — all rendered.
- ✅ Each room has stone floor with cracks + gold inlays, occult circle in arena rooms, brazier torches, golden door frames or locked stone doors, stairs/chest/shrine when relevant, ambient vignette darkness.

## Enemies (≥6)
- ✅ Lesser Shade (slow chaser, low HP).
- ✅ Mercury Imp (fast jitter, low HP).
- ✅ Salt Golem (slow tank, high HP, heavy damage).
- ✅ Lunar Wisp (ranged moon bolts, keeps distance).
- ✅ Saturn Knight (telegraphed charge, armored).
- ✅ Serpent of Brass (mini-boss, wavy chase + arc projectile spit).
- ✅ Enemies activate when player enters room; enemy rooms lock until cleared.
- ✅ Enemies drop loot (coins/essence/HP/MP/keys/relic chances).
- ✅ Hit flashes, death particles, distinct silhouettes/colours.

## Boss
- ✅ Warden of the First Lamp on floors 10, 20, 30… with scaling HP.
- ✅ Dark ritual chamber, seven unlit lamps around, central alchemical seal, entry pulse + camera shake, boss title banner, boss health bar, locked exits.
- ✅ Multi-phase (3 phases at 60% / 30%), summons Lesser Shades, fires radial bursts, drops delayed sigils, drops essence + relic, opens stairs after defeat.

## Relics (≥12)
- ✅ Emerald Tablet, Black Salt, Crown Spark, Serpent Wand, Lunar Mirror, Solar Coin, Saturn Seal, Mercury Sandals, Rose Cross, Sulfur Heart, Chalice of Luna, Key of the Gate — all implemented with gameplay effects.
- ✅ HUD strip, game-over summary, awarded by chests/shrines/bosses/drops, symbolic glyph icons.

## Pickups & interactables
- ✅ Coins, essence, keys, HP, MP, chests (regular + locked), shrines, exit stairs, doors.
- ✅ Chests grant coins, essence, pickups, or relics. Locked chests require keys (Key of the Gate may bypass).
- ✅ Shrines: Calcination, Dissolution, Separation, Conjunction, Fermentation, Distillation, Coagulation — each with boon + cost dialog.

## Input system
- ✅ `InputManager` exposes normalized actions (moveX, moveY, attackPressed, attackHeld, dashPressed, spellPressed, interactPressed, pausePressed, mapPressed, useItemPressed, cycleRelicPressed).
- ✅ GamepadManager logic inside InputManager; KeyboardManager logic inside InputManager; TouchManager via touch component bridging into InputManager.
- ✅ Current input method tracked and displayed in HUD ("controller / keyboard / touch" pill).

## Gamepad
- ✅ Listens for `gamepadconnected` / `gamepaddisconnected`.
- ✅ Polls `navigator.getGamepads()` every frame.
- ✅ Supports standard mapping, dead zones, D-pad, button edge detection in menus.
- ✅ Persists mapping in localStorage, settings screen allows live remap of every action.
- ✅ Controller status + detected name shown in HUD.
- ✅ Default mapping matches spec (A attack, B dash, X spell, Y interact, LB use, RB cycle, Start pause, Select map).
- ✅ Controller Test screen shows live axes, buttons, mapping labels, plus the pairing instruction copy.

## Keyboard
- ✅ WASD / arrows = move, J = melee, K/Space = dash, L = spell, E/Enter = interact, M/Tab = map, Esc = pause.

## Touch
- ✅ Virtual joystick on left, 4 large pixel buttons on right (Attack/Dash/Spell/Use).
- ✅ Auto-shown on touch devices, hidden when controller is active (`hud.inputMethod === 'controller'`).
- ✅ Toggle in settings.

## iPad PWA
- ✅ `manifest.webmanifest` (fullscreen, landscape, name/short name/theme/background colour).
- ✅ `service-worker.js` caches app shell, network fallback.
- ✅ `apple-mobile-web-app-capable`, `mobile-web-app-capable`, Apple status bar style, theme-color, viewport with `viewport-fit=cover`.
- ✅ Safe-area-inset paddings on HUD and menus.
- ✅ Full-screen, landscape-first; portrait shows rotate overlay.
- ✅ `touch-action: none`, `-webkit-touch-callout: none`, `user-select: none`, `overscroll-behavior: none` in CSS.
- ✅ Canvas resizes cleanly on orientation change and DPR.
- ✅ How to Play screen explains Home Screen installation.

## Screens
- ✅ Loading screen (animated 7 lamps).
- ✅ Main menu (with all listed buttons + animated abyss bg + glowing title + pixel panels + dust particles).
- ✅ Archetype select (3 cards, stats, starting relic visible, controller/keyboard/touch navigable).
- ✅ Game screen (canvas + React HUD overlay + touch controls when active + rotate overlay if portrait).
- ✅ Pause menu (Resume, Settings, Controller Test, Quit to Menu).
- ✅ Settings (volumes, touch toggle, pixel scale, reduce particles, remap, reset save with confirmation).
- ✅ Controller Test (live visualization).
- ✅ How to Play (controller/keyboard/touch instructions + rooms/relics/shrines/boss + PWA install).
- ✅ Game Over (floor reached, rooms cleared, enemies defeated, bosses defeated, essence, coins, relics, best floor; New Run / Main Menu).
- ✅ Meta Progression (max HP, starting MP, essence gain, cosmetic aura).

## HUD
- ✅ HP, MP, floor, coins, keys, essence, room type, room name, minimap, relic icons, input method pill, controller status, boss health bar.

## Mini-map
- ✅ Discovered rooms, current highlighted, type colour-coded, expanded fullscreen map via M/Select.

## Audio
- ✅ Procedural WebAudio. Menu hum, dungeon ambience, melee, dash, spell, enemy hit, player hit, chest, shrine, descend, boss warn, boss death, pickup, door lock/open.
- ✅ Unlocks on first pointer/key/gamepad input.
- ✅ Music + SFX volumes adjustable and persisted.

## Save system
- ✅ Settings (incl. controller mapping), best floor, total essence, meta upgrades, last archetype, resume state — all in localStorage.
- ✅ Continue button: 🟡 resumes from last floor + run seed (mid-floor state not serialised — explicitly allowed by spec).

## Engine
- ✅ `requestAnimationFrame` loop with delta clamping and semi-fixed step (1/60).
- ✅ Canvas rendering separate from simulation; React HUD snapshotted at ~20Hz.
- ✅ Listeners attached/detached cleanly.
- ✅ Particle system honors reduced-particles toggle.
- ✅ Collisions: player vs walls, melee vs enemies, projectiles vs enemies, enemy projectiles vs player, player vs pickups, interact range vs chests/shrines/doors/stairs.
- ✅ Doors lock while enemies are alive; loot drops on clear; stairs work only when reachable and interact pressed.

## Visual polish checklist
All ✅ — see POLISH_AUDIT.md.

## Validation
- ✅ `npm install` clean, `npm run build` succeeds, `npm run typecheck` passes (no errors).
- ✅ Smoke test via `vite preview` returns HTML + JS bundle + manifest 200 OK.
- 🟡 No automated test suite (none required by spec).

## Net status
No ❌ items.
