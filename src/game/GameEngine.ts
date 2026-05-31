import { PALETTE, ROOM_H, ROOM_W, TILE, VIRTUAL_H, VIRTUAL_W } from './constants';
import { RNG, hashSeed } from './math/rng';
import { clamp, dist, lerp, norm } from './math/vec2';
import {
  ActiveDialogueState, ArchetypeDef, Floor, MetaState, RelicId, Room, RoomDoorState, RoomType, ShrineKind,
  SpellId, WeaponId,
} from './GameTypes';
import { getArchetype } from './data/archetypes';
import { RELICS, RELIC_IDS } from './data/relics';
import { ENEMY_REGISTRY, enemiesForSphere } from './data/enemies';
import { SPELLS, SPELL_LOOT_POOL, STARTER_SPELL } from './data/spells';
import { WEAPONS, WEAPON_LOOT_POOL, STARTER_WEAPON } from './data/weapons';
import { CODEX, CODEX_BY_ID } from './data/codex';
import { SPHERES, SphereId, sphereForFloor, isOgdoadFloor } from './data/spheres';
import { requiredWardenIdsBeforeOgdoad } from './progression/progressionRules';
import { BOSSES, BossDef, BossPattern } from './data/bosses';
import { DialogueChoice, NPCS, NPC_BY_ID, NpcDef, NpcPassive } from './data/npcs';
import { generateFloor } from './world/DungeonGenerator';
import { ParticleSystem } from './rendering/Particles';
import { InputManager } from './input/InputManager';
import { audio } from './systems/AudioSystem';
import { Renderer, RenderState, CameraState } from './rendering/Renderer';
import { RunSnapshot, RUN_SNAPSHOT_VERSION } from './systems/runSnapshot';

export interface HudSnapshot {
  hp: number; maxHp: number;
  mp: number; maxMp: number;
  coins: number; keys: number; essence: number;
  floor: number;
  lampsLit: number;
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
  /** Player entered a boss room for the first time this run. Host plays the
   * sphere's boss-intro film, then resumes the game. */
  onBossRoomEntered?: (sphereId: string) => void;
  /** Dialogue was opened. Host should render DialoguePanel. */
  onDialogueOpen?: (state: ActiveDialogueState) => void;
  /** Dialogue was closed. Host should hide DialoguePanel. */
  onDialogueClose?: () => void;
  /** The engine has reached a stable checkpoint and a RunSnapshot is available
   * for the host to persist to localStorage. Fired on floor entry, room clear,
   * chest open, shrine use, boss defeat, and pause. */
  onAutoSave?: (snapshot: RunSnapshot) => void;
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
  type:
    | 'lesserShade' | 'mercuryImp' | 'saltGolem' | 'lunarWisp'
    | 'saturnKnight' | 'serpentOfBrass' | 'saltBanshee' | 'wardenBoss'
    | 'seleneBoss' | 'hermesBoss' | 'aphroditeBoss' | 'heliosBoss'
    | 'aresBoss' | 'zeusBoss' | 'kronosBoss';
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

interface NpcEntity {
  def: NpcDef;
  pos: Vec;
  facing: Vec;
  passiveAccum: number;
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
  /** If set, only entities BETWEEN safeRadius and radius take damage.
   * Used for Selene's tidal-pulse — safe zone in the middle, danger ring
   * expanding outward. */
  safeRadius?: number;
}

export interface EngineConfig {
  archetypeId: 'magus' | 'hermit' | 'star';
  startingFloor?: number;
  startingSeed?: number;
  meta: MetaState;
  reducedParticles?: boolean;
  runSeed?: number;
  /** When set, mount restores the run from a snapshot instead of a fresh start. */
  resumeSnapshot?: RunSnapshot;
}

const ROOM_MARGIN = 18;
const PLAYER_RADIUS = 8;
const DASH_SPEED_MULT = 2.6;
const DASH_DURATION = 0.18;

let nextEntityId = 1;
const nid = (): number => nextEntityId++;

// Kronos time-stop. While `timeStopUntil > timeAlive` we freeze
// enemies + projectiles + sigils + ambient particles — the player
// can still move at half speed, can't dash, and the world goes still.
// Reset on every new run via `mount`.

// Reverse-lookup BossDef from its visualKey. The engine identifies
// Wardens by visualKey on Enemy (e.g. 'seleneBoss'); the BossDef holds
// stats + attack patterns.
function wardenDefFromVisual(visualKey: string): BossDef | null {
  for (const id of Object.keys(BOSSES) as SphereId[]) {
    if (BOSSES[id].visualKey === visualKey) return BOSSES[id];
  }
  return null;
}

// hexToRgbString and makeTorchTint moved to vec2.ts / Renderer.

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

interface DeathFx {
  visualKey: string;
  pos: Vec;
  facing: Vec;
  width: number;
  height: number;
  radius: number;
  isBoss: boolean;
  t: number;          // elapsed seconds since death
  duration: number;   // total animation length
}

/** A boss attack telegraph + delayed fire. The renderer draws each
 * pending action's optional `render(ctx, t01)` during the wind-up so the
 * player has a chance to read and dodge before the damage lands. */
interface DelayedAction {
  t: number;
  duration: number;
  fire: () => void;
  render?: (ctx: CanvasRenderingContext2D, t01: number) => void;
}

export class GameEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private renderer = new Renderer();
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
  /** Per-floor seeded RNG for loot and gameplay randomness.
   *  Reseeded in goToFloor so all runs with the same seed produce
   *  the same outcomes. In-engine particles also route through this
   *  so they don't consume real randomness between gameplay rolls.
   *  Visual-only Math.random() in Renderer/Particles class are
   *  intentionally left on the system RNG. */
  private rng!: RNG;

  // ── Seeded RNG helpers ───────────────────────────────────────
  private rand(): number { return this.rng.next(); }
  private randInt(min: number, max: number): number { return this.rng.int(min, max); }
  private randChance(probability: number): boolean { return this.rng.chance(probability); }
  private randPick<T>(items: readonly T[]): T { return this.rng.pick(items); }

  /** Cached sphere data for the current floor — updated once per frame
   *  in update() so all render paths read a single ref instead of calling
   *  sphereForFloor() 14+ times per frame. */
  private currentSphere!: ReturnType<typeof sphereForFloor>;
  private meta!: MetaState;
  private reducedParticles = false;

  private floor!: Floor;
  private currentRoom!: Room;
  private player!: PlayerState;
  private defeatedWardenIds: string[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private pickups: Pickup[] = [];
  private sigils: SigilHazard[] = [];
  private npcs: NpcEntity[] = [];
  private particles = new ParticleSystem();

  private summary: RunSummary;
  private camera = { x: 0, y: 0, shakeT: 0, shakeMag: 0 };
  private cameraDest = { x: 0, y: 0 };
  private floorTransition: FloorTransition | null = null;
  private floorBanner: FloorBanner | null = null;
  private bossBannerTimer = 0;
  private roomClearEffects: RoomClearEffect[] = [];
  private bossSnapshot: { hp: number; maxHp: number; name: string } | null = null;
  // Set to true the first time the player enters this run's boss room.
  // Stays true across deaths inside the same run; reset on a new run.
  private bossIntroPlayedThisRun = false;
  private pendingShrine: { kind: ShrineKind; name: string; effect: string; downside: string } | null = null;
  private damageNumbers: DamageNumber[] = [];
  private timeAlive = 0;
  private dead = false;
  private hudTimer = 0;
  // Combat juice: hit-pause freezes update for a few frames on big hits
  private hitPauseUntil = 0;
  // Death-fade fx: when an enemy dies, schedule a brief dissolve animation
  // instead of letting the sprite vanish instantly.
  private deathFx: DeathFx[] = [];
  // Kronos signature: time-stop suspends most updates until this time.
  private timeStopUntil = 0;
  // Boss telegraphs — wind-up actions render their own marker for the
  // duration, then fire() once the timer elapses.
  private delayedActions: DelayedAction[] = [];
  // Active dialogue state — non-null while the player is talking to an NPC.
  private activeDialogue: ActiveDialogueState | null = null;
  // Death sequence: when the player dies, hold the camera on the body
  // for ~1.6s of "lamp extinguishing" before onGameOver fires. The
  // engine keeps drawing the world; only player input + damage are
  // blocked. dyingT starts at -1 (not dying); 0 → dyingDuration is the
  // visible sequence. onGameOver fires once when dyingT crosses end.
  private dyingT = -1;
  private dyingDuration = 1.6;
  private gameOverFired = false;
  // Dash afterimage trail — snapshots of the player taken while
  // dashing. Render them BEFORE the player so the latest position
  // sits on top of fading ghosts.
  private dashTrail: { x: number; y: number; facing: Vec; walkPhase: number; t: number }[] = [];
  private dashTrailAccum = 0;

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
    this.bossIntroPlayedThisRun = false;
    this.timeStopUntil = 0;
    this.hitPauseUntil = 0;
    this.deathFx = [];
    this.delayedActions = [];
    this.dyingT = -1;
    this.gameOverFired = false;
    this.dashTrail = [];
    this.dashTrailAccum = 0;
    this.summary.essenceCollected = 0;
    this.summary.coinsCollected = 0;
    this.summary.relicsFound = [];
    this.summary.weaponsFound = [];
    this.summary.spellsFound = [];
    this.summary.codexUnlockedThisRun = [];
    this.summary.spheresVisited = [];
    this.summary.ogdoadReached = false;
    this.summary.archetype = this.archetype;
    this.defeatedWardenIds = [];

    if (config.resumeSnapshot) {
      this.applyResumeSnapshot(config.resumeSnapshot);
    } else {
      this.initPlayer();
      this.goToFloor(config.startingFloor ?? 1);
    }

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
    // Auto-save when the player pauses (likely leaving the game)
    if (p && !this.dead) this.autoSave();
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
      weapons: [a.startingWeapon ?? STARTER_WEAPON],
      spells: [a.startingSpell ?? STARTER_SPELL],
      weaponIdx: 0,
      spellIdx: 0,
      attackHitsLeft: 0,
      attackHitTimer: 0,
    };
    this.grantRelic(a.startingRelic, true);
    this.summary.weaponsFound.push(a.startingWeapon ?? STARTER_WEAPON);
    this.summary.spellsFound.push(a.startingSpell ?? STARTER_SPELL);

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

  // -- debug/test helpers -------------------------------------------------
  /** Initialise the minimal engine state needed to exercise progression
   *  logic without calling mount() (which requires a real Canvas 2D context). */
  initForTest(): void {
    this.archetype = getArchetype('magus');
    this.meta = {
      bonusMaxHp: 0,
      bonusStartingMp: 0,
      bonusEssenceGain: 0,
      cosmeticLampAura: false,
      unlockedCodex: [],
      seenPrologue: false,
      seenNewRunCinematic: false,
      bossesSeen: [],
      seenEnding: false,
      ogdoadReached: 0,
    };
    this.defeatedWardenIds = [];
    this.initPlayer();
  }

  getDebugFloorNumber(): number {
    return this.floor.number;
  }

  getDebugSummary(): RunSummary {
    return { ...this.summary };
  }

  setDebugBossesDefeated(count: number): void {
    this.summary.bossesDefeated = Math.max(0, count);
  }

  setDebugRngSeed(seed: number): void {
    this.runSeed = seed;
    this.rng = new RNG(seed);
  }

  getDebugRngState(): number {
    return this.rng.state;
  }

  goToFloorForTest(n: number): void {
    if (!this.player) {
      this.initForTest();
    }
    this.goToFloor(n);
  }

  private goToFloor(n: number): void {
    const seed = hashSeed(this.runSeed, n);
    this.floor = generateFloor({ floor: n, seed });
    // Reseed per-floor RNG for deterministic loot and game events.
    this.rng = new RNG(hashSeed(this.runSeed, n + 0x1000));
    this.summary.floorReached = Math.max(this.summary.floorReached, n);
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.sigils = [];
    this.npcs = [];
    this.bossSnapshot = null;
    this.bossBannerTimer = 0;
    this.roomClearEffects = [];
    this.cbs.onFloorChange(n);

    const sph = sphereForFloor(n);
    this.currentSphere = sph;

    const startRoom = this.floor.rooms.find((r) => r.id === this.floor.startRoomId)!;
    this.enterRoom(startRoom, { x: ROOM_W / 2, y: ROOM_H / 2 });
    const isFirstReach = !this.summary.spheresVisited.includes(sph.id);
    if (isFirstReach) this.summary.spheresVisited.push(sph.id);
    const cycle = Math.floor((n - 1) / 8); // 0 = first ascent, 1 = second, …
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
      const hasSevenLamps = this.summary.bossesDefeated >= requiredWardenIdsBeforeOgdoad().length;
      if (!this.summary.ogdoadReached) {
        this.summary.ogdoadReached = true;
        this.unlockCodex('ogdoad.hymn');
        this.unlockCodex('ogdoad.alone');
        if (hasSevenLamps) {
          this.cbs.onOgdoadReached?.();
        }
      }
    }

    this.floorTransition = { t: 0, duration: 0.9 };
    audio.stopAmbience();
    audio.startDungeonAmbience(sph.id);
    audio.sfx('descend');
    this.autoSave();
  }

  /** Restore engine state from a saved snapshot. Called from mount() when
   *  config.resumeSnapshot is provided. Sets the floor, room, player state,
   *  room clear/open/shrine states, and defeated-warden tracking. */
  private applyResumeSnapshot(snap: RunSnapshot): void {
    this.runSeed = snap.runSeed;
    this.initPlayer();

    // Generate the saved floor from the deterministic seed
    this.goToFloor(snap.floor);

    // Override room states from the snapshot (goToFloor generates fresh rooms)
    for (const id of snap.clearedRoomIds) {
      const r = this.floor.rooms.find((x) => x.id === id);
      if (r) { r.cleared = true; r.enemiesSpawned = true; }
    }
    for (const id of snap.openedChestRoomIds) {
      const r = this.floor.rooms.find((x) => x.id === id);
      if (r) r.chestOpened = true;
    }
    for (const id of snap.shrineUsedRoomIds) {
      const r = this.floor.rooms.find((x) => x.id === id);
      if (r) r.shrineUsed = true;
    }

    // Override player state
    this.player.hp = snap.hp;
    this.player.maxHp = snap.maxHp;
    this.player.mp = snap.mp;
    this.player.maxMp = snap.maxMp;
    this.player.coins = snap.coins;
    this.player.keys = snap.keys;
    this.player.weapons = [...snap.weapons];
    this.player.weaponIdx = 0;
    this.player.spells = [...snap.spells];
    this.player.spellIdx = 0;
    this.player.relics = [...snap.relics];

    // Restore defeated-warden tracking
    this.defeatedWardenIds = [...snap.defeatedWardenIds];

    // Restore summary counts so the UI shows correct progress
    this.summary.roomsCleared = snap.clearedRoomIds.length;
    this.summary.bossesDefeated = snap.defeatedWardenIds.length;

    // Enter the saved room
    const savedRoom = this.floor.rooms.find((r) => r.id === snap.roomId);
    if (savedRoom) {
      this.enterRoom(savedRoom, { x: ROOM_W / 2, y: ROOM_H / 2 });
    } else {
      // Fallback: start room
      const startRoom = this.floor.rooms.find((r) => r.id === this.floor.startRoomId);
      if (startRoom) this.enterRoom(startRoom, { x: ROOM_W / 2, y: ROOM_H / 2 });
    }
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
      const sphere = sphereForFloor(this.floor.number);
      audio.startBossMusic(sphere.id);
      this.bossBannerTimer = 2.2;
      this.camera.shakeT = 0.8;
      this.camera.shakeMag = 5;
      // First time this run that we step into THIS sphere's boss room,
      // ask the host to play the cinematic. The host decides whether to
      // actually play (gated on MetaState.bossesSeen + settings).
      if (!this.bossIntroPlayedThisRun) {
        this.bossIntroPlayedThisRun = true;
        this.cbs.onBossRoomEntered?.(sphere.id);
      }
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
    // Most chambers have occupants, but a few stay peaceful by design.
    // Door-locking only applies to enemy/miniBoss/boss rooms; the rest
    // let the player choose to fight or flee.
    const floor = this.floor.number;
    let count = 0;
    let scattered = true;
    switch (room.type) {
      case 'enemy':
      case 'locked':
        count = 2 + Math.floor(floor / 2) + rng.int(0, 3);
        break;
      case 'treasure':
        // 70 % chance of 1-2 guardians clustered around the chest.
        if (rng.chance(0.7)) {
          count = 1 + rng.int(0, 2);
          scattered = false;
        }
        break;
      case 'shrine':
        // 50 % chance of a single shrine warden — the rest stay quiet
        // so the player has a clean moment to choose the boon/cost.
        if (rng.chance(0.5)) {
          count = 1;
          scattered = false;
        }
        break;
      case 'exit':
        // Stair-keepers — always defend the descent.
        count = 2 + Math.floor(floor / 4);
        break;
      case 'start':
        // The threshold is calm — no enemies spawn in the start room.
        count = 0;
        break;
      default:
        count = 0;
    }
    for (let i = 0; i < count; i++) {
      const type = this.pickEnemyType(rng);
      let x: number, y: number;
      if (scattered) {
        x = ROOM_W * 0.2 + rng.next() * ROOM_W * 0.6;
        y = ROOM_H * 0.25 + rng.next() * ROOM_H * 0.5;
      } else {
        // Flank pattern — left/right of room centre, slightly above
        const side = i % 2 === 0 ? -1 : 1;
        x = ROOM_W / 2 + side * (40 + rng.next() * 30);
        y = ROOM_H / 2 - 10 + (rng.next() - 0.5) * 30;
      }
      this.spawnEnemy(type, { x, y }, floor);
    }
    if (count > 0) room.enemiesSpawned = true;

    // NPC spawning — sanctuary rooms always host an NPC; rare NPCs
    // (Echo) have a small independent chance on any floor.
    if (room.type === 'sanctuary') {
      this.spawnSanctuaryNpc();
    } else if (this.rng.next() < 0.02) {
      this.spawnRareNpc();
    }
  }

  private spawnSanctuaryNpc(): void {
    const sphere = this.currentSphere.id;
    const pool = NPCS.filter((n) => n.spawnRule === 'sanctuary' && (!n.sphere || n.sphere === sphere));
    if (pool.length === 0) return;
    const def = pool[Math.floor(this.rng.next() * pool.length)];
    this.npcs.push({ def, pos: { x: ROOM_W / 2, y: ROOM_H / 2 + 8 }, facing: { x: 0, y: 1 }, passiveAccum: 0 });
  }

  private spawnRareNpc(): void {
    const pool = NPCS.filter((n) => n.spawnRule === 'rare');
    if (pool.length === 0) return;
    const def = pool[Math.floor(this.rng.next() * pool.length)];
    this.npcs.push({ def, pos: { x: ROOM_W / 2, y: ROOM_H / 2 + 8 }, facing: { x: 0, y: 1 }, passiveAccum: 0 });
  }

  private pickEnemyType(rng: RNG): Enemy['type'] {
    const sphere = this.currentSphere.id;
    const pool = enemiesForSphere(sphere);
    return pool[rng.int(0, pool.length)] as Enemy['type'];
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
      case 'saltBanshee':
        e.hp = e.maxHp = Math.round(18 * lvl); e.speed = 44; e.radius = 8; e.width = 11; e.height = 12; e.contactDamage = 7;
        break;
      case 'wardenBoss':
        e.hp = e.maxHp = Math.round(260 + 80 * (floor / 10)); e.speed = 28; e.radius = 18; e.width = 18; e.height = 16; e.contactDamage = 16;
        e.isBoss = true;
        e.phase = 1; e.phaseTimer = 0; e.pattern = 0;
        break;
      // Seven Wardens — stats come from the BossDef keyed by visualKey.
      // Floor difficulty multiplier matches the original wardenBoss scaling.
      case 'seleneBoss':
      case 'hermesBoss':
      case 'aphroditeBoss':
      case 'heliosBoss':
      case 'aresBoss':
      case 'zeusBoss':
      case 'kronosBoss': {
        const def = wardenDefFromVisual(type);
        if (def) {
          e.hp = e.maxHp = Math.round(def.baseHp + def.baseHp * 0.3 * (floor / 10 - 1));
          e.speed = def.speed;
          e.radius = def.radius;
          e.width = def.width;
          e.height = def.height;
          e.contactDamage = def.contactDamage;
        }
        e.isBoss = true;
        e.phase = 1; e.phaseTimer = 0; e.pattern = 0;
        break;
      }
    }
    if (isMiniBoss && !e.isBoss && !e.isMiniBoss) e.isMiniBoss = true;
    this.enemies.push(e);
  }

  private spawnBoss(floor: number, seed: number): void {
    // Pick the Warden by which sphere this boss room sits in. Each
    // sphere has a sphere-specific Warden with its own visual + patterns.
    const sphere = sphereForFloor(floor);
    const def = BOSSES[sphere.id];
    const visualKey = (def?.visualKey ?? 'wardenBoss') as Enemy['type'];
    this.spawnEnemy(visualKey, { x: ROOM_W / 2, y: ROOM_H / 2 - 20 }, floor);
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
    this.currentSphere = sphereForFloor(this.floor.number);
    this.timeAlive += dt;

    const s = this.input.state;
    if (s.pausePressed && !this.dead) { this.cbs.onPause(); return; }
    if (s.mapPressed && !this.dead) { this.cbs.onOpenMap(); return; }

    // Gameplay update — frozen during the death sequence so the world
    // holds its breath while the lamp goes out. The cinematic tick
    // (particles, camera shake, embers, dying timer) keeps running below.
    if (!this.dead) {
      if (this.pendingShrine) {
        // Shrine modal active — block movement, wait for confirm/cancel
        if (s.uiConfirm || s.interactPressed) this.confirmShrine(true);
        if (s.uiCancel) this.confirmShrine(false);
      } else {
        this.updatePlayer(dt, s);
      }
    }

    // Hit-pause: freeze the world (enemies / projectiles / pickups /
    // sigils / particles / camera) for a few frames after a big hit.
    // Time-stop (Kronos signature): same freeze, but for ~1.5s with
    // a visible cosmic effect. Player input + the death-fx fade still
    // tick so the moment lands.
    const inHitPause = this.timeAlive < this.hitPauseUntil;
    const inTimeStop = this.timeAlive < this.timeStopUntil;
    const worldFrozen = inHitPause || inTimeStop || this.dead;
    if (!worldFrozen) {
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updatePickups(dt);
      this.updateSigils(dt);
      this.updateNpcs(dt);
      this.updateDelayedActions(dt);
    }

    if (!this.dead) this.handleRoomTransition();
    this.updateCamera(dt);
    // Particles always tick — the death sequence emits embers + halos
    // that need to drift even while gameplay is frozen.
    if (!worldFrozen || this.dead) this.particles.update(dt);
    this.updateDamageNumbers(dt);
    this.updateDeathFx(dt);
    this.updateDying(dt);
    this.updateDashTrail(dt);

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
      // Movement — halved during a Kronos time-stop so the freeze has weight.
      const speedMul = this.timeAlive < this.timeStopUntil ? 0.5 : 1;
      const mvx = s.moveX, mvy = s.moveY;
      const ml = Math.hypot(mvx, mvy);
      if (ml > 0.05) {
        const dirX = mvx / Math.max(ml, 1);
        const dirY = mvy / Math.max(ml, 1);
        p.vel.x = dirX * p.speed * speedMul;
        p.vel.y = dirY * p.speed * speedMul;
        p.facing = { x: dirX, y: dirY };
        p.walkPhase += dt * 10 * speedMul;
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
    // Dash blocked during Kronos time-stop — the freeze means everything.
    if (s.dashPressed && p.dashCooldown <= 0 && this.timeAlive >= this.timeStopUntil) {
      const dx = s.moveX, dy = s.moveY;
      const dl = Math.hypot(dx, dy);
      const dir = dl > 0.05 ? { x: dx / dl, y: dy / dl } : p.facing;
      p.dashTimer = DASH_DURATION;
      p.dashDir = dir;
      p.dashCooldown = p.dashCdMax;
      p.iframes = Math.max(p.iframes, DASH_DURATION + 0.05);
      audio.sfx('dash');
      // Seed the trail with the launch position so the ghost reads
      // immediately on the first frame of the dash.
      this.dashTrailAccum = 0;
      this.dashTrail.push({
        x: p.pos.x, y: p.pos.y,
        facing: { x: p.facing.x, y: p.facing.y },
        walkPhase: p.walkPhase, t: 0,
      });
      // Burst of dash particles from the launch point — directional
      // smear opposite the dash heading.
      if (!this.reducedParticles) {
        for (let i = 0; i < 10; i++) {
          const sp = 50 + this.rand() * 40;
          this.particles.emit({
            x: p.pos.x, y: p.pos.y - 4,
            vx: -dir.x * sp + (this.rand() - 0.5) * 30,
            vy: -dir.y * sp + (this.rand() - 0.5) * 30,
            life: 0.32, maxLife: 0.32, size: 1.4,
            colour: i % 2 ? '#9ad4ff' : '#ffffff', drag: 0.86,
          });
        }
      }
    }

    // While the dash is active, sample an afterimage every ~30 ms so
    // the trail reads as a smooth motion-streak. Each ghost ages out
    // over 0.28 s with linear alpha fade.
    if (p.dashTimer > 0) {
      this.dashTrailAccum += dt;
      if (this.dashTrailAccum >= 0.03) {
        this.dashTrailAccum = 0;
        this.dashTrail.push({
          x: p.pos.x, y: p.pos.y,
          facing: { x: p.facing.x, y: p.facing.y },
          walkPhase: p.walkPhase, t: 0,
        });
      }
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
    this.dyingT = 0;
    // The soul is dissolved and prepares for rebirth (palingenesia).
    this.unlockCodex('death.palingenesia');
    // Big death-blow shake — the lamp goes out with weight.
    this.camera.shakeT = Math.max(this.camera.shakeT, 0.6);
    this.camera.shakeMag = Math.max(this.camera.shakeMag, 4);
    // Initial impact burst — gold + accent halo radiating from the body.
    if (!this.reducedParticles) {
      const accent = this.currentSphere.accent;
      this.particles.burst(this.player.pos.x, this.player.pos.y - 6, 40, {
        colour: accent, life: 1.0, maxLife: 1.0, drag: 0.88,
      });
      this.particles.burst(this.player.pos.x, this.player.pos.y - 6, 24, {
        colour: '#f4d27a', life: 1.4, maxLife: 1.4, drag: 0.9,
      });
    }
    audio.sfx('playerHit');
    // onGameOver is fired once dyingT crosses dyingDuration.
  }

  /** Tick the death sequence — periodic embers / final flash. */
  private updateDying(dt: number): void {
    if (this.dyingT < 0) return;
    const prev = this.dyingT;
    this.dyingT += dt;
    // Every ~0.25s, spit a few embers upward from the body.
    if (!this.reducedParticles) {
      const stepPrev = Math.floor(prev / 0.22);
      const stepNow = Math.floor(this.dyingT / 0.22);
      if (stepNow > stepPrev) {
        const p = this.player;
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (this.rand() - 0.5) * 0.9;
          const sp = 30 + this.rand() * 30;
          this.particles.emit({
            x: p.pos.x + (this.rand() - 0.5) * 6,
            y: p.pos.y - 6,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 0.6, maxLife: 0.6, size: 1.2,
            colour: i % 2 ? '#f4d27a' : '#ffffff', drag: 0.92,
          });
        }
      }
    }
    // Final beat — at ~80% of the duration, white flash + sphere accent
    // burst so the body "extinguishes" with a soft pop.
    if (prev < this.dyingDuration * 0.82 && this.dyingT >= this.dyingDuration * 0.82) {
      const p = this.player;
      this.camera.shakeT = Math.max(this.camera.shakeT, 0.3);
      this.camera.shakeMag = Math.max(this.camera.shakeMag, 2.4);
      if (!this.reducedParticles) {
        const accent = this.currentSphere.accent;
        this.particles.burst(p.pos.x, p.pos.y - 6, 36, {
          colour: '#ffffff', life: 0.7, maxLife: 0.7, drag: 0.86,
        });
        this.particles.burst(p.pos.x, p.pos.y - 6, 22, {
          colour: accent, life: 1.0, maxLife: 1.0, drag: 0.9,
        });
      }
      audio.sfx('bossDeath');
    }
    if (!this.gameOverFired && this.dyingT >= this.dyingDuration) {
      this.gameOverFired = true;
      this.cbs.onGameOver({
        ...this.summary,
        bestFloor: Math.max(this.summary.bestFloor, this.summary.floorReached),
      });
    }
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
            vx: ux * 60 + (this.rand() - 0.5) * 20,
            vy: uy * 60 + (this.rand() - 0.5) * 20,
            life: 0.22, maxLife: 0.22,
            size: 1.2, colour: palette[i % 2]!, drag: 0.9,
          });
        }
      } else {
        // arc / thrust / flurry — fanned sparks
        for (let i = 0; i < 6; i++) {
          const a = baseAngle + (this.rand() - 0.5) * w.arcHalf * 2;
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
          const consume = !(p.relics.includes('keyOfTheGate') && this.randChance(0.35));
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
    // NPC dialogue
    for (const npc of this.npcs) {
      if (npc.def.dialogue && dist(p.pos, npc.pos) < 30) {
        this.activeDialogue = { npcId: npc.def.id, lineIndex: 0, choicesVisible: false };
        this.setPaused(true);
        this.cbs.onDialogueOpen?.(this.activeDialogue);
        return;
      }
    }
  }

  private isNearCenter(pos: Vec): boolean {
    return dist(pos, { x: ROOM_W / 2, y: ROOM_H / 2 }) < 36;
  }

  private openChestLoot(x: number, y: number): void {
    audio.sfx('chest');
    const r = this.rand();
    // 12% weapon, 12% spell, 14% relic, rest is gold/essence
    if (r < 0.12) {
      const pool = WEAPON_LOOT_POOL.filter((id) => !this.player.weapons.includes(id));
      if (pool.length > 0) {
        const id = this.randPick(pool);
        this.pickups.push({ id: nid(), pos: { x, y }, kind: 'weapon', value: 0, weapon: id, life: 30 });
        return;
      }
    }
    if (r < 0.24) {
      const pool = SPELL_LOOT_POOL.filter((id) => !this.player.spells.includes(id));
      if (pool.length > 0) {
        const id = this.randPick(pool);
        this.pickups.push({ id: nid(), pos: { x, y }, kind: 'spell', value: 0, spell: id, life: 30 });
        return;
      }
    }
    if (r < 0.38) {
      // relic
      const owned = new Set(this.player.relics);
      const pool = RELIC_IDS.filter((id) => !owned.has(id));
      if (pool.length > 0) {
        const id = this.randPick(pool);
        this.pickups.push({ id: nid(), pos: { x, y }, kind: 'relic', value: 0, relic: id, life: 20 });
        return;
      }
    }
    // Coins + essence + possible pickups
    const luck = 1 + this.player.luck * 0.05;
    const coinBoost = this.player.relics.includes('solarCoin') ? 1.5 : 1;
    const coins = Math.round((6 + this.rand() * 10) * luck * coinBoost);
    const ess = Math.round((2 + this.rand() * 5) * coinBoost);
    for (let i = 0; i < coins / 2; i++) {
      const a = this.rand() * Math.PI * 2;
      const d = 8 + this.rand() * 16;
      this.pickups.push({
        id: nid(),
        pos: { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d },
        kind: 'coin', value: 2, life: 18,
      });
    }
    for (let i = 0; i < ess; i++) {
      const a = this.rand() * Math.PI * 2;
      const d = 8 + this.rand() * 14;
      this.pickups.push({
        id: nid(),
        pos: { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d },
        kind: 'essence', value: 1, life: 18,
      });
    }
    if (this.randChance(0.45)) {
      this.pickups.push({ id: nid(), pos: { x: x - 12, y: y + 4 }, kind: 'hp', value: 18, life: 18 });
    }
    if (this.randChance(0.45)) {
      this.pickups.push({ id: nid(), pos: { x: x + 12, y: y + 4 }, kind: 'mp', value: 25, life: 18 });
    }
    if (this.randChance(0.18)) {
      this.pickups.push({ id: nid(), pos: { x, y: y + 18 }, kind: 'key', value: 1, life: 22 });
    }
    this.particles.burst(x, y, 30, { colour: PALETTE.gold, life: 1, maxLife: 1, drag: 0.9 });
    this.autoSave();
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
          if (pool.length) this.grantRelic(this.randPick(pool));
          // spawn extra shades
          for (let i = 0; i < 3; i++) {
            this.spawnEnemy('lesserShade', {
              x: ROOM_W * 0.3 + this.rand() * ROOM_W * 0.4,
              y: ROOM_H * 0.3 + this.rand() * ROOM_H * 0.4,
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
      this.autoSave();
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
            const a = Math.atan2(n.y, n.x) + (this.rand() - 0.5) * 1.6;
            e.ai.jitterDir = { x: Math.cos(a), y: Math.sin(a) };
            e.ai.jitterTimer = 0.18 + this.rand() * 0.25;
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
        case 'saltBanshee': {
          // Ghostly chaser. Fires a slow bolt when in range.
          this.moveTowards(e, n, e.speed, dt);
          if (e.cooldown <= 0 && d < 200) {
            this.projectiles.push({
              id: nid(),
              pos: { x: e.pos.x, y: e.pos.y },
              vel: { x: n.x * 100, y: n.y * 100 },
              life: 2.5, radius: 4, damage: 9,
              fromPlayer: false, pierce: 0, homing: false,
              colour: '#cdd6dc', trailColour: '#3a5a7a',
            });
            e.cooldown = 1.8;
          }
          break;
        }
        case 'wardenBoss':
        case 'seleneBoss':
        case 'hermesBoss':
        case 'aphroditeBoss':
        case 'heliosBoss':
        case 'aresBoss':
        case 'zeusBoss':
        case 'kronosBoss':
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

    // Boss snapshot — name comes from the Warden's BossDef if there is one,
    // otherwise the legacy "Warden of the First Lamp".
    const boss = this.enemies.find((e) => e.isBoss);
    if (boss) {
      const def = wardenDefFromVisual(boss.visualKey);
      this.bossSnapshot = {
        hp: boss.hp, maxHp: boss.maxHp,
        name: def?.displayName ?? 'Warden of the First Lamp',
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
    if (e.phase === 1 && e.hp / e.maxHp < 0.6) { e.phase = 2; this.camera.shakeT = 0.6; this.camera.shakeMag = 4; audio.sfx('bossWarn'); audio.setBossPhase(2); }
    if (e.phase === 2 && e.hp / e.maxHp < 0.3) { e.phase = 3; this.camera.shakeT = 0.6; this.camera.shakeMag = 5; audio.sfx('bossWarn'); audio.setBossPhase(3); }

    // Slow drift toward player but keep distance
    const target = 80;
    let dir = n;
    if (d < target) dir = { x: -n.x, y: -n.y };
    this.moveTowards(e, dir, e.speed, dt);

    if (e.cooldown <= 0) {
      const def = wardenDefFromVisual(e.visualKey);
      const patterns: BossPattern[] = def?.patterns ?? ['radialBurst', 'summonShades', 'dropSigils'];
      const cooldowns = def?.phaseCooldowns ?? [2.5, 2.0, 1.5];
      const pattern = patterns[(e.pattern ?? 0) % patterns.length];
      this.runBossPattern(e, pattern);
      e.pattern = (e.pattern ?? 0) + 1;
      const phaseIdx = Math.min(2, Math.max(0, (e.phase ?? 1) - 1));
      e.cooldown = cooldowns[phaseIdx];
    }
  }

  /** Dispatch the named pattern. Each pattern function below mutates
   * engine state (projectiles / sigils / enemies / timeStop). */
  private runBossPattern(e: Enemy, pattern: BossPattern): void {
    switch (pattern) {
      case 'radialBurst':    this.wardenRadialBurst(e); break;
      case 'summonShades':   this.wardenSummon(e); break;
      case 'dropSigils':     this.wardenSigils(e); break;
      case 'tidalPulse':     this.seleneTidalPulse(e); break;
      case 'mercurialStep':  this.hermesMercurialStep(e); break;
      case 'loveBind':       this.aphroditeLoveBind(e); break;
      case 'solarLance':     this.heliosSolarLance(e); break;
      case 'chargeAndSever': this.aresChargeAndSever(e); break;
      case 'wrathOfHeaven':  this.zeusWrathOfHeaven(e); break;
      case 'stopTime':       this.kronosStopTime(e); break;
    }
  }

  // ─── Sphere-specific attack patterns ─────────────────────────────────

  /** Selene — A widening tidal ring with a safe shadow zone near the
   * boss. Stay close to her (or far outside the wave) to dodge. */
  private seleneTidalPulse(e: Enemy): void {
    this.sigils.push({
      pos: { x: e.pos.x, y: e.pos.y },
      timer: 0,
      delay: 1.0,
      damage: 14,
      fired: false,
      fromPlayer: false,
      radius: 220,
      safeRadius: 60,
      colour: '#cdd6dc',
    });
    audio.sfx('bossWarn');
  }

  /** Hermes — Quicksilver teleport. 0.5s wind-up at his current spot
   * (player can read it), then he teleports to a random distant point
   * and an after-image bolt fires from the OLD position toward where
   * the player WAS at the moment of teleport — dodgeable by stepping. */
  private hermesMercurialStep(e: Enemy): void {
    const oldX = e.pos.x;
    const oldY = e.pos.y;
    audio.sfx('dash');
    this.delayedActions.push({
      t: 0,
      duration: 0.55,
      render: (ctx, t01) => {
        // Growing quicksilver swirl at the boss's current position
        const r = 12 + t01 * 22;
        ctx.fillStyle = `rgba(108, 246, 229, ${0.18 + 0.35 * t01})`;
        ctx.beginPath(); ctx.arc(oldX, oldY, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(164, 250, 240, ${0.6 + 0.4 * t01})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const a = this.timeAlive * 6 + i * (Math.PI * 2 / 3);
          ctx.beginPath();
          ctx.arc(oldX, oldY, r - 4 - i * 2, a, a + 1.6);
          ctx.stroke();
        }
      },
      fire: () => {
        // Teleport — pick a point at least 100 away from player
        for (let attempt = 0; attempt < 6; attempt++) {
          const nx = ROOM_MARGIN + 24 + this.rand() * (ROOM_W - ROOM_MARGIN * 2 - 48);
          const ny = ROOM_MARGIN + 24 + this.rand() * (ROOM_H - ROOM_MARGIN * 2 - 48);
          const d = Math.hypot(this.player.pos.x - nx, this.player.pos.y - ny);
          if (d > 100) { e.pos.x = nx; e.pos.y = ny; break; }
        }
        if (!this.reducedParticles) {
          this.particles.burst(oldX, oldY, 22, { colour: '#6cf6e5', life: 0.5, maxLife: 0.5, drag: 0.85 });
          this.particles.burst(e.pos.x, e.pos.y, 22, { colour: '#a4faf0', life: 0.5, maxLife: 0.5, drag: 0.85 });
        }
        const aimDx = this.player.pos.x - oldX;
        const aimDy = this.player.pos.y - oldY;
        const aimL = Math.hypot(aimDx, aimDy) || 1;
        this.projectiles.push({
          id: nid(),
          pos: { x: oldX, y: oldY },
          vel: { x: (aimDx / aimL) * 220, y: (aimDy / aimL) * 220 },
          life: 2, radius: 5, damage: 12,
          fromPlayer: false, pierce: 0, homing: false,
          colour: '#a4faf0', trailColour: '#1f8a86',
        });
      },
    });
  }

  /** Aphrodite — A 3-second sigil drops where the player is standing.
   * If the player is still inside it when it ticks, take damage. */
  private aphroditeLoveBind(_e: Enemy): void {
    const px = this.player.pos.x;
    const py = this.player.pos.y;
    this.sigils.push({
      pos: { x: px, y: py },
      timer: 0,
      delay: 2.5,
      damage: 16,
      fired: false,
      fromPlayer: false,
      radius: 40,
      colour: '#ff9bc1',
    });
    audio.sfx('shrine');
  }

  /** Helios — three solar lances. 0.7s aim-line telegraph (player can
   * see exactly where each lance will fire and step out of it), then
   * the lances fly. Damage is high; dodge IS the mechanic. */
  private heliosSolarLance(e: Enemy): void {
    // Aim is snapshotted at TELEGRAPH TIME — the player has the full
    // 0.7s to step out of the beams. Fairer than a "live-aim" lock.
    const startX = e.pos.x;
    const startY = e.pos.y;
    const aimDx = this.player.pos.x - startX;
    const aimDy = this.player.pos.y - startY;
    const baseAng = Math.atan2(aimDy, aimDx);
    audio.sfx('bossWarn');
    this.delayedActions.push({
      t: 0,
      duration: 0.75,
      render: (ctx, t01) => {
        // Three thin aim-lines, brightness ramps with t01
        ctx.lineWidth = 1 + t01 * 1.5;
        for (let i = -1; i <= 1; i++) {
          const a = baseAng + i * 0.18;
          const ex = startX + Math.cos(a) * 600;
          const ey = startY + Math.sin(a) * 600;
          ctx.strokeStyle = `rgba(255, 230, 163, ${0.25 + 0.6 * t01})`;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }
        // Pulsing core at the boss to signal "about to fire"
        ctx.fillStyle = `rgba(255, 247, 214, ${0.4 + 0.5 * t01})`;
        ctx.beginPath();
        ctx.arc(startX, startY, 6 + t01 * 4, 0, Math.PI * 2);
        ctx.fill();
      },
      fire: () => {
        // Re-anchor at the boss's CURRENT position (it may have drifted),
        // but use the SNAPSHOT angles so the player's positional dodge
        // remains correct.
        for (let i = -1; i <= 1; i++) {
          const a = baseAng + i * 0.18;
          this.projectiles.push({
            id: nid(),
            pos: { x: e.pos.x, y: e.pos.y },
            vel: { x: Math.cos(a) * 220, y: Math.sin(a) * 220 },
            life: 3, radius: 6, damage: 14,
            fromPlayer: false, pierce: 0, homing: false,
            colour: '#ffe6a3', trailColour: '#f4d27a',
          });
        }
        audio.sfx('spell');
      },
    });
  }

  /** Ares — Charge & Sever. 0.5s wind-up showing the dash path as a
   * thick crimson rail; player can step perpendicular to dodge.
   * Then Ares dashes; the rail becomes a chain of damaging hazards. */
  private aresChargeAndSever(e: Enemy): void {
    const fromX = e.pos.x;
    const fromY = e.pos.y;
    const aimDx = this.player.pos.x - fromX;
    const aimDy = this.player.pos.y - fromY;
    const aimL = Math.hypot(aimDx, aimDy) || 1;
    const ux = aimDx / aimL;
    const uy = aimDy / aimL;
    const dashDist = 160;
    const toX = clamp(fromX + ux * dashDist, ROOM_MARGIN + 12, ROOM_W - ROOM_MARGIN - 12);
    const toY = clamp(fromY + uy * dashDist, ROOM_MARGIN + 16, ROOM_H - ROOM_MARGIN - 12);
    audio.sfx('bossWarn');
    this.delayedActions.push({
      t: 0,
      duration: 0.55,
      render: (ctx, t01) => {
        // Crimson rail along the planned dash. Brightens as time runs out.
        ctx.strokeStyle = `rgba(226, 58, 74, ${0.35 + 0.55 * t01})`;
        ctx.lineWidth = 8 + t01 * 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        // Sigil at the destination so the player reads the endpoint
        ctx.fillStyle = `rgba(226, 58, 74, ${0.5 * t01})`;
        ctx.beginPath();
        ctx.arc(toX, toY, 10 + t01 * 4, 0, Math.PI * 2);
        ctx.fill();
      },
      fire: () => {
        e.pos.x = toX;
        e.pos.y = toY;
        const steps = 7;
        for (let i = 1; i <= steps; i++) {
          const t = i / (steps + 1);
          this.projectiles.push({
            id: nid(),
            pos: { x: fromX + (toX - fromX) * t, y: fromY + (toY - fromY) * t },
            vel: { x: 0, y: 0 },
            life: 0.55, radius: 8, damage: 11,
            fromPlayer: false, pierce: 99, homing: false,
            colour: '#e23a4a', trailColour: '#ff7a5a',
          });
        }
        if (!this.reducedParticles) {
          this.particles.burst(e.pos.x, e.pos.y, 20, { colour: '#ff7a5a', life: 0.45, maxLife: 0.45, drag: 0.85 });
        }
        this.camera.shakeT = 0.2; this.camera.shakeMag = 3;
        audio.sfx('dash');
      },
    });
  }

  /** Zeus — Five lightning sigils mark random tiles around the player. */
  private zeusWrathOfHeaven(_e: Enemy): void {
    const n = (this.enemies.find((x) => x.isBoss)?.phase ?? 1) >= 2 ? 6 : 5;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + this.rand() * 0.4;
      const r = 50 + this.rand() * 80;
      const sx = clamp(this.player.pos.x + Math.cos(ang) * r, ROOM_MARGIN + 12, ROOM_W - ROOM_MARGIN - 12);
      const sy = clamp(this.player.pos.y + Math.sin(ang) * r, ROOM_MARGIN + 12, ROOM_H - ROOM_MARGIN - 12);
      this.sigils.push({
        pos: { x: sx, y: sy },
        timer: 0,
        delay: 1.2,
        damage: 14,
        fired: false,
        fromPlayer: false,
        radius: 28,
        colour: '#f4d27a',
      });
    }
    audio.sfx('bossWarn');
  }

  /** Kronos — Freezes the world for 1.5 s. Player can still move at
   * half speed but cannot dash, and everything else stops. */
  private kronosStopTime(e: Enemy): void {
    this.timeStopUntil = this.timeAlive + 1.5;
    // Flash + heavy shake to telegraph the freeze
    this.camera.shakeT = 0.4; this.camera.shakeMag = 4;
    if (!this.reducedParticles) {
      this.particles.burst(e.pos.x, e.pos.y, 30, { colour: '#9b6cff', life: 1.2, maxLife: 1.2, drag: 0.9 });
    }
    audio.sfx('bossWarn');
  }

  // drawWardenMotif moved to Renderer.ts

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
        x: ROOM_W * 0.25 + this.rand() * ROOM_W * 0.5,
        y: ROOM_H * 0.25 + this.rand() * ROOM_H * 0.5,
      }, this.floor.number);
    }
    audio.sfx('bossWarn');
  }

  private wardenSigils(_e: Enemy): void {
    const n = 5;
    for (let i = 0; i < n; i++) {
      this.sigils.push({
        pos: {
          x: ROOM_W * 0.2 + this.rand() * ROOM_W * 0.6,
          y: ROOM_H * 0.2 + this.rand() * ROOM_H * 0.6,
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
    // Death fade animation — sprite expands + alpha drops over 0.35 s,
    // replacing the "instant pop-out" with a visible dissolve.
    this.deathFx.push({
      visualKey: e.visualKey,
      pos: { x: e.pos.x, y: e.pos.y },
      facing: { x: e.facing.x, y: e.facing.y },
      width: e.width,
      height: e.height,
      radius: e.radius,
      isBoss: !!e.isBoss,
      t: 0,
      duration: e.isBoss ? 0.55 : e.isMiniBoss ? 0.45 : 0.35,
    });
    // Hit-pause on a kill — quick punch of stillness so the death lands.
    this.hitPauseUntil = Math.max(this.hitPauseUntil, this.timeAlive + (e.isBoss ? 0.10 : 0.05));
    this.particles.burst(e.pos.x, e.pos.y, e.isBoss ? 80 : e.isMiniBoss ? 40 : 18, {
      colour: e.isBoss ? '#ffd97a' : '#e23a4a', life: 0.9, maxLife: 0.9,
    });
    if (e.isBoss) {
      this.defeatedWardenIds.push(e.visualKey);
      this.summary.bossesDefeated += 1;
      audio.sfx('bossDeath');
      audio.stopBossMusic();
      this.camera.shakeT = 1.0; this.camera.shakeMag = 6;
      // The Warden of this sphere has fallen — the soul surrenders its tribute.
      this.unlockCodex(`asc.${this.currentSphere.id}`);
      // After two victories, Plotinus on Beauty. After three, Iamblichus on theurgy.
      if (this.summary.bossesDefeated >= 2) this.unlockCodex('ogdoad.beauty');
      if (this.summary.bossesDefeated >= 3) this.unlockCodex('ogdoad.theurgy');
      // drop relic and lots of essence
      const pool = RELIC_IDS.filter((id) => !this.player.relics.includes(id));
      if (pool.length) {
        const id = this.randPick(pool);
        this.pickups.push({ id: nid(), pos: { ...e.pos }, kind: 'relic', value: 0, relic: id, life: 30 });
      }
      // Every boss drops either a weapon or a spell the player doesn't own yet.
      // Alternate by floor — odd floors give weapons, even floors give spells.
      const giveWeapon = this.floor.number % 2 === 1;
      if (giveWeapon) {
        const wPool = WEAPON_LOOT_POOL.filter((id) => !this.player.weapons.includes(id));
        if (wPool.length) {
          const id = this.randPick(wPool);
          this.pickups.push({ id: nid(), pos: { x: e.pos.x + 16, y: e.pos.y }, kind: 'weapon', value: 0, weapon: id, life: 60 });
        } else {
          const sPool = SPELL_LOOT_POOL.filter((id) => !this.player.spells.includes(id));
          if (sPool.length) {
            const id = this.randPick(sPool);
            this.pickups.push({ id: nid(), pos: { x: e.pos.x + 16, y: e.pos.y }, kind: 'spell', value: 0, spell: id, life: 60 });
          }
        }
      } else {
        const sPool = SPELL_LOOT_POOL.filter((id) => !this.player.spells.includes(id));
        if (sPool.length) {
          const id = this.randPick(sPool);
          this.pickups.push({ id: nid(), pos: { x: e.pos.x + 16, y: e.pos.y }, kind: 'spell', value: 0, spell: id, life: 60 });
        } else {
          const wPool = WEAPON_LOOT_POOL.filter((id) => !this.player.weapons.includes(id));
          if (wPool.length) {
            const id = this.randPick(wPool);
            this.pickups.push({ id: nid(), pos: { x: e.pos.x + 16, y: e.pos.y }, kind: 'weapon', value: 0, weapon: id, life: 60 });
          }
        }
      }
      for (let i = 0; i < 20; i++) {
        const a = this.rand() * Math.PI * 2;
        const d = 20 + this.rand() * 40;
        this.pickups.push({
          id: nid(),
          pos: { x: e.pos.x + Math.cos(a) * d, y: e.pos.y + Math.sin(a) * d },
          kind: 'essence', value: 3, life: 40,
        });
      }
      this.autoSave();
    } else {
      audio.sfx('enemyHit');
      this.dropLoot(e);
    }
  }

  private dropLoot(e: Enemy): void {
    const luck = 1 + this.player.luck * 0.05;
    const coinBoost = this.player.relics.includes('solarCoin') ? 1.6 : 1;
    if (this.randChance(0.85 * luck)) {
      const coins = 1 + this.randInt(0, e.isMiniBoss ? 8 : 3);
      for (let i = 0; i < coins; i++) {
        this.pickups.push({
          id: nid(),
          pos: { x: e.pos.x + (this.rand() - 0.5) * 12, y: e.pos.y + (this.rand() - 0.5) * 12 },
          kind: 'coin', value: 1, life: 12,
        });
      }
    }
    if (this.randChance((e.isMiniBoss ? 1 : 0.4) * coinBoost)) {
      this.pickups.push({ id: nid(), pos: { ...e.pos }, kind: 'essence', value: 1, life: 12 });
    }
    if (e.isMiniBoss && this.randChance(0.5)) {
      const pool = RELIC_IDS.filter((id) => !this.player.relics.includes(id));
      if (pool.length) {
        const id = this.randPick(pool);
        this.pickups.push({ id: nid(), pos: { x: e.pos.x, y: e.pos.y - 6 }, kind: 'relic', value: 0, relic: id, life: 20 });
      }
    }
    if (this.randChance(0.08)) {
      this.pickups.push({ id: nid(), pos: { ...e.pos }, kind: 'hp', value: 12, life: 12 });
    }
    if (this.randChance(0.06)) {
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
    if (this.player.relics.includes('crownSpark') && this.randChance(0.25)) {
      this.healPlayer(Math.floor(this.player.maxHp * 0.08));
    }
    this.autoSave();
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
    const nx = knock.x / dirLen;
    const ny = knock.y / dirLen;
    const prevX = e.pos.x;
    const prevY = e.pos.y;
    e.pos.x += nx * knockStrength * 0.02;
    e.pos.y += ny * knockStrength * 0.02;
    this.spawnDamageNumber(e.pos.x, e.pos.y - 10, `${Math.round(dmg)}`, '#ffd97a');
    // Brief hit-pause on damage landing. Every hit gets a 2-frame
    // pause for "punch" feel; big hits get 4 frames. Avoid stacking
    // beyond timeAlive + 0.06 so multi-hits don't lock the world.
    const pauseDur = dmg >= 8 ? 0.05 : 0.025;
    this.hitPauseUntil = Math.min(
      this.timeAlive + 0.06,
      Math.max(this.hitPauseUntil, this.timeAlive + pauseDur),
    );
    if (!this.reducedParticles) {
      const accent = this.currentSphere.accent;
      for (let i = 0; i < 4; i++) {
        this.particles.emit({
          x: e.pos.x, y: e.pos.y,
          vx: (this.rand() - 0.5) * 80, vy: (this.rand() - 0.5) * 80,
          life: 0.3, maxLife: 0.3, size: 1.5, colour: '#e23a4a', drag: 0.9,
        });
      }
      // Sphere-accent glint sparkles — every hit reads as belonging to
      // the current floor's hue, layered over the gore so the room
      // theme bleeds into combat feedback.
      for (let i = 0; i < 4; i++) {
        const a = this.rand() * Math.PI * 2;
        const sp = 60 + this.rand() * 40;
        this.particles.emit({
          x: e.pos.x, y: e.pos.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.28, maxLife: 0.28, size: 1.2, colour: accent, drag: 0.88,
        });
      }
      // Impact ring — 8 small particles flung radially outward from
      // the strike point, giving every hit a brief expanding flash.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const sp = 110;
        this.particles.emit({
          x: e.pos.x, y: e.pos.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.18, maxLife: 0.18, size: 1.4, colour: '#ffffff', drag: 0.78,
        });
      }
      // Knockback dust — "kicked up" at the actual point of impact,
      // launched perpendicular to the knockback direction (sideways
      // splash, not straight back along the punch axis). Tinted with
      // the sphere accent so the dust reads as belonging to the room.
      if (knockStrength > 60) {
        // Perpendicular unit vectors: rotate (nx, ny) by ±90°
        const perpX = -ny;
        const perpY = nx;
        for (let i = 0; i < 4; i++) {
          const side = i % 2 === 0 ? 1 : -1;
          this.particles.emit({
            x: prevX, y: prevY,
            vx: perpX * side * (30 + this.rand() * 30) - nx * 10,
            vy: perpY * side * (30 + this.rand() * 30) - ny * 10,
            life: 0.32, maxLife: 0.32, size: 1.3, colour: accent, drag: 0.86,
          });
        }
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
            // Every spell impact gets a small burst + shake so the hit reads
            // as an event, not just a number popping up.
            if (!this.reducedParticles) {
              this.particles.burst(pr.pos.x, pr.pos.y, 8, { colour: pr.colour, life: 0.35, maxLife: 0.35, drag: 0.85 });
            }
            this.camera.shakeT = Math.max(this.camera.shakeT, 0.06);
            this.camera.shakeMag = Math.max(this.camera.shakeMag, 1.5);
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
        if (this.player.relics.includes('lunarMirror') && this.randChance(0.005)) {
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
      // Magnet — extended for coin/essence so they snake toward the
      // player from further away. Relics still require deliberate pickup.
      const magnet = pk.kind === 'coin' || pk.kind === 'essence' ? 56 : 36;
      if (d < magnet && pk.kind !== 'relic') {
        const dx = p.pos.x - pk.pos.x, dy = p.pos.y - pk.pos.y;
        const len = Math.hypot(dx, dy) || 1;
        // Pull strength ramps up as the player gets closer — gentle
        // float at the edge of magnet range, hard snap when adjacent.
        const closeness = 1 - d / magnet;
        const pull = 60 + 140 * closeness;
        pk.pos.x += (dx / len) * pull * dt;
        pk.pos.y += (dy / len) * pull * dt;
      }
      // Idle shimmer — small sparkle every ~0.45 s seeded by pickup id
      // so each pickup blinks on its own phase. Skipped for relics
      // (they already have an altar halo) and reduced-particles mode.
      if (!this.reducedParticles && pk.kind !== 'relic' && pk.kind !== 'weapon' && pk.kind !== 'spell') {
        const period = 0.45;
        const phase = (pk.id * 0.137) % period;
        const slot = Math.floor((this.timeAlive + phase) / period);
        const lastSlot = Math.floor((this.timeAlive - dt + phase) / period);
        if (slot !== lastSlot) {
          const col = this.pickupSparkleColour(pk.kind);
          const a = this.rand() * Math.PI * 2;
          this.particles.emit({
            x: pk.pos.x + Math.cos(a) * 4,
            y: pk.pos.y + Math.sin(a) * 4 - 2,
            vx: 0, vy: -10,
            life: 0.45, maxLife: 0.45, size: 1.2, colour: col, drag: 0.92,
          });
        }
      }
      if (d < 10) {
        this.applyPickup(pk);
        this.pickups.splice(i, 1);
      }
    }
  }

  private pickupSparkleColour(kind: Pickup['kind']): string {
    switch (kind) {
      case 'coin':    return '#f4d27a';
      case 'essence': return '#9b6cff';
      case 'hp':      return '#ff7a8a';
      case 'mp':      return '#9b6cff';
      case 'key':     return '#6cf6e5';
      default:        return '#f4d27a';
    }
  }

  private applyPickup(pk: Pickup): void {
    const p = this.player;
    const essBonus = 1 + this.meta.bonusEssenceGain;
    switch (pk.kind) {
      case 'coin':
        p.coins += pk.value;
        this.summary.coinsCollected += pk.value;
        if (pk.value >= 3) this.spawnDamageNumber(p.pos.x, p.pos.y - 8, `+${pk.value}`, '#f4d27a');
        break;
      case 'essence': {
        const gained = Math.max(1, Math.round(pk.value * essBonus));
        p.essence += gained;
        this.summary.essenceCollected += gained;
        if (gained >= 2) this.spawnDamageNumber(p.pos.x, p.pos.y - 8, `+${gained}`, '#9b6cff');
        break;
      }
      case 'key':
        p.keys += pk.value;
        this.spawnDamageNumber(p.pos.x, p.pos.y - 8, 'KEY', '#6cf6e5');
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
    // Celebratory micro-burst at the player — every pickup gets a
    // tiny "yes, I got it" puff so the moment lands. Burst colour
    // matches the pickup kind. Relic/weapon/spell get extra weight
    // because those are the rare drops.
    if (!this.reducedParticles) {
      const col = this.pickupSparkleColour(pk.kind);
      const isRare = pk.kind === 'relic' || pk.kind === 'weapon' || pk.kind === 'spell';
      this.particles.burst(p.pos.x, p.pos.y - 6, isRare ? 24 : 10, {
        colour: col, life: 0.55, maxLife: 0.55, drag: 0.86,
      });
      // Small ring of white sparks for the "snap" — every pickup,
      // regardless of kind, gets the bright micro-flash.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const sp = 70;
        this.particles.emit({
          x: p.pos.x, y: p.pos.y - 6,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.18, maxLife: 0.18, size: 1.2, colour: '#ffffff', drag: 0.8,
        });
      }
    }
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
          // Selene's tidal-pulse uses safeRadius: player is safe INSIDE
          // a small ring around the source; damaged BETWEEN safeRadius
          // and the outer ring. Default behaviour is "damage if inside
          // the (single) radius".
          const safe = s.safeRadius ?? 0;
          const hit = safe > 0 ? (d >= safe && d <= radius) : (d < radius);
          if (hit) this.damagePlayer(s.damage);
        }
        this.particles.burst(s.pos.x, s.pos.y, 32, { colour, life: 0.8, maxLife: 0.8 });
        this.camera.shakeT = 0.2; this.camera.shakeMag = 2.5;
        audio.sfx(s.fromPlayer ? 'spell' : 'enemyHit');
      }
      if (s.timer > s.delay + 0.4) this.sigils.splice(i, 1);
    }
  }

  private updateNpcs(dt: number): void {
    for (const npc of this.npcs) {
      // Passive effects (heal, mp, essence) while player is in range
      if (npc.def.passive) {
        const d = dist(this.player.pos, npc.pos);
        if (d < npc.def.passive.radius) {
          npc.passiveAccum += dt;
          const interval = 1 / npc.def.passive.perSec;
          while (npc.passiveAccum >= interval) {
            npc.passiveAccum -= interval;
            if (npc.def.passive.kind === 'heal') {
              this.healPlayer(1);
            } else if (npc.def.passive.kind === 'mp') {
              this.player.mp = Math.min(this.player.maxMp, this.player.mp + 1);
            } else if (npc.def.passive.kind === 'essence') {
              this.player.essence += 1;
            }
          }
        }
      }
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
      const useKey = !(this.player.relics.includes('keyOfTheGate') && this.randChance(0.35));
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
      vx: (this.rand() - 0.5) * 20,
      vy: -30 - this.rand() * 20,
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

  private updateDeathFx(dt: number): void {
    for (let i = this.deathFx.length - 1; i >= 0; i--) {
      const fx = this.deathFx[i];
      fx.t += dt;
      if (fx.t >= fx.duration) this.deathFx.splice(i, 1);
    }
  }

  private updateDashTrail(dt: number): void {
    for (let i = this.dashTrail.length - 1; i >= 0; i--) {
      this.dashTrail[i].t += dt;
      if (this.dashTrail[i].t > 0.28) this.dashTrail.splice(i, 1);
    }
  }

  private updateDelayedActions(dt: number): void {
    for (let i = this.delayedActions.length - 1; i >= 0; i--) {
      const a = this.delayedActions[i];
      a.t += dt;
      if (a.t >= a.duration) {
        try { a.fire(); } catch (e) { console.warn('[combat] delayed action fire failed', e); }
        this.delayedActions.splice(i, 1);
      }
    }
  }

  // Draw methods moved to Renderer.ts. See drawDelayedActionTelegraphs there.

  // --- render -------------------------------------------------------------

  private render(): void {
    const state: RenderState = {
      camera: this.camera,
      player: this.player,
      room: this.currentRoom,
      floorNumber: this.floor.number,
      currentSphere: this.currentSphere,
      enemies: this.enemies,
      projectiles: this.projectiles,
      pickups: this.pickups,
      sigils: this.sigils,
      damageNumbers: this.damageNumbers,
      deathFx: this.deathFx,
      roomClearEffects: this.roomClearEffects,
      dashTrail: this.dashTrail,
      delayedActions: this.delayedActions,
      particles: this.particles,
      timeAlive: this.timeAlive,
      timeStopUntil: this.timeStopUntil,
      dyingT: this.dyingT,
      dyingDuration: this.dyingDuration,
      reducedParticles: this.reducedParticles,
      pendingShrine: this.pendingShrine,
      floorTransition: this.floorTransition,
      floorBanner: this.floorBanner,
      bossBannerTimer: this.bossBannerTimer,
      bossSnapshot: this.bossSnapshot,
      npcs: this.npcs,
    };
    this.renderer.render(this.ctx, state);
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
    // NPC interaction prompt
    for (const npc of this.npcs) {
      if (npc.def.dialogue && dist(p.pos, npc.pos) < 30) {
        prompts.push('Press Interact to speak');
        break;
      }
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
      lampsLit: this.summary.bossesDefeated,
      sphereId: this.currentSphere.id,
      sphereName: this.currentSphere.name,
      sphereGlyph: this.currentSphere.glyph,
      sphereGodName: this.currentSphere.godName,
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

  // --- public hooks ---------------------------------------------------------

  getSummary(): RunSummary { return this.summary; }
  isDead(): boolean { return this.dead; }

  /** Build a snapshot of the current run state for save/resume. */
  createRunSnapshot(): RunSnapshot {
    return {
      version: RUN_SNAPSHOT_VERSION,
      archetype: this.archetype.id,
      runSeed: this.runSeed,
      floor: this.floor.number,
      roomId: this.currentRoom.id,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      mp: this.player.mp,
      maxMp: this.player.maxMp,
      coins: this.player.coins,
      keys: this.player.keys,
      weapons: [...this.player.weapons],
      spells: [...this.player.spells],
      relics: [...this.player.relics],
      defeatedWardenIds: [...this.defeatedWardenIds],
      openedChestRoomIds: this.floor.rooms.filter((r) => r.chestOpened).map((r) => r.id),
      clearedRoomIds: this.floor.rooms.filter((r) => r.cleared).map((r) => r.id),
      shrineUsedRoomIds: this.floor.rooms.filter((r) => r.shrineUsed).map((r) => r.id),
    };
  }

  /** Auto-save: notify the host that a RunSnapshot is available for persisting. */
  private autoSave(): void {
    this.cbs.onAutoSave?.(this.createRunSnapshot());
  }

  /** Advance to the next dialogue line. No-op if dialogue is not active. */
  advanceDialogue(): void {
    if (!this.activeDialogue) return;
    this.activeDialogue.lineIndex++;
    this.activeDialogue.choicesVisible = false;
    this.cbs.onDialogueOpen?.(this.activeDialogue);
  }

  /** Choose a dialogue option by its index in the current NPC's choice list.
   *  Handles cost checks, effects, line gating, and dialogue closing. */
  chooseDialogueOption(choiceIndex: number): void {
    if (!this.activeDialogue) return;
    const npc = this.npcs.find((n) => n.def.id === this.activeDialogue!.npcId);
    if (!npc) return;
    const choices = npc.def.dialogue?.choices;
    if (!choices || choiceIndex >= choices.length) return;
    const choice = choices[choiceIndex];

    // Cost check — silently reject if unaffordable
    if (choice.cost) {
      if (choice.cost.kind === 'coins' && this.player.coins < choice.cost.amount) return;
      if (choice.cost.kind === 'essence' && this.player.essence < choice.cost.amount) return;
      // Deduct
      if (choice.cost.kind === 'coins') this.player.coins -= choice.cost.amount;
      if (choice.cost.kind === 'essence') this.player.essence -= choice.cost.amount;
    }

    // Resolve effect
    if (choice.effect) {
      switch (choice.effect) {
        case 'upgradeWeapon':
          this.player.damageMul += 0.15;
          this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 18, 'WEAPON UP', '#f4d27a');
          audio.sfx('shrine');
          break;
        case 'revealBoss':
          this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 18, 'WARDEN REVEALED', '#9b6cff');
          audio.sfx('shrine');
          break;
        case 'restoreLamp':
          this.healPlayer(30);
          this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 18, 'LAMP KINDLED', '#ffe6a3');
          audio.sfx('shrine');
          break;
        case 'healFull':
          this.healPlayer(this.player.maxHp);
          this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 18, 'FULL HEAL', '#4ade80');
          audio.sfx('shrine');
          break;
      }
    }

    // Gate to another line
    if (choice.gotoLine !== undefined) {
      this.activeDialogue.lineIndex = choice.gotoLine;
      this.cbs.onDialogueOpen?.(this.activeDialogue);
      return;
    }

    // Close dialogue
    if (choice.closesDialogue) {
      this.closeDialogue();
    }
  }

  /** Force-close the dialogue (e.g. when the UI signals close). Also called
   *  via the public chooseDialogueOption path when closesDialogue is set. */
  private closeDialogue(): void {
    this.activeDialogue = null;
    this.setPaused(false);
    this.cbs.onDialogueClose?.();
  }
}
