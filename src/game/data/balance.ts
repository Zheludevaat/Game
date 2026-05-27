// Balance constants — gameplay numbers that used to live as magic
// constants scattered across GameEngine.ts and DungeonGenerator.ts.
// Tuning a single value now means editing one file instead of
// hunting through ~6000 lines of engine code.
//
// Organised by subsystem. Each block names its consumer site so a
// future maintainer can trace value → effect without re-greppting.

// ─── Boss Rush mode ─────────────────────────────────────────────────
// Applied once in GameEngine.mount when bossRushMode is true. Tuned to
// roughly match a natural floor-10 player after relic / shrine pickups.
export const BOSS_RUSH_BOOST = {
  attack: 28,
  spellPower: 28,
  maxHp: 90,
  maxMp: 50,
  armor: 3,
  luck: 2,
} as const;

// ─── Pickup magnet radii ────────────────────────────────────────────
// Read in GameEngine.updatePickups every frame for every pickup.
// Coins + essence pull from further than other pickups; the threshold
// is the distance at which the pickup snaps into the player.
export const MAGNET_RADIUS = {
  coinEssence: 44,
  other: 36,
  threshold: 10,
} as const;

// ─── Hit-pause durations ────────────────────────────────────────────
// Applied via this.hitPauseUntil = Math.max(...) at damage / kill sites.
// Short for chip hits, std for solid damage, crit for crit landings,
// heavy for boss-tier impact + overhead-weapon swings.
export const HIT_PAUSE = {
  short: 0.025,
  std: 0.05,
  crit: 0.08,
  heavy: 0.10,
} as const;

// ─── Per-archetype ultimate damage scale ────────────────────────────
// Read in GameEngine.useUltimate. Word of Power and Astral Step scale
// with the player's spellPower / attack; Lantern Flare is a defensive
// AOE so its damage tap is lower.
export const ULTIMATE_DAMAGE_MUL = {
  wordOfPower: 1.8,
  lanternFlare: 0.6,
  astralStep: 1.6,
} as const;

// ─── Dungeon generator probabilities ────────────────────────────────
// Read in DungeonGenerator. Per-floor independent rolls — most are
// mutually exclusive with each other (see Lampwright / Mendicant /
// sphere sanctuary block in DungeonGenerator).
export const ROOM_SPAWN_CHANCE = {
  /** Per-floor chance to convert an enemy room into a secret room
   *  (added next to a regular room with a hidden door). */
  secret: 0.4,
  /** Per-floor trap room (sphere-themed hazard grid). */
  trap: 0.12,
  /** Sphere-wanderer sanctuary; only fires when a sphere has an NPC. */
  sphereSanctuary: 0.25,
  /** Lampwright marketplace; mutually exclusive with sphere sanctuary. */
  lampwright: 0.12,
  /** Mendicant alms; mutually exclusive with the above two. */
  mendicant: 0.07,
  /** Locked-room generator roll. */
  locked: 0.6,
  /** Chest-lock probability for treasure-room chests. */
  chestLock: 0.35,
  /** Enemy-room chest spawn probability. */
  enemyRoomChest: 0.25,
  /** Enemy-room chest lock probability (if chest spawned). */
  enemyRoomChestLock: 0.2,
} as const;

// ─── Synergy & relic probabilities ──────────────────────────────────
export const SYNERGY = {
  /** Pulse Crown — chance to drop an HP heart on crit. */
  pulseCrownHeartChance: 0.15,
  /** Tar Bloom — DoT damage multiplier on burning enemies. */
  tarBloomDotMul: 1.5,
  /** Alchemical Mint — every Nth coin/essence pickup grants a relic. */
  alchemicalMintEvery: 12,
} as const;

export const RELIC = {
  /** Key of the Gate — chance the lock spends nothing. */
  keyOfTheGateChance: 0.35,
  /** Lunar Mirror — per-frame chance to reflect an enemy projectile. */
  lunarMirrorReflectChance: 0.005,
  /** Crown Spark — chance to heal on room clear. */
  crownSparkHealChance: 0.25,
} as const;

// ─── Death sequence ─────────────────────────────────────────────────
/** Duration of the descending-drone audio played under the death
 *  embers (`audio.playDeathDrone`). */
export const DEATH_DRONE_DURATION = 1.2;
