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
  runSnapshot: 'sl.runSnapshot',
} as const;

export const PALETTE = {
  bg: '#02010a',
  floor: '#1a1124',
  floor2: '#221636',
  floorCrack: '#0e0820',
  wall: '#3b265c',
  wallTop: '#5b3a86',
  wallDark: '#1a0f2c',
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
