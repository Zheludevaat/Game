// Cinema transitions — shot-to-shot visual connectors.
//
// Each transition is a pure function that renders over the FULL
// viewport (including letterbox area) during the cross-cut window.
// Progress runs 0→1, where 0 = fully visible current shot and
// 1 = fully into the next shot.
//
// These replace the plain black-fade overlay when a Shot specifies
// an optional `transition` field.

export type TransitionType = 'irisIn' | 'irisOut' | 'radialWipe' | 'glitch' | 'dipToBlack';

export interface TransitionDef {
  type: TransitionType;
  duration?: number;   // ms, defaults to 400
  colour?: string;     // for iris/wipe matte colour, defaults to '#000'
}

export function renderTransition(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  letterbox: number,
  def: TransitionDef,
  progress: number,
): void {
  switch (def.type) {
    case 'irisOut':  return irisOut(ctx, W, H, letterbox, progress, def.colour);
    case 'irisIn':   return irisIn(ctx, W, H, letterbox, progress, def.colour);
    case 'radialWipe': return radialWipe(ctx, W, H, letterbox, progress, def.colour);
    case 'glitch':   return glitchTransition(ctx, W, H, letterbox, progress);
    case 'dipToBlack': return dipToBlack(ctx, W, H, letterbox, progress);
    default: return crossFade(ctx, W, H, letterbox, progress);
  }
}

// ─── Default cross-fade ─────────────────────────────────────────────

function crossFade(ctx: CanvasRenderingContext2D, W: number, H: number, _lb: number, p: number): void {
  ctx.fillStyle = `rgba(0,0,0,${p})`;
  ctx.fillRect(0, 0, W, H);
}

// ─── Iris Out — circle closes from edges ────────────────────────────

function irisOut(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  _lb: number,
  p: number,
  colour = '#000',
): void {
  const cx = W / 2, cy = H / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const r = maxR * (1 - easeOutQuad(p));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip('evenodd');
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ─── Iris In — circle opens from centre ─────────────────────────────

function irisIn(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  _lb: number,
  p: number,
  colour = '#000',
): void {
  const cx = W / 2, cy = H / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const r = easeOutQuad(p) * maxR;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip('evenodd');
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ─── Radial wipe — clock-like circular reveal ────────────────────────

function radialWipe(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  _lb: number,
  p: number,
  colour = '#000',
): void {
  const cx = W / 2, cy = H / 2;
  const r = Math.sqrt(cx * cx + cy * cy) + 40;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ─── Glitch — RGB split + horizontal noise bars ──────────────────────

function glitchTransition(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  _lb: number,
  p: number,
): void {
  ctx.save();

  const src = ctx.getImageData(0, 0, W, H);
  const shiftAmt = (1 - p) * 16 + 2;
  const seed = Math.floor(p * 100);

  // RGB channel offset
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Red channel shifted right
  drawShiftedChannel(ctx, src, W, H, shiftAmt, 0);
  // Green channel (normal position)
  ctx.putImageData(src, 0, 0);
  // Blue channel shifted left
  drawShiftedChannel(ctx, src, W, H, -shiftAmt, 2);

  ctx.globalAlpha = 0.7;
  ctx.putImageData(src, 0, 0);

  // Horizontal noise bars
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const barY = ((i * 137 + seed * 31) % H);
    const barH = 2 + ((i * 73 + seed * 17) % 8);
    const alpha = (1 - p) * (0.3 + (i % 3) * 0.15);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, barY, W, barH);
  }

  // Fade to black at end
  if (p > 0.7) {
    const fade = (p - 0.7) / 0.3;
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}

function drawShiftedChannel(
  ctx: CanvasRenderingContext2D,
  src: ImageData,
  W: number, H: number,
  shiftX: number,
  channel: number,
): void {
  const dst = ctx.createImageData(W, H);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const sx = Math.max(0, Math.min(W - 1, px + Math.round(shiftX)));
      const si = (py * W + sx) * 4;
      const di = (py * W + px) * 4;
      if (channel === 0) dst.data[di] = src.data[si];
      else if (channel === 2) dst.data[di + 2] = src.data[si + 2];
    }
  }
  ctx.putImageData(dst, 0, 0);
}

// ─── Dip to black — brief black then back ────────────────────────────

function dipToBlack(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  _lb: number,
  p: number,
): void {
  // 0→0.5 fades to black, 0.5→1 fades back
  const blackAlpha = p < 0.5 ? p * 2 : (1 - p) * 2;
  ctx.fillStyle = `rgba(0,0,0,${blackAlpha})`;
  ctx.fillRect(0, 0, W, H);
}

// ─── Easing ──────────────────────────────────────────────────────────

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
