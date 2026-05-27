// Active consumable items — single-use buffs / bombs / phials the
// player carries in a small inventory (cap 3 stacks per kind, cap 3
// distinct kinds in the slot row). Picked up from chest drops; used
// with the dedicated "use consumable" input. Each kind owns a small
// engine effect that the engine invokes by id from `useConsumable`.

export type ConsumableId =
  | 'healingPhial'
  | 'manaPhial'
  | 'cleansingSalt'
  | 'emberBomb'
  | 'hourglassSand'
  | 'echoCharm';

export interface ConsumableDef {
  id: ConsumableId;
  name: string;
  glyph: string;
  colour: string;
  description: string;
}

export const CONSUMABLES: Record<ConsumableId, ConsumableDef> = {
  healingPhial: {
    id: 'healingPhial',
    name: 'Healing Phial',
    glyph: '✚',
    colour: '#ff7a8a',
    description: 'Restore 25 HP instantly.',
  },
  manaPhial: {
    id: 'manaPhial',
    name: 'Mana Phial',
    glyph: '☄',
    colour: '#9b6cff',
    description: 'Restore 30 MP instantly.',
  },
  cleansingSalt: {
    id: 'cleansingSalt',
    name: 'Cleansing Salt',
    glyph: '🜔',
    colour: '#6cf6e5',
    description: 'Clear all status effects and gain a 12 HP shield for 4 s.',
  },
  emberBomb: {
    id: 'emberBomb',
    name: 'Ember Bomb',
    glyph: '🜂',
    colour: '#ff7a3a',
    description: 'Radial blast — 18 damage and burn to all nearby enemies.',
  },
  hourglassSand: {
    id: 'hourglassSand',
    name: 'Hourglass Sand',
    glyph: '⧖',
    colour: '#ffe6a3',
    description: 'Stop time for 1.5 s. Enemies and projectiles freeze.',
  },
  echoCharm: {
    id: 'echoCharm',
    name: 'Echo Charm',
    glyph: '☽',
    colour: '#a4faf0',
    description: 'The next spell you cast costs no mana.',
  },
};

export const CONSUMABLE_IDS: ConsumableId[] = Object.keys(CONSUMABLES) as ConsumableId[];

/** Max different kinds of consumable the player can carry at once. */
export const CONSUMABLE_SLOT_CAP = 3;
/** Max stack of a single consumable kind. */
export const CONSUMABLE_STACK_CAP = 3;
