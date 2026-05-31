import { SphereDef, SphereId, SPHERES, SPHERE_BY_ID } from '../data/spheres';

const PLANETARY_SPHERES = SPHERES.filter((s) => s.id !== 'ogdoad');

export function storyCycleIndexForFloor(floor: number): number {
  if (floor < 1) return 0;
  return Math.floor((floor - 1) / 8);
}

export function isPlanetaryWardenFloor(floor: number): boolean {
  const local = ((floor - 1) % 8) + 1;
  return local >= 1 && local <= 7;
}

export function isOgdoadFloorNumber(floor: number): boolean {
  return floor >= 1 && ((floor - 1) % 8) + 1 === 8;
}

export function sphereForProgressionFloor(floor: number): SphereDef {
  if (floor < 1) return PLANETARY_SPHERES[0]!;
  if (isOgdoadFloorNumber(floor)) return SPHERE_BY_ID.ogdoad;
  const local = ((floor - 1) % 8) + 1;
  return PLANETARY_SPHERES[local - 1]!;
}

export function requiredWardenIdsBeforeOgdoad(): SphereId[] {
  return PLANETARY_SPHERES.map((s) => s.id);
}

export function isSaturnWardenFloor(floor: number): boolean {
  return sphereForProgressionFloor(floor).id === 'saturn' && isPlanetaryWardenFloor(floor);
}
