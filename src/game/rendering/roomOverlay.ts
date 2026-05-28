/**
 * Per-room-type mood overlay. Painted AFTER the floor tiles and BEFORE
 * props so the room-type identity is woven into the floor (bone scatter,
 * scorch, cobwebs) rather than floating on top of props.
 *
 * Each room type used to look identical to a regular `enemy` room
 * (same floor, same walls, same 4 torches, just a different
 * interactable at the centre). This layer adds converging signals so
 * the type reads at a glance:
 *
 *   - sanctuary  bright soft inlay + brazier glow (safe)
 *   - locked     bone scatter + scratched-wall band (looted/cursed)
 *   - trap       scorched centre + warning sigils (danger)
 *   - secret     corner cobwebs + faint floor glyph (rare-find payoff)
 *   - start      warm hearth-glow patch (orientation)
 *   - treasure   gold pool under chest + stray coin glints
 *   - miniBoss   four corner urns + accent floor border
 *
 * The dispatcher is exhaustive on the relevant types; `enemy`, `boss`,
 * `exit`, `shrine` are deliberately omitted — their centre features
 * (pentagram, 7 lamps, stairs, altar) already differentiate them.
 */

import { Room } from '../GameTypes';
import { ROOM_H, ROOM_W } from '../constants';
import {
  drawScorch, drawCobweb, drawHearthGlow, drawMossPatch,
  drawMicroRune,
} from './PixelArtUtils';
import type { SphereDef } from '../data/spheres';

type Ctx = CanvasRenderingContext2D;

export function drawRoomTypeOverlay(
  ctx: Ctx,
  room: Room,
  sphere: SphereDef,
  t: number,
): void {
  switch (room.type) {
    case 'start':     drawStartOverlay(ctx, sphere, t); break;
    case 'locked':    drawLockedOverlay(ctx, room.seed, sphere); break;
    case 'trap':      drawTrapOverlay(ctx, room.seed, sphere, t); break;
    case 'sanctuary': drawSanctuaryOverlay(ctx, sphere, t); break;
    case 'secret':    drawSecretOverlay(ctx, sphere); break;
    case 'miniBoss':  drawMiniBossOverlay(ctx, sphere, t); break;
    case 'treasure':  drawTreasureOverlay(ctx, sphere, t); break;
    // enemy / boss / exit / shrine omitted on purpose.
  }
}

// ─── start ──────────────────────────────────────────────────────────
// The first room of a run — warm welcoming light + bone-coloured "I"
// inlay so the player has an orientation anchor when they look back.

function drawStartOverlay(ctx: Ctx, sphere: SphereDef, t: number): void {
  const cx = ROOM_W / 2, cy = ROOM_H / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  // 0.32 base alpha so the warm-gold patch survives the sphere
  // multiply pass that paints later — at 0.18 the hearth was almost
  // invisible on Saturn / Moon floors.
  drawHearthGlow(ctx, cx, cy, 80, `rgba(244, 210, 122, ${0.32 + 0.06 * Math.sin(t * 1.5)})`);
  ctx.restore();
  // "I" sigil inlay — bone colour, low alpha
  ctx.fillStyle = 'rgba(245, 239, 216, 0.32)';
  ctx.fillRect(cx - 1, cy - 12, 2, 24);
  ctx.fillRect(cx - 4, cy - 12, 8, 2);
  ctx.fillRect(cx - 4, cy + 10, 8, 2);
  // Sphere accent halo dots flanking
  ctx.fillStyle = sphere.accent;
  ctx.globalAlpha = 0.4;
  ctx.fillRect(cx - 18, cy, 2, 2);
  ctx.fillRect(cx + 16, cy, 2, 2);
  ctx.globalAlpha = 1;
}

// ─── locked ─────────────────────────────────────────────────────────
// Looted / cursed feel — bone scatter on the floor + wall scratch
// bands. Players entering should feel "something happened here."

function drawLockedOverlay(ctx: Ctx, seed: number, sphere: SphereDef): void {
  // Deterministic bone-scatter via the room seed so backtracking shows
  // the same arrangement. Six bones at hashed positions.
  ctx.fillStyle = 'rgba(245, 239, 216, 0.6)';
  for (let i = 0; i < 8; i++) {
    const h = (seed * 1597 + i * 2719) >>> 0;
    const bx = 60 + (h % (ROOM_W - 120));
    const by = 60 + ((h >>> 8) % (ROOM_H - 120));
    const horizontal = h & 1;
    if (horizontal) {
      ctx.fillRect(bx,     by, 6, 2);
      ctx.fillRect(bx - 1, by - 1, 2, 4);
      ctx.fillRect(bx + 5, by - 1, 2, 4);
    } else {
      ctx.fillRect(bx, by, 2, 6);
      ctx.fillRect(bx - 1, by - 1, 4, 2);
      ctx.fillRect(bx - 1, by + 5, 4, 2);
    }
  }
  // Wall scratch band — scratches along the lower edge of the top wall
  ctx.fillStyle = 'rgba(50, 30, 70, 0.55)';
  for (let i = 0; i < 6; i++) {
    const sx = 50 + i * 70 + ((seed >>> i) & 7);
    ctx.fillRect(sx, 14, 4, 1);
    ctx.fillRect(sx + 4, 13, 2, 1);
  }
  // Sphere wallSigil scratched into the floor at hashed positions
  for (let i = 0; i < 3; i++) {
    const h = (seed * 31 + i * 101) >>> 0;
    const sx = 80 + (h % (ROOM_W - 160));
    const sy = 80 + ((h >>> 8) % (ROOM_H - 160));
    drawMicroRune(ctx, sx, sy, h, sphere.wallSigil);
  }
}

// ─── trap ───────────────────────────────────────────────────────────
// Scorched centre + four compass warning sigils. The scorch reads as
// "something burned here recently"; the sigils warn before you step in.

function drawTrapOverlay(ctx: Ctx, seed: number, sphere: SphereDef, t: number): void {
  const cx = ROOM_W / 2, cy = ROOM_H / 2;
  // Scorch ring — scattered sooty patches in a 40-px radius
  for (let i = 0; i < 12; i++) {
    const h = (seed * 8191 + i * 6271) >>> 0;
    const a = (h % 360) * Math.PI / 180;
    const r = 18 + (h % 24);
    drawScorch(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, h, 'rgba(20, 10, 4, 0.55)');
  }
  // Four compass warning sigils — pulse with the sphere's accent
  const pulse = 0.45 + 0.25 * Math.sin(t * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = sphere.accent;
  for (const [dx, dy] of [[0, -36], [0, 36], [-44, 0], [44, 0]] as const) {
    ctx.fillRect(cx + dx - 4, cy + dy - 1, 8, 2);
    ctx.fillRect(cx + dx - 1, cy + dy - 4, 2, 8);
  }
  ctx.restore();
}

// ─── sanctuary ──────────────────────────────────────────────────────
// Safe-room feel — bright sphere-accent inlay + soft brazier glow.
// Lighter ambient is applied by the engine via the room-mood nudge.

function drawSanctuaryOverlay(ctx: Ctx, sphere: SphereDef, t: number): void {
  const cx = ROOM_W / 2, cy = ROOM_H / 2;
  // Brazier glow — warm pulse at the centre
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  // 0.30 base — the brazier needs to register as "this is sanctuary"
  // through the sphere multiply that paints after. 0.16 was getting
  // crushed to invisible on Saturn / Moon.
  drawHearthGlow(ctx, cx, cy, 70, `rgba(244, 210, 122, ${0.30 + 0.06 * Math.sin(t * 2)})`);
  ctx.restore();
  // Sphere-accent diamond inlay around the brazier — four short bars
  ctx.fillStyle = sphere.accent;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(cx - 1, cy - 30, 2, 6);
  ctx.fillRect(cx - 1, cy + 24, 2, 6);
  ctx.fillRect(cx - 30, cy - 1, 6, 2);
  ctx.fillRect(cx + 24, cy - 1, 6, 2);
  ctx.globalAlpha = 1;
  // Moss patches at the corners — peaceful overgrowth
  drawMossPatch(ctx, 36, 36, 1,  'rgba(90, 139, 80, 0.45)');
  drawMossPatch(ctx, ROOM_W - 44, 36, 2, 'rgba(90, 139, 80, 0.45)');
  drawMossPatch(ctx, 36, ROOM_H - 44, 3, 'rgba(90, 139, 80, 0.45)');
  drawMossPatch(ctx, ROOM_W - 44, ROOM_H - 44, 4, 'rgba(90, 139, 80, 0.45)');
}

// ─── secret ─────────────────────────────────────────────────────────
// Rare-find payoff — corner cobwebs + faint floor glyph at centre.

function drawSecretOverlay(ctx: Ctx, sphere: SphereDef): void {
  // Four corner cobwebs (cobweb helper draws a quarter-circle web)
  drawCobweb(ctx, 18, 18, 'rgba(220, 215, 200, 0.35)');
  ctx.save(); ctx.translate(ROOM_W - 18, 18); ctx.scale(-1, 1);
  drawCobweb(ctx, 0, 0, 'rgba(220, 215, 200, 0.35)'); ctx.restore();
  ctx.save(); ctx.translate(18, ROOM_H - 18); ctx.scale(1, -1);
  drawCobweb(ctx, 0, 0, 'rgba(220, 215, 200, 0.35)'); ctx.restore();
  ctx.save(); ctx.translate(ROOM_W - 18, ROOM_H - 18); ctx.scale(-1, -1);
  drawCobweb(ctx, 0, 0, 'rgba(220, 215, 200, 0.35)'); ctx.restore();
  // Large faint sphere glyph at centre — the "you found it" reward
  const cx = ROOM_W / 2, cy = ROOM_H / 2;
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = sphere.accent;
  // Canvas2D doesn't pull from CSS @font-face by font-family alone —
  // the font NAME must appear in ctx.font for the browser to consult
  // the registered AbyssGlyphs subset. Without it, iOS Safari falls
  // back to system serif → colour-emojifies ☾ ♀ ☉ and breaks the
  // pixel-monochrome aesthetic M3 went to ship.
  ctx.font = '64px AbyssGlyphs, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sphere.glyph, cx, cy);
  ctx.restore();
}

// ─── miniBoss ───────────────────────────────────────────────────────
// Four corner urns + a sphere-accent floor border so the mini-boss
// arena reads as "harder than enemy, lesser than boss".

function drawMiniBossOverlay(ctx: Ctx, sphere: SphereDef, t: number): void {
  // Four corner urns — small brazier silhouette with a flicker dot
  const flick = 0.7 + 0.3 * Math.sin(t * 4);
  const urns: [number, number][] = [
    [60, 60], [ROOM_W - 60, 60], [60, ROOM_H - 60], [ROOM_W - 60, ROOM_H - 60],
  ];
  for (const [ux, uy] of urns) {
    // Base
    ctx.fillStyle = '#1a0f2c';
    ctx.fillRect(ux - 4, uy + 2, 8, 4);
    ctx.fillStyle = '#3b265c';
    ctx.fillRect(ux - 3, uy, 6, 3);
    // Flame
    ctx.save();
    ctx.globalAlpha = flick;
    ctx.fillStyle = sphere.accent;
    ctx.beginPath();
    ctx.arc(ux, uy - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff7d6';
    ctx.beginPath();
    ctx.arc(ux, uy - 2, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Sphere-accent floor border ring at radius 80
  ctx.save();
  ctx.strokeStyle = sphere.accent;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ROOM_W / 2, ROOM_H / 2, 80, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ─── treasure ───────────────────────────────────────────────────────
// Soft gold pool under the chest + stray coin glints scattered.

function drawTreasureOverlay(ctx: Ctx, sphere: SphereDef, t: number): void {
  const cx = ROOM_W / 2, cy = ROOM_H / 2 + 4;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  // 0.34 base — same crush-survival reasoning as the other glows.
  drawHearthGlow(ctx, cx, cy, 56, `rgba(244, 210, 122, ${0.34 + 0.06 * Math.sin(t * 1.8)})`);
  ctx.restore();
  // Stray coin glints — three small accent dots near the chest
  ctx.fillStyle = sphere.accent;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(cx - 36, cy + 8,  2, 2);
  ctx.fillRect(cx + 28, cy + 14, 2, 2);
  ctx.fillRect(cx + 6,  cy + 32, 2, 2);
  ctx.globalAlpha = 1;
}

// ─── torch count ────────────────────────────────────────────────────
// Per-room-type torch count override. Sanctuary / start get extra
// torches for brightness; secret / locked get fewer for atmosphere.

export const TORCH_COUNT_BY_TYPE: Partial<Record<Room['type'], number>> = {
  start: 5,
  sanctuary: 5,
  locked: 3,
  secret: 2,
  trap: 3,
};

// ─── per-room ambient tint nudge ────────────────────────────────────
// Applied AFTER the global multiply pass — small additive screen for
// safe rooms, small darken for hostile / hidden rooms.

export function drawRoomMoodNudge(
  ctx: Ctx,
  room: Room,
): void {
  const t = room.type;
  if (t === 'sanctuary' || t === 'start') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(244, 210, 122, 0.04)';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    ctx.restore();
  } else if (t === 'locked' || t === 'secret') {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(160, 150, 180, 1)';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    ctx.restore();
  } else if (t === 'trap') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(226, 58, 74, 0.05)';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    ctx.restore();
  }
}
