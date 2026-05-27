// Per-sphere room props — decorative pixel art that gives each floor
// of the descent a distinct silhouette. Deterministic per room seed
// so a room you've cleared looks the same when you back-track. All
// props here are NON-COLLIDING (visual only). Obstacles that block
// movement live in data/hazards.ts since they need engine-side
// gameplay code.

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

/** The exclusion-zone radius around the room centre — props never
 *  spawn here so the play space stays clean. Also avoid doorway
 *  corridors so doors are never half-blocked by decor. */
const CENTRE_EXCLUSION = 56;
const DOORWAY_HALF = 28;

/** Deterministic list of props to render in a given room. Stateless;
 *  called every frame inside drawRoom. */
export function placeProps(
  sphere: SphereId,
  roomSeed: number,
  count: number,
): PropPlacement[] {
  const palette = PROPS_BY_SPHERE[sphere] ?? PROPS_BY_SPHERE.moon;
  if (palette.length === 0 || count <= 0) return [];
  const rng = new RNG(roomSeed ^ 0xa7f3b2c1);
  const out: PropPlacement[] = [];
  let tries = 0;
  while (out.length < count && tries < count * 6) {
    tries++;
    const x = TILE * 2 + rng.next() * (ROOM_W - TILE * 4);
    const y = TILE * 3 + rng.next() * (ROOM_H - TILE * 6);
    // Skip if inside the central play zone.
    if (Math.hypot(x - ROOM_W / 2, y - ROOM_H / 2) < CENTRE_EXCLUSION) continue;
    // Skip if inside a doorway lane (the slot the player walks through).
    if (Math.abs(x - ROOM_W / 2) < DOORWAY_HALF && (y < TILE * 2 + 8 || y > ROOM_H - TILE * 2 - 8)) continue;
    if (Math.abs(y - ROOM_H / 2) < DOORWAY_HALF && (x < TILE * 2 + 8 || x > ROOM_W - TILE * 2 - 8)) continue;
    // Skip if too close to an already-placed prop (no stacking).
    let tooClose = false;
    for (const p of out) {
      if (Math.hypot(p.x - x, p.y - y) < 28) { tooClose = true; break; }
    }
    if (tooClose) continue;
    const kind = palette[rng.int(0, palette.length)];
    const variant = rng.int(0, 16);
    out.push({ kind, x, y, variant });
  }
  return out;
}

/** Pick a count for this room — combat rooms get 3-5 props for
 *  scene-dressing; smaller utility rooms (shrine, treasure, exit) get
 *  1-2 so the relevant interactable isn't visually crowded. */
export function propCountFor(roomType: string, sphere: SphereId, roomSeed: number): number {
  const rng = new RNG(roomSeed ^ 0xb2e4c8f9);
  void sphere;
  switch (roomType) {
    case 'start':    return rng.int(1, 3);
    case 'enemy':    return rng.int(3, 6);
    case 'treasure': return rng.int(1, 3);
    case 'shrine':   return rng.int(1, 2);
    case 'locked':   return rng.int(2, 4);
    case 'miniBoss': return rng.int(2, 4);
    case 'exit':     return rng.int(1, 3);
    case 'boss':     return 0; // boss arena stays clean
    default:         return rng.int(1, 3);
  }
}

/** Draw all props for a room. Single entry point — keeps drawRoom
 *  uncluttered. `t` is timeAlive for any subtle animation. */
export function drawProps(
  ctx: CanvasRenderingContext2D,
  props: PropPlacement[],
  t: number,
): void {
  for (const p of props) {
    drawProp(ctx, p.kind, p.x, p.y, p.variant, t);
  }
}

function drawProp(ctx: CanvasRenderingContext2D, kind: PropKind, x: number, y: number, v: number, t: number): void {
  switch (kind) {
    // ─── MOON ───────────────────────────────────────────────────────
    case 'tidePool': {
      // Oval water markings, faint silvery shimmer.
      ctx.fillStyle = '#1a2a4a';
      ctx.beginPath(); ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2c4068';
      ctx.beginPath(); ctx.ellipse(x, y, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      const sh = 0.55 + Math.sin(t * 1.5 + v) * 0.30;
      ctx.fillStyle = `rgba(205, 214, 220, ${sh})`;
      ctx.fillRect(x - 3, y - 1, 6, 1);
      break;
    }
    case 'reedClump': {
      // Three vertical reeds.
      ctx.fillStyle = '#1a3320';
      ctx.fillRect(x - 3, y - 1, 1, 8);
      ctx.fillRect(x,     y - 3, 1, 10);
      ctx.fillRect(x + 3, y - 2, 1, 9);
      ctx.fillStyle = '#3b6a3f';
      ctx.fillRect(x - 3, y - 1, 1, 4);
      ctx.fillRect(x,     y - 3, 1, 5);
      ctx.fillRect(x + 3, y - 2, 1, 4);
      break;
    }
    case 'driftwood': {
      // Sideways pale log with dark knots.
      ctx.fillStyle = '#3a2c1d';
      ctx.fillRect(x - 9, y - 2, 18, 4);
      ctx.fillStyle = '#6b5236';
      ctx.fillRect(x - 9, y - 2, 18, 1);
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(x - 4, y - 1, 1, 1);
      ctx.fillRect(x + 2, y, 1, 1);
      break;
    }

    // ─── MERCURY ────────────────────────────────────────────────────
    case 'brassGear': {
      // Slowly-rotating gear wheel.
      const rot = t * 0.6 + v * 0.4;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = '#7a5a1a';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillRect(Math.cos(a) * 7 - 1, Math.sin(a) * 7 - 1, 2, 2);
      }
      ctx.fillStyle = '#c8983f';
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2410';
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case 'mosaicShard': {
      // Cracked tile fragments on the floor.
      ctx.fillStyle = '#1f8a86';
      ctx.fillRect(x - 5, y - 3, 4, 3);
      ctx.fillRect(x + 1, y - 2, 3, 4);
      ctx.fillRect(x - 3, y + 1, 5, 2);
      ctx.fillStyle = '#6cf6e5';
      ctx.fillRect(x - 5, y - 3, 4, 1);
      ctx.fillRect(x + 1, y - 2, 3, 1);
      break;
    }
    case 'chainPile': {
      // Three coiled chain links.
      ctx.fillStyle = '#3a3a4a';
      ctx.beginPath(); ctx.ellipse(x - 3, y, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 1, y - 1, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 4, y + 1, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a6a7a';
      ctx.fillRect(x - 4, y - 1, 1, 1);
      ctx.fillRect(x,     y - 2, 1, 1);
      break;
    }

    // ─── VENUS ──────────────────────────────────────────────────────
    case 'rosePillar': {
      // Short stone pillar with a rose at the top.
      ctx.fillStyle = '#4a3a32';
      ctx.fillRect(x - 4, y - 8, 8, 11);
      ctx.fillStyle = '#7a5a52';
      ctx.fillRect(x - 4, y - 8, 8, 2);
      ctx.fillStyle = '#ff6caf';
      ctx.fillRect(x - 2, y - 12, 4, 4);
      ctx.fillStyle = '#ffb3d0';
      ctx.fillRect(x - 1, y - 11, 2, 2);
      break;
    }
    case 'fountain': {
      // Small marble basin with a bubble pulsing.
      ctx.fillStyle = '#3a3340';
      ctx.fillRect(x - 6, y - 1, 12, 5);
      ctx.fillStyle = '#6a606a';
      ctx.fillRect(x - 6, y - 1, 12, 1);
      const b = 0.6 + Math.sin(t * 2 + v) * 0.4;
      ctx.fillStyle = `rgba(180, 205, 240, ${b})`;
      ctx.fillRect(x - 2, y, 4, 2);
      break;
    }
    case 'vineCluster': {
      // Climbing vine on the floor — curls outward.
      ctx.strokeStyle = '#3a5a30';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 3);
      ctx.quadraticCurveTo(x, y - 5, x + 5, y + 3);
      ctx.stroke();
      ctx.fillStyle = '#7fd070';
      ctx.fillRect(x - 5, y + 2, 1, 1);
      ctx.fillRect(x,     y - 4, 1, 1);
      ctx.fillRect(x + 5, y + 2, 1, 1);
      ctx.fillStyle = '#ff6caf';
      ctx.fillRect(x - 1, y - 3, 2, 1);
      break;
    }

    // ─── SUN ────────────────────────────────────────────────────────
    case 'sunDial': {
      // Inlaid circle with a vertical gnomon.
      ctx.fillStyle = '#c8983f';
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2410';
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#f4d27a';
      ctx.fillRect(x, y - 7, 1, 7);
      // Hour marks
      ctx.fillStyle = '#7a5a1a';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillRect(x + Math.cos(a) * 6 - 0.5, y + Math.sin(a) * 6 - 0.5, 1, 1);
      }
      break;
    }
    case 'mirrorDisk': {
      // Polished bronze disk reflecting nothing in particular.
      ctx.fillStyle = '#3a2410';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe6a3';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x - 1, y - 1, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'brazier': {
      // Tripod brazier with a small flame.
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 4, y, 8, 2);
      ctx.fillRect(x - 3, y + 2, 2, 4);
      ctx.fillRect(x + 1, y + 2, 2, 4);
      ctx.fillStyle = '#c8983f';
      ctx.fillRect(x - 4, y, 8, 1);
      const f = 0.6 + Math.sin(t * 5 + v) * 0.3;
      ctx.fillStyle = `rgba(255, 122, 58, ${f})`;
      ctx.fillRect(x - 1, y - 5, 3, 5);
      ctx.fillStyle = `rgba(255, 230, 163, ${f})`;
      ctx.fillRect(x, y - 4, 1, 3);
      break;
    }

    // ─── MARS ───────────────────────────────────────────────────────
    case 'brokenColumn': {
      // Stub of a column, jagged top.
      ctx.fillStyle = '#4a3a3a';
      ctx.fillRect(x - 4, y - 8, 8, 12);
      ctx.fillStyle = '#6a4a4a';
      ctx.fillRect(x - 4, y - 8, 8, 2);
      // jagged break edge
      ctx.fillStyle = '#3a2a2a';
      ctx.fillRect(x - 4, y - 8, 2, 1);
      ctx.fillRect(x + 2, y - 8, 2, 1);
      ctx.fillRect(x - 1, y - 9, 2, 1);
      // base shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 5, y + 4, 10, 1);
      break;
    }
    case 'weaponRack': {
      // Two crossed weapons leaning on a stand.
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 5, y + 3, 10, 1);
      ctx.fillStyle = '#9fa6ad';
      ctx.fillRect(x - 4, y - 6, 1, 10);
      ctx.fillRect(x + 3, y - 6, 1, 10);
      ctx.fillStyle = '#cdd6dc';
      ctx.fillRect(x - 4, y - 6, 1, 3);
      ctx.fillRect(x + 3, y - 6, 1, 3);
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x - 4, y + 2, 1, 2);
      ctx.fillRect(x + 3, y + 2, 1, 2);
      break;
    }
    case 'bonePile': {
      // Small pile of bones, skull on top.
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(x - 5, y + 1, 10, 3);
      ctx.fillStyle = '#cdd6dc';
      ctx.fillRect(x - 4, y + 2, 9, 2);
      // skull
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(x - 2, y - 4, 5, 4);
      ctx.fillStyle = '#f5efd8';
      ctx.fillRect(x - 2, y - 3, 5, 3);
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(x - 1, y - 2, 1, 1);
      ctx.fillRect(x + 1, y - 2, 1, 1);
      break;
    }

    // ─── JUPITER ────────────────────────────────────────────────────
    case 'brassPillar': {
      // Tall narrow brass column.
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x - 3, y - 12, 6, 16);
      ctx.fillStyle = '#c8983f';
      ctx.fillRect(x - 2, y - 11, 4, 14);
      ctx.fillStyle = '#f4d27a';
      ctx.fillRect(x - 2, y - 11, 4, 1);
      ctx.fillRect(x - 3, y + 4, 6, 1);
      break;
    }
    case 'lightningRod': {
      // Tall rod with a brass ball, faint spark.
      ctx.fillStyle = '#9fa6ad';
      ctx.fillRect(x - 0.5, y - 10, 1, 12);
      ctx.fillStyle = '#c8983f';
      ctx.beginPath(); ctx.arc(x, y - 11, 2, 0, Math.PI * 2); ctx.fill();
      const sp = (Math.sin(t * 3 + v) + 1) * 0.5;
      if (sp > 0.85) {
        ctx.fillStyle = 'rgba(164, 250, 240, 0.7)';
        ctx.fillRect(x - 1, y - 14, 2, 2);
      }
      // base
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 3, y + 2, 6, 2);
      break;
    }
    case 'throneMark': {
      // Ceremonial floor markings — a stylised V crown.
      ctx.strokeStyle = '#c8983f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 3);
      ctx.lineTo(x - 3, y + 2);
      ctx.lineTo(x,     y - 3);
      ctx.lineTo(x + 3, y + 2);
      ctx.lineTo(x + 6, y - 3);
      ctx.stroke();
      ctx.fillStyle = '#f4d27a';
      ctx.fillRect(x - 1, y - 4, 2, 1);
      break;
    }

    // ─── SATURN ─────────────────────────────────────────────────────
    case 'hourglass': {
      // Small hourglass with sand trickling.
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 3, y - 8, 6, 1);
      ctx.fillRect(x - 3, y + 3, 6, 1);
      ctx.fillStyle = '#9b6cff';
      // top funnel
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 7); ctx.lineTo(x + 3, y - 7); ctx.lineTo(x, y - 2);
      ctx.closePath(); ctx.fill();
      // bottom funnel
      ctx.beginPath();
      ctx.moveTo(x - 3, y + 3); ctx.lineTo(x + 3, y + 3); ctx.lineTo(x, y - 2);
      ctx.closePath(); ctx.fill();
      // trickle
      const trickle = (Math.sin(t * 2 + v) + 1) * 0.5;
      if (trickle > 0.4) {
        ctx.fillStyle = '#c8a4ff';
        ctx.fillRect(x, y - 2, 1, 2);
      }
      break;
    }
    case 'scytheRack': {
      // Sickle-shaped weapon leaning on a wall mount.
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 1, y - 8, 2, 13);
      ctx.fillStyle = '#9fa6ad';
      ctx.beginPath();
      ctx.moveTo(x + 1, y - 8);
      ctx.quadraticCurveTo(x + 6, y - 7, x + 5, y - 3);
      ctx.lineTo(x + 1, y - 4);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'decayingStatue': {
      // Hooded figure, crumbling.
      ctx.fillStyle = '#1f1430';
      ctx.fillRect(x - 4, y - 10, 8, 14);
      ctx.fillStyle = '#3b265c';
      ctx.fillRect(x - 4, y - 10, 8, 3);
      ctx.fillRect(x - 3, y - 9, 6, 12);
      // crack
      ctx.fillStyle = '#0a0420';
      ctx.fillRect(x, y - 7, 1, 8);
      ctx.fillRect(x + 1, y - 4, 1, 4);
      // hood shadow eyes
      ctx.fillStyle = '#9b6cff';
      ctx.fillRect(x - 2, y - 7, 1, 1);
      ctx.fillRect(x + 1, y - 7, 1, 1);
      break;
    }

    // ─── OGDOAD ─────────────────────────────────────────────────────
    case 'starGlyph': {
      const s = 0.7 + Math.sin(t * 1.5 + v) * 0.3;
      ctx.fillStyle = `rgba(255, 247, 214, ${s})`;
      ctx.fillRect(x - 0.5, y - 4, 1, 8);
      ctx.fillRect(x - 4, y - 0.5, 8, 1);
      ctx.fillStyle = `rgba(255, 230, 163, ${s})`;
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'crystalSpire': {
      ctx.fillStyle = '#3b265c';
      ctx.beginPath();
      ctx.moveTo(x - 3, y + 4); ctx.lineTo(x, y - 8); ctx.lineTo(x + 3, y + 4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a4faf0';
      ctx.beginPath();
      ctx.moveTo(x - 2, y + 3); ctx.lineTo(x, y - 6); ctx.lineTo(x + 2, y + 3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 1, y - 4, 1, 4);
      break;
    }
    case 'voidRune': {
      // Dark abyssal circle with a faint pulsing core.
      ctx.fillStyle = '#02010a';
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9b6cff';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
      const p = 0.5 + Math.sin(t * 2.5 + v) * 0.4;
      ctx.fillStyle = `rgba(155, 108, 255, ${p})`;
      ctx.fillRect(x - 1, y - 1, 2, 2);
      break;
    }
  }
}
