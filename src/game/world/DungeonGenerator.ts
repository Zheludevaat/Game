import { RNG, hashSeed } from '../math/rng';
import { Floor, Room, RoomType } from '../GameTypes';
import { pickRoomName } from '../data/roomNames';
import { sphereForFloor, SphereId } from '../data/spheres';
import { npcForSphere } from '../data/npcs';

/** Per-sphere modifier to the base room count. Mercury sprawls,
 *  Sun keeps it tight, Saturn fragments. */
const SPHERE_ROOM_MUL: Partial<Record<SphereId, number>> = {
  moon: 1.0,
  mercury: 1.35,
  venus: 1.05,
  sun: 0.85,
  mars: 1.0,
  jupiter: 1.15,
  saturn: 1.20,
};

/** Per-sphere "branch acceptance" — Mercury accepts more branching,
 *  Sun rejects branching for arena-feeling rooms. */
const SPHERE_BRANCH_BIAS: Partial<Record<SphereId, number>> = {
  mercury: 0.85, // accept more side passages
  sun: 0.30,     // reject most branches — long arena halls
  saturn: 0.75,
};

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

  const isBoss = floor > 0 && floor % 10 === 0;
  const isMiniBoss = !isBoss && floor > 0 && floor % 5 === 0;

  // Boss floor: minimal layout (start -> corridor -> boss)
  if (isBoss) {
    return buildBossFloor(floor, seed);
  }

  // Otherwise: random-walk dungeon. Per-sphere room-count + branch
  // bias shape the floor's silhouette so Mercury sprawls and Sun
  // stays tight even on the same base size.
  const sphere = sphereForFloor(floor).id;
  const baseTarget = 7 + Math.floor(floor * 1.5);
  const target = Math.min(
    Math.max(5, Math.round(baseTarget * (SPHERE_ROOM_MUL[sphere] ?? 1.0))),
    20,
  );
  const branchBias = SPHERE_BRANCH_BIAS[sphere] ?? 0.6;
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
      // Limit branching to keep map readable. Sphere-bias decides how
      // aggressively to refuse new branches at busy intersections.
      const neighbours = countNeighbours(grid, nx, ny);
      if (neighbours > 1 && rng.chance(branchBias)) continue;
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
  exitRoom.type = 'exit';
  exitRoom.name = pickRoomName('exit', rng);
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
  // Trap room — ~12 % per floor in spheres that own hazards (i.e.
  // every sphere except Moon / Ogdoad). Pre-cleared so the player can
  // see the hazards turn on the moment they step in. One per floor max.
  const sphereForTrap = sphereForFloor(floor).id;
  const sphereHasHazards =
    sphereForTrap !== 'moon' && sphereForTrap !== 'ogdoad';
  if (others.length && sphereHasHazards && rng.chance(0.12)) {
    const r = others.pop()!;
    r.type = 'trap';
    r.name = pickRoomName('trap', rng);
    r.cleared = true;       // no enemy combat — only the hazard grid
    r.enemiesSpawned = true;
  }
  // Sanctuary — non-hostile chamber hosting the sphere's wandering NPC.
  // ~25 % per floor in spheres that authored a wanderer, capped to 1.
  // Pre-cleared so combat doors never close.
  const sphereId = sphereForFloor(floor).id;
  let sanctuarySpawned = false;
  if (others.length && npcForSphere(sphereId) && rng.chance(0.25)) {
    const r = others.pop()!;
    r.type = 'sanctuary';
    r.name = pickRoomName('sanctuary', rng);
    r.cleared = true;
    r.enemiesSpawned = true;
    sanctuarySpawned = true;
  }
  // Lampwright marketplace — 5 % per floor at floors 5+, mutually
  // exclusive with the sphere wanderer slot. Rarer than the Mendicant,
  // pricier per visit, but the only reliable source of consumables
  // outside chest drops.
  if (others.length && !sanctuarySpawned && floor >= 5 && rng.chance(0.05)) {
    const r = others.pop()!;
    r.type = 'sanctuary';
    r.name = pickRoomName('sanctuary', rng);
    r.cleared = true;
    r.enemiesSpawned = true;
    r.sanctuaryNpcId = 'lampwright';
    sanctuarySpawned = true;
  }
  // Mendicant sanctuary — a rare independent roll on top. 7 % per
  // floor, and only when no other sanctuary landed (so a floor can't
  // double up). The engine reads sanctuaryNpcId to know which NPC to
  // populate.
  if (others.length && !sanctuarySpawned && rng.chance(0.07)) {
    const r = others.pop()!;
    r.type = 'sanctuary';
    r.name = pickRoomName('sanctuary', rng);
    r.cleared = true;
    r.enemiesSpawned = true;
    r.sanctuaryNpcId = 'mendicant';
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

  // Secret rooms — one per floor at 70 % probability, placed adjacent
  // to a regular enemy room. The secret room itself stays off the
  // minimap until the player physically enters it (markNeighbours-
  // Discovered in the engine skips secret rooms), so the player
  // discovers it by trying an unexpected door. Brass Ear still reveals
  // every cell since it's a meta-knowledge relic.
  if (rng.chance(0.7)) {
    const enemyRooms = [...grid.values()].filter((r) => r.type === 'enemy');
    shuffleInPlace(enemyRooms, rng);
    for (const candidate of enemyRooms) {
      const { x, y } = candidate.grid;
      const dirs = shuffle([
        { dx: 1, dy: 0, side: 'right' as const, opp: 'left' as const },
        { dx: -1, dy: 0, side: 'left' as const, opp: 'right' as const },
        { dx: 0, dy: 1, side: 'down' as const, opp: 'up' as const },
        { dx: 0, dy: -1, side: 'up' as const, opp: 'down' as const },
      ], rng);
      let placed = false;
      for (const d of dirs) {
        const nx = x + d.dx, ny = y + d.dy;
        if (grid.has(keyOf(nx, ny))) continue;
        // Free cell — drop the secret room and stitch one door.
        const secret = addRoom(nx, ny, 'secret', pickRoomName('secret', rng));
        secret.cleared = true;
        secret.enemiesSpawned = true;
        secret.hasChest = true;
        secret.chestLocked = false;
        candidate.doors[d.side] = true;
        secret.doors[d.opp] = true;
        placed = true;
        break;
      }
      if (placed) break;
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

function buildBossFloor(floor: number, seed: number): Floor {
  const rng = new RNG(seed);
  const grid = new Map<string, Room>();
  let nextId = 1;
  const mk = (x: number, y: number, type: RoomType, name: string, cleared: boolean): Room => {
    const room: Room = {
      id: nextId++,
      grid: { x, y },
      type,
      doors: { up: false, down: false, left: false, right: false },
      discovered: false,
      visited: false,
      cleared,
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
  const start = mk(0, 0, 'start', pickRoomName('start', rng), true);
  const shrine = mk(1, 0, 'shrine', pickRoomName('shrine', rng), true);
  shrine.hasShrine = true;
  shrine.shrineKind = pickShrineKind(rng);
  const treasure = mk(0, 1, 'treasure', pickRoomName('treasure', rng), true);
  treasure.hasChest = true;
  treasure.chestLocked = false;
  const boss = mk(2, 0, 'boss', pickRoomName('boss', rng), false);
  // doors
  for (const r of grid.values()) {
    const { x, y } = r.grid;
    if (grid.has(keyOf(x, y - 1))) r.doors.up = true;
    if (grid.has(keyOf(x, y + 1))) r.doors.down = true;
    if (grid.has(keyOf(x - 1, y))) r.doors.left = true;
    if (grid.has(keyOf(x + 1, y))) r.doors.right = true;
  }
  return {
    number: floor,
    seed,
    rooms: [...grid.values()],
    roomGrid: grid,
    startRoomId: start.id,
    exitRoomId: boss.id,
    isBoss: true,
    isMiniBoss: false,
  };
}

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
  // 10 % each for the special altars — kept rare so the canonical
  // seven Operations stay the dominant flavour.
  const roll = rng.next();
  if (roll < 0.10) return 'cursed';
  if (roll < 0.20) return 'library';
  if (roll < 0.30) return 'puzzle';
  return kinds[rng.int(0, kinds.length)];
}
