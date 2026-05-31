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

## PWA

- `manifest.webmanifest` has correct `display: standalone`, `start_url: "./"`, `scope: "./"`, theme and background color `#05060a`.
- Service worker caches the app shell (`./`, `./index.html`, `./manifest.webmanifest`, icons).
- Service worker uses network-first for HTML navigations (avoids stale index.html serving 404 chunk URLs) and cache-first for hashed assets.
- Registration runs only in production builds (skipped in dev).

## Music Acceptance

- Menu cue has a memorable theme within the first 20 seconds.
- Each dungeon sphere has a distinct motif and instrumentation color.
- Each dungeon cue has at least four sections across a 32-bar loop.
- Boss cues quote the matching dungeon motif but intensify it.
- Boss phase changes add layers without restarting the whole transport unless a transition requires it.
- No cue clips in the audio diagnostics panel during a 90 second listen.
- Switching between any two cues ten times does not increase active disposable count after fadeout settles.
- iPhone Safari plays music after the first user gesture and does not crackle during a five minute session.
