// Boss-intro film template, parameterised by sphere.
//
// Three shots per Warden, all built from the shared cinemaHelpers
// vocabulary. The Warden silhouette uses the existing wardenBoss enemy
// sprite (drawEnemy from PixelArt.ts) so no new pixel art is needed
// per sphere — the visual differentiation comes from sphere accent
// colour, the planetary glyph, and the locked Warden name + epithet
// + surrender lines.

import { Shot, ShotArgs } from '../../components/CinematicShort';
import { drawEnemy, getEnemySize } from '../rendering/PixelArt';
import {
  clamp01, easeIn, easeOut, withAlpha,
  vignette, colorGrade, bloomPoint, starfield, motes,
  nebula, applyShake, cinemaText, StarLayer,
} from '../rendering/cinemaHelpers';
import { SPHERE_BY_ID, SphereId, SphereDef } from './spheres';
import { BOSS_INTROS } from './cutscenes';

const FAR_STARS: StarLayer  = { count: 100, speed: 1.8, parallaxY: 0.6, hue: '244, 210, 122', size: 1 };
const MID_STARS: StarLayer  = { count: 50,  speed: 4,   parallaxY: 1.4, hue: '255, 247, 214', size: 1.2 };

// ─── Shot 1 — The Sphere approaches ──────────────────────────────────
// Wide cosmic shot. Sphere's glyph drifts into centre, pulses; ringed
// by the sphere's own colour. Brief subtitle of sphere numeral + name.

function shotSphereApproach(a: ShotArgs, s: SphereDef): void {
  // Sky
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);

  // Drifting nebula in the sphere's colour
  nebula(a, a.width * 0.35, a.height * 0.4, a.height * 0.6, s.colour, 0.22, 3, -1);
  nebula(a, a.width * 0.7, a.height * 0.6, a.height * 0.45, s.accent, 0.14, -2, 1);

  // Parallax starfield, slow approach
  const ramp = easeIn(clamp01(a.t / a.duration));
  starfield(a, [
    { ...FAR_STARS, speed: 1.8 + ramp * 8 },
    { ...MID_STARS, speed: 4 + ramp * 20 },
  ], 31);

  const cx = a.width / 2;
  const cy = a.height * 0.48;
  const grow = easeOut(clamp01(a.t / (a.duration * 0.7)));
  const pulse = 0.85 + 0.15 * Math.sin(a.total * 3);

  // Ringed halo around glyph
  const r = 60 + grow * 80;
  bloomPoint(a, cx, cy, r * 1.6, s.colour, 0.55 * grow * pulse);
  // Two concentric rings — outer faint, inner brighter
  a.ctx.save();
  a.ctx.strokeStyle = withAlpha(s.colour, 0.7 * grow);
  a.ctx.lineWidth = 2;
  a.ctx.beginPath();
  a.ctx.arc(cx, cy, r, 0, Math.PI * 2);
  a.ctx.stroke();
  a.ctx.strokeStyle = withAlpha(s.accent, 0.45 * grow);
  a.ctx.lineWidth = 1;
  a.ctx.beginPath();
  a.ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
  a.ctx.stroke();
  a.ctx.restore();

  // The big planetary glyph
  a.ctx.save();
  a.ctx.font = `bold ${Math.min(140, a.height * 0.5)}px "Iowan Old Style","Georgia",serif`;
  a.ctx.textAlign = 'center';
  a.ctx.textBaseline = 'middle';
  a.ctx.globalAlpha = grow * pulse;
  a.ctx.shadowColor = s.accent;
  a.ctx.shadowBlur = 28;
  a.ctx.fillStyle = s.colour;
  a.ctx.fillText(s.glyph, cx, cy);
  a.ctx.shadowBlur = 0;
  a.ctx.restore();

  // Drifting tick-marks around the ring (slow rotation)
  a.ctx.save();
  a.ctx.translate(cx, cy);
  a.ctx.rotate(a.total * 0.18);
  a.ctx.fillStyle = withAlpha(s.colour, 0.7 * grow);
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const tx = Math.cos(ang) * r;
    const ty = Math.sin(ang) * r;
    a.ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
  }
  a.ctx.restore();

  colorGrade(a, s.colour, 0.06);
  vignette(a, 0.55);
}

// ─── Shot 2 — The Warden manifests ────────────────────────────────────
// Three-quarter view into the boss arena. Occult circle pulses on the
// floor (sphere-coloured), the Warden rises in the centre with bloom
// and camera shake at the apex.

function shotWardenManifests(a: ShotArgs, s: SphereDef): void {
  a.ctx.save();

  // Pre-rise tremble starts ~40% into the shot, peaks at ~70%.
  const p = clamp01(a.t / a.duration);
  const rise = easeOut(clamp01(p / 0.75));
  const tremble = clamp01((p - 0.35) / 0.4) * (1 - clamp01((p - 0.75) / 0.25));
  if (tremble > 0.05) applyShake(a, { magnitude: 1.5 + tremble * 2.5, freq: 26 });

  // Sky
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);
  nebula(a, a.width * 0.5, a.height * 0.3, a.height * 0.55, s.colour, 0.18);
  starfield(a, [FAR_STARS], 17);
  motes(a, 18, '155, 108, 255', 23);

  // Distant cosmic horizon
  const horizonY = a.height * 0.55;
  a.ctx.fillStyle = '#0a0420';
  a.ctx.fillRect(0, horizonY, a.width, a.height - horizonY);

  // Occult circle on the floor — drawn as a flattened ellipse (3/4 view)
  const cx = a.width / 2;
  const floorCy = a.height * 0.78;
  const circleR = a.height * 0.32;
  const cs = withAlpha(s.colour, 0.55 + 0.35 * Math.sin(a.total * 2.4));
  a.ctx.save();
  a.ctx.strokeStyle = cs;
  a.ctx.lineWidth = 2.5;
  // Outer ring
  a.ctx.beginPath();
  a.ctx.ellipse(cx, floorCy, circleR, circleR * 0.35, 0, 0, Math.PI * 2);
  a.ctx.stroke();
  // Inner ring
  a.ctx.strokeStyle = withAlpha(s.accent, 0.45);
  a.ctx.lineWidth = 1.5;
  a.ctx.beginPath();
  a.ctx.ellipse(cx, floorCy, circleR * 0.7, circleR * 0.7 * 0.35, 0, 0, Math.PI * 2);
  a.ctx.stroke();
  // Pentagram inscribed (flattened)
  a.ctx.strokeStyle = withAlpha(s.accent, 0.55 + 0.25 * Math.sin(a.total * 3));
  a.ctx.lineWidth = 1.5;
  a.ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const ang = ((i * 2) % 5) / 5 * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(ang) * circleR * 0.9;
    const py = floorCy + Math.sin(ang) * circleR * 0.9 * 0.35;
    if (i === 0) a.ctx.moveTo(px, py); else a.ctx.lineTo(px, py);
  }
  a.ctx.closePath();
  a.ctx.stroke();
  a.ctx.restore();

  // Cone of cold light rising from the circle
  const upG = a.ctx.createRadialGradient(cx, floorCy, 8, cx, floorCy, a.height * 0.45);
  upG.addColorStop(0, withAlpha(s.colour, 0.4 * rise));
  upG.addColorStop(1, withAlpha(s.colour, 0));
  a.ctx.save();
  a.ctx.globalCompositeOperation = 'lighter';
  a.ctx.fillStyle = upG;
  a.ctx.fillRect(cx - a.height * 0.45, floorCy - a.height * 0.45, a.height * 0.9, a.height * 0.45);
  a.ctx.restore();

  // The Warden rises from the centre — rendered with the gameplay
  // sprite. Pixel scale is set big for cinematic impact.
  const sz = getEnemySize('wardenBoss');
  const scale = Math.min(10, Math.max(5, a.height / 50));
  const bx = cx - (sz.w * scale) / 2;
  // Starts below the circle (in the void) and rises into the centre
  const riseFrom = floorCy + circleR * 0.2;
  const riseTo = floorCy - circleR * 0.15 - sz.h * scale * 0.55;
  const by = riseFrom + (riseTo - riseFrom) * rise;
  // Bloom around the Warden as it rises
  bloomPoint(a, cx, by + sz.h * scale * 0.45, sz.w * scale * 1.2, s.accent, 0.45 * rise);
  drawEnemy(a.ctx, 'wardenBoss', bx, by, scale, 0, false);

  // Crimson ward sigils on the arena edge — flare on rise
  a.ctx.fillStyle = withAlpha('#e23a4a', 0.5 * rise);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + a.total * 0.4;
    const sx = cx + Math.cos(ang) * circleR;
    const sy = floorCy + Math.sin(ang) * circleR * 0.35;
    a.ctx.fillRect(sx - 2, sy - 2, 4, 4);
  }

  a.ctx.restore(); // unshake

  colorGrade(a, s.colour, 0.10);
  vignette(a, 0.6);
}

// ─── Shot 3 — The threshold ──────────────────────────────────────────
// Tight crop. Doors slam shut on both sides, ward sigils flare red,
// the Warden looms behind. The surrender line resolves the beat.

function shotThreshold(a: ShotArgs, s: SphereDef): void {
  const p = clamp01(a.t / a.duration);
  const slam = easeIn(clamp01(p * 1.4));   // 0..1 — doors closing
  const flare = Math.max(0, 1 - Math.abs(p - 0.45) * 5); // flare peak

  // Backdrop — dark, with rim light from the offscreen Warden
  a.ctx.fillStyle = '#02010a';
  a.ctx.fillRect(0, 0, a.width, a.height);
  // Sphere-coloured rim light from above-centre (where the Warden looms)
  const rx = a.width / 2, ry = a.height * 0.3;
  bloomPoint(a, rx, ry, a.height * 0.7, s.colour, 0.5);

  // Two stone doors sliding in from each side
  const cx = a.width / 2;
  const doorTopY = a.height * 0.2;
  const doorBotY = a.height * 0.88;
  const doorH = doorBotY - doorTopY;
  const doorWMax = a.width * 0.45;
  const doorW = doorWMax * slam;

  // Left door
  a.ctx.fillStyle = '#1a0f2c';
  a.ctx.fillRect(0, doorTopY, doorW, doorH);
  a.ctx.fillStyle = '#3b265c';
  a.ctx.fillRect(2, doorTopY + 2, doorW - 4, doorH - 4);
  // Right door
  a.ctx.fillStyle = '#1a0f2c';
  a.ctx.fillRect(a.width - doorW, doorTopY, doorW, doorH);
  a.ctx.fillStyle = '#3b265c';
  a.ctx.fillRect(a.width - doorW + 2, doorTopY + 2, doorW - 4, doorH - 4);

  // Door edges (the gap between them)
  a.ctx.fillStyle = '#000';
  a.ctx.fillRect(doorW, doorTopY, 4, doorH);
  a.ctx.fillRect(a.width - doorW - 4, doorTopY, 4, doorH);

  // Vertical seam where they meet (only visible after they touch)
  if (slam >= 1) {
    a.ctx.fillStyle = withAlpha(s.accent, 0.6 + 0.4 * Math.sin(a.total * 6));
    a.ctx.fillRect(cx - 1, doorTopY, 2, doorH);
  }

  // Three crimson ward sigils slammed across each door — flare on impact
  const sigilColour = `rgba(226, 58, 74, ${0.5 + 0.5 * flare})`;
  a.ctx.fillStyle = sigilColour;
  for (let i = 0; i < 3; i++) {
    const sy = doorTopY + doorH * (0.25 + i * 0.3);
    a.ctx.fillRect(doorW - 22, sy - 4, 8, 8);
    a.ctx.fillRect(a.width - doorW + 14, sy - 4, 8, 8);
  }
  // Bloom on flare peak
  if (flare > 0.2) {
    for (let i = 0; i < 3; i++) {
      const sy = doorTopY + doorH * (0.25 + i * 0.3);
      bloomPoint(a, doorW - 18, sy, 14, '#e23a4a', flare * 0.6);
      bloomPoint(a, a.width - doorW + 18, sy, 14, '#e23a4a', flare * 0.6);
    }
  }

  // The Warden looms behind — silhouetted between the doors (visible until
  // doors fully close)
  if (slam < 1.0) {
    const sz = getEnemySize('wardenBoss');
    const scale = Math.min(8, Math.max(5, a.height / 60));
    const bx = cx - (sz.w * scale) / 2;
    const by = doorTopY + doorH * 0.18;
    drawEnemy(a.ctx, 'wardenBoss', bx, by, scale, 0, false);
  }

  colorGrade(a, s.colour, 0.08);
  vignette(a, 0.55);
}

// ─── Boss-intro shots for a given sphere ─────────────────────────────

export function bossIntroShots(sphereId: SphereId): Shot[] {
  const s = SPHERE_BY_ID[sphereId];
  const data = BOSS_INTROS[sphereId];
  return [
    {
      duration: 4.5,
      render: (a) => shotSphereApproach(a, s),
      subtitle: `${s.numeral} — ${s.name.toUpperCase()}    ·    ${s.godName}`,
    },
    {
      duration: 5.0,
      render: (a) => shotWardenManifests(a, s),
      subtitle: `${data.wardenName}  ·  ${data.epithet}`,
    },
    {
      duration: 3.5,
      render: (a) => shotThreshold(a, s),
      subtitle: data.surrender,
      source: 'Pimander I.25',
      holdSubtitle: true,
    },
  ];
}

export function bossIntroLength(sphereId: SphereId): number {
  return bossIntroShots(sphereId).reduce((acc, s) => acc + s.duration, 0);
}
