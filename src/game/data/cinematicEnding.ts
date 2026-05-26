// "The Eighth Sphere" — climactic ending cinematic.
//
// Six shots, ~60 seconds. Plays the first time the player reaches the
// Ogdoad after defeating the Saturn-Warden. The single most ambitious
// cinematic in the game: it visualises the soul's release from the
// seven planetary rings and the apotheosis into the Eighth Nature.

import { Shot, ShotArgs } from '../../components/CinematicShort';
import { drawInitiateHeroic } from '../rendering/cinematicSprites';
import {
  clamp01, easeIn, easeOut, easeInOut, withAlpha,
  vignette, colorGrade, bloomPoint, starfield, motes,
  nebula, cinemaText, applyShake, StarLayer,
} from '../rendering/cinemaHelpers';
import { SPHERE_COLOURS } from './cinematicTabula';

const FAR_STARS: StarLayer = { count: 130, speed: 1.5, parallaxY: 0.5, hue: '244, 210, 122', size: 1 };
const MID_STARS: StarLayer = { count: 70, speed: 4, parallaxY: 1, hue: '255, 247, 214', size: 1.2 };

function drawOgdoadGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, alpha: number, rotate = 0): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotate);
  ctx.fillStyle = `rgba(255, 247, 214, ${alpha})`;
  // Cardinal rays
  ctx.fillRect(-1, -16 * scale, 2, 32 * scale);
  ctx.fillRect(-16 * scale, -1, 32 * scale, 2);
  // Diagonal rays
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-1, -12 * scale, 2, 24 * scale);
  ctx.fillRect(-12 * scale, -1, 24 * scale, 2);
  ctx.restore();
}

// ─── Shot 1 — The seventh lamp lights ────────────────────────────────
// We linger on the moment after Saturn falls. Seven lamps ghost above
// the arena, six already lit. The seventh catches fire and rises.

function shotSeventhLamp(a: ShotArgs): void {
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);

  // Dim violet residue of the Saturn arena
  nebula(a, a.width * 0.5, a.height * 0.78, a.height * 0.55, '#5b3a86', 0.32);
  starfield(a, [FAR_STARS], 41);

  // Smoke motes drifting up from the arena (residue of the boss death)
  motes(a, 30, '155, 108, 255', 17);

  // Seven lamps in a row across the upper third — the six "already lit"
  // pulse softly, the seventh ignites over the shot duration.
  const cx = a.width / 2;
  const cy = a.height * 0.32;
  const spacing = Math.min(110, Math.max(60, a.width / 9));
  const p = clamp01(a.t / a.duration);
  for (let i = 0; i < 7; i++) {
    const x = cx + (i - 3) * spacing;
    const isLast = i === 6;
    const lit = isLast ? easeOut(clamp01(p * 1.4)) : 1;
    const flick = 0.7 + Math.sin(a.total * 2.2 + i * 0.6) * 0.25;
    const colour = isLast ? '#9b6cff' : '#ffe6a3';
    if (lit > 0.05) {
      bloomPoint(a, x, cy, 32, colour, lit * flick * 0.65);
    }
    // Bracket
    a.ctx.fillStyle = `rgba(40, 22, 70, ${0.9})`;
    a.ctx.fillRect(x - 1.5, cy + 6, 3, 12);
    a.ctx.fillRect(x - 5, cy + 16, 10, 3);
    // Flame
    if (lit > 0.05) {
      const fh = 9 + Math.sin(a.total * 5 + i) * 1.5;
      a.ctx.fillStyle = withAlpha(colour, lit * flick);
      a.ctx.beginPath();
      a.ctx.ellipse(x, cy, 4.5, fh, 0, 0, Math.PI * 2);
      a.ctx.fill();
      a.ctx.fillStyle = `rgba(255, 247, 214, ${lit})`;
      a.ctx.fillRect(x - 1, cy - 2, 2, 4);
    }
  }

  // The seventh lamp rises slightly as it ignites
  if (p > 0.3) {
    const liftP = clamp01((p - 0.3) / 0.7);
    const liftY = cy - liftP * 8;
    const x = cx + 3 * spacing;
    bloomPoint(a, x, liftY, 48, '#9b6cff', liftP * 0.7);
  }

  colorGrade(a, '#3a225f', 0.10);
  vignette(a, 0.5);
}

// ─── Shot 2 — The cosmic frame falls ────────────────────────────────
// Hard cut to black. Seven concentric rings (each a sphere's colour)
// draw themselves outward from a single bright point. Then they rotate
// together at accelerating speed. Then they EXPLODE outward, leaving
// a single point at centre.

function shotRingCollapse(a: ShotArgs): void {
  a.ctx.fillStyle = '#000';
  a.ctx.fillRect(0, 0, a.width, a.height);

  const cx = a.width / 2;
  const cy = a.height * 0.5;

  // Phase markers
  const drawDur = 0.42;   // 0..0.42: rings draw outward
  const rotDur  = 0.30;   // 0.42..0.72: rings rotate together, accelerate
  const explDur = 0.20;   // 0.72..0.92: explosion outward
  const finalDur = 0.08;  // 0.92..1.0: settle on the centre point

  const p = clamp01(a.t / a.duration);

  // Stars during draw, fading toward explosion
  starfield(a, [FAR_STARS], 51);

  // Bright central pinprick
  const corePhase = p < drawDur ? p / drawDur : 1;
  bloomPoint(a, cx, cy, 30, '#ffffff', 0.85 * corePhase);

  // Compute per-ring radii
  const baseR = Math.min(a.width, a.height) * 0.07;
  const ringGap = Math.min(a.width, a.height) * 0.058;

  // Phase 1: Draw rings
  if (p < drawDur) {
    const drawP = p / drawDur;
    for (let i = 0; i < 7; i++) {
      const start = drawP * 1.1 - i * 0.12;
      const ringT = clamp01(start);
      if (ringT <= 0) continue;
      const r = baseR + ringGap * (i + 1);
      const col = SPHERE_COLOURS[i];
      const sweep = Math.PI * 2 * easeOut(ringT);
      a.ctx.save();
      a.ctx.translate(cx, cy);
      a.ctx.strokeStyle = withAlpha(col.ring, 0.7 + 0.3 * ringT);
      a.ctx.lineWidth = 2;
      a.ctx.beginPath();
      a.ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + sweep);
      a.ctx.stroke();
      a.ctx.restore();
    }
  }

  // Phase 2: Rotate together, accelerating
  if (p >= drawDur && p < drawDur + rotDur) {
    const rotP = (p - drawDur) / rotDur;
    const angVel = 0.8 + easeIn(rotP) * 18; // dramatic acceleration
    const baseAng = a.total * angVel - rotP * 4;
    for (let i = 0; i < 7; i++) {
      const r = baseR + ringGap * (i + 1);
      const col = SPHERE_COLOURS[i];
      const rotation = baseAng + i * 0.15;
      // Brightness builds with the rotation
      const brightness = 1 + rotP * 0.6;
      a.ctx.save();
      a.ctx.translate(cx, cy);
      a.ctx.rotate(rotation);
      a.ctx.strokeStyle = withAlpha(col.ring, Math.min(1, 0.8 * brightness));
      a.ctx.lineWidth = 2 + rotP * 1.5;
      a.ctx.beginPath();
      // Most of the ring with a small gap at top so the rotation is visible
      a.ctx.arc(0, 0, r, -Math.PI / 2 + 0.25, -Math.PI / 2 + Math.PI * 2 - 0.05);
      a.ctx.stroke();
      a.ctx.restore();
      // Bloom on each ring as brightness builds
      bloomPoint(a, cx, cy, r + 30, col.ring, 0.15 * brightness);
    }
    // Camera shake increases with rotation speed
    if (rotP > 0.3) applyShake(a, { magnitude: 1 + rotP * 4, freq: 32 });
  }

  // Phase 3: Explosion outward
  if (p >= drawDur + rotDur && p < drawDur + rotDur + explDur) {
    const explP = (p - drawDur - rotDur) / explDur;
    const expand = easeOut(explP);
    for (let i = 0; i < 7; i++) {
      const baseR_i = baseR + ringGap * (i + 1);
      const r = baseR_i + expand * a.width * (0.6 + i * 0.05);
      const col = SPHERE_COLOURS[i];
      const fade = 1 - explP;
      a.ctx.save();
      a.ctx.translate(cx, cy);
      a.ctx.strokeStyle = withAlpha(col.ring, fade * 0.85);
      a.ctx.lineWidth = (2 + i * 0.3) * (1 + explP * 2);
      a.ctx.beginPath();
      a.ctx.arc(0, 0, r, 0, Math.PI * 2);
      a.ctx.stroke();
      a.ctx.restore();
    }
    // Big bloom and flash
    bloomPoint(a, cx, cy, 200 + expand * 400, '#ffffff', (1 - explP) * 0.7);
    if (explP < 0.4) {
      a.ctx.fillStyle = `rgba(255, 255, 255, ${(0.6 - explP * 1.5)})`;
      a.ctx.fillRect(0, 0, a.width, a.height);
    }
    applyShake(a, { magnitude: 3 * (1 - explP), freq: 36 });
  }

  // Phase 4: One bright pinprick at centre (the Eighth approaches)
  if (p >= drawDur + rotDur + explDur) {
    const finalP = clamp01((p - drawDur - rotDur - explDur) / finalDur);
    const r = 4 + finalP * 18;
    bloomPoint(a, cx, cy, 80, '#ffffff', 0.9 + 0.1 * finalP);
    a.ctx.fillStyle = '#ffffff';
    a.ctx.beginPath();
    a.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    a.ctx.fill();
  }

  vignette(a, 0.55);
}

// ─── Shot 3 — The Initiate hymned ───────────────────────────────────
// Slow push toward the central point, which expands into the
// eight-pointed Ogdoad glyph. Initiate silhouette materialises in
// front of it, arms raised.

function shotHymned(a: ShotArgs): void {
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);

  starfield(a, [FAR_STARS, MID_STARS], 61);

  const cx = a.width / 2;
  const cy = a.height * 0.5;
  const p = clamp01(a.t / a.duration);

  // The Ogdoad glyph grows from pinprick to full size with a push-in
  const grow = easeOut(p);
  const glyphScale = 0.5 + grow * 5;
  const pulse = 0.85 + 0.15 * Math.sin(a.total * 1.6);

  // Huge halo
  bloomPoint(a, cx, cy, 80 + grow * 220, '#ffe6a3', 0.75 * pulse);
  bloomPoint(a, cx, cy, 30 + grow * 120, '#fff7d6', 0.8);

  // Rotating star field of distant stars
  motes(a, 22, '244, 210, 122', 13);

  // Eight-pointed star — slowly rotates
  drawOgdoadGlyph(a.ctx, cx, cy, glyphScale, pulse, a.total * 0.06);

  // Initiate materialises in front of the star at 30% into the shot
  if (p > 0.25) {
    const matP = easeOut(clamp01((p - 0.25) / 0.5));
    const armsRaise = clamp01((p - 0.45) / 0.4);
    const scale = Math.min(8, Math.max(5, a.height / 70));
    const baseY = a.height * 0.7;
    const ix = cx - 11 * scale;
    const iy = baseY - 28 * scale;
    a.ctx.save();
    a.ctx.globalAlpha = matP;
    drawInitiateHeroic(a.ctx, ix, iy, scale, 0.7 + p * 0.3);
    a.ctx.restore();
    // Arms-raise — simple V of two pixel-art arms over the figure's body.
    // Done in canvas (not the sprite) so we don't need a new frame.
    if (armsRaise > 0) {
      a.ctx.save();
      a.ctx.globalAlpha = matP * armsRaise;
      a.ctx.fillStyle = '#3d2273';
      const armUp = armsRaise * scale * 5;
      a.ctx.fillRect(ix + 6 * scale,  iy + 10 * scale - armUp, 2 * scale, armUp);
      a.ctx.fillRect(ix + 14 * scale, iy + 10 * scale - armUp, 2 * scale, armUp);
      a.ctx.restore();
    }
  }

  colorGrade(a, '#f4d27a', 0.05);
  vignette(a, 0.55, 0.3);
}

// ─── Shot 4 — The Hymn ──────────────────────────────────────────────
// Push continues into white-gold. Initiate becomes outline-only — a
// silhouette frame of light. The four lines of the Hymn of the Reborn
// fade in over the shot duration, each ~3 seconds apart.

function shotHymn(a: ShotArgs): void {
  // Brighten to pale gold
  const p = clamp01(a.t / a.duration);
  const lift = easeOut(Math.min(1, p * 1.2));
  // Fill background with deepening gold
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);
  // Big halo growing from centre
  const cx = a.width / 2, cy = a.height * 0.5;
  bloomPoint(a, cx, cy, 80 + lift * 600, '#fff7d6', 0.7 + 0.3 * lift);

  // Eight-pointed star pulsing in the centre
  const pulse = 0.85 + 0.15 * Math.sin(a.total * 1.4);
  drawOgdoadGlyph(a.ctx, cx, cy, 6 + lift * 2, pulse, a.total * 0.04);

  // Initiate silhouette in front of star — outline only
  const scale = Math.min(8, Math.max(5, a.height / 70));
  const baseY = a.height * 0.72;
  const ix = cx - 11 * scale;
  const iy = baseY - 28 * scale;
  a.ctx.save();
  // Outline by drawing slightly larger black, then erasing centre with
  // the bright halo (the bloom already in place provides this effect).
  drawInitiateHeroic(a.ctx, ix, iy, scale, 1);
  a.ctx.restore();

  // Four lines of the Hymn — fade in at 1.0, 3.5, 6.5, 10s; hold all
  const lines = [
    'Holy is God, the Father of all things.',
    'Holy is God, whose will is accomplished by his own powers.',
    'Holy is God, who would be known and is known by his own.',
    'Holy art Thou, of whom all Nature is the image.',
  ];
  const fadeStarts = [1.0, 3.5, 6.5, 10.0];
  const lineFontPx = Math.min(22, Math.max(14, a.height / 32));
  const topY = a.height * 0.18;
  for (let i = 0; i < lines.length; i++) {
    const alpha = clamp01((a.t - fadeStarts[i]) / 1.0);
    if (alpha <= 0) continue;
    cinemaText(a, lines[i], cx, topY + i * (lineFontPx + 10), lineFontPx, alpha, '#3a225f');
  }

  // Color grade goes warm-bright
  colorGrade(a, '#ffe6a3', 0.12);
  vignette(a, 0.35, 0.4);
}

// ─── Shot 5 — Flight of the Alone ───────────────────────────────────
// Slow fade from gold back to deep starfield. Plotinus quote rises.

function shotFlight(a: ShotArgs): void {
  const p = clamp01(a.t / a.duration);
  // Fade from gold (start) to deep starfield (end)
  const goldFade = clamp01(1 - p * 1.6);
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);
  // Cosmic backdrop
  nebula(a, a.width * 0.4, a.height * 0.4, a.height * 0.5, '#3a225f', 0.18);
  nebula(a, a.width * 0.7, a.height * 0.6, a.height * 0.45, '#1f8a86', 0.10);
  starfield(a, [FAR_STARS, MID_STARS], 71);
  // Faint warm afterglow from previous shot
  if (goldFade > 0) {
    const cx = a.width / 2, cy = a.height * 0.5;
    bloomPoint(a, cx, cy, 200 + (1 - p) * 200, '#ffe6a3', 0.4 * goldFade);
  }

  motes(a, 16, '108, 246, 229', 89);

  // Plotinus quote — fades in, then fades back at end
  const alpha = p < 0.25 ? p / 0.25 : (p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1);
  const cx = a.width / 2, cy = a.height * 0.4;
  cinemaText(a, 'This is the life of the gods', cx, cy - 18, 22, alpha);
  cinemaText(a, 'and of the godlike and blessed among men:', cx, cy + 10, 18, alpha, '#cdb59a');
  cinemaText(a, 'the flight of the Alone to the Alone.', cx, cy + 38, 22, alpha);

  vignette(a, 0.6);
}

// ─── Shot 6 — The cycle turns ───────────────────────────────────────
// Seven lamps reappear all lit, drifting upward. A small line of text
// confirms the work is done.

function shotCycleTurns(a: ShotArgs): void {
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);
  starfield(a, [FAR_STARS, MID_STARS], 91);
  motes(a, 22, '244, 210, 122', 97);

  const cx = a.width / 2;
  // The seven lamps appear at the bottom and drift up over the shot
  const lampSpacing = Math.min(100, Math.max(56, a.width / 10));
  const startY = a.height * 0.9;
  const endY = a.height * 0.35;
  const p = clamp01(a.t / a.duration);
  const drift = startY + (endY - startY) * easeInOut(p);
  for (let i = 0; i < 7; i++) {
    const x = cx + (i - 3) * lampSpacing;
    const y = drift + Math.sin(a.total * 0.6 + i * 0.7) * 4;
    const flick = 0.75 + Math.sin(a.total * 3 + i * 0.5) * 0.2;
    const alpha = clamp01(p * 2);
    bloomPoint(a, x, y, 28, '#ffe6a3', 0.55 * flick * alpha);
    // Flame
    a.ctx.fillStyle = withAlpha('#f4d27a', 0.9 * flick * alpha);
    a.ctx.beginPath();
    a.ctx.ellipse(x, y, 3.5, 6 + Math.sin(a.total * 5 + i) * 1, 0, 0, Math.PI * 2);
    a.ctx.fill();
    a.ctx.fillStyle = withAlpha('#ffe6a3', alpha);
    a.ctx.fillRect(x - 1, y - 2, 2, 4);
  }

  // Resolving text, appears after lamps settle
  if (p > 0.5) {
    const ta = easeOut(clamp01((p - 0.5) * 2));
    cinemaText(a, 'Thus ends the first work.', cx, a.height * 0.62, 22, ta);
    a.ctx.save();
    a.ctx.font = 'italic 16px "Iowan Old Style","Georgia",serif';
    a.ctx.textAlign = 'center';
    a.ctx.fillStyle = `rgba(108, 246, 229, ${ta})`;
    a.ctx.shadowColor = '#000';
    a.ctx.shadowBlur = 6;
    a.ctx.fillText('The cycle turns again.', cx, a.height * 0.62 + 26);
    a.ctx.restore();
  }

  vignette(a, 0.5);
}

// ─── THE FILM ─────────────────────────────────────────────────────────

export const ENDING_CINEMATIC: Shot[] = [
  {
    duration: 7.0,
    render: shotSeventhLamp,
    subtitle: 'The seventh ring is undone.',
  },
  {
    duration: 9.0,
    render: shotRingCollapse,
    subtitle: 'Made bare of all the workings of the cosmic frame…',
    source: 'Corpus Hermeticum I.26',
  },
  {
    duration: 9.0,
    render: shotHymned,
    subtitle: 'With its own proper power it hymneth with the Powers there to the Father.',
    source: 'Corpus Hermeticum I.26',
  },
  {
    duration: 14.0,
    render: shotHymn,
    holdSubtitle: true,
  },
  {
    duration: 9.0,
    render: shotFlight,
    source: 'Plotinus, Enneads VI.9.11',
    holdSubtitle: true,
  },
  {
    duration: 8.0,
    render: shotCycleTurns,
    holdSubtitle: true,
  },
];
