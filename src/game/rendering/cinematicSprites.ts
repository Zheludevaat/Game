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

// ─── Initiate, side-profile, walking ──────────────────────────────────
// 14 × 22. The hood projects forward (right), the cloak trails left.
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

export function drawInitiateProfile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
  walkPhase: number,
  facingRight = false,
): void {
  const frame = Math.floor(walkPhase) % 2 === 0 ? initiateProfileFrameA : initiateProfileFrameB;
  // Vertical bob with walking
  const bob = Math.floor(Math.abs(Math.sin(walkPhase * Math.PI)) * 1);
  drawSprite(ctx, frame, initiateProfilePalette, Math.floor(x), Math.floor(y - bob * scale), scale, facingRight);
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
  '..oHhhsffffeefefffffshhho...',
  '..oHhhsfffeEefffEefffshho...',
  '..oHhhsffffeefefffffshhho...',
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
): void {
  const pal = { ...initiateFacePalette };
  // Modulate eye brightness
  const t = Math.max(0, Math.min(1, eyeGlow));
  const e = Math.round(108 + (164 - 108) * t);
  const g = Math.round(246 + (250 - 246) * t);
  const b = Math.round(229 + (240 - 229) * t);
  pal.e = `rgb(${e}, ${g}, ${b})`;
  pal.E = `rgba(255, 255, 255, ${0.6 + 0.4 * t})`;
  drawSprite(ctx, initiateFace, pal, Math.floor(x), Math.floor(y), scale, false);
}

// ─── Stone arch — gate seen in elevation ──────────────────────────────
// Drawn as a tall arched doorway, viewed straight on, suitable for a
// "the Initiate walks through the threshold" silhouette shot.

export function drawStoneArch(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,   // centred on cx, cy
  width: number, height: number,
  colour: string = '#3b265c',
  shadow: string = '#1a0f2c',
): void {
  const halfW = width / 2;
  // Columns (left + right)
  const colW = width * 0.13;
  ctx.fillStyle = shadow;
  ctx.fillRect(cx - halfW, cy - height / 2, colW, height);
  ctx.fillRect(cx + halfW - colW, cy - height / 2, colW, height);
  ctx.fillStyle = colour;
  ctx.fillRect(cx - halfW + 2, cy - height / 2 + 2, colW - 4, height - 4);
  ctx.fillRect(cx + halfW - colW + 2, cy - height / 2 + 2, colW - 4, height - 4);
  // Base
  ctx.fillStyle = shadow;
  ctx.fillRect(cx - halfW - 4, cy + height / 2 - 8, width + 8, 10);
  // Lintel — flat block above the arch span
  ctx.fillRect(cx - halfW, cy - height / 2, width, height * 0.08);
  // Arched opening (pointed)
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  const archTop = cy - height / 2 + height * 0.18;
  const archBot = cy + height / 2 - 8;
  const innerL = cx - halfW + colW;
  const innerR = cx + halfW - colW;
  const peakY = archTop;
  const peakX = cx;
  ctx.moveTo(innerL, archBot);
  ctx.lineTo(innerL, peakY + (innerR - innerL) * 0.1);
  ctx.quadraticCurveTo(peakX, peakY - height * 0.06, innerR, peakY + (innerR - innerL) * 0.1);
  ctx.lineTo(innerR, archBot);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Keystone glint
  ctx.fillStyle = '#f4d27a';
  ctx.fillRect(cx - 2, archTop - 4, 4, 4);
}

// ─── Distant lamp on bracket (elevation view) ─────────────────────────
// Used as background distant lights — small lamps hanging at the
// horizon line, viewed from in front.

export function drawDistantLamp(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  alpha: number,
  flick: number,
): void {
  if (alpha <= 0) return;
  // Halo
  const halo = ctx.createRadialGradient(x, y, 1, x, y, 14);
  halo.addColorStop(0, `rgba(255, 230, 163, ${0.7 * alpha * flick})`);
  halo.addColorStop(1, 'rgba(244, 210, 122, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
  // Bracket
  ctx.fillStyle = `rgba(40, 22, 70, ${alpha})`;
  ctx.fillRect(x - 1, y + 2, 2, 5);
  ctx.fillRect(x - 3, y + 6, 6, 1);
  // Flame
  ctx.fillStyle = `rgba(244, 210, 122, ${0.9 * alpha * flick})`;
  ctx.beginPath();
  ctx.ellipse(x, y - 1, 2.2, 3.5 + Math.sin(flick * 8) * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 247, 214, ${alpha})`;
  ctx.fillRect(x, y - 2, 1, 1);
}
