// Enemy data definitions — registry of enemy types used across spheres.
//
// Each enemy has a visualKey that maps to ENEMY_VISUALS in PixelArt.ts,
// base stats that are scaled per-floor by spawnEnemy in GameEngine.ts,
// and a behavior tag that describes its movement/attack AI archetype.
//
// Adding a new enemy: add an entry to ENEMY_REGISTRY, add its pixel art
// to PixelArt.ts ENEMY_VISUALS, and implement its AI branch in
// GameEngine.ts updateEnemies().

import { SphereId } from './spheres';

/** Canonical enemy identifiers. Matches the `visualKey` in ENEMY_VISUALS
 * and the `type` field on the in-engine Enemy interface. */
export type EnemyId =
  | 'lesserShade'
  | 'mercuryImp'
  | 'saltGolem'
  | 'lunarWisp'
  | 'saturnKnight'
  | 'serpentOfBrass'
  | 'saltBanshee';

/** Behavior archetype — determines the AI routine used in updateEnemies. */
export type EnemyBehavior = 'chase' | 'jitterChase' | 'slowChase' | 'kiteRanged' | 'chargeRush' | 'chaseRanged';

export interface EnemyDef {
  /** Unique identifier, also used as the ENEMY_VISUALS key. */
  id: EnemyId;
  /** Human-readable label. */
  name: string;
  /** The sphere this enemy is native to. `undefined` for generic enemies
   *  that can appear in any sphere. */
  sphere?: SphereId;
  /** Base HP before floor scaling. */
  baseHp: number;
  /** Base movement speed (px/s). */
  speed: number;
  /** Body collision radius in pixels. */
  radius: number;
  /** Sprite width in tiles (for centering). */
  width: number;
  /** Sprite height in tiles. */
  height: number;
  /** Contact damage dealt on body hit. */
  contactDamage: number;
  /** AI behavior tag — the engine dispatches movement/attack logic by this. */
  behavior: EnemyBehavior;
  /** The visualKey to pass to drawEnemy(). Almost always matches `id`. */
  visualKey: string;
  /** True if this enemy type is only used as a mini-boss. */
  isMiniBoss?: boolean;
}

export const ENEMY_REGISTRY: Record<EnemyId, EnemyDef> = {
  lesserShade: {
    id: 'lesserShade',
    name: 'Lesser Shade',
    baseHp: 16,
    speed: 38,
    radius: 8,
    width: 8,
    height: 8,
    contactDamage: 6,
    behavior: 'chase',
    visualKey: 'lesserShade',
  },
  mercuryImp: {
    id: 'mercuryImp',
    name: 'Mercury Imp',
    sphere: 'mercury',
    baseHp: 10,
    speed: 72,
    radius: 7,
    width: 8,
    height: 7,
    contactDamage: 5,
    behavior: 'jitterChase',
    visualKey: 'mercuryImp',
  },
  saltGolem: {
    id: 'saltGolem',
    name: 'Salt Golem',
    baseHp: 48,
    speed: 24,
    radius: 11,
    width: 10,
    height: 9,
    contactDamage: 12,
    behavior: 'slowChase',
    visualKey: 'saltGolem',
  },
  lunarWisp: {
    id: 'lunarWisp',
    name: 'Lunar Wisp',
    sphere: 'moon',
    baseHp: 14,
    speed: 32,
    radius: 7,
    width: 8,
    height: 7,
    contactDamage: 4,
    behavior: 'kiteRanged',
    visualKey: 'lunarWisp',
  },
  saturnKnight: {
    id: 'saturnKnight',
    name: 'Saturn Knight',
    sphere: 'saturn',
    baseHp: 36,
    speed: 42,
    radius: 10,
    width: 9,
    height: 9,
    contactDamage: 10,
    behavior: 'chargeRush',
    visualKey: 'saturnKnight',
  },
  serpentOfBrass: {
    id: 'serpentOfBrass',
    name: 'Serpent of Brass',
    baseHp: 120,
    speed: 46,
    radius: 14,
    width: 14,
    height: 9,
    contactDamage: 12,
    behavior: 'chaseRanged',
    visualKey: 'serpentOfBrass',
    isMiniBoss: true,
  },
  saltBanshee: {
    id: 'saltBanshee',
    name: 'Salt Banshee',
    baseHp: 18,
    speed: 44,
    radius: 8,
    width: 11,
    height: 12,
    contactDamage: 7,
    behavior: 'chaseRanged',
    visualKey: 'saltBanshee',
  },
};

/** Return the enemy ids that are appropriate for the given sphere.
 *
 * Generic enemies (no `sphere` field) are always available. Sphere-native
 * enemies are added to the pool when the current floor matches their sphere.
 * This ensures each sphere has a distinct enemy identity.
 */
export function enemiesForSphere(sphereId: SphereId): EnemyId[] {
  const pool: EnemyId[] = ['lesserShade'];
  switch (sphereId) {
    case 'moon':
      pool.push('lunarWisp');
      break;
    case 'mercury':
      pool.push('mercuryImp', 'lunarWisp');
      break;
    case 'venus':
      pool.push('mercuryImp', 'saltGolem');
      break;
    case 'sun':
      pool.push('saltGolem', 'saturnKnight');
      break;
    case 'mars':
      pool.push('saturnKnight', 'saltGolem');
      break;
    case 'jupiter':
      pool.push('saturnKnight', 'mercuryImp');
      break;
    case 'saturn':
      pool.push('saturnKnight', 'saltBanshee');
      break;
    case 'ogdoad':
      pool.push('saltBanshee', 'mercuryImp', 'saturnKnight');
      break;
  }
  return pool;
}
