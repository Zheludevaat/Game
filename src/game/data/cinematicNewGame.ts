// "The Gate Opens" — new-run cinematic short.
//
// Five shots, ~28 seconds. After the archetype is chosen, the player
// sees the Initiate at the threshold of the abyss: approach, oath
// (hands on weapon), look up at the dimming lamps, step off the dais,
// and tumble into the dark with the first floor's banner rising.

import { Shot, ShotArgs } from '../../components/CinematicShort';
import {
  drawInitiateProfile, drawInitiateFace, drawInitiateHeroic,
  drawHandsDagger, drawInitiateFalling, drawDistantLamp,
  drawStoneArch,
} from '../rendering/cinematicSprites';
import {
  clamp01, easeIn, easeOut, easeInOut, withAlpha,
  vignette, colorGrade, bloomPoint, starfield, motes,
  nebula, groundMist, cinemaText, applyShake,
  StarLayer,
} from '../rendering/cinemaHelpers';

const FAR_STARS: StarLayer = { count: 110, speed: 1.5, parallaxY: 0.5, hue: '244, 210, 122', size: 1 };
const MID_STARS: StarLayer = { count: 60, speed: 3, parallaxY: 1, hue: '255, 247, 214', size: 1.2 };

// ─── SHOT 1 — Wide. Initiate approaches the stone arch ─────────────

function shotApproach(a: ShotArgs): void {
  // Sky
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);
  // Distant nebula behind the arch
  nebula(a, a.width / 2, a.height * 0.3, a.height * 0.6, '#3a225f', 0.22);
  starfield(a, [FAR_STARS, MID_STARS]);

  // The Ogdoad mark — eight-pointed star far above the arch
  const ogX = a.width / 2;
  const ogY = a.height * 0.18;
  bloomPoint(a, ogX, ogY, 70, '#ffe6a3', 0.6);
  a.ctx.save();
  a.ctx.translate(ogX, ogY);
  a.ctx.fillStyle = 'rgba(255, 247, 214, 0.85)';
  a.ctx.fillRect(-1, -16, 2, 32);
  a.ctx.fillRect(-16, -1, 32, 2);
  a.ctx.rotate(Math.PI / 4);
  a.ctx.fillRect(-1, -12, 2, 24);
  a.ctx.fillRect(-12, -1, 24, 2);
  a.ctx.restore();

  // Ground far in the distance — flat, then receding
  const horizonY = a.height * 0.62;
  a.ctx.fillStyle = '#0a0420';
  a.ctx.fillRect(0, horizonY, a.width, a.height - horizonY);
  groundMist(a, horizonY, 100);

  // The Stone Arch — centered, large, the destination
  const archScale = a.height * 0.5;
  drawStoneArch(a.ctx, a.width / 2, horizonY + 4, archScale * 0.6, archScale, '#3b265c', '#1a0f2c');

  // Cracked-stone steps leading up to it
  for (let i = 0; i < 3; i++) {
    const stepW = archScale * 0.6 + i * archScale * 0.12;
    const stepY = horizonY + 6 + i * 8;
    a.ctx.fillStyle = i % 2 === 0 ? '#1a0f2c' : '#0a0420';
    a.ctx.fillRect(a.width / 2 - stepW / 2, stepY, stepW, 8);
  }

  // The Initiate — small, walking up toward the arch from the bottom
  const p = clamp01(a.t / a.duration);
  const px = a.width / 2;
  const py = a.height * 0.95 - p * (a.height * 0.18);
  const scale = Math.min(4, Math.max(2.5, a.height / 200));
  const phase = a.t * 4;
  drawInitiateProfile(a.ctx, px - 8 * scale, py - 24 * scale, scale, phase, true);
  // Shadow
  a.ctx.fillStyle = 'rgba(0,0,0,0.55)';
  a.ctx.fillRect(px - 6 * scale, py + 2, 12 * scale, 3);

  colorGrade(a, '#2a1656', 0.10);
  vignette(a, 0.55);
}

// ─── SHOT 2 — Close-up. Hands holding the dagger ────────────────────

function shotOath(a: ShotArgs): void {
  // Backdrop: very dark, focused candlelight from below-right
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);
  motes(a, 16, '244, 210, 122', 13);

  // Pool of warm light
  const lx = a.width * 0.65, ly = a.height * 0.75;
  bloomPoint(a, lx, ly, a.height * 0.6, '#f4d27a', 0.55);

  // Hands holding dagger, foreground big — slow camera tilt by translating
  const p = clamp01(a.t / a.duration);
  const tilt = (p - 0.5) * 18; // small drift
  a.ctx.save();
  a.ctx.translate(0, tilt);

  const scale = Math.min(14, Math.max(8, a.height / 60));
  const cx = a.width / 2;
  const cy = a.height * 0.55;
  drawHandsDagger(a.ctx, cx - 11 * scale, cy - 7 * scale, scale);

  // Accent glint on the blade — sweeps across as the camera moves
  const glintP = clamp01((a.t - 0.6) / 1.4);
  if (glintP > 0 && glintP < 1) {
    const gx = cx - 11 * scale + glintP * 22 * scale;
    a.ctx.fillStyle = `rgba(255, 255, 255, ${1 - glintP})`;
    a.ctx.fillRect(gx - 2, cy - 1 * scale, 4 * scale, 2);
  }

  a.ctx.restore();

  colorGrade(a, '#3a2410', 0.18);
  vignette(a, 0.7, 0.18);
}

// ─── SHOT 3 — Worm's-eye. Initiate looks up at the dim lamps ───────

function shotLookUp(a: ShotArgs): void {
  // Sky
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);
  nebula(a, a.width * 0.5, a.height * 0.25, a.height * 0.5, '#3a225f', 0.18);
  starfield(a, [FAR_STARS, MID_STARS], 17);

  // Seven lamps high above — DIM (the seven lamps have gone out)
  const cy = a.height * 0.22;
  const spacing = Math.min(82, Math.max(48, a.width / 12));
  const cx = a.width / 2;
  const p = clamp01(a.t / a.duration);
  for (let i = 0; i < 7; i++) {
    const x = cx + (i - 3) * spacing;
    // Lamp is mostly out; only a faint dying ember
    const ember = Math.max(0, 0.4 - p * 0.4); // fades to nothing
    const flick = 0.4 + Math.sin(a.total * 2 + i * 0.7) * 0.2;
    if (ember > 0.05) {
      bloomPoint(a, x, cy, 16, '#5b3a86', ember * flick * 0.6);
    }
    // Bracket — visible as dark silhouette
    a.ctx.fillStyle = '#1a0f2c';
    a.ctx.fillRect(x - 1, cy + 2, 2, 8);
    a.ctx.fillRect(x - 4, cy + 9, 8, 2);
    // Faint cold smoke wisp
    a.ctx.fillStyle = `rgba(91, 58, 134, ${0.2 * (1 - p)})`;
    a.ctx.fillRect(x - 1, cy - 6 - i * 0.5, 2, 6 - p * 4);
  }

  // Stone columns flanking — silhouetted, very tall (we are looking up)
  a.ctx.fillStyle = '#000';
  // Left column
  a.ctx.fillRect(20, 0, 50, a.height);
  a.ctx.fillRect(8,  a.height * 0.6, 80, 12);  // capital outcrop
  // Right column
  a.ctx.fillRect(a.width - 70, 0, 50, a.height);
  a.ctx.fillRect(a.width - 88, a.height * 0.6, 80, 12);
  // Inner silhouette stripe
  a.ctx.fillStyle = '#0a0420';
  a.ctx.fillRect(24, 0, 44, a.height);
  a.ctx.fillRect(a.width - 66, 0, 44, a.height);

  // The Initiate at the bottom of frame, looking up — heroic sprite (full body)
  const baseY = a.height * 0.98;
  const scale = Math.min(7, Math.max(4, a.height / 110));
  const ix = a.width / 2 - 11 * scale;
  const iy = baseY - 28 * scale;
  drawInitiateHeroic(a.ctx, ix, iy, scale, 0.4 + p * 0.5);

  // Cone of light radiating UP from below (campfire / pit) onto the Initiate
  const coneG = a.ctx.createRadialGradient(a.width / 2, baseY, 12, a.width / 2, baseY, a.height * 0.4);
  coneG.addColorStop(0, 'rgba(244, 130, 60, 0.5)');
  coneG.addColorStop(1, 'rgba(244, 130, 60, 0)');
  a.ctx.save();
  a.ctx.globalCompositeOperation = 'lighter';
  a.ctx.fillStyle = coneG;
  a.ctx.fillRect(0, baseY - a.height * 0.4, a.width, a.height * 0.4);
  a.ctx.restore();

  colorGrade(a, '#1f1142', 0.10);
  vignette(a, 0.55);
}

// ─── SHOT 4 — The dais. Initiate steps off into nothing ────────────

function shotStep(a: ShotArgs): void {
  // Pure black with cold pool of light
  a.ctx.fillStyle = '#000';
  a.ctx.fillRect(0, 0, a.width, a.height);

  const p = clamp01(a.t / a.duration);
  const cx = a.width / 2;
  const cy = a.height * 0.55;

  // Circular stone dais — viewed from a low 3/4 angle
  const daisR = a.height * 0.25;
  // Edge
  a.ctx.fillStyle = '#1a0f2c';
  a.ctx.beginPath();
  a.ctx.ellipse(cx, cy + daisR * 0.3, daisR, daisR * 0.34, 0, 0, Math.PI * 2);
  a.ctx.fill();
  // Top of dais
  a.ctx.fillStyle = '#3b265c';
  a.ctx.beginPath();
  a.ctx.ellipse(cx, cy + daisR * 0.2, daisR, daisR * 0.34, 0, 0, Math.PI * 2);
  a.ctx.fill();
  // Inner gold inlay ring — opens like an iris as p approaches 0.7
  const irisP = clamp01((p - 0.5) * 3);
  const innerR = daisR * 0.55 + irisP * daisR * 0.3;
  a.ctx.fillStyle = '#0a0420';
  a.ctx.beginPath();
  a.ctx.ellipse(cx, cy + daisR * 0.2, innerR, innerR * 0.34, 0, 0, Math.PI * 2);
  a.ctx.fill();
  // Gold ring inlay
  a.ctx.save();
  a.ctx.strokeStyle = `rgba(244, 210, 122, ${0.7 - irisP * 0.6})`;
  a.ctx.lineWidth = 2;
  a.ctx.beginPath();
  a.ctx.ellipse(cx, cy + daisR * 0.2, daisR * 0.55, daisR * 0.55 * 0.34, 0, 0, Math.PI * 2);
  a.ctx.stroke();
  a.ctx.restore();

  // The Initiate stands on the dais, silhouetted against the deep abyss below
  const baseY = cy + daisR * 0.05; // top edge of dais
  const stepOff = irisP > 0.5 ? (irisP - 0.5) * 2 : 0;
  const scale = Math.min(6, Math.max(4, a.height / 130));
  const ix = cx - 11 * scale + stepOff * 8;
  const iy = baseY - 28 * scale - stepOff * 6;
  drawInitiateHeroic(a.ctx, ix, iy, scale, 0.6 + p * 0.4);

  // Cold uplight from the abyss below the dais
  if (irisP > 0.1) {
    const upG = a.ctx.createRadialGradient(cx, cy + daisR * 0.2, 4, cx, cy + daisR * 0.2, daisR * 1.4);
    upG.addColorStop(0, `rgba(108, 246, 229, ${0.5 * irisP})`);
    upG.addColorStop(1, 'rgba(108, 246, 229, 0)');
    a.ctx.save();
    a.ctx.globalCompositeOperation = 'lighter';
    a.ctx.fillStyle = upG;
    a.ctx.fillRect(cx - daisR * 1.4, cy + daisR * 0.2 - daisR * 1.4, daisR * 2.8, daisR * 2.8);
    a.ctx.restore();
  }

  // Towering distant arches / silhouettes far away
  starfield(a, [FAR_STARS], 23);

  // Wide subtle camera shake near the iris opening
  if (irisP > 0.3 && irisP < 0.9) {
    applyShake(a, { magnitude: 1.5, freq: 30 });
  }

  colorGrade(a, '#1f8a86', 0.08);
  vignette(a, 0.6);
}

// ─── SHOT 5 — Tumble. Falling through the abyss; banner rises ──────

function shotFall(a: ShotArgs): void {
  // Pure abyss
  a.ctx.fillStyle = '#000';
  a.ctx.fillRect(0, 0, a.width, a.height);

  const p = clamp01(a.t / a.duration);

  // Streaks rushing UPWARD past the camera (we are falling)
  const streakCount = 60;
  for (let i = 0; i < streakCount; i++) {
    const seed = i * 9971;
    const sx = ((seed * 9301) % 233280) / 233280;
    const phase = ((seed * 17) % 233);
    const lift = ((a.total * 700 + phase * 23) % (a.height + 200));
    const y = a.height - lift;
    const x = sx * a.width;
    const len = 14 + (i % 8) * 4;
    const hue = i % 7 === 0 ? '244, 210, 122' : (i % 5 === 0 ? '108, 246, 229' : '60, 38, 92');
    a.ctx.fillStyle = `rgba(${hue}, ${0.7})`;
    a.ctx.fillRect(x, y, 1, len);
  }

  // Layers of stone arches rushing past — dark silhouettes
  const archLayers = 4;
  for (let i = 0; i < archLayers; i++) {
    const archP = ((a.total * 0.7 + i * 0.25) % 1);
    const ay = a.height * archP;
    const archW = a.width * (0.5 + archP * 0.7);
    const archH = a.height * (0.18 + archP * 0.2);
    a.ctx.fillStyle = `rgba(0, 0, 0, ${0.85})`;
    // Two stone slabs that the camera passes through
    a.ctx.fillRect(0, ay - archH, a.width / 2 - archW / 2, archH * 2);
    a.ctx.fillRect(a.width / 2 + archW / 2, ay - archH, a.width / 2 - archW / 2, archH * 2);
  }

  // The Initiate at the center, falling — top-down sprite spinning slowly
  const scale = Math.min(6, Math.max(3.5, a.height / 110));
  const cx = a.width / 2;
  const cy = a.height * 0.5;
  // Slight drift over time
  const driftX = Math.sin(a.total * 1.2) * 12;
  const spin = a.total * 0.5;
  drawInitiateFalling(a.ctx, cx + driftX - 7 * scale, cy - 11 * scale, scale, spin);

  // Faint trail of falling cloak motes
  for (let i = 0; i < 8; i++) {
    const fade = 1 - i / 8;
    a.ctx.fillStyle = `rgba(40, 22, 70, ${0.4 * fade})`;
    a.ctx.fillRect(cx + driftX - 1 + Math.sin(a.total + i) * 3, cy - 20 * scale - i * 12, 3, 6);
  }

  // The end of the fall — light blooming up from below
  const arrival = clamp01((p - 0.6) * 3);
  if (arrival > 0) {
    bloomPoint(a, cx, a.height + 40, 220 + arrival * 220, '#f4d27a', 0.55 * arrival);
  }

  // Floor banner rises into view in the last third
  const bannerP = clamp01((p - 0.55) / 0.4);
  if (bannerP > 0) {
    const ba = easeOut(bannerP);
    const bx = a.width / 2;
    const by = a.height * 0.5 - (1 - ba) * 30;
    cinemaText(a, 'FLOOR I', bx, by - 16, 22, ba);
    a.ctx.save();
    a.ctx.font = 'italic 16px "Iowan Old Style","Georgia",serif';
    a.ctx.textAlign = 'center';
    a.ctx.fillStyle = `rgba(108, 246, 229, ${ba})`;
    a.ctx.shadowColor = '#000';
    a.ctx.shadowBlur = 6;
    a.ctx.fillText('— Selene. Where the body remembers the tide. —', bx, by + 16);
    a.ctx.restore();
  }

  // Camera shake throughout the fall
  // (applyShake takes the current ctx so call before drawing if we want shake;
  //  here a small wobble at the end for impact)
  // We'd need to wrap in save/restore — skipping for clarity.

  colorGrade(a, '#1f1142', 0.10);
  vignette(a, 0.5);
}

// ─── THE FILM ─────────────────────────────────────────────────────────

export const NEW_GAME_CINEMATIC: Shot[] = [
  {
    duration: 5.5,
    render: shotApproach,
    subtitle: 'The Initiate approaches the threshold.',
  },
  {
    duration: 5.0,
    render: shotOath,
    subtitle: 'By the Word, the cosmos was made. By the Word, I descend.',
    source: 'Oath of the Magus',
  },
  {
    duration: 5.0,
    render: shotLookUp,
    subtitle: 'Seven lamps await thee. They are extinguished.',
  },
  {
    duration: 6.5,
    render: shotStep,
    subtitle: 'To ascend, thou must first descend.',
  },
  {
    duration: 6.5,
    render: shotFall,
    subtitle: 'The Abyss is thy forgetting. Remember.',
    holdSubtitle: true,
  },
];
