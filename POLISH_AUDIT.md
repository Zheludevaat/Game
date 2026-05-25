# Polish Audit

## Main menu beauty
- ✅ Animated parallax abyss starfield + drifting dust.
- ✅ Seven flickering lamps arc across the top.
- ✅ Glowing gold title with text-clip gradient, drop-shadow, and gold filigree corners on every panel.
- ✅ Subtle subtitle "The Initiate Approaches" and version badge.

## Pixel art quality
- ✅ Player initiate (hooded silhouette with glowing eyes, cloak swing, dash trail).
- ✅ 6 enemy archetypes hand-pixeled via PixelMatrix strings, each with distinct palette + silhouette.
- ✅ Procedural floor tiles with grout, cracks, occasional gold inlays.
- ✅ Wall tiles with brick lines and lit top edges.
- ✅ Animated torches with flickering flame ellipses.
- ✅ Shrine, chest (open + locked + glow when opened), stair stack with rising rune.

## Animation quality
- ✅ Walk bob, dash trail particles, hit flash white-out, iframe shimmer, damage numbers with float + gravity.
- ✅ Melee swing arc rendered in world space.
- ✅ Spell projectiles with trail particles + white core.
- ✅ Boss telegraph crimson bar pulses before attacks.
- ✅ Room-clear gold ring burst.
- ✅ Floor transition flash overlay.

## Dungeon atmosphere
- ✅ Vignette over every room.
- ✅ Occult pentagram + circles inscribed on arena floors.
- ✅ Boss arena has 7 lit lamps around perimeter.
- ✅ Dust motes drift periodically.

## Combat feel
- ✅ Melee: short cooldown, swing arc, knockback, hit particles.
- ✅ Dash: brief iframes, screen-relative direction, trail.
- ✅ Spell: mana cost, pierce/homing relic mods, projectile reflect chance.
- ✅ Damage numbers always visible above target.
- ✅ Camera shake on player hit, boss spawn, sigil detonation.

## Controller support
- ✅ Standard mapping with dead-zones and D-pad fallback.
- ✅ Button edge detection prevents accidental repeat fires in menus.
- ✅ Live "press to bind" remap in settings, persisted to localStorage.
- ✅ Controller Test page with all 17 standard buttons + axes live.
- ✅ Detected controller id displayed in HUD when connected.

## Touch controls
- ✅ 160 px joystick + four 88 px buttons, large enough for iPad fingers.
- ✅ Auto-shows on touch devices, hides under controller.
- ✅ Can be toggled off in settings.

## iPad PWA behavior
- ✅ Manifest declares fullscreen landscape, theme/background colours.
- ✅ Apple meta tags, status bar style black-translucent, safe-area paddings.
- ✅ Portrait rotate overlay prevents mis-orientation.
- ✅ `touch-action: none`, no callouts, no overscroll.

## Offline behavior
- ✅ Service worker pre-caches app shell + bundle + manifest + icons.
- ✅ Runtime fetch handler caches new GET requests, falls back to `index.html` when offline.

## Audio
- ✅ WebAudio unlocks on first input.
- ✅ Menu hum + dungeon ambience drones differ.
- ✅ 12 procedural SFX cover all primary actions.
- ✅ Music/SFX volume sliders independently persisted.

## Save persistence
- ✅ Settings, best floor, total essence, meta upgrades, controller mapping, last archetype, resume snapshot — all persisted.
- ✅ Reset save button with confirmation.

## Performance
- ✅ Renders at 480×270 virtual resolution scaled with `image-rendering: pixelated`.
- ✅ Particle cap (600) + reduced-particles toggle.
- ✅ Fixed-timestep sim, decoupled from render frame, dt clamped.
- ✅ HUD throttled to ~20Hz to avoid React thrash.

## Bugs
- None known. Reported issues: 0.
