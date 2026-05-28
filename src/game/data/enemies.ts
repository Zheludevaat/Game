// Enemy data layer — mirrors `weapons.ts` / `spells.ts`. The engine's
// `spawnEnemy` used to be a 12-case switch that set hp / speed /
// radius / etc. inline per enemy type. This file lifts every mook
// definition into a `Record<EnemyTypeId, EnemyDef>` so adding a new
// enemy is a data-file edit and doesn't require touching the engine.
//
// Bosses live in `bosses.ts` (BossDef) and are still resolved through
// the visualKey ↔ wardenDefFromVisual path. Mini-bosses get a special
// per-floor HP scaling override (`hpScale`) because their power band
// rises faster than mooks.

// Subset of Enemy['type'] in GameEngine.ts that this file owns. The
// boss types stay out — they read from data/bosses.ts.
export type EnemyTypeId =
  | 'lesserShade' | 'mercuryImp' | 'saltGolem' | 'lunarWisp'
  | 'saturnKnight' | 'serpentOfBrass'
  | 'martyrBeacon' | 'umbralStalker' | 'mirrorTwin' | 'kronosianHerald'
  | 'heliokrator' | 'nikethron';

export interface EnemyDef {
  /** Base HP at floor 1. Multiplied by `hpScale(floor)` at spawn. */
  baseHp: number;
  speed: number;
  radius: number;
  width: number;
  height: number;
  contactDamage: number;
  /** True if this enemy is a mini-boss — sets the e.isMiniBoss flag at
   *  spawn and uses the steeper hp curve. */
  isMiniBoss?: boolean;
  /** Per-floor multiplier on baseHp. Default is the mook curve
   *  `(1 + (floor-1) * 0.2)`. Mini-bosses override (e.g. 0.25, 0.22). */
  hpScale?: (floor: number) => number;
  /** Optional AI initialisation — currently only mercuryImp uses jitter. */
  initAi?: () => Record<string, unknown>;
}

const mookScale = (floor: number): number => 1 + (floor - 1) * 0.2;

export const ENEMIES: Record<EnemyTypeId, EnemyDef> = {
  lesserShade: {
    baseHp: 16, speed: 38, radius: 8, width: 8, height: 8, contactDamage: 6,
  },
  mercuryImp: {
    baseHp: 10, speed: 72, radius: 7, width: 8, height: 7, contactDamage: 5,
    initAi: () => ({ jitterTimer: 0.4, jitterDir: { x: 1, y: 0 } }),
  },
  saltGolem: {
    baseHp: 48, speed: 24, radius: 11, width: 10, height: 9, contactDamage: 12,
  },
  lunarWisp: {
    baseHp: 14, speed: 32, radius: 7, width: 8, height: 7, contactDamage: 4,
  },
  saturnKnight: {
    baseHp: 36, speed: 42, radius: 10, width: 9, height: 9, contactDamage: 10,
  },
  serpentOfBrass: {
    baseHp: 120, speed: 46, radius: 14, width: 14, height: 9, contactDamage: 12,
    isMiniBoss: true,
    hpScale: (floor) => 1 + (floor - 1) * 0.25,
  },
  martyrBeacon: {
    baseHp: 60, speed: 22, radius: 10, width: 9, height: 9, contactDamage: 4,
  },
  umbralStalker: {
    // Faster + stealthier shade. Half-alpha drawn until it attacks.
    baseHp: 20, speed: 56, radius: 8, width: 8, height: 8, contactDamage: 10,
  },
  mirrorTwin: {
    baseHp: 18, speed: 40, radius: 7, width: 8, height: 7, contactDamage: 6,
  },
  kronosianHerald: {
    // Heavier than salt golem; contact applies slow.
    baseHp: 54, speed: 30, radius: 11, width: 10, height: 9, contactDamage: 10,
  },
  heliokrator: {
    baseHp: 160, speed: 52, radius: 14, width: 14, height: 9, contactDamage: 14,
    isMiniBoss: true,
    hpScale: (floor) => 1 + (floor - 1) * 0.22,
  },
  nikethron: {
    baseHp: 220, speed: 38, radius: 14, width: 14, height: 9, contactDamage: 16,
    isMiniBoss: true,
    hpScale: (floor) => 1 + (floor - 1) * 0.20,
  },
};

/** Apply the per-floor HP scale + the engine's ascension multiplier. */
export function scaledEnemyHp(def: EnemyDef, floor: number, ascHpMul: number): number {
  const scale = def.hpScale ? def.hpScale(floor) : mookScale(floor);
  // Mookscaling-driven types multiply by ascHpMul (handled in engine);
  // miniBoss types use their own curve already.
  if (def.hpScale) return Math.round(def.baseHp * scale);
  return Math.round(def.baseHp * scale * ascHpMul);
}

export { mookScale };
