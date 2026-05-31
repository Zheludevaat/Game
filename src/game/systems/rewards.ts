import { RNG } from '../math/rng';
import { RelicId, SpellId, WeaponId } from '../GameTypes';
import { WEAPON_LOOT_POOL } from '../data/weapons';
import { SPELL_LOOT_POOL } from '../data/spells';
import { RELIC_IDS } from '../data/relics';

// ── Context ────────────────────────────────────────────────────────────────

export interface RewardContext {
  luck: number;
  coinBoost: number;
  ownedWeapons: WeaponId[];
  ownedSpells: SpellId[];
  ownedRelics: RelicId[];
}

// ── Chest rewards ──────────────────────────────────────────────────────────

export interface ChestReward {
  kind: 'weapon' | 'spell' | 'relic' | 'consumables';
  weaponId?: WeaponId;
  spellId?: SpellId;
  relicId?: RelicId;
  coins: number;
  essence: number;
  hasHp: boolean;
  hasMp: boolean;
  hasKey: boolean;
}

/**
 * Determine what pops out of a chest.
 * RNG calls (in order):
 *   1 – reward-type roll
 *   2 – (conditional) item pick
 *   consumables branch only:
 *     2 – coin-amount roll
 *     3 – essence-amount roll
 *     4 – HP chance
 *     5 – MP chance
 *     6 – key chance
 * Positioning RNG must be consumed by the caller after this returns.
 */
export function rollChestLoot(rng: RNG, ctx: RewardContext): ChestReward {
  const r = rng.next();

  // 12% weapon, 12% spell, 14% relic, rest is gold/essence
  if (r < 0.12) {
    const pool = WEAPON_LOOT_POOL.filter((id) => !ctx.ownedWeapons.includes(id));
    if (pool.length > 0) {
      return {
        kind: 'weapon',
        weaponId: rng.pick(pool),
        coins: 0, essence: 0, hasHp: false, hasMp: false, hasKey: false,
      };
    }
  }

  if (r < 0.24) {
    const pool = SPELL_LOOT_POOL.filter((id) => !ctx.ownedSpells.includes(id));
    if (pool.length > 0) {
      return {
        kind: 'spell',
        spellId: rng.pick(pool),
        coins: 0, essence: 0, hasHp: false, hasMp: false, hasKey: false,
      };
    }
  }

  if (r < 0.38) {
    const pool = RELIC_IDS.filter((id) => !ctx.ownedRelics.includes(id));
    if (pool.length > 0) {
      return {
        kind: 'relic',
        relicId: rng.pick(pool),
        coins: 0, essence: 0, hasHp: false, hasMp: false, hasKey: false,
      };
    }
  }

  // Consumables: coins + essence + optional hp / mp / key
  const luck = 1 + ctx.luck * 0.05;
  const coins = Math.round((6 + rng.next() * 10) * luck * ctx.coinBoost);
  const essence = Math.round((2 + rng.next() * 5) * ctx.coinBoost);
  return {
    kind: 'consumables',
    coins,
    essence,
    hasHp: rng.chance(0.45),
    hasMp: rng.chance(0.45),
    hasKey: rng.chance(0.18),
  };
}

// ── Enemy-drop rewards ─────────────────────────────────────────────────────

export interface EnemyDropReward {
  /** Number of coins to spawn. 0 means none. */
  coins: number;
  /** Whether an essence pickup should be spawned. */
  essence: boolean;
  /** Relic id if a relic should drop (mini-boss only). */
  relicId?: RelicId;
  /** Whether an HP pickup should be spawned. */
  hp: boolean;
  /** Whether an MP pickup should be spawned. */
  mp: boolean;
}

/**
 * Determine what a slain enemy drops.
 *
 * RNG calls (in order):
 *   1 – coin-drop chance
 *   2 – (if coins) coin count
 *   3 – essence chance
 *   4 – (if mini-boss) relic-chance check
 *   5 – (if relic) relic pick
 *   6 – HP chance
 *   7 – MP chance
 *
 *  The caller is responsible for consuming positioning RNG for coin scatter.
 */
export function rollEnemyDrop(rng: RNG, ctx: RewardContext, isMiniBoss: boolean): EnemyDropReward {
  const luck = 1 + ctx.luck * 0.05;
  const coins = rng.chance(0.85 * luck)
    ? 1 + rng.int(0, isMiniBoss ? 9 : 4)
    : 0;

  const essence = rng.chance((isMiniBoss ? 1 : 0.4) * ctx.coinBoost);

  let relicId: RelicId | undefined;
  if (isMiniBoss && rng.chance(0.5)) {
    const pool = RELIC_IDS.filter((id) => !ctx.ownedRelics.includes(id));
    if (pool.length > 0) {
      relicId = rng.pick(pool);
    }
  }

  return {
    coins,
    essence,
    relicId,
    hp: rng.chance(0.08),
    mp: rng.chance(0.06),
  };
}

// ── Boss-drop rewards ──────────────────────────────────────────────────────

export interface BossDropReward {
  /** Relic the boss drops, if any are owned yet. */
  relicId?: RelicId;
  /** Weapon to drop, or fallback spell. */
  weaponId?: WeaponId;
  /** Spell to drop, or fallback weapon. */
  spellId?: SpellId;
  /** Number of essence pickups to scatter. */
  essenceCount: number;
}

/**
 * Determine what a boss drops.
 *
 * RNG calls (in order):
 *   1 – relic pick
 *   2 – weapon/spell pick
 *
 *  Essence count is fixed at 20 (no RNG).
 */
export function rollBossDrop(rng: RNG, ctx: RewardContext, floorNumber: number): BossDropReward {
  const relicPool = RELIC_IDS.filter((id) => !ctx.ownedRelics.includes(id));

  const giveWeapon = floorNumber % 2 === 1;
  let weaponId: WeaponId | undefined;
  let spellId: SpellId | undefined;

  if (giveWeapon) {
    const wPool = WEAPON_LOOT_POOL.filter((id) => !ctx.ownedWeapons.includes(id));
    if (wPool.length > 0) {
      weaponId = rng.pick(wPool);
    } else {
      const sPool = SPELL_LOOT_POOL.filter((id) => !ctx.ownedSpells.includes(id));
      if (sPool.length > 0) spellId = rng.pick(sPool);
    }
  } else {
    const sPool = SPELL_LOOT_POOL.filter((id) => !ctx.ownedSpells.includes(id));
    if (sPool.length > 0) {
      spellId = rng.pick(sPool);
    } else {
      const wPool = WEAPON_LOOT_POOL.filter((id) => !ctx.ownedWeapons.includes(id));
      if (wPool.length > 0) weaponId = rng.pick(wPool);
    }
  }

  return {
    relicId: relicPool.length > 0 ? rng.pick(relicPool) : undefined,
    weaponId,
    spellId,
    essenceCount: 20,
  };
}
