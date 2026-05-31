// Pixel sprites drawn from cinematic angles — NOT the top-down view of
// gameplay. These are the "actors" of the cutscenes: the Initiate seen
// in side profile and in hero close-up, plus prop art (lamps, arches,
// rings, the One) used by the cinematic shot renderers.
//
// Each sprite is a pure draw function that paints into a 2D context at
// the given top-left pixel position with an integer scale. The sprites
// themselves are described as string matrices and a colour palette,
// rendered by the existing drawSprite helper.

import { drawSprite, PixelMatrix } from './PixelArt';

// ─── Shared colour utilities ──────────────────────────────────────────

export type LightingMood = 'cosmic' | 'brazier' | 'abyss';

const LIGHTING_TARGETS: Record<LightingMood, [number, number, number]> = {
  cosmic: [244, 210, 122],
  brazier: [244, 130, 60],
  abyss:  [108, 246, 229],
};

function parseHexRgb(hex: string): [number, number, number] | null {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

function mixHexToward(hex: string, target: [number, number, number], t: number): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb[0] * (1 - t) + target[0] * t);
  const g = Math.round(rgb[1] * (1 - t) + target[1] * t);
  const b = Math.round(rgb[2] * (1 - t) + target[2] * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── Initiate, side-profile, walking ──────────────────────────────────
// 16 × 26. The hood projects forward (left), the cloak trails right.
// Two frames for a walking cycle.

const initiateProfilePalette: Record<string, string | null> = {
  '.': null,
  o: '#04020a',   // outline
  h: '#1f1142',   // hood (front side, shadowed)
  H: '#3a225f',   // hood highlight (rim, catching distant rim-light)
  f: '#0a0420',   // face shadow under hood
  e: '#6cf6e5',   // eye glow (single forward-projecting eye)
  c: '#1a0b2c',   // cloak (back / trailing)
  C: '#2a1656',   // cloak highlight
  r: '#2a1656',   // robe body
  R: '#3d2273',   // robe highlight
  g: '#f4d27a',   // gold pendant
  b: '#0a0420',   // boot
};

// True side profile, facing LEFT. The hood projects to the LEFT (front),
// the cloak trails to the RIGHT (behind). Only one eye visible.
// Width: 16, Height: 26.
//
// Legend:
//   o = outline      h = hood (front)      H = hood highlight
//   c = cloak back   C = cloak highlight   f = face shadow under hood
//   e = eye glow     g = gold pendant      b = boot   r = robe front
//   . = transparent

const initiateProfileFrameA: PixelMatrix = [
  '.....ooo........',
  '....oHhho.......',  // hood crown projects forward (left)
  '...oHhhhho......',
  '..oHhhhhhHo.....',  // hood widens for face
  '.oHhfffhhhHo....',
  '.oHhefffhhho....',  // single eye, projecting forward
  '.oHhfffhhhho....',
  '.oHhhhhhhhho....',  // jaw
  '..ohhhrrrhho....',  // shoulder (front of hood meets robe)
  '..orrrrrCCCo....',  // cloak begins trailing right
  '.orrrrrCCCCCo...',
  '.orrrrrCCCCCo...',
  '.orrgrrCCCCCo...',  // gold pendant on chest
  '.orrrrrCCCCCo...',
  '..orrrrrCCCo....',
  '..orrrrrCCCo....',
  '..orrrrrCCco....',  // cloak fades
  '..orrrrrcco.....',
  '..orrrrCCco.....',
  '..orrrcco.......',
  '..orrr..........',
  '..orr...........',  // legs start
  '..obb...........',
  '..oo............',
  '................',
  '................',
];

const initiateProfileFrameB: PixelMatrix = [
  '.....ooo........',
  '....oHhho.......',
  '...oHhhhho......',
  '..oHhhhhhHo.....',
  '.oHhfffhhhHo....',
  '.oHhefffhhho....',
  '.oHhfffhhhho....',
  '.oHhhhhhhhho....',
  '..ohhhrrrhho....',
  '..orrrrrCCCo....',
  '.orrrrrCCCCCo...',
  '.orrrrrCCCCCo...',
  '.orrgrrCCCCCo...',
  '.orrrrrCCCCCo...',
  '..orrrrrCCCo....',
  '..orrrrCCCCo....',  // slight cloak sway
  '..orrrrCCCco....',
  '..orrrrCCCco....',
  '..orrrrrCCco....',
  '..orrrrCccc.....',
  '...orrr.........',
  '....orr.........',  // back leg lifted
  '....obb.........',
  '....oo..........',
  '................',
  '................',
];

const initiateProfileFrameC: PixelMatrix = [
  '.....ooo........',
  '....oHhho.......',
  '...oHhhhho......',
  '..oHhhhhhHo.....',
  '.oHhfffhhhHo....',
  '.oHhefffhhho....',
  '.oHhfffhhhho....',
  '.oHhhhhhhhho....',
  '..ohhhrrrhho....',
  '.oorrrrrCCCo....',
  '.orrrrrCCCCCo...',
  '.orrrrrCCCCCo...',
  '.orrgrrCCCCCo...',
  '.orrrrrCCCCCo...',
  '..orrrrrCCCo....',
  '..orrrrrCCCo....',
  '..orrrrrCCco....',
  '..orrrrrcco.....',
  '...orrrrCCco....',
  '...orrrcco......',
  '...orr..........',
  '...orr..........',
  '...obb..........',
  '...oo...........',
  '................',
  '................',
];

const initiateProfileFrameD: PixelMatrix = [
  '.....ooo........',
  '....oHhho.......',
  '...oHhhhho......',
  '..oHhhhhhHo.....',
  '.oHhfffhhhHo....',
  '.oHhefffhhho....',
  '.oHhfffhhhho....',
  '.oHhhhhhhhho....',
  '..ohhhrrrhho....',
  '..orrrrrCCCo....',
  '.orrrrrCCCCCo...',
  '.orrrrrCCCCCo...',
  '.orrgrrCCCCCo...',
  '.orrrrrCCCCCo...',
  '..orrrrrCCCo....',
  '..orrrrCCCCo....',
  '..orrrrCCCCo....',
  '..orrrrrCCCco....',
  '..orrrrCCCco.....',
  '...orrrrCco......',
  '...orrrr.........',
  '....orr..........',
  '....obb..........',
  '....oo...........',
  '................',
  '................',
];

const PROFILE_FRAMES = [initiateProfileFrameA, initiateProfileFrameB, initiateProfileFrameC, initiateProfileFrameD];

export function drawInitiateProfile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
  walkPhase: number,
  facingRight = false,
  lighting: LightingMood = 'cosmic',
): void {
  const frame = PROFILE_FRAMES[Math.floor(walkPhase) % 4];
  const raw = Math.abs(Math.sin(walkPhase * Math.PI * 0.5));
  const bob = Math.floor(raw * 1.5);
  const pal = modulateProfile(lighting);
  drawSprite(ctx, frame, pal, Math.floor(x), Math.floor(y - bob * scale), scale, facingRight);
}

function modulateProfile(lighting: LightingMood): Record<string, string | null> {
  if (lighting === 'cosmic') return initiateProfilePalette;
  const target = LIGHTING_TARGETS[lighting];
  const pal = { ...initiateProfilePalette };
  if (lighting === 'brazier') {
    pal.H = mixHexToward(pal.H!, target, 0.30);
    pal.C = mixHexToward(pal.C!, target, 0.30);
    pal.R = mixHexToward(pal.R!, target, 0.30);
    pal.g = mixHexToward(pal.g!, target, 0.25);
  } else {
    pal.H = mixHexToward(pal.H!, target, 0.30);
    pal.C = mixHexToward(pal.C!, target, 0.20);
    pal.R = mixHexToward(pal.R!, target, 0.28);
    pal.g = mixHexToward(pal.g!, target, 0.30);
  }
  return pal;
}

// ─── Initiate face — hero close-up ────────────────────────────────────
// 28 × 28 viewed from slightly below. Hood overhead casts a shadow on
// the face, leaving the eyes as twin teal pinpricks. Used for the
// climactic "look up at the lens" beat.

const initiateFacePalette: Record<string, string | null> = {
  '.': null,
  o: '#04020a',
  h: '#1f1142',   // hood
  H: '#3a225f',   // hood highlight
  s: '#0e0824',   // hood deep shadow under brow
  f: '#0a0420',   // face shadow (very dark — only eyes show)
  e: '#6cf6e5',   // eye glow
  E: '#a4faf0',   // eye core (brighter)
  c: '#22113a',   // cheekbone faint
  r: '#2a1656',   // robe / cloak collar
  R: '#3d2273',   // cloak highlight
  g: '#f4d27a',   // gold pendant / trim
};

const initiateFace: PixelMatrix = [
  '............oooo............',
  '.........oooHHHHooo.........',
  '.......ooHHHhhhHHHoo........',
  '......oHHhhhhhhhhhhHo.......',
  '.....oHhhhhhhhhhhhhhho......',
  '....oHhhhhhssssshhhhhho.....',
  '...oHhhhhssfffffsshhhhho....',
  '...oHhhssffffffffssshhho....',
  '..oHhhssffffffffffssshhho...',
  '..oHhhsfffeefffeefffshho....',
  '..oHhhsffeEefffeEeeffshho...',
  '..oHhhsfffeefffeefffshho....',
  '..oHhhssfffffcfffffsshhho...',
  '..oHhhhsfffffffffffshhhho...',
  '..oHhhhhsffffffffshhhhhho...',
  '...oHhhhhssfffsshhhhhho.....',
  '....oHhhhhhssshhhhhhho......',
  '.....oHhhhhhhhhhhhho........',
  '......oHhhhhhhhhhho.........',
  '.......oHRRRRRRRho..........',
  '......orrRRRRRRRrro.........',
  '.....orrrrrgggrrrrro........',
  '.....orrrrrgrgrrrrro........',
  '......orrrrgggrrrro.........',
  '.......oorrrrrrroo..........',
  '.........oooooooo...........',
  '............................',
  '............................',
];

export function drawInitiateFace(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
  eyeGlow: number, // 0..1
  lighting: LightingMood = 'cosmic',
): void {
  const pal = { ...initiateFacePalette };
  // Modulate eye brightness
  const t = Math.max(0, Math.min(1, eyeGlow));
  const e = Math.round(108 + (164 - 108) * t);
  const g = Math.round(246 + (250 - 246) * t);
  const b = Math.round(229 + (240 - 229) * t);
  pal.e = `rgb(${e}, ${g}, ${b})`;
  pal.E = `rgba(255, 255, 255, ${0.6 + 0.4 * t})`;
  // Mood-based palette shift
  if (lighting !== 'cosmic') {
    const target = LIGHTING_TARGETS[lighting];
    if (lighting === 'brazier') {
      pal.H = mixHexToward(pal.H!, target, 0.30);
      pal.c = mixHexToward(pal.c!, target, 0.20);
      pal.R = mixHexToward(pal.R!, target, 0.20);
      pal.g = mixHexToward(pal.g!, target, 0.25);
    } else {
      pal.H = mixHexToward(pal.H!, target, 0.30);
      pal.c = mixHexToward(pal.c!, target, 0.20);
      pal.R = mixHexToward(pal.R!, target, 0.28);
      pal.g = mixHexToward(pal.g!, target, 0.30);
    }
  }
  drawSprite(ctx, initiateFace, pal, Math.floor(x), Math.floor(y), scale, false);
}

// ─── Stone arch — gate seen in elevation ──────────────────────────────
// 28 × 36 pixel matrix. Pointed (Gothic) arch viewed straight on, with
// a dark void interior, stone columns, and a gold keystone at the apex.

const STONE_ARCH_W = 28;
const STONE_ARCH_H = 36;

const stoneArchMatrix: PixelMatrix = [
  '............oGoo............',
  '.........oooGGGooo.........',
  '.......ooMMMgggMMMoo......',
  '......oMMMMMooMMMMMo......',
  '.....oMMMMovvvvMMMMo.....',
  '....oMMMMovvvvvvvMMMo....',
  '...oMMMMovvvvvvvvvMMMo...',
  '..oMMMMovvvvvvvvvvvMMMo..',
  '..oMMM movvvvvvvvvvMMMo..',
  '.oMMM  ovvvvvvvvvvvvMMMo.',
  '.oMMM  ovvvvvvvvvvvvMMMo.',
  'oMMM    ovvvvvvvvvvvvMMMo',
  'oMMM    ovvvvvvvvvvvvMMMo',
  'oMMM    ovvvvvvvvvvvvMMMo',
  'oMMM    ovvvvvvvvvvvvMMMo',
  'oMMM    ovvvvvvvvvvvvMMMo',
  '.oMMM   ovvvvvvvvvvvvMMMo.',
  '.oMMM   ovvvvvvvvvvvvMMMo.',
  '..oMMM  ovvvvvvvvvvMMMo..',
  '..oMMMM ovvvvvvvvvvMMMo..',
  '...oMMMMovvvvvvvvvMMMo...',
  '....oMMMMovvvvvvvMMMo....',
  '.....oMMMMovvvvvMMMMo.....',
  '......oMMMMooooMMMMo......',
  '.......oMMMMMMMMMMo.......',
  '........oMMMMMMMMo........',
  '.........oMMMMMMo.........',
  '..........oooooo..........',
  '.......oooooooooooo.......',
  '......osssssssssso......',
  '.....osssssssssssso.....',
  '....osss..sssss..ssso....',
  '...osss....sss....ssso...',
  '..osss.....sss.....ssso..',
  '.osss......sss......ssso.',
  '.oss.......ooo.......sso.',
];

const stoneArchPurple: Record<string, string | null> = {
  '.': null,
  o: '#04020a',   // outline
  s: '#1a0f2c',   // shadow
  S: '#2a1656',   // shadow mid
  m: '#3b265c',   // mid stone
  M: '#5b3a86',   // highlight stone
  g: '#c8983f',   // gold keystone
  G: '#f4d27a',   // gold keystone glint
  v: '#000000',   // void (arch interior)
};

const stoneArchGold: Record<string, string | null> = {
  '.': null,
  o: '#04020a',
  s: '#1a0f2c',
  S: '#3a2410',
  m: '#7a5a1a',
  M: '#c8983f',
  g: '#f4d27a',
  G: '#ffe6a3',
  v: '#000000',
};

export function drawStoneArch(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  scale: number,
  variant: 'purple' | 'gold' = 'purple',
): void {
  const pal = variant === 'gold' ? stoneArchGold : stoneArchPurple;
  drawSprite(
    ctx, stoneArchMatrix, pal,
    Math.floor(cx - (STONE_ARCH_W * scale) / 2),
    Math.floor(cy - (STONE_ARCH_H * scale) / 2),
    scale, false,
  );
}

// ─── Distant lamp on bracket (elevation view) ─────────────────────────
// Used as background distant lights — small lamps hanging at the
// horizon line, viewed from in front. The lamp body is a pixel matrix;
// the glow halo remains procedural for per-call dynamic modulation.

const distantLampMatrix: PixelMatrix = [
  '..........',
  '....ww....',
  '...wFFw...',
  '...fFFf...',
  '...ffff...',
  '...ffff...',
  '...bbbb...',
  '...bbbb...',
  '..bbbbbb..',
  '..bBBBBb..',
  '..bbbbbb..',
  '...bbb....',
  '..........',
  '..........',
];

const distantLampPalette: Record<string, string | null> = {
  '.': null,
  b: '#1a0f2c',   // bracket dark
  B: '#3b265c',   // bracket highlight
  f: '#c8983f',   // flame mid
  F: '#f4d27a',   // flame bright
  w: '#ffe6a3',   // flame core
};

export function drawDistantLamp(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  alpha: number,
  flick: number,
): void {
  if (alpha <= 0) return;
  // Dynamic glow halo (procedural — varies per call)
  const halo = ctx.createRadialGradient(x, y, 1, x, y, 14);
  halo.addColorStop(0, `rgba(255, 230, 163, ${0.7 * alpha * flick})`);
  halo.addColorStop(1, 'rgba(244, 210, 122, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();

  // Pixel lamp body with flame dimmed by alpha/flick
  const pal = { ...distantLampPalette };
  const flameAlpha = Math.min(1, alpha * (0.8 + 0.2 * flick));
  pal.w = `rgba(255, 247, 214, ${flameAlpha})`;
  pal.F = `rgba(244, 210, 122, ${flameAlpha * 0.9})`;
  pal.f = `rgba(200, 150, 50, ${flameAlpha * 0.8})`;
  drawSprite(ctx, distantLampMatrix, pal, Math.floor(x - 5), Math.floor(y - 7), 1, false);
}

// ─── Initiate, worm's-eye / heroic from below ─────────────────────────
// 22 × 30. Lit from below by a brazier — bottom of robe / boots bright,
// face deep in hood-shadow with eye glow.

const initiateHeroicPalette: Record<string, string | null> = {
  '.': null,
  o: '#04020a',
  h: '#1f1142',
  H: '#3a225f',
  i: '#5b3a86',
  f: '#0a0420',
  e: '#6cf6e5',
  E: '#a4faf0',
  c: '#1a0b2c',
  C: '#2a1656',
  r: '#3d2273',
  R: '#5b3a86',
  d: '#4b2f76',
  g: '#f4d27a',
  G: '#ffe6a3',
  b: '#1a0824',
};

const initiateHeroicFromBelow: PixelMatrix = [
  '........oooooo........',
  '......ooHHHHHHoo......',
  '.....oHHhhhhhHHo......',
  '....oHhhhhhhhhHo......',
  '...oHhhffffffhhHo.....',
  '..oHhhffffffffhho.....',
  '..oHhhffeefeffhho.....',
  '..oHhfffeefefffhho....',
  '..oHhffffffffffho.....',
  '..oHhhffffffffhho.....',
  '...oHhhhffffhhho......',
  '....ohhhhhhhhho.......',
  '.....oiiiiiiio........',
  '....odrRRRRdRro.......',
  '...oRdRRRRRRRdro......',
  '..orrRRgGGgRRrrro.....',
  '..orrRRRRRRRRrrro.....',
  '.orrRRRRRRRRRRrrro....',
  '.orRRRRRRRRRRRRRro....',
  '.orRRRRRRRRRRRRRro....',
  '..ordRRRRRRRdRrro.....',
  '..ordRRRRRRRdRrro.....',
  '...orrRRrRRrRrro......',
  '....orrr...rrro.......',
  '....orr.....rro.......',
  '....obb.....bbo.......',
  '....oob.....boo.......',
  '.....oo.....oo........',
];

export function drawInitiateHeroic(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
  eyeGlow: number,
  lighting: LightingMood = 'cosmic',
): void {
  const pal = { ...initiateHeroicPalette };
  const t = Math.max(0, Math.min(1, eyeGlow));
  pal.e = `rgb(${Math.round(108 + 56 * t)}, 246, ${Math.round(229 + 11 * t)})`;
  if (lighting !== 'cosmic') {
    const target = LIGHTING_TARGETS[lighting];
    if (lighting === 'brazier') {
      pal.H = mixHexToward(pal.H!, target, 0.35);
      pal.i = mixHexToward(pal.i!, target, 0.30);
      pal.R = mixHexToward(pal.R!, target, 0.25);
      pal.d = mixHexToward(pal.d!, target, 0.30);
      pal.g = mixHexToward(pal.g!, target, 0.30);
      pal.G = mixHexToward(pal.G!, target, 0.25);
    } else {
      pal.H = mixHexToward(pal.H!, target, 0.35);
      pal.i = mixHexToward(pal.i!, target, 0.25);
      pal.R = mixHexToward(pal.R!, target, 0.30);
      pal.d = mixHexToward(pal.d!, target, 0.25);
      pal.g = mixHexToward(pal.g!, target, 0.35);
      pal.G = mixHexToward(pal.G!, target, 0.25);
    }
  }
  drawSprite(ctx, initiateHeroicFromBelow, pal, Math.floor(x), Math.floor(y), scale, false);
}

// ─── Hands holding a dagger — close-up ───────────────────────────────

const handsDaggerPalette: Record<string, string | null> = {
  '.': null,
  o: '#04020a',
  h: '#cdb59a',
  H: '#e6cdaf',
  s: '#0a0420',
  S: '#2a1656',
  R: '#3d2273',
  g: '#3a2410',
  G: '#7a5a1a',
  c: '#cdd6dc',
  C: '#ffffff',
  r: '#e23a4a',
};

const handsDagger: PixelMatrix = [
  '......................',
  '.ssooooo......ooooss..',
  'sSSRRRRRoo..ooRRRRRSSs',
  'sSRRRhhho....oHhhhRRSs',
  'sSRhHhHHHogggcccCCCCcg',
  'sSRhhhhHHogGccccCCcCcg',
  '.SRRRhhhoogGcccccccccg',
  '.sRRRRhhoogGcccrcccccg',
  '.osSRRRRhoogcccccccccg',
  '..osssRRoocccccccccccg',
  '...oooooo.ooooooooooog',
  '......................',
  '......................',
  '......................',
];

export function drawHandsDagger(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
): void {
  drawSprite(ctx, handsDagger, handsDaggerPalette, Math.floor(x), Math.floor(y), scale, false);
}

// ─── Falling Initiate seen from above ─────────────────────────────────

const initiateFallingPalette: Record<string, string | null> = {
  '.': null,
  o: '#04020a',
  h: '#1f1142',
  H: '#3a225f',
  c: '#1a0b2c',
  C: '#2a1656',
  g: '#f4d27a',
};

// Three cape frames for flutter during the tumble. Hood (rows 0-4)
// identical in all frames; cape (rows 5-19) shifts left/centre/right.

const initiateFallingFrameA: PixelMatrix = [
  '.....oooo.....',
  '....oHHHHo....',
  '...oHhhhhHo...',
  '..oHhhhhhhHo..',
  '..ohhhhhhhho..',
  '...occccccco..',
  '..occccccccoo.',
  '.occcCCCCcccco',
  'occcCCCCCCCcco',
  'occccCCCCCCcco',
  'oCcccCCggCCcco',
  'occccCCCCCCcco',
  '.occccCCCCccc.',
  '.occcccccccco.',
  '..occcccccco..',
  '..occcccccco..',
  '...occccccc...',
  '....occcco....',
  '....occcco....',
  '.....occo.....',
  '..............',
  '..............',
];

const initiateFallingFrameB: PixelMatrix = [
  '.....oooo.....',
  '....oHHHHo....',
  '...oHhhhhHo...',
  '..oHhhhhhhHo..',
  '..ohhhhhhhho..',
  '..occccccco...',
  '.occcccccco...',
  'occcCCCCCcco..',
  'occcccCCCCcco.',
  'occcccCCCCcco.',
  'occccgCggCcco.',
  'occcccCCCCcco.',
  '.occcCCCCccco.',
  '.occcccccccco.',
  '..occcccccco..',
  '..occcccccco..',
  '...occccccc...',
  '....occcco....',
  '....occcco....',
  '.....occo.....',
  '..............',
  '..............',
];

const initiateFallingFrameC: PixelMatrix = [
  '.....oooo.....',
  '....oHHHHo....',
  '...oHhhhhHo...',
  '..oHhhhhhhHo..',
  '..ohhhhhhhho..',
  '...occccccco..',
  '...occcccccco.',
  '..occCCCCCCcco',
  '.ocCCCCCCcccc.',
  '.ocCCCCCCcccc.',
  '.ocCggCgccccoc',
  '.ocCCCCCCcccc.',
  '.occcCCCCccco.',
  '.occcccccccco.',
  '..occcccccco..',
  '..occcccccco..',
  '...occccccc...',
  '....occcco....',
  '....occcco....',
  '.....occo.....',
  '..............',
  '..............',
];

const FALLING_FRAMES = [initiateFallingFrameA, initiateFallingFrameB, initiateFallingFrameC];

function modulateFalling(lighting: LightingMood): Record<string, string | null> {
  if (lighting === 'cosmic') return initiateFallingPalette;
  const target = LIGHTING_TARGETS[lighting];
  const pal = { ...initiateFallingPalette };
  if (lighting === 'brazier') {
    pal.H = mixHexToward(pal.H!, target, 0.25);
    pal.C = mixHexToward(pal.C!, target, 0.25);
    pal.c = mixHexToward(pal.c!, target, 0.18);
    pal.g = mixHexToward(pal.g!, target, 0.22);
  } else {
    pal.H = mixHexToward(pal.H!, target, 0.28);
    pal.C = mixHexToward(pal.C!, target, 0.28);
    pal.c = mixHexToward(pal.c!, target, 0.22);
    pal.g = mixHexToward(pal.g!, target, 0.28);
  }
  return pal;
}

export function drawInitiateFalling(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
  spin: number,
  lighting: LightingMood = 'cosmic',
): void {
  ctx.save();
  ctx.translate(Math.floor(x + 7 * scale), Math.floor(y + 11 * scale));
  ctx.rotate(spin);
  const frameIndex = Math.floor(Math.abs(spin) / (Math.PI * 2 / 3)) % 3;
  const frame = FALLING_FRAMES[frameIndex];
  const pal = modulateFalling(lighting);
  drawSprite(ctx, frame, pal, Math.floor(-7 * scale), Math.floor(-11 * scale), scale, false);
  ctx.restore();
}

// ─── Ogdoad Glyph — eight-pointed star ──────────────────────────────
// Simple eight-pointed star glyph. No halo — callers add bloomPoint
// separately for the atmospheric glow.

export function drawOgdoadGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  scale: number,
  alpha: number,
  rotation = 0,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.fillStyle = `rgba(255, 247, 214, ${alpha})`;
  // Cardinal rays (NSEW)
  ctx.fillRect(-1, -16 * scale, 2, 32 * scale);
  ctx.fillRect(-16 * scale, -1, 32 * scale, 2);
  // Diagonal rays
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-1, -12 * scale, 2, 24 * scale);
  ctx.fillRect(-12 * scale, -1, 24 * scale, 2);
  ctx.restore();
}

// ─── Initiate Looking Up — silhouette from below ────────────────────
// 15 × 22 pixel matrix. Low-angle view: the Initiate's hood falls
// back slightly, face visible as a rim-lit silhouette looking upward.

const initiateLookingUp: PixelMatrix = [
  '.....oooo......',
  '....occcccoo...',
  '...oclllllcco..',
  '..ocllvvvllcco.',
  '.ocllvvvvvllco.',
  '.ocllvvvvvllco.',
  '..ocllvvvllco..',
  '...ocllllcco...',
  '....oocccoo....',
  '.....ooooo.....',
  '.....ooooo.....',
  '.....ooooo.....',
  '....oocccoo....',
  '....oclcclo....',
  '....oocgcoo....',
  '....oclcclo....',
  '....occccco....',
  '....oocccoo....',
  '....ooocooo....',
  '....ooocooo....',
  '.....ooooo.....',
  '.....ooooo.....',
];

const initiateLookingUpPalette: Record<string, string | null> = {
  '.': null,
  o: '#04020a', // outline
  c: '#1a0f2c', // cloak mid — hood draping
  l: '#5b3a86', // rim-light — distant lamp catches the edge
  v: '#7a559e', // face highlight — bridge of nose, cheekbone rim
  g: '#f4d27a', // gold pendant glint
};

export function drawInitiateLookingUp(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
  eyeGlow: number,
  lighting: LightingMood = 'cosmic',
): void {
  ctx.save();
  const pal = modulateLookingUp(lighting);
  drawSprite(ctx, initiateLookingUp, pal, Math.floor(x), Math.floor(y), scale, false);

  // Eye glow — two teal pinpricks visible under the hood
  if (eyeGlow > 0) {
    const ex = x + 7 * scale;
    const ey = y + 5 * scale;
    const glow = ctx.createRadialGradient(ex, ey, 0, ex, ey, scale * 3);
    glow.addColorStop(0, `rgba(108, 246, 229, ${0.9 * eyeGlow})`);
    glow.addColorStop(1, 'rgba(108, 246, 229, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(ex - scale * 3, ey - scale * 3, scale * 6, scale * 6);
    ctx.fillStyle = `rgba(108, 246, 229, ${eyeGlow})`;
    ctx.fillRect(ex - 1, ey - 0.5, 2, 1);
  }

  ctx.restore();
}

function modulateLookingUp(lighting: LightingMood): Record<string, string | null> {
  if (lighting === 'cosmic') return initiateLookingUpPalette;
  const target = LIGHTING_TARGETS[lighting];
  const pal = { ...initiateLookingUpPalette };
  if (lighting === 'brazier') {
    pal.l = mixHexToward(pal.l!, target, 0.30);
    pal.v = mixHexToward(pal.v!, target, 0.25);
    pal.g = mixHexToward(pal.g!, target, 0.25);
  } else {
    pal.l = mixHexToward(pal.l!, target, 0.35);
    pal.v = mixHexToward(pal.v!, target, 0.30);
    pal.g = mixHexToward(pal.g!, target, 0.25);
  }
  return pal;
}
