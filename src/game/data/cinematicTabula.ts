// "Tabula Smaragdina" — the opening cinematic short, polished pass.
//
// Six shots, ~28 seconds. Every shot uses the shared cinemaHelpers
// vocabulary (parallax starfields, nebulae, vignette, color grading,
// camera shake, foreground silhouettes). The protagonist appears in
// three distinct perspectives — side-profile (walk), heroic from below
// (look up), and frontal hero close-up.

import { Shot, ShotArgs } from '../../components/CinematicShort';
import {
  drawInitiateProfile, drawInitiateFace,
  drawDistantLamp,
} from '../rendering/cinematicSprites';
import {
  clamp01, easeIn, easeOut, easeInOut, withAlpha,
  vignette, colorGrade, bloomPoint, starfield, motes,
  nebula, groundMist, brokenColumn, cinemaText, applyShake,
  StarLayer,
} from '../rendering/cinemaHelpers';

// ─── shared starfield layers ─────────────────────────────────────────

const FAR_STARS: StarLayer = { count: 120, speed: 2, parallaxY: 1, hue: '244, 210, 122', size: 1 };
const MID_STARS: StarLayer = { count: 60,  speed: 6, parallaxY: 3, hue: '255, 247, 214', size: 1.3 };
const NEAR_STARS: StarLayer = { count: 30, speed: 16, parallaxY: 8, hue: '255, 247, 214', size: 2 };

// ─── SHOT 1 — Cosmic push-in toward the One ──────────────────────────

function shotCosmos(a: ShotArgs): void {
  // Deep sky base
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);

  // Drifting nebulae (multi-coloured haze for depth)
  nebula(a, a.width * 0.25, a.height * 0.35, a.height * 0.5, '#3a225f', 0.22, 4, -2);
  nebula(a, a.width * 0.75, a.height * 0.65, a.height * 0.45, '#1f8a86', 0.14, -3, 1);

  // Parallax stars
  const ramp = easeIn(clamp01(a.t / a.duration));
  starfield(a, [
    { ...FAR_STARS, speed: 2 + ramp * 12 },
    { ...MID_STARS, speed: 6 + ramp * 30 },
    { ...NEAR_STARS, speed: 16 + ramp * 90 },
  ]);

  // The One — distant pinprick that pushes in
  const cx = a.width / 2, cy = a.height * 0.5;
  const grow = easeInOut(clamp01(a.t / a.duration));
  const r = 2 + grow * 130;

  bloomPoint(a, cx, cy, r * 3.4, '#ffe6a3', 0.6 + 0.3 * grow);

  const halo = a.ctx.createRadialGradient(cx, cy, 1, cx, cy, r * 2.6);
  halo.addColorStop(0, `rgba(255, 255, 255, ${0.95 + 0.05 * grow})`);
  halo.addColorStop(0.4, `rgba(255, 247, 214, ${0.55 + 0.35 * grow})`);
  halo.addColorStop(1, 'rgba(244, 210, 122, 0)');
  a.ctx.fillStyle = halo;
  a.ctx.fillRect(cx - r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2);

  // Lens-streak cross — grows with the star
  a.ctx.fillStyle = `rgba(255, 247, 214, ${0.6 + 0.4 * grow})`;
  a.ctx.fillRect(cx - r * 2.5, cy - 0.5, r * 5, 1);
  a.ctx.fillRect(cx - 0.5, cy - r * 2.5, 1, r * 5);

  // Diagonal lens flare hairs (smaller)
  a.ctx.save();
  a.ctx.translate(cx, cy);
  a.ctx.rotate(Math.PI / 4);
  a.ctx.fillStyle = `rgba(255, 247, 214, ${0.3 * grow})`;
  a.ctx.fillRect(-r * 1.4, -0.5, r * 2.8, 1);
  a.ctx.fillRect(-0.5, -r * 1.4, 1, r * 2.8);
  a.ctx.restore();

  // Hot core
  a.ctx.fillStyle = '#ffffff';
  a.ctx.beginPath();
  a.ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
  a.ctx.fill();

  colorGrade(a, '#3a225f', 0.08);
  vignette(a, 0.45);
}

// ─── SHOT 2 — The fracture: pre-tremor, flash, settle ───────────────

function shotFracture(a: ShotArgs): void {
  const p = clamp01(a.t / a.duration);
  const buildup = easeIn(Math.min(1, p * 1.6));
  const flash = Math.max(0, 1 - Math.abs(p - 0.40) * 7);
  const settled = clamp01((p - 0.55) * 2);

  // Pre-flash camera tremble
  a.ctx.save();
  if (buildup > 0.4 && flash < 0.5) {
    applyShake(a, { magnitude: 2 + buildup * 3 });
  }

  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);

  // Star storm — dense fast-drifting field, intensifies during buildup
  starfield(a, [
    { ...FAR_STARS, speed: 4 },
    { ...MID_STARS, speed: 20 + buildup * 40 },
    { count: 50, speed: 50 + buildup * 100, parallaxY: 6, hue: '255, 255, 255', size: 1.5 },
  ]);

  const cx = a.width / 2, cy = a.height * 0.5;
  const r = 90 + buildup * 60;

  bloomPoint(a, cx, cy, r * 3, '#ffffff', 0.7 + 0.3 * flash);

  const halo = a.ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 3);
  halo.addColorStop(0, `rgba(255, 255, 255, ${0.95 * (buildup + flash)})`);
  halo.addColorStop(0.3, `rgba(255, 247, 214, ${0.55 + 0.4 * flash})`);
  halo.addColorStop(1, 'rgba(244, 210, 122, 0)');
  a.ctx.fillStyle = halo;
  a.ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);

  // Eight expanding rays — extra long during flash
  const rayLen = 90 + flash * 280 + settled * 80;
  a.ctx.save();
  a.ctx.translate(cx, cy);
  for (let i = 0; i < 8; i++) {
    a.ctx.rotate(Math.PI / 4);
    a.ctx.fillStyle = `rgba(255, 247, 214, ${0.55 + 0.45 * flash})`;
    a.ctx.fillRect(-1.2, -rayLen, 2.4, rayLen);
    // Thin echo behind
    a.ctx.fillStyle = `rgba(255, 247, 214, ${0.25 + 0.2 * flash})`;
    a.ctx.fillRect(-3, -rayLen * 0.85, 6, rayLen * 0.85);
  }
  a.ctx.restore();

  // Hot core
  a.ctx.fillStyle = '#ffffff';
  a.ctx.beginPath();
  a.ctx.arc(cx, cy, 12 + settled * 4 + flash * 12, 0, Math.PI * 2);
  a.ctx.fill();

  a.ctx.restore(); // unshake

  // Full-screen flash at peak
  if (flash > 0) {
    a.ctx.fillStyle = `rgba(255, 255, 255, ${0.65 * flash})`;
    a.ctx.fillRect(0, 0, a.width, a.height);
  }

  vignette(a, 0.4);
}

// ─── SHOT 3 — Seven rings draw outward; lamps ignite ────────────────

export const SPHERE_COLOURS = [
  { ring: '#cdd6dc', lamp: '#ffe6a3' },
  { ring: '#6cf6e5', lamp: '#a4faf0' },
  { ring: '#ff9bc1', lamp: '#ffd0e3' },
  { ring: '#f4d27a', lamp: '#fff7d6' },
  { ring: '#e23a4a', lamp: '#ff9978' },
  { ring: '#c8983f', lamp: '#f4d27a' },
  { ring: '#5b3a86', lamp: '#9b6cff' },
];

function shotRings(a: ShotArgs): void {
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);

  // Deep purple-violet nebula at the cosmic centre
  nebula(a, a.width / 2, a.height * 0.5, a.height * 0.6, '#3a1d70', 0.22);

  starfield(a, [FAR_STARS, MID_STARS]);

  // Floating motes between rings — give the cosmos a sense of breath
  motes(a, 32, '155, 108, 255', 7);

  const cx = a.width / 2, cy = a.height * 0.5;
  const corePulse = 0.7 + 0.3 * Math.sin(a.total * 4);
  const dim = clamp01(1 - a.t / a.duration);
  const haloR = 70 + (1 - dim) * 30;

  // Centre One — dims as rings form
  bloomPoint(a, cx, cy, haloR, '#ffe6a3', 0.6 * dim);
  const coreHalo = a.ctx.createRadialGradient(cx, cy, 2, cx, cy, haloR);
  coreHalo.addColorStop(0, `rgba(255, 247, 214, ${0.75 * dim * corePulse})`);
  coreHalo.addColorStop(1, 'rgba(244, 210, 122, 0)');
  a.ctx.fillStyle = coreHalo;
  a.ctx.fillRect(cx - haloR, cy - haloR, haloR * 2, haloR * 2);
  a.ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * dim})`;
  a.ctx.beginPath();
  a.ctx.arc(cx, cy, 5 * dim, 0, Math.PI * 2);
  a.ctx.fill();

  const baseR = Math.min(a.width, a.height) * 0.06;
  const ringGap = Math.min(a.width, a.height) * 0.05;
  const perRingTime = a.duration / 8.5;

  for (let i = 0; i < 7; i++) {
    const start = perRingTime * i;
    const ringT = clamp01((a.t - start) / perRingTime);
    if (ringT <= 0) continue;
    const r = baseR + ringGap * (i + 1);
    const col = SPHERE_COLOURS[i];
    const sweep = Math.PI * 2 * easeOut(ringT);
    a.ctx.save();
    a.ctx.translate(cx, cy);
    a.ctx.rotate(a.total * (0.03 + i * 0.008));
    a.ctx.strokeStyle = withAlpha(col.ring, 0.7 + 0.3 * ringT);
    a.ctx.lineWidth = 1.8;
    a.ctx.beginPath();
    a.ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + sweep);
    a.ctx.stroke();
    a.ctx.restore();
    // Lamp ignites at top of each ring
    if (ringT > 0.8) {
      const lampAlpha = clamp01((ringT - 0.8) / 0.2);
      const flick = 0.7 + Math.sin(a.total * 5 + i) * 0.25;
      const lx = cx, ly = cy - r;
      bloomPoint(a, lx, ly, 28, col.lamp, 0.55 * lampAlpha * flick);
      a.ctx.fillStyle = withAlpha(col.lamp, lampAlpha);
      a.ctx.fillRect(lx - 1.5, ly - 1.5, 3, 3);
    }
  }

  colorGrade(a, '#1f1142', 0.10);
  vignette(a, 0.5);
}

// ─── SHOT 4 — The Initiate walks; lamps go out behind ──────────────

function shotWalk(a: ShotArgs): void {
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);

  // Sky gradient
  const skyG = a.ctx.createLinearGradient(0, 0, 0, a.height * 0.75);
  skyG.addColorStop(0, 'rgba(31, 17, 66, 0.85)');
  skyG.addColorStop(1, 'rgba(2, 1, 10, 0)');
  a.ctx.fillStyle = skyG;
  a.ctx.fillRect(0, 0, a.width, a.height * 0.75);

  // Distant nebula on the horizon
  nebula(a, a.width * 0.5, a.height * 0.55, a.height * 0.4, '#3a225f', 0.12, 2, 0);

  starfield(a, [FAR_STARS, MID_STARS]);

  const horizonY = a.height * 0.72;

  // Floor — receding, with a brighter band at the horizon
  a.ctx.fillStyle = '#0a0420';
  a.ctx.fillRect(0, horizonY, a.width, a.height - horizonY);
  // Floor grout-line vanishing point — adds depth
  const vanish = a.width / 2;
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    const y = horizonY + (a.height - horizonY) * t * t;
    a.ctx.fillStyle = `rgba(60, 38, 92, ${0.4 - t * 0.35})`;
    a.ctx.fillRect(0, y, a.width, 1);
  }
  // Vanishing diagonals
  a.ctx.strokeStyle = 'rgba(60, 38, 92, 0.15)';
  a.ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    a.ctx.beginPath();
    a.ctx.moveTo(vanish + i * (a.width / 7), horizonY);
    a.ctx.lineTo(vanish + i * a.width, a.height);
    a.ctx.stroke();
  }
  // Horizon highlight
  a.ctx.fillStyle = 'rgba(91, 58, 134, 0.7)';
  a.ctx.fillRect(0, horizonY - 1, a.width, 2);

  // Ground mist near the horizon
  groundMist(a, horizonY, 100);

  // Distant lamps along the horizon — extinguish one by one as the Initiate walks
  const lampCount = 7;
  const lampSpan = a.width * 0.75;
  const lampStartX = (a.width - lampSpan) / 2;
  for (let i = 0; i < lampCount; i++) {
    const x = lampStartX + (lampSpan / (lampCount - 1)) * i;
    const y = horizonY - 28;
    const extT = 0.6 + i * 0.5;
    const lit = clamp01(1 - (a.t - extT) / 0.55);
    const flick = 0.8 + Math.sin(a.total * 3 + i) * 0.2;
    if (lit > 0) bloomPoint(a, x, y - 2, 24, '#f4d27a', lit * flick * 0.6);
    drawDistantLamp(a.ctx, x, y, lit, flick);
  }

  // Foreground left silhouette — broken column. Parallax: doesn't move with the
  // walk, but is slightly off-screen.
  brokenColumn(a, -10, a.height * 0.78, a.height * 0.5, 0.65);
  // Foreground right silhouette
  brokenColumn(a, a.width + 8, a.height * 0.82, a.height * 0.46, 0.7);

  // The Initiate — walks right to left across the foreground
  const p = clamp01(a.t / a.duration);
  const px = a.width * (0.85 - 0.7 * p);
  const py = a.height * 0.82;
  const scale = Math.min(9, Math.max(6, a.height / 75));
  const phase = a.t * 4.5;

  // Ground shadow under feet
  a.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  a.ctx.fillRect(px - 7 * scale, py + 2, 14 * scale, 4);

  drawInitiateProfile(a.ctx, px - 8 * scale, py - 24 * scale, scale, phase, false);

  // Faint cloak trail — small particles behind the Initiate
  for (let i = 0; i < 5; i++) {
    const fade = 1 - i / 5;
    const tx = px + i * scale * 1.5;
    const ty = py - 8 * scale + Math.sin(phase + i) * 1;
    a.ctx.fillStyle = `rgba(40, 22, 70, ${0.35 * fade})`;
    a.ctx.fillRect(tx, ty, 3, 3);
  }

  colorGrade(a, '#1f1142', 0.12);
  vignette(a, 0.6);
}

// ─── SHOT 5 — Hero close-up; eyes glow brighter ─────────────────────

function shotHero(a: ShotArgs): void {
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);

  // Faint starfield far in the background
  starfield(a, [FAR_STARS], 11);
  motes(a, 16, '108, 246, 229', 9);

  // Rim light from off-axis (upper right) — the only light source on the face
  const lx = a.width * 0.72, ly = a.height * 0.18;
  bloomPoint(a, lx, ly, a.height * 0.7, '#f4d27a', 0.7);
  const rim = a.ctx.createRadialGradient(lx, ly, 6, lx, ly, a.height * 0.9);
  rim.addColorStop(0, 'rgba(244, 210, 122, 0.55)');
  rim.addColorStop(1, 'rgba(244, 210, 122, 0)');
  a.ctx.fillStyle = rim;
  a.ctx.fillRect(0, 0, a.width, a.height);

  // The face — slow push-in
  const p = clamp01(a.t / a.duration);
  const baseScale = Math.min(11, Math.max(6, a.height / 65));
  const sX = baseScale + p * 1.1;
  const cx = a.width / 2;
  const cy = a.height * 0.62;
  drawInitiateFace(a.ctx, cx - 14 * sX, cy - 14 * sX, sX, 0.35 + p * 0.65);

  // The distant lamp (background, rim-light source) becomes visible
  const lampAlpha = easeOut(clamp01(p * 1.4));
  drawDistantLamp(a.ctx, lx, ly + 20, lampAlpha, 0.85 + Math.sin(a.total * 4) * 0.15);

  colorGrade(a, '#2a1656', 0.15);
  vignette(a, 0.65, 0.2);
}

// ─── SHOT 6 — Title reveal; pull back to find the Initiate ──────────

function shotTitle(a: ShotArgs): void {
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);

  // Backdrop: the seven lamps hang far in the cosmos overhead, dimly
  nebula(a, a.width / 2, a.height * 0.45, a.height * 0.55, '#3a225f', 0.20);
  starfield(a, [FAR_STARS, MID_STARS], 5);

  const p = clamp01(a.t / a.duration);
  const reveal = easeOut(p);
  const titleY = a.height * 0.32 - (1 - reveal) * 30;
  const titleAlpha = clamp01(p * 2.4);

  // Seven lamps above the title, gently breathing
  const cx = a.width / 2, cy = a.height * 0.16;
  const spacing = Math.min(70, Math.max(42, a.width / 13));
  for (let i = 0; i < 7; i++) {
    const x = cx + (i - 3) * spacing;
    const flick = 0.6 + Math.sin(a.total * 2.4 + i * 0.7) * 0.3;
    const alpha = clamp01(p * 1.5 - i * 0.05) * 0.85;
    if (alpha <= 0) continue;
    bloomPoint(a, x, cy, 22, '#ffe6a3', alpha * flick * 0.6);
    a.ctx.fillStyle = `rgba(255, 230, 163, ${alpha * flick})`;
    a.ctx.beginPath();
    a.ctx.ellipse(x, cy, 3.4, 5.2 + Math.sin(a.total * 5 + i) * 0.8, 0, 0, Math.PI * 2);
    a.ctx.fill();
  }

  // Title — gold serif, with an underline gilt bar
  cinemaText(a, 'ABYSS OF THE', cx, titleY, 34, titleAlpha);
  cinemaText(a, 'SEVEN LAMPS', cx, titleY + 40, 34, titleAlpha);
  // Gilt underline
  a.ctx.fillStyle = `rgba(244, 210, 122, ${titleAlpha * 0.85})`;
  const barW = Math.min(360, a.width * 0.55);
  a.ctx.fillRect(cx - barW / 2, titleY + 64, barW, 2);
  // Subtitle below
  a.ctx.save();
  a.ctx.font = 'italic 14px "Iowan Old Style","Georgia",serif';
  a.ctx.textAlign = 'center';
  a.ctx.fillStyle = `rgba(108, 246, 229, ${titleAlpha * 0.8})`;
  a.ctx.fillText('A SOLITARY DESCENT', cx, titleY + 84);
  a.ctx.restore();

  // Below, far at the bottom edge, the Initiate in profile — small, alone,
  // facing into the title's promise
  const groundY = a.height * 0.88;
  const initiateScale = Math.min(5, Math.max(3, a.height / 130));
  const ix = cx - 8 * initiateScale;
  const iy = groundY - 24 * initiateScale;
  // Subtle bob
  const bob = Math.sin(a.total * 1.6) * 1;
  drawInitiateProfile(a.ctx, ix, iy + bob, initiateScale, 0.4, false);
  // Shadow puddle under feet
  a.ctx.fillStyle = 'rgba(0,0,0,0.45)';
  a.ctx.fillRect(ix + 6 * initiateScale, groundY + 1, 12 * initiateScale, 3);

  vignette(a, 0.55);
}

// ─── THE FILM ─────────────────────────────────────────────────────────

export const TABULA_CINEMATIC: Shot[] = [
  {
    duration: 4.5,
    render: shotCosmos,
    subtitle: 'It is true, without lies, certain and most true.',
    source: 'Tabula Smaragdina',
  },
  {
    duration: 3.8,
    render: shotFracture,
    subtitle: 'That which is below is like that which is above.',
    source: 'Tabula Smaragdina · Newton',
  },
  {
    duration: 5.4,
    render: shotRings,
    subtitle: 'Seven lamps. Seven veils. Seven forgettings.',
  },
  {
    duration: 5.6,
    render: shotWalk,
    subtitle: 'The lamps have gone out.',
  },
  {
    duration: 4.6,
    render: shotHero,
    subtitle: 'Take up thy lamp, Initiate.',
  },
  {
    duration: 5.6,
    render: shotTitle,
    holdSubtitle: true,
  },
];
