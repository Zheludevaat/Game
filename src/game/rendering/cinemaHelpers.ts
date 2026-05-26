// Cinema helpers — reusable rendering utilities used by every shot of
// every film. These give the cinematics a consistent visual language:
// vignette on every frame, parallax starfields with depth, color grading
// passes, drifting "spirit motes", silhouetted foreground silhouettes,
// dust haze, camera shake.
//
// All helpers operate on the shot's visible frame (the area inside the
// letterbox bars). The ShotArgs `width` / `height` are already that
// inner frame, so coordinates are relative to (0, 0) at top-left of
// the visible area.

import { ShotArgs } from '../../components/CinematicShort';

// ─── Curves & helpers ────────────────────────────────────────────────

export function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }
export function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
export function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3); }
export function easeIn(t: number): number { return t * t * t; }
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
export function wrap01(v: number): number { return ((v % 1) + 1) % 1; }

export function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`;
}

// ─── Camera shake (subtle, used at peaks) ────────────────────────────

export interface ShakeOpts { magnitude: number; freq?: number; }
export function applyShake(a: ShotArgs, opts: ShakeOpts): void {
  const f = opts.freq ?? 24;
  const m = opts.magnitude;
  // Pseudo-random but deterministic per frame
  const x = Math.sin(a.total * f * 13 + 0.7) * m;
  const y = Math.cos(a.total * f * 17 + 1.3) * m;
  a.ctx.translate(x, y);
}

// ─── Vignette — applied last, dark edges ─────────────────────────────

export function vignette(a: ShotArgs, strength = 0.55, inner = 0.25): void {
  const cx = a.width / 2, cy = a.height / 2;
  const r0 = Math.min(a.width, a.height) * inner;
  const r1 = Math.max(a.width, a.height) * 0.8;
  const g = a.ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  a.ctx.fillStyle = g;
  a.ctx.fillRect(0, 0, a.width, a.height);
}

// ─── Color grade — full-screen tint overlay (multiply-style) ─────────

export function colorGrade(a: ShotArgs, hex: string, strength = 0.18): void {
  a.ctx.save();
  a.ctx.globalCompositeOperation = 'multiply';
  a.ctx.fillStyle = withAlpha(hex, 1);
  a.ctx.globalAlpha = strength;
  a.ctx.fillRect(0, 0, a.width, a.height);
  a.ctx.restore();
}

// Soft bloom — additive overlay of a blurry version of the bright
// areas. Cheap fake: a large semi-transparent radial gradient over a
// bright point that "bleeds" outward.

export function bloomPoint(a: ShotArgs, x: number, y: number, radius: number, colour: string, intensity: number): void {
  const g = a.ctx.createRadialGradient(x, y, 1, x, y, radius);
  g.addColorStop(0, withAlpha(colour, 0.7 * intensity));
  g.addColorStop(0.5, withAlpha(colour, 0.3 * intensity));
  g.addColorStop(1, withAlpha(colour, 0));
  a.ctx.save();
  a.ctx.globalCompositeOperation = 'lighter';
  a.ctx.fillStyle = g;
  a.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  a.ctx.restore();
}

// ─── Parallax starfield with depth layers ────────────────────────────

export interface StarLayer {
  count: number;
  speed: number;     // horizontal drift, CSS px / s
  parallaxY: number; // vertical drift
  hue: string;       // "r, g, b" string
  size: number;      // pixel size
}

export function starfield(a: ShotArgs, layers: StarLayer[], seed = 1): void {
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    for (let i = 0; i < L.count; i++) {
      // Deterministic positions per layer
      const sx = ((i * 7919 + seed * 31 + li * 137) % 233280) / 233280;
      const sy = ((i * 5077 + seed * 11 + li * 313) % 233280) / 233280;
      const x = wrap01(sx + a.total * L.speed * 0.0008) * a.width;
      const y = wrap01(sy + a.total * L.parallaxY * 0.0006) * a.height;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(a.total * 1.2 + i * 0.13 + li));
      a.ctx.fillStyle = `rgba(${L.hue}, ${0.4 * tw})`;
      a.ctx.fillRect(x, y, L.size, L.size);
    }
  }
}

// ─── Drifting "spirit" motes — slow ambient particles ────────────────

export function motes(a: ShotArgs, count: number, hue: string, seed = 1): void {
  for (let i = 0; i < count; i++) {
    const sx = ((i * 9931 + seed * 19) % 233280) / 233280;
    const sy = ((i * 3331 + seed * 23) % 233280) / 233280;
    const phase = (i * 0.27) + a.total * 0.4;
    const wobble = Math.sin(phase) * 30;
    const lift = (a.total * 12 + i * 60) % (a.height + 200);
    const x = sx * a.width + wobble;
    const y = a.height - lift; // float up from bottom
    const fade = Math.max(0, Math.min(1, lift / 100)) * Math.max(0, 1 - lift / a.height);
    a.ctx.fillStyle = `rgba(${hue}, ${0.5 * fade})`;
    a.ctx.fillRect(x, y, 2, 2);
  }
}

// ─── Drifting nebula clouds — large slow-moving haze ─────────────────

export function nebula(
  a: ShotArgs,
  cx: number, cy: number,
  radius: number,
  colour: string,
  intensity = 0.18,
  driftX = 0, driftY = 0,
): void {
  const x = cx + a.total * driftX;
  const y = cy + a.total * driftY;
  const g = a.ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, withAlpha(colour, intensity));
  g.addColorStop(0.5, withAlpha(colour, intensity * 0.4));
  g.addColorStop(1, withAlpha(colour, 0));
  a.ctx.save();
  a.ctx.globalCompositeOperation = 'lighter';
  a.ctx.fillStyle = g;
  a.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  a.ctx.restore();
}

// ─── Ground mist — soft fog band on the horizon ──────────────────────

export function groundMist(a: ShotArgs, horizonY: number, height: number, colour = '60, 38, 92'): void {
  const g = a.ctx.createLinearGradient(0, horizonY - height * 0.2, 0, horizonY + height);
  g.addColorStop(0, `rgba(${colour}, 0)`);
  g.addColorStop(0.4, `rgba(${colour}, 0.35)`);
  g.addColorStop(1, `rgba(${colour}, 0)`);
  a.ctx.fillStyle = g;
  a.ctx.fillRect(0, horizonY - height * 0.2, a.width, height);
  // Soft horizontal drift bands
  for (let i = 0; i < 3; i++) {
    const bandY = horizonY + Math.sin(a.total * 0.5 + i) * 10 - i * 4;
    a.ctx.fillStyle = `rgba(${colour}, ${0.05 + 0.05 * Math.sin(a.total + i * 1.4)})`;
    a.ctx.fillRect(0, bandY, a.width, 16);
  }
}

// ─── Foreground silhouettes ───────────────────────────────────────────
// Used for parallax depth. A silhouetted broken column, a banner, a
// brazier — drawn black on top of the scene at small parallax offsets.

export function brokenColumn(
  a: ShotArgs,
  baseX: number, baseY: number,
  height: number,
  brokenAt: number = 0.7,
): void {
  const colW = 22;
  const top = baseY - height;
  const brk = baseY - height * brokenAt;
  // Pillar base
  a.ctx.fillStyle = '#000';
  a.ctx.fillRect(baseX - colW / 2 - 4, baseY - 6, colW + 8, 6);
  a.ctx.fillStyle = '#0a0420';
  a.ctx.fillRect(baseX - colW / 2 - 2, baseY - 12, colW + 4, 8);
  // Pillar shaft
  a.ctx.fillStyle = '#0a0420';
  a.ctx.fillRect(baseX - colW / 2, brk, colW, baseY - 12 - brk);
  // Vertical fluting (light/dark stripes)
  a.ctx.fillStyle = '#1a0f2c';
  a.ctx.fillRect(baseX - colW / 2 + 2, brk + 4, 2, baseY - 16 - brk);
  a.ctx.fillRect(baseX, brk + 4, 2, baseY - 16 - brk);
  a.ctx.fillRect(baseX + colW / 2 - 4, brk + 4, 2, baseY - 16 - brk);
  // Broken top edge — jagged
  a.ctx.fillStyle = '#000';
  a.ctx.beginPath();
  a.ctx.moveTo(baseX - colW / 2, brk);
  a.ctx.lineTo(baseX - colW / 4, brk - 4);
  a.ctx.lineTo(baseX - 2, brk - 1);
  a.ctx.lineTo(baseX + 4, brk - 6);
  a.ctx.lineTo(baseX + colW / 2 - 2, brk - 2);
  a.ctx.lineTo(baseX + colW / 2, brk);
  a.ctx.closePath();
  a.ctx.fill();
  // A loose stone falling/floating near the column top
  a.ctx.fillStyle = '#0a0420';
  a.ctx.fillRect(baseX + colW / 2 + 4, top + 28, 8, 6);
  // Silhouette of dust at the base
  a.ctx.fillStyle = 'rgba(0,0,0,0.6)';
  a.ctx.fillRect(baseX - colW / 2 - 10, baseY - 2, colW + 20, 4);
}

// ─── Title text — bold cinematic block ───────────────────────────────

export function cinemaText(
  a: ShotArgs,
  text: string,
  x: number, y: number,
  size: number,
  alpha: number,
  colour = '#f4d27a',
): void {
  a.ctx.save();
  a.ctx.font = `bold ${size}px "Iowan Old Style","Georgia",serif`;
  a.ctx.textAlign = 'center';
  a.ctx.textBaseline = 'middle';
  a.ctx.shadowColor = '#000';
  a.ctx.shadowBlur = 8;
  a.ctx.fillStyle = withAlpha(colour, alpha);
  a.ctx.fillText(text, x, y);
  a.ctx.shadowBlur = 0;
  a.ctx.restore();
}

// ─── Cross-fade letterbox (black bars rendered IN-FRAME instead of
//     by the player). Useful when a shot needs a different aspect ratio. */

export function innerLetterbox(a: ShotArgs, barFrac: number): void {
  const bar = a.height * barFrac;
  a.ctx.fillStyle = '#000';
  a.ctx.fillRect(0, 0, a.width, bar);
  a.ctx.fillRect(0, a.height - bar, a.width, bar);
}
