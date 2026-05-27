// Per-shrine variants — extracted from the inline switch that used to
// live in GameEngine.beginShrine + confirmShrine. Each Operation now
// has three flavours that share the same general direction (Calcination
// boosts Attack, Dissolution restores Mana, etc.) but differ in the
// specific numbers and downsides. Variant selection is deterministic on
// the room seed so a given room always offers the same trade.

import { ShrineKind } from '../GameTypes';

/** Pure-data delta applied on accept. Engine sums these onto PlayerState
 *  one field at a time, clamping where appropriate. */
export interface ShrineEffect {
  attack?: number;
  spellPower?: number;
  speed?: number;
  armor?: number;
  luck?: number;
  /** Additive change to maxHp (can be negative). Clamped to floor 20. */
  maxHpAdd?: number;
  /** Multiplicative change to maxHp (e.g. 0.75 for -25%). Applied AFTER maxHpAdd. */
  maxHpScale?: number;
  /** Additive change to maxMp (can be negative). Clamped to floor 20. */
  maxMpAdd?: number;
  /** Adds to passive mana regen per second. */
  manaRegen?: number;
  /** Adds to dash cooldown (positive = slower). */
  dashCdMaxAdd?: number;
  /** Negative damage / positive heal applied immediately. */
  hpDelta?: number;
  /** Negative drain / positive top-up applied immediately. */
  mpDelta?: number;
  /** Restore current MP to the new maxMp (after maxMpAdd). */
  mpRestoreFull?: boolean;
  /** Spent or granted coins. Player floor is 0. */
  coinsDelta?: number;
  /** Spent or granted essence. Player floor is 0. */
  essenceDelta?: number;
}

/** Specials the engine handles separately because they need engine state
 *  beyond PlayerState (spawn enemies, grant relics, unlock codex). */
export interface ShrineSpecial {
  /** Conjunction-style: spawn N lesser shades around the altar. */
  spawnShades?: number;
  /** Conjunction / Cursed: grant a random un-owned relic. */
  grantRandomRelic?: boolean;
  /** Library: unlock a random un-owned codex entry. */
  unlockRandomCodex?: boolean;
}

export interface ShrineVariant {
  id: string;
  /** Sub-name appended to the Operation: 'Calcination · Forge'. */
  name: string;
  /** Brief effect string shown in the shrine confirm modal. */
  effect: string;
  /** Brief downside string shown in the shrine confirm modal. */
  downside: string;
  apply: ShrineEffect;
  special?: ShrineSpecial;
}

export const SHRINE_VARIANTS: Record<ShrineKind, ShrineVariant[]> = {
  calcination: [
    { id: 'forge',  name: 'Forge',  effect: '+12 Attack', downside: '-12 Max Health',
      apply: { attack: 12, maxHpAdd: -12 } },
    { id: 'pyre',   name: 'Pyre',   effect: '+8 Attack',  downside: '-2 Armor',
      apply: { attack: 8, armor: -2 } },
    { id: 'brand',  name: 'Brand',  effect: '+6 Attack',  downside: '-1 Luck',
      apply: { attack: 6, luck: -1 } },
  ],
  dissolution: [
    { id: 'tide',       name: 'Tide',       effect: '+80 Mana',                downside: '-1 Armor',
      apply: { mpDelta: 80, armor: -1 } },
    { id: 'mist',       name: 'Mist',       effect: '+60 Mana, +1 Mana Regen', downside: '-4 Max Mana',
      apply: { mpDelta: 60, manaRegen: 1, maxMpAdd: -4 } },
    { id: 'reservoir',  name: 'Reservoir',  effect: '+50 Mana, +2 Mana Regen', downside: '-8 Max Health',
      apply: { mpDelta: 50, manaRegen: 2, maxHpAdd: -8 } },
  ],
  separation: [
    { id: 'quicksilver', name: 'Quicksilver', effect: '+14 Speed',                downside: '-4 Attack',
      apply: { speed: 14, attack: -4 } },
    { id: 'drift',       name: 'Drift',       effect: '+10 Speed, +2 Luck',       downside: '-1 Armor',
      apply: { speed: 10, luck: 2, armor: -1 } },
    { id: 'loose',       name: 'Loose',       effect: '+18 Speed',                downside: '-10 Max Health',
      apply: { speed: 18, maxHpAdd: -10 } },
  ],
  conjunction: [
    { id: 'pact',    name: 'Pact',    effect: 'Gain a relic',                downside: 'Spawns three shades',
      apply: {}, special: { grantRandomRelic: true, spawnShades: 3 } },
    { id: 'bind',    name: 'Bind',    effect: 'Gain a relic',                downside: '-20 Max Mana',
      apply: { maxMpAdd: -20 }, special: { grantRandomRelic: true } },
    { id: 'bargain', name: 'Bargain', effect: 'Gain a relic',                downside: 'Costs 15 Essence',
      apply: { essenceDelta: -15 }, special: { grantRandomRelic: true } },
  ],
  fermentation: [
    { id: 'bloom', name: 'Bloom', effect: '+3 Luck',                downside: '-10 Max Health',
      apply: { luck: 3, maxHpAdd: -10 } },
    { id: 'rot',   name: 'Rot',   effect: '+2 Luck, +1 Armor',      downside: 'Take 8 corruption damage',
      apply: { luck: 2, armor: 1, hpDelta: -8 } },
    { id: 'mire',  name: 'Mire',  effect: '+2 Luck, +6 Spell Power', downside: '-4 Attack',
      apply: { luck: 2, spellPower: 6, attack: -4 } },
  ],
  distillation: [
    { id: 'crystal', name: 'Crystal', effect: 'Full mana, +4 Spell Power', downside: '-12 Coins',
      apply: { mpRestoreFull: true, spellPower: 4, coinsDelta: -12 } },
    { id: 'fume',    name: 'Fume',    effect: 'Full mana, +2 Mana Regen',  downside: 'Take 6 corruption damage',
      apply: { mpRestoreFull: true, manaRegen: 2, hpDelta: -6 } },
    { id: 'phial',   name: 'Phial',   effect: '+60 Mana, +2 Luck',         downside: '-1 Max Mana',
      apply: { mpDelta: 60, luck: 2, maxMpAdd: -1 } },
  ],
  coagulation: [
    { id: 'stone', name: 'Stone', effect: '+3 Armor',                 downside: 'Dash 0.2s slower',
      apply: { armor: 3, dashCdMaxAdd: 0.2 } },
    { id: 'salt',  name: 'Salt',  effect: '+2 Armor, +6 Max Health',  downside: '-6 Speed',
      apply: { armor: 2, maxHpAdd: 6, speed: -6 } },
    { id: 'iron',  name: 'Iron',  effect: '+4 Armor',                 downside: '-4 Attack',
      apply: { armor: 4, attack: -4 } },
  ],
  cursed: [
    { id: 'sulphur',     name: 'Pact of Sulphur',     effect: '+14 Attack, +2 Luck',           downside: '-25% Max Health, -2 Armor',
      apply: { attack: 14, luck: 2, maxHpScale: 0.75, armor: -2 } },
    { id: 'wormwood',    name: 'Pact of Wormwood',    effect: '+10 Attack, +4 Spell Power',    downside: '-20% Max Health',
      apply: { attack: 10, spellPower: 4, maxHpScale: 0.8 } },
    { id: 'quicksilver', name: 'Pact of Quicksilver', effect: '+8 Attack, +12 Speed',          downside: '-15% Max Health, -1 Armor',
      apply: { attack: 8, speed: 12, maxHpScale: 0.85, armor: -1 } },
  ],
  library: [
    { id: 'hermes', name: 'Codex of Hermes', effect: 'Unlock a fragment, +6 Spell Power',           downside: 'Costs 10 Essence',
      apply: { spellPower: 6, essenceDelta: -10 }, special: { unlockRandomCodex: true } },
    { id: 'selene', name: 'Codex of Selene', effect: 'Unlock a fragment, +4 Spell Power, +20 Max Mana', downside: 'Costs 8 Essence',
      apply: { spellPower: 4, maxMpAdd: 20, essenceDelta: -8 }, special: { unlockRandomCodex: true } },
    { id: 'helios', name: 'Codex of Helios', effect: 'Unlock a fragment, +8 Spell Power',           downside: 'Take 12 corruption damage',
      apply: { spellPower: 8, hpDelta: -12 }, special: { unlockRandomCodex: true } },
  ],
  // Puzzle altars don't flow through the standard apply table — the
  // engine intercepts beginShrine for kind==='puzzle' and runs its own
  // sigil-sequence modal instead. The placeholder variant exists only
  // so the Record type stays exhaustive.
  puzzle: [
    { id: 'sigilLock', name: 'Sigil Lock', effect: 'Match the sequence', downside: 'Failure costs 5 Essence', apply: {} },
  ],
};

const KIND_DISPLAY: Record<ShrineKind, string> = {
  calcination:  'Calcination',
  dissolution:  'Dissolution',
  separation:   'Separation',
  conjunction:  'Conjunction',
  fermentation: 'Fermentation',
  distillation: 'Distillation',
  coagulation:  'Coagulation',
  cursed:       'Cursed Altar',
  library:      'Library Tome',
  puzzle:       'Sigil Lock',
};

/** Deterministic variant selection from the room seed. Same room offers
 *  the same trade across re-entries within a single run. */
export function pickShrineVariant(kind: ShrineKind, seed: number): ShrineVariant {
  const arr = SHRINE_VARIANTS[kind];
  const idx = Math.abs(seed | 0) % arr.length;
  return arr[idx];
}

/** Friendly title for the modal: "Calcination · Forge". */
export function shrineDisplayName(kind: ShrineKind, variantName: string): string {
  return `${KIND_DISPLAY[kind]} · ${variantName}`;
}
