/**
 * Small reusable pixel-art primitives used by the per-sphere floor /
 * wall motifs (V1) and the per-room-type overlays (V2). Each helper
 * does ONE small thing — a crack, a rivet, a moss patch — so the
 * sphere-specific draw paths can compose richer textures without
 * re-inventing geometry.
 *
 * All helpers accept the existing `tileHash`-style integer for
 * deterministic placement so the same room renders identically every
 * frame and across save/load.
 */

type Ctx = CanvasRenderingContext2D;

/** 2-3 pixel branching crack from (x, y) at a hashed angle. The hash
 *  picks one of four crack templates so cracks vary across the floor
 *  without each being authored individually. */
export function drawCrack(ctx: Ctx, x: number, y: number, hash: number, colour: string): void {
  ctx.fillStyle = colour;
  const kind = hash & 3;
  if (kind === 0) {
    ctx.fillRect(x, y,     4, 1);
    ctx.fillRect(x + 3, y + 1, 2, 1);
    ctx.fillRect(x + 4, y + 2, 1, 1);
  } else if (kind === 1) {
    ctx.fillRect(x,     y, 1, 4);
    ctx.fillRect(x + 1, y + 3, 1, 2);
    ctx.fillRect(x + 2, y + 4, 1, 1);
  } else if (kind === 2) {
    ctx.fillRect(x,     y, 3, 1);
    ctx.fillRect(x + 2, y + 1, 1, 2);
    ctx.fillRect(x + 3, y + 2, 2, 1);
  } else {
    ctx.fillRect(x,     y, 2, 1);
    ctx.fillRect(x + 1, y + 1, 2, 1);
    ctx.fillRect(x + 2, y + 2, 2, 1);
    ctx.fillRect(x + 3, y + 3, 1, 1);
  }
}

/** 2×2 metal rivet with a 1-px highlight pip. Mercury / Jupiter wear
 *  these on every other tile. */
export function drawRivet(ctx: Ctx, x: number, y: number, colour: string): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, 3, 3);
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, 2, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(x, y, 1, 1);
}

/** 3×3 pseudo-random rune from a 6-entry table. Tiny enough to read as
 *  carved detail at room scale; rare placement keeps it from cluttering. */
export function drawMicroRune(ctx: Ctx, x: number, y: number, hash: number, colour: string): void {
  ctx.fillStyle = colour;
  const k = hash % 6;
  if (k === 0) {
    // dot triangle
    ctx.fillRect(x + 1, y,     1, 1);
    ctx.fillRect(x,     y + 2, 1, 1);
    ctx.fillRect(x + 2, y + 2, 1, 1);
  } else if (k === 1) {
    // vertical bar + cap
    ctx.fillRect(x + 1, y, 1, 3);
    ctx.fillRect(x,     y, 3, 1);
  } else if (k === 2) {
    // plus
    ctx.fillRect(x + 1, y,     1, 3);
    ctx.fillRect(x,     y + 1, 3, 1);
  } else if (k === 3) {
    // diagonal
    ctx.fillRect(x,     y,     1, 1);
    ctx.fillRect(x + 1, y + 1, 1, 1);
    ctx.fillRect(x + 2, y + 2, 1, 1);
  } else if (k === 4) {
    // arc
    ctx.fillRect(x,     y + 1, 1, 1);
    ctx.fillRect(x + 1, y,     1, 1);
    ctx.fillRect(x + 2, y + 1, 1, 1);
  } else {
    // bracket
    ctx.fillRect(x,     y,     1, 3);
    ctx.fillRect(x + 1, y,     1, 1);
    ctx.fillRect(x + 1, y + 2, 1, 1);
  }
}

/** 4-pixel organic blob — Saturn floor moss, sanctuary mossy stones. */
export function drawMossPatch(ctx: Ctx, x: number, y: number, hash: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.fillRect(x + 1, y,     2, 1);
  ctx.fillRect(x,     y + 1, 3, 1);
  ctx.fillRect(x + (hash & 1), y + 2, 2, 1);
}

/** Small archimedean spiral — sun floor / sanctuary inlay. Five
 *  segments approximate one turn. */
export function drawSpiral(ctx: Ctx, cx: number, cy: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.fillRect(cx,     cy,     1, 1);
  ctx.fillRect(cx + 1, cy,     1, 1);
  ctx.fillRect(cx + 1, cy - 1, 1, 1);
  ctx.fillRect(cx,     cy - 1, 1, 1);
  ctx.fillRect(cx - 1, cy - 1, 1, 1);
  ctx.fillRect(cx - 1, cy,     1, 1);
  ctx.fillRect(cx - 1, cy + 1, 1, 1);
  ctx.fillRect(cx,     cy + 1, 1, 1);
  ctx.fillRect(cx + 1, cy + 1, 1, 1);
  ctx.fillRect(cx + 2, cy + 1, 1, 1);
}

/** Sooty scorch mark — trap rooms, around hazards. Uses additive
 *  alpha so it darkens whatever floor tile sits underneath. */
export function drawScorch(ctx: Ctx, x: number, y: number, hash: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.fillRect(x + 1, y,     2, 1);
  ctx.fillRect(x,     y + 1, 4, 1);
  ctx.fillRect(x,     y + 2, 4, 1);
  ctx.fillRect(x + 1, y + 3, 2, 1);
  if (hash & 1) {
    ctx.fillRect(x + 4, y + 1, 1, 1);
  }
}

/** 5-line corner cobweb — secret rooms get four (one per corner). */
export function drawCobweb(ctx: Ctx, x: number, y: number, colour: string, size = 16): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Three radial strands
  ctx.moveTo(x, y); ctx.lineTo(x + size,     y + size / 2);
  ctx.moveTo(x, y); ctx.lineTo(x + size / 2, y + size);
  ctx.moveTo(x, y); ctx.lineTo(x + size,     y + size);
  // Two cross-strands
  ctx.moveTo(x + 4, y + 2); ctx.lineTo(x + 2, y + 4);
  ctx.moveTo(x + 6, y + 4); ctx.lineTo(x + 4, y + 6);
  ctx.stroke();
}

/** Radial gradient stop — hearth glow under the start-room centre,
 *  treasure-glow under chests, etc. Caller is expected to be in an
 *  appropriate composite operation (additive for warmth). */
export function drawHearthGlow(ctx: Ctx, x: number, y: number, radius: number, colour: string): void {
  const grad = ctx.createRadialGradient(x, y, 2, x, y, radius);
  grad.addColorStop(0, colour);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/** Faint silver wave-line (Moon floor). Two short staggered strokes
 *  read as a tide ripple at tile scale. */
export function drawTideRipple(ctx: Ctx, x: number, y: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.fillRect(x,     y, 3, 1);
  ctx.fillRect(x + 3, y - 1, 3, 1);
  ctx.fillRect(x + 6, y, 2, 1);
}

/** Three-pixel petal cluster (Venus floor). */
export function drawPetalCluster(ctx: Ctx, x: number, y: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.fillRect(x + 1, y,     1, 1);
  ctx.fillRect(x,     y + 1, 1, 1);
  ctx.fillRect(x + 2, y + 1, 1, 1);
  ctx.fillRect(x + 1, y + 2, 1, 1);
}

/** Short blade-slash (Mars floor / wall). Diagonal 4-px slash. */
export function drawSlash(ctx: Ctx, x: number, y: number, hash: number, colour: string): void {
  ctx.fillStyle = colour;
  const lean = hash & 1;
  if (lean) {
    ctx.fillRect(x,     y + 3, 1, 1);
    ctx.fillRect(x + 1, y + 2, 1, 1);
    ctx.fillRect(x + 2, y + 1, 1, 1);
    ctx.fillRect(x + 3, y,     1, 1);
  } else {
    ctx.fillRect(x,     y,     1, 1);
    ctx.fillRect(x + 1, y + 1, 1, 1);
    ctx.fillRect(x + 2, y + 2, 1, 1);
    ctx.fillRect(x + 3, y + 3, 1, 1);
  }
}

/** Cog imprint (Jupiter floor). Tiny 5×5 gear silhouette. */
export function drawCog(ctx: Ctx, x: number, y: number, colour: string): void {
  ctx.fillStyle = colour;
  // central body
  ctx.fillRect(x + 1, y + 1, 3, 3);
  // teeth
  ctx.fillRect(x + 2, y,     1, 1);
  ctx.fillRect(x + 2, y + 4, 1, 1);
  ctx.fillRect(x,     y + 2, 1, 1);
  ctx.fillRect(x + 4, y + 2, 1, 1);
}

/** 4-point starburst (Ogdoad floor / wall) — bright tetragram. */
export function drawStarburst(ctx: Ctx, cx: number, cy: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.fillRect(cx,     cy,     1, 1);
  ctx.fillRect(cx - 2, cy,     1, 1);
  ctx.fillRect(cx + 2, cy,     1, 1);
  ctx.fillRect(cx,     cy - 2, 1, 1);
  ctx.fillRect(cx,     cy + 2, 1, 1);
  // soft inner cross
  ctx.fillRect(cx - 1, cy,     1, 1);
  ctx.fillRect(cx + 1, cy,     1, 1);
  ctx.fillRect(cx,     cy - 1, 1, 1);
  ctx.fillRect(cx,     cy + 1, 1, 1);
}
