# Release Checklist

## Required Automated Gates

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm audit --omit=dev`

## Required Manual Gates

- Desktop Chrome: menu, archetype, first room, combat, pause, map, death.
- Desktop keyboard: movement, attack, cast, interact, map, pause.
- Standard gamepad: movement, attack, cast, interact, map, pause, remap.
- iPhone Safari portrait: menu and archetype fit without scrolling.
- iPhone Safari landscape: doors are visible, touch controls are reachable, no UI is cut off.
- iPhone PWA: launch, audio unlock, resume, rotate, background and return.
- iPad Safari: landscape play, touch controls, pause, map, settings.
- Offline PWA: app shell loads and shows a useful state.
- Audio: menu, dungeon, boss, game over, prologue, epilogue, codex, all SFX.
- Long session: 20 minute run without audio crackle, growing lag, or console errors.
