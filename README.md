# Abyss of the Seven Lamps

A premium pixel-art Hermetic infinite dungeon crawler — iPad PWA, controller-first, keyboard + touch fallback. Built with Vite + React + TypeScript + Canvas 2D.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build for production

```bash
npm run build
npm run preview  # serves dist/ on http://localhost:4173
```

## Install as an iPad PWA

1. Open the deployed URL in Safari on iPad.
2. Tap the Share icon → **Add to Home Screen**.
3. Launch from the Home Screen for full-screen, landscape, offline play.

## Controls

| Action      | Controller (standard mapping) | Keyboard      | Touch          |
| ----------- | ----------------------------- | ------------- | -------------- |
| Move        | Left stick / D-pad            | WASD / Arrows | Left joystick  |
| Attack      | A / ×                          | J             | ATTACK button  |
| Dash        | B / ○                          | K / Space     | DASH button    |
| Spell       | X / □                          | L             | SPELL button   |
| Interact    | Y / △                          | E / Enter     | USE button     |
| Pause       | Start / Menu                   | Esc           | Pause via menu |
| Map         | Select / Share                 | M / Tab       | —              |

Pair your Bluetooth controller in iPad Settings, then press a button to switch input modes automatically.

## Project layout

```
src/
  App.tsx
  main.tsx
  components/       React UI (menus, HUD, settings, touch, etc.)
  game/
    GameEngine.ts   Simulation + rendering orchestrator
    GameTypes.ts    Core type definitions
    constants.ts
    data/           Archetype, relic, room-name definitions
    input/          InputManager + control mappings
    math/           RNG, vec2 helpers
    rendering/      PixelArt, Particles
    systems/        AudioSystem, SaveSystem
    world/          DungeonGenerator
  pwa/              Service worker registration
  styles/           Global + pixel-UI CSS
public/             manifest.webmanifest, service-worker.js, icons
```

See `PROJECT_STATUS.md`, `ACCEPTANCE_AUDIT.md`, `POLISH_AUDIT.md`, and `TODO_NEXT.md` for detailed status.
