// Per-sphere boss definitions — the seven Wardens.
//
// Each sphere of the descent has its own Warden, with its own visual
// silhouette (an entry in ENEMY_VISUALS keyed off `visualKey`),
// scaled stats, and an attack pattern pool. The engine's
// `updateWarden` picks the boss def by `sphereForFloor(floor)` and
// dispatches `patterns[i % patterns.length]` on each cooldown tick.
//
// Adding a new pattern: append to BossPattern union, handle it in the
// engine's `runBossPattern` switch, and reference it from the
// appropriate BossDef.patterns[] here.

import { SphereId } from './spheres';

/** Pattern identifiers — the engine maps each to a method that
 * spawns projectiles / sigils / summons / control effects. */
export type BossPattern =
  // Original Warden trio — kept as shared utilities every Warden can
  // mix into its pattern pool.
  | 'radialBurst'
  | 'summonShades'
  | 'dropSigils'
  // Sphere-specific signatures
  | 'tidalPulse'        // Selene — concentric ring with a safe shadow zone
  | 'mercurialStep'     // Hermes — teleport with after-image bolt
  | 'loveBind'          // Aphrodite — control-inversion sigil under the player
  | 'solarLance'        // Helios — telegraphed beam across the room
  | 'chargeAndSever'    // Ares — dash across, leaves damaging trail
  | 'wrathOfHeaven'     // Zeus — five random sigils with delayed strike
  | 'stopTime';         // Kronos — freezes the world for 1.5 s

export interface BossDef {
  /** Sphere id this Warden guards. */
  sphere: SphereId;
  /** Display name used in the boss banner + HUD bar. */
  displayName: string;
  /** ENEMY_VISUALS key the engine paints with. */
  visualKey: string;
  /** Base HP at floor 10. Scaled per `spawnBoss`. */
  baseHp: number;
  /** Contact damage on body hit. */
  contactDamage: number;
  /** Movement speed (matches Enemy.speed conventions). */
  speed: number;
  /** Body collision radius. */
  radius: number;
  /** Sprite width for centring. */
  width: number;
  /** Sprite height for centring. */
  height: number;
  /** Attack pattern pool — engine cycles through these. Order shapes
   *  the rhythm of the fight; mix shared + signature patterns. */
  patterns: BossPattern[];
  /** Cooldown values per phase (1/2/3). Lower = more aggressive. */
  phaseCooldowns: [number, number, number];
}

export const BOSSES: Record<SphereId, BossDef> = {
  moon: {
    sphere: 'moon',
    displayName: 'Selene, the Tide-keeper',
    visualKey: 'seleneBoss',
    baseHp: 240,
    contactDamage: 12,
    speed: 24,
    radius: 18,
    width: 18,
    height: 16,
    patterns: ['tidalPulse', 'summonShades', 'radialBurst', 'tidalPulse'],
    phaseCooldowns: [2.6, 2.0, 1.5],
  },
  mercury: {
    sphere: 'mercury',
    displayName: 'Hermes, the Quicksilver',
    visualKey: 'hermesBoss',
    baseHp: 260,
    contactDamage: 11,
    speed: 36,
    radius: 16,
    width: 16,
    height: 16,
    patterns: ['mercurialStep', 'radialBurst', 'mercurialStep', 'dropSigils'],
    phaseCooldowns: [2.0, 1.6, 1.1],
  },
  venus: {
    sphere: 'venus',
    displayName: 'Aphrodite of a Thousand Loves',
    visualKey: 'aphroditeBoss',
    baseHp: 290,
    contactDamage: 13,
    speed: 28,
    radius: 18,
    width: 18,
    height: 16,
    patterns: ['loveBind', 'summonShades', 'radialBurst', 'loveBind'],
    phaseCooldowns: [2.8, 2.2, 1.6],
  },
  sun: {
    sphere: 'sun',
    displayName: 'Helios the Crowned',
    visualKey: 'heliosBoss',
    baseHp: 320,
    contactDamage: 14,
    speed: 26,
    radius: 18,
    width: 18,
    height: 16,
    patterns: ['solarLance', 'radialBurst', 'solarLance', 'summonShades'],
    phaseCooldowns: [3.0, 2.3, 1.7],
  },
  mars: {
    sphere: 'mars',
    displayName: 'Ares the Edge-warden',
    visualKey: 'aresBoss',
    baseHp: 340,
    contactDamage: 16,
    speed: 34,
    radius: 18,
    width: 18,
    height: 16,
    patterns: ['chargeAndSever', 'radialBurst', 'chargeAndSever', 'dropSigils'],
    phaseCooldowns: [2.4, 1.8, 1.3],
  },
  jupiter: {
    sphere: 'jupiter',
    displayName: 'Zeus the Wide-vessel',
    visualKey: 'zeusBoss',
    baseHp: 380,
    contactDamage: 15,
    speed: 24,
    radius: 19,
    width: 20,
    height: 18,
    patterns: ['wrathOfHeaven', 'radialBurst', 'summonShades', 'wrathOfHeaven'],
    phaseCooldowns: [2.9, 2.2, 1.6],
  },
  saturn: {
    sphere: 'saturn',
    displayName: 'Kronos, Lord of the Boundary',
    visualKey: 'kronosBoss',
    baseHp: 480,
    contactDamage: 18,
    speed: 22,
    radius: 19,
    width: 20,
    height: 18,
    patterns: ['stopTime', 'radialBurst', 'dropSigils', 'stopTime', 'summonShades'],
    phaseCooldowns: [3.2, 2.5, 1.8],
  },
  ogdoad: {
    // The Eighth Sphere has no Warden — there's nothing left to surrender.
    // Defined for completeness so `BOSSES[id]` is total over SphereId.
    sphere: 'ogdoad',
    displayName: 'The Eighth Itself',
    visualKey: 'kronosBoss',
    baseHp: 600,
    contactDamage: 20,
    speed: 24,
    radius: 20,
    width: 20,
    height: 18,
    patterns: ['radialBurst', 'wrathOfHeaven', 'tidalPulse'],
    phaseCooldowns: [2.4, 1.8, 1.3],
  },
};
