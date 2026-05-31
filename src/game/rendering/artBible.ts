// ART_BIBLE — canonical design tokens for all cinematic rendering.
// Every film imports from here instead of duplicating colour strings
// and starfield presets.

import { StarLayer } from './cinemaHelpers';

// ─── Palette ────────────────────────────────────────────────────────

export const CINEMA_PALETTE = {
  deepSky: '#02010a',
  voidBlack: '#000000',
  gold: '#f4d27a',
  goldLight: '#ffe6a3',
  goldWhite: '#fff7d6',
  goldDark: '#c8983f',
  goldDeep: '#7a5a1a',
  teal: '#6cf6e5',
  tealDeep: '#1f8a86',
  violet: '#9b6cff',
  indigo: '#3a225f',
  indigoDark: '#1f1142',
  indigoDeep: '#0a0420',
  crimson: '#e23a4a',
  bronze: '#c8983f',
  purpleDark: '#2a1656',
  purpleMid: '#3d2273',
  purpleDim: '#1a0f2c',
  purpleAccent: '#5b3a86',
  pink: '#ff9bc1',
  silver: '#cdd6dc',
  charcoal: '#1a1124',
  charcoal2: '#221636',
  bone: '#f5efd8',
  white: '#ffffff',
} as const;

// ─── Sphere ring/lamp colours ───────────────────────────────────────
// Canonical location. Previously duplicated between cinematicTabula
// and cinematicEnding.

export const SPHERE_COLOURS = [
  { ring: '#cdd6dc', lamp: '#ffe6a3' },
  { ring: '#6cf6e5', lamp: '#a4faf0' },
  { ring: '#ff9bc1', lamp: '#ffd0e3' },
  { ring: '#f4d27a', lamp: '#fff7d6' },
  { ring: '#e23a4a', lamp: '#ff9978' },
  { ring: '#c8983f', lamp: '#f4d27a' },
  { ring: '#5b3a86', lamp: '#9b6cff' },
];

// ─── Starfield presets ──────────────────────────────────────────────
// Base presets. Each film spreads overrides for per-film tuning
// (e.g. { ...STAR_PRESETS.far, speed: 2 + ramp * 12 }).

export const STAR_PRESETS = {
  far: { count: 120, speed: 2, parallaxY: 1, hue: '244, 210, 122', size: 1 } as StarLayer,
  mid: { count: 60, speed: 6, parallaxY: 3, hue: '255, 247, 214', size: 1.3 } as StarLayer,
  near: { count: 30, speed: 16, parallaxY: 8, hue: '255, 247, 214', size: 2 } as StarLayer,
} as const;

// ─── Timing ─────────────────────────────────────────────────────────

export const TIMING = {
  crossFadeIn: 0.35,
  crossFadeOut: 0.4,
  subtitleFadeMs: 600,
  defaultTransitionMs: 400,
} as const;

// ─── Typography ─────────────────────────────────────────────────────

export const CINEMA_FONT = '"Iowan Old Style","Georgia",serif';
export const CINEMA_FONT_ITALIC = 'italic 14px "Iowan Old Style","Georgia",serif';
