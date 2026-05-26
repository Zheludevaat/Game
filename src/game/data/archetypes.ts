import { ArchetypeDef } from '../GameTypes';

export const ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'magus',
    name: 'The Magus',
    subtitle: 'Initiate of the Word',
    description: 'Balanced initiate, stronger spells, more mana.',
    startingRelic: 'emeraldTablet',
    startingWeapon: 'tarnishedDagger',
    startingSpell: 'frostLance',
    stats: {
      maxHp: 90,
      maxMp: 80,
      attack: 10,
      spellPower: 16,
      speed: 78,
      armor: 1,
      luck: 1,
      dashCooldown: 0.9,
      manaRegen: 4,
    },
  },
  {
    id: 'hermit',
    name: 'The Hermit',
    subtitle: 'Keeper of the Lamp',
    description: 'Slow, durable, melee-focused wanderer.',
    startingRelic: 'blackSalt',
    startingWeapon: 'boneCleaver',
    startingSpell: 'sparkBolt',
    stats: {
      maxHp: 130,
      maxMp: 40,
      attack: 16,
      spellPower: 8,
      speed: 64,
      armor: 4,
      luck: 1,
      dashCooldown: 1.1,
      manaRegen: 2,
    },
  },
  {
    id: 'star',
    name: 'The Star',
    subtitle: 'Vessel of Astral Fire',
    description: 'Fast, fragile, lucky vessel of astral fire.',
    startingRelic: 'lunarMirror',
    startingWeapon: 'twinSickles',
    startingSpell: 'sparkBolt',
    stats: {
      maxHp: 70,
      maxMp: 90,
      attack: 9,
      spellPower: 13,
      speed: 92,
      armor: 0,
      luck: 3,
      dashCooldown: 0.7,
      manaRegen: 6,
    },
  },
];

export function getArchetype(id: string): ArchetypeDef {
  return ARCHETYPES.find((a) => a.id === id) ?? ARCHETYPES[0];
}
