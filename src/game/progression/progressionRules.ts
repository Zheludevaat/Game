import { SphereId } from '../data/spheres';

/** 1-based index within the current 8-floor block (1–8). */
function localFloorIndex(floor: number): number {
  return ((floor - 1) % 8) + 1;
}

/** Floors 1–7 in every 8-floor block are planetary Warden floors. */
export function isPlanetaryWardenFloor(floor: number): boolean {
  if (floor < 1) return false;
  return localFloorIndex(floor) <= 7;
}

/** The seven planetary sphere IDs the player must defeat before the Ogdoad. */
export function requiredWardenIdsBeforeOgdoad(): string[] {
  return ['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn'];
}
