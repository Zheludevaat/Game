// "Tabula Smaragdina" — the opening cinematic short.
//
// Five shots, each with its own perspective. The intent is for it to
// feel like a 25-second silent-film opening: cosmic awe → the descent
// → the lone protagonist → the title. Subtitles in italic Iowan serif
// fade in at the bottom, like a foreign film.

import { Shot, ShotArgs } from '../../components/CinematicShort';
import {
  drawInitiateProfile, drawInitiateFace,
  drawStoneArch, drawDistantLamp,
} from '../rendering/cinematicSprites';

// ─── shared helpers ───────────────────────────────────────────────────

function starfield(a: ShotArgs, count: number, depth: number, speed: number, hue = '244, 210, 122'): void {
  // Procedural parallax starfield; the same seeded positions every shot
  // so the cosmos feels continuous.
  for (let i = 0; i < count; i++) {
    const seed = i * 9301 + depth * 49297;
    const sx = (seed * 9301 + 49297) % 233280 / 233280;
    const sy = (seed * 17 + 13) / 233 % 1;
    const z = 0.3 + ((seed * 233) % 100) / 100 * 0.7;
    const x = ((sx + a.total * speed * 0.0008) % 1) * a.width;
    const y = ((sy + a.total * speed * 0.0005) % 1) * a.height;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(a.total * 1.4 + i));
    a.ctx.fillStyle = `rgba(${hue}, ${0.35 * tw * z})`;
    a.ctx.fillRect(x, y, 1.4 * z, 1.4 * z);
  }
}

function letterboxSky(a: ShotArgs, accent = '#1f1142'): void {
  // Deep abyss gradient with a faint accent radial pulse high.
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);
  const g = a.ctx.createRadialGradient(a.width / 2, a.height * 0.4, 20, a.width / 2, a.height * 0.4, a.height);
  g.addColorStop(0, withAlphaHex(accent, 0.45));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  a.ctx.fillStyle = g;
  a.ctx.fillRect(0, 0, a.width, a.height);
}

function withAlphaHex(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3); }
function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

// ─── SHOT 1 — Cosmic zoom-in toward the One ───────────────────────────
// We start in deep space; the camera slowly zooms toward a distant
// pinprick of light that grows into a brilliant star. Parallax stars
// drift past faster than the far ones.

function shotCosmos(a: ShotArgs): void {
  letterboxSky(a, '#1f1142');
  // Two parallax layers so motion reads as a zoom
  starfield(a, 110, 1, 3 + a.t * 12);   // far stars: slow
  starfield(a, 60,  2, 14 + a.t * 30);  // near stars: faster
  // Star grows from a point at centre over the shot
  const cx = a.width / 2, cy = a.height * 0.5;
  const grow = easeInOut(clamp01(a.t / a.duration));
  const r = 2 + grow * 110;
  const halo = a.ctx.createRadialGradient(cx, cy, 1, cx, cy, r * 2.6);
  halo.addColorStop(0, `rgba(255, 247, 214, ${0.85 + 0.15 * grow})`);
  halo.addColorStop(0.5, `rgba(244, 210, 122, ${0.55 * (0.4 + 0.6 * grow)})`);
  halo.addColorStop(1, 'rgba(244, 210, 122, 0)');
  a.ctx.fillStyle = halo;
  a.ctx.fillRect(cx - r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2);
  // Core
  a.ctx.fillStyle = '#ffffff';
  a.ctx.beginPath();
  a.ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
  a.ctx.fill();
  // Lens streaks (cardinals)
  a.ctx.fillStyle = `rgba(255, 247, 214, ${0.6 + 0.4 * grow})`;
  a.ctx.fillRect(cx - r * 2, cy - 0.5, r * 4, 1);
  a.ctx.fillRect(cx - 0.5, cy - r * 2, 1, r * 4);
}

// ─── SHOT 2 — The One fractures, rays burst outward ──────────────────
// Centre brightens to white, then rays radiate out. A flash, then the
// rays settle into a pulsing star.

function shotFracture(a: ShotArgs): void {
  letterboxSky(a, '#3a225f');
  starfield(a, 80, 1, 8);

  const cx = a.width / 2, cy = a.height * 0.5;
  const p = clamp01(a.t / a.duration);
  // Pre-flash buildup
  const buildup = easeInOut(Math.min(1, p * 1.8));
  // Flash peak around 35%
  const flash = Math.max(0, 1 - Math.abs(p - 0.35) * 7);
  // Post-fracture: rays still visible but settled
  const settled = clamp01((p - 0.5) * 2);

  // Bright halo
  const r = 90 + buildup * 80;
  const halo = a.ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 3);
  halo.addColorStop(0, `rgba(255, 255, 255, ${0.9 * (buildup + flash)})`);
  halo.addColorStop(0.3, `rgba(255, 247, 214, ${0.55 + 0.4 * flash})`);
  halo.addColorStop(1, 'rgba(244, 210, 122, 0)');
  a.ctx.fillStyle = halo;
  a.ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);

  // Eight rays radiating — extra long during flash, settle after
  const rayLen = 80 + flash * 220 + settled * 60;
  a.ctx.save();
  a.ctx.translate(cx, cy);
  for (let i = 0; i < 8; i++) {
    a.ctx.rotate(Math.PI / 4);
    a.ctx.fillStyle = `rgba(255, 247, 214, ${0.55 + 0.45 * flash})`;
    a.ctx.fillRect(-1, -rayLen, 2, rayLen);
  }
  a.ctx.restore();

  // Full-screen flash overlay on peak
  if (flash > 0) {
    a.ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * flash})`;
    a.ctx.fillRect(0, 0, a.width, a.height);
  }

  // Centre core
  a.ctx.fillStyle = '#ffffff';
  a.ctx.beginPath();
  a.ctx.arc(cx, cy, 12 + settled * 4 + flash * 8, 0, Math.PI * 2);
  a.ctx.fill();
}

// ─── SHOT 3 — Seven rings form; the lamps appear at their perimeters ─
// We "pull back" by drawing concentric rings from inside outward, each
// in a planetary colour. A lamp ignites at the top of each ring as it
// completes. By the end all seven are visible and slowly rotating.

const SPHERE_COLOURS: { ring: string; lamp: string }[] = [
  { ring: '#cdd6dc', lamp: '#ffe6a3' }, // Moon
  { ring: '#6cf6e5', lamp: '#a4faf0' }, // Mercury
  { ring: '#ff9bc1', lamp: '#ffd0e3' }, // Venus
  { ring: '#f4d27a', lamp: '#fff7d6' }, // Sun
  { ring: '#e23a4a', lamp: '#ff9978' }, // Mars
  { ring: '#c8983f', lamp: '#f4d27a' }, // Jupiter
  { ring: '#5b3a86', lamp: '#9b6cff' }, // Saturn
];

function shotRings(a: ShotArgs): void {
  letterboxSky(a, '#1f1142');
  starfield(a, 100, 1, 5);

  const cx = a.width / 2, cy = a.height * 0.5;
  // Centre pulse — the One, dimming as rings draw
  const corePulse = 0.7 + 0.3 * Math.sin(a.total * 4);
  const dim = clamp01(1 - a.t / a.duration);
  const haloR = 60 + (1 - dim) * 30;
  const coreHalo = a.ctx.createRadialGradient(cx, cy, 2, cx, cy, haloR);
  coreHalo.addColorStop(0, `rgba(255, 247, 214, ${0.7 * dim * corePulse})`);
  coreHalo.addColorStop(1, 'rgba(244, 210, 122, 0)');
  a.ctx.fillStyle = coreHalo;
  a.ctx.fillRect(cx - haloR, cy - haloR, haloR * 2, haloR * 2);
  a.ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * dim})`;
  a.ctx.beginPath();
  a.ctx.arc(cx, cy, 5 * dim, 0, Math.PI * 2);
  a.ctx.fill();

  const baseR = Math.min(a.width, a.height) * 0.06;
  const ringGap = Math.min(a.width, a.height) * 0.055;
  const perRingTime = a.duration / 9; // 7 rings + a little settle

  for (let i = 0; i < 7; i++) {
    const start = perRingTime * i;
    const ringT = clamp01((a.t - start) / perRingTime);
    if (ringT <= 0) continue;
    const r = baseR + ringGap * (i + 1);
    const col = SPHERE_COLOURS[i];
    // Stroke a partial arc from -π/2 sweeping clockwise around to -π/2.
    const sweep = Math.PI * 2 * easeOut(ringT);
    a.ctx.save();
    a.ctx.translate(cx, cy);
    a.ctx.rotate(a.total * (0.03 + i * 0.008));
    a.ctx.strokeStyle = withAlphaHex(col.ring, 0.6 + 0.4 * ringT);
    a.ctx.lineWidth = 1.5;
    a.ctx.beginPath();
    a.ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + sweep);
    a.ctx.stroke();
    a.ctx.restore();
    // Lamp at the top of the ring as it nears completion
    if (ringT > 0.85) {
      const lampAlpha = clamp01((ringT - 0.85) / 0.15);
      const flick = 0.7 + Math.sin(a.total * 5 + i) * 0.25;
      const lx = cx, ly = cy - r;
      const halo = a.ctx.createRadialGradient(lx, ly, 1, lx, ly, 20);
      halo.addColorStop(0, withAlphaHex(col.lamp, 0.7 * lampAlpha * flick));
      halo.addColorStop(1, withAlphaHex(col.lamp, 0));
      a.ctx.fillStyle = halo;
      a.ctx.beginPath();
      a.ctx.arc(lx, ly, 20, 0, Math.PI * 2);
      a.ctx.fill();
      a.ctx.fillStyle = withAlphaHex(col.lamp, lampAlpha);
      a.ctx.fillRect(lx - 1.5, ly - 1.5, 3, 3);
    }
  }
}

// ─── SHOT 4 — Initiate in profile walks left; the lamps fade behind ─
// The big "character" beat. We see the Initiate from the side, walking,
// silhouetted against the seven lamps far in the distance. As they
// walk, the lamps go out one by one.

function shotWalk(a: ShotArgs): void {
  // Ground / sky split — top half is the cosmos, bottom is the abyss floor
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);
  const skyG = a.ctx.createLinearGradient(0, 0, 0, a.height * 0.7);
  skyG.addColorStop(0, 'rgba(31, 17, 66, 0.85)');
  skyG.addColorStop(1, 'rgba(2, 1, 10, 0)');
  a.ctx.fillStyle = skyG;
  a.ctx.fillRect(0, 0, a.width, a.height * 0.7);
  starfield(a, 60, 1, 1.5);

  const horizonY = a.height * 0.7;
  // Distant ground — flat horizon
  a.ctx.fillStyle = '#0a0420';
  a.ctx.fillRect(0, horizonY, a.width, a.height - horizonY);
  // Floor specular line at the horizon
  a.ctx.fillStyle = 'rgba(60, 38, 92, 0.7)';
  a.ctx.fillRect(0, horizonY - 1, a.width, 1);

  // Seven distant lamps at the horizon — go out one by one over the shot
  const lampCount = 7;
  const lampSpan = a.width * 0.7;
  const lampStartX = (a.width - lampSpan) / 2;
  for (let i = 0; i < lampCount; i++) {
    const x = lampStartX + (lampSpan / (lampCount - 1)) * i;
    const y = horizonY - 22;
    // Light goes out — first to extinguish is index 0 (leftmost) at t=0.5s
    const extT = 0.5 + i * 0.45;
    const lit = clamp01(1 - (a.t - extT) / 0.45);
    const flick = 0.8 + Math.sin(a.total * 3 + i) * 0.2;
    drawDistantLamp(a.ctx, x, y, lit, flick);
  }

  // The Initiate walks from right to left across the foreground —
  // close to the camera so they're a real presence in the frame.
  const p = clamp01(a.t / a.duration);
  const px = a.width * (0.85 - 0.7 * p);
  const py = a.height * 0.82;
  // Big — the protagonist owns the foreground
  const scale = Math.min(8, Math.max(5, a.height / 90));
  const phase = a.t * 4.5; // walk cycle frequency

  // Ground shadow under feet
  a.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  a.ctx.fillRect(px - 6 * scale, py + 1, 12 * scale, 3);

  drawInitiateProfile(a.ctx, px - 8 * scale, py - 24 * scale, scale, phase, false);

  // Vignette dark edges
  const vig = a.ctx.createRadialGradient(a.width / 2, a.height / 2, a.width * 0.2, a.width / 2, a.height / 2, a.width * 0.7);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  a.ctx.fillStyle = vig;
  a.ctx.fillRect(0, 0, a.width, a.height);
}

// ─── SHOT 5 — Hero close-up; title appears ───────────────────────────
// Cut to the Initiate's hooded face from below. The eyes are the only
// light. Title rises into view above.

function shotHero(a: ShotArgs): void {
  // Backdrop — dark with a single rear lamp glow off-axis behind the head
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);
  starfield(a, 40, 1, 1);
  const lx = a.width * 0.65, ly = a.height * 0.3;
  const rim = a.ctx.createRadialGradient(lx, ly, 4, lx, ly, 220);
  rim.addColorStop(0, 'rgba(244, 210, 122, 0.5)');
  rim.addColorStop(1, 'rgba(244, 210, 122, 0)');
  a.ctx.fillStyle = rim;
  a.ctx.fillRect(lx - 220, ly - 220, 440, 440);

  // The face — push in via scale ramp over the shot
  const p = clamp01(a.t / a.duration);
  const scale = Math.min(10, Math.max(5, a.height / 70));
  // Slight push-in animation
  const sX = scale + p * 0.6;
  const cx = a.width / 2;
  const cy = a.height * 0.62;
  // Eyes glow brighter with time
  drawInitiateFace(a.ctx, cx - 14 * sX, cy - 14 * sX, sX, 0.4 + p * 0.6);

  // Distant lamp behind — rises into view, off-axis
  const lampAlpha = easeOut(clamp01(p * 1.5));
  drawDistantLamp(a.ctx, lx, ly + 20, lampAlpha, 0.85 + Math.sin(a.total * 4) * 0.15);

  // Title — appears mid-shot, scrolls up gently into final position
  if (p > 0.25) {
    const titleP = clamp01((p - 0.25) / 0.55);
    const ta = easeOut(titleP);
    const titleY = a.height * 0.32 + (1 - ta) * 18;
    a.ctx.save();
    a.ctx.globalAlpha = ta;
    a.ctx.textAlign = 'center';
    a.ctx.textBaseline = 'middle';
    a.ctx.font = 'bold 28px "Iowan Old Style","Georgia",serif';
    a.ctx.shadowColor = '#000';
    a.ctx.shadowBlur = 6;
    a.ctx.fillStyle = '#f4d27a';
    a.ctx.fillText('ABYSS OF THE', cx, titleY);
    a.ctx.fillText('SEVEN LAMPS', cx, titleY + 30);
    a.ctx.shadowBlur = 0;
    a.ctx.restore();
  }
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
    duration: 5.0,
    render: shotRings,
    subtitle: 'Seven lamps. Seven veils. Seven forgettings.',
  },
  {
    duration: 5.5,
    render: shotWalk,
    subtitle: 'The lamps have gone out.',
  },
  {
    duration: 6.5,
    render: shotHero,
    subtitle: 'Take up thy lamp, Initiate.',
    holdSubtitle: true,
  },
];
