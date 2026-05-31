import { Room, RoomType } from '../GameTypes';

// ── Types ───────────────────────────────────────────────────────────────────

export type Direction = 'up' | 'down' | 'left' | 'right';

// ── Door availability ───────────────────────────────────────────────────────

/**
 * Whether a door in the given direction is passable.
 * A door is unavailable when the room is hostile (enemy/miniBoss/boss)
 * and hasn't been cleared yet.
 */
export function isDoorAvailable(
  roomType: RoomType,
  cleared: boolean,
  doorExists: boolean,
  direction: Direction,
): boolean {
  if (!doorExists) return false;
  const hostile = isHostileRoom(roomType) && !cleared;
  return !hostile;
}

/**
 * Returns true if the room type locks the player in until cleared.
 */
export function isHostileRoom(roomType: RoomType): boolean {
  return roomType === 'enemy' || roomType === 'miniBoss' || roomType === 'boss';
}

// ── Enemy check ─────────────────────────────────────────────────────────────

/**
 * Returns true if there are any enemies still alive in the room.
 */
export function areEnemiesStillAlive(enemyCount: number): boolean {
  return enemyCount > 0;
}

// ── Room transition ─────────────────────────────────────────────────────────

/**
 * Whether the player can transition from the current room to the target room.
 * The transition is blocked if the current room is hostile and not cleared.
 * The target room must exist.
 */
export function canTransitionToRoom(
  currentRoomType: RoomType,
  currentCleared: boolean,
  targetRoomExists: boolean,
): boolean {
  if (isHostileRoom(currentRoomType) && !currentCleared) return false;
  if (!targetRoomExists) return false;
  return true;
}
