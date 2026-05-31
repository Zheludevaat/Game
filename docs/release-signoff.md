# Release Sign-Off

Each manual gate must be run once and a passing result recorded before release.
Date, device, browser, and tester fields must be filled for each manual row.

## Automated Gates

| Gate | Status | Date |
|---|---|---|
| `npm run typecheck` | PASS | 2026-05-31 |
| `npm test` | PASS (74 tests) | 2026-05-31 |
| `npm run e2e` | PASS (12 tests) | 2026-05-31 |
| `npm run build` | PASS | 2026-05-31 |
| `npm audit --omit=dev` | PASS (0 vulnerabilities) | 2026-05-31 |

## Desktop Chrome

| Test | Status | Date | Tester | Notes |
|---|---|---|---|---|
| Main menu renders | Unverified | | | |
| Archetype select renders | Unverified | | | |
| First room loads | Unverified | | | |
| Combat (attack, cast, damage) | Unverified | | | |
| Pause menu | Unverified | | | |
| Map opens | Unverified | | | |
| Player death and game over | Unverified | | | |

## Desktop Keyboard

| Test | Status | Date | Tester | Notes |
|---|---|---|---|---|
| Movement (WASD / arrows) | Unverified | | | |
| Attack (J) | Unverified | | | |
| Cast (L) | Unverified | | | |
| Interact (E / Enter) | Unverified | | | |
| Map (M / Tab) | Unverified | | | |
| Pause (Esc / P) | Unverified | | | |

## Standard Gamepad

| Test | Status | Date | Tester | Notes |
|---|---|---|---|---|
| Movement (left stick / D-pad) | Unverified | | | |
| Attack (A / Cross) | Unverified | | | |
| Cast (X / Square) | Unverified | | | |
| Interact (Y / Triangle) | Unverified | | | |
| Map (Select / Minus) | Unverified | | | |
| Pause (Start / Plus) | Unverified | | | |
| Remapping works | Unverified | | | |

## Mobile - iPhone Safari Portrait

| Test | Status | Date | Tester | Notes |
|---|---|---|---|---|
| Menu fits without scrolling | Unverified | | | |
| Archetype select fits without scrolling | Unverified | | | |

## Mobile - iPhone Safari Landscape

| Test | Status | Date | Tester | Notes |
|---|---|---|---|---|
| All doors visible in room | Unverified | | | |
| Touch controls reachable | Unverified | | | |
| No UI cut off | Unverified | | | |

## Mobile - iPhone PWA

| Test | Status | Date | Tester | Notes |
|---|---|---|---|---|
| Launch from home screen | Unverified | | | |
| Audio unlocks on first tap | Unverified | | | |
| Resume works | Unverified | | | |
| Rotate device | Unverified | | | |
| Background and return | Unverified | | | |

## iPad Safari

| Test | Status | Date | Tester | Notes |
|---|---|---|---|---|
| Landscape play | Unverified | | | |
| Touch controls | Unverified | | | |
| Pause menu | Unverified | | | |
| Map | Unverified | | | |
| Settings | Unverified | | | |

## PWA Offline

| Test | Status | Date | Tester | Notes |
|---|---|---|---|---|
| App shell loads offline | Unverified | | | |
| Useful state shown (not blank) | Unverified | | | |

## Audio Sanity

| Test | Status | Date | Tester | Notes |
|---|---|---|---|---|
| Menu music | Unverified | | | |
| Dungeon music (all 7 spheres) | Unverified | | | |
| Boss music (all 7 spheres) | Unverified | | | |
| Game over music | Unverified | | | |
| Prologue music | Unverified | | | |
| Epilogue music | Unverified | | | |
| Codex music | Unverified | | | |
| All SFX play correctly | Unverified | | | |

## Long Session

| Test | Status | Date | Tester | Notes |
|---|---|---|---|---|
| 20 min run - no audio crackle | Unverified | | | |
| 20 min run - no growing lag | Unverified | | | |
| 20 min run - no console errors | Unverified | | | |
