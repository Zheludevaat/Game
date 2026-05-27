// Relic synergies — paired-relic combos that unlock a third effect on
// top of each relic's own passive. Filled the "all 18 relics are flat
// passives" gap from the gameplay audit: every synergy makes an
// existing relic pair feel like a third item.
//
// The data layer is intentionally thin. Each entry just names a pair;
// the actual mechanical effects live in GameEngine call sites that read
// `hasSynergy(id)` and branch on the result. The HUD reads the data
// here for the badge label + tooltip.

import { RelicId } from '../GameTypes';

export type SynergyId =
  | 'pulseCrown'
  | 'tarBloom'
  | 'sigilMirror'
  | 'alchemicalMint'
  | 'crownedVessel'
  | 'quicksilverTongue'
  | 'temperedTread'
  | 'cartographersKey';

export interface RelicSynergyDef {
  id: SynergyId;
  name: string;
  glyph: string;
  /** Order-independent pair of relics that activates this synergy. */
  pair: [RelicId, RelicId];
  description: string;
  /** Display colour for the HUD badge — keyed to one of the parent relics. */
  colour: string;
}

export const RELIC_SYNERGIES: Record<SynergyId, RelicSynergyDef> = {
  pulseCrown: {
    id: 'pulseCrown',
    name: 'Pulse Crown',
    glyph: '♥✦',
    pair: ['pulseHeart', 'crownSpark'],
    description: 'Critical strikes restore 4 HP and sometimes drop a heart.',
    colour: '#ff7a8a',
  },
  tarBloom: {
    id: 'tarBloom',
    name: 'Tar Bloom',
    glyph: '🜍🔥',
    pair: ['wormwoodVial', 'sulfurHeart'],
    description: 'Burn deals +50% per tick. Burning enemies drop bonus essence.',
    colour: '#ff7a3a',
  },
  sigilMirror: {
    id: 'sigilMirror',
    name: 'Sigil Mirror',
    glyph: '♄☿',
    pair: ['saturnRing', 'emeraldTablet'],
    description: 'Parried projectiles pierce two extra enemies.',
    colour: '#9b6cff',
  },
  alchemicalMint: {
    id: 'alchemicalMint',
    name: 'Alchemical Mint',
    glyph: '☉⚖',
    pair: ['solarCoin', 'midasInverse'],
    description: 'Every twelfth coin or essence pickup grants a random relic.',
    colour: '#f4d27a',
  },
  crownedVessel: {
    id: 'crownedVessel',
    name: 'Crowned Vessel',
    glyph: '✚☽',
    pair: ['roseCross', 'chaliceOfLuna'],
    description: 'Revive at 80% HP and with full mana.',
    colour: '#dac8ff',
  },
  quicksilverTongue: {
    id: 'quicksilverTongue',
    name: 'Quicksilver Tongue',
    glyph: '☾🜍',
    pair: ['lunarMirror', 'serpentWand'],
    description: 'Lunar Mirror reflected projectiles seek their target.',
    colour: '#a4faf0',
  },
  temperedTread: {
    id: 'temperedTread',
    name: 'Tempered Tread',
    glyph: '🜔♀',
    pair: ['blackSalt', 'mercurySandals'],
    description: 'The salt-stone weight cancels: speed restored, armor +2.',
    colour: '#6cf6e5',
  },
  cartographersKey: {
    id: 'cartographersKey',
    name: "Cartographer's Key",
    glyph: '⚷🜸',
    pair: ['keyOfTheGate', 'brassEar'],
    description: 'Locked rooms never drain keys. Brass Ear still reveals the map.',
    colour: '#ffe6a3',
  },
};

export const SYNERGY_IDS: SynergyId[] = Object.keys(RELIC_SYNERGIES) as SynergyId[];

/** Return the list of synergies the player has earned given a set of
 *  owned relics. Order is the definition order of RELIC_SYNERGIES. */
export function synergiesFromRelics(owned: RelicId[]): SynergyId[] {
  const set = new Set(owned);
  return SYNERGY_IDS.filter((id) => {
    const [a, b] = RELIC_SYNERGIES[id].pair;
    return set.has(a) && set.has(b);
  });
}
