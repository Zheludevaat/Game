import { describe, it, expect } from 'vitest';
import { generateFloor } from './DungeonGenerator';

describe('DungeonGenerator', () => {
  it('generates a floor with rooms', () => {
    const floor = generateFloor({ floor: 1, seed: 42 });
    expect(floor.rooms.length).toBeGreaterThan(3);
    expect(floor.startRoomId).toBeGreaterThan(0);
    expect(floor.exitRoomId).toBeGreaterThan(0);
  });

  it('the exit is reachable from the start (BFS)', () => {
    const floor = generateFloor({ floor: 1, seed: 42 });
    const startRoom = floor.rooms.find((r) => r.id === floor.startRoomId)!;
    const exitRoom = floor.rooms.find((r) => r.id === floor.exitRoomId)!;
    const reachable = bfsReachable(floor.rooms, startRoom.grid, exitRoom.grid);
    expect(reachable).toBe(true);
  });

  it('is deterministic for the same seed', () => {
    const a = generateFloor({ floor: 3, seed: 100 });
    const b = generateFloor({ floor: 3, seed: 100 });
    expect(a.rooms.length).toBe(b.rooms.length);
    expect(a.startRoomId).toBe(b.startRoomId);
    expect(a.exitRoomId).toBe(b.exitRoomId);
  });

  it('generates different layouts for different seeds', () => {
    const a = generateFloor({ floor: 5, seed: 1 });
    const b = generateFloor({ floor: 5, seed: 9999 });
    // Different seeds should produce different room counts
    // (very unlikely to collide)
    const sameLayout = a.rooms.length === b.rooms.length
      && a.startRoomId === b.startRoomId
      && a.exitRoomId === b.exitRoomId;
    expect(sameLayout).toBe(false);
  });

  it('first seven floors are Warden floors with a full dungeon and one boss room', () => {
    // Floors 1–7 use the random-walk generator (not buildBossFloor).
    for (let floorNo = 1; floorNo <= 7; floorNo++) {
      const floor = generateFloor({ floor: floorNo, seed: 42 });
      expect(floor.isBoss).toBe(true);
      const bossRooms = floor.rooms.filter((r) => r.type === 'boss');
      expect(bossRooms).toHaveLength(1);
      expect(floor.exitRoomId).toBe(bossRooms[0]!.id);
      // Full random-walk dungeon, not the old 4-room linear layout
      expect(floor.rooms.length).toBeGreaterThan(4);
    }
  });

  it('floor 8 is the Ogdoad transition, not a Warden boss room', () => {
    const floor = generateFloor({ floor: 8, seed: 42 });
    expect(floor.isBoss).toBe(false);
    expect(floor.rooms.some((room) => room.type === 'boss')).toBe(false);
  });

  it('exit room is always reachable on boss floors', () => {
    const floor = generateFloor({ floor: 1, seed: 42 });
    const startRoom = floor.rooms.find((r) => r.id === floor.startRoomId)!;
    const exitRoom = floor.rooms.find((r) => r.id === floor.exitRoomId)!;
    const reachable = bfsReachable(floor.rooms, startRoom.grid, exitRoom.grid);
    expect(reachable).toBe(true);
  });

  it('non-boss floors contain a variety of room types', () => {
    // Floor 8 is the Ogdoad, a non-boss floor
    const floor = generateFloor({ floor: 8, seed: 42 });
    const types = new Set(floor.rooms.map((r) => r.type));
    expect(types.has('start')).toBe(true);
    expect(types.has('exit')).toBe(true);
    // Should have at least one special room
    const special = ['treasure', 'shrine', 'locked', 'miniBoss'].filter((t) => types.has(t as any));
    expect(special.length).toBeGreaterThanOrEqual(1);
  });

  it('every door connects two rooms', () => {
    // Test across multiple seeds/levels to catch edge cases
    for (const args of [{ floor: 1, seed: 1 }, { floor: 3, seed: 77 }, { floor: 7, seed: 42 }, { floor: 5, seed: 999 }]) {
      const floor = generateFloor(args);
      const grid = new Map(floor.rooms.map((r) => [`${r.grid.x},${r.grid.y}`, r]));
      for (const room of floor.rooms) {
        const { grid: pos, doors } = room;
        const { x, y } = pos;
        const fail = (dir: string, nx: number, ny: number): string =>
          `floor ${args.floor} seed ${args.seed} room ${room.id} (${x},${y}) door ${dir} → (${nx},${ny}) missing`;
        if (doors.up)    expect(grid.has(`${x},${y - 1}`), fail('UP', x, y - 1)).toBe(true);
        if (doors.down)  expect(grid.has(`${x},${y + 1}`), fail('DOWN', x, y + 1)).toBe(true);
        if (doors.left)  expect(grid.has(`${x - 1},${y}`), fail('LEFT', x - 1, y)).toBe(true);
        if (doors.right) expect(grid.has(`${x + 1},${y}`), fail('RIGHT', x + 1, y)).toBe(true);
      }
    }
  });
});

function bfsReachable(rooms: RoomLike[], from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  const gridMap = new Map(rooms.map((r) => [`${r.grid.x},${r.grid.y}`, r]));
  const visited = new Set<string>();
  const queue = [`${from.x},${from.y}`];
  visited.add(queue[0]);
  while (queue.length > 0) {
    const key = queue.shift()!;
    if (key === `${to.x},${to.y}`) return true;
    const room = gridMap.get(key);
    if (!room) continue;
    const [x, y] = key.split(',').map(Number);
    if (room.doors.up)    tryAdd(`${x},${y - 1}`);
    if (room.doors.down)  tryAdd(`${x},${y + 1}`);
    if (room.doors.left)  tryAdd(`${x - 1},${y}`);
    if (room.doors.right) tryAdd(`${x + 1},${y}`);
    function tryAdd(k: string): void {
      if (!visited.has(k) && gridMap.has(k)) { visited.add(k); queue.push(k); }
    }
  }
  return false;
}

interface RoomLike { grid: { x: number; y: number }; doors: { up: boolean; down: boolean; left: boolean; right: boolean } }
