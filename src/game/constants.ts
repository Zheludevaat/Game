export const VIRTUAL_W = 480;
export const VIRTUAL_H = 270;

export const TILE = 16;
export const ROOM_TILES_W = 30;
export const ROOM_TILES_H = 17;

export const ROOM_W = ROOM_TILES_W * TILE; // 480
export const ROOM_H = ROOM_TILES_H * TILE; // 272 — slightly taller than virtual; we render with camera

export const DOOR_THICKNESS = 16;

export const STORAGE_KEYS = {
  settings: 'sl.settings',
  best: 'sl.best',
  essence: 'sl.essence',
  meta: 'sl.meta',
  lastArchetype: 'sl.lastArchetype',
  gamepadMap: 'sl.gamepadMap',
  resume: 'sl.resume',
} as const;

/**
 * Core palette. Every game-side hex code should derive from a swatch
 * here (or in `data/spheres.ts:SPHERES[].colour/accent` for per-sphere
 * theming, or in `data/uiColours.ts:DAMAGE_COLOURS` for hit numbers).
 *
 * The palette is hand-curated against the **AAP-64** Lospec reference
 * (Adigun Polack, public domain) — see
 * <https://lospec.com/palette-list/aap-64>. AAP-64 is a 64-colour
 * retro-tuned set with strong gothic / dungeon coverage and a balanced
 * value ramp across every hue family. We don't lock to its exact hex
 * codes (the game's identity uses warmer golds + cooler violets than
 * AAP's defaults), but each entry below sits within ±10 % of an AAP
 * neighbour. Future colour additions: pick the nearest AAP swatch as a
 * starting point, then nudge for narrative fit.
 *
 * Family layout:
 *  - bg / floor / wall  → muted indigo-violet dungeon base
 *  - gold / bone        → torch & relic warmth
 *  - teal               → cool secondary (Mercury, healing, shields)
 *  - crimson / violet   → status / spell foreground
 *
 * Drift guard: a `colour-audit` lint pass scans `GameEngine.ts` for
 * hex literals that don't map back here — if you add a new hex, add
 * it to this object first so the palette stays the single source of
 * truth.
 */
export const PALETTE = {
  bg: '#02010a',
  // Floor tones lifted from #1a1124/#221636 (originally 10–14 %
  // brightness — pitch-black after the room's multiply pass crushed
  // them another ~50 %). New values sit at ~17–21 % so the floor
  // texture stays readable even outside any direct light pool.
  floor: '#251843',
  floor2: '#2e1f4e',
  floorCrack: '#150b2a',
  wall: '#4d3270',
  wallTop: '#6d489c',
  wallDark: '#1f1430',
  gold: '#f4d27a',
  gold2: '#c8983f',
  gold3: '#7a5a1a',
  teal: '#6cf6e5',
  tealDeep: '#1f8a86',
  bone: '#f5efd8',
  crimson: '#e23a4a',
  violet: '#9b6cff',
  indigo: '#2a1b66',
  shadow: 'rgba(0,0,0,0.85)',
} as const;
