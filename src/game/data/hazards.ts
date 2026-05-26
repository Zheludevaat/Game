// Environmental hazards — per-sphere danger that makes each floor
// play differently even when the layout is similar. Hazards live on
// the engine while the player is in a room and clear on room change.

import { RNG } from '../math/rng';
import { ROOM_H, ROOM_W } from '../constants';
import { SphereId } from './spheres';

export type HazardKind = 'blade' | 'solar' | 'lightning' | 'vine';

export interface Hazard {
  kind: HazardKind;
  x: number;
  y: number;
  /** Seconds for one full cycle (warmup + active). */
  period: number;
  /** Of `period`, the trailing slice during which the hazard damages. */
  activeFrac: number;
  /** Damage dealt while inside the active radius. Solar hazards tick
   *  this every 0.5s; periodic hazards deal this once per cycle. */
  damage: number;
  /** Outer radius of the danger zone (px). */
  radius: number;
  /** Cycle clock — wraps at `period`. Seeded per-hazard at spawn so
   *  individual hazards in one room are out of phase. */
  t: number;
  /** Throttle for solar tick damage. */
  lastTick: number;
}

export const HAZARD_CONFIG: Record<HazardKind, {
  period: number;
  activeFrac: number;
  damage: number;
  radius: number;
  colour: string;
  /** Optional status effect applied on damage. */
  status?: 'slow' | 'stun' | 'burn';
}> = {
  blade:     { period: 1.4, activeFrac: 0.35, damage: 8, radius: 14, colour: '#cdd6dc' },
  solar:     { period: 0.5, activeFrac: 1.0, damage: 2, radius: 18, colour: '#ffe6a3', status: 'burn' },
  lightning: { period: 2.4, activeFrac: 0.12, damage: 14, radius: 22, colour: '#a4faf0', status: 'stun' },
  vine:      { period: 1.6, activeFrac: 0.40, damage: 3, radius: 14, colour: '#7fd070', status: 'slow' },
};

/** Pick which hazard kinds belong on this sphere. Empty → no hazards. */
export function hazardsForSphere(sphere: SphereId): HazardKind[] {
  switch (sphere) {
    case 'mercury': return ['blade'];
    case 'venus':   return ['vine'];
    case 'sun':     return ['solar'];
    case 'mars':    return ['blade', 'solar'];
    case 'jupiter': return ['lightning'];
    case 'saturn':  return ['lightning', 'blade'];
    default:        return []; // Moon, Ogdoad
  }
}

/** Spawn 0-3 hazards inside the standard room rectangle. Deterministic
 *  on the room seed so re-entering a room produces the same layout. */
export function spawnRoomHazards(
  sphere: SphereId,
  seed: number,
  reducedParticles: boolean,
  isCombatRoom: boolean,
): Hazard[] {
  const kinds = hazardsForSphere(sphere);
  if (kinds.length === 0) return [];
  // Quieter rooms (start / shrine / treasure) get fewer hazards.
  const maxCount = isCombatRoom ? 3 : 1;
  const rng = new RNG(seed ^ 0xa57c4b1);
  const count = rng.int(isCombatRoom ? 1 : 0, maxCount + 1);
  const out: Hazard[] = [];
  for (let i = 0; i < count; i++) {
    const kind = kinds[rng.int(0, kinds.length)];
    const cfg = HAZARD_CONFIG[kind];
    // Keep hazards inside playable bounds and away from doorways.
    const x = 36 + rng.next() * (ROOM_W - 72);
    const y = 36 + rng.next() * (ROOM_H - 72);
    out.push({
      kind, x, y,
      period: cfg.period,
      activeFrac: cfg.activeFrac,
      damage: cfg.damage,
      radius: cfg.radius,
      t: rng.next() * cfg.period,
      lastTick: 0,
    });
    if (reducedParticles && out.length >= 1) break; // soften the load
  }
  return out;
}

/** True if the hazard is currently in its damaging window. */
export function hazardIsActive(h: Hazard): boolean {
  const startActive = h.period * (1 - h.activeFrac);
  return h.t >= startActive;
}

/** Progress through the danger phase, 0..1. */
export function hazardActiveProgress(h: Hazard): number {
  const startActive = h.period * (1 - h.activeFrac);
  const span = h.period - startActive;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (h.t - startActive) / span));
}
