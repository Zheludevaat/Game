import { RNG } from '../math/rng';
import { RoomType } from '../GameTypes';

const NAMES: Record<RoomType, string[]> = {
  start: ['The Threshold', 'Vestibule of the Crown', 'Outer Gate'],
  enemy: [
    'The Salt Vault',
    'Mercurial Passage',
    'Chamber of Calcination',
    'Hall of the Unlit Sephiroth',
    'The Brass Vein',
    'Gate of the Lesser Moon',
    'Saturnine Hall',
    'Vault of Ash',
    'Corridor of Echoes',
  ],
  treasure: ['Reliquary of Sol', 'Argent Coffer', 'Cabinet of Talismans'],
  shrine: ['Solar Crucible', 'Lunar Cistern', 'Altar of Spirits'],
  locked: ['Sealed Sanctum', 'Bound Vault', 'Iron Mercy'],
  exit: ['Descending Stair', 'The Sinking Step', 'Gate of Below'],
  miniBoss: ['Serpentine Chamber', 'Brass Crucible', 'The Caduceus Ring'],
  boss: ['Sanctum of the First Lamp', 'Sphere of the Warden', 'The Crowned Abyss'],
};

export function pickRoomName(type: RoomType, rng: RNG): string {
  const arr = NAMES[type];
  return arr[Math.floor(rng.next() * arr.length)];
}
