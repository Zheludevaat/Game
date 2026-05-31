import { requiredWardenIdsBeforeOgdoad } from '../progression/progressionRules';

// ── Ogdoad entry ────────────────────────────────────────────────────────────

/**
 * Whether the player has defeated enough Wardens to enter the Ogdoad.
 */
export function canEnterOgdoad(bossesDefeated: number): boolean {
  return bossesDefeated >= requiredWardenIdsBeforeOgdoad().length;
}

// ── Boss intro ──────────────────────────────────────────────────────────────

/**
 * Whether the boss-intro cinematic should play for the current sphere.
 * Returns false if the intro has already been played this run.
 */
export function shouldPlayBossIntro(sphereId: string, alreadyPlayed: boolean): boolean {
  return !alreadyPlayed;
}

// ── Boss defeat tracking ────────────────────────────────────────────────────

/**
 * Record a boss defeat by appending the sphere ID to the defeated list.
 * Returns a new array (immutable update).
 */
export function recordBossDefeat(sphereId: string, defeated: string[]): string[] {
  return [...defeated, sphereId];
}

// ── Floor navigation ───────────────────────────────────────────────────────

/**
 * The floor number the player should go to after taking the exit stairs.
 */
export function nextFloorAfterExit(currentFloor: number): number {
  return currentFloor + 1;
}
