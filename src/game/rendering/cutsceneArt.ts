// Procedural backdrops for cutscenes. Each renderer is a pure function
// of (ctx, width, height, beatT, totalT). They share the project's
// palette and the same layering rules as the gameplay renderer — no
// external assets.

import { drawTorch, drawInitiate } from './PixelArt';

export interface BackdropArgs {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  beatT: number;
  totalT: number;
}

// ─── PRE-MENU: TABULA SMARAGDINA ─────────────────────────────────────

/** Beat 1 — a single eight-pointed star fades in centered, pulses once. */
export function drawTabulaStar(a: BackdropArgs): void {
  const { ctx, width: W, height: H, beatT } = a;
  const cx = W / 2, cy = H * 0.48;
  const fade = clamp01(beatT / 1.2);
  const pulse = beatT > 2 ? Math.max(0, 1 - (beatT - 2) / 0.6) : 0;
  const halo = ctx.createRadialGradient(cx, cy, 8, cx, cy, 220);
  halo.addColorStop(0, `rgba(255, 247, 214, ${0.85 * fade + 0.2 * pulse})`);
  halo.addColorStop(0.4, `rgba(244, 210, 122, ${0.4 * fade + 0.15 * pulse})`);
  halo.addColorStop(1, 'rgba(244, 210, 122, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - 220, cy - 220, 440, 440);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = `rgba(255, 247, 214, ${fade})`;
  // Cardinal rays
  ctx.fillRect(-1.5, -34 * (0.6 + 0.4 * fade), 3, 68 * (0.6 + 0.4 * fade));
  ctx.fillRect(-34 * (0.6 + 0.4 * fade), -1.5, 68 * (0.6 + 0.4 * fade), 3);
  // Diagonals (rotated 45°)
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-1.5, -24 * (0.5 + 0.4 * fade), 3, 48 * (0.5 + 0.4 * fade));
  ctx.fillRect(-24 * (0.5 + 0.4 * fade), -1.5, 48 * (0.5 + 0.4 * fade), 3);
  ctx.restore();
}

/** Beat 2 — a single torch in a wall niche; hooded Initiate stands below. */
export function drawTabulaNiche(a: BackdropArgs): void {
  const { ctx, width: W, height: H, beatT, totalT } = a;
  const fade = clamp01(beatT / 1.0);
  const cx = W / 2, cy = H * 0.55;

  // Wall niche — dark arch
  ctx.fillStyle = `rgba(10, 4, 22, ${0.85 * fade})`;
  ctx.fillRect(cx - 32, cy - 80, 64, 100);
  ctx.fillStyle = `rgba(60, 38, 92, ${0.55 * fade})`;
  ctx.fillRect(cx - 30, cy - 78, 60, 96);
  ctx.fillStyle = `rgba(20, 12, 40, ${0.7 * fade})`;
  ctx.fillRect(cx - 24, cy - 72, 48, 88);

  // Torch in the niche
  ctx.globalAlpha = fade;
  drawTorch(ctx, cx - 2, cy - 28, totalT);
  ctx.globalAlpha = 1;

  // Initiate below the niche (the existing player sprite)
  // Scaled 3× for a more cinematic foreground.
  const bob = Math.floor(Math.sin(totalT * 1.4) * 0.6);
  ctx.globalAlpha = fade;
  drawInitiate(ctx, Math.floor(cx - 21), Math.floor(cy + 32 + bob), 3, { x: 0, y: -1 }, totalT * 0.5, 0);
  ctx.globalAlpha = 1;
}

/** Beat 3 — seven lamps light in sequence above, then dim together. */
export function drawTabulaSevenLamps(a: BackdropArgs): void {
  const { ctx, width: W, height: H, beatT, totalT } = a;
  const cy = H * 0.32;
  const cx = W / 2;
  const spacing = Math.min(82, Math.max(48, W / 11));
  const lightDur = 0.4;          // per-lamp ignite
  const dimAt = 3.0;             // beat-time when all lamps blink out
  for (let i = 0; i < 7; i++) {
    const x = cx + (i - 3) * spacing;
    const litT = beatT - i * lightDur;
    let alpha = clamp01(litT / 0.35);
    if (beatT > dimAt) alpha = clamp01(1 - (beatT - dimAt) / 0.45);
    if (alpha <= 0) continue;
    const flick = 0.75 + Math.sin(totalT * 3 + i) * 0.2;
    // halo
    const h = ctx.createRadialGradient(x, cy, 2, x, cy, 28);
    h.addColorStop(0, `rgba(255, 230, 163, ${0.6 * alpha * flick})`);
    h.addColorStop(1, 'rgba(244, 210, 122, 0)');
    ctx.fillStyle = h;
    ctx.beginPath(); ctx.arc(x, cy, 28, 0, Math.PI * 2); ctx.fill();
    // bracket
    ctx.fillStyle = `rgba(59, 38, 92, ${alpha})`;
    ctx.fillRect(x - 1, cy + 4, 2, 10);
    ctx.fillRect(x - 5, cy + 13, 10, 2);
    // flame
    const fh = 7 + Math.sin(totalT * 5 + i) * 1.4;
    ctx.fillStyle = `rgba(244, 210, 122, ${0.9 * alpha * flick})`;
    ctx.beginPath(); ctx.ellipse(x, cy, 4, fh, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255, 230, 163, ${alpha})`;
    ctx.beginPath(); ctx.ellipse(x, cy + 1, 1.8, fh * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255, 247, 214, ${alpha})`;
    ctx.fillRect(x - 1, cy - 1, 2, 2);
  }
}

// ─── BOSS INTRO: GENERIC WARDEN MANIFESTATION ────────────────────────

interface BossIntroContext {
  glyph: string;          // the sphere's planetary glyph
  glyphColour: string;
  accentColour: string;
}

/** Beat 1 — large planetary glyph rises centred with a halo + a starfield
 * rotating slowly around it. Glyph types in letter by letter from a beat
 * timer's perspective; this is a single-character glyph though so we
 * just fade it in. */
export function drawBossSphereGlyph(ctxArgs: BackdropArgs, ctx2: BossIntroContext): void {
  const { ctx, width: W, height: H, beatT, totalT } = ctxArgs;
  const cx = W / 2, cy = H * 0.46;
  const fade = clamp01(beatT / 0.8);

  // Slowly rotating outer ring of star ticks
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(totalT * 0.18);
  ctx.fillStyle = `rgba(255, 247, 214, ${0.5 * fade})`;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = 130;
    ctx.fillRect(Math.cos(a) * r - 1, Math.sin(a) * r - 1, 2, 2);
  }
  ctx.restore();

  // Halo around the glyph
  const h = ctx.createRadialGradient(cx, cy, 4, cx, cy, 140);
  h.addColorStop(0, withAlphaHex(ctx2.glyphColour, 0.55 * fade));
  h.addColorStop(0.5, withAlphaHex(ctx2.glyphColour, 0.22 * fade));
  h.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = h;
  ctx.beginPath(); ctx.arc(cx, cy, 140, 0, Math.PI * 2); ctx.fill();

  // The big glyph itself — text-based (DejaVu / Iowan covers the
  // planetary unicode characters)
  ctx.save();
  ctx.font = 'bold 96px "Iowan Old Style","Georgia",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ctx2.glyphColour;
  ctx.globalAlpha = fade;
  ctx.shadowColor = ctx2.accentColour;
  ctx.shadowBlur = 24;
  ctx.fillText(ctx2.glyph, cx, cy);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Beat 2 — the boss's occult circle expands behind a pulsing silhouette. */
export function drawBossOccultCircle(ctxArgs: BackdropArgs, ctx2: BossIntroContext): void {
  const { ctx, width: W, height: H, beatT, totalT } = ctxArgs;
  const cx = W / 2, cy = H * 0.5;
  const t = clamp01(beatT / 0.8);
  const r = 100 + t * 40;

  // Halo behind
  const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.4);
  halo.addColorStop(0, withAlphaHex(ctx2.accentColour, 0.18));
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 1.5, cy - r * 1.5, r * 3, r * 3);

  // Outer ring + rotating ticks
  ctx.strokeStyle = withAlphaHex(ctx2.glyphColour, 0.85);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = withAlphaHex(ctx2.glyphColour, 0.65);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + totalT * 0.22;
    const gx = cx + Math.cos(a) * r;
    const gy = cy + Math.sin(a) * r;
    ctx.fillRect(gx - 2, gy - 2, 4, 4);
  }

  // Pentagram inscribed
  ctx.strokeStyle = withAlphaHex(ctx2.accentColour, 0.6 + Math.sin(totalT * 2.4) * 0.18);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = ((i * 2) % 5) / 5 * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * (r * 0.92);
    const y = cy + Math.sin(a) * (r * 0.92);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // Centre pulsing diamond — the throne
  const pulse = 0.6 + 0.4 * Math.sin(totalT * 3);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = withAlphaHex(ctx2.accentColour, 0.8 * pulse);
  ctx.fillRect(-10, -10, 20, 20);
  ctx.restore();
}

/** Beat 3 — the warden's threshold: a single rune mark + slight shake. */
export function drawBossThreshold(ctxArgs: BackdropArgs, ctx2: BossIntroContext): void {
  const { ctx, width: W, height: H, beatT, totalT } = ctxArgs;
  const cx = W / 2, cy = H * 0.55;
  const fade = clamp01(beatT / 0.6);
  // Shake offset so the floor feels like it's vibrating
  const shake = 2 * Math.sin(totalT * 38);

  // Dark floor band
  ctx.fillStyle = `rgba(10, 4, 22, ${0.85 * fade})`;
  ctx.fillRect(cx - 200, cy - 60 + shake, 400, 120);

  // Single rune mark — circle + cross + sphere accent
  ctx.strokeStyle = withAlphaHex(ctx2.accentColour, fade);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy + shake, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = withAlphaHex(ctx2.glyphColour, fade);
  ctx.fillRect(cx - 1, cy - 18 + shake, 2, 36);
  ctx.fillRect(cx - 18, cy - 1 + shake, 36, 2);
  // Centre rune
  ctx.fillStyle = withAlphaHex(ctx2.accentColour, fade);
  ctx.fillRect(cx - 3, cy - 3 + shake, 6, 6);
}

// ─── helpers ─────────────────────────────────────────────────────────

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }
function withAlphaHex(hex: string, a: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
