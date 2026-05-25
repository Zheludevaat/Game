import { PALETTE, ROOM_H, ROOM_W, TILE, VIRTUAL_H, VIRTUAL_W } from './constants';
import { RNG, hashSeed } from './math/rng';
import { clamp, dist, lerp, norm } from './math/vec2';
import {
  ArchetypeDef, Floor, MetaState, RelicId, Room, RoomDoorState, RoomType, ShrineKind,
  SpellId, WeaponId,
} from './GameTypes';
import { getArchetype } from './data/archetypes';
import { RELICS, RELIC_IDS } from './data/relics';
import { SPELLS, SPELL_LOOT_POOL, STARTER_SPELL } from './data/spells';
import { WEAPONS, WEAPON_LOOT_POOL, STARTER_WEAPON } from './data/weapons';
import { CODEX, CODEX_BY_ID } from './data/codex';
import { SPHERES, SphereId, sphereForFloor, isOgdoadFloor } from './data/spheres';
import { generateFloor } from './world/DungeonGenerator';
import { ParticleSystem } from './rendering/Particles';
import {
  drawChest, drawEnemy, drawFloorTile, drawInitiate, drawShrine, drawStairs, drawTorch, drawWallTile, getEnemySize,
} from './rendering/PixelArt';
import { InputManager } from './input/InputManager';
import { audio } from './systems/AudioSystem';

export interface HudSnapshot {
  hp: number; maxHp: number;
  mp: number; maxMp: number;
  coins: number; keys: number; essence: number;
  floor: number;
  sphereId: SphereId;
  sphereName: string;
  sphereGlyph: string;
  sphereGodName: string;
  roomType: RoomType | null;
  roomName: string;
  relics: RelicId[];
  weapons: WeaponId[];
  spells: SpellId[];
  currentWeapon: WeaponId;
  currentSpell: SpellId;
  bossHp?: number;
  bossMaxHp?: number;
  bossName?: string;
  showBossBanner?: boolean;
  showFloorBanner?: boolean;
  floorBannerText?: string;
  damageNumbers: { id: number; x: number; y: number; value: number; life: number; colour: string }[];
  prompts: string[];
  inputMethod: 'controller' | 'keyboard' | 'touch';
  gamepadConnected: boolean;
  gamepadName: string;
  hint?: string;
  // For minimap
  rooms: { gx: number; gy: number; type: RoomType; discovered: boolean; current: boolean }[];
  pendingShrine?: { name: string; effect: string; downside: string };
  // For game over
  alive: boolean;
}

export interface EngineCallbacks {
  onHud: (h: HudSnapshot) => void;
  onPause: () => void;
  onOpenMap: () => void;
  onGameOver: (summary: RunSummary) => void;
  onFloorChange: (n: number) => void;
  /** A codex entry was unlocked this run. The host should persist it to MetaState. */
  onCodexUnlock: (id: string) => void;
  /** The player reached the Eighth Sphere for the first time this run. */
  onOgdoadReached: () => void;
}

export interface RunSummary {
  floorReached: number;
  roomsCleared: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  essenceCollected: number;
  coinsCollected: number;
  relicsFound: RelicId[];
  weaponsFound: WeaponId[];
  spellsFound: SpellId[];
  codexUnlockedThisRun: string[];
  spheresVisited: SphereId[];
  ogdoadReached: boolean;
  bestFloor: number;
  archetype: ArchetypeDef;
}

interface Vec { x: number; y: number; }

interface PlayerState {
  pos: Vec;
  vel: Vec;
  hp: number; maxHp: number;
  mp: number; maxMp: number;
  attack: number; spellPower: number;
  speed: number;
  armor: number;
  luck: number;
  manaRegen: number;
  dashCooldown: number;
  dashCdMax: number;
  dashTimer: number; // seconds remaining in dash
  dashDir: Vec;
  iframes: number;
  facing: Vec;
  attackTimer: number; // remaining swing time
  spellTimer: number;
  attackCooldown: number;
  spellCooldown: number;
  walkPhase: number;
  flash: number;
  coins: number;
  keys: number;
  essence: number;
  relics: RelicId[];
  reviveAvailable: boolean;
  damageMul: number;
  weapons: WeaponId[];
  spells: SpellId[];
  weaponIdx: number;
  spellIdx: number;
  attackHitsLeft: number;       // remaining hits in a multi-hit weapon swing
  attackHitTimer: number;       // time until next hit in a multi-hit swing
}

interface Enemy {
  id: number;
  type: 'lesserShade' | 'mercuryImp' | 'saltGolem' | 'lunarWisp' | 'saturnKnight' | 'serpentOfBrass' | 'wardenBoss';
  visualKey: string;
  pos: Vec;
  vel: Vec;
  hp: number; maxHp: number;
  speed: number;
  radius: number;
  width: number; height: number;
  contactDamage: number;
  flash: number;
  attackTimer: number;
  state: 'idle' | 'chase' | 'attack' | 'cooldown' | 'charge' | 'cast';
  cooldown: number;
  facing: Vec;
  isBoss?: boolean;
  isMiniBoss?: boolean;
  phase?: number;
  phaseTimer?: number;
  pattern?: number;
  ai?: AIState;
}

interface AIState {
  jitterTimer?: number;
  jitterDir?: Vec;
  chargeTimer?: number;
  chargeDir?: Vec;
  prepTimer?: number;
}

interface Projectile {
  id: number;
  pos: Vec; vel: Vec;
  life: number;
  radius: number;
  damage: number;
  fromPlayer: boolean;
  pierce: number;
  homing: boolean;
  colour: string;
  trailColour: string;
}

interface Pickup {
  id: number;
  pos: Vec;
  kind: 'coin' | 'essence' | 'key' | 'hp' | 'mp' | 'relic' | 'weapon' | 'spell';
  value: number;
  relic?: RelicId;
  weapon?: WeaponId;
  spell?: SpellId;
  life: number;
}

interface SigilHazard {
  pos: Vec;
  timer: number;
  delay: number;
  damage: number;
  fired: boolean;
  fromPlayer?: boolean;
  radius?: number;
  colour?: string;
}

export interface EngineConfig {
  archetypeId: 'magus' | 'hermit' | 'star';
  startingFloor?: number;
  startingSeed?: number;
  meta: MetaState;
  reducedParticles?: boolean;
  runSeed?: number;
}

const ROOM_MARGIN = 18;
const PLAYER_RADIUS = 8;
const DASH_SPEED_MULT = 2.6;
const DASH_DURATION = 0.18;

let nextEntityId = 1;
const nid = (): number => nextEntityId++;

interface FloorTransition {
  t: number;
  duration: number;
}

interface RoomClearEffect {
  t: number;
  duration: number;
  x: number; y: number;
}

interface FloorBanner {
  t: number;
  duration: number;
  text: string;
}

interface DamageNumber {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  value: number;
  colour: string;
}

export class GameEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private fixedStep = 1 / 60;
  private running = false;
  private paused = false;
  private input!: InputManager;
  private cbs: EngineCallbacks;

  private archetype!: ArchetypeDef;
  private runSeed = 0;
  private meta!: MetaState;
  private reducedParticles = false;

  private floor!: Floor;
  private currentRoom!: Room;
  private player!: PlayerState;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private pickups: Pickup[] = [];
  private sigils: SigilHazard[] = [];
  private particles = new ParticleSystem();

  private summary: RunSummary;
  private camera = { x: 0, y: 0, shakeT: 0, shakeMag: 0 };
  private cameraDest = { x: 0, y: 0 };
  private floorTransition: FloorTransition | null = null;
  private floorBanner: FloorBanner | null = null;
  private bossBannerTimer = 0;
  private roomClearEffects: RoomClearEffect[] = [];
  private bossSnapshot: { hp: number; maxHp: number; name: string } | null = null;
  private pendingShrine: { kind: ShrineKind; name: string; effect: string; downside: string } | null = null;
  private damageNumbers: DamageNumber[] = [];
  private timeAlive = 0;
  private dead = false;
  private hudTimer = 0;

  constructor(cbs: EngineCallbacks) {
    this.cbs = cbs;
    this.summary = {
      floorReached: 1, roomsCleared: 0, enemiesDefeated: 0, bossesDefeated: 0,
      essenceCollected: 0, coinsCollected: 0, relicsFound: [],
      weaponsFound: [], spellsFound: [],
      codexUnlockedThisRun: [], spheresVisited: [], ogdoadReached: false,
      bestFloor: 0, archetype: getArchetype('magus'),
    };
  }

  mount(canvas: HTMLCanvasElement, input: InputManager, config: EngineConfig): void {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.input = input;
    this.input.attach();

    this.particles = new ParticleSystem();
    this.particles.reduce = !!config.reducedParticles;
    this.reducedParticles = !!config.reducedParticles;
    this.meta = config.meta;
    this.archetype = getArchetype(config.archetypeId);
    this.runSeed = config.runSeed ?? Math.floor(Math.random() * 0xffffffff);

    // Reset per-run summary fields
    this.summary.floorReached = config.startingFloor ?? 1;
    this.summary.roomsCleared = 0;
    this.summary.enemiesDefeated = 0;
    this.summary.bossesDefeated = 0;
    this.summary.essenceCollected = 0;
    this.summary.coinsCollected = 0;
    this.summary.relicsFound = [];
    this.summary.weaponsFound = [];
    this.summary.spellsFound = [];
    this.summary.codexUnlockedThisRun = [];
    this.summary.spheresVisited = [];
    this.summary.ogdoadReached = false;
    this.summary.archetype = this.archetype;

    this.initPlayer();
    this.goToFloor(config.startingFloor ?? 1);

    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  unmount(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.input?.detach?.();
  }

  setPaused(p: boolean): void {
    if (p === this.paused) return;
    this.paused = p;
    if (!p) this.lastTime = performance.now();
  }

  setReducedParticles(r: boolean): void {
    this.reducedParticles = r;
    this.particles.reduce = r;
  }

  // --- init ---------------------------------------------------------------

  private initPlayer(): void {
    const a = this.archetype;
    const bonusHp = this.meta.bonusMaxHp;
    const bonusMp = this.meta.bonusStartingMp;
    this.player = {
      pos: { x: ROOM_W / 2, y: ROOM_H / 2 },
      vel: { x: 0, y: 0 },
      hp: a.stats.maxHp + bonusHp,
      maxHp: a.stats.maxHp + bonusHp,
      mp: a.stats.maxMp + bonusMp,
      maxMp: a.stats.maxMp + bonusMp,
      attack: a.stats.attack,
      spellPower: a.stats.spellPower,
      speed: a.stats.speed,
      armor: a.stats.armor,
      luck: a.stats.luck,
      manaRegen: a.stats.manaRegen,
      dashCooldown: 0,
      dashCdMax: a.stats.dashCooldown,
      dashTimer: 0,
      dashDir: { x: 0, y: 0 },
      iframes: 0,
      facing: { x: 1, y: 0 },
      attackTimer: 0,
      spellTimer: 0,
      attackCooldown: 0,
      spellCooldown: 0,
      walkPhase: 0,
      flash: 0,
      coins: 0,
      keys: 1,
      essence: 0,
      relics: [],
      reviveAvailable: false,
      damageMul: 1,
      weapons: [STARTER_WEAPON],
      spells: [STARTER_SPELL],
      weaponIdx: 0,
      spellIdx: 0,
      attackHitsLeft: 0,
      attackHitTimer: 0,
    };
    this.grantRelic(a.startingRelic, true);
    this.summary.weaponsFound.push(STARTER_WEAPON);
    this.summary.spellsFound.push(STARTER_SPELL);

    // Debug hook: ?devloot=1 grants every weapon + spell for previewing
    if (typeof window !== 'undefined' && window.location?.search?.includes('devloot')) {
      for (const id of WEAPON_LOOT_POOL) {
        if (!this.player.weapons.includes(id)) {
          this.player.weapons.push(id);
          this.summary.weaponsFound.push(id);
        }
      }
      for (const id of SPELL_LOOT_POOL) {
        if (!this.player.spells.includes(id)) {
          this.player.spells.push(id);
          this.summary.spellsFound.push(id);
        }
      }
    }
  }

  private grantRelic(id: RelicId, silent = false): void {
    if (this.player.relics.includes(id)) return;
    this.player.relics.push(id);
    this.summary.relicsFound.push(id);
    // Apply passive effects
    switch (id) {
      case 'blackSalt':
        this.player.armor += 3;
        this.player.speed -= 8;
        break;
      case 'mercurySandals':
        this.player.speed += 18;
        break;
      case 'saturnSeal':
        this.player.dashCdMax += 0.4;
        this.player.attack += 4;
        break;
      case 'sulfurHeart':
        this.player.attack += 6;
        this.player.maxMp = Math.max(20, this.player.maxMp - 20);
        this.player.mp = Math.min(this.player.mp, this.player.maxMp);
        break;
      case 'chaliceOfLuna':
        this.player.manaRegen += 3;
        break;
      case 'roseCross':
        this.player.reviveAvailable = true;
        break;
      default:
        break;
    }
    if (!silent) {
      audio.sfx('chest');
      this.particles.burst(this.player.pos.x, this.player.pos.y - 12, 24, {
        colour: PALETTE.gold, life: 1, maxLife: 1, drag: 0.9,
      });
    }
  }

  private grantWeapon(id: WeaponId): boolean {
    if (this.player.weapons.includes(id)) return false;
    this.player.weapons.push(id);
    this.player.weaponIdx = this.player.weapons.length - 1;
    if (!this.summary.weaponsFound.includes(id)) this.summary.weaponsFound.push(id);
    const w = WEAPONS[id];
    this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 18, w.name, '#f4d27a');
    this.particles.burst(this.player.pos.x, this.player.pos.y - 6, 18, {
      colour: w.swingColour, life: 0.8, maxLife: 0.8, drag: 0.85,
    });
    audio.sfx('chest');
    return true;
  }

  /**
   * Unlock a codex entry by id. No-op if it doesn't exist or was already
   * unlocked this run (or persistently, via the host's meta state). Emits
   * a floating "REVELATION — title" damage-number-style note above the
   * player and notifies the host to persist.
   */
  private unlockCodex(id: string): void {
    const entry = CODEX_BY_ID[id];
    if (!entry) return;
    if (this.summary.codexUnlockedThisRun.includes(id)) return;
    if (this.meta.unlockedCodex.includes(id)) {
      // Already known across runs — silent, no extra UI.
      return;
    }
    this.summary.codexUnlockedThisRun.push(id);
    // Mirror into meta so subsequent unlock checks this run are correct.
    this.meta.unlockedCodex = [...this.meta.unlockedCodex, id];
    this.cbs.onCodexUnlock?.(id);
    // Floating revelation
    this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 22, 'REVELATION', '#ffe6a3');
    this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 12, entry.title, '#9b6cff');
    this.particles.burst(this.player.pos.x, this.player.pos.y - 8, 22, {
      colour: '#ffe6a3', life: 1.0, maxLife: 1.0, drag: 0.88,
    });
    audio.sfx('shrine');
  }

  private grantSpell(id: SpellId): boolean {
    if (this.player.spells.includes(id)) return false;
    this.player.spells.push(id);
    this.player.spellIdx = this.player.spells.length - 1;
    if (!this.summary.spellsFound.includes(id)) this.summary.spellsFound.push(id);
    const sp = SPELLS[id];
    this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 18, sp.name, '#9b6cff');
    this.particles.burst(this.player.pos.x, this.player.pos.y - 6, 18, {
      colour: sp.projColour, life: 0.8, maxLife: 0.8, drag: 0.85,
    });
    audio.sfx('chest');
    return true;
  }

  private goToFloor(n: number): void {
    const seed = hashSeed(this.runSeed, n);
    this.floor = generateFloor({ floor: n, seed });
    this.summary.floorReached = Math.max(this.summary.floorReached, n);
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.sigils = [];
    this.bossSnapshot = null;
    this.bossBannerTimer = 0;
    this.roomClearEffects = [];
    this.cbs.onFloorChange(n);
    const startRoom = this.floor.rooms.find((r) => r.id === this.floor.startRoomId)!;
    this.enterRoom(startRoom, { x: ROOM_W / 2, y: ROOM_H / 2 });

    // Narrative — name the floor by its planetary sphere.
    const sph = sphereForFloor(n);
    const isFirstReach = !this.summary.spheresVisited.includes(sph.id);
    if (isFirstReach) this.summary.spheresVisited.push(sph.id);
    const cycle = Math.floor((n - 1) / 7); // 0 = first ascent, 1 = second, …
    const suffix = cycle > 0 ? ` (Cycle ${cycle + 1})` : '';
    const bannerText = this.floor.isBoss
      ? `${sph.name} — Sanctum of the Warden`
      : `Floor ${n} · ${sph.inscription}${suffix}`;
    this.floorBanner = { t: 0, duration: 3.2, text: bannerText };

    // First time the player reaches each sphere, unlock its Governor entry —
    // and on the first three spheres, the matching Descent fragment.
    if (isFirstReach) {
      this.unlockCodex(`gov.${sph.id}`);
      if (sph.id === 'moon') this.unlockCodex('descent.mind');
      if (sph.id === 'mercury') this.unlockCodex('descent.anthropos');
      if (sph.id === 'venus') this.unlockCodex('descent.fall');
    }
    // Two narrative breadcrumbs at the very start of a new player's run.
    if (n === 1) {
      this.unlockCodex('awaken.pimander');
      this.unlockCodex('awaken.light');
    }
    // Reaching the Eighth Sphere is the climactic moment.
    if (isOgdoadFloor(n)) {
      if (!this.summary.ogdoadReached) {
        this.summary.ogdoadReached = true;
        this.unlockCodex('ogdoad.hymn');
        this.unlockCodex('ogdoad.alone');
        this.cbs.onOgdoadReached?.();
      }
    }

    this.floorTransition = { t: 0, duration: 0.9 };
    audio.startDungeonAmbience();
    audio.sfx('descend');
  }

  private enterRoom(room: Room, entryPos: Vec): void {
    this.currentRoom = room;
    room.visited = true;
    room.discovered = true;
    // Mark neighbours discovered
    this.markNeighboursDiscovered(room);
    // Reset transient
    this.projectiles = [];
    this.sigils = [];
    this.enemies = [];
    this.pickups = [];
    this.player.pos = { x: entryPos.x, y: entryPos.y };
    // Spawn content
    if (!room.cleared) {
      this.spawnRoomContent(room);
    }
    this.cameraDest = {
      x: clamp(this.player.pos.x - VIRTUAL_W / 2, 0, ROOM_W - VIRTUAL_W),
      y: clamp(this.player.pos.y - VIRTUAL_H / 2, 0, ROOM_H - VIRTUAL_H),
    };
    this.camera.x = this.cameraDest.x;
    this.camera.y = this.cameraDest.y;
    if (room.type === 'boss') {
      audio.sfx('bossWarn');
      this.bossBannerTimer = 2.2;
      this.camera.shakeT = 0.8;
      this.camera.shakeMag = 5;
    }
  }

  private markNeighboursDiscovered(room: Room): void {
    const { x, y } = room.grid;
    for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
      if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
      const n = this.floor.roomGrid.get(`${x + dx},${y + dy}`);
      if (n) n.discovered = true;
    }
  }

  private spawnRoomContent(room: Room): void {
    const rng = new RNG(room.seed);
    if (room.type === 'boss') {
      this.spawnBoss(this.floor.number, room.seed);
      room.enemiesSpawned = true;
      return;
    }
    if (room.type === 'miniBoss') {
      this.spawnEnemy('serpentOfBrass', { x: ROOM_W / 2, y: ROOM_H / 2 }, this.floor.number, true);
      room.enemiesSpawned = true;
      return;
    }
    if (room.type === 'enemy' || room.type === 'locked') {
      const count = 2 + Math.floor(this.floor.number / 2) + rng.int(0, 3);
      for (let i = 0; i < count; i++) {
        const type = this.pickEnemyType(rng);
        const x = ROOM_W * 0.2 + rng.next() * ROOM_W * 0.6;
        const y = ROOM_H * 0.25 + rng.next() * ROOM_H * 0.5;
        this.spawnEnemy(type, { x, y }, this.floor.number);
      }
      room.enemiesSpawned = true;
    }
  }

  private pickEnemyType(rng: RNG): Enemy['type'] {
    const floor = this.floor.number;
    const pool: Enemy['type'][] = ['lesserShade'];
    if (floor >= 1) pool.push('mercuryImp');
    if (floor >= 2) pool.push('lunarWisp');
    if (floor >= 3) pool.push('saltGolem');
    if (floor >= 4) pool.push('saturnKnight');
    return pool[rng.int(0, pool.length)];
  }

  private spawnEnemy(type: Enemy['type'], pos: Vec, floor: number, isMiniBoss = false): void {
    const lvl = 1 + (floor - 1) * 0.2;
    const e: Enemy = {
      id: nid(), type, visualKey: type,
      pos: { ...pos }, vel: { x: 0, y: 0 },
      hp: 10, maxHp: 10, speed: 50, radius: 8, width: 8, height: 8,
      contactDamage: 6, flash: 0, attackTimer: 0,
      state: 'chase', cooldown: 0, facing: { x: 1, y: 0 },
      ai: {},
    };
    switch (type) {
      case 'lesserShade':
        e.hp = e.maxHp = Math.round(16 * lvl); e.speed = 38; e.radius = 8; e.width = 8; e.height = 8; e.contactDamage = 6;
        break;
      case 'mercuryImp':
        e.hp = e.maxHp = Math.round(10 * lvl); e.speed = 72; e.radius = 7; e.width = 8; e.height = 7; e.contactDamage = 5;
        e.ai = { jitterTimer: 0.4, jitterDir: { x: 1, y: 0 } };
        break;
      case 'saltGolem':
        e.hp = e.maxHp = Math.round(48 * lvl); e.speed = 24; e.radius = 11; e.width = 10; e.height = 9; e.contactDamage = 12;
        break;
      case 'lunarWisp':
        e.hp = e.maxHp = Math.round(14 * lvl); e.speed = 32; e.radius = 7; e.width = 8; e.height = 7; e.contactDamage = 4;
        e.state = 'chase';
        break;
      case 'saturnKnight':
        e.hp = e.maxHp = Math.round(36 * lvl); e.speed = 42; e.radius = 10; e.width = 9; e.height = 9; e.contactDamage = 10;
        break;
      case 'serpentOfBrass':
        e.hp = e.maxHp = Math.round(120 * (1 + (floor - 1) * 0.25)); e.speed = 46; e.radius = 14; e.width = 14; e.height = 9; e.contactDamage = 12;
        e.isMiniBoss = true;
        break;
      case 'wardenBoss':
        e.hp = e.maxHp = Math.round(260 + 80 * (floor / 10)); e.speed = 28; e.radius = 18; e.width = 18; e.height = 16; e.contactDamage = 16;
        e.isBoss = true;
        e.phase = 1; e.phaseTimer = 0; e.pattern = 0;
        break;
    }
    if (isMiniBoss && !e.isBoss && !e.isMiniBoss) e.isMiniBoss = true;
    this.enemies.push(e);
  }

  private spawnBoss(floor: number, seed: number): void {
    const rng = new RNG(seed);
    this.spawnEnemy('wardenBoss', { x: ROOM_W / 2, y: ROOM_H / 2 - 20 }, floor);
    void rng;
  }

  // --- main loop ----------------------------------------------------------

  private loop = (now: number): void => {
    if (!this.running) return;
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.1) dt = 0.1;
    if (!this.paused) {
      this.accumulator += dt;
      while (this.accumulator >= this.fixedStep) {
        this.update(this.fixedStep);
        this.accumulator -= this.fixedStep;
      }
    }
    this.render();
    this.hudTimer += dt;
    if (this.hudTimer >= 0.05 || this.paused) {
      this.hudTimer = 0;
      this.emitHud();
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  // --- update -------------------------------------------------------------

  private update(dt: number): void {
    this.input.tick();
    this.timeAlive += dt;

    const s = this.input.state;
    if (s.pausePressed) { this.cbs.onPause(); return; }
    if (s.mapPressed) { this.cbs.onOpenMap(); return; }

    if (this.dead) return;

    if (this.pendingShrine) {
      // Shrine modal active — block movement, wait for confirm/cancel
      if (s.uiConfirm || s.interactPressed) this.confirmShrine(true);
      if (s.uiCancel) this.confirmShrine(false);
    } else {
      this.updatePlayer(dt, s);
    }

    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateSigils(dt);

    this.handleRoomTransition();
    this.updateCamera(dt);
    this.particles.update(dt);
    this.updateDamageNumbers(dt);

    if (this.floorBanner) {
      this.floorBanner.t += dt;
      if (this.floorBanner.t > this.floorBanner.duration) this.floorBanner = null;
    }
    if (this.bossBannerTimer > 0) this.bossBannerTimer -= dt;
    if (this.floorTransition) {
      this.floorTransition.t += dt;
      if (this.floorTransition.t > this.floorTransition.duration) this.floorTransition = null;
    }
    for (let i = this.roomClearEffects.length - 1; i >= 0; i--) {
      const e = this.roomClearEffects[i];
      e.t += dt;
      if (e.t > e.duration) this.roomClearEffects.splice(i, 1);
    }
  }

  private updatePlayer(dt: number, s: InputManager['state']): void {
    const p = this.player;
    // Cooldowns
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.iframes = Math.max(0, p.iframes - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.spellTimer = Math.max(0, p.spellTimer - dt);
    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    p.spellCooldown = Math.max(0, p.spellCooldown - dt);
    p.mp = Math.min(p.maxMp, p.mp + p.manaRegen * dt);

    // Dash
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      const ds = p.speed * DASH_SPEED_MULT;
      p.pos.x += p.dashDir.x * ds * dt;
      p.pos.y += p.dashDir.y * ds * dt;
      p.iframes = Math.max(p.iframes, 0.04);
      this.particles.trail(p.pos.x, p.pos.y + 4, PALETTE.teal);
    } else {
      // Movement
      const mvx = s.moveX, mvy = s.moveY;
      const ml = Math.hypot(mvx, mvy);
      if (ml > 0.05) {
        const dirX = mvx / Math.max(ml, 1);
        const dirY = mvy / Math.max(ml, 1);
        p.vel.x = dirX * p.speed;
        p.vel.y = dirY * p.speed;
        p.facing = { x: dirX, y: dirY };
        p.walkPhase += dt * 10;
      } else {
        p.vel.x = 0; p.vel.y = 0;
      }
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
    }

    // Bounds — let the player walk into the doorway gap when a door is open
    const room = this.currentRoom;
    const hostileBounds = (room.type === 'enemy' || room.type === 'miniBoss' || room.type === 'boss') && !room.cleared;
    const dwHalf = 22;
    const inXDoor = Math.abs(p.pos.x - ROOM_W / 2) < dwHalf;
    const inYDoor = Math.abs(p.pos.y - ROOM_H / 2) < dwHalf;
    const passL = room.doors.left  && !hostileBounds && inYDoor;
    const passR = room.doors.right && !hostileBounds && inYDoor;
    const passU = room.doors.up    && !hostileBounds && inXDoor;
    const passD = room.doors.down  && !hostileBounds && inXDoor;
    p.pos.x = clamp(p.pos.x, passL ? 2 : ROOM_MARGIN, passR ? ROOM_W - 2 : ROOM_W - ROOM_MARGIN);
    p.pos.y = clamp(p.pos.y, passU ? 2 : ROOM_MARGIN + 4, passD ? ROOM_H - 2 : ROOM_H - ROOM_MARGIN);

    // Actions
    if (s.dashPressed && p.dashCooldown <= 0) {
      const dx = s.moveX, dy = s.moveY;
      const dl = Math.hypot(dx, dy);
      const dir = dl > 0.05 ? { x: dx / dl, y: dy / dl } : p.facing;
      p.dashTimer = DASH_DURATION;
      p.dashDir = dir;
      p.dashCooldown = p.dashCdMax;
      p.iframes = Math.max(p.iframes, DASH_DURATION + 0.05);
      audio.sfx('dash');
    }

    if ((s.attackPressed || s.attackHeld) && p.attackCooldown <= 0) {
      const w = WEAPONS[p.weapons[p.weaponIdx]];
      this.performMelee();
      p.attackCooldown = w.cooldown;
      p.attackTimer = w.duration;
      p.attackHitsLeft = Math.max(0, w.hits - 1);
      p.attackHitTimer = w.duration / Math.max(1, w.hits);
    }

    // Multi-hit follow-ups (e.g. twin sickles)
    if (p.attackHitsLeft > 0) {
      p.attackHitTimer -= dt;
      if (p.attackHitTimer <= 0) {
        this.performMelee();
        p.attackHitsLeft -= 1;
        const w = WEAPONS[p.weapons[p.weaponIdx]];
        p.attackHitTimer = w.duration / Math.max(1, w.hits);
      }
    }

    if ((s.spellPressed || s.spellHeld) && p.spellCooldown <= 0) {
      const sp = SPELLS[p.spells[p.spellIdx]];
      if (p.mp >= sp.manaCost) {
        this.castSpell();
        p.spellCooldown = sp.cooldown;
        p.spellTimer = 0.18;
        p.mp = Math.max(0, p.mp - sp.manaCost);
      }
    }

    if (s.interactPressed) {
      this.tryInteract();
    }

    if (s.cycleWeaponPressed && p.weapons.length > 1) {
      p.weaponIdx = (p.weaponIdx + 1) % p.weapons.length;
      audio.sfx('pickup');
      const w = WEAPONS[p.weapons[p.weaponIdx]];
      this.spawnDamageNumber(p.pos.x, p.pos.y - 16, w.name, '#f4d27a');
    }
    if (s.cycleSpellPressed && p.spells.length > 1) {
      p.spellIdx = (p.spellIdx + 1) % p.spells.length;
      audio.sfx('pickup');
      const sp = SPELLS[p.spells[p.spellIdx]];
      this.spawnDamageNumber(p.pos.x, p.pos.y - 16, sp.name, '#9b6cff');
    }

    // Death check
    if (p.hp <= 0) this.tryRevive();
  }

  private tryRevive(): void {
    const p = this.player;
    if (p.reviveAvailable) {
      p.reviveAvailable = false;
      p.hp = Math.floor(p.maxHp * 0.5);
      p.iframes = 1.4;
      this.particles.burst(p.pos.x, p.pos.y, 40, { colour: '#ffd97a', life: 1.2, maxLife: 1.2 });
      this.spawnDamageNumber(p.pos.x, p.pos.y, '+REVIVE', '#ffd97a');
      audio.sfx('shrine');
      return;
    }
    this.die();
  }

  private die(): void {
    if (this.dead) return;
    this.dead = true;
    // The soul is dissolved and prepares for rebirth (palingenesia).
    this.unlockCodex('death.palingenesia');
    this.cbs.onGameOver({
      ...this.summary,
      bestFloor: Math.max(this.summary.bestFloor, this.summary.floorReached),
    });
  }

  private performMelee(): void {
    const p = this.player;
    const w = WEAPONS[p.weapons[p.weaponIdx]];
    const fx = p.facing.x || 1, fy = p.facing.y;
    const fl = Math.hypot(fx, fy) || 1;
    const ux = fx / fl, uy = fy / fl;
    const baseAngle = Math.atan2(fy, fx);
    const dmg = p.attack * p.damageMul * w.damageMul;

    // Hit detection — circle around an offset point, gated by angle to the facing
    const reach = w.range;
    const cx = p.pos.x + ux * (reach * 0.55);
    const cy = p.pos.y + uy * (reach * 0.55);
    for (const e of this.enemies) {
      const dx = e.pos.x - p.pos.x, dy = e.pos.y - p.pos.y;
      const dToCentre = Math.hypot(e.pos.x - cx, e.pos.y - cy);
      if (dToCentre > reach + e.radius) continue;
      // angle gate
      const a = Math.atan2(dy, dx);
      let da = a - baseAngle;
      while (da >  Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > w.arcHalf) continue;
      this.damageEnemy(e, dmg, { x: dx, y: dy }, w.knockback);
    }
    audio.sfx('attack');

    // Particles styled per swing type
    if (!this.reducedParticles) {
      const palette = [w.swingColour, w.accentColour];
      if (w.swingType === 'overhead') {
        // heavy slam: radial burst + shake
        this.camera.shakeT = 0.18; this.camera.shakeMag = 3;
        for (let i = 0; i < 14; i++) {
          const a = baseAngle + (i / 14 - 0.5) * w.arcHalf * 2;
          this.particles.emit({
            x: cx, y: cy,
            vx: Math.cos(a) * 95, vy: Math.sin(a) * 95,
            life: 0.28, maxLife: 0.28,
            size: 1.6, colour: palette[i % 2]!, drag: 0.88,
          });
        }
      } else if (w.swingType === 'lunge') {
        // forward dust streak
        for (let i = 0; i < 8; i++) {
          this.particles.emit({
            x: p.pos.x + ux * (8 + i * 2),
            y: p.pos.y + uy * (8 + i * 2),
            vx: ux * 60 + (Math.random() - 0.5) * 20,
            vy: uy * 60 + (Math.random() - 0.5) * 20,
            life: 0.22, maxLife: 0.22,
            size: 1.2, colour: palette[i % 2]!, drag: 0.9,
          });
        }
      } else {
        // arc / thrust / flurry — fanned sparks
        for (let i = 0; i < 6; i++) {
          const a = baseAngle + (Math.random() - 0.5) * w.arcHalf * 2;
          this.particles.emit({
            x: cx, y: cy,
            vx: Math.cos(a) * 70, vy: Math.sin(a) * 70,
            life: 0.18, maxLife: 0.18,
            size: 1.4, colour: palette[i % 2]!, drag: 0.9,
          });
        }
      }
    }
  }

  private castSpell(): void {
    const p = this.player;
    const sp = SPELLS[p.spells[p.spellIdx]];
    const fx = p.facing.x || 1, fy = p.facing.y;
    const fl = Math.hypot(fx, fy) || 1;
    const dir = { x: fx / fl, y: fy / fl };
    const baseAngle = Math.atan2(fy, fx);
    const dmg = p.spellPower * p.damageMul * sp.damageMul;
    const pierce = sp.pierce + (p.relics.includes('emeraldTablet') ? 1 : 0);
    const homing = sp.seeking || p.relics.includes('serpentWand');

    if (sp.kind === 'sigil') {
      // Place a sigil where the player faces (within sigilRange)
      const sx = p.pos.x + dir.x * (sp.sigilRange ?? 60);
      const sy = p.pos.y + dir.y * (sp.sigilRange ?? 60);
      this.sigils.push({
        pos: { x: sx, y: sy },
        timer: 0,
        delay: sp.sigilDelay ?? 0.5,
        damage: dmg,
        fired: false,
        fromPlayer: true,
        radius: sp.radius,
        colour: sp.projColour,
      });
      audio.sfx('spell');
      return;
    }

    const count = Math.max(1, sp.projCount);
    const totalSpread = sp.spreadHalf * 2;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1)) - 0.5; // -0.5 to 0.5
      const a = baseAngle + t * totalSpread;
      const ux = Math.cos(a), uy = Math.sin(a);
      const proj: Projectile = {
        id: nid(),
        pos: { x: p.pos.x + ux * 8, y: p.pos.y + uy * 8 },
        vel: { x: ux * sp.speed, y: uy * sp.speed },
        life: sp.life,
        radius: sp.radius,
        damage: dmg,
        fromPlayer: true,
        pierce,
        homing,
        colour: sp.projColour,
        trailColour: sp.trailColour,
      };
      // Mark visual kind on the projectile via a side channel
      (proj as Projectile & { visual?: string; explodeRadius?: number }).visual = sp.projVisual;
      (proj as Projectile & { visual?: string; explodeRadius?: number }).explodeRadius = sp.explodeRadius;
      this.projectiles.push(proj);
    }
    audio.sfx('spell');
  }

  private tryInteract(): void {
    const p = this.player;
    const room = this.currentRoom;
    // Stairs
    if (room.type === 'exit' && this.isNearCenter(p.pos)) {
      this.descend();
      return;
    }
    // Chest
    if (room.hasChest && !room.chestOpened) {
      const cx = ROOM_W / 2, cy = ROOM_H / 2 + 4;
      if (dist(p.pos, { x: cx, y: cy }) < 30) {
        if (room.chestLocked) {
          const consume = !(p.relics.includes('keyOfTheGate') && Math.random() < 0.35);
          if (p.keys <= 0) return;
          if (consume) p.keys -= 1;
        }
        room.chestOpened = true;
        this.openChestLoot(cx, cy);
        return;
      }
    }
    // Shrine
    if (room.hasShrine && !room.shrineUsed) {
      const cx = ROOM_W / 2, cy = ROOM_H / 2 - 8;
      if (dist(p.pos, { x: cx, y: cy }) < 28) {
        this.beginShrine(room.shrineKind!);
      }
    }
  }

  private isNearCenter(pos: Vec): boolean {
    return dist(pos, { x: ROOM_W / 2, y: ROOM_H / 2 }) < 36;
  }

  private openChestLoot(x: number, y: number): void {
    audio.sfx('chest');
    const r = Math.random();
    // 12% weapon, 12% spell, 14% relic, rest is gold/essence
    if (r < 0.12) {
      const pool = WEAPON_LOOT_POOL.filter((id) => !this.player.weapons.includes(id));
      if (pool.length > 0) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        this.pickups.push({ id: nid(), pos: { x, y }, kind: 'weapon', value: 0, weapon: id, life: 30 });
        return;
      }
    }
    if (r < 0.24) {
      const pool = SPELL_LOOT_POOL.filter((id) => !this.player.spells.includes(id));
      if (pool.length > 0) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        this.pickups.push({ id: nid(), pos: { x, y }, kind: 'spell', value: 0, spell: id, life: 30 });
        return;
      }
    }
    if (r < 0.38) {
      // relic
      const owned = new Set(this.player.relics);
      const pool = RELIC_IDS.filter((id) => !owned.has(id));
      if (pool.length > 0) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        this.pickups.push({ id: nid(), pos: { x, y }, kind: 'relic', value: 0, relic: id, life: 20 });
        return;
      }
    }
    // Coins + essence + possible pickups
    const luck = 1 + this.player.luck * 0.05;
    const coinBoost = this.player.relics.includes('solarCoin') ? 1.5 : 1;
    const coins = Math.round((6 + Math.random() * 10) * luck * coinBoost);
    const ess = Math.round((2 + Math.random() * 5) * coinBoost);
    for (let i = 0; i < coins / 2; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 8 + Math.random() * 16;
      this.pickups.push({
        id: nid(),
        pos: { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d },
        kind: 'coin', value: 2, life: 18,
      });
    }
    for (let i = 0; i < ess; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 8 + Math.random() * 14;
      this.pickups.push({
        id: nid(),
        pos: { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d },
        kind: 'essence', value: 1, life: 18,
      });
    }
    if (Math.random() < 0.45) {
      this.pickups.push({ id: nid(), pos: { x: x - 12, y: y + 4 }, kind: 'hp', value: 18, life: 18 });
    }
    if (Math.random() < 0.45) {
      this.pickups.push({ id: nid(), pos: { x: x + 12, y: y + 4 }, kind: 'mp', value: 25, life: 18 });
    }
    if (Math.random() < 0.18) {
      this.pickups.push({ id: nid(), pos: { x, y: y + 18 }, kind: 'key', value: 1, life: 22 });
    }
    this.particles.burst(x, y, 30, { colour: PALETTE.gold, life: 1, maxLife: 1, drag: 0.9 });
  }

  private beginShrine(kind: ShrineKind): void {
    const map: Record<ShrineKind, { name: string; effect: string; downside: string }> = {
      calcination: { name: 'Calcination', effect: '+8 Attack', downside: '-10 Max Health' },
      dissolution: { name: 'Dissolution', effect: 'Restore Mana', downside: '-1 Armor (temporary)' },
      separation:  { name: 'Separation',  effect: '+12 Speed',  downside: '-3 Attack' },
      conjunction: { name: 'Conjunction', effect: 'Gain a relic', downside: 'Spawns extra shades' },
      fermentation:{ name: 'Fermentation',effect: '+2 Luck',     downside: 'Take 8 corruption damage' },
      distillation:{ name: 'Distillation',effect: 'Fully restore mana', downside: '-12 Coins' },
      coagulation: { name: 'Coagulation', effect: '+2 Armor',    downside: 'Dash slower' },
    };
    this.pendingShrine = { kind, ...map[kind] };
  }

  private confirmShrine(accepted: boolean): void {
    if (!this.pendingShrine) return;
    const room = this.currentRoom;
    const kind = this.pendingShrine.kind;
    if (accepted) {
      const p = this.player;
      switch (kind) {
        case 'calcination':
          p.attack += 8; p.maxHp = Math.max(20, p.maxHp - 10); p.hp = Math.min(p.hp, p.maxHp);
          break;
        case 'dissolution':
          p.mp = Math.min(p.maxMp, p.mp + 60);
          p.armor = Math.max(0, p.armor - 1);
          break;
        case 'separation':
          p.speed += 12; p.attack = Math.max(2, p.attack - 3);
          break;
        case 'conjunction': {
          const pool = RELIC_IDS.filter((id) => !p.relics.includes(id));
          if (pool.length) this.grantRelic(pool[Math.floor(Math.random() * pool.length)]);
          // spawn extra shades
          for (let i = 0; i < 3; i++) {
            this.spawnEnemy('lesserShade', {
              x: ROOM_W * 0.3 + Math.random() * ROOM_W * 0.4,
              y: ROOM_H * 0.3 + Math.random() * ROOM_H * 0.4,
            }, this.floor.number);
          }
          // Need to lock doors since enemies appeared
          if (this.enemies.length > 0) room.cleared = false;
          break;
        }
        case 'fermentation':
          p.luck += 2; p.hp = Math.max(1, p.hp - 8);
          break;
        case 'distillation':
          p.mp = p.maxMp;
          p.coins = Math.max(0, p.coins - 12);
          break;
        case 'coagulation':
          p.armor += 2;
          break;
      }
      room.shrineUsed = true;
      audio.sfx('shrine');
      this.particles.burst(ROOM_W / 2, ROOM_H / 2 - 16, 36, { colour: PALETTE.teal, life: 1.4, maxLife: 1.4 });
      // Reveal the teaching tied to this Operation.
      this.unlockCodex(`op.${kind}`);
    }
    this.pendingShrine = null;
  }

  private updateEnemies(dt: number): void {
    const p = this.player;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.flash = Math.max(0, e.flash - dt);
      e.cooldown = Math.max(0, e.cooldown - dt);
      e.attackTimer = Math.max(0, e.attackTimer - dt);
      const toP = { x: p.pos.x - e.pos.x, y: p.pos.y - e.pos.y };
      const d = Math.hypot(toP.x, toP.y);
      const n = d > 0 ? { x: toP.x / d, y: toP.y / d } : { x: 0, y: 0 };
      e.facing = n;

      switch (e.type) {
        case 'lesserShade':
          this.moveTowards(e, n, e.speed, dt);
          break;
        case 'mercuryImp': {
          if (!e.ai) e.ai = {};
          e.ai.jitterTimer = (e.ai.jitterTimer ?? 0) - dt;
          if (e.ai.jitterTimer <= 0) {
            const a = Math.atan2(n.y, n.x) + (Math.random() - 0.5) * 1.6;
            e.ai.jitterDir = { x: Math.cos(a), y: Math.sin(a) };
            e.ai.jitterTimer = 0.18 + Math.random() * 0.25;
          }
          this.moveTowards(e, e.ai.jitterDir!, e.speed, dt);
          break;
        }
        case 'saltGolem':
          if (d > 16) this.moveTowards(e, n, e.speed, dt);
          break;
        case 'lunarWisp': {
          // Keeps distance, fires moon bolts
          const target = 96;
          let dir = n;
          if (d < target) dir = { x: -n.x, y: -n.y };
          else if (d > target + 24) dir = n;
          else { dir = { x: -n.y, y: n.x }; } // strafe
          this.moveTowards(e, dir, e.speed, dt);
          if (e.cooldown <= 0 && d < 220) {
            const sp = 130;
            this.projectiles.push({
              id: nid(),
              pos: { x: e.pos.x, y: e.pos.y },
              vel: { x: n.x * sp, y: n.y * sp },
              life: 2.2, radius: 4, damage: 8,
              fromPlayer: false, pierce: 0, homing: false,
              colour: '#9b6cff', trailColour: '#3a1d70',
            });
            e.cooldown = 1.5;
          }
          break;
        }
        case 'saturnKnight': {
          if (!e.ai) e.ai = {};
          if ((e.ai.prepTimer ?? 0) > 0) {
            e.ai.prepTimer = (e.ai.prepTimer ?? 0) - dt;
            // telegraph: face player, glow
            if ((e.ai.prepTimer ?? 0) <= 0) {
              e.ai.chargeTimer = 0.45;
              e.ai.chargeDir = n;
              audio.sfx('doorLock');
            }
          } else if ((e.ai.chargeTimer ?? 0) > 0) {
            e.ai.chargeTimer = (e.ai.chargeTimer ?? 0) - dt;
            this.moveTowards(e, e.ai.chargeDir!, 180, dt);
          } else {
            this.moveTowards(e, n, e.speed, dt);
            if (d < 80 && e.cooldown <= 0) {
              e.ai.prepTimer = 0.5;
              e.cooldown = 2.4;
            }
          }
          break;
        }
        case 'serpentOfBrass': {
          // Mini-boss: spits projectiles in arcs while wavy chasing
          const t = this.timeAlive;
          const perp = { x: -n.y, y: n.x };
          const wave = Math.sin(t * 4) * 0.6;
          const dir = { x: n.x + perp.x * wave, y: n.y + perp.y * wave };
          this.moveTowards(e, norm(dir), e.speed, dt);
          if (e.cooldown <= 0 && d < 280) {
            for (let k = -2; k <= 2; k++) {
              const a = Math.atan2(n.y, n.x) + k * 0.18;
              this.projectiles.push({
                id: nid(),
                pos: { x: e.pos.x, y: e.pos.y },
                vel: { x: Math.cos(a) * 120, y: Math.sin(a) * 120 },
                life: 2, radius: 4, damage: 10,
                fromPlayer: false, pierce: 0, homing: false,
                colour: '#f4d27a', trailColour: '#c8983f',
              });
            }
            e.cooldown = 1.6;
          }
          break;
        }
        case 'wardenBoss':
          this.updateWarden(e, dt, n, d);
          break;
      }
      // contact damage
      const collideR = e.radius + PLAYER_RADIUS;
      if (d < collideR) {
        this.damagePlayer(e.contactDamage);
        // knockback
        e.pos.x -= n.x * 4;
        e.pos.y -= n.y * 4;
      }
      // clamp
      e.pos.x = clamp(e.pos.x, ROOM_MARGIN, ROOM_W - ROOM_MARGIN);
      e.pos.y = clamp(e.pos.y, ROOM_MARGIN + 4, ROOM_H - ROOM_MARGIN);

      if (e.hp <= 0) {
        this.killEnemy(e, i);
      }
    }

    // Boss snapshot
    const boss = this.enemies.find((e) => e.isBoss);
    if (boss) {
      this.bossSnapshot = {
        hp: boss.hp, maxHp: boss.maxHp,
        name: 'Warden of the First Lamp',
      };
    } else if (this.bossSnapshot) {
      this.bossSnapshot = null;
    }

    // Room clear check
    if (!this.currentRoom.cleared && this.currentRoom.enemiesSpawned && this.enemies.length === 0) {
      this.onRoomCleared();
    }
  }

  private updateWarden(e: Enemy, dt: number, n: Vec, d: number): void {
    if (e.phase == null) e.phase = 1;
    if (e.phase === 1 && e.hp / e.maxHp < 0.6) { e.phase = 2; this.camera.shakeT = 0.6; this.camera.shakeMag = 4; audio.sfx('bossWarn'); }
    if (e.phase === 2 && e.hp / e.maxHp < 0.3) { e.phase = 3; this.camera.shakeT = 0.6; this.camera.shakeMag = 5; audio.sfx('bossWarn'); }

    // Slow drift toward player but keep distance
    const target = 80;
    let dir = n;
    if (d < target) dir = { x: -n.x, y: -n.y };
    this.moveTowards(e, dir, e.speed, dt);

    if (e.cooldown <= 0) {
      const pattern = (e.pattern ?? 0) % 3;
      if (pattern === 0) this.wardenRadialBurst(e);
      else if (pattern === 1) this.wardenSummon(e);
      else this.wardenSigils(e);
      e.pattern = (e.pattern ?? 0) + 1;
      e.cooldown = e.phase === 3 ? 1.5 : e.phase === 2 ? 2.0 : 2.5;
    }
  }

  private wardenRadialBurst(e: Enemy): void {
    const n = e.phase === 3 ? 16 : e.phase === 2 ? 12 : 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.projectiles.push({
        id: nid(),
        pos: { x: e.pos.x, y: e.pos.y },
        vel: { x: Math.cos(a) * 110, y: Math.sin(a) * 110 },
        life: 3, radius: 5, damage: 10,
        fromPlayer: false, pierce: 0, homing: false,
        colour: '#e23a4a', trailColour: '#7a1020',
      });
    }
    audio.sfx('spell');
  }

  private wardenSummon(_e: Enemy): void {
    const n = 2 + (this.enemies.find((x) => x.isBoss)?.phase ?? 1);
    for (let i = 0; i < n; i++) {
      this.spawnEnemy('lesserShade', {
        x: ROOM_W * 0.25 + Math.random() * ROOM_W * 0.5,
        y: ROOM_H * 0.25 + Math.random() * ROOM_H * 0.5,
      }, this.floor.number);
    }
    audio.sfx('bossWarn');
  }

  private wardenSigils(_e: Enemy): void {
    const n = 5;
    for (let i = 0; i < n; i++) {
      this.sigils.push({
        pos: {
          x: ROOM_W * 0.2 + Math.random() * ROOM_W * 0.6,
          y: ROOM_H * 0.2 + Math.random() * ROOM_H * 0.6,
        },
        delay: 1.0,
        timer: 0,
        damage: 18,
        fired: false,
      });
    }
    audio.sfx('doorLock');
  }

  private moveTowards(e: Enemy, dir: Vec, speed: number, dt: number): void {
    e.pos.x += dir.x * speed * dt;
    e.pos.y += dir.y * speed * dt;
  }

  private killEnemy(e: Enemy, idx: number): void {
    this.enemies.splice(idx, 1);
    this.summary.enemiesDefeated += 1;
    this.particles.burst(e.pos.x, e.pos.y, e.isBoss ? 80 : e.isMiniBoss ? 40 : 18, {
      colour: e.isBoss ? '#ffd97a' : '#e23a4a', life: 0.9, maxLife: 0.9,
    });
    if (e.isBoss) {
      this.summary.bossesDefeated += 1;
      audio.sfx('bossDeath');
      this.camera.shakeT = 1.0; this.camera.shakeMag = 6;
      // The Warden of this sphere has fallen — the soul surrenders its tribute.
      const sph = sphereForFloor(this.floor.number);
      this.unlockCodex(`asc.${sph.id}`);
      // After two victories, Plotinus on Beauty. After three, Iamblichus on theurgy.
      if (this.summary.bossesDefeated >= 2) this.unlockCodex('ogdoad.beauty');
      if (this.summary.bossesDefeated >= 3) this.unlockCodex('ogdoad.theurgy');
      // drop relic and lots of essence
      const pool = RELIC_IDS.filter((id) => !this.player.relics.includes(id));
      if (pool.length) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        this.pickups.push({ id: nid(), pos: { ...e.pos }, kind: 'relic', value: 0, relic: id, life: 30 });
      }
      // Every boss drops either a weapon or a spell the player doesn't own yet.
      // Alternate by floor — odd floors give weapons, even floors give spells.
      const giveWeapon = this.floor.number % 2 === 1;
      if (giveWeapon) {
        const wPool = WEAPON_LOOT_POOL.filter((id) => !this.player.weapons.includes(id));
        if (wPool.length) {
          const id = wPool[Math.floor(Math.random() * wPool.length)];
          this.pickups.push({ id: nid(), pos: { x: e.pos.x + 16, y: e.pos.y }, kind: 'weapon', value: 0, weapon: id, life: 60 });
        } else {
          const sPool = SPELL_LOOT_POOL.filter((id) => !this.player.spells.includes(id));
          if (sPool.length) {
            const id = sPool[Math.floor(Math.random() * sPool.length)];
            this.pickups.push({ id: nid(), pos: { x: e.pos.x + 16, y: e.pos.y }, kind: 'spell', value: 0, spell: id, life: 60 });
          }
        }
      } else {
        const sPool = SPELL_LOOT_POOL.filter((id) => !this.player.spells.includes(id));
        if (sPool.length) {
          const id = sPool[Math.floor(Math.random() * sPool.length)];
          this.pickups.push({ id: nid(), pos: { x: e.pos.x + 16, y: e.pos.y }, kind: 'spell', value: 0, spell: id, life: 60 });
        } else {
          const wPool = WEAPON_LOOT_POOL.filter((id) => !this.player.weapons.includes(id));
          if (wPool.length) {
            const id = wPool[Math.floor(Math.random() * wPool.length)];
            this.pickups.push({ id: nid(), pos: { x: e.pos.x + 16, y: e.pos.y }, kind: 'weapon', value: 0, weapon: id, life: 60 });
          }
        }
      }
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 20 + Math.random() * 40;
        this.pickups.push({
          id: nid(),
          pos: { x: e.pos.x + Math.cos(a) * d, y: e.pos.y + Math.sin(a) * d },
          kind: 'essence', value: 3, life: 40,
        });
      }
    } else {
      audio.sfx('enemyHit');
      this.dropLoot(e);
    }
  }

  private dropLoot(e: Enemy): void {
    const luck = 1 + this.player.luck * 0.05;
    const coinBoost = this.player.relics.includes('solarCoin') ? 1.6 : 1;
    if (Math.random() < 0.85 * luck) {
      const coins = 1 + Math.floor(Math.random() * (e.isMiniBoss ? 8 : 3));
      for (let i = 0; i < coins; i++) {
        this.pickups.push({
          id: nid(),
          pos: { x: e.pos.x + (Math.random() - 0.5) * 12, y: e.pos.y + (Math.random() - 0.5) * 12 },
          kind: 'coin', value: 1, life: 12,
        });
      }
    }
    if (Math.random() < (e.isMiniBoss ? 1 : 0.4) * coinBoost) {
      this.pickups.push({ id: nid(), pos: { ...e.pos }, kind: 'essence', value: 1, life: 12 });
    }
    if (e.isMiniBoss && Math.random() < 0.5) {
      const pool = RELIC_IDS.filter((id) => !this.player.relics.includes(id));
      if (pool.length) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        this.pickups.push({ id: nid(), pos: { x: e.pos.x, y: e.pos.y - 6 }, kind: 'relic', value: 0, relic: id, life: 20 });
      }
    }
    if (Math.random() < 0.08) {
      this.pickups.push({ id: nid(), pos: { ...e.pos }, kind: 'hp', value: 12, life: 12 });
    }
    if (Math.random() < 0.06) {
      this.pickups.push({ id: nid(), pos: { ...e.pos }, kind: 'mp', value: 16, life: 12 });
    }
  }

  private onRoomCleared(): void {
    const room = this.currentRoom;
    room.cleared = true;
    this.summary.roomsCleared += 1;
    this.roomClearEffects.push({ t: 0, duration: 0.9, x: ROOM_W / 2, y: ROOM_H / 2 });
    audio.sfx('doorOpen');
    this.particles.burst(ROOM_W / 2, ROOM_H / 2, 36, {
      colour: PALETTE.gold, life: 1, maxLife: 1, drag: 0.92,
    });
    // Crown Spark heal chance
    if (this.player.relics.includes('crownSpark') && Math.random() < 0.25) {
      this.healPlayer(Math.floor(this.player.maxHp * 0.08));
    }
  }

  private healPlayer(n: number): void {
    const before = this.player.hp;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + n);
    const delta = this.player.hp - before;
    if (delta > 0) this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 8, `+${delta}`, '#6cf6e5');
  }

  private damageEnemy(e: Enemy, dmg: number, knock: Vec, knockStrength: number): void {
    e.hp -= dmg;
    e.flash = 0.12;
    const dirLen = Math.hypot(knock.x, knock.y) || 1;
    e.pos.x += (knock.x / dirLen) * knockStrength * 0.02;
    e.pos.y += (knock.y / dirLen) * knockStrength * 0.02;
    this.spawnDamageNumber(e.pos.x, e.pos.y - 10, `${Math.round(dmg)}`, '#ffd97a');
    if (!this.reducedParticles) {
      for (let i = 0; i < 4; i++) {
        this.particles.emit({
          x: e.pos.x, y: e.pos.y,
          vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80,
          life: 0.3, maxLife: 0.3, size: 1.5, colour: '#e23a4a', drag: 0.9,
        });
      }
    }
  }

  private damagePlayer(raw: number): void {
    const p = this.player;
    if (p.iframes > 0 || this.dead) return;
    const dmg = Math.max(1, Math.round(raw - p.armor));
    p.hp -= dmg;
    p.iframes = 0.7;
    p.flash = 0.15;
    this.camera.shakeT = 0.3; this.camera.shakeMag = 3;
    audio.sfx('playerHit');
    this.spawnDamageNumber(p.pos.x, p.pos.y - 8, `${dmg}`, '#e23a4a');
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      if (pr.life <= 0) { this.projectiles.splice(i, 1); continue; }
      // Homing
      if (pr.homing && pr.fromPlayer) {
        let best: Enemy | null = null;
        let bestD = 90;
        for (const e of this.enemies) {
          const d = Math.hypot(e.pos.x - pr.pos.x, e.pos.y - pr.pos.y);
          if (d < bestD) { bestD = d; best = e; }
        }
        if (best) {
          const desired = norm({ x: best.pos.x - pr.pos.x, y: best.pos.y - pr.pos.y });
          const sp = Math.hypot(pr.vel.x, pr.vel.y) || 200;
          pr.vel.x = lerp(pr.vel.x, desired.x * sp, 0.18);
          pr.vel.y = lerp(pr.vel.y, desired.y * sp, 0.18);
        }
      }
      pr.pos.x += pr.vel.x * dt;
      pr.pos.y += pr.vel.y * dt;
      if (pr.pos.x < ROOM_MARGIN || pr.pos.x > ROOM_W - ROOM_MARGIN ||
          pr.pos.y < ROOM_MARGIN || pr.pos.y > ROOM_H - ROOM_MARGIN) {
        this.projectiles.splice(i, 1);
        continue;
      }
      this.particles.trail(pr.pos.x, pr.pos.y, pr.trailColour);

      if (pr.fromPlayer) {
        // hit enemies
        for (const e of this.enemies) {
          const d = Math.hypot(e.pos.x - pr.pos.x, e.pos.y - pr.pos.y);
          if (d < pr.radius + e.radius) {
            this.damageEnemy(e, pr.damage, { x: pr.vel.x, y: pr.vel.y }, 90);
            const explodeR = (pr as Projectile & { explodeRadius?: number }).explodeRadius ?? 0;
            if (explodeR > 0) {
              // splash damage to nearby enemies
              for (const e2 of this.enemies) {
                if (e2 === e) continue;
                const dd = Math.hypot(e2.pos.x - pr.pos.x, e2.pos.y - pr.pos.y);
                if (dd < explodeR + e2.radius) {
                  this.damageEnemy(e2, pr.damage * 0.6, { x: e2.pos.x - pr.pos.x, y: e2.pos.y - pr.pos.y }, 70);
                }
              }
              this.particles.burst(pr.pos.x, pr.pos.y, 26, { colour: pr.colour, life: 0.6, maxLife: 0.6, drag: 0.85 });
              this.camera.shakeT = 0.12; this.camera.shakeMag = 2;
              this.projectiles.splice(i, 1);
              break;
            }
            if (pr.pierce <= 0) { this.projectiles.splice(i, 1); break; }
            pr.pierce -= 1;
          }
        }
      } else {
        // Reflect chance via lunar mirror
        if (this.player.relics.includes('lunarMirror') && Math.random() < 0.005) {
          pr.fromPlayer = true;
          pr.vel.x *= -1; pr.vel.y *= -1;
          pr.colour = '#6cf6e5';
          continue;
        }
        const d = Math.hypot(this.player.pos.x - pr.pos.x, this.player.pos.y - pr.pos.y);
        if (d < pr.radius + PLAYER_RADIUS) {
          this.damagePlayer(pr.damage);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private updatePickups(dt: number): void {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.life -= dt;
      if (pk.life <= 0) { this.pickups.splice(i, 1); continue; }
      const d = Math.hypot(p.pos.x - pk.pos.x, p.pos.y - pk.pos.y);
      // Magnet
      const magnet = 36;
      if (d < magnet && pk.kind !== 'relic') {
        const dx = p.pos.x - pk.pos.x, dy = p.pos.y - pk.pos.y;
        const len = Math.hypot(dx, dy) || 1;
        pk.pos.x += (dx / len) * 80 * dt;
        pk.pos.y += (dy / len) * 80 * dt;
      }
      if (d < 10) {
        this.applyPickup(pk);
        this.pickups.splice(i, 1);
      }
    }
  }

  private applyPickup(pk: Pickup): void {
    const p = this.player;
    const essBonus = 1 + this.meta.bonusEssenceGain;
    switch (pk.kind) {
      case 'coin':
        p.coins += pk.value;
        this.summary.coinsCollected += pk.value;
        break;
      case 'essence': {
        const gained = Math.max(1, Math.round(pk.value * essBonus));
        p.essence += gained;
        this.summary.essenceCollected += gained;
        break;
      }
      case 'key':
        p.keys += pk.value;
        break;
      case 'hp':
        this.healPlayer(pk.value);
        break;
      case 'mp':
        p.mp = Math.min(p.maxMp, p.mp + pk.value);
        this.spawnDamageNumber(p.pos.x, p.pos.y - 6, `+${pk.value}MP`, '#9b6cff');
        break;
      case 'relic':
        if (pk.relic) this.grantRelic(pk.relic);
        break;
      case 'weapon':
        if (pk.weapon) this.grantWeapon(pk.weapon);
        break;
      case 'spell':
        if (pk.spell) this.grantSpell(pk.spell);
        break;
    }
    audio.sfx('pickup');
  }

  private updateSigils(dt: number): void {
    for (let i = this.sigils.length - 1; i >= 0; i--) {
      const s = this.sigils[i];
      s.timer += dt;
      if (!s.fired && s.timer >= s.delay) {
        s.fired = true;
        const radius = s.radius ?? 28;
        const colour = s.colour ?? '#e23a4a';
        if (s.fromPlayer) {
          // damage all enemies in radius
          for (const e of this.enemies) {
            const d = Math.hypot(e.pos.x - s.pos.x, e.pos.y - s.pos.y);
            if (d < radius + e.radius) {
              this.damageEnemy(e, s.damage, { x: e.pos.x - s.pos.x, y: e.pos.y - s.pos.y }, 60);
            }
          }
        } else {
          const d = Math.hypot(this.player.pos.x - s.pos.x, this.player.pos.y - s.pos.y);
          if (d < radius) this.damagePlayer(s.damage);
        }
        this.particles.burst(s.pos.x, s.pos.y, 32, { colour, life: 0.8, maxLife: 0.8 });
        this.camera.shakeT = 0.2; this.camera.shakeMag = 2.5;
        audio.sfx(s.fromPlayer ? 'spell' : 'enemyHit');
      }
      if (s.timer > s.delay + 0.4) this.sigils.splice(i, 1);
    }
  }

  private handleRoomTransition(): void {
    const p = this.player.pos;
    const cur = this.currentRoom;
    // Block exits when room not cleared and is hostile
    const hostile = (cur.type === 'enemy' || cur.type === 'miniBoss' || cur.type === 'boss') && !cur.cleared;
    if (hostile) return;
    const margin = 14;
    const dwHalf = 22;
    const inXDoor = Math.abs(p.x - ROOM_W / 2) < dwHalf;
    const inYDoor = Math.abs(p.y - ROOM_H / 2) < dwHalf;
    let dirX = 0, dirY = 0;
    if (cur.doors.left  && p.x < margin            && inYDoor) dirX = -1;
    if (cur.doors.right && p.x > ROOM_W - margin   && inYDoor) dirX = 1;
    if (cur.doors.up    && p.y < margin            && inXDoor) dirY = -1;
    if (cur.doors.down  && p.y > ROOM_H - margin   && inXDoor) dirY = 1;
    if (dirX === 0 && dirY === 0) return;
    const nx = cur.grid.x + dirX;
    const ny = cur.grid.y + dirY;
    const next = this.floor.roomGrid.get(`${nx},${ny}`);
    if (!next) return;
    // Locked rooms cost a key
    if (next.type === 'locked' && !next.visited) {
      const useKey = !(this.player.relics.includes('keyOfTheGate') && Math.random() < 0.35);
      if (this.player.keys <= 0) {
        // Push back
        this.player.pos.x = clamp(p.x, ROOM_MARGIN + 4, ROOM_W - ROOM_MARGIN - 4);
        this.player.pos.y = clamp(p.y, ROOM_MARGIN + 4, ROOM_H - ROOM_MARGIN - 4);
        this.spawnDamageNumber(p.x, p.y - 8, 'LOCKED', '#e23a4a');
        return;
      }
      if (useKey) this.player.keys -= 1;
    }
    // Entry position on the opposite side
    const entry = { x: ROOM_W / 2, y: ROOM_H / 2 };
    if (dirX < 0) entry.x = ROOM_W - ROOM_MARGIN - 12;
    if (dirX > 0) entry.x = ROOM_MARGIN + 12;
    if (dirY < 0) entry.y = ROOM_H - ROOM_MARGIN - 12;
    if (dirY > 0) entry.y = ROOM_MARGIN + 12;
    this.enterRoom(next, entry);
  }

  private descend(): void {
    this.floorTransition = { t: 0, duration: 0.6 };
    this.goToFloor(this.floor.number + 1);
  }

  private updateCamera(dt: number): void {
    const p = this.player.pos;
    this.cameraDest.x = clamp(p.x - VIRTUAL_W / 2, 0, ROOM_W - VIRTUAL_W);
    this.cameraDest.y = clamp(p.y - VIRTUAL_H / 2, 0, ROOM_H - VIRTUAL_H);
    this.camera.x = lerp(this.camera.x, this.cameraDest.x, Math.min(1, dt * 8));
    this.camera.y = lerp(this.camera.y, this.cameraDest.y, Math.min(1, dt * 8));
    if (this.camera.shakeT > 0) this.camera.shakeT = Math.max(0, this.camera.shakeT - dt);
  }

  private spawnDamageNumber(x: number, y: number, value: string, colour: string): void {
    this.damageNumbers.push({
      id: nid(),
      x, y,
      vx: (Math.random() - 0.5) * 20,
      vy: -30 - Math.random() * 20,
      life: 0.8, maxLife: 0.8,
      value: Number(value.replace(/[^\d-]/g, '')) || 0,
      colour,
    });
    // We also store text via colour-coded entry — render below
    (this.damageNumbers[this.damageNumbers.length - 1] as DamageNumber & { text?: string }).text = value;
  }

  private updateDamageNumbers(dt: number): void {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.life -= dt;
      if (d.life <= 0) { this.damageNumbers.splice(i, 1); continue; }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 60 * dt;
    }
  }

  // --- render -------------------------------------------------------------

  private render(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    ctx.imageSmoothingEnabled = false;

    // Aspect-fill ("cover") instead of aspect-fit. The game always fills
    // the entire viewport — no black letterbox bars. Off-axis virtual
    // pixels get cropped by the canvas, but the player is camera-centred
    // so the cropped edges are far from the action. Reads more
    // "fullscreen" on iPhone landscape where 16:9 would leave thick
    // side bars.
    const sx = canvas.width / VIRTUAL_W;
    const sy = canvas.height / VIRTUAL_H;
    const scale = Math.max(1, Math.max(sx, sy));
    const offX = Math.floor((canvas.width - VIRTUAL_W * scale) / 2);
    const offY = Math.floor((canvas.height - VIRTUAL_H * scale) / 2);

    // No letterbox — but clear the canvas to abyss-dark in case a future
    // change reintroduces gaps. Bars would no longer be a problem.
    ctx.fillStyle = '#02010a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    // Camera shake offset
    let camX = this.camera.x;
    let camY = this.camera.y;
    if (this.camera.shakeT > 0) {
      camX += (Math.random() - 0.5) * this.camera.shakeMag;
      camY += (Math.random() - 0.5) * this.camera.shakeMag;
    }

    ctx.save();
    ctx.translate(-Math.floor(camX), -Math.floor(camY));

    this.drawRoom();
    this.drawShrineDecor();
    this.drawChests();
    this.drawStairsIfExit();
    this.drawSigils();
    this.drawPickups();
    this.drawEnemiesAll();
    this.drawPlayer();
    this.drawProjectiles();
    this.particles.draw(ctx);
    this.drawDamageNumbers();
    this.drawRoomClearEffects();

    ctx.restore();

    // Vignette
    const vg = ctx.createRadialGradient(VIRTUAL_W / 2, VIRTUAL_H / 2, VIRTUAL_H * 0.25, VIRTUAL_W / 2, VIRTUAL_H / 2, VIRTUAL_H * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    // Floor transition
    if (this.floorTransition) {
      const t = this.floorTransition.t / this.floorTransition.duration;
      const a = t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2;
      ctx.fillStyle = `rgba(244, 210, 122, ${a * 0.7})`;
      ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    }

    ctx.restore();
  }

  private drawRoom(): void {
    const ctx = this.ctx;
    const rng = new RNG(this.currentRoom.seed);
    // floor
    for (let y = 0; y < ROOM_H; y += TILE) {
      for (let x = 0; x < ROOM_W; x += TILE) {
        const t = (x + y * 7 + this.currentRoom.seed) & 0xffff;
        drawFloorTile(ctx, x, y, TILE, t);
      }
    }
    // Occult circle in arena rooms
    if (this.currentRoom.type === 'enemy' || this.currentRoom.type === 'miniBoss' || this.currentRoom.type === 'boss' || this.currentRoom.type === 'shrine') {
      this.drawOccultCircle(ROOM_W / 2, ROOM_H / 2, this.currentRoom.type === 'boss' ? 100 : 60);
    }
    // walls (top and bottom)
    for (let x = 0; x < ROOM_W; x += TILE) {
      drawWallTile(ctx, x, 0, TILE, true);
      drawWallTile(ctx, x, ROOM_H - TILE, TILE, false);
    }
    for (let y = TILE; y < ROOM_H - TILE; y += TILE) {
      drawWallTile(ctx, 0, y, TILE, false);
      drawWallTile(ctx, ROOM_W - TILE, y, TILE, false);
    }
    // Doors
    this.drawDoors();
    // Torches
    const torchT = this.timeAlive;
    for (let i = 1; i <= 4; i++) {
      const x = (ROOM_W / 5) * i;
      drawTorch(ctx, x - 2, 18, torchT + i * 0.5);
    }
    // boss specific decoration: seven lamps
    if (this.currentRoom.type === 'boss') {
      const cx = ROOM_W / 2, cy = ROOM_H / 2;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(a) * 110;
        const py = cy + Math.sin(a) * 80;
        ctx.fillStyle = '#3b265c';
        ctx.fillRect(px - 2, py, 4, 6);
        const flick = 0.6 + Math.sin(torchT * 4 + i) * 0.3;
        ctx.fillStyle = `rgba(244, 210, 122, ${flick})`;
        ctx.beginPath();
        ctx.arc(px, py - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe6a3';
        ctx.beginPath();
        ctx.arc(px, py - 4, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Dust motes
    if (!this.reducedParticles && Math.random() < 0.4) {
      this.particles.emit({
        x: rng.range(20, ROOM_W - 20),
        y: rng.range(40, ROOM_H - 40),
        vx: (Math.random() - 0.5) * 4,
        vy: -3 - Math.random() * 4,
        life: 2, maxLife: 2, size: 1, colour: 'rgba(244,210,122,0.5)',
        drag: 0.98,
      });
    }
  }

  private drawOccultCircle(cx: number, cy: number, r: number): void {
    const ctx = this.ctx;
    const t = this.timeAlive;
    ctx.save();
    // Faint halo behind the circle
    const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.4);
    halo.addColorStop(0, 'rgba(108, 246, 229, 0.08)');
    halo.addColorStop(1, 'rgba(108, 246, 229, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(cx - r * 1.5, cy - r * 1.5, r * 3, r * 3);

    // Outer rotating ring of glyph marks
    ctx.strokeStyle = `rgba(244, 210, 122, ${0.45 + Math.sin(t * 1.2) * 0.1})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // glyph ticks on the outer ring (rotate slowly)
    ctx.fillStyle = 'rgba(244, 210, 122, 0.55)';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 0.18;
      const gx = cx + Math.cos(a) * r;
      const gy = cy + Math.sin(a) * r;
      ctx.fillRect(gx - 1, gy - 1, 2, 2);
    }

    // Inner ring
    ctx.strokeStyle = 'rgba(244, 210, 122, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Pentagram — thicker and brighter
    ctx.strokeStyle = `rgba(108, 246, 229, ${0.55 + Math.sin(t * 2) * 0.15})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      // 5-pointed star: step by 2/5 turns
      const a = (((i * 2) % 5) / 5) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r * 0.92;
      const y = cy + Math.sin(a) * r * 0.92;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Centre rune — pulsing diamond
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(244, 210, 122, ${0.4 + pulse * 0.4})`;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
    ctx.fillStyle = `rgba(255, 230, 163, ${pulse})`;
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
    ctx.restore();
  }

  private drawDoors(): void {
    const ctx = this.ctx;
    const d = this.currentRoom.doors;
    const locked = (this.currentRoom.type === 'enemy' || this.currentRoom.type === 'miniBoss' || this.currentRoom.type === 'boss') && !this.currentRoom.cleared;
    const w = 56;
    const pulse = 0.55 + 0.35 * Math.sin(this.timeAlive * 3);
    const drawDoor = (x: number, y: number, horiz: boolean): void => {
      if (locked) {
        // closed glyph stones
        ctx.fillStyle = PALETTE.wallDark;
        if (horiz) ctx.fillRect(x - w / 2, y - TILE / 2, w, TILE);
        else ctx.fillRect(x - TILE / 2, y - w / 2, TILE, w);
        // ward sigils — three crimson studs
        ctx.fillStyle = PALETTE.crimson;
        if (horiz) {
          ctx.fillRect(x - 16, y - 2, 4, 4);
          ctx.fillRect(x -  2, y - 2, 4, 4);
          ctx.fillRect(x + 12, y - 2, 4, 4);
        } else {
          ctx.fillRect(x - 2, y - 16, 4, 4);
          ctx.fillRect(x - 2, y -  2, 4, 4);
          ctx.fillRect(x - 2, y + 12, 4, 4);
        }
        ctx.fillStyle = 'rgba(226, 58, 74, 0.35)';
        if (horiz) ctx.fillRect(x - w / 2, y - 1, w, 2);
        else ctx.fillRect(x - 1, y - w / 2, 2, w);
      } else {
        // Open doorway — dark archway
        ctx.fillStyle = '#000';
        if (horiz) ctx.fillRect(x - w / 2, y - 6, w, 12);
        else ctx.fillRect(x - 6, y - w / 2, 12, w);
        // golden frame
        ctx.fillStyle = PALETTE.gold;
        if (horiz) {
          ctx.fillRect(x - w / 2, y - 8, w, 2);
          ctx.fillRect(x - w / 2, y + 6, w, 2);
          // capital studs
          ctx.fillStyle = PALETTE.gold2;
          ctx.fillRect(x - w / 2, y - 8, 2, 16);
          ctx.fillRect(x + w / 2 - 2, y - 8, 2, 16);
        } else {
          ctx.fillRect(x - 8, y - w / 2, 2, w);
          ctx.fillRect(x + 6, y - w / 2, 2, w);
          ctx.fillStyle = PALETTE.gold2;
          ctx.fillRect(x - 8, y - w / 2, 16, 2);
          ctx.fillRect(x - 8, y + w / 2 - 2, 16, 2);
        }
        // Pulsing teal threshold glow — the "you can pass" cue
        ctx.fillStyle = `rgba(108, 246, 229, ${0.18 * pulse})`;
        if (horiz) ctx.fillRect(x - w / 2 + 2, y - 4, w - 4, 8);
        else ctx.fillRect(x - 4, y - w / 2 + 2, 8, w - 4);
        // bright sliver in the centre
        ctx.fillStyle = `rgba(255, 247, 214, ${0.6 * pulse})`;
        if (horiz) ctx.fillRect(x - 12, y - 1, 24, 2);
        else ctx.fillRect(x - 1, y - 12, 2, 24);
      }
    };
    if (d.up)    drawDoor(ROOM_W / 2, 8, true);
    if (d.down)  drawDoor(ROOM_W / 2, ROOM_H - 8, true);
    if (d.left)  drawDoor(8, ROOM_H / 2, false);
    if (d.right) drawDoor(ROOM_W - 8, ROOM_H / 2, false);
  }

  private drawShrineDecor(): void {
    if (this.currentRoom.hasShrine) {
      drawShrine(this.ctx, ROOM_W / 2, ROOM_H / 2 - 8, this.currentRoom.shrineUsed, this.timeAlive);
    }
  }

  private drawChests(): void {
    if (this.currentRoom.hasChest) {
      drawChest(this.ctx, ROOM_W / 2 - 9, ROOM_H / 2 - 4, this.currentRoom.chestOpened, this.currentRoom.chestLocked);
    }
  }

  private drawStairsIfExit(): void {
    if (this.currentRoom.type === 'exit') {
      drawStairs(this.ctx, ROOM_W / 2 - 12, ROOM_H / 2 - 12, this.timeAlive);
    }
  }

  private drawSigils(): void {
    const ctx = this.ctx;
    for (const s of this.sigils) {
      const p = Math.min(1, s.timer / s.delay);
      const radius = s.radius ?? 18;
      const fromPlayer = !!s.fromPlayer;
      const stroke = fromPlayer ? '155, 108, 255' : '226, 58, 74';
      const accent = fromPlayer ? '244, 210, 122' : '226, 58, 74';
      ctx.save();
      ctx.translate(s.pos.x, s.pos.y);
      // Outer expanding ring
      ctx.strokeStyle = `rgba(${stroke}, ${0.45 + 0.55 * p})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * p, 0, Math.PI * 2);
      ctx.stroke();
      // Inner ring
      ctx.strokeStyle = `rgba(${accent}, ${0.35 + 0.4 * p})`;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.55 * p, 0, Math.PI * 2);
      ctx.stroke();
      // Cross / spokes
      const rot = this.timeAlive * (fromPlayer ? 2.2 : 1.4);
      ctx.rotate(rot);
      ctx.strokeStyle = `rgba(${stroke}, ${0.5 * p})`;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -radius * 0.9 * p);
        ctx.stroke();
        ctx.rotate(Math.PI / 2);
      }
      ctx.rotate(-rot);
      // Centre rune
      ctx.fillStyle = `rgba(${accent}, ${0.4 + 0.5 * p})`;
      ctx.fillRect(-2, -2, 4, 4);
      // Flash when fired
      if (s.fired) {
        const ft = Math.max(0, 1 - (s.timer - s.delay) / 0.4);
        ctx.fillStyle = `rgba(${accent}, ${ft * 0.6})`;
        ctx.beginPath();
        ctx.arc(0, 0, radius * (1 + (1 - ft) * 1.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawPickups(): void {
    const ctx = this.ctx;
    for (const pk of this.pickups) {
      const wobble = Math.sin(this.timeAlive * 4 + pk.id) * 1.2;
      switch (pk.kind) {
        case 'coin':
          ctx.fillStyle = PALETTE.gold;
          ctx.fillRect(pk.pos.x - 2, pk.pos.y - 2 + wobble, 4, 4);
          ctx.fillStyle = '#ffe6a3';
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 1 + wobble, 2, 2);
          break;
        case 'essence':
          ctx.fillStyle = PALETTE.teal;
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 2 + wobble, 2, 4);
          ctx.fillRect(pk.pos.x - 2, pk.pos.y - 1 + wobble, 4, 2);
          break;
        case 'key':
          ctx.fillStyle = PALETTE.gold;
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 3 + wobble, 2, 6);
          ctx.fillRect(pk.pos.x - 3, pk.pos.y - 3 + wobble, 6, 2);
          break;
        case 'hp':
          ctx.fillStyle = PALETTE.crimson;
          ctx.fillRect(pk.pos.x - 3, pk.pos.y - 1 + wobble, 6, 2);
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 3 + wobble, 2, 6);
          break;
        case 'mp':
          ctx.fillStyle = PALETTE.violet;
          ctx.fillRect(pk.pos.x - 3, pk.pos.y - 2 + wobble, 6, 4);
          ctx.fillStyle = '#dac8ff';
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 1 + wobble, 2, 2);
          break;
        case 'relic': {
          // Halo
          const g = ctx.createRadialGradient(pk.pos.x, pk.pos.y + wobble, 2, pk.pos.x, pk.pos.y + wobble, 14);
          g.addColorStop(0, 'rgba(244, 210, 122, 0.7)');
          g.addColorStop(1, 'rgba(244, 210, 122, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(pk.pos.x - 14, pk.pos.y - 14 + wobble, 28, 28);
          ctx.fillStyle = PALETTE.gold;
          ctx.fillRect(pk.pos.x - 3, pk.pos.y - 3 + wobble, 6, 6);
          ctx.fillStyle = '#ffe6a3';
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 1 + wobble, 2, 2);
          break;
        }
        case 'weapon': {
          const w = pk.weapon ? WEAPONS[pk.weapon] : null;
          if (!w) break;
          // golden halo + altar stone
          const g = ctx.createRadialGradient(pk.pos.x, pk.pos.y + wobble, 2, pk.pos.x, pk.pos.y + wobble, 18);
          g.addColorStop(0, 'rgba(244, 210, 122, 0.55)');
          g.addColorStop(1, 'rgba(244, 210, 122, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(pk.pos.x - 18, pk.pos.y - 18 + wobble, 36, 36);
          // altar pedestal
          ctx.fillStyle = '#3b265c';
          ctx.fillRect(pk.pos.x - 6, pk.pos.y + 5 + wobble, 12, 3);
          ctx.fillStyle = '#1a0f2c';
          ctx.fillRect(pk.pos.x - 7, pk.pos.y + 7 + wobble, 14, 1);
          // weapon icon, drawn rotated 45° point-up
          ctx.save();
          ctx.translate(pk.pos.x, pk.pos.y - 2 + wobble);
          ctx.rotate(-Math.PI / 4);
          this.drawWeaponSilhouette(w, 0.3);
          ctx.restore();
          break;
        }
        case 'spell': {
          const sp = pk.spell ? SPELLS[pk.spell] : null;
          if (!sp) break;
          const halo = ctx.createRadialGradient(pk.pos.x, pk.pos.y + wobble, 2, pk.pos.x, pk.pos.y + wobble, 18);
          halo.addColorStop(0, 'rgba(155, 108, 255, 0.55)');
          halo.addColorStop(1, 'rgba(155, 108, 255, 0)');
          ctx.fillStyle = halo;
          ctx.fillRect(pk.pos.x - 18, pk.pos.y - 18 + wobble, 36, 36);
          // tome/grimoire base
          ctx.fillStyle = '#1a0f2c';
          ctx.fillRect(pk.pos.x - 5, pk.pos.y - 4 + wobble, 10, 8);
          ctx.fillStyle = '#3b265c';
          ctx.fillRect(pk.pos.x - 5, pk.pos.y - 4 + wobble, 10, 1);
          ctx.fillStyle = '#5b3a86';
          ctx.fillRect(pk.pos.x - 4, pk.pos.y - 3 + wobble, 8, 6);
          // sigil floating above
          ctx.fillStyle = sp.projColour;
          ctx.fillRect(pk.pos.x - 2, pk.pos.y - 8 + wobble, 4, 4);
          ctx.fillStyle = '#fff';
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 7 + wobble, 2, 2);
          break;
        }
      }
    }
  }

  private drawEnemiesAll(): void {
    for (const e of this.enemies) {
      const sz = getEnemySize(e.visualKey);
      const scale = 2;
      const dx = e.pos.x - (sz.w * scale) / 2;
      const dy = e.pos.y - (sz.h * scale) + e.radius + 1;
      drawEnemy(this.ctx, e.visualKey, dx, dy, scale, e.flash, e.facing.x < 0);
      // shadow
      this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
      this.ctx.fillRect(e.pos.x - e.radius, e.pos.y + e.radius - 1, e.radius * 2, 2);
      // boss telegraph
      if (e.isBoss && e.cooldown < 0.5 && e.cooldown > 0) {
        this.ctx.fillStyle = `rgba(226, 58, 74, ${0.2 + 0.4 * Math.sin(this.timeAlive * 20)})`;
        this.ctx.fillRect(e.pos.x - e.width, e.pos.y - 16, e.width * 2, 2);
      }
    }
  }

  private drawPlayer(): void {
    const p = this.player;
    // shadow
    this.ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this.ctx.fillRect(p.pos.x - 6, p.pos.y + 3, 12, 2);
    drawInitiate(this.ctx, p.pos.x - 7, p.pos.y - 14, 1, p.facing, p.walkPhase, p.flash);
    // Weapon (held in player's hand when idle, animated during attack)
    this.drawPlayerWeapon();
    // iframe shimmer — outline pulse
    if (p.iframes > 0 && Math.floor(this.timeAlive * 18) % 2 === 0) {
      this.ctx.strokeStyle = 'rgba(108,246,229,0.65)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(p.pos.x - 7, p.pos.y - 14, 14, 18);
    }
  }

  private drawPlayerWeapon(): void {
    const p = this.player;
    const w = WEAPONS[p.weapons[p.weaponIdx]];
    const ctx = this.ctx;
    const fx = p.facing.x || 1, fy = p.facing.y;
    const baseAngle = Math.atan2(fy, fx);
    const swinging = p.attackTimer > 0;
    const tNorm = swinging ? p.attackTimer / w.duration : 0; // 1 → 0 across swing
    // Anchor: roughly at player's hand height
    const ax = p.pos.x;
    const ay = p.pos.y - 2;

    ctx.save();
    ctx.translate(ax, ay);

    if (!swinging) {
      // Idle: weapon held diagonally beside the player, pointing in facing direction
      const idleAngle = baseAngle + 0.6;
      ctx.rotate(idleAngle);
      this.drawWeaponSilhouette(w, 0);
      ctx.restore();
      return;
    }

    // Animation by swing type
    if (w.swingType === 'arc' || w.swingType === 'flurry') {
      // Sweep from -arcHalf to +arcHalf
      const progress = 1 - tNorm; // 0 → 1
      const sweep = -w.arcHalf + progress * w.arcHalf * 2;
      ctx.rotate(baseAngle + sweep);
      this.drawSlashFx(w, tNorm, sweep);
      this.drawWeaponSilhouette(w, 0.6);
    } else if (w.swingType === 'thrust' || w.swingType === 'lunge') {
      // Quick forward extension; weapon points along facing, length grows then retracts
      const phase = 1 - tNorm;
      const extend = w.swingType === 'lunge' ? 10 : 6;
      const off = Math.sin(phase * Math.PI) * extend;
      ctx.rotate(baseAngle);
      ctx.translate(off, 0);
      this.drawThrustFx(w, tNorm);
      this.drawWeaponSilhouette(w, 0.6);
    } else if (w.swingType === 'overhead') {
      // Heavy chop: rotate from -130° to +60° around facing
      const progress = 1 - tNorm;
      // ease-in: slow at start, fast slam
      const eased = progress * progress;
      const sweep = -2.2 + eased * 3.3;
      ctx.rotate(baseAngle + sweep);
      this.drawSlashFx(w, tNorm, sweep);
      this.drawWeaponSilhouette(w, 0.8);
    } else {
      ctx.rotate(baseAngle);
      this.drawSlashFx(w, tNorm, 0);
      this.drawWeaponSilhouette(w, 0.5);
    }

    ctx.restore();
  }

  // Draws the weapon's silhouette extending forward from the origin.
  // `glowAlpha` adds a coloured glow during animation.
  private drawWeaponSilhouette(w: import('./GameTypes').WeaponDef, glowAlpha: number): void {
    const ctx = this.ctx;
    const len = w.length;
    const th = w.thickness;
    // grip (1/3 of length back from origin)
    ctx.fillStyle = w.hiltColour;
    ctx.fillRect(-3, -1, 4, 2);
    // crossguard
    ctx.fillStyle = w.accentColour;
    ctx.fillRect(0, -2, 2, 5);
    // blade — outline + body + highlight
    ctx.fillStyle = '#04020a';
    ctx.fillRect(1, -Math.ceil(th / 2) - 1, len + 1, th + 2);
    ctx.fillStyle = w.bladeColour;
    ctx.fillRect(2, -Math.floor(th / 2), len - 1, th);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, -Math.floor(th / 2), len - 2, 1);
    // accent stripe
    ctx.fillStyle = w.accentColour;
    ctx.fillRect(len - 3, 0, 2, 1);
    // glow halo during animation
    if (glowAlpha > 0) {
      ctx.globalAlpha = glowAlpha;
      ctx.fillStyle = w.swingColour;
      ctx.fillRect(2, -Math.floor(th / 2) - 1, len - 1, th + 2);
      ctx.globalAlpha = 1;
    }
  }

  private drawSlashFx(w: import('./GameTypes').WeaponDef, tNorm: number, sweep: number): void {
    const ctx = this.ctx;
    const reach = w.range;
    // Outer wedge
    ctx.fillStyle = `rgba(255, 247, 214, ${tNorm * 0.22})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, reach + 4, sweep - 0.7, sweep + 0.5);
    ctx.closePath();
    ctx.fill();
    // Inner glow tinted by weapon
    const c = w.swingColour;
    ctx.fillStyle = c;
    ctx.globalAlpha = tNorm * 0.55;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.arc(2, 0, reach - 2, sweep - 0.4, sweep + 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // Leading-edge bright streak
    ctx.strokeStyle = `rgba(255, 255, 255, ${tNorm})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, reach, sweep - 0.04, sweep + 0.04);
    ctx.stroke();
  }

  private drawThrustFx(w: import('./GameTypes').WeaponDef, tNorm: number): void {
    const ctx = this.ctx;
    const reach = w.range;
    // bright line along facing
    ctx.fillStyle = w.swingColour;
    ctx.globalAlpha = tNorm * 0.6;
    ctx.fillRect(0, -1, reach, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255, 255, 255, ${tNorm})`;
    ctx.fillRect(reach - 4, -1, 4, 2);
  }

  private drawProjectiles(): void {
    const ctx = this.ctx;
    for (const pr of this.projectiles) {
      const r = pr.radius;
      const vx = pr.vel.x, vy = pr.vel.y;
      const speed = Math.hypot(vx, vy) || 1;
      const visual = (pr as Projectile & { visual?: string }).visual ?? 'orb';
      const angle = Math.atan2(vy, vx);

      if (visual === 'shard') {
        // Frost shard — diamond with leading edge
        ctx.save();
        ctx.translate(pr.pos.x, pr.pos.y);
        ctx.rotate(angle);
        ctx.fillStyle = pr.trailColour;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(-r * 3, -r * 0.5, r * 3, r);
        ctx.globalAlpha = 1;
        ctx.fillStyle = pr.colour;
        ctx.beginPath();
        ctx.moveTo(r * 1.6, 0);
        ctx.lineTo(0, -r);
        ctx.lineTo(-r * 1.2, 0);
        ctx.lineTo(0, r);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-1, -1, r * 1.6, 1);
        ctx.restore();
        continue;
      }

      if (visual === 'flame') {
        // Hellfire orb — pulsing fire core with crackling trail
        for (let i = 1; i <= 4; i++) {
          const tx = pr.pos.x - (vx / speed) * i * (r * 0.9);
          const ty = pr.pos.y - (vy / speed) * i * (r * 0.9);
          ctx.fillStyle = pr.trailColour;
          ctx.globalAlpha = 0.32 * (5 - i) / 4;
          ctx.beginPath();
          ctx.arc(tx, ty, r * (1 - i * 0.12), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        // halo
        const halo = ctx.createRadialGradient(pr.pos.x, pr.pos.y, 1, pr.pos.x, pr.pos.y, r * 2.4);
        halo.addColorStop(0, 'rgba(255, 122, 58, 0.55)');
        halo.addColorStop(1, 'rgba(255, 122, 58, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(pr.pos.x - r * 3, pr.pos.y - r * 3, r * 6, r * 6);
        // body — pulse
        const pulse = 1 + Math.sin(this.timeAlive * 18 + pr.id) * 0.15;
        ctx.fillStyle = pr.colour;
        ctx.beginPath();
        ctx.arc(pr.pos.x, pr.pos.y, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe6a3';
        ctx.beginPath();
        ctx.arc(pr.pos.x, pr.pos.y, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(pr.pos.x - 1, pr.pos.y - 1, 2, 2);
        continue;
      }

      // Default orb (spark bolt and any enemy projectiles)
      for (let i = 1; i <= 3; i++) {
        const tx = pr.pos.x - (vx / speed) * i * (r + 1);
        const ty = pr.pos.y - (vy / speed) * i * (r + 1);
        ctx.fillStyle = pr.colour;
        ctx.globalAlpha = 0.18 * (4 - i) / 3;
        ctx.beginPath();
        ctx.arc(tx, ty, r * (1 - i * 0.15), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = pr.colour;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(pr.pos.x, pr.pos.y, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = pr.colour;
      ctx.beginPath();
      ctx.arc(pr.pos.x, pr.pos.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(pr.pos.x, pr.pos.y, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawDamageNumbers(): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const d of this.damageNumbers) {
      const a = Math.max(0, Math.min(1, d.life / d.maxLife));
      // Pop-in scale: 1.6 -> 1.0 over the first 30%, then steady
      const tFromStart = 1 - a;
      const scale = tFromStart < 0.3 ? 1.0 + (0.3 - tFromStart) * 2 : 1.0;
      const text = ((d as DamageNumber & { text?: string }).text ?? `${d.value}`);
      const big = text.startsWith('-') || /^\d+$/.test(text);
      const baseSize = big ? 11 : 9;
      ctx.font = `bold ${Math.round(baseSize * scale)}px "Iowan Old Style","Georgia",serif`;
      ctx.globalAlpha = a;
      // soft halo
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillText(text, Math.round(d.x) + 1, Math.round(d.y) + 1);
      ctx.fillText(text, Math.round(d.x) - 1, Math.round(d.y) + 1);
      ctx.fillText(text, Math.round(d.x) + 1, Math.round(d.y) - 1);
      ctx.fillText(text, Math.round(d.x) - 1, Math.round(d.y) - 1);
      ctx.fillStyle = d.colour;
      ctx.fillText(text, Math.round(d.x), Math.round(d.y));
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  private drawRoomClearEffects(): void {
    const ctx = this.ctx;
    for (const e of this.roomClearEffects) {
      const t = e.t / e.duration;
      ctx.strokeStyle = `rgba(244, 210, 122, ${1 - t})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 12 + t * 120, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // --- HUD emit -----------------------------------------------------------

  private emitHud(): void {
    const p = this.player;
    const room = this.currentRoom;
    const prompts: string[] = [];
    const hint = this.computeHint();
    if (room.type === 'exit' && this.isNearCenter(p.pos)) prompts.push('Press Interact to descend');
    if (room.hasChest && !room.chestOpened) {
      const d = dist(p.pos, { x: ROOM_W / 2, y: ROOM_H / 2 + 4 });
      if (d < 30) prompts.push(room.chestLocked ? `Locked chest — keys: ${p.keys}` : 'Press Interact to open');
    }
    if (room.hasShrine && !room.shrineUsed) {
      const d = dist(p.pos, { x: ROOM_W / 2, y: ROOM_H / 2 - 8 });
      if (d < 28) prompts.push('Press Interact to commune');
    }

    const roomCells = this.floor.rooms.map((r) => ({
      gx: r.grid.x,
      gy: r.grid.y,
      type: r.type as RoomType,
      discovered: r.discovered,
      current: r.id === this.currentRoom.id,
    }));

    this.cbs.onHud({
      hp: p.hp, maxHp: p.maxHp,
      mp: p.mp, maxMp: p.maxMp,
      coins: p.coins, keys: p.keys, essence: p.essence,
      floor: this.floor.number,
      sphereId: sphereForFloor(this.floor.number).id,
      sphereName: sphereForFloor(this.floor.number).name,
      sphereGlyph: sphereForFloor(this.floor.number).glyph,
      sphereGodName: sphereForFloor(this.floor.number).godName,
      roomType: room.type, roomName: room.name,
      relics: p.relics,
      weapons: p.weapons,
      spells: p.spells,
      currentWeapon: p.weapons[p.weaponIdx],
      currentSpell: p.spells[p.spellIdx],
      bossHp: this.bossSnapshot?.hp,
      bossMaxHp: this.bossSnapshot?.maxHp,
      bossName: this.bossSnapshot?.name,
      showBossBanner: this.bossBannerTimer > 0,
      showFloorBanner: !!this.floorBanner,
      floorBannerText: this.floorBanner?.text,
      damageNumbers: this.damageNumbers.map((d) => ({
        id: d.id, x: d.x, y: d.y,
        value: d.value, life: d.life, colour: d.colour,
      })),
      prompts,
      inputMethod: this.input.getMethod(),
      gamepadConnected: this.input.getGamepad().connected,
      gamepadName: this.input.getGamepad().id || '',
      hint,
      rooms: roomCells,
      pendingShrine: this.pendingShrine ? {
        name: this.pendingShrine.name,
        effect: this.pendingShrine.effect,
        downside: this.pendingShrine.downside,
      } : undefined,
      alive: !this.dead,
    });
  }

  private computeHint(): string | undefined {
    if (this.floor.number === 1 && !this.currentRoom.visited) return 'WASD or Stick — Move. J / A — Attack. L / X — Spell.';
    return undefined;
  }

  // --- public test hook ---------------------------------------------------

  getSummary(): RunSummary { return this.summary; }
}
