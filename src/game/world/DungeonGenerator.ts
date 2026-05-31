import { RNG, hashSeed } from '../math/rng';
import { Floor, Room, RoomType } from '../GameTypes';
import { pickRoomName } from '../data/roomNames';
import { isPlanetaryWardenFloor } from '../progression/progressionRules';

interface GenOptions {
  floor: number;
  seed: number;
}

function keyOf(x: number, y: number): string {
  return `${x},${y}`;
}

export function generateFloor(opts: GenOptions): Floor {
  const { floor, seed } = opts;
  const rng = new RNG(seed);

  const isBoss = isPlanetaryWardenFloor(floor);
  const isMiniBoss = !isBoss && floor > 0 && floor % 5 === 0;

  // Planetary Warden floors use the random-walk generator with the farthest
  // room turned into a boss room. The fixed buildBossFloor layout is kept
  // as a fallback for debug or endless mode if needed.
  //
  // Otherwise: random-walk dungeon
  const target = Math.min(7 + Math.floor(floor * 1.5), 16);
  const grid = new Map<string, Room>();
  let nextId = 1;

  const addRoom = (x: number, y: number, type: RoomType, name: string): Room => {
    const room: Room = {
      id: nextId++,
      grid: { x, y },
      type,
      doors: { up: false, down: false, left: false, right: false },
      discovered: false,
      visited: false,
      cleared: type === 'start',
      enemiesSpawned: false,
      hasChest: false,
      chestLocked: false,
      chestOpened: false,
      hasShrine: false,
      shrineUsed: false,
      name,
      seed: hashSeed(seed, x, y),
    };
    grid.set(keyOf(x, y), room);
    return room;
  };

  // Start
  addRoom(0, 0, 'start', pickRoomName('start', rng));

  // Random walk frontier
  const frontier: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  while (grid.size < target && frontier.length) {
    const idx = rng.int(0, frontier.length);
    const base = frontier[idx];
    const dirs = shuffle([
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    ], rng);
    let placed = false;
    for (const d of dirs) {
      const nx = base.x + d.x;
      const ny = base.y + d.y;
      if (grid.has(keyOf(nx, ny))) continue;
      // Limit branching to keep map readable
      const neighbours = countNeighbours(grid, nx, ny);
      if (neighbours > 1 && rng.chance(0.6)) continue;
      addRoom(nx, ny, 'enemy', pickRoomName('enemy', rng));
      frontier.push({ x: nx, y: ny });
      placed = true;
      break;
    }
    if (!placed) frontier.splice(idx, 1);
  }

  // Connect doors based on adjacency
  for (const room of grid.values()) {
    const { x, y } = room.grid;
    if (grid.has(keyOf(x, y - 1))) room.doors.up = true;
    if (grid.has(keyOf(x, y + 1))) room.doors.down = true;
    if (grid.has(keyOf(x - 1, y))) room.doors.left = true;
    if (grid.has(keyOf(x + 1, y))) room.doors.right = true;
  }

  // Pick farthest room as exit
  const dists = bfsDistances(grid, 0, 0);
  let farthest: { key: string; d: number } = { key: '0,0', d: 0 };
  for (const [k, d] of dists) {
    if (d > farthest.d) farthest = { key: k, d };
  }
  const exitRoom = grid.get(farthest.key)!;
  exitRoom.type = isBoss ? 'boss' : 'exit';
  exitRoom.name = pickRoomName(exitRoom.type, rng);
  exitRoom.cleared = false;
  exitRoom.enemiesSpawned = false;

  // Sprinkle special room types on non-start, non-exit rooms
  const others = [...grid.values()].filter((r) => r.type === 'enemy');
  shuffleInPlace(others, rng);

  // Treasure rooms — at least 1, scale to floor
  const treasureCount = Math.max(1, Math.floor(1 + floor / 4));
  for (let i = 0; i < treasureCount && others.length; i++) {
    const r = others.pop()!;
    r.type = 'treasure';
    r.name = pickRoomName('treasure', rng);
    r.cleared = true;
    r.hasChest = true;
    r.chestLocked = rng.chance(0.35);
  }
  // Shrine room — 1 always
  if (others.length) {
    const r = others.pop()!;
    r.type = 'shrine';
    r.name = pickRoomName('shrine', rng);
    r.cleared = true;
    r.hasShrine = true;
    r.shrineKind = pickShrineKind(rng);
  }
  // Locked room — sometimes
  if (others.length && rng.chance(0.6)) {
    const r = others.pop()!;
    r.type = 'locked';
    r.name = pickRoomName('locked', rng);
    r.hasChest = true;
    r.chestLocked = true;
  }
  // Sanctuary — ~8% chance, capped at 1 per floor
  if (others.length && rng.chance(0.08)) {
    const r = others.pop()!;
    r.type = 'sanctuary';
    r.name = pickRoomName('sanctuary', rng);
    r.cleared = true;
  }
  // MiniBoss on floor%5==0
  if (isMiniBoss && others.length) {
    const r = others.pop()!;
    r.type = 'miniBoss';
    r.name = pickRoomName('miniBoss', rng);
    r.cleared = false;
    r.enemiesSpawned = false;
  }
  // Some enemy rooms also have chests
  for (const r of others) {
    if (rng.chance(0.25)) {
      r.hasChest = true;
      r.chestLocked = rng.chance(0.2);
    }
  }

  const rooms = [...grid.values()];
  const startRoom = grid.get('0,0')!;

  return {
    number: floor,
    seed,
    rooms,
    roomGrid: grid,
    startRoomId: startRoom.id,
    exitRoomId: exitRoom.id,
    isBoss,
    isMiniBoss,
  };
}

/* buildBossFloor removed in favor of full random-walk warden floors.
 * Preserve in git history if a linear boss-only layout is needed later. */

function countNeighbours(grid: Map<string, Room>, x: number, y: number): number {
  let c = 0;
  if (grid.has(keyOf(x + 1, y))) c++;
  if (grid.has(keyOf(x - 1, y))) c++;
  if (grid.has(keyOf(x, y + 1))) c++;
  if (grid.has(keyOf(x, y - 1))) c++;
  return c;
}

function bfsDistances(grid: Map<string, Room>, sx: number, sy: number): Map<string, number> {
  const out = new Map<string, number>();
  const q: { x: number; y: number; d: number }[] = [{ x: sx, y: sy, d: 0 }];
  out.set(keyOf(sx, sy), 0);
  while (q.length) {
    const { x, y, d } = q.shift()!;
    const neighbours = [
      { x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 },
    ];
    for (const n of neighbours) {
      const k = keyOf(n.x, n.y);
      if (!grid.has(k) || out.has(k)) continue;
      out.set(k, d + 1);
      q.push({ x: n.x, y: n.y, d: d + 1 });
    }
  }
  return out;
}

function shuffle<T>(arr: T[], rng: RNG): T[] {
  const a = arr.slice();
  shuffleInPlace(a, rng);
  return a;
}
function shuffleInPlace<T>(arr: T[], rng: RNG): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function pickShrineKind(rng: RNG): import('../GameTypes').ShrineKind {
  const kinds: import('../GameTypes').ShrineKind[] = [
    'calcination', 'dissolution', 'separation', 'conjunction',
    'fermentation', 'distillation', 'coagulation',
  ];
  return kinds[rng.int(0, kinds.length)];
}
