// Per-sphere room props — decorative pixel art that gives each floor
// of the descent a distinct silhouette. Deterministic per room seed
// so a room you've cleared looks the same when you back-track. All
// props here are NON-COLLIDING (visual only). Obstacles that block
// movement live in data/hazards.ts since they need engine-side
// gameplay code.
//
// Sizing: every prop's centre is the (x,y) passed in. Props extend
// roughly 12–22 px in each direction so they read at game scale on
// iPhone landscape (~1.5× zoom) without crowding the floor.

import { RNG } from '../math/rng';
import { ROOM_H, ROOM_W, TILE } from '../constants';
import { SphereId } from '../data/spheres';

export interface PropPlacement {
  /** Which prop drawer to call. */
  kind: PropKind;
  x: number;
  y: number;
  /** Per-prop deterministic variant (0..15). Used for orientation /
   *  colour rolls inside the drawer. */
  variant: number;
}

export type PropKind =
  | 'tidePool' | 'reedClump' | 'driftwood'              // moon
  | 'brassGear' | 'mosaicShard' | 'chainPile'           // mercury
  | 'rosePillar' | 'fountain' | 'vineCluster'           // venus
  | 'sunDial' | 'mirrorDisk' | 'brazier'                // sun
  | 'brokenColumn' | 'weaponRack' | 'bonePile'          // mars
  | 'brassPillar' | 'lightningRod' | 'throneMark'       // jupiter
  | 'hourglass' | 'scytheRack' | 'decayingStatue'       // saturn
  | 'starGlyph' | 'crystalSpire' | 'voidRune';          // ogdoad

const PROPS_BY_SPHERE: Record<SphereId, PropKind[]> = {
  moon:    ['tidePool', 'reedClump', 'driftwood'],
  mercury: ['brassGear', 'mosaicShard', 'chainPile'],
  venus:   ['rosePillar', 'fountain', 'vineCluster'],
  sun:     ['sunDial', 'mirrorDisk', 'brazier'],
  mars:    ['brokenColumn', 'weaponRack', 'bonePile'],
  jupiter: ['brassPillar', 'lightningRod', 'throneMark'],
  saturn:  ['hourglass', 'scytheRack', 'decayingStatue'],
  ogdoad:  ['starGlyph', 'crystalSpire', 'voidRune'],
};

/** Tall vertical props that should hug walls instead of standing in
 *  the middle of an open floor. Pillars / statues / rods read as
 *  "things that lean on something" — they look wrong floating. */
const VERTICAL_PROPS: Set<PropKind> = new Set([
  'rosePillar', 'brokenColumn', 'brassPillar',
  'decayingStatue', 'crystalSpire',
  'lightningRod', 'scytheRack', 'weaponRack',
]);

/** Flat-on-floor props that can go anywhere outside the play zone. */
const FLAT_PROPS: Set<PropKind> = new Set([
  'tidePool', 'mosaicShard', 'chainPile', 'bonePile',
  'vineCluster', 'reedClump', 'driftwood',
  'throneMark', 'mirrorDisk', 'sunDial',
  'starGlyph', 'voidRune',
]);

/** Inputs describing what's already in the room so prop placement
 *  doesn't collide with the pentagram, interactables, or doorways. */
export interface RoomLayout {
  type: string;
  hasChest: boolean;
  hasShrine: boolean;
  /** True if this room renders the occult circle. Mirrors the engine's
   *  drawOccultCircle call site (enemy / miniBoss / boss / shrine). */
  hasPentagram: boolean;
}

/** Compute the radius of the "no-decor" zone around the room centre.
 *  Sized to cover the pentagram halo (1.4 × r in drawOccultCircle)
 *  plus a small buffer, and tall enough to clear the shrine altar
 *  and stair markings. */
function centreExclusionRadius(layout: RoomLayout): number {
  if (layout.hasPentagram) {
    const r = layout.type === 'boss' ? 100 : 60;
    return Math.round(r * 1.05) + 6; // pentagram outer ring + buffer
  }
  if (layout.hasChest || layout.hasShrine || layout.type === 'exit') {
    return 36;
  }
  return 28; // start / treasure / locked / corridor
}

/** Deterministic list of props to render in a given room. The shape
 *  of the placement is chosen by a template (symmetric pair / wall
 *  line / corner cluster / scatter), seeded by the room. Inside a
 *  template, prop KINDS are picked from the sphere's palette with a
 *  preference for vertical props on wall-hugging templates and flat
 *  props for floor scatter. */
export function placeProps(
  sphere: SphereId,
  roomSeed: number,
  count: number,
  layout: RoomLayout,
): PropPlacement[] {
  const palette = PROPS_BY_SPHERE[sphere] ?? PROPS_BY_SPHERE.moon;
  if (palette.length === 0 || count <= 0) return [];
  const rng = new RNG(roomSeed ^ 0xa7f3b2c1);
  const exclR = centreExclusionRadius(layout);

  // Pick a template — biased so symmetric / wall layouts appear more
  // often than pure scatter, giving the dungeon an "architected" feel.
  const templateRoll = rng.int(0, 100);
  let template: 'symmetricPair' | 'cornerCluster' | 'wallLine' | 'scatter';
  if (templateRoll < 30) template = 'symmetricPair';
  else if (templateRoll < 55) template = 'cornerCluster';
  else if (templateRoll < 75) template = 'wallLine';
  else template = 'scatter';

  // Floor area available for props. The valid play area excludes the
  // walls (top + bottom 1 tile, left + right 1 tile) and the doorway
  // corridors carved through each wall.
  const minX = TILE * 2;
  const maxX = ROOM_W - TILE * 2;
  const minY = TILE * 3;
  const maxY = ROOM_H - TILE * 3;
  const centreX = ROOM_W / 2;
  const centreY = ROOM_H / 2;
  const doorHalf = 32;

  const isClear = (x: number, y: number, placed: PropPlacement[]): boolean => {
    if (x < minX || x > maxX || y < minY || y > maxY) return false;
    if (Math.hypot(x - centreX, y - centreY) < exclR) return false;
    if (Math.abs(x - centreX) < doorHalf && (y < minY + 6 || y > maxY - 6)) return false;
    if (Math.abs(y - centreY) < doorHalf && (x < minX + 6 || x > maxX - 6)) return false;
    for (const p of placed) {
      if (Math.hypot(p.x - x, p.y - y) < 36) return false;
    }
    return true;
  };

  const tryPlace = (
    x: number, y: number,
    kindPicker: (rng: RNG) => PropKind,
    placed: PropPlacement[],
    nudgeBudget = 8,
  ): boolean => {
    // If the ideal spot is taken, nudge a few times before giving up.
    for (let attempt = 0; attempt < nudgeBudget; attempt++) {
      const ox = attempt === 0 ? 0 : (rng.next() - 0.5) * 24;
      const oy = attempt === 0 ? 0 : (rng.next() - 0.5) * 24;
      const tx = x + ox;
      const ty = y + oy;
      if (isClear(tx, ty, placed)) {
        const kind = kindPicker(rng);
        placed.push({ kind, x: tx, y: ty, variant: rng.int(0, 16) });
        return true;
      }
    }
    return false;
  };

  const pickAny = (r: RNG): PropKind => palette[r.int(0, palette.length)];
  const pickVertical = (r: RNG): PropKind => {
    const v = palette.filter((p) => VERTICAL_PROPS.has(p));
    return v.length > 0 ? v[r.int(0, v.length)] : pickAny(r);
  };
  const pickFlat = (r: RNG): PropKind => {
    const f = palette.filter((p) => FLAT_PROPS.has(p));
    return f.length > 0 ? f[r.int(0, f.length)] : pickAny(r);
  };

  const out: PropPlacement[] = [];

  switch (template) {
    case 'symmetricPair': {
      // Mirrored pairs on the left and right (or top / bottom). Pillars
      // / columns / statues lean into this template — they look
      // intentional rather than scattered. Each pair shares its KIND
      // so the mirror reads cleanly.
      const horizontal = rng.next() < 0.6;
      const pairs = Math.max(1, Math.floor(count / 2));
      for (let i = 0; i < pairs && out.length + 2 <= count; i++) {
        const kind = pickVertical(rng);
        const variant = rng.int(0, 16);
        if (horizontal) {
          // Two props at the same y, mirrored across centreX.
          const y = minY + 10 + (i + 0.5) * ((maxY - minY - 20) / pairs);
          const offset = 60 + rng.next() * 40;
          const lx = centreX - offset;
          const rx = centreX + offset;
          if (isClear(lx, y, out)) out.push({ kind, x: lx, y, variant });
          if (isClear(rx, y, out)) out.push({ kind, x: rx, y, variant });
        } else {
          const x = minX + 10 + (i + 0.5) * ((maxX - minX - 20) / pairs);
          const offset = 40 + rng.next() * 30;
          const ty = centreY - offset;
          const by = centreY + offset;
          if (isClear(x, ty, out)) out.push({ kind, x, y: ty, variant });
          if (isClear(x, by, out)) out.push({ kind, x, y: by, variant });
        }
      }
      // Fill any remaining budget with flat-on-floor accents.
      while (out.length < count) {
        const placed = tryPlace(
          minX + rng.next() * (maxX - minX),
          minY + rng.next() * (maxY - minY),
          pickFlat, out, 6,
        );
        if (!placed) break;
      }
      break;
    }
    case 'cornerCluster': {
      // 1-2 corners receive a tight cluster of 2-3 props each.
      // Corners get vertical accents (the tall thing in the corner)
      // plus flat scatter (debris around it).
      const corners: Array<[number, number]> = [
        [minX + 22, minY + 22],
        [maxX - 22, minY + 22],
        [minX + 22, maxY - 22],
        [maxX - 22, maxY - 22],
      ];
      // Shuffle deterministically and take 1 or 2.
      for (let i = corners.length - 1; i > 0; i--) {
        const j = rng.int(0, i + 1);
        [corners[i], corners[j]] = [corners[j], corners[i]];
      }
      const numCorners = count >= 4 ? 2 : 1;
      for (let c = 0; c < numCorners && out.length < count; c++) {
        const [cx, cy] = corners[c];
        // The corner gets one vertical anchor + 1-2 flat accents.
        tryPlace(cx, cy, pickVertical, out, 4);
        if (out.length < count) tryPlace(cx + 18, cy + 6, pickFlat, out, 4);
        if (out.length < count) tryPlace(cx - 4, cy + 18, pickFlat, out, 4);
      }
      // Fill remaining budget with floor scatter elsewhere.
      while (out.length < count) {
        const placed = tryPlace(
          minX + rng.next() * (maxX - minX),
          minY + rng.next() * (maxY - minY),
          pickFlat, out, 6,
        );
        if (!placed) break;
      }
      break;
    }
    case 'wallLine': {
      // Props lined along a single wall, evenly spaced. Reads as a
      // colonnade or processional path.
      const wall = ['top', 'bottom', 'left', 'right'][rng.int(0, 4)];
      const step = Math.max(2, Math.min(5, count));
      for (let i = 0; i < step && out.length < count; i++) {
        const t = (i + 0.5) / step;
        let x = 0, y = 0;
        switch (wall) {
          case 'top':    x = minX + t * (maxX - minX); y = minY + 14; break;
          case 'bottom': x = minX + t * (maxX - minX); y = maxY - 14; break;
          case 'left':   x = minX + 14; y = minY + t * (maxY - minY); break;
          case 'right':  x = maxX - 14; y = minY + t * (maxY - minY); break;
        }
        tryPlace(x, y, pickVertical, out, 6);
      }
      break;
    }
    case 'scatter':
    default: {
      // Edge-biased scatter — pick points anywhere outside the play
      // zone, weighted toward the perimeter so the open centre stays
      // clean for combat.
      let tries = 0;
      while (out.length < count && tries < count * 10) {
        tries++;
        const x = minX + rng.next() * (maxX - minX);
        const y = minY + rng.next() * (maxY - minY);
        if (!isClear(x, y, out)) continue;
        const kindRoll = rng.next();
        const kind = kindRoll < 0.55 ? pickFlat(rng) : pickAny(rng);
        out.push({ kind, x, y, variant: rng.int(0, 16) });
      }
      break;
    }
  }

  return out;
}

export function propCountFor(roomType: string, sphere: SphereId, roomSeed: number): number {
  const rng = new RNG(roomSeed ^ 0xb2e4c8f9);
  void sphere;
  switch (roomType) {
    case 'start':    return rng.int(1, 3);
    case 'enemy':    return rng.int(2, 5);
    case 'treasure': return rng.int(1, 3);
    case 'shrine':   return rng.int(1, 3);
    case 'locked':   return rng.int(2, 4);
    case 'miniBoss': return rng.int(2, 4);
    case 'exit':     return rng.int(1, 3);
    case 'boss':     return 0;
    default:         return rng.int(1, 3);
  }
}

export function drawProps(
  ctx: CanvasRenderingContext2D,
  props: PropPlacement[],
  t: number,
): void {
  for (const p of props) drawPropShadow(ctx, p.kind, p.x, p.y);
  for (const p of props) drawProp(ctx, p.kind, p.x, p.y, p.variant, t);
}

/** Drop-shadow ellipse under each prop. Width keyed to prop kind so
 *  tall props (pillars, columns, statues) get longer shadows. */
function drawPropShadow(ctx: CanvasRenderingContext2D, kind: PropKind, x: number, y: number): void {
  const w = shadowWidthFor(kind);
  if (w <= 0) return;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y + shadowOffsetFor(kind), w, w * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
}

function shadowWidthFor(kind: PropKind): number {
  switch (kind) {
    case 'brokenColumn':
    case 'rosePillar':
    case 'brassPillar':
    case 'decayingStatue':
    case 'crystalSpire':
      return 12;
    case 'hourglass':
    case 'lightningRod':
    case 'scytheRack':
    case 'weaponRack':
      return 9;
    case 'brazier':
    case 'sunDial':
    case 'mirrorDisk':
    case 'fountain':
    case 'brassGear':
    case 'starGlyph':
    case 'voidRune':
      return 10;
    case 'tidePool':
    case 'mosaicShard':
    case 'reedClump':
    case 'chainPile':
    case 'bonePile':
    case 'vineCluster':
    case 'throneMark':
      return 0; // flat-on-floor props don't need a shadow
    default:
      return 8;
  }
}
function shadowOffsetFor(kind: PropKind): number {
  switch (kind) {
    case 'brokenColumn':
    case 'rosePillar':
    case 'brassPillar':
    case 'decayingStatue':
    case 'crystalSpire':
      return 7;
    case 'lightningRod':
    case 'scytheRack':
    case 'hourglass':
      return 6;
    default:
      return 5;
  }
}

function drawProp(ctx: CanvasRenderingContext2D, kind: PropKind, x: number, y: number, v: number, t: number): void {
  switch (kind) {
    // ─── MOON ───────────────────────────────────────────────────────
    case 'tidePool': {
      // Larger oval pool with rippling surface + faint silver glints.
      ctx.fillStyle = '#08182f';
      ctx.beginPath(); ctx.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#152944';
      ctx.beginPath(); ctx.ellipse(x, y, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#243c5e';
      ctx.beginPath(); ctx.ellipse(x, y - 1, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
      // Ripple highlights — three offset arcs that bob with time.
      const sh = 0.5 + Math.sin(t * 1.4 + v) * 0.3;
      ctx.strokeStyle = `rgba(180, 200, 235, ${sh})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x - 1, y - 2, 8, 3, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + 2, y + 1, 5, 2, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
      // Tiny silver glint
      ctx.fillStyle = `rgba(220, 235, 245, ${sh * 0.9})`;
      ctx.fillRect(x - 4, y - 3, 2, 1);
      break;
    }
    case 'reedClump': {
      // Cluster of 5 reeds with subtle sway.
      const sway = Math.sin(t * 1.2 + v) * 0.5;
      ctx.fillStyle = '#08120a';
      // Shadow stems (the dark backing layer)
      for (let i = -2; i <= 2; i++) {
        const ox = i * 2 + sway * (i / 2);
        ctx.fillRect(x + ox - 1, y - 12 + Math.abs(i) * 1.5, 1, 14 - Math.abs(i) * 2);
      }
      // Lit stems
      ctx.fillStyle = '#3a6e3a';
      for (let i = -2; i <= 2; i++) {
        const ox = i * 2 + sway * (i / 2);
        ctx.fillRect(x + ox, y - 11 + Math.abs(i) * 1.5, 1, 12 - Math.abs(i) * 2);
      }
      // Tops — pale silver tip
      ctx.fillStyle = '#aac8a0';
      for (let i = -2; i <= 2; i++) {
        const ox = i * 2 + sway * (i / 2);
        ctx.fillRect(x + ox, y - 11 + Math.abs(i) * 1.5, 1, 2);
      }
      // Base tuft
      ctx.fillStyle = '#1a3322';
      ctx.fillRect(x - 4, y + 1, 9, 2);
      break;
    }
    case 'driftwood': {
      // Larger pale log with dark knots, sitting at a slight angle.
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(x - 13, y - 3, 26, 6);
      ctx.fillStyle = '#3a2c1d';
      ctx.fillRect(x - 13, y - 2, 26, 5);
      ctx.fillStyle = '#6b5236';
      ctx.fillRect(x - 13, y - 2, 26, 2);
      // bark grain
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(x - 9, y - 1, 4, 1);
      ctx.fillRect(x + 2, y, 5, 1);
      // knots
      ctx.fillStyle = '#0a0604';
      ctx.fillRect(x - 6, y - 1, 2, 2);
      ctx.fillRect(x + 4, y, 2, 1);
      // moss
      ctx.fillStyle = '#3a6e3a';
      ctx.fillRect(x - 11, y - 3, 3, 1);
      ctx.fillRect(x + 7, y - 3, 4, 1);
      break;
    }

    // ─── MERCURY ────────────────────────────────────────────────────
    case 'brassGear': {
      // Larger gear with hub spokes, slowly rotates.
      const rot = t * 0.5 + v * 0.4;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot);
      // Outer ring
      ctx.fillStyle = '#3a2410';
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
      // Teeth (12 outer pegs)
      ctx.fillStyle = '#7a5a1a';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.fillRect(Math.cos(a) * 11 - 1.5, Math.sin(a) * 11 - 1.5, 3, 3);
      }
      // Inner body
      ctx.fillStyle = '#c8983f';
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5a1a';
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      // Spokes
      ctx.fillStyle = '#3a2410';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.fillRect(Math.cos(a) * 2 - 1, Math.sin(a) * 2 - 0.5, 4, 1);
      }
      // Hub
      ctx.fillStyle = '#1a0f04';
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case 'mosaicShard': {
      // Cluster of cracked teal tiles with grout lines.
      ctx.fillStyle = '#0a302e';
      ctx.fillRect(x - 9, y - 6, 18, 12);
      // Individual tile faces
      ctx.fillStyle = '#1f8a86';
      ctx.fillRect(x - 8, y - 5, 7, 5);
      ctx.fillRect(x,     y - 5, 8, 4);
      ctx.fillRect(x - 8, y + 1, 8, 4);
      ctx.fillRect(x + 1, y + 1, 7, 4);
      // Highlights — pale teal edges
      ctx.fillStyle = '#6cf6e5';
      ctx.fillRect(x - 8, y - 5, 7, 1);
      ctx.fillRect(x,     y - 5, 8, 1);
      // Crack — diagonal line of grout colour
      ctx.fillStyle = '#0a302e';
      ctx.fillRect(x - 4, y - 3, 1, 7);
      ctx.fillRect(x - 3, y - 4, 1, 1);
      ctx.fillRect(x + 2, y - 1, 1, 5);
      break;
    }
    case 'chainPile': {
      // Five interlinked iron rings in a tangled coil.
      const links = [
        { dx: -6, dy: -1, ra: 4, rb: 2 },
        { dx: -1, dy: -3, ra: 4, rb: 2 },
        { dx: 4, dy: -2, ra: 4, rb: 2 },
        { dx: -3, dy: 2, ra: 4, rb: 2 },
        { dx: 3, dy: 3, ra: 4, rb: 2 },
      ];
      for (const l of links) {
        ctx.strokeStyle = '#1a1a2a';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x + l.dx, y + l.dy, l.ra, l.rb, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#5a5a6a';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x + l.dx, y + l.dy, l.ra - 1, l.rb - 1, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // Top highlights
      ctx.fillStyle = '#9a9aaa';
      ctx.fillRect(x - 6, y - 3, 1, 1);
      ctx.fillRect(x + 3, y - 4, 1, 1);
      break;
    }

    // ─── VENUS ──────────────────────────────────────────────────────
    case 'rosePillar': {
      // Tall marble pillar with garlanded rose at the top.
      const baseY = y + 6;
      // Base
      ctx.fillStyle = '#1a121a';
      ctx.fillRect(x - 7, baseY, 14, 3);
      ctx.fillStyle = '#4a3a4a';
      ctx.fillRect(x - 6, baseY + 1, 12, 2);
      // Shaft
      ctx.fillStyle = '#1a121a';
      ctx.fillRect(x - 5, y - 14, 10, 20);
      ctx.fillStyle = '#5a4a5a';
      ctx.fillRect(x - 4, y - 14, 8, 20);
      ctx.fillStyle = '#7a5a7a';
      ctx.fillRect(x - 4, y - 14, 1, 20);
      ctx.fillStyle = '#3a2a3a';
      ctx.fillRect(x + 3, y - 14, 1, 20);
      // Capital
      ctx.fillStyle = '#1a121a';
      ctx.fillRect(x - 6, y - 16, 12, 3);
      ctx.fillStyle = '#7a5a7a';
      ctx.fillRect(x - 6, y - 16, 12, 1);
      // Rose on top — petals layered
      ctx.fillStyle = '#1a0810';
      ctx.fillRect(x - 4, y - 20, 8, 4);
      ctx.fillStyle = '#ff6caf';
      ctx.fillRect(x - 3, y - 19, 6, 3);
      ctx.fillStyle = '#ff9bc1';
      ctx.fillRect(x - 2, y - 18, 4, 2);
      ctx.fillStyle = '#ffd0e0';
      ctx.fillRect(x - 1, y - 18, 2, 1);
      // Vine leaves trailing
      ctx.fillStyle = '#3a6e3a';
      ctx.fillRect(x + 4, y - 12, 2, 1);
      ctx.fillRect(x - 6, y - 8, 2, 1);
      ctx.fillRect(x + 3, y - 4, 3, 1);
      break;
    }
    case 'fountain': {
      // Wider marble basin with a pulsing water column.
      // Basin shadow
      ctx.fillStyle = '#1a121a';
      ctx.fillRect(x - 11, y - 2, 22, 8);
      // Basin body
      ctx.fillStyle = '#5a4a5a';
      ctx.fillRect(x - 10, y - 1, 20, 6);
      // Rim highlight
      ctx.fillStyle = '#9a7a9a';
      ctx.fillRect(x - 10, y - 1, 20, 1);
      // Inner water pool
      ctx.fillStyle = '#1c3a5e';
      ctx.fillRect(x - 8, y, 16, 4);
      ctx.fillStyle = '#2c5a8e';
      ctx.fillRect(x - 7, y + 1, 14, 2);
      // Water column with bubbles
      const b = 0.7 + Math.sin(t * 2 + v) * 0.3;
      ctx.fillStyle = `rgba(180, 220, 250, ${b})`;
      ctx.fillRect(x - 1, y - 5, 2, 5);
      ctx.fillRect(x - 2, y - 7, 4, 2);
      // Bubble droplet
      const drop = (Math.sin(t * 3 + v + 1) + 1) * 0.5;
      if (drop > 0.7) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, y - 9, 1, 1);
      }
      // Base shadow
      ctx.fillStyle = '#0a040a';
      ctx.fillRect(x - 11, y + 5, 22, 1);
      break;
    }
    case 'vineCluster': {
      // Climbing vine on the floor with leaves and a small bloom.
      ctx.strokeStyle = '#1a2a18';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 11, y + 5);
      ctx.quadraticCurveTo(x - 5, y - 8, x + 1, y - 4);
      ctx.quadraticCurveTo(x + 7, y - 1, x + 11, y + 5);
      ctx.stroke();
      ctx.strokeStyle = '#3a5a30';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 11, y + 5);
      ctx.quadraticCurveTo(x - 5, y - 8, x + 1, y - 4);
      ctx.quadraticCurveTo(x + 7, y - 1, x + 11, y + 5);
      ctx.stroke();
      // Leaves — small diagonal rectangles along the curve
      ctx.fillStyle = '#5a8a48';
      ctx.fillRect(x - 9, y + 2, 2, 2);
      ctx.fillRect(x - 5, y - 5, 2, 2);
      ctx.fillRect(x - 1, y - 5, 2, 2);
      ctx.fillRect(x + 4, y - 1, 2, 2);
      ctx.fillRect(x + 9, y + 2, 2, 2);
      ctx.fillStyle = '#7fd070';
      ctx.fillRect(x - 9, y + 2, 1, 1);
      ctx.fillRect(x - 1, y - 5, 1, 1);
      ctx.fillRect(x + 9, y + 2, 1, 1);
      // Pink bloom near the top
      ctx.fillStyle = '#ff6caf';
      ctx.fillRect(x - 1, y - 6, 3, 2);
      ctx.fillStyle = '#ffd0e0';
      ctx.fillRect(x, y - 6, 1, 1);
      break;
    }

    // ─── SUN ────────────────────────────────────────────────────────
    case 'sunDial': {
      // Wider gold disc with concentric markings + tall gnomon.
      ctx.fillStyle = '#3a2410';
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5a1a';
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8983f';
      ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4d27a';
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      // Concentric ring lines
      ctx.strokeStyle = '#7a5a1a';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke();
      // Twelve hour marks
      ctx.fillStyle = '#3a2410';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const isMajor = i % 3 === 0;
        ctx.fillRect(
          x + Math.cos(a) * 8 - 0.5,
          y + Math.sin(a) * 8 - 0.5,
          isMajor ? 2 : 1, isMajor ? 2 : 1,
        );
      }
      // Gnomon — tall triangle casting toward the centre
      ctx.fillStyle = '#1a0f04';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y - 12);
      ctx.lineTo(x + 1, y - 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x, y - 11, 1, 11);
      break;
    }
    case 'mirrorDisk': {
      // Larger polished bronze disc with a reflected glint.
      ctx.fillStyle = '#3a2410';
      ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5a1a';
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8983f';
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4d27a';
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe6a3';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      // Glint — moving highlight that drifts subtly
      const gx = Math.cos(t * 0.4 + v) * 2;
      const gy = Math.sin(t * 0.4 + v) * 2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x + gx - 1, y + gy - 1, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(x + gx, y + gy + 1, 2, 1);
      break;
    }
    case 'brazier': {
      // Tripod brazier with a tall flickering flame.
      // Tripod legs
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(x - 6, y + 1, 2, 9);
      ctx.fillRect(x + 4, y + 1, 2, 9);
      ctx.fillRect(x - 1, y + 1, 2, 9);
      // Bowl
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(x - 8, y - 3, 16, 5);
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 7, y - 2, 14, 4);
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x - 7, y - 2, 14, 1);
      // Coals
      ctx.fillStyle = '#5a1a08';
      ctx.fillRect(x - 5, y, 10, 2);
      ctx.fillStyle = '#c84a18';
      ctx.fillRect(x - 4, y, 8, 1);
      ctx.fillRect(x - 2, y + 1, 4, 1);
      // Flame — three flickering layers
      const f = 0.7 + Math.sin(t * 5 + v) * 0.25;
      const f2 = 0.7 + Math.sin(t * 7 + v * 1.4) * 0.25;
      // Outer red flame
      ctx.fillStyle = `rgba(226, 58, 30, ${0.55 * f})`;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 1);
      ctx.lineTo(x - 2, y - 9 - f * 2);
      ctx.lineTo(x, y - 12 - f * 3);
      ctx.lineTo(x + 2, y - 9 - f2 * 2);
      ctx.lineTo(x + 4, y - 1);
      ctx.closePath();
      ctx.fill();
      // Inner gold flame
      ctx.fillStyle = `rgba(255, 168, 60, ${0.75 * f2})`;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 2);
      ctx.lineTo(x, y - 9 - f * 2);
      ctx.lineTo(x + 2, y - 2);
      ctx.closePath();
      ctx.fill();
      // White-hot core
      ctx.fillStyle = `rgba(255, 247, 214, ${0.9 * f})`;
      ctx.fillRect(x, y - 5, 1, 3);
      break;
    }

    // ─── MARS ───────────────────────────────────────────────────────
    case 'brokenColumn': {
      // Tall stub of a fluted column with a jagged broken top.
      const baseY = y + 6;
      // Base
      ctx.fillStyle = '#0a0608';
      ctx.fillRect(x - 8, baseY, 16, 3);
      ctx.fillStyle = '#3a2a2a';
      ctx.fillRect(x - 7, baseY + 1, 14, 2);
      // Shaft
      ctx.fillStyle = '#0a0608';
      ctx.fillRect(x - 6, y - 14, 12, 20);
      ctx.fillStyle = '#3a2a2a';
      ctx.fillRect(x - 5, y - 14, 10, 20);
      ctx.fillStyle = '#5a4040';
      ctx.fillRect(x - 5, y - 14, 1, 20);
      // Fluted grooves
      ctx.fillStyle = '#2a1a1a';
      ctx.fillRect(x - 3, y - 14, 1, 20);
      ctx.fillRect(x,     y - 14, 1, 20);
      ctx.fillRect(x + 3, y - 14, 1, 20);
      // Cracked jagged top
      ctx.fillStyle = '#0a0608';
      ctx.fillRect(x - 6, y - 14, 12, 2);
      ctx.fillStyle = '#1a1010';
      ctx.fillRect(x - 5, y - 14, 3, 1);
      ctx.fillRect(x - 1, y - 14, 2, 1);
      ctx.fillRect(x + 3, y - 14, 2, 1);
      ctx.fillRect(x - 3, y - 15, 2, 1);
      ctx.fillRect(x + 1, y - 15, 2, 1);
      // Crack down the shaft
      ctx.fillStyle = '#0a0608';
      ctx.fillRect(x + 1, y - 10, 1, 8);
      ctx.fillRect(x + 2, y - 6, 1, 4);
      break;
    }
    case 'weaponRack': {
      // Stand with two crossed swords plus an axe leaning.
      // Stand
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(x - 9, y + 5, 18, 3);
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 8, y + 5, 16, 1);
      // Left sword (slight tilt)
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(x - 7, y - 10, 2, 16);
      ctx.fillStyle = '#9fa6ad';
      ctx.fillRect(x - 7, y - 10, 1, 14);
      ctx.fillStyle = '#cdd6dc';
      ctx.fillRect(x - 7, y - 10, 1, 5);
      // Left hilt
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x - 8, y + 3, 4, 2);
      // Right sword
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(x + 5, y - 10, 2, 16);
      ctx.fillStyle = '#9fa6ad';
      ctx.fillRect(x + 6, y - 10, 1, 14);
      ctx.fillStyle = '#cdd6dc';
      ctx.fillRect(x + 6, y - 10, 1, 5);
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x + 4, y + 3, 4, 2);
      // Axe head in the middle
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(x - 1, y - 8, 2, 14);
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 1, y - 8, 1, 14);
      ctx.fillStyle = '#cdd6dc';
      ctx.fillRect(x - 4, y - 9, 4, 4);
      ctx.fillStyle = '#9fa6ad';
      ctx.fillRect(x - 4, y - 6, 4, 1);
      break;
    }
    case 'bonePile': {
      // Wider pile of bones with a clearly readable skull on top.
      // Backing shadow
      ctx.fillStyle = '#0a0604';
      ctx.fillRect(x - 9, y + 1, 18, 5);
      // Lower bones — overlapping rectangles
      ctx.fillStyle = '#3a3024';
      ctx.fillRect(x - 8, y + 2, 16, 4);
      ctx.fillStyle = '#7a6a48';
      ctx.fillRect(x - 8, y + 2, 16, 2);
      // Individual bone shapes
      ctx.fillStyle = '#cdc6a8';
      ctx.fillRect(x - 7, y + 2, 5, 2);
      ctx.fillRect(x,     y + 3, 6, 2);
      ctx.fillRect(x - 4, y + 4, 8, 1);
      // Skull
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(x - 4, y - 6, 9, 7);
      ctx.fillStyle = '#cdc6a8';
      ctx.fillRect(x - 4, y - 5, 9, 6);
      ctx.fillStyle = '#f5efd8';
      ctx.fillRect(x - 3, y - 5, 7, 1);
      // Eye sockets
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(x - 3, y - 3, 2, 2);
      ctx.fillRect(x + 2, y - 3, 2, 2);
      // Nose triangle
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(x, y - 1, 1, 1);
      // Teeth
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(x - 2, y + 1, 5, 1);
      ctx.fillStyle = '#f5efd8';
      ctx.fillRect(x - 2, y + 1, 1, 1);
      ctx.fillRect(x,     y + 1, 1, 1);
      ctx.fillRect(x + 2, y + 1, 1, 1);
      break;
    }

    // ─── JUPITER ────────────────────────────────────────────────────
    case 'brassPillar': {
      // Tall brass column with capital + base + relief band.
      const baseY = y + 8;
      // Base
      ctx.fillStyle = '#1a0f04';
      ctx.fillRect(x - 7, baseY, 14, 3);
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x - 6, baseY + 1, 12, 2);
      // Shaft
      ctx.fillStyle = '#1a0f04';
      ctx.fillRect(x - 5, y - 18, 10, 26);
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x - 4, y - 18, 8, 26);
      ctx.fillStyle = '#c8983f';
      ctx.fillRect(x - 4, y - 18, 8, 26);
      ctx.fillStyle = '#f4d27a';
      ctx.fillRect(x - 4, y - 18, 1, 26);
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x + 3, y - 18, 1, 26);
      // Relief band — middle ornament
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 4, y - 4, 8, 4);
      ctx.fillStyle = '#f4d27a';
      ctx.fillRect(x - 3, y - 3, 6, 1);
      ctx.fillRect(x - 3, y - 1, 6, 1);
      ctx.fillRect(x - 2, y - 2, 1, 1);
      ctx.fillRect(x + 1, y - 2, 1, 1);
      // Capital
      ctx.fillStyle = '#1a0f04';
      ctx.fillRect(x - 6, y - 20, 12, 3);
      ctx.fillStyle = '#c8983f';
      ctx.fillRect(x - 6, y - 20, 12, 1);
      ctx.fillStyle = '#f4d27a';
      ctx.fillRect(x - 5, y - 20, 10, 1);
      break;
    }
    case 'lightningRod': {
      // Tall iron rod topped with a brass orb, occasional spark.
      // Base anchor
      ctx.fillStyle = '#1a0f04';
      ctx.fillRect(x - 4, y + 3, 8, 3);
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 3, y + 4, 6, 2);
      // Rod
      ctx.fillStyle = '#0a0608';
      ctx.fillRect(x - 1, y - 14, 2, 18);
      ctx.fillStyle = '#5a606a';
      ctx.fillRect(x - 1, y - 14, 1, 18);
      // Orb
      ctx.fillStyle = '#3a2410';
      ctx.beginPath(); ctx.arc(x, y - 16, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8983f';
      ctx.beginPath(); ctx.arc(x, y - 16, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4d27a';
      ctx.fillRect(x - 1, y - 17, 1, 1);
      // Spark above the orb — pulses on
      const sp = (Math.sin(t * 3 + v) + 1) * 0.5;
      if (sp > 0.85) {
        ctx.fillStyle = 'rgba(164, 250, 240, 0.85)';
        ctx.fillRect(x - 2, y - 22, 4, 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(x - 1, y - 22, 2, 1);
        // Zigzag bolt
        ctx.strokeStyle = 'rgba(164, 250, 240, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - 20);
        ctx.lineTo(x - 1, y - 21);
        ctx.lineTo(x + 1, y - 23);
        ctx.lineTo(x, y - 24);
        ctx.stroke();
      }
      break;
    }
    case 'throneMark': {
      // Larger floor inlay — a stylised crown / V with a central glyph.
      // Backing dark inlay
      ctx.fillStyle = '#1a0f04';
      ctx.beginPath();
      ctx.moveTo(x - 11, y - 5);
      ctx.lineTo(x - 6, y + 3);
      ctx.lineTo(x,     y - 5);
      ctx.lineTo(x + 6, y + 3);
      ctx.lineTo(x + 11, y - 5);
      ctx.lineTo(x + 11, y + 4);
      ctx.lineTo(x - 11, y + 4);
      ctx.closePath();
      ctx.fill();
      // Gold crown lines
      ctx.strokeStyle = '#c8983f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 4);
      ctx.lineTo(x - 6, y + 2);
      ctx.lineTo(x,     y - 4);
      ctx.lineTo(x + 6, y + 2);
      ctx.lineTo(x + 10, y - 4);
      ctx.stroke();
      ctx.strokeStyle = '#f4d27a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 4);
      ctx.lineTo(x - 6, y + 2);
      ctx.lineTo(x,     y - 4);
      ctx.lineTo(x + 6, y + 2);
      ctx.lineTo(x + 10, y - 4);
      ctx.stroke();
      // Crown points
      ctx.fillStyle = '#f4d27a';
      ctx.fillRect(x - 11, y - 6, 2, 2);
      ctx.fillRect(x - 1, y - 6, 2, 2);
      ctx.fillRect(x + 9, y - 6, 2, 2);
      // Central glyph
      ctx.fillStyle = '#c8983f';
      ctx.fillRect(x - 1, y, 2, 3);
      break;
    }

    // ─── SATURN ─────────────────────────────────────────────────────
    case 'hourglass': {
      // Hourglass with metal frame, two violet sand chambers,
      // trickle, and a faint base shadow.
      // Top + bottom caps
      ctx.fillStyle = '#1a0f04';
      ctx.fillRect(x - 6, y - 14, 12, 2);
      ctx.fillRect(x - 6, y + 6, 12, 2);
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x - 6, y - 14, 12, 1);
      ctx.fillStyle = '#c8983f';
      ctx.fillRect(x - 5, y - 13, 10, 1);
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x - 6, y + 7, 12, 1);
      // Vertical frame uprights
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x - 6, y - 12, 1, 18);
      ctx.fillRect(x + 5, y - 12, 1, 18);
      // Top sand chamber
      ctx.fillStyle = '#1a0a30';
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 12); ctx.lineTo(x + 5, y - 12); ctx.lineTo(x, y - 3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3b265c';
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 11); ctx.lineTo(x + 4, y - 11); ctx.lineTo(x, y - 4);
      ctx.closePath(); ctx.fill();
      // Top sand (varies with time)
      const sandTop = 4 - (Math.sin(t * 0.3 + v) + 1) * 1.5;
      ctx.fillStyle = '#9b6cff';
      ctx.beginPath();
      ctx.moveTo(x - sandTop, y - 11); ctx.lineTo(x + sandTop, y - 11); ctx.lineTo(x, y - 11 + sandTop * 2.5);
      ctx.closePath(); ctx.fill();
      // Bottom sand chamber
      ctx.fillStyle = '#1a0a30';
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 6); ctx.lineTo(x + 5, y + 6); ctx.lineTo(x, y - 3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3b265c';
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 5); ctx.lineTo(x + 4, y + 5); ctx.lineTo(x, y - 2);
      ctx.closePath(); ctx.fill();
      // Bottom sand pile
      ctx.fillStyle = '#9b6cff';
      const sandBot = (Math.sin(t * 0.3 + v) + 1) * 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 3, y + 5); ctx.lineTo(x + 3, y + 5); ctx.lineTo(x, y + 5 - sandBot);
      ctx.closePath(); ctx.fill();
      // Trickle
      const trickle = (Math.sin(t * 2 + v) + 1) * 0.5;
      if (trickle > 0.3) {
        ctx.fillStyle = '#c8a4ff';
        ctx.fillRect(x, y - 3, 1, 3);
      }
      break;
    }
    case 'scytheRack': {
      // Wall-mount scythe with curved blade.
      // Wall mount post
      ctx.fillStyle = '#1a0f04';
      ctx.fillRect(x - 1, y + 5, 2, 3);
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 1, y + 5, 2, 1);
      // Shaft
      ctx.fillStyle = '#1a0f04';
      ctx.fillRect(x - 1, y - 12, 2, 18);
      ctx.fillStyle = '#4a3018';
      ctx.fillRect(x - 1, y - 12, 1, 18);
      // Blade head — curved sickle
      ctx.fillStyle = '#0a0608';
      ctx.beginPath();
      ctx.moveTo(x + 1, y - 12);
      ctx.quadraticCurveTo(x + 11, y - 11, x + 9, y - 4);
      ctx.lineTo(x + 1, y - 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#9fa6ad';
      ctx.beginPath();
      ctx.moveTo(x + 1, y - 11);
      ctx.quadraticCurveTo(x + 10, y - 10, x + 8, y - 5);
      ctx.lineTo(x + 1, y - 5);
      ctx.closePath();
      ctx.fill();
      // Edge highlight
      ctx.fillStyle = '#cdd6dc';
      ctx.beginPath();
      ctx.moveTo(x + 1, y - 11);
      ctx.quadraticCurveTo(x + 10, y - 10, x + 8, y - 5);
      ctx.stroke();
      // Cap on the top
      ctx.fillStyle = '#9b6cff';
      ctx.fillRect(x - 2, y - 13, 4, 2);
      break;
    }
    case 'decayingStatue': {
      // Tall hooded figure with crumbling silhouette, glowing eyes.
      const baseY = y + 6;
      // Base / robe hem
      ctx.fillStyle = '#0a0420';
      ctx.fillRect(x - 7, baseY, 14, 3);
      // Robe body
      ctx.fillStyle = '#0a0420';
      ctx.fillRect(x - 6, y - 14, 12, 20);
      ctx.fillStyle = '#1f1430';
      ctx.fillRect(x - 5, y - 13, 10, 19);
      ctx.fillStyle = '#3b265c';
      ctx.fillRect(x - 5, y - 13, 1, 19);
      ctx.fillStyle = '#0a0420';
      ctx.fillRect(x + 4, y - 13, 1, 19);
      // Hood
      ctx.fillStyle = '#0a0420';
      ctx.fillRect(x - 5, y - 16, 10, 5);
      ctx.fillStyle = '#1f1430';
      ctx.fillRect(x - 4, y - 16, 8, 4);
      // Face shadow
      ctx.fillStyle = '#02010a';
      ctx.fillRect(x - 3, y - 14, 6, 3);
      // Glowing eyes
      const glow = 0.7 + Math.sin(t * 1.8 + v) * 0.3;
      ctx.fillStyle = `rgba(155, 108, 255, ${glow})`;
      ctx.fillRect(x - 2, y - 13, 1, 1);
      ctx.fillRect(x + 1, y - 13, 1, 1);
      ctx.fillStyle = `rgba(255, 255, 255, ${glow * 0.6})`;
      ctx.fillRect(x - 2, y - 13, 1, 1);
      ctx.fillRect(x + 1, y - 13, 1, 1);
      // Cracks
      ctx.fillStyle = '#02010a';
      ctx.fillRect(x, y - 9, 1, 8);
      ctx.fillRect(x + 1, y - 5, 1, 6);
      ctx.fillRect(x - 1, y - 3, 1, 4);
      // Folded hands / clasp
      ctx.fillStyle = '#3b265c';
      ctx.fillRect(x - 3, y - 4, 6, 2);
      ctx.fillStyle = '#9b6cff';
      ctx.fillRect(x - 1, y - 4, 2, 1);
      // Crumbling debris at the base
      ctx.fillStyle = '#1a0f30';
      ctx.fillRect(x - 8, y + 5, 2, 2);
      ctx.fillRect(x + 6, y + 4, 2, 2);
      break;
    }

    // ─── OGDOAD ─────────────────────────────────────────────────────
    case 'starGlyph': {
      // Eight-pointed star with concentric glow and pulsing core.
      const s = 0.7 + Math.sin(t * 1.5 + v) * 0.3;
      // Outer halo
      ctx.fillStyle = `rgba(255, 230, 163, ${0.2 * s})`;
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      // Star rays — 8 lines
      ctx.strokeStyle = `rgba(255, 247, 214, ${s})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
        ctx.lineTo(x - Math.cos(a) * 8, y - Math.sin(a) * 8);
        ctx.stroke();
      }
      // Diagonal shorter rays
      ctx.strokeStyle = `rgba(255, 230, 163, ${s * 0.75})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI + Math.PI / 8;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
        ctx.lineTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5);
        ctx.stroke();
      }
      // Pulsing core
      ctx.fillStyle = `rgba(255, 255, 255, ${s})`;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe6a3';
      ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
      break;
    }
    case 'crystalSpire': {
      // Three-prong crystal cluster — tall central, two shorter sides.
      // Central spire
      ctx.fillStyle = '#1f1430';
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 6); ctx.lineTo(x, y - 14); ctx.lineTo(x + 4, y + 6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3b265c';
      ctx.beginPath();
      ctx.moveTo(x - 3, y + 5); ctx.lineTo(x, y - 13); ctx.lineTo(x + 3, y + 5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6cf6e5';
      ctx.beginPath();
      ctx.moveTo(x - 2, y + 4); ctx.lineTo(x, y - 11); ctx.lineTo(x + 2, y + 4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a4faf0';
      ctx.beginPath();
      ctx.moveTo(x - 1, y + 4); ctx.lineTo(x, y - 9); ctx.lineTo(x + 1, y + 4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y - 8, 1, 7);
      // Left shorter spire
      ctx.fillStyle = '#1f1430';
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 6); ctx.lineTo(x - 6, y - 4); ctx.lineTo(x - 4, y + 6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6cf6e5';
      ctx.beginPath();
      ctx.moveTo(x - 7, y + 5); ctx.lineTo(x - 6, y - 3); ctx.lineTo(x - 5, y + 5);
      ctx.closePath(); ctx.fill();
      // Right shorter spire
      ctx.fillStyle = '#1f1430';
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 6); ctx.lineTo(x + 6, y - 6); ctx.lineTo(x + 8, y + 6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6cf6e5';
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 5); ctx.lineTo(x + 6, y - 5); ctx.lineTo(x + 7, y + 5);
      ctx.closePath(); ctx.fill();
      // Sparkle near the tip
      const sp = 0.5 + Math.sin(t * 3 + v) * 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${sp})`;
      ctx.fillRect(x - 1, y - 10, 1, 1);
      break;
    }
    case 'voidRune': {
      // Dark sigil disc with concentric runes orbiting a violet core.
      // Outer shadow rim
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#02010a';
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      // Outer ring of glyphs (8 dots, rotating slowly)
      const rot = t * 0.3 + v * 0.2;
      ctx.fillStyle = '#3b265c';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + rot;
        ctx.fillRect(x + Math.cos(a) * 8 - 1, y + Math.sin(a) * 8 - 1, 2, 2);
      }
      // Middle ring (counter-rotating)
      ctx.fillStyle = '#5b3a86';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 - rot * 1.4;
        ctx.fillRect(x + Math.cos(a) * 5 - 0.5, y + Math.sin(a) * 5 - 0.5, 1, 1);
      }
      // Core
      const p = 0.5 + Math.sin(t * 2.5 + v) * 0.4;
      ctx.fillStyle = `rgba(155, 108, 255, ${p})`;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255, 255, 255, ${p * 0.7})`;
      ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
      break;
    }
  }
}
