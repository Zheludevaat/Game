import { RelicDef, RelicId } from '../GameTypes';

export const RELICS: Record<RelicId, RelicDef> = {
  emeraldTablet: {
    id: 'emeraldTablet',
    name: 'Emerald Tablet Fragment',
    glyph: '☿',
    description: 'Spell projectiles pierce one extra enemy.',
  },
  blackSalt: {
    id: 'blackSalt',
    name: 'Black Salt Stone',
    glyph: '🜔',
    description: 'Armor increases. Movement is slower.',
  },
  crownSpark: {
    id: 'crownSpark',
    name: 'Crown Spark',
    glyph: '✦',
    description: 'Small chance to heal on room clear.',
  },
  serpentWand: {
    id: 'serpentWand',
    name: 'Serpent Wand',
    glyph: '🜍',
    description: 'Spell projectiles slightly home toward enemies.',
  },
  lunarMirror: {
    id: 'lunarMirror',
    name: 'Lunar Mirror Shard',
    glyph: '☾',
    description: 'Chance to reflect enemy projectiles.',
  },
  solarCoin: {
    id: 'solarCoin',
    name: 'Solar Coin',
    glyph: '☉',
    description: 'Increase coin and essence drops.',
  },
  saturnSeal: {
    id: 'saturnSeal',
    name: 'Saturn Seal',
    glyph: '♄',
    description: 'Dash cooldown increases, melee damage increases.',
  },
  mercurySandals: {
    id: 'mercurySandals',
    name: 'Mercury Sandals',
    glyph: '♀',
    description: 'Movement speed increases.',
  },
  roseCross: {
    id: 'roseCross',
    name: 'Rose Cross',
    glyph: '✚',
    description: 'Revive once per run at 50% health.',
  },
  sulfurHeart: {
    id: 'sulfurHeart',
    name: 'Sulfur Heart',
    glyph: '🜍',
    description: 'Attack increases, max mana decreases.',
  },
  chaliceOfLuna: {
    id: 'chaliceOfLuna',
    name: 'Chalice of Luna',
    glyph: '☽',
    description: 'Mana regenerates faster.',
  },
  keyOfTheGate: {
    id: 'keyOfTheGate',
    name: 'Key of the Gate',
    glyph: '⚷',
    description: 'Locked rooms and chests sometimes do not consume keys.',
  },
  wormwoodVial: {
    id: 'wormwoodVial',
    name: 'Wormwood Vial',
    glyph: '🜔',
    description: 'Burn lasts longer and stacks higher.',
  },
  saturnRing: {
    id: 'saturnRing',
    name: 'Ring of Saturn',
    glyph: '♄',
    description: 'Parries stun for longer and reflect with extra force.',
  },
  pulseHeart: {
    id: 'pulseHeart',
    name: 'Pulse Heart',
    glyph: '♥',
    description: 'Critical strikes restore a wisp of life.',
  },
  brassEar: {
    id: 'brassEar',
    name: 'Brass Ear',
    glyph: '🜸',
    description: 'Hears the hollow stone — hidden rooms reveal themselves.',
  },
  echoChalice: {
    id: 'echoChalice',
    name: 'Echo Chalice',
    glyph: '🜺',
    description: 'The Echo follows. Each floor offers a small tribute.',
  },
  midasInverse: {
    id: 'midasInverse',
    name: 'Inverse Midas',
    glyph: '⚖',
    description: 'Coins are transmuted into essence on the wind.',
  },
};

export const RELIC_IDS: RelicId[] = Object.keys(RELICS) as RelicId[];
