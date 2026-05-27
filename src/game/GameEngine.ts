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
import {
  CONSUMABLES, CONSUMABLE_IDS, ConsumableId,
  CONSUMABLE_SLOT_CAP, CONSUMABLE_STACK_CAP,
} from './data/consumables';
import {
  RELIC_SYNERGIES, SYNERGY_IDS, SynergyId, synergiesFromRelics,
} from './data/relicSynergies';
import {
  ShrineVariant, pickShrineVariant, shrineDisplayName,
} from './data/shrines';
import {
  STATUS_CONFIG, StatusEffect, StatusEffectKind,
  applyStatusEffect, tickStatusEffects, hasStatus, absorbWithShield,
  speedMultiplierFromStatus,
} from './data/statusEffects';
import type { AppliesStatus } from './data/statusEffects';
import {
  HAZARD_CONFIG, Hazard, hazardIsActive, hazardActiveProgress, spawnRoomHazards,
} from './data/hazards';
import { CODEX, CODEX_BY_ID } from './data/codex';
import { SPHERES, SphereId, sphereForFloor, isOgdoadFloor } from './data/spheres';
import { BOSSES, BossDef, BossPattern } from './data/bosses';
import { generateFloor } from './world/DungeonGenerator';
import { ParticleSystem } from './rendering/Particles';
import {
  drawChest, drawEnemy, drawFloorTile, drawInitiate, drawShrine, drawStairs, drawTorch, drawWallTile, getEnemySize,
} from './rendering/PixelArt';
import { drawProps, placeProps, propCountFor, PropPlacement } from './rendering/sphereDecor';
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
  /** True the moment any pad button or stick produces input — used so
   *  iPad players with a paired controller stop seeing the touch
   *  overlay even before the input-method pill flips. */
  controllerActive: boolean;
  hint?: string;
  // For minimap
  rooms: {
    gx: number;
    gy: number;
    type: RoomType;
    discovered: boolean;
    current: boolean;
    /** Has an unopened chest in the room. Minimap renders a chest pip. */
    chestIntact: boolean;
    /** Has an untouched shrine. Minimap renders a shrine pip. */
    shrineIntact: boolean;
  }[];
  pendingShrine?: { name: string; effect: string; downside: string };
  /** Current combo counter (0 = no chain). Capped at 5. */
  combo: number;
  /** Pulse animation timer (0..0.4) — used to scale the HUD tag on increment. */
  comboPulse: number;
  /** Player status snapshot (for the HUD effect strip). */
  playerStatus: { kind: StatusEffectKind; remaining: number; stacks: number }[];
  /** Total elapsed run seconds (frozen during pause/menu/cinematic). */
  runTimer: number;
  /** Current / max dash cooldown — drives the HUD dash ring. */
  dashCooldown: number;
  dashCooldownMax: number;
  /** Active tutorial prompts (gold ghost-text overlays). Empty after first run. */
  tutorialPrompts: string[];
  /** Consumable slots carried by the player (cap 3 distinct kinds). */
  consumables: { id: ConsumableId; count: number }[];
  /** Index into `consumables` of the selected slot. */
  consumableIdx: number;
  /** True while the player's next spell is free (Echo Charm active). */
  freeNextSpell: boolean;
  /** Earned relic synergies — HUD renders one badge per id. */
  synergies: SynergyId[];
  /** Current / max archetype ultimate cooldown — drives the HUD ring. */
  ultimateCd: number;
  ultimateCdMax: number;
  ultimateName: string;
  ultimateGlyph: string;
  ultimateColour: string;
  /** Remaining reflect charges from Mirror Sigil (0 = no ward). */
  reflectCharges: number;
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
  /** First-run tutorial completed — host persists MetaState.seenTutorial. */
  onTutorialComplete?: () => void;
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
  /** Last damage source that killed the player — visualKey of the
   *  enemy / 'hazard' / 'dot' / undefined for a clean descend or
   *  player-initiated quit. Game Over screen displays a "Slain by …"
   *  line keyed off this. */
  deathCause?: string;
  /** Sphere id at the moment of death — pairs with deathCause so the
   *  Game Over screen can say "Slain by Selene, Warden of the Moon"
   *  instead of just the warden name. */
  deathSphereId?: SphereId;
  /** Total elapsed run seconds at game-over. Drives Boss Rush best-time
   *  bookkeeping and shows up on the Game Over screen. */
  runTimerSeconds?: number;
  /** True if this run was a Boss Rush attempt — the host uses this to
   *  branch the post-run write into meta.bossRushBestSeconds. */
  bossRush?: boolean;
  /** True if a Boss Rush run cleared all seven Wardens (Selene through
   *  Kronos) — drives the "new best time" check. */
  bossRushCleared?: boolean;
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
  /** Active status effects (burn / poison / slow / stun / shield / regen). */
  status: StatusEffect[];
  /** Wall-clock (engine timeAlive) at the last dash launch — used by parry. */
  dashStartT: number;
  /** Active consumable inventory — at most CONSUMABLE_SLOT_CAP distinct
   *  kinds, each stacking up to CONSUMABLE_STACK_CAP. */
  consumables: { id: ConsumableId; count: number }[];
  /** Index into `consumables` of the currently selected slot. Clamped on
   *  cycle. Re-clamped down to length-1 when a slot empties. */
  consumableIdx: number;
  /** When true, the player's next spell cast costs no mana — set by
   *  Echo Charm consumable, cleared on the next successful cast. */
  freeNextSpell: boolean;
  /** Earned relic synergies. Populated by `checkAndGrantSynergies`
   *  whenever a new pair completes; never removed within a run. */
  synergies: SynergyId[];
  /** Counter of coin / essence pickups consumed in this run — drives the
   *  Alchemical Mint synergy's every-12th relic drop. */
  pickupTally: number;
  /** Seconds remaining on the archetype ultimate cooldown. Ready at 0. */
  ultimateCd: number;
  /** Max cooldown — copied from the archetype's ultimate.cooldown on mount. */
  ultimateCdMax: number;
  /** Charges remaining on a Mirror-Sigil-style reflect buff. Each enemy
   *  projectile that hits the player while > 0 reflects with +damage. */
  reflectCharges: number;
  /** timeAlive after which the reflect buff lapses regardless of remaining charges. */
  reflectExpiresAt: number;
  /** timeAlive after which the aura (Hermes' Wake) lapses. */
  auraExpiresAt: number;
  /** Source spell id for the active aura, used for damage / status lookups. */
  auraSpellId: SpellId | null;
  /** Next timeAlive tick at which the aura damages enemies in radius. */
  auraNextTick: number;
}

interface Enemy {
  id: number;
  type:
    | 'lesserShade' | 'mercuryImp' | 'saltGolem' | 'lunarWisp'
    | 'saturnKnight' | 'serpentOfBrass' | 'wardenBoss'
    | 'seleneBoss' | 'hermesBoss' | 'aphroditeBoss' | 'heliosBoss'
    | 'aresBoss' | 'zeusBoss' | 'kronosBoss'
    | 'martyrBeacon' | 'umbralStalker' | 'mirrorTwin' | 'kronosianHerald'
    | 'heliokrator' | 'nikethron';
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
  /** Active status effects on this enemy. */
  status: StatusEffect[];
  /** Accumulated walk-phase used to drive a 1 px sprite bob. Ticked
   *  from updateEnemies whenever the enemy actually moves. */
  walkPhase: number;
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
  kind: 'coin' | 'essence' | 'key' | 'hp' | 'mp' | 'relic' | 'weapon' | 'spell' | 'consumable';
  value: number;
  relic?: RelicId;
  weapon?: WeaponId;
  spell?: SpellId;
  consumable?: ConsumableId;
  life: number;
}

interface Familiar {
  id: number;
  /** Live world position — orbits the player via orbitPhase. */
  pos: Vec;
  /** Seconds remaining before despawn. */
  life: number;
  orbitPhase: number;
  orbitRadius: number;
  /** Seconds until next homing-bolt attack. */
  attackTimer: number;
  /** Cached spell id so each familiar tracks its origin parameters
   *  (attack rate, damage, projectile look) even if the player later
   *  cycles to a different active spell. */
  spellId: SpellId;
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
  /** Boss Rush mode — start at floor 10, descend +10 each clear, full
   *  heal between bosses, ends after Ogdoad (floor 80). Score is the
   *  total elapsed runTimer captured on game-over. */
  bossRushMode?: boolean;
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

// Per-enemy telegraph colour — used by the wind-up flash so a
// saturnKnight reads as "violet about to slam" instead of generic orange.
function enemyTelegraphColour(type: string): string {
  switch (type) {
    case 'lesserShade':    return '226, 58, 74';   // crimson
    case 'mercuryImp':     return '108, 246, 229'; // teal
    case 'saltGolem':      return '244, 210, 122'; // bone gold
    case 'lunarWisp':      return '205, 214, 220'; // pale silver
    case 'saturnKnight':   return '155, 108, 255'; // violet
    case 'serpentOfBrass': return '200, 152, 63';  // brass
    default:               return '244, 130, 60';  // fallback warm orange
  }
}

// Hex `#rrggbb` → `"r, g, b"` (an rgba() inner triple).
function hexToRgbString(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}`;
}

// Convert a sphere's hex accent into the format drawTorch wants.
// Inner core stays white-hot regardless; this just tints the outer
// flame layers and the wall halo so each floor's torches read distinct.
function makeTorchTint(sphere: { accent: string }): { rgb: string; halo: string } {
  const rgb = hexToRgbString(sphere.accent);
  return { rgb, halo: `rgba(${rgb}, 0.35)` };
}

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
  private familiars: Familiar[] = [];
  private hazards: Hazard[] = [];
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
  private pendingShrine: {
    kind: ShrineKind;
    variant: ShrineVariant;
    name: string;
    effect: string;
    downside: string;
  } | null = null;
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
  /** visualKey of whatever last hurt the player — captured into
   *  RunSummary.deathCause when the player dies. Cleared on mount. */
  private lastDamageSource: string | null = null;
  /** Boss Rush mode — descend +10 each clear, full heal between fights.
   *  Set from EngineConfig.bossRushMode on mount. */
  private bossRushMode = false;
  /** timeAlive of the last dotTick SFX play — throttle so stacked DoT
   *  doesn't sound like a machine gun. */
  private lastDotTickSfx = -1;

  // Cached per-room prop placements — recomputed on enterRoom so the
  // deterministic layout stays stable across redraws of the same room.
  private roomProps: PropPlacement[] = [];
  private roomPropsForRoomId = -1;

  // Combo meter — successive hits within 1.2s pile a multiplier.
  // Resets on damage taken or 1.5s idle. Cap at 5.
  private comboCount = 0;
  private comboLastHitT = 0;
  /** Pulse animation timer for the HUD combo tag (decays toward 0). */
  private comboPulse = 0;
  /** Crit-flash overlay timer — set on each crit, decays each frame.
   *  Drives the brief full-screen white snap in render(). */
  private critFlashT = 0;
  private static readonly COMBO_WINDOW = 1.2;
  private static readonly COMBO_MAX = 5;
  /** Parry window — dashStartT + this many seconds. */
  private static readonly PARRY_WINDOW = 0.15;

  /** First-run tutorial — toggled on at boot from MetaState.seenTutorial.
   *  When active we render three soft-gold prompts in the first room of
   *  floor 1 that fade once each input is observed. */
  private tutorialActive = false;
  private tutorialDidMove = false;
  private tutorialDidAttack = false;
  private tutorialDidDash = false;
  /** Track the three follow-up prompts (spell / interact / combo). They
   *  fire conditionally after the first three are done. */
  private tutorialDidSpell = false;
  private tutorialDidInteract = false;
  private tutorialSawCombo = false;
  /** Wall-clock the combo first crossed 3 — used to hold the combo
   *  prompt visible briefly before fading. */
  private tutorialComboShownAt = -1;
  private tutorialStartPos: Vec = { x: 0, y: 0 };

  /** Wall-clock time spent inside this run (seconds; ticks only while playing). */
  private runTimer = 0;

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
    this.bossRushMode = !!config.bossRushMode;

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
    this.lastDamageSource = null;
    this.comboCount = 0;
    this.comboLastHitT = 0;
    this.comboPulse = 0;
    this.critFlashT = 0;
    this.runTimer = 0;
    // Tutorial fires only on the very first run ever — gated by meta flag.
    this.tutorialActive = !this.meta.seenTutorial;
    this.tutorialDidMove = false;
    this.tutorialDidAttack = false;
    this.tutorialDidDash = false;
    this.tutorialDidSpell = false;
    this.tutorialDidInteract = false;
    this.tutorialSawCombo = false;
    this.tutorialComboShownAt = -1;
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
    // Boss Rush: jump straight to the first boss floor with a survival
    // stat boost so the player isn't fighting Selene with floor-1 gear.
    if (this.bossRushMode) {
      const p = this.player;
      p.attack += 22;
      p.spellPower += 22;
      p.maxHp += 60;
      p.hp = p.maxHp;
      p.maxMp += 40;
      p.mp = p.maxMp;
      p.armor += 2;
      p.luck += 2;
      this.goToFloor(10);
    } else {
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
      status: [],
      dashStartT: -1,
      consumables: [],
      consumableIdx: 0,
      freeNextSpell: false,
      synergies: [],
      pickupTally: 0,
      ultimateCd: 0,
      ultimateCdMax: a.ultimate.cooldown,
      reflectCharges: 0,
      reflectExpiresAt: 0,
      auraExpiresAt: 0,
      auraSpellId: null,
      auraNextTick: 0,
    };
    this.tutorialStartPos = { x: this.player.pos.x, y: this.player.pos.y };
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

  /** True if the player has earned this synergy this run. */
  private hasSynergy(id: SynergyId): boolean {
    return this.player.synergies.includes(id);
  }

  /** Look at the player's relic list, grant any synergies that have
   *  freshly completed, fire a screen overlay + sfx, and apply any
   *  one-shot stat mods. Called once after every grantRelic. */
  private checkAndGrantSynergies(): void {
    const earned = synergiesFromRelics(this.player.relics);
    for (const id of earned) {
      if (this.player.synergies.includes(id)) continue;
      this.player.synergies.push(id);
      const def = RELIC_SYNERGIES[id];
      // One-shot stat modifier — Tempered Tread restores Black Salt's
      // -8 speed penalty and stacks +2 armor on top.
      if (id === 'temperedTread') {
        this.player.speed += 8;
        this.player.armor += 2;
      }
      // Crowned Vessel — the chalice fills the soul; restore the
      // revive flag immediately to maxMp on the spot.
      if (id === 'crownedVessel') {
        this.player.mp = this.player.maxMp;
      }
      audio.sfx('shrine');
      this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 22, '✦ COMBINATION ✦', '#ffe6a3');
      this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 12, def.name, def.colour);
      if (!this.reducedParticles) {
        this.particles.burst(this.player.pos.x, this.player.pos.y - 8, 28, {
          colour: def.colour, life: 0.9, maxLife: 0.9, drag: 0.86,
        });
        // Bright ring marking the moment, gold like the synergy text.
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          this.particles.emit({
            x: this.player.pos.x, y: this.player.pos.y - 6,
            vx: Math.cos(a) * 150, vy: Math.sin(a) * 150,
            life: 0.4, maxLife: 0.4, size: 1.6, colour: '#ffe6a3', drag: 0.8,
          });
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
    // Synergy check runs after the new relic is in p.relics so a
    // pickup that completes a pair fires the combo overlay on the same
    // frame. The starting-archetype relic also rolls through this path
    // (silent), so synergies that involve a starting relic stay live.
    this.checkAndGrantSynergies();
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

  /** True if the player has room for one more of this consumable kind —
   *  either an existing entry below CONSUMABLE_STACK_CAP, or room for a
   *  new entry under CONSUMABLE_SLOT_CAP. Drop-rolls skip kinds that
   *  fail this so a fully-stocked inventory doesn't waste a chest roll. */
  private canAcceptConsumable(id: ConsumableId): boolean {
    const existing = this.player.consumables.find((c) => c.id === id);
    if (existing) return existing.count < CONSUMABLE_STACK_CAP;
    return this.player.consumables.length < CONSUMABLE_SLOT_CAP;
  }

  private grantConsumable(id: ConsumableId): void {
    const c = CONSUMABLES[id];
    const existing = this.player.consumables.find((e) => e.id === id);
    if (existing) {
      if (existing.count >= CONSUMABLE_STACK_CAP) return;
      existing.count += 1;
    } else {
      if (this.player.consumables.length >= CONSUMABLE_SLOT_CAP) return;
      this.player.consumables.push({ id, count: 1 });
      // Auto-select the newly-acquired kind so the next "use" press
      // doesn't fire whatever was selected before.
      this.player.consumableIdx = this.player.consumables.length - 1;
    }
    this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 18, c.name, c.colour);
    this.particles.burst(this.player.pos.x, this.player.pos.y - 6, 16, {
      colour: c.colour, life: 0.7, maxLife: 0.7, drag: 0.86,
    });
  }

  private cycleConsumable(): void {
    if (this.player.consumables.length < 2) return;
    this.player.consumableIdx = (this.player.consumableIdx + 1) % this.player.consumables.length;
    const slot = this.player.consumables[this.player.consumableIdx];
    const c = CONSUMABLES[slot.id];
    audio.sfx('pickup');
    this.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 16, `${c.name} ×${slot.count}`, c.colour);
  }

  private useSelectedConsumable(): void {
    const p = this.player;
    if (p.consumables.length === 0) return;
    if (p.consumableIdx >= p.consumables.length) p.consumableIdx = 0;
    const slot = p.consumables[p.consumableIdx];
    const def = CONSUMABLES[slot.id];
    this.applyConsumableEffect(slot.id);
    slot.count -= 1;
    if (slot.count <= 0) {
      p.consumables.splice(p.consumableIdx, 1);
      if (p.consumableIdx >= p.consumables.length) {
        p.consumableIdx = Math.max(0, p.consumables.length - 1);
      }
    }
    audio.sfx('shrine');
    this.particles.burst(p.pos.x, p.pos.y - 6, 18, {
      colour: def.colour, life: 0.8, maxLife: 0.8, drag: 0.84,
    });
  }

  private applyConsumableEffect(id: ConsumableId): void {
    const p = this.player;
    switch (id) {
      case 'healingPhial':
        this.healPlayer(25);
        break;
      case 'manaPhial':
        p.mp = Math.min(p.maxMp, p.mp + 30);
        this.spawnDamageNumber(p.pos.x, p.pos.y - 8, '+30 MP', '#9b6cff');
        break;
      case 'cleansingSalt': {
        // Drop every debuff (keep shield/regen if already up).
        p.status = p.status.filter((s) => s.kind === 'shield' || s.kind === 'regen');
        applyStatusEffect(p, 'shield', this.timeAlive, { duration: 4, magnitude: 12 });
        this.spawnDamageNumber(p.pos.x, p.pos.y - 14, 'CLEANSED', '#6cf6e5');
        break;
      }
      case 'emberBomb': {
        const radius = 64;
        // Visual ring telegraph + burst.
        this.particles.burst(p.pos.x, p.pos.y, 28, {
          colour: '#ff7a3a', life: 0.8, maxLife: 0.8, drag: 0.85,
        });
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          this.particles.emit({
            x: p.pos.x, y: p.pos.y,
            vx: Math.cos(a) * 180, vy: Math.sin(a) * 180,
            life: 0.32, maxLife: 0.32, size: 1.8, colour: '#ffe6a3', drag: 0.78,
          });
        }
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const d = Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y);
          if (d > radius) continue;
          const knock = { x: e.pos.x - p.pos.x, y: e.pos.y - p.pos.y };
          this.damageEnemy(e, 18, knock, 220, { fromPlayer: true, canCrit: false });
          applyStatusEffect(e, 'burn', this.timeAlive, { duration: 2.2 });
        }
        this.camera.shakeT = Math.max(this.camera.shakeT, 0.18);
        this.camera.shakeMag = Math.max(this.camera.shakeMag, 2.6);
        break;
      }
      case 'hourglassSand': {
        this.timeStopUntil = Math.max(this.timeStopUntil, this.timeAlive + 1.5);
        this.spawnDamageNumber(p.pos.x, p.pos.y - 14, 'TIME STOP', '#ffe6a3');
        // Halo ring radiating outward.
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          this.particles.emit({
            x: p.pos.x, y: p.pos.y,
            vx: Math.cos(a) * 80, vy: Math.sin(a) * 80,
            life: 0.6, maxLife: 0.6, size: 1.5, colour: '#ffe6a3', drag: 0.86,
          });
        }
        break;
      }
      case 'echoCharm':
        p.freeNextSpell = true;
        this.spawnDamageNumber(p.pos.x, p.pos.y - 14, 'ECHO', '#a4faf0');
        break;
    }
  }

  /** Fire the archetype's signature ability. Resolves via archetype.ultimate.id
   *  so each archetype gets a distinct move; the input handler already gates
   *  on `ultimateCd <= 0`. Sets the cooldown after a successful cast. */
  private useUltimate(): void {
    const p = this.player;
    const u = this.archetype.ultimate;
    p.ultimateCd = p.ultimateCdMax;
    audio.sfx('shrine');
    this.spawnDamageNumber(p.pos.x, p.pos.y - 22, u.name.toUpperCase(), u.colour);
    if (!this.reducedParticles) {
      this.particles.burst(p.pos.x, p.pos.y - 6, 24, {
        colour: u.colour, life: 0.7, maxLife: 0.7, drag: 0.86,
      });
    }
    switch (u.id) {
      case 'wordOfPower': {
        // Six-bolt starburst — auto-aims the first three projectiles at
        // the three nearest enemies, the rest fan radially. Each bolt
        // is a player-owned violet projectile, pierces one, damage
        // scaled off spellPower for parity with Magus's caster identity.
        const sources = [...this.enemies]
          .filter((e) => e.hp > 0)
          .sort((a, b) => {
            const da = Math.hypot(a.pos.x - p.pos.x, a.pos.y - p.pos.y);
            const db = Math.hypot(b.pos.x - p.pos.x, b.pos.y - p.pos.y);
            return da - db;
          })
          .slice(0, 3);
        const dmg = Math.round(p.spellPower * p.damageMul * 1.8);
        const baseSpeed = 200;
        const baseLife = 1.4;
        const aimedAngles = sources.map((e) => Math.atan2(e.pos.y - p.pos.y, e.pos.x - p.pos.x));
        const allAngles = aimedAngles.slice();
        // Pad up to 6 directions with evenly-spaced angles offset from
        // the player's facing, so the salvo always reads as a full
        // starburst even with no enemies in the room.
        const base = Math.atan2(p.facing.y, p.facing.x);
        let pad = 0;
        while (allAngles.length < 6) {
          const a = base + (pad * Math.PI * 2) / 6;
          allAngles.push(a);
          pad += 1;
        }
        for (const a of allAngles) {
          this.projectiles.push({
            id: nid(),
            pos: { x: p.pos.x, y: p.pos.y - 4 },
            vel: { x: Math.cos(a) * baseSpeed, y: Math.sin(a) * baseSpeed },
            life: baseLife,
            radius: 4,
            damage: dmg,
            fromPlayer: true,
            pierce: 2,
            homing: true,
            colour: '#dac8ff',
            trailColour: '#9b6cff',
          });
        }
        // Big bright halo so the cast reads as significant.
        if (!this.reducedParticles) {
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2;
            this.particles.emit({
              x: p.pos.x, y: p.pos.y - 4,
              vx: Math.cos(a) * 160, vy: Math.sin(a) * 160,
              life: 0.45, maxLife: 0.45, size: 1.6, colour: u.colour, drag: 0.8,
            });
          }
        }
        break;
      }
      case 'lanternFlare': {
        // 90 px radial stun + tickle damage. Stuns for 1.5 s, soft burn
        // for the brief flash. Reads as a defensive panic button.
        const radius = 90;
        const flareDmg = Math.round(p.attack * p.damageMul * 0.6);
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const d = Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y);
          if (d > radius) continue;
          applyStatusEffect(e, 'stun', this.timeAlive, { duration: 1.5 });
          this.damageEnemy(e, flareDmg, {
            x: e.pos.x - p.pos.x, y: e.pos.y - p.pos.y,
          }, 80, { fromPlayer: true, canCrit: false });
        }
        // Expanding gold ring telegraphing the radius.
        if (!this.reducedParticles) {
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            this.particles.emit({
              x: p.pos.x, y: p.pos.y - 4,
              vx: Math.cos(a) * 220, vy: Math.sin(a) * 220,
              life: 0.55, maxLife: 0.55, size: 1.8, colour: u.colour, drag: 0.78,
            });
          }
        }
        this.camera.shakeT = Math.max(this.camera.shakeT, 0.2);
        this.camera.shakeMag = Math.max(this.camera.shakeMag, 3.2);
        break;
      }
      case 'astralStep': {
        // Long teleport in the facing direction. Damages any enemy
        // intersected along the line + grants i-frames for the step.
        const dist = 80;
        const fx = p.facing.x || 1;
        const fy = p.facing.y;
        const len = Math.hypot(fx, fy) || 1;
        const ux = fx / len;
        const uy = fy / len;
        const startX = p.pos.x;
        const startY = p.pos.y;
        const endX = clamp(p.pos.x + ux * dist, ROOM_MARGIN + 4, ROOM_W - ROOM_MARGIN - 4);
        const endY = clamp(p.pos.y + uy * dist, ROOM_MARGIN + 4, ROOM_H - ROOM_MARGIN - 4);
        // Line-segment vs circle for each enemy.
        const stepDmg = Math.round(p.attack * p.damageMul * 1.6);
        const lineDx = endX - startX;
        const lineDy = endY - startY;
        const lineLen2 = lineDx * lineDx + lineDy * lineDy || 1;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          // Projection of enemy onto the line
          const t = Math.max(0, Math.min(1, ((e.pos.x - startX) * lineDx + (e.pos.y - startY) * lineDy) / lineLen2));
          const px = startX + t * lineDx;
          const py = startY + t * lineDy;
          const d = Math.hypot(e.pos.x - px, e.pos.y - py);
          if (d < e.radius + 12) {
            this.damageEnemy(e, stepDmg, { x: ux, y: uy }, 100, { fromPlayer: true });
          }
        }
        p.pos.x = endX;
        p.pos.y = endY;
        p.iframes = Math.max(p.iframes, 0.4);
        // Cyan after-streak from start to end.
        if (!this.reducedParticles) {
          const steps = 14;
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            this.particles.emit({
              x: startX + lineDx * t,
              y: startY + lineDy * t - 4,
              vx: 0, vy: -8,
              life: 0.45, maxLife: 0.45, size: 1.8, colour: u.colour, drag: 0.88,
            });
          }
        }
        this.camera.shakeT = Math.max(this.camera.shakeT, 0.15);
        this.camera.shakeMag = Math.max(this.camera.shakeMag, 2.4);
        break;
      }
    }
  }

  private goToFloor(n: number): void {
    const seed = hashSeed(this.runSeed, n);
    this.floor = generateFloor({ floor: n, seed });
    this.summary.floorReached = Math.max(this.summary.floorReached, n);
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.sigils = [];
    this.familiars = [];
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
    audio.stopAmbience();
    audio.startDungeonAmbience(sph.id);
    audio.sfx('descend');
    // Per-sphere four-note stinger so each new floor opens with a
    // theme cue, not just the descend whoosh.
    audio.playFloorStinger(sph.id);
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
    this.familiars = [];
    this.enemies = [];
    this.pickups = [];
    this.hazards = [];
    this.player.pos = { x: entryPos.x, y: entryPos.y };
    // Per-sphere environmental hazards — quiet rooms get at most one,
    // combat rooms get up to three. Boss / start rooms stay clean so
    // those moments read as cinematic.
    const safeRooms = new Set<RoomType>(['start', 'boss', 'exit']);
    if (!safeRooms.has(room.type)) {
      const isCombat = room.type === 'enemy' || room.type === 'miniBoss' || room.type === 'locked';
      const isTrap = room.type === 'trap';
      const sphere = sphereForFloor(this.floor.number).id;
      this.hazards = spawnRoomHazards(sphere, room.seed, this.reducedParticles, isCombat, isTrap);
    }
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
      // Sphere-keyed two-voice stinger plays alongside the bossWarn —
      // gives each Warden's arrival its own tonal signature.
      audio.playBossStinger(sphereForFloor(this.floor.number).id);
      this.bossBannerTimer = 2.2;
      this.camera.shakeT = 0.8;
      this.camera.shakeMag = 5;
      // First time this run that we step into THIS sphere's boss room,
      // ask the host to play the cinematic. The host decides whether to
      // actually play (gated on MetaState.bossesSeen + settings).
      if (!this.bossIntroPlayedThisRun) {
        this.bossIntroPlayedThisRun = true;
        const sphere = sphereForFloor(this.floor.number);
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
      const mbType = this.pickMinibossType(this.floor.number);
      this.spawnEnemy(mbType, { x: ROOM_W / 2, y: ROOM_H / 2 }, this.floor.number, true);
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
  }

  private pickEnemyType(rng: RNG): Enemy['type'] {
    // Per-sphere roster — each sphere owns a small distinct slate of
    // enemies (max 3 kinds). Replaces the previous cumulative ladder
    // where every floor past 4 pulled from the full 5-enemy pool, which
    // dissolved sphere identity into "same shades with new floor tint."
    // Adjacent spheres can share at most one type to ease the
    // transition; non-adjacent spheres never overlap.
    const sphere = sphereForFloor(this.floor.number).id;
    const ROSTER: Record<SphereId, Enemy['type'][]> = {
      moon:    ['lesserShade', 'lunarWisp'],
      mercury: ['mercuryImp',  'lesserShade'],
      venus:   ['mirrorTwin',  'mercuryImp'],
      sun:     ['martyrBeacon','mercuryImp', 'saltGolem'],
      mars:    ['saturnKnight','saltGolem',  'lesserShade'],
      jupiter: ['kronosianHerald','saltGolem','saturnKnight'],
      saturn:  ['umbralStalker','kronosianHerald','saturnKnight'],
      // Ogdoad — the final crucible. Mixes the three most-dangerous
      // late-game enemies so the closing cycle stays varied.
      ogdoad:  ['umbralStalker','kronosianHerald','martyrBeacon'],
    };
    const pool = ROSTER[sphere];
    return pool[rng.int(0, pool.length)];
  }

  /** Pick the miniboss to spawn for a given floor. serpentOfBrass holds
   *  the early game; heliokrator and nikethron take over for Sun→Mars
   *  and Jupiter→Saturn respectively. */
  private pickMinibossType(floor: number): Enemy['type'] {
    const sphere = sphereForFloor(floor).id;
    if (sphere === 'jupiter' || sphere === 'saturn' || sphere === 'ogdoad') return 'nikethron';
    if (sphere === 'sun' || sphere === 'mars') return 'heliokrator';
    return 'serpentOfBrass';
  }

  private spawnEnemy(type: Enemy['type'], pos: Vec, floor: number, isMiniBoss = false): void {
    // Ascension scales enemy HP + damage. Each tier (1..5) adds +30 % HP
    // and +20 % damage. Bosses scale a touch faster — handled below.
    const asc = Math.max(0, this.meta.ascensionLevel ?? 0);
    const hpMul = 1 + asc * 0.30;
    const dmgMul = 1 + asc * 0.20;
    const lvl = (1 + (floor - 1) * 0.2) * hpMul;
    const e: Enemy = {
      id: nid(), type, visualKey: type,
      pos: { ...pos }, vel: { x: 0, y: 0 },
      hp: 10, maxHp: 10, speed: 50, radius: 8, width: 8, height: 8,
      contactDamage: 6, flash: 0, attackTimer: 0,
      state: 'chase', cooldown: 0, facing: { x: 1, y: 0 },
      ai: {},
      status: [],
      // Random initial phase so a roomful of one enemy type doesn't
      // bob in lock-step with itself.
      walkPhase: Math.random() * Math.PI * 2,
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
      case 'martyrBeacon':
        e.hp = e.maxHp = Math.round(60 * lvl); e.speed = 22; e.radius = 10; e.width = 9; e.height = 9; e.contactDamage = 4;
        break;
      case 'umbralStalker':
        // Faster + stealthier shade. Half-alpha drawn until it attacks.
        e.hp = e.maxHp = Math.round(20 * lvl); e.speed = 56; e.radius = 8; e.width = 8; e.height = 8; e.contactDamage = 10;
        break;
      case 'mirrorTwin':
        e.hp = e.maxHp = Math.round(18 * lvl); e.speed = 40; e.radius = 7; e.width = 8; e.height = 7; e.contactDamage = 6;
        break;
      case 'kronosianHerald':
        // Heavier than salt golem; contact applies slow.
        e.hp = e.maxHp = Math.round(54 * lvl); e.speed = 30; e.radius = 11; e.width = 10; e.height = 9; e.contactDamage = 10;
        break;
      case 'heliokrator':
        e.hp = e.maxHp = Math.round(160 * (1 + (floor - 1) * 0.22)); e.speed = 52; e.radius = 14; e.width = 14; e.height = 9; e.contactDamage = 14;
        e.isMiniBoss = true;
        break;
      case 'nikethron':
        e.hp = e.maxHp = Math.round(220 * (1 + (floor - 1) * 0.20)); e.speed = 38; e.radius = 14; e.width = 14; e.height = 9; e.contactDamage = 16;
        e.isMiniBoss = true;
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
    // Bosses scale a bit harder than mooks under ascension.
    if (e.isBoss) {
      e.hp = e.maxHp = Math.round(e.hp * (1 + asc * 0.10));
      e.contactDamage = Math.round(e.contactDamage * (1 + asc * 0.10));
    }
    e.contactDamage = Math.round(e.contactDamage * dmgMul);
    this.enemies.push(e);
  }

  private spawnBoss(floor: number, seed: number): void {
    const rng = new RNG(seed);
    // Pick the Warden by which sphere this boss room sits in. Each
    // sphere has a sphere-specific Warden with its own visual + patterns.
    const sphere = sphereForFloor(floor);
    const def = BOSSES[sphere.id];
    const visualKey = (def?.visualKey ?? 'wardenBoss') as Enemy['type'];
    this.spawnEnemy(visualKey, { x: ROOM_W / 2, y: ROOM_H / 2 - 20 }, floor);
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
    if (!this.dead && !this.paused) this.runTimer += dt;

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
      this.updateFamiliars(dt);
      this.updateDelayedActions(dt);
      this.updateHazards(dt);
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
    p.ultimateCd = Math.max(0, p.ultimateCd - dt);
    p.mp = Math.min(p.maxMp, p.mp + p.manaRegen * dt);
    // Hermes' Wake — periodic AOE around the player while the aura
    // window is active. The spell def carries the radius / damage /
    // status; we read it back via p.auraSpellId rather than capturing
    // it in PlayerState so a balance tweak to spells.ts takes effect
    // on the next tick.
    if (p.auraSpellId && this.timeAlive < p.auraExpiresAt) {
      const sp = SPELLS[p.auraSpellId];
      if (sp && this.timeAlive >= p.auraNextTick) {
        p.auraNextTick = this.timeAlive + (sp.auraTickEvery ?? 0.32);
        const dmg = Math.max(1, Math.round(p.spellPower * p.damageMul * sp.damageMul));
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const d = Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y);
          if (d > sp.radius + e.radius) continue;
          this.damageEnemy(e, dmg, {
            x: e.pos.x - p.pos.x, y: e.pos.y - p.pos.y,
          }, 20, { fromPlayer: true, appliesStatus: sp.appliesStatus, canCrit: false });
        }
        if (!this.reducedParticles) {
          // Tick visual — soft pulse ring that fades within the tick window.
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const r = sp.radius * 0.7;
            this.particles.emit({
              x: p.pos.x + Math.cos(a) * r, y: p.pos.y - 4 + Math.sin(a) * r,
              vx: Math.cos(a) * 18, vy: Math.sin(a) * 18,
              life: 0.28, maxLife: 0.28, size: 1.2, colour: sp.projColour, drag: 0.86,
            });
          }
        }
      }
    } else if (p.auraSpellId && this.timeAlive >= p.auraExpiresAt) {
      // Window closed — clear the source so the HUD pill goes away.
      p.auraSpellId = null;
    }
    if (this.comboPulse > 0) this.comboPulse = Math.max(0, this.comboPulse - dt);
    if (this.critFlashT > 0) this.critFlashT = Math.max(0, this.critFlashT - dt);

    // Cosmetic Lamp Aura — drop a faint sphere-accent sparkle every
    // ~0.22 s so the upgrade leaves a visible wake behind the player.
    if (this.meta.cosmeticLampAura && !this.reducedParticles) {
      const period = 0.22;
      const phase = this.timeAlive % period;
      const lastPhase = (this.timeAlive - dt) % period;
      if (phase < lastPhase) {
        const accent = sphereForFloor(this.floor.number).accent;
        this.particles.emit({
          x: p.pos.x + (Math.random() - 0.5) * 4,
          y: p.pos.y + 2,
          vx: (Math.random() - 0.5) * 8,
          vy: -8 - Math.random() * 6,
          life: 0.7, maxLife: 0.7, size: 1.2, colour: accent, drag: 0.93,
        });
      }
    }

    // Tutorial bake-off — once all six prompts have been satisfied,
    // deactivate + ask host to persist the seenTutorial flag so we
    // never show any of them again. The combo prompt is optional — if
    // the player has played past 4 minutes without ever chaining 3 hits,
    // they don't need the tutorial held open for it.
    const fundamentalsDone = this.tutorialDidMove && this.tutorialDidAttack && this.tutorialDidDash;
    const followUpsDone = this.tutorialDidSpell && this.tutorialDidInteract;
    const comboSeenOrTimedOut = this.tutorialSawCombo || this.timeAlive > 240;
    if (this.tutorialActive && fundamentalsDone && followUpsDone && comboSeenOrTimedOut) {
      this.tutorialActive = false;
      this.meta.seenTutorial = true;
      this.cbs.onTutorialComplete?.();
    }

    // Tick status effects on the player. Regen heals via callback; burn /
    // poison return summed damage that we apply through damagePlayer
    // (bypassing iframes — DoT can't be tank-ignored by mashing dash).
    const dotDmg = tickStatusEffects(p, dt, this.timeAlive, (heal) => this.healPlayer(heal));
    if (dotDmg > 0) this.applyDotToPlayer(Math.round(dotDmg));

    // Drop the combo if too long has passed since the last hit landed.
    if (this.comboCount > 0 && this.timeAlive - this.comboLastHitT > 1.5) {
      this.comboCount = 0;
    }

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

    // Tutorial: detect once the player moves a tile or so.
    if (this.tutorialActive && !this.tutorialDidMove) {
      const dx = p.pos.x - this.tutorialStartPos.x;
      const dy = p.pos.y - this.tutorialStartPos.y;
      if (Math.hypot(dx, dy) > 16) this.tutorialDidMove = true;
    }

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
      // Stamp the dash launch for parry detection. First PARRY_WINDOW
      // seconds of any dash can reflect incoming damage.
      p.dashStartT = this.timeAlive;
      if (this.tutorialActive) this.tutorialDidDash = true;
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
          const sp = 50 + Math.random() * 40;
          this.particles.emit({
            x: p.pos.x, y: p.pos.y - 4,
            vx: -dir.x * sp + (Math.random() - 0.5) * 30,
            vy: -dir.y * sp + (Math.random() - 0.5) * 30,
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
      if (this.tutorialActive) this.tutorialDidAttack = true;
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
      // Echo Charm consumable — next cast is free, then the flag clears.
      const cost = p.freeNextSpell ? 0 : sp.manaCost;
      if (p.mp >= cost) {
        this.castSpell();
        p.spellCooldown = sp.cooldown;
        p.spellTimer = 0.18;
        p.mp = Math.max(0, p.mp - cost);
        if (p.freeNextSpell) p.freeNextSpell = false;
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
    if (s.cycleConsumablePressed) this.cycleConsumable();
    if (s.useConsumablePressed)   this.useSelectedConsumable();
    if (s.ultimatePressed && p.ultimateCd <= 0) this.useUltimate();

    // Death check
    if (p.hp <= 0) this.tryRevive();
  }

  private tryRevive(): void {
    const p = this.player;
    if (p.reviveAvailable) {
      p.reviveAvailable = false;
      // Crowned Vessel synergy upgrades revive to 80 % HP and refills MP.
      const reviveFrac = this.hasSynergy('crownedVessel') ? 0.8 : 0.5;
      p.hp = Math.floor(p.maxHp * reviveFrac);
      if (this.hasSynergy('crownedVessel')) p.mp = p.maxMp;
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
    // Capture the killer at the moment of death — the Game Over screen
    // reads summary.deathCause to render "Slain by …".
    this.summary.deathCause = this.lastDamageSource ?? undefined;
    this.summary.deathSphereId = sphereForFloor(this.floor.number).id;
    // The soul is dissolved and prepares for rebirth (palingenesia).
    this.unlockCodex('death.palingenesia');
    // Big death-blow shake — the lamp goes out with weight.
    this.camera.shakeT = Math.max(this.camera.shakeT, 0.6);
    this.camera.shakeMag = Math.max(this.camera.shakeMag, 4);
    // Initial impact burst — gold + accent halo radiating from the body.
    const accent = sphereForFloor(this.floor.number).accent;
    if (!this.reducedParticles) {
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
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
          const sp = 30 + Math.random() * 30;
          this.particles.emit({
            x: p.pos.x + (Math.random() - 0.5) * 6,
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
        const accent = sphereForFloor(this.floor.number).accent;
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
        runTimerSeconds: this.runTimer,
        bossRush: this.bossRushMode,
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
      // Iron Hook: pull instead of push by inverting the knock vector.
      const knockX = w.pullsToward ? -dx : dx;
      const knockY = w.pullsToward ? -dy : dy;
      const r = this.damageEnemy(e, dmg, { x: knockX, y: knockY }, w.knockback, {
        fromPlayer: true,
        appliesStatus: w.appliesStatus,
      });
      if (w.healOnKill && r.killed) this.healPlayer(w.healOnKill);
      if (p.relics.includes('pulseHeart') && r.isCrit) {
        this.healPlayer(this.hasSynergy('pulseCrown') ? 4 : 2);
        if (this.hasSynergy('pulseCrown') && Math.random() < 0.15) {
          this.pickups.push({
            id: nid(),
            pos: { x: e.pos.x, y: e.pos.y },
            kind: 'hp', value: 12, life: 18,
          });
        }
      }
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
    if (this.tutorialActive) this.tutorialDidSpell = true;
    const fx = p.facing.x || 1, fy = p.facing.y;
    const fl = Math.hypot(fx, fy) || 1;
    const dir = { x: fx / fl, y: fy / fl };
    const baseAngle = Math.atan2(fy, fx);
    const dmg = p.spellPower * p.damageMul * sp.damageMul;
    const pierce = sp.pierce + (p.relics.includes('emeraldTablet') ? 1 : 0);
    const homing = sp.seeking || p.relics.includes('serpentWand');

    if (sp.kind === 'reflectBuff') {
      // Self-cast: stack reflect charges + refresh expiry. Reads as a
      // moonlit halo around the player. The reflect detection lives in
      // updateProjectiles' enemy-projectile branch; it consumes a
      // charge per intercepted bolt and bounces the projectile back
      // with double damage.
      p.reflectCharges = sp.reflectCharges ?? 3;
      p.reflectExpiresAt = this.timeAlive + (sp.buffDuration ?? 8);
      audio.sfx('shrine');
      this.spawnDamageNumber(p.pos.x, p.pos.y - 16, 'MIRROR', sp.projColour);
      if (!this.reducedParticles) {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          this.particles.emit({
            x: p.pos.x, y: p.pos.y - 4,
            vx: Math.cos(a) * 90, vy: Math.sin(a) * 90,
            life: 0.6, maxLife: 0.6, size: 1.4, colour: sp.projColour, drag: 0.85,
          });
        }
      }
      return;
    }

    if (sp.kind === 'aura') {
      // Hermes' Wake — sets an aura window on the player. updatePlayer
      // ticks damage to nearby enemies on the auraNextTick cadence.
      // Re-casting refreshes both the expiry and the next tick so the
      // effective uptime never drops below one full duration.
      p.auraExpiresAt = this.timeAlive + sp.life;
      p.auraSpellId = sp.id;
      p.auraNextTick = this.timeAlive + (sp.auraTickEvery ?? 0.32);
      audio.sfx('spell');
      this.spawnDamageNumber(p.pos.x, p.pos.y - 16, 'WAKE', sp.projColour);
      if (!this.reducedParticles) {
        // Initial outward ring telegraphs the aura's reach.
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          const r = sp.radius;
          this.particles.emit({
            x: p.pos.x, y: p.pos.y - 4,
            vx: Math.cos(a) * r * 1.4, vy: Math.sin(a) * r * 1.4,
            life: 0.45, maxLife: 0.45, size: 1.6, colour: sp.projColour, drag: 0.82,
          });
        }
      }
      return;
    }

    if (sp.kind === 'summon') {
      // Bone Familiar — spawn an orbiting servant. Multiple casts stack
      // up to a soft cap of 3 so a 90 MP burst doesn't paper the room
      // in familiars but a Magus-style caster can build a small swarm.
      const cap = 3;
      if (this.familiars.length >= cap) {
        // Refresh the oldest familiar's life instead of growing past the cap.
        this.familiars[0].life = sp.life;
      } else {
        this.familiars.push({
          id: nid(),
          pos: { x: p.pos.x, y: p.pos.y - 12 },
          life: sp.life,
          orbitPhase: this.familiars.length * (Math.PI * 2 / cap),
          orbitRadius: sp.familiarOrbitRadius ?? 28,
          attackTimer: 0.2,
          spellId: sp.id,
        });
      }
      audio.sfx('shrine');
      this.spawnDamageNumber(p.pos.x, p.pos.y - 16, 'SUMMON', sp.projColour);
      if (!this.reducedParticles) {
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          this.particles.emit({
            x: p.pos.x, y: p.pos.y - 4,
            vx: Math.cos(a) * 60, vy: Math.sin(a) * 60,
            life: 0.6, maxLife: 0.6, size: 1.4, colour: sp.projColour, drag: 0.85,
          });
        }
      }
      return;
    }

    if (sp.kind === 'sigil') {
      // Place a sigil where the player faces (within sigilRange).
      // sigilRange of 0 (Wrath Splinter) lands the sigil at the caster
      // — sigilDelay of 0 fires it instantly, giving the spell its
      // panic-button identity.
      const range = sp.sigilRange ?? 60;
      const sx = range === 0 ? p.pos.x : p.pos.x + dir.x * range;
      const sy = range === 0 ? p.pos.y : p.pos.y + dir.y * range;
      const sigil: SigilHazard = {
        pos: { x: sx, y: sy },
        timer: 0,
        delay: sp.sigilDelay ?? 0.5,
        damage: dmg,
        fired: false,
        fromPlayer: true,
        radius: sp.radius,
        colour: sp.projColour,
      };
      (sigil as SigilHazard & { appliesStatus?: AppliesStatus }).appliesStatus = sp.appliesStatus;
      this.sigils.push(sigil);
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
      type ProjMeta = Projectile & { visual?: string; explodeRadius?: number; appliesStatus?: AppliesStatus; healOnKill?: number };
      (proj as ProjMeta).visual = sp.projVisual;
      (proj as ProjMeta).explodeRadius = sp.explodeRadius;
      (proj as ProjMeta).appliesStatus = sp.appliesStatus;
      (proj as ProjMeta).healOnKill = sp.healOnKill;
      this.projectiles.push(proj);
    }
    audio.sfx('spell');
  }

  private tryInteract(): void {
    const p = this.player;
    const room = this.currentRoom;
    if (this.tutorialActive) this.tutorialDidInteract = true;

    // Diagnostic — fires whenever interact is pressed, regardless of
    // whether anything was in range. Lets the user see in devtools
    // why a press appears to "do nothing": it usually means there's
    // no chest / shrine / exit nearby, or the player isn't standing
    // close enough to the centre object.
    const distToCentre = dist(p.pos, { x: ROOM_W / 2, y: ROOM_H / 2 });
    // eslint-disable-next-line no-console
    console.info(
      '%c[interact] tryInteract',
      'color: #ffe6a3',
      {
        roomType: room.type,
        hasChest: room.hasChest, chestOpened: room.chestOpened,
        hasShrine: room.hasShrine, shrineUsed: room.shrineUsed,
        playerPos: `(${Math.round(p.pos.x)}, ${Math.round(p.pos.y)})`,
        distFromRoomCentre: Math.round(distToCentre),
        chestThreshold: 30, shrineThreshold: 28, stairsThreshold: 36,
      },
    );

    // Stairs — generous range (36 px from room centre).
    if (room.type === 'exit' && this.isNearCenter(p.pos)) {
      this.descend();
      return;
    }
    // Chest — opens within 30 px of the chest position. Range bumped
    // to 36 here so the player doesn't have to stand directly on it,
    // matching the chest's visual footprint.
    if (room.hasChest && !room.chestOpened) {
      const cx = ROOM_W / 2, cy = ROOM_H / 2 + 4;
      if (dist(p.pos, { x: cx, y: cy }) < 36) {
        if (room.chestLocked) {
          const keyChance = this.hasSynergy('cartographersKey') ? 1.0 : 0.35;
          const consume = !(p.relics.includes('keyOfTheGate') && Math.random() < keyChance);
          if (p.keys <= 0) {
            this.spawnDamageNumber(p.pos.x, p.pos.y - 8, 'LOCKED', '#e23a4a');
            return;
          }
          if (consume) p.keys -= 1;
        }
        room.chestOpened = true;
        this.openChestLoot(cx, cy);
        return;
      }
    }
    // Shrine — bumped to 34 px for the same reason.
    if (room.hasShrine && !room.shrineUsed) {
      const cx = ROOM_W / 2, cy = ROOM_H / 2 - 8;
      if (dist(p.pos, { x: cx, y: cy }) < 34) {
        this.beginShrine(room.shrineKind!, room.seed);
        return;
      }
    }
    // Nothing in range — surface a transient hint so the player knows
    // the press was registered. Useful both for diagnosing the
    // "interact doesn't work" report (it DID fire, just nothing was
    // close enough) and as general UX feedback.
    if (
      (room.hasChest && !room.chestOpened) ||
      (room.hasShrine && !room.shrineUsed) ||
      room.type === 'exit'
    ) {
      this.spawnDamageNumber(p.pos.x, p.pos.y - 12, 'TOO FAR', '#9b6cff');
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
    if (r < 0.53) {
      // consumable — 15% of chest rolls. Skip kinds that would put
      // the slot row over CONSUMABLE_SLOT_CAP if they're new AND would
      // exceed CONSUMABLE_STACK_CAP on an existing entry.
      const pool = CONSUMABLE_IDS.filter((id) => this.canAcceptConsumable(id));
      if (pool.length > 0) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        this.pickups.push({ id: nid(), pos: { x, y }, kind: 'consumable', value: 0, consumable: id, life: 22 });
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

  private beginShrine(kind: ShrineKind, seed: number): void {
    const variant = pickShrineVariant(kind, seed);
    this.pendingShrine = {
      kind,
      variant,
      name: shrineDisplayName(kind, variant.name),
      effect: variant.effect,
      downside: variant.downside,
    };
  }

  private confirmShrine(accepted: boolean): void {
    if (!this.pendingShrine) return;
    const room = this.currentRoom;
    const kind = this.pendingShrine.kind;
    const variant = this.pendingShrine.variant;
    if (accepted) {
      const p = this.player;
      const eff = variant.apply;
      if (eff.attack)       p.attack       = Math.max(2, p.attack + eff.attack);
      if (eff.spellPower)   p.spellPower   = Math.max(2, p.spellPower + eff.spellPower);
      if (eff.speed)        p.speed       += eff.speed;
      if (eff.armor)        p.armor        = Math.max(0, p.armor + eff.armor);
      if (eff.luck)         p.luck         = Math.max(0, p.luck + eff.luck);
      if (eff.manaRegen)    p.manaRegen   += eff.manaRegen;
      if (eff.dashCdMaxAdd) p.dashCdMax   += eff.dashCdMaxAdd;
      if (eff.maxHpAdd) {
        p.maxHp = Math.max(20, p.maxHp + eff.maxHpAdd);
        p.hp = Math.min(p.hp, p.maxHp);
      }
      if (eff.maxHpScale != null) {
        p.maxHp = Math.max(20, Math.floor(p.maxHp * eff.maxHpScale));
        p.hp = Math.min(p.hp, p.maxHp);
      }
      if (eff.maxMpAdd) {
        p.maxMp = Math.max(20, p.maxMp + eff.maxMpAdd);
        p.mp = Math.min(p.mp, p.maxMp);
      }
      if (eff.hpDelta) {
        if (eff.hpDelta < 0) {
          // Treat negative as DoT-style — bypasses shield + armor flow
          // for a clean "corruption" feel; can't bring HP below 1.
          p.hp = Math.max(1, p.hp + eff.hpDelta);
        } else {
          this.healPlayer(eff.hpDelta);
        }
      }
      if (eff.mpDelta)        p.mp = Math.max(0, Math.min(p.maxMp, p.mp + eff.mpDelta));
      if (eff.mpRestoreFull)  p.mp = p.maxMp;
      if (eff.coinsDelta)     p.coins = Math.max(0, p.coins + eff.coinsDelta);
      if (eff.essenceDelta)   p.essence = Math.max(0, p.essence + eff.essenceDelta);

      // Engine specials
      const sp = variant.special;
      if (sp?.grantRandomRelic) {
        const pool = RELIC_IDS.filter((id) => !p.relics.includes(id));
        if (pool.length) this.grantRelic(pool[Math.floor(Math.random() * pool.length)]);
      }
      if (sp?.spawnShades) {
        for (let i = 0; i < sp.spawnShades; i++) {
          this.spawnEnemy('lesserShade', {
            x: ROOM_W * 0.3 + Math.random() * ROOM_W * 0.4,
            y: ROOM_H * 0.3 + Math.random() * ROOM_H * 0.4,
          }, this.floor.number);
        }
        if (this.enemies.length > 0) room.cleared = false;
      }
      if (sp?.unlockRandomCodex) {
        const owned = new Set(this.meta.unlockedCodex);
        const candidates = CODEX.filter((c) => !owned.has(c.id));
        if (candidates.length > 0) {
          const c = candidates[Math.floor(Math.random() * candidates.length)];
          this.unlockCodex(c.id);
        }
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
      // Tick statuses first — burn/poison damage applied here; stun
      // skips AI for the rest of this frame; slow scales movement below.
      let dotDmg = tickStatusEffects(e, dt, this.timeAlive);
      // Tar Bloom synergy — burning enemies take +50 % per-tick DoT.
      if (dotDmg > 0 && hasStatus(e, 'burn') && this.hasSynergy('tarBloom')) {
        dotDmg *= 1.5;
      }
      if (dotDmg > 0) {
        e.hp -= dotDmg;
        if (Math.round(dotDmg) > 0) {
          this.spawnDamageNumber(e.pos.x + (Math.random() - 0.5) * 6, e.pos.y - 6, `${Math.round(dotDmg)}`, '#ff7a3a');
        }
        if (e.hp <= 0) { this.killEnemy(e, i); continue; }
      }
      const toP = { x: p.pos.x - e.pos.x, y: p.pos.y - e.pos.y };
      const d = Math.hypot(toP.x, toP.y);
      const n = d > 0 ? { x: toP.x / d, y: toP.y / d } : { x: 0, y: 0 };
      e.facing = n;

      // Stunned enemies skip movement + attack logic but still take
      // damage and tick statuses. They get a yellow halo via the
      // status-icon render path.
      if (hasStatus(e, 'stun')) {
        // Still apply contact damage check + bounds clamp below the switch.
        // Just bypass the AI behaviour.
      } else
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
        case 'seleneBoss':
        case 'hermesBoss':
        case 'aphroditeBoss':
        case 'heliosBoss':
        case 'aresBoss':
        case 'zeusBoss':
        case 'kronosBoss':
          this.updateWarden(e, dt, n, d);
          break;
        case 'martyrBeacon': {
          // Stays roughly in place; heals nearby allies periodically.
          if (d > 80) this.moveTowards(e, n, e.speed, dt);
          if (e.cooldown <= 0) {
            e.cooldown = 1.4;
            const auraR = 60;
            let healed = 0;
            for (const ally of this.enemies) {
              if (ally === e || ally.hp >= ally.maxHp) continue;
              const dd = Math.hypot(ally.pos.x - e.pos.x, ally.pos.y - e.pos.y);
              if (dd < auraR) {
                ally.hp = Math.min(ally.maxHp, ally.hp + 4);
                this.spawnDamageNumber(ally.pos.x, ally.pos.y - 8, '+4', '#ffe6a3');
                healed++;
              }
            }
            if (healed > 0 && !this.reducedParticles) {
              this.particles.burst(e.pos.x, e.pos.y - 4, 16, {
                colour: '#ffe6a3', life: 0.6, maxLife: 0.6, drag: 0.86,
              });
            }
          }
          break;
        }
        case 'umbralStalker':
          this.moveTowards(e, n, e.speed, dt);
          break;
        case 'mirrorTwin':
          this.moveTowards(e, n, e.speed, dt);
          // Spawn one copy the first time it takes damage (hp < maxHp).
          if (!e.ai?.prepTimer && e.hp < e.maxHp) {
            if (!e.ai) e.ai = {};
            e.ai.prepTimer = 999; // flag: already-cloned
            const offX = (Math.random() - 0.5) * 30;
            const offY = (Math.random() - 0.5) * 30;
            this.spawnEnemy('mirrorTwin', { x: e.pos.x + offX, y: e.pos.y + offY }, this.floor.number);
            const clone = this.enemies[this.enemies.length - 1];
            clone.hp = Math.floor(e.maxHp * 0.5);
            clone.maxHp = clone.hp;
            if (!clone.ai) clone.ai = {};
            clone.ai.prepTimer = 999; // clones don't re-clone
            if (!this.reducedParticles) {
              this.particles.burst(e.pos.x, e.pos.y - 4, 18, {
                colour: '#ff6caf', life: 0.5, maxLife: 0.5, drag: 0.85,
              });
            }
          }
          break;
        case 'kronosianHerald':
          if (d > 14) this.moveTowards(e, n, e.speed, dt);
          break;
        case 'heliokrator': {
          // Sun-disc miniboss — wavy chase, fires ricocheting discs.
          const t = this.timeAlive;
          const perp = { x: -n.y, y: n.x };
          const wave = Math.sin(t * 3.6) * 0.5;
          const dir = { x: n.x + perp.x * wave, y: n.y + perp.y * wave };
          this.moveTowards(e, norm(dir), e.speed, dt);
          if (e.cooldown <= 0 && d < 280) {
            // Three discs in a narrow spread.
            for (let k = -1; k <= 1; k++) {
              const a = Math.atan2(n.y, n.x) + k * 0.22;
              this.projectiles.push({
                id: nid(),
                pos: { x: e.pos.x, y: e.pos.y },
                vel: { x: Math.cos(a) * 150, y: Math.sin(a) * 150 },
                life: 2.4, radius: 5, damage: 10,
                fromPlayer: false, pierce: 1, homing: false,
                colour: '#ffe6a3', trailColour: '#ff7a3a',
              });
            }
            e.cooldown = 1.8;
          }
          break;
        }
        case 'nikethron': {
          // Lightning-herald miniboss — slow chase, marks ground with
          // delayed strike sigils.
          if (d > 60) this.moveTowards(e, n, e.speed, dt);
          if (e.cooldown <= 0 && d < 260) {
            // Three sigils around the player.
            for (let k = 0; k < 3; k++) {
              const a = Math.random() * Math.PI * 2;
              const r = 24 + Math.random() * 24;
              this.sigils.push({
                pos: { x: this.player.pos.x + Math.cos(a) * r, y: this.player.pos.y + Math.sin(a) * r },
                timer: 0,
                delay: 0.7,
                damage: 12,
                fired: false,
                fromPlayer: false,
                radius: 22,
                colour: '#6cf6e5',
              });
            }
            e.cooldown = 2.2;
          }
          break;
        }
      }
      // contact damage
      const collideR = e.radius + PLAYER_RADIUS;
      if (d < collideR) {
        if (!this.tryParry({ kind: 'enemy', enemy: e })) {
          this.damagePlayer(e.contactDamage, e.visualKey);
          // Kronosian Herald applies slow on touch — feels temporal.
          if (e.type === 'kronosianHerald') {
            applyStatusEffect(this.player, 'slow', this.timeAlive, { duration: 1.2 });
          }
        }
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
    if (e.phase === 1 && e.hp / e.maxHp < 0.6) { e.phase = 2; this.camera.shakeT = 0.6; this.camera.shakeMag = 4; audio.sfx('bossWarn'); }
    if (e.phase === 2 && e.hp / e.maxHp < 0.3) { e.phase = 3; this.camera.shakeT = 0.6; this.camera.shakeMag = 5; audio.sfx('bossWarn'); }

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
          const nx = ROOM_MARGIN + 24 + Math.random() * (ROOM_W - ROOM_MARGIN * 2 - 48);
          const ny = ROOM_MARGIN + 24 + Math.random() * (ROOM_H - ROOM_MARGIN * 2 - 48);
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
  private aphroditeLoveBind(e: Enemy): void {
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
    void e;
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
  private zeusWrathOfHeaven(e: Enemy): void {
    const n = (e.phase ?? 1) >= 2 ? 6 : 5;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const r = 50 + Math.random() * 80;
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
    void e;
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

  /** Procedural per-Warden motif painted OVER the base sprite so each
   * sphere's boss has a unique silhouette. The motifs are small canvas
   * glyphs (no new pixel art), drawn in the sphere accent colour. */
  private drawWardenMotif(e: Enemy): void {
    const ctx = this.ctx;
    const def = wardenDefFromVisual(e.visualKey);
    if (!def) return;
    const t = this.timeAlive;
    const cx = e.pos.x;
    const headY = e.pos.y - e.height;     // top of sprite
    const bodyY = e.pos.y - e.height / 2;
    ctx.save();
    switch (e.visualKey) {
      case 'seleneBoss': {
        // Crescent moon arc above-left of her head
        const r = 11, mx = cx - 14, my = headY - 12;
        ctx.fillStyle = `rgba(255, 247, 214, ${0.7 + 0.2 * Math.sin(t * 2)})`;
        ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(mx + 4, my - 1, r - 1, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'hermesBoss': {
        // Two snake curves either side — a caduceus shape
        const baseY = bodyY;
        ctx.strokeStyle = `rgba(108, 246, 229, ${0.7 + 0.2 * Math.sin(t * 4)})`;
        ctx.lineWidth = 2;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          for (let k = 0; k <= 12; k++) {
            const yy = baseY - 14 + k * 2.5;
            const xx = cx + side * (10 + Math.sin(k * 0.9 + t * 4) * 4);
            if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        }
        // Wings at the top — two short triangles
        ctx.fillStyle = `rgba(164, 250, 240, 0.85)`;
        ctx.beginPath();
        ctx.moveTo(cx - 4, headY); ctx.lineTo(cx - 14, headY - 6); ctx.lineTo(cx - 4, headY - 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 4, headY); ctx.lineTo(cx + 14, headY - 6); ctx.lineTo(cx + 4, headY - 2);
        ctx.fill();
        break;
      }
      case 'aphroditeBoss': {
        // A small rose-petal cluster spinning slowly near her chest
        ctx.translate(cx, bodyY);
        ctx.rotate(t * 0.6);
        for (let i = 0; i < 5; i++) {
          ctx.rotate((Math.PI * 2) / 5);
          ctx.fillStyle = `rgba(255, 155, 193, ${0.75})`;
          ctx.beginPath();
          ctx.ellipse(0, -7, 3.2, 5.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd0e3';
        ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'heliosBoss': {
        // Sunburst crown of 8 rays above his head
        ctx.fillStyle = `rgba(255, 230, 163, ${0.85})`;
        const cy = headY - 4;
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t * 0.3;
          const len = 10 + Math.abs(Math.sin(t * 3 + i)) * 2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(a);
          ctx.fillStyle = `rgba(255, 247, 214, ${0.9})`;
          ctx.fillRect(-1, -len, 2, len * 0.7);
          ctx.restore();
        }
        break;
      }
      case 'aresBoss': {
        // A small sword + cross-guard floating above the shoulder
        ctx.translate(cx + 12, headY - 4);
        ctx.rotate(Math.PI / 5 + Math.sin(t * 1.4) * 0.08);
        ctx.fillStyle = '#cdd6dc';
        ctx.fillRect(-1, -12, 2, 18);                   // blade
        ctx.fillStyle = '#7a5a1a';
        ctx.fillRect(-4, 4, 8, 2);                       // crossguard
        ctx.fillStyle = '#e23a4a';
        ctx.fillRect(-1, 6, 2, 5);                       // hilt
        break;
      }
      case 'zeusBoss': {
        // Animated lightning bolt to one side
        ctx.strokeStyle = `rgba(255, 247, 214, ${0.65 + 0.35 * Math.sin(t * 8)})`;
        ctx.lineWidth = 2;
        const off = cx + 14;
        const base = headY + 2;
        ctx.beginPath();
        ctx.moveTo(off,     base);
        ctx.lineTo(off + 4, base + 6);
        ctx.lineTo(off + 1, base + 8);
        ctx.lineTo(off + 5, base + 16);
        ctx.lineTo(off + 2, base + 18);
        ctx.lineTo(off + 6, base + 26);
        ctx.stroke();
        break;
      }
      case 'kronosBoss': {
        // Hourglass icon floating above his head
        const hx = cx, hy = headY - 8;
        ctx.fillStyle = `rgba(155, 108, 255, ${0.85})`;
        ctx.beginPath();
        ctx.moveTo(hx - 6, hy - 6);
        ctx.lineTo(hx + 6, hy - 6);
        ctx.lineTo(hx,     hy);
        ctx.lineTo(hx + 6, hy + 6);
        ctx.lineTo(hx - 6, hy + 6);
        ctx.lineTo(hx,     hy);
        ctx.closePath();
        ctx.fill();
        // Sand falling (animated)
        ctx.fillStyle = `rgba(244, 210, 122, ${0.8})`;
        const sandY = hy - 4 + ((t * 12) % 8);
        ctx.fillRect(hx, sandY, 1, 2);
        break;
      }
    }
    ctx.restore();
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
    // Slow / stun bake into a single speed multiplier — stun returns 0,
    // slow returns 0.55, default 1. Keeps individual AI cases ignorant.
    const sm = speedMultiplierFromStatus(e);
    if (sm <= 0) return;
    e.pos.x += dir.x * speed * sm * dt;
    e.pos.y += dir.y * speed * sm * dt;
    // Tick walk phase proportional to actual movement — keeps the bob
    // matched to motion regardless of slows / dashes.
    e.walkPhase += dt * (speed * sm) * 0.08;
  }

  private killEnemy(e: Enemy, idx: number): void {
    // Tar Bloom synergy — every burning kill leaves a small essence
    // tribute. Captured before splice so the enemy's status flags are
    // still readable; the pickup spawns at the corpse position.
    const tarBloomDrop = this.hasSynergy('tarBloom') && hasStatus(e, 'burn');
    this.enemies.splice(idx, 1);
    this.summary.enemiesDefeated += 1;
    if (tarBloomDrop) {
      this.pickups.push({
        id: nid(),
        pos: { x: e.pos.x, y: e.pos.y },
        kind: 'essence', value: 2, life: 20,
      });
    }
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

  private damageEnemy(
    e: Enemy,
    rawDmg: number,
    knock: Vec,
    knockStrength: number,
    opts?: { fromPlayer?: boolean; appliesStatus?: AppliesStatus; canCrit?: boolean },
  ): { isCrit: boolean; killed: boolean } {
    const fromPlayer = opts?.fromPlayer !== false;
    const canCrit = opts?.canCrit !== false;
    let dmg = rawDmg;
    let isCrit = false;

    // Crit roll — luck stat finally pays out. Base 3 % + 2 %/luck point.
    // Bumped from 1 % + 1.5 %/point so crits actually surface per fight;
    // the old baseline had a 20-hit Magus seeing zero crits 40 % of the time.
    if (fromPlayer && canCrit) {
      const chance = Math.max(0, (3 + 2 * this.player.luck) / 100);
      if (Math.random() < chance) {
        isCrit = true;
        dmg *= 1.8;
      }
    }
    // Combo damage bonus — +8% per existing combo count.
    if (fromPlayer && this.comboCount > 0) {
      dmg *= 1 + this.comboCount * 0.08;
    }

    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    e.flash = isCrit ? 0.2 : 0.12;
    const dirLen = Math.hypot(knock.x, knock.y) || 1;
    const nx = knock.x / dirLen;
    const ny = knock.y / dirLen;
    const prevX = e.pos.x;
    const prevY = e.pos.y;
    e.pos.x += nx * knockStrength * 0.02;
    e.pos.y += ny * knockStrength * 0.02;
    if (isCrit) {
      this.spawnCritDamageNumber(e.pos.x, e.pos.y - 14, dmg);
      this.camera.shakeT = Math.max(this.camera.shakeT, 0.22);
      this.camera.shakeMag = Math.max(this.camera.shakeMag, 3.5);
      // Brief full-screen white flash + dedicated audio ping so a crit
      // reads instantly even if the damage number scrolls past quickly.
      this.critFlashT = 0.08;
      audio.sfx('crit');
      if (!this.reducedParticles) {
        this.particles.burst(e.pos.x, e.pos.y - 4, 18, { colour: '#fff7d6', life: 0.55, maxLife: 0.55, drag: 0.84 });
        // Expanding gold ring — telegraphs the crit even from across the room.
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          this.particles.emit({
            x: e.pos.x, y: e.pos.y - 4,
            vx: Math.cos(a) * 140, vy: Math.sin(a) * 140,
            life: 0.26, maxLife: 0.26, size: 1.6, colour: '#ffe6a3', drag: 0.78,
          });
        }
      }
    } else {
      this.spawnDamageNumber(e.pos.x, e.pos.y - 10, `${dmg}`, '#ffd97a');
    }
    // Brief hit-pause on damage landing. Every hit gets a 2-frame
    // pause for "punch" feel; big hits get 4 frames. Avoid stacking
    // beyond timeAlive + 0.06 so multi-hits don't lock the world.
    const pauseDur = dmg >= 8 ? 0.05 : 0.025;
    this.hitPauseUntil = Math.min(
      this.timeAlive + 0.06,
      Math.max(this.hitPauseUntil, this.timeAlive + pauseDur),
    );
    if (!this.reducedParticles) {
      const accent = sphereForFloor(this.floor.number).accent;
      // Red gore sparkle — visceral "this enemy is wounded" cue.
      for (let i = 0; i < 4; i++) {
        this.particles.emit({
          x: e.pos.x, y: e.pos.y,
          vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80,
          life: 0.3, maxLife: 0.3, size: 1.5, colour: '#e23a4a', drag: 0.9,
        });
      }
      // Sphere-accent glint sparkles — every hit reads as belonging to
      // the current floor's hue, layered over the gore so the room
      // theme bleeds into combat feedback.
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 40;
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
            vx: perpX * side * (30 + Math.random() * 30) - nx * 10,
            vy: perpY * side * (30 + Math.random() * 30) - ny * 10,
            life: 0.32, maxLife: 0.32, size: 1.3, colour: accent, drag: 0.86,
          });
        }
      }
    }

    // Status application — roll once per hit per source.
    if (fromPlayer && opts?.appliesStatus && e.hp > 0) {
      const as = opts.appliesStatus;
      if (Math.random() < as.chance) {
        // Wormwood Vial — burn lasts 50 % longer and the stack cap
        // we enforce is +2 for this single applyStatusEffect path.
        let dur = as.duration;
        const isBurn = as.kind === 'burn';
        if (isBurn && this.player.relics.includes('wormwoodVial')) {
          dur = (dur ?? STATUS_CONFIG.burn.defaultDuration) * 1.5;
        }
        const newlyApplied = applyStatusEffect(e, as.kind, this.timeAlive, {
          duration: dur,
          magnitude: as.magnitude,
        });
        if (newlyApplied && !this.reducedParticles) {
          const cfg = STATUS_CONFIG[as.kind];
          this.particles.burst(e.pos.x, e.pos.y - 6, 8, {
            colour: cfg.colour, life: 0.5, maxLife: 0.5, drag: 0.86,
          });
        }
      }
    }

    // Combo bump — every player-source hit that did damage extends the chain.
    if (fromPlayer && canCrit) {
      this.bumpCombo();
    }
    return { isCrit, killed: e.hp <= 0 };
  }

  private bumpCombo(): void {
    if (this.timeAlive - this.comboLastHitT > GameEngine.COMBO_WINDOW) {
      this.comboCount = 1;
    } else {
      this.comboCount = Math.min(GameEngine.COMBO_MAX, this.comboCount + 1);
    }
    this.comboLastHitT = this.timeAlive;
    this.comboPulse = 0.4;
    // Tutorial: surface the combo prompt the first time the chain ticks
    // to 3 so a new player understands what the "×N" tag means.
    if (this.tutorialActive && !this.tutorialSawCombo && this.comboCount >= 3) {
      this.tutorialSawCombo = true;
      this.tutorialComboShownAt = this.timeAlive;
    }
  }

  private spawnCritDamageNumber(x: number, y: number, dmg: number): void {
    const id = nid();
    this.damageNumbers.push({
      id, x, y,
      vx: (Math.random() - 0.5) * 14,
      vy: -42 - Math.random() * 20,
      life: 1.1, maxLife: 1.1,
      value: dmg, colour: '#ffe9a3',
    });
    // Stamp the "CRIT" prefix via the side-channel text field, marked as crit
    // for bigger / brighter rendering in drawDamageNumbers.
    (this.damageNumbers[this.damageNumbers.length - 1] as DamageNumber & { text?: string; crit?: boolean })
      .text = `CRIT ${dmg}`;
    (this.damageNumbers[this.damageNumbers.length - 1] as DamageNumber & { text?: string; crit?: boolean })
      .crit = true;
  }

  /** DoT damage on the player — bypasses iframes and reduced armor. */
  private applyDotToPlayer(raw: number, source = 'dot'): void {
    const p = this.player;
    if (this.dead || raw <= 0) return;
    const reduced = absorbWithShield(p, raw);
    if (reduced <= 0) return;
    const dmg = Math.max(1, Math.round(reduced - p.armor * 0.5));
    p.hp -= dmg;
    p.flash = Math.max(p.flash, 0.08);
    this.lastDamageSource = source;
    this.spawnDamageNumber(p.pos.x + (Math.random() - 0.5) * 6, p.pos.y - 8, `${dmg}`, '#ff7a3a');
    // Audio feedback for stacking DoT — throttled to one play per
    // half-second so a 3-stack burn doesn't fire continuously.
    if (this.timeAlive - this.lastDotTickSfx > 0.5) {
      this.lastDotTickSfx = this.timeAlive;
      audio.sfx('dotTick');
    }
  }

  /** Attempt to parry an incoming hit. If the player is within the
   *  parry window of a dash, consume the hit, stun the source, and
   *  (for projectiles) reflect it. Returns true if the hit was eaten. */
  private tryParry(src: { kind: 'enemy'; enemy: Enemy } | { kind: 'projectile'; projectile: Projectile } | { kind: 'sigil' }): boolean {
    const p = this.player;
    if (this.dead) return false;
    if (p.dashTimer <= 0) return false;
    if (this.timeAlive - p.dashStartT > GameEngine.PARRY_WINDOW) return false;
    // Sigils are area effects — too forgiving to parry; skip.
    if (src.kind === 'sigil') return false;

    audio.sfx('shrine');
    if (!this.reducedParticles) {
      this.particles.burst(p.pos.x, p.pos.y - 4, 24, {
        colour: '#ffe6a3', life: 0.6, maxLife: 0.6, drag: 0.85,
      });
      // Bright white ring — every parry gets a satisfying flash.
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const sp = 130;
        this.particles.emit({
          x: p.pos.x, y: p.pos.y - 4,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.22, maxLife: 0.22, size: 1.4, colour: '#ffffff', drag: 0.8,
        });
      }
    }
    this.spawnDamageNumber(p.pos.x, p.pos.y - 14, 'PARRY', '#ffe6a3');
    p.iframes = Math.max(p.iframes, 0.3);
    this.camera.shakeT = Math.max(this.camera.shakeT, 0.22);
    this.camera.shakeMag = Math.max(this.camera.shakeMag, 3.5);

    // Saturn Ring extends parry stun and amps reflect damage.
    const ringMul = p.relics.includes('saturnRing') ? 2.0 : 1.0;
    if (src.kind === 'enemy') {
      // Stun the offender; small backward shove.
      applyStatusEffect(src.enemy, 'stun', this.timeAlive, { duration: 0.8 * ringMul });
      const dx = src.enemy.pos.x - p.pos.x;
      const dy = src.enemy.pos.y - p.pos.y;
      const len = Math.hypot(dx, dy) || 1;
      src.enemy.pos.x += (dx / len) * 12;
      src.enemy.pos.y += (dy / len) * 12;
    } else {
      // Reflect: flip ownership + invert velocity so it sails back.
      const pr = src.projectile;
      pr.fromPlayer = true;
      pr.vel.x *= -1.4;
      pr.vel.y *= -1.4;
      pr.colour = '#ffe6a3';
      pr.trailColour = '#f4d27a';
      pr.damage *= 1.5 * ringMul;
      // Sigil Mirror synergy — reflected projectiles plough through two
      // extra enemies, turning a defensive parry into a clear-the-room.
      if (this.hasSynergy('sigilMirror')) pr.pierce += 2;
    }

    // Combo gets a chunky bump on parry — the skill-expression reward.
    this.bumpCombo();
    this.bumpCombo();
    return true;
  }

  private damagePlayer(raw: number, source?: string): void {
    const p = this.player;
    if (p.iframes > 0 || this.dead) return;
    // Track who landed the hit so the Game Over screen can name them.
    // Overwritten on every successful damage application — the last
    // source before HP hits zero is the killer.
    if (source) this.lastDamageSource = source;
    // Shield absorbs first; if anything punches through, armor reduces it.
    const through = absorbWithShield(p, raw);
    if (through <= 0) {
      this.spawnDamageNumber(p.pos.x, p.pos.y - 8, 'SHIELD', '#6cf6e5');
      if (!this.reducedParticles) {
        this.particles.burst(p.pos.x, p.pos.y - 4, 10, {
          colour: '#6cf6e5', life: 0.4, maxLife: 0.4, drag: 0.86,
        });
      }
      return;
    }
    const dmg = Math.max(1, Math.round(through - p.armor));
    p.hp -= dmg;
    p.iframes = 0.7;
    p.flash = 0.15;
    // Hit-pause scales with damage — small chip hits stutter briefly,
    // big swings freeze the world for 0.10 s so the impact lands. Only
    // damaging hits trigger this; the 5-dmg floor stops DoT ticks from
    // perpetually freezing the frame.
    if (dmg >= 5) {
      this.hitPauseUntil = Math.max(this.hitPauseUntil, this.timeAlive + (dmg >= 12 ? 0.10 : 0.06));
    }
    // Camera shake scales with damage fraction — a 4 dmg chip is a 3 px
    // nudge, a 20 dmg slam yanks the camera 6 px.
    const dmgFrac = Math.min(1, dmg / Math.max(8, p.maxHp * 0.20));
    this.camera.shakeT = Math.max(this.camera.shakeT, 0.30 + dmgFrac * 0.25);
    this.camera.shakeMag = Math.max(this.camera.shakeMag, 3 + dmgFrac * 4);
    audio.sfx('playerHit');
    this.spawnDamageNumber(p.pos.x, p.pos.y - 8, `${dmg}`, '#e23a4a');
    // Visual response — sphere-tinted crimson burst at the player so
    // taking damage reads as an EVENT, not just a number popping. Mirror
    // of the damageEnemy burst on the inverse side of the exchange.
    if (!this.reducedParticles) {
      const accent = sphereForFloor(this.floor.number).accent;
      // Crimson gore — visceral
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 70 + Math.random() * 50;
        this.particles.emit({
          x: p.pos.x, y: p.pos.y - 4,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.35, maxLife: 0.35, size: 1.4, colour: '#e23a4a', drag: 0.88,
        });
      }
      // Sphere-accent glints layered over — the room theme bleeds in.
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 50 + Math.random() * 40;
        this.particles.emit({
          x: p.pos.x, y: p.pos.y - 4,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.32, maxLife: 0.32, size: 1.2, colour: accent, drag: 0.88,
        });
      }
      // Bright impact ring — small white pop so the hit reads instantly.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.particles.emit({
          x: p.pos.x, y: p.pos.y - 4,
          vx: Math.cos(a) * 100, vy: Math.sin(a) * 100,
          life: 0.18, maxLife: 0.18, size: 1.3, colour: '#ffffff', drag: 0.8,
        });
      }
    }
    // Damage breaks the combo chain.
    this.comboCount = 0;
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
        const prMeta = pr as Projectile & { appliesStatus?: AppliesStatus; healOnKill?: number };
        const prStatus = prMeta.appliesStatus;
        for (const e of this.enemies) {
          const d = Math.hypot(e.pos.x - pr.pos.x, e.pos.y - pr.pos.y);
          if (d < pr.radius + e.radius) {
            const r = this.damageEnemy(e, pr.damage, { x: pr.vel.x, y: pr.vel.y }, 90, {
              fromPlayer: true, appliesStatus: prStatus,
            });
            if (prMeta.healOnKill && r.killed) this.healPlayer(prMeta.healOnKill);
            if (this.player.relics.includes('pulseHeart') && r.isCrit) {
              this.healPlayer(this.hasSynergy('pulseCrown') ? 4 : 2);
              if (this.hasSynergy('pulseCrown') && Math.random() < 0.15) {
                this.pickups.push({
                  id: nid(),
                  pos: { x: e.pos.x, y: e.pos.y },
                  kind: 'hp', value: 12, life: 18,
                });
              }
            }
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
                  this.damageEnemy(e2, pr.damage * 0.6, { x: e2.pos.x - pr.pos.x, y: e2.pos.y - pr.pos.y }, 70, {
                    fromPlayer: true, appliesStatus: prStatus, canCrit: false,
                  });
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
          // Quicksilver Tongue — reflected bolts seek their target.
          if (this.hasSynergy('quicksilverTongue')) pr.homing = true;
          continue;
        }
        const d = Math.hypot(this.player.pos.x - pr.pos.x, this.player.pos.y - pr.pos.y);
        if (d < pr.radius + PLAYER_RADIUS) {
          // Mirror Sigil ward — while the buff is up and charges remain,
          // the next enemy bolt bounces back instead of damaging the
          // caster. One charge spent per intercept.
          const p = this.player;
          if (p.reflectCharges > 0 && this.timeAlive < p.reflectExpiresAt) {
            p.reflectCharges -= 1;
            pr.fromPlayer = true;
            pr.vel.x *= -1.4; pr.vel.y *= -1.4;
            pr.colour = '#cdf6ff';
            pr.trailColour = '#6cf6e5';
            pr.damage *= 2;
            this.spawnDamageNumber(p.pos.x, p.pos.y - 12, 'REFLECT', '#cdf6ff');
            if (!this.reducedParticles) {
              this.particles.burst(pr.pos.x, pr.pos.y, 10, {
                colour: '#cdf6ff', life: 0.4, maxLife: 0.4, drag: 0.86,
              });
            }
            continue;
          }
          if (this.tryParry({ kind: 'projectile', projectile: pr })) {
            // Reflected — leave the projectile in the world, now owned by the player.
            continue;
          }
          this.damagePlayer(pr.damage, 'projectile');
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
          const a = Math.random() * Math.PI * 2;
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
      case 'consumable': return '#a4faf0';
      default:        return '#f4d27a';
    }
  }

  private applyPickup(pk: Pickup): void {
    const p = this.player;
    const essBonus = 1 + this.meta.bonusEssenceGain;
    // Alchemical Mint — coins and essence both count toward a 12-pickup
    // tally; every twelfth spawns a random unowned relic next to the
    // player. Counter persists for the full run.
    if (this.hasSynergy('alchemicalMint') && (pk.kind === 'coin' || pk.kind === 'essence')) {
      p.pickupTally += 1;
      if (p.pickupTally >= 12) {
        p.pickupTally = 0;
        const pool = RELIC_IDS.filter((id) => !p.relics.includes(id));
        if (pool.length > 0) {
          const id = pool[Math.floor(Math.random() * pool.length)];
          this.pickups.push({
            id: nid(),
            pos: { x: p.pos.x + 14, y: p.pos.y - 6 },
            kind: 'relic', value: 0, relic: id, life: 24,
          });
          this.spawnDamageNumber(p.pos.x, p.pos.y - 18, 'MINT', '#ffe6a3');
        }
      }
    }
    switch (pk.kind) {
      case 'coin':
        // Inverse Midas — coins transmute to essence on the wind (3:1).
        if (p.relics.includes('midasInverse')) {
          const ess = Math.max(1, Math.round(pk.value / 3 * essBonus));
          p.essence += ess;
          this.summary.essenceCollected += ess;
          this.spawnDamageNumber(p.pos.x, p.pos.y - 8, `+${ess}✦`, '#9b6cff');
        } else {
          p.coins += pk.value;
          this.summary.coinsCollected += pk.value;
          if (pk.value >= 3) this.spawnDamageNumber(p.pos.x, p.pos.y - 8, `+${pk.value}`, '#f4d27a');
        }
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
      case 'consumable':
        if (pk.consumable) this.grantConsumable(pk.consumable);
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

  /** Tick + damage environmental hazards. Periodic kinds (blade /
   *  lightning) damage once per cycle when the player is inside;
   *  solar kind ticks damage every 0.5 s while overlap holds. */
  private updateHazards(dt: number): void {
    if (this.hazards.length === 0) return;
    const p = this.player;
    for (const h of this.hazards) {
      const wasActive = hazardIsActive(h);
      h.t += dt;
      if (h.t >= h.period) h.t -= h.period;
      const nowActive = hazardIsActive(h);
      const d = Math.hypot(p.pos.x - h.x, p.pos.y - h.y);
      const cfg = HAZARD_CONFIG[h.kind];
      const inside = d < h.radius + PLAYER_RADIUS;
      if (h.kind === 'solar') {
        // Continuous damage, throttled to 0.5 s ticks while inside.
        if (inside && this.timeAlive - h.lastTick > 0.5) {
          h.lastTick = this.timeAlive;
          this.applyDotToPlayer(h.damage);
          if (cfg.status === 'burn') {
            applyStatusEffect(this.player, 'burn', this.timeAlive, { duration: 1.5 });
          }
        }
      } else {
        // Periodic — damage on the transition into the active window.
        if (inside && !wasActive && nowActive) {
          this.damagePlayer(h.damage, `hazard:${h.kind}`);
          if (cfg.status === 'stun') {
            applyStatusEffect(this.player, 'stun', this.timeAlive, { duration: 0.4 });
          } else if (cfg.status === 'slow') {
            applyStatusEffect(this.player, 'slow', this.timeAlive, { duration: 1.2 });
          }
          // Sphere-accent burst on hit.
          if (!this.reducedParticles) {
            this.particles.burst(h.x, h.y, 14, {
              colour: cfg.colour, life: 0.4, maxLife: 0.4, drag: 0.86,
            });
          }
        }
        // Enemies inside an active strike also take small damage.
        if (!wasActive && nowActive) {
          for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const dd = Math.hypot(e.pos.x - h.x, e.pos.y - h.y);
            if (dd < h.radius + e.radius) {
              this.damageEnemy(e, h.damage * 0.5, { x: 0, y: 0 }, 0, {
                fromPlayer: false, canCrit: false,
              });
              if (e.hp <= 0) { this.killEnemy(e, i); }
            }
          }
        }
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
          const sStatus = (s as SigilHazard & { appliesStatus?: AppliesStatus }).appliesStatus;
          for (const e of this.enemies) {
            const d = Math.hypot(e.pos.x - s.pos.x, e.pos.y - s.pos.y);
            if (d < radius + e.radius) {
              this.damageEnemy(e, s.damage, { x: e.pos.x - s.pos.x, y: e.pos.y - s.pos.y }, 60, {
                fromPlayer: true, appliesStatus: sStatus,
              });
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
          if (hit) this.damagePlayer(s.damage, 'sigil');
        }
        this.particles.burst(s.pos.x, s.pos.y, 32, { colour, life: 0.8, maxLife: 0.8 });
        this.camera.shakeT = 0.2; this.camera.shakeMag = 2.5;
        audio.sfx(s.fromPlayer ? 'spell' : 'enemyHit');
      }
      if (s.timer > s.delay + 0.4) this.sigils.splice(i, 1);
    }
  }

  /** Tick orbiting familiars — move them around the player, fire
   *  homing bolts on their attack cadence, and despawn when life runs
   *  out. */
  private updateFamiliars(dt: number): void {
    if (this.familiars.length === 0) return;
    const p = this.player;
    for (let i = this.familiars.length - 1; i >= 0; i--) {
      const f = this.familiars[i];
      f.life -= dt;
      if (f.life <= 0) {
        if (!this.reducedParticles) {
          this.particles.burst(f.pos.x, f.pos.y, 12, {
            colour: SPELLS[f.spellId].projColour, life: 0.5, maxLife: 0.5, drag: 0.86,
          });
        }
        this.familiars.splice(i, 1);
        continue;
      }
      const sp = SPELLS[f.spellId];
      // Orbit motion — phase ticks at a steady rate independent of
      // movement speed; familiar position recomputed each frame.
      f.orbitPhase += dt * 2.4;
      f.pos.x = p.pos.x + Math.cos(f.orbitPhase) * f.orbitRadius;
      f.pos.y = p.pos.y - 4 + Math.sin(f.orbitPhase) * f.orbitRadius * 0.7;
      // Attack — target the nearest live enemy and loose a homing bolt
      // using the spell's damage profile.
      f.attackTimer -= dt;
      if (f.attackTimer <= 0) {
        f.attackTimer = sp.familiarAttackEvery ?? 0.7;
        let nearest: Enemy | null = null;
        let nearestD = Infinity;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const d = Math.hypot(e.pos.x - f.pos.x, e.pos.y - f.pos.y);
          if (d < nearestD) { nearestD = d; nearest = e; }
        }
        if (nearest && nearestD < 280) {
          const dx = nearest.pos.x - f.pos.x;
          const dy = nearest.pos.y - f.pos.y;
          const len = Math.hypot(dx, dy) || 1;
          const dmg = Math.max(1, Math.round(p.spellPower * p.damageMul * sp.damageMul));
          this.projectiles.push({
            id: nid(),
            pos: { x: f.pos.x, y: f.pos.y },
            vel: { x: (dx / len) * sp.speed, y: (dy / len) * sp.speed },
            life: sp.life,
            radius: sp.radius,
            damage: dmg,
            fromPlayer: true,
            pierce: sp.pierce,
            homing: true,
            colour: sp.projColour,
            trailColour: sp.trailColour,
          });
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
      const keyChance = this.hasSynergy('cartographersKey') ? 1.0 : 0.35;
      const useKey = !(this.player.relics.includes('keyOfTheGate') && Math.random() < keyChance);
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
    if (this.bossRushMode) {
      // Final Warden defeated — Boss Rush is over, fire the
      // game-over flow with a cleared flag so the host writes a
      // best-time. The summary uses ogdoadReached=false because the
      // mode skips the Eighth Sphere on purpose.
      if (this.floor.number >= 70) {
        this.bossRushFinish();
        return;
      }
      // Boss-to-boss — skip the seven intermediate floors per Warden.
      // Full heal between fights so each Warden is fresh combat.
      const p = this.player;
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      this.goToFloor(this.floor.number + 10);
    } else {
      this.goToFloor(this.floor.number + 1);
    }
  }

  /** End a successful Boss Rush — fire onGameOver with the cleared
   *  flag set so the host can persist the best time. Called when the
   *  player takes the stairs from floor 70 in boss-rush mode. */
  private bossRushFinish(): void {
    if (this.gameOverFired) return;
    this.gameOverFired = true;
    this.cbs.onGameOver({
      ...this.summary,
      bestFloor: Math.max(this.summary.bestFloor, this.summary.floorReached),
      runTimerSeconds: this.runTimer,
      bossRush: true,
      bossRushCleared: true,
    });
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
        try { a.fire(); } catch { /* never crash combat */ }
        this.delayedActions.splice(i, 1);
      }
    }
  }

  private drawDelayedActionTelegraphs(): void {
    for (const a of this.delayedActions) {
      if (!a.render) continue;
      const t01 = Math.min(1, a.t / a.duration);
      this.ctx.save();
      try { a.render(this.ctx, t01); } catch { /* skip */ }
      this.ctx.restore();
    }
  }

  // --- render -------------------------------------------------------------

  private render(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    ctx.imageSmoothingEnabled = false;

    // Aspect-fit (contain) — whole virtual viewport always visible.
    // Earlier we used aspect-fill, which on iPhone landscape (~2.17:1)
    // cropped 43 px of the 270 px-tall virtual frame and hid the top
    // and bottom doors. Side bars are filled with abyss-dark below so
    // the "letterbox" reads as part of the dungeon, not interface chrome.
    const sx = canvas.width / VIRTUAL_W;
    const sy = canvas.height / VIRTUAL_H;
    const scale = Math.max(1, Math.min(sx, sy));
    const offX = Math.floor((canvas.width - VIRTUAL_W * scale) / 2);
    const offY = Math.floor((canvas.height - VIRTUAL_H * scale) / 2);

    // Abyss-dark fill — covers any letterbox bars introduced by fit.
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

    // ─── Layer 1: lit scene ─────────────────────────────────────────
    // World geometry + enemies + pickups go down first. These are the
    // things that should be tinted by the dungeon's mood lighting.
    this.drawRoom();
    this.drawShrineDecor();
    this.drawChests();
    this.drawStairsIfExit();
    this.drawSigils();
    this.drawDelayedActionTelegraphs();
    this.drawHazards();
    this.drawPickups();
    this.drawEnemiesAll();

    // ─── Layer 2: dungeon lighting ──────────────────────────────────
    // Multiply tint + additive light pools applied to the lit-scene
    // layer ONLY. Foreground entities below (player, projectiles,
    // particles, damage numbers) are drawn AFTER this so they're
    // never washed out by the player's own lamp — that was the
    // "blinding glow" the player kept hitting.
    this.drawLighting();

    // ─── Layer 3: foreground entities ───────────────────────────────
    // The player + projectiles + particles + damage numbers + room-
    // clear effects render at full saturation regardless of room
    // lighting. The lamp light still emanates from the player (it was
    // painted by drawLighting), but the player sprite is no longer
    // OVERPAINTED by it.
    this.drawAura();
    this.drawPlayer();
    this.drawFamiliars();
    this.drawProjectiles();
    this.particles.draw(ctx);
    this.drawDamageNumbers();
    this.drawRoomClearEffects();

    // Time-stop visual — violet tint + tight central pulse during freeze
    if (this.timeAlive < this.timeStopUntil) {
      const left = this.timeStopUntil - this.timeAlive;
      const a = Math.min(1, left * 1.4); // brightest mid-effect, dims at end
      ctx.fillStyle = `rgba(91, 58, 134, ${0.18 * a})`;
      ctx.fillRect(0, 0, ROOM_W, ROOM_H);
      // Three thin diagonal "frozen" lines crossing the screen
      ctx.strokeStyle = `rgba(155, 108, 255, ${0.55 * a})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const off = i * 80;
        ctx.beginPath();
        ctx.moveTo(0, off);
        ctx.lineTo(ROOM_W, off + 200);
        ctx.stroke();
      }
    }

    ctx.restore();

    // Vignette — keeps the cinematic edge fall-off but softened so the
    // room corners (doors, hazards, pickups along the wall) stay
    // visible. Original 0.7 alpha killed visibility along the bottom
    // half of the screen on iPhone landscape; 0.45 keeps the mood
    // without obscuring playable space.
    const vg = ctx.createRadialGradient(VIRTUAL_W / 2, VIRTUAL_H / 2, VIRTUAL_H * 0.35, VIRTUAL_W / 2, VIRTUAL_H / 2, VIRTUAL_H * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    // Low-HP red vignette — pulses on top of the normal vignette when
    // the player drops below 25 % HP so the danger reads peripherally
    // even when the player is staring at the centre of the action.
    // Skipped during the death sequence so the crimson doesn't fight
    // the dark fade.
    if (!this.dead && this.player) {
      const hpFrac = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
      if (hpFrac < 0.25 && hpFrac > 0) {
        const danger = Math.min(1, (0.25 - hpFrac) / 0.25); // 0..1 as HP -> 0
        const pulse = 0.55 + 0.45 * Math.sin(this.timeAlive * 4.2);
        const a = 0.30 + 0.45 * danger * pulse;
        const rv = ctx.createRadialGradient(VIRTUAL_W / 2, VIRTUAL_H / 2, VIRTUAL_H * 0.20, VIRTUAL_W / 2, VIRTUAL_H / 2, VIRTUAL_H * 0.70);
        rv.addColorStop(0, 'rgba(226, 58, 74, 0)');
        rv.addColorStop(1, `rgba(226, 58, 74, ${a})`);
        ctx.fillStyle = rv;
        ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      }
    }

    // Crit white flash — one-frame full-screen overlay that decays in
    // ~0.08 s. Painted on top of the lighting + vignette so it reads as
    // a "shutter snap" of impact, not a fog.
    if (this.critFlashT > 0) {
      const a = Math.min(1, this.critFlashT / 0.08);
      ctx.fillStyle = `rgba(255, 247, 214, ${0.08 * a})`;
      ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    }

    // Death sequence — lamp extinguishes. Iris closes around the body
    // and the world drifts toward black so the GameOver screen lands
    // on a fully dark canvas.
    if (this.dyingT >= 0) {
      const t = Math.min(1, this.dyingT / this.dyingDuration);
      const darkness = Math.min(0.92, t * 0.95);
      ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
      ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    }

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
    // Per-sphere visual identity: walls' cap-stones and torch flame
    // colour shift toward the current sphere's accent. Cheap palette
    // pass; every floor reads as its own sphere at a glance.
    const sphere = sphereForFloor(this.floor.number);
    const wallTint = sphere.accent;
    const torchTint = makeTorchTint(sphere);
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
      drawWallTile(ctx, x, 0, TILE, true, wallTint);
      drawWallTile(ctx, x, ROOM_H - TILE, TILE, false, wallTint);
    }
    for (let y = TILE; y < ROOM_H - TILE; y += TILE) {
      drawWallTile(ctx, 0, y, TILE, false, wallTint);
      drawWallTile(ctx, ROOM_W - TILE, y, TILE, false, wallTint);
    }
    // Doors
    this.drawDoors();
    // Per-sphere decorative props — pillars / hourglasses / runes /
    // braziers / etc. Each sphere has its own kit of three prop kinds;
    // placement is deterministic on the room seed so a cleared room
    // looks the same when the player back-tracks through it. Props
    // never spawn in the centre play zone or in doorway corridors,
    // so they're purely visual identity without affecting combat.
    const props = this.currentRoomProps();
    drawProps(ctx, props, this.timeAlive);
    // Torches
    const torchT = this.timeAlive;
    for (let i = 1; i <= 4; i++) {
      const x = (ROOM_W / 5) * i;
      drawTorch(ctx, x - 2, 18, torchT + i * 0.5, torchTint);
    }
    // Boss decoration: seven lamps ringing the arena. Sphere-tinted —
    // the Warden's own sphere accent burns in each lamp, matching the
    // torches on the wall above.
    if (this.currentRoom.type === 'boss') {
      const cx = ROOM_W / 2, cy = ROOM_H / 2;
      const lampRgb = hexToRgbString(sphere.accent);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(a) * 110;
        const py = cy + Math.sin(a) * 80;
        ctx.fillStyle = '#3b265c';
        ctx.fillRect(px - 2, py, 4, 6);
        const flick = 0.6 + Math.sin(torchT * 4 + i) * 0.3;
        ctx.fillStyle = `rgba(${lampRgb}, ${flick})`;
        ctx.beginPath();
        ctx.arc(px, py - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
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

  /** Lazily compute the per-sphere prop placements for the current room.
   *  Recompute only when the room changes — same seed, same layout, so
   *  back-tracking through a cleared room shows the SAME prop pattern. */
  private currentRoomProps(): PropPlacement[] {
    if (this.roomPropsForRoomId !== this.currentRoom.id) {
      const sphere = sphereForFloor(this.floor.number).id;
      const room = this.currentRoom;
      const count = propCountFor(room.type, sphere, room.seed);
      // Tell the prop placer what's already in the room so the chosen
      // template (symmetric pair / corner cluster / wall line /
      // scatter) clears the pentagram halo + interactables + doorways.
      const hasPentagram = room.type === 'enemy' || room.type === 'miniBoss'
        || room.type === 'boss' || room.type === 'shrine';
      this.roomProps = placeProps(sphere, room.seed, count, {
        type: room.type,
        hasChest: room.hasChest,
        hasShrine: room.hasShrine,
        hasPentagram,
      });
      this.roomPropsForRoomId = room.id;
    }
    return this.roomProps;
  }

  private drawOccultCircle(cx: number, cy: number, r: number): void {
    const ctx = this.ctx;
    const t = this.timeAlive;
    // Use the current sphere's colour palette so the floor's pentagram
    // reads as part of THIS sphere, not the default Mercury-teal cosmos.
    const sphere = sphereForFloor(this.floor.number);
    const ringColour = hexToRgbString(sphere.colour);
    const accentColour = hexToRgbString(sphere.accent);
    ctx.save();
    // Faint halo behind the circle — sphere accent
    const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.4);
    halo.addColorStop(0, `rgba(${accentColour}, 0.08)`);
    halo.addColorStop(1, `rgba(${accentColour}, 0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(cx - r * 1.5, cy - r * 1.5, r * 3, r * 3);

    // Outer rotating ring of glyph marks — sphere ring colour
    ctx.strokeStyle = `rgba(${ringColour}, ${0.45 + Math.sin(t * 1.2) * 0.1})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // glyph ticks
    ctx.fillStyle = `rgba(${ringColour}, 0.55)`;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 0.18;
      const gx = cx + Math.cos(a) * r;
      const gy = cy + Math.sin(a) * r;
      ctx.fillRect(gx - 1, gy - 1, 2, 2);
    }

    // Inner ring
    ctx.strokeStyle = `rgba(${ringColour}, 0.35)`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Pentagram — sphere accent
    ctx.strokeStyle = `rgba(${accentColour}, ${0.55 + Math.sin(t * 2) * 0.15})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (((i * 2) % 5) / 5) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r * 0.92;
      const y = cy + Math.sin(a) * r * 0.92;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Centre rune — pulsing diamond (sphere ring colour)
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(${ringColour}, ${0.4 + pulse * 0.4})`;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
    ctx.fillStyle = `rgba(${accentColour}, ${pulse})`;
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
      // Selene tidal-pulse: render the safe shadow zone as a faint
      // teal "stay here" ring inside the damage band.
      if (s.safeRadius && s.safeRadius > 0) {
        ctx.strokeStyle = `rgba(108, 246, 229, ${0.55 + 0.35 * Math.sin(this.timeAlive * 4)})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, s.safeRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
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

  /** Render per-sphere environmental hazards. Each kind has its own
   *  silhouette + a danger-progress shading. The activeFrac slice
   *  shows a bright threat ring; the warmup phase is a faint pulse. */
  private drawHazards(): void {
    if (this.hazards.length === 0) return;
    const ctx = this.ctx;
    for (const h of this.hazards) {
      const cfg = HAZARD_CONFIG[h.kind];
      const active = hazardIsActive(h);
      const ap = active ? hazardActiveProgress(h) : 0;
      // Warmup pulse — a thin shimmering ring so the player can read
      // where the danger will erupt before it does.
      if (!active) {
        const warm = h.t / (h.period * (1 - h.activeFrac));
        ctx.strokeStyle = `rgba(255,255,255,${0.10 + 0.18 * warm})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Per-kind silhouette.
      switch (h.kind) {
        case 'blade': {
          // Spinning X — two crossed lines rotating fast. Brighter when
          // actively damaging.
          const t = this.timeAlive * (active ? 14 : 6);
          const len = h.radius * (active ? 1.0 : 0.7);
          ctx.save();
          ctx.translate(h.x, h.y);
          ctx.rotate(t);
          ctx.strokeStyle = active ? '#ffffff' : cfg.colour;
          ctx.lineWidth = active ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(-len, 0); ctx.lineTo(len, 0);
          ctx.moveTo(0, -len); ctx.lineTo(0, len);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'solar': {
          // Always-on heat well — pulsing core.
          const pulse = 0.7 + 0.3 * Math.sin(this.timeAlive * 4 + h.x);
          ctx.fillStyle = `rgba(255, 168, 64, ${0.18 * pulse})`;
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 230, 163, ${0.55 * pulse})`;
          ctx.beginPath();
          ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'lightning': {
          // Charge marker; brief bolt-flash when active.
          ctx.strokeStyle = `rgba(108, 246, 229, ${0.4 + 0.5 * (h.t / h.period)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
          ctx.stroke();
          if (active) {
            const flash = 1 - ap;
            ctx.strokeStyle = `rgba(255,255,255,${flash})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            // Stylised bolt — two zigzags.
            ctx.moveTo(h.x - 3, h.y - h.radius);
            ctx.lineTo(h.x + 2, h.y);
            ctx.lineTo(h.x - 2, h.y);
            ctx.lineTo(h.x + 3, h.y + h.radius);
            ctx.stroke();
            ctx.fillStyle = `rgba(164, 250, 240, ${0.25 * flash})`;
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'vine': {
          // Vine knot — small green hub with tendrils.
          ctx.fillStyle = active ? '#5f9050' : '#3a5a30';
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + this.timeAlive * 0.6;
            ctx.fillRect(
              h.x + Math.cos(a) * (h.radius - 3) - 1,
              h.y + Math.sin(a) * (h.radius - 3) - 1,
              2, 2,
            );
          }
          ctx.fillStyle = active ? '#7fd070' : '#5a8b50';
          ctx.fillRect(h.x - 2, h.y - 2, 5, 5);
          break;
        }
      }
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
        case 'consumable': {
          const cdef = pk.consumable ? CONSUMABLES[pk.consumable] : null;
          if (!cdef) break;
          // Small flask silhouette tinted to the consumable's colour, with
          // a soft halo. Reads as a pickup-able phial from across a room.
          const rgb = hexToRgbString(cdef.colour);
          const halo = ctx.createRadialGradient(pk.pos.x, pk.pos.y + wobble, 2, pk.pos.x, pk.pos.y + wobble, 14);
          halo.addColorStop(0, `rgba(${rgb}, 0.55)`);
          halo.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.fillStyle = halo;
          ctx.fillRect(pk.pos.x - 14, pk.pos.y - 14 + wobble, 28, 28);
          // Flask body
          ctx.fillStyle = '#1a0f2c';
          ctx.fillRect(pk.pos.x - 3, pk.pos.y - 3 + wobble, 6, 7);
          ctx.fillStyle = cdef.colour;
          ctx.fillRect(pk.pos.x - 2, pk.pos.y - 1 + wobble, 4, 4);
          // Bright stopper highlight
          ctx.fillStyle = '#ffe6a3';
          ctx.fillRect(pk.pos.x - 1, pk.pos.y - 4 + wobble, 2, 2);
          break;
        }
      }
    }
  }

  private drawEnemiesAll(): void {
    // Per-floor sphere accent — applied to non-boss enemies so each
    // floor's roster reads visually distinct even when sharing sprites.
    // Bosses skip the tint because their Warden palettes are already
    // sphere-keyed and we want them to "pop" against the room.
    const floorTint = sphereForFloor(this.floor.number).accent;
    for (const e of this.enemies) {
      const sz = getEnemySize(e.visualKey);
      const scale = 2;
      // 1 px walk bob — stationary frames hold steady, moving frames
      // lift one pixel on alternating steps. Bosses skip the bob since
      // their procedural motifs read their own animation.
      const bob = e.isBoss ? 0 : Math.floor(Math.abs(Math.sin(e.walkPhase)) * 1.5);
      const dx = e.pos.x - (sz.w * scale) / 2;
      const dy = e.pos.y - (sz.h * scale) + e.radius + 1 - bob;
      const tint = e.isBoss ? undefined : floorTint;
      // Umbral Stalker is half-visible unless actively damaged. Players
      // see a faint silhouette outline — readable but not bright.
      const stealth = e.type === 'umbralStalker' && e.flash <= 0;
      if (stealth) this.ctx.globalAlpha = 0.35;
      drawEnemy(this.ctx, e.visualKey, dx, dy, scale, e.flash, e.facing.x < 0, tint);
      if (stealth) this.ctx.globalAlpha = 1;
      // shadow
      this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
      this.ctx.fillRect(e.pos.x - e.radius, e.pos.y + e.radius - 1, e.radius * 2, 2);
      // Per-Warden procedural motif — drawn over the base sprite so each
      // sphere's boss has a unique silhouette even though they share the
      // same body matrix.
      if (e.isBoss) this.drawWardenMotif(e);
      // boss telegraph
      if (e.isBoss && e.cooldown < 0.5 && e.cooldown > 0) {
        this.ctx.fillStyle = `rgba(226, 58, 74, ${0.2 + 0.4 * Math.sin(this.timeAlive * 20)})`;
        this.ctx.fillRect(e.pos.x - e.width, e.pos.y - 16, e.width * 2, 2);
      }
      // non-boss telegraph — colour matches the enemy's own palette,
      // not a uniform orange. saturnKnight glows violet, mercuryImp teal,
      // saltGolem white-bone, etc.
      if (!e.isBoss && e.contactDamage > 6 && e.cooldown < 0.5 && e.cooldown > 0.1) {
        const pulse = 0.5 + 0.5 * Math.sin(this.timeAlive * 18);
        const col = enemyTelegraphColour(e.type);
        this.ctx.fillStyle = `rgba(${col}, ${0.18 + 0.22 * pulse})`;
        this.ctx.fillRect(e.pos.x - e.radius - 1, e.pos.y - e.radius - 1, (e.radius + 1) * 2, (e.radius + 1) * 2);
      }
      // Status-effect icons floating above the head — one tiny coloured
      // pip per kind. Stacked horizontally so the row reads at a glance.
      if (e.status.length > 0) {
        const headY = e.pos.y - e.height - 8;
        let ox = e.pos.x - (e.status.length * 5);
        for (const s of e.status) {
          this.drawStatusPip(ox, headY, s);
          ox += 6;
        }
      }
    }
    // Dissolving death effects — sprite expands and fades.
    for (const fx of this.deathFx) {
      const sz = getEnemySize(fx.visualKey);
      const scale = 2;
      const tNorm = Math.min(1, fx.t / fx.duration);
      const grow = 1 + tNorm * 0.5;
      const alpha = 1 - tNorm;
      const dx = fx.pos.x - (sz.w * scale) / 2;
      const dy = fx.pos.y - (sz.h * scale) + fx.radius + 1;
      // Centre on the sprite, scale, draw — the canvas transform handles
      // the growth around the centre point.
      const cx = fx.pos.x;
      const cy = dy + (sz.h * scale) / 2;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(cx, cy);
      this.ctx.scale(grow, grow);
      this.ctx.translate(-cx, -cy);
      drawEnemy(this.ctx, fx.visualKey, dx, dy, scale, 0.6 * (1 - tNorm), fx.facing.x < 0, fx.isBoss ? undefined : floorTint);
      this.ctx.restore();
    }
  }

  /** A tiny status-effect pip drawn above an entity's head. Solid colour
   *  square with a 1-px ring; stacks count rendered as a small notch on the
   *  bottom edge. Position is the centre of the pip. */
  private drawStatusPip(cx: number, cy: number, s: StatusEffect): void {
    const cfg = STATUS_CONFIG[s.kind];
    const ctx = this.ctx;
    // Subtle pulse — every status throbs to read "this is active."
    const pulse = 0.7 + 0.3 * Math.sin(this.timeAlive * 7 + s.kind.charCodeAt(0));
    ctx.fillStyle = cfg.colour;
    ctx.globalAlpha = pulse;
    ctx.fillRect(cx - 2, cy - 2, 5, 5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(cx - 2, cy - 2, 5, 1);
    ctx.fillRect(cx - 2, cy + 2, 5, 1);
    ctx.fillRect(cx - 2, cy - 2, 1, 5);
    ctx.fillRect(cx + 2, cy - 2, 1, 5);
    // Stack-count notch (burn / poison go up to 3-4 stacks).
    if (s.stacks > 1) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 1, cy + 3, s.stacks, 1);
    }
  }

  /** Paints a soft radial gradient stop centred at (x,y) using the
   * canvas's current composite operation. Used by drawLighting to add
   * additive light wells over the multiplied darkness. */
  private paintLight(x: number, y: number, r: number, rgb: string, alpha: number): void {
    const g = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  private drawLighting(): void {
    const ctx = this.ctx;
    const sphere = sphereForFloor(this.floor.number);
    const sphereRgb = hexToRgbString(sphere.accent);
    const t = this.timeAlive;
    const flick = (seed: number): number => 0.86 + 0.14 * Math.sin(t * 6 + seed * 1.7);

    // Multiply layer — a SOFT mood tint, not a darkness pass. After two
    // rounds of player complaints about "blinding glow", this layer no
    // longer crushes the floor's brightness. The room reads as a lit
    // dungeon with a faint cool tint; the light pools below add tiny
    // localised warmth at torches / pickups, not big white halos.
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(215, 200, 230)';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    ctx.restore();

    // Light pools — small + tight + low alpha. Screen-blend so overlaps
    // never clip. The goal is "this torch is lit; that pickup glows" —
    // NOT "the room is dramatically lit." The vignette below carries
    // the atmosphere; lights are accents, not the lighting.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Wall torches — tiny flame halos. Just enough to read as lit.
    for (let i = 1; i <= 4; i++) {
      const lx = (ROOM_W / 5) * i;
      const ly = 28;
      const f = flick(i);
      this.paintLight(lx, ly, 42, '255, 215, 150', 0.22 * f);
    }

    // Player lamp — removed as a bright pool. The player sprite is now
    // drawn AFTER the lighting layer (layer 3), so the player is always
    // visible. A faint warm halo just under the feet keeps the
    // "carrying a lamp" feel without flooding the floor with white.
    if (this.dyingT < 0) {
      const p = this.player;
      this.paintLight(p.pos.x, p.pos.y - 6, 38, '255, 230, 175', 0.16);
      // Cosmetic: Lamp Aura — sphere-tinted accent. Subtle.
      if (this.meta.cosmeticLampAura) {
        const sphereAccentRgb = hexToRgbString(sphereForFloor(this.floor.number).accent);
        const breathe = 0.7 + 0.3 * Math.sin(this.timeAlive * 1.8);
        this.paintLight(p.pos.x, p.pos.y - 6, 56, sphereAccentRgb, 0.10 * breathe);
      }
    }

    // Unopened chests — a small mark, not a glow zone.
    const room = this.currentRoom;
    if (room.hasChest && !room.chestOpened) {
      this.paintLight(ROOM_W / 2, ROOM_H / 2, 22, '244, 210, 122', 0.16);
    }

    // Pickups — each kind gets its own micro-glow. Very subtle now.
    for (const pk of this.pickups) {
      switch (pk.kind) {
        case 'coin':    this.paintLight(pk.pos.x, pk.pos.y, 14, '244, 210, 122', 0.22); break;
        case 'essence': this.paintLight(pk.pos.x, pk.pos.y, 14, '155, 108, 255', 0.22); break;
        case 'hp':      this.paintLight(pk.pos.x, pk.pos.y, 16, '255, 122, 138', 0.24); break;
        case 'mp':      this.paintLight(pk.pos.x, pk.pos.y, 16, '155, 108, 255', 0.24); break;
        case 'key':     this.paintLight(pk.pos.x, pk.pos.y, 16, '108, 246, 229', 0.24); break;
        case 'relic':   this.paintLight(pk.pos.x, pk.pos.y, 26, '244, 210, 122', 0.32); break;
        case 'weapon':  this.paintLight(pk.pos.x, pk.pos.y, 22, '244, 210, 122', 0.24); break;
        case 'spell':   this.paintLight(pk.pos.x, pk.pos.y, 22, '155, 108, 255', 0.24); break;
        case 'consumable': {
          const cdef = pk.consumable ? CONSUMABLES[pk.consumable] : null;
          if (cdef) this.paintLight(pk.pos.x, pk.pos.y, 18, hexToRgbString(cdef.colour), 0.28);
          break;
        }
      }
    }

    // Boss arena — keep the seven lamps as accent, but small.
    if (this.currentRoom.type === 'boss') {
      const cx = ROOM_W / 2, cy = ROOM_H / 2;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
        const lx = cx + Math.cos(a) * 110;
        const ly = cy + Math.sin(a) * 80;
        this.paintLight(lx, ly, 36, sphereRgb, 0.18 * flick(i * 3));
      }
    }

    // Shrine glow — a small pulsing accent at the altar.
    if (this.currentRoom.hasShrine && !this.currentRoom.shrineUsed) {
      const pulse = 0.85 + 0.15 * Math.sin(t * 3);
      this.paintLight(ROOM_W / 2, ROOM_H / 2 + 8, 28, '244, 210, 122', 0.16 * pulse);
    }

    // Spell projectiles — small tracer light per active bolt.
    for (const pr of this.projectiles) {
      if (!pr.fromPlayer) continue;
      const rgb = hexToRgbString(pr.colour);
      this.paintLight(pr.pos.x, pr.pos.y, 14, rgb, 0.20);
    }

    ctx.restore();
  }

  private drawDashTrail(): void {
    if (this.dashTrail.length === 0) return;
    // Tint the dash echo with the currently-equipped weapon's swing
    // colour — a Hermit dashing past with an Ashen Greatsword leaves a
    // red echo, an Initiate of the Crystallized Tear leaves cyan.
    // Previously every trail was bone-white regardless of loadout, which
    // erased the visual identity of the swap.
    const weaponColour = WEAPONS[this.player.weapons[this.player.weaponIdx]]?.swingColour ?? '#ffffff';
    for (const g of this.dashTrail) {
      const tNorm = Math.min(1, g.t / 0.28);
      const alpha = (1 - tNorm) * 0.55;
      if (alpha <= 0.02) continue;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      // Ghost renders fully whited-out so the trail reads as a motion
      // echo rather than a duplicate body. flash = 1 forces drawInitiate
      // to override every visible palette entry with white.
      drawInitiate(this.ctx, g.x - 7, g.y - 15, 1, g.facing, g.walkPhase, 1);
      // Lay the weapon swing colour on top of the white silhouette with
      // a low-opacity tint. source-atop keeps the alpha shape of the
      // existing pixels so the tint follows the sprite outline.
      this.ctx.globalCompositeOperation = 'source-atop';
      this.ctx.globalAlpha = alpha * 0.7;
      this.ctx.fillStyle = weaponColour;
      this.ctx.fillRect(g.x - 8, g.y - 16, 16, 18);
      this.ctx.restore();
    }
  }

  private drawPlayer(): void {
    const p = this.player;
    // Dash afterimages — drawn first so the live sprite sits on top.
    this.drawDashTrail();
    // Dash cooldown ring under the feet. Reads as a cyan halo when
    // ready; shrinks to nothing while on cooldown.
    if (!this.dead && p.dashCdMax > 0) {
      const ready = 1 - Math.min(1, p.dashCooldown / p.dashCdMax);
      if (ready > 0.001) {
        const ctx = this.ctx;
        ctx.strokeStyle = ready >= 0.999 ? 'rgba(108, 246, 229, 0.55)' : 'rgba(108, 246, 229, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y + 5, 7 * ready + 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Death sequence: fade + collapse the sprite so the body
    // "extinguishes" in place. After the final pop (~82 % through) the
    // sprite hides entirely so the embers carry the moment.
    if (this.dyingT >= 0) {
      const t = Math.min(1, this.dyingT / this.dyingDuration);
      if (t >= 0.82) return;
      const alpha = 1 - t / 0.82;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      // shadow (faded with the body)
      this.ctx.fillStyle = 'rgba(0,0,0,0.45)';
      this.ctx.fillRect(p.pos.x - 6, p.pos.y + 3, 12, 2);
      // Sprite slumps down ~3 px and a faint white flash overlays.
      const slump = Math.round(t * 3);
      drawInitiate(this.ctx, p.pos.x - 7, p.pos.y - 15 + slump, 1, p.facing, 0, Math.min(0.4, t));
      this.ctx.restore();
      // Soft halo around the dying body
      if (!this.reducedParticles) {
        const r = 14 + t * 18;
        const accent = sphereForFloor(this.floor.number).accent;
        this.ctx.save();
        this.ctx.globalAlpha = (1 - t) * 0.35;
        this.ctx.strokeStyle = accent;
        this.ctx.lineWidth = 1.4;
        this.ctx.beginPath();
        this.ctx.arc(p.pos.x, p.pos.y - 4, r, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
      return;
    }
    // shadow
    this.ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this.ctx.fillRect(p.pos.x - 6, p.pos.y + 3, 12, 2);
    drawInitiate(this.ctx, p.pos.x - 7, p.pos.y - 15, 1, p.facing, p.walkPhase, p.flash);
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
    // Grip + crossguard are the shared chassis — every weapon has them.
    ctx.fillStyle = w.hiltColour;
    ctx.fillRect(-3, -1, 4, 2);
    ctx.fillStyle = w.accentColour;
    ctx.fillRect(0, -2, 2, 5);
    // Blade shape branches per weapon id so the wielded sprite reads
    // as "axe" / "trident" / "sickle" rather than a generic rectangle.
    switch (w.id) {
      case 'boneCleaver':
      case 'sunDisc':
        // Wide-head axe / disc — body taper, then a broad head at the tip.
        ctx.fillStyle = '#04020a';
        ctx.fillRect(1, -2, len * 0.55, 4);
        ctx.fillRect(len * 0.55, -Math.ceil(th / 2) - 2, len * 0.45 + 2, th + 4);
        ctx.fillStyle = w.bladeColour;
        ctx.fillRect(2, -1, len * 0.55 - 1, 2);
        ctx.fillRect(len * 0.55 + 1, -Math.floor(th / 2) - 1, len * 0.45 - 1, th + 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(2, -1, len * 0.55 - 1, 1);
        ctx.fillStyle = w.accentColour;
        ctx.fillRect(len - 2, -Math.floor(th / 2), 2, 1);
        break;
      case 'ashenGreatsword':
        // Thicker blade body with a notched tip — reads as massive.
        ctx.fillStyle = '#04020a';
        ctx.fillRect(1, -Math.ceil(th / 2) - 2, len + 2, th + 4);
        ctx.fillStyle = w.bladeColour;
        ctx.fillRect(2, -Math.floor(th / 2) - 1, len - 1, th + 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(2, -Math.floor(th / 2) - 1, len - 2, 1);
        ctx.fillStyle = w.accentColour;
        // Fuller groove down the centre.
        ctx.fillRect(4, 0, len - 6, 1);
        break;
      case 'tridentOfBrass':
        // Three prongs at the tip — main central blade flanked by two
        // shorter side spikes.
        ctx.fillStyle = '#04020a';
        ctx.fillRect(1, -1, len + 1, 3);
        ctx.fillStyle = w.bladeColour;
        ctx.fillRect(2, 0, len - 1, 1);
        // Side prongs.
        ctx.fillRect(len - 5, -3, 2, 3);
        ctx.fillRect(len - 5, 1, 2, 3);
        ctx.fillStyle = w.accentColour;
        ctx.fillRect(len - 2, -1, 2, 3);
        break;
      case 'ironHalberd':
        // Long shaft + axe-head perpendicular near the tip.
        ctx.fillStyle = '#04020a';
        ctx.fillRect(1, 0, len + 1, 2);
        ctx.fillRect(len - 7, -4, 5, 6);
        ctx.fillStyle = w.bladeColour;
        ctx.fillRect(2, 0, len - 1, 1);
        ctx.fillRect(len - 6, -3, 3, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(len - 6, -3, 3, 1);
        ctx.fillStyle = w.accentColour;
        ctx.fillRect(len - 2, 0, 2, 1);
        break;
      case 'twinSickles':
        // Curved scimitar-like blade — wider toward the tip, slight hook.
        ctx.fillStyle = '#04020a';
        ctx.fillRect(1, -2, len * 0.7, 3);
        ctx.fillRect(len * 0.7, -3, len * 0.3 + 1, 4);
        ctx.fillStyle = w.bladeColour;
        ctx.fillRect(2, -1, len * 0.7 - 1, 2);
        ctx.fillRect(len * 0.7 + 1, -2, len * 0.3 - 1, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(2, -1, len - 2, 1);
        break;
      case 'serpentCoil':
        // Segmented whip — alternating bands along the length.
        ctx.fillStyle = '#04020a';
        ctx.fillRect(1, -1, len + 1, 3);
        ctx.fillStyle = w.bladeColour;
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(2 + i * 4, 0, 3, 1);
        }
        ctx.fillStyle = w.accentColour;
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(2 + i * 4 + 3, 0, 1, 1);
        }
        break;
      case 'ironHook':
        // Slim shaft + barbed hook at the tip pointing back.
        ctx.fillStyle = '#04020a';
        ctx.fillRect(1, 0, len + 1, 2);
        ctx.fillRect(len - 4, -3, 3, 2);
        ctx.fillStyle = w.bladeColour;
        ctx.fillRect(2, 0, len - 1, 1);
        ctx.fillRect(len - 3, -2, 2, 1);
        ctx.fillStyle = w.accentColour;
        ctx.fillRect(len - 2, -2, 1, 3);
        break;
      case 'crystallizedTear':
        // Diamond-shaped frozen blade — widest at the centre, tapers.
        ctx.fillStyle = '#04020a';
        for (let i = 0; i < len; i++) {
          const half = Math.round(((1 - Math.abs((i / len) - 0.5) * 2) * th * 0.7) + 0.5);
          ctx.fillRect(2 + i, -half, 1, half * 2 + 1);
        }
        ctx.fillStyle = w.bladeColour;
        for (let i = 0; i < len; i++) {
          const half = Math.max(0, Math.round(((1 - Math.abs((i / len) - 0.5) * 2) * th * 0.7) - 0.5));
          ctx.fillRect(2 + i, -half, 1, half * 2 + 1);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(2 + Math.floor(len * 0.4), 0, Math.ceil(len * 0.2), 1);
        break;
      default:
        // Generic blade — used by tarnishedDagger and any future weapon.
        ctx.fillStyle = '#04020a';
        ctx.fillRect(1, -Math.ceil(th / 2) - 1, len + 1, th + 2);
        ctx.fillStyle = w.bladeColour;
        ctx.fillRect(2, -Math.floor(th / 2), len - 1, th);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(2, -Math.floor(th / 2), len - 2, 1);
        ctx.fillStyle = w.accentColour;
        ctx.fillRect(len - 3, 0, 2, 1);
        break;
    }
    // Glow halo during animation — every weapon picks up the swing colour.
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

  /** Pulse a soft ring around the player while an aura spell is up.
   *  Width breathes with timeAlive so the player can tell the effect
   *  is live (vs. just lingering particles). */
  private drawAura(): void {
    const p = this.player;
    if (!p.auraSpellId) return;
    if (this.timeAlive >= p.auraExpiresAt) return;
    const sp = SPELLS[p.auraSpellId];
    if (!sp) return;
    const ctx = this.ctx;
    const rgb = hexToRgbString(sp.projColour);
    const t = this.timeAlive;
    const breathe = 0.85 + Math.sin(t * 6) * 0.15;
    const r = sp.radius * breathe;
    // Outer stroke
    ctx.save();
    ctx.strokeStyle = `rgba(${rgb}, 0.55)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y - 4, r, 0, Math.PI * 2);
    ctx.stroke();
    // Soft inner fill
    const g = ctx.createRadialGradient(p.pos.x, p.pos.y - 4, r * 0.5, p.pos.x, p.pos.y - 4, r);
    g.addColorStop(0, `rgba(${rgb}, 0)`);
    g.addColorStop(1, `rgba(${rgb}, 0.22)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y - 4, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Render the orbiting familiars — a small skull-like silhouette
   *  with a violet halo. Trails a faint sparkle as it orbits. */
  private drawFamiliars(): void {
    if (this.familiars.length === 0) return;
    const ctx = this.ctx;
    for (const f of this.familiars) {
      const sp = SPELLS[f.spellId];
      const rgb = hexToRgbString(sp.projColour);
      // Halo
      const halo = ctx.createRadialGradient(f.pos.x, f.pos.y, 1, f.pos.x, f.pos.y, 10);
      halo.addColorStop(0, `rgba(${rgb}, 0.55)`);
      halo.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(f.pos.x - 10, f.pos.y - 10, 20, 20);
      // Skull body
      ctx.fillStyle = '#dac8ff';
      ctx.fillRect(f.pos.x - 3, f.pos.y - 3, 6, 5);
      ctx.fillStyle = '#1a0f2c';
      ctx.fillRect(f.pos.x - 2, f.pos.y - 2, 1, 2);
      ctx.fillRect(f.pos.x + 1, f.pos.y - 2, 1, 2);
      ctx.fillRect(f.pos.x - 1, f.pos.y + 1, 2, 1);
      // Faint sparkle trail
      if (!this.reducedParticles && Math.random() < 0.4) {
        this.particles.emit({
          x: f.pos.x, y: f.pos.y,
          vx: (Math.random() - 0.5) * 12, vy: 10 + Math.random() * 6,
          life: 0.4, maxLife: 0.4, size: 1.0, colour: sp.projColour, drag: 0.92,
        });
      }
    }
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
      const isCrit = !!(d as DamageNumber & { crit?: boolean }).crit;
      const big = text.startsWith('-') || /^\d+$/.test(text);
      // Crit text is ~40 % larger so it pops above the regular shower.
      const baseSize = isCrit ? 15 : (big ? 11 : 9);
      ctx.font = `bold ${Math.round(baseSize * scale)}px "Iowan Old Style","Georgia",serif`;
      ctx.globalAlpha = a;
      // Crit gets a warm gold glow behind the body — drawn before the
      // black halo so the order is: glow → shadow → text.
      if (isCrit) {
        ctx.shadowColor = 'rgba(255, 217, 122, 0.95)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(255, 247, 214, 0.55)';
        ctx.fillText(text, Math.round(d.x), Math.round(d.y));
        ctx.shadowBlur = 0;
      }
      // soft halo
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillText(text, Math.round(d.x) + 1, Math.round(d.y) + 1);
      ctx.fillText(text, Math.round(d.x) - 1, Math.round(d.y) + 1);
      ctx.fillText(text, Math.round(d.x) + 1, Math.round(d.y) - 1);
      ctx.fillText(text, Math.round(d.x) - 1, Math.round(d.y) - 1);
      ctx.fillStyle = isCrit ? '#fff7d6' : d.colour;
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
    // Prompts use the same ranges tryInteract opens at, so the HUD
    // hint appears exactly when pressing interact will do something.
    if (room.type === 'exit' && this.isNearCenter(p.pos)) prompts.push('Press Interact to descend');
    if (room.hasChest && !room.chestOpened) {
      const d = dist(p.pos, { x: ROOM_W / 2, y: ROOM_H / 2 + 4 });
      if (d < 36) prompts.push(room.chestLocked ? `Locked chest — keys: ${p.keys}` : 'Press Interact to open');
    }
    if (room.hasShrine && !room.shrineUsed) {
      const d = dist(p.pos, { x: ROOM_W / 2, y: ROOM_H / 2 - 8 });
      if (d < 34) prompts.push('Press Interact to commune');
    }
    // Nearby weapon / spell / relic pickup — surface a stat preview so
    // the player can decide whether to swap before stepping on it.
    // Magnet pulls coins / essence / hp / mp automatically; we only
    // gate on the items that REPLACE current equipment.
    for (const pk of this.pickups) {
      if (pk.kind !== 'weapon' && pk.kind !== 'spell' && pk.kind !== 'relic' && pk.kind !== 'consumable') continue;
      const d = dist(p.pos, pk.pos);
      if (d > 36) continue;
      if (pk.kind === 'weapon' && pk.weapon) {
        const w = WEAPONS[pk.weapon];
        const dmg = Math.round(p.attack * p.damageMul * w.damageMul);
        const rate = (1 / Math.max(0.01, w.cooldown)).toFixed(1);
        const status = w.appliesStatus ? `· ${w.appliesStatus.kind}` : '';
        prompts.push(`${w.name} — ${dmg} dmg · ${rate}/s · ${w.swingType} ${status}`);
      } else if (pk.kind === 'spell' && pk.spell) {
        const sp = SPELLS[pk.spell];
        const dmg = Math.round(p.spellPower * p.damageMul * sp.damageMul);
        const status = sp.appliesStatus ? `· ${sp.appliesStatus.kind}` : '';
        prompts.push(`${sp.name} — ${dmg} dmg · ${sp.manaCost} MP ${status}`);
      } else if (pk.kind === 'relic' && pk.relic) {
        const r = RELICS[pk.relic];
        prompts.push(`${r.name} — ${r.description}`);
      } else if (pk.kind === 'consumable' && pk.consumable) {
        const c = CONSUMABLES[pk.consumable];
        prompts.push(`${c.name} — ${c.description}`);
      }
      break; // one tooltip at a time even if multiple pickups overlap
    }

    // Brass Ear relic — reveals every room on the minimap. (Still requires
    // physical traversal to enter them; this only lifts the fog.)
    const revealAll = p.relics.includes('brassEar');
    const roomCells = this.floor.rooms.map((r) => ({
      gx: r.grid.x,
      gy: r.grid.y,
      type: r.type as RoomType,
      discovered: revealAll || r.discovered,
      current: r.id === this.currentRoom.id,
      // Surface chest / shrine state so the minimap can hint at
      // unfinished content in already-visited rooms.
      chestIntact: r.hasChest && !r.chestOpened && (revealAll || r.discovered),
      shrineIntact: r.hasShrine && !r.shrineUsed && (revealAll || r.discovered),
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
      controllerActive: this.input.hasControllerBeenUsed(),
      hint,
      rooms: roomCells,
      pendingShrine: this.pendingShrine ? {
        name: this.pendingShrine.name,
        effect: this.pendingShrine.effect,
        downside: this.pendingShrine.downside,
      } : undefined,
      combo: this.comboCount,
      comboPulse: this.comboPulse,
      playerStatus: p.status.map((s) => ({ kind: s.kind, remaining: s.remaining, stacks: s.stacks })),
      runTimer: this.runTimer,
      dashCooldown: p.dashCooldown,
      dashCooldownMax: p.dashCdMax || 1,
      tutorialPrompts: this.computeTutorialPrompts(),
      consumables: p.consumables.map((c) => ({ id: c.id, count: c.count })),
      consumableIdx: p.consumableIdx,
      freeNextSpell: p.freeNextSpell,
      synergies: p.synergies.slice(),
      ultimateCd: p.ultimateCd,
      ultimateCdMax: p.ultimateCdMax || 1,
      ultimateName: this.archetype.ultimate.name,
      ultimateGlyph: this.archetype.ultimate.glyph,
      ultimateColour: this.archetype.ultimate.colour,
      reflectCharges: this.timeAlive < p.reflectExpiresAt ? p.reflectCharges : 0,
      alive: !this.dead,
    });
  }

  private computeTutorialPrompts(): string[] {
    if (!this.tutorialActive) return [];
    // Per-input prompt vocab so a touch player never gets "Press J" — the
    // game shows the controls they actually have. InputManager.getMethod
    // updates as soon as a touch / key / pad input fires, so the prompts
    // re-tag in-place if a player swaps from one input to another.
    const method = this.input.getMethod();
    const labels = (() => {
      switch (method) {
        case 'touch': return {
          move: 'Drag the joystick to move',
          attack: 'Tap ATTACK to strike',
          dash: 'Tap DASH to roll',
          spell: 'Tap SPELL to cast',
          interact: 'Tap USE to interact',
        };
        case 'controller': return {
          move: 'Use the left stick to move',
          attack: 'Press A / X to strike',
          dash: 'Press B / O to dash',
          spell: 'Press X / □ for a spell',
          interact: 'Press Y / △ to interact',
        };
        default: return {
          move: 'Hold WASD or arrows to move',
          attack: 'Press J to strike',
          dash: 'Press Space to dash',
          spell: 'Press L for a spell',
          interact: 'Press E to interact',
        };
      }
    })();
    const out: string[] = [];
    // Phase 1 — the three movement / combat fundamentals.
    if (!this.tutorialDidMove)   out.push(labels.move);
    if (!this.tutorialDidAttack) out.push(labels.attack);
    if (!this.tutorialDidDash)   out.push(labels.dash);
    // Phase 2 — only after the basics are done. Spell prompt fires once
    // the player has been swinging for a moment, so they discover MP.
    const basicsDone = this.tutorialDidMove && this.tutorialDidAttack && this.tutorialDidDash;
    if (basicsDone && !this.tutorialDidSpell) out.push(labels.spell);
    // Interact prompt — gate on entering a room with a chest, shrine
    // or stairs so we only mention it when it matters.
    const room = this.currentRoom;
    const hasInteractable = room && (
      (room.hasChest && !room.chestOpened) ||
      (room.hasShrine && !room.shrineUsed) ||
      room.type === 'exit'
    );
    if (basicsDone && !this.tutorialDidInteract && hasInteractable) {
      out.push(labels.interact);
    }
    // Combo prompt — surfaces the first time the ×N tag actually
    // appears, holds for ~4 s, then fades.
    if (this.tutorialSawCombo && this.timeAlive - this.tutorialComboShownAt < 4) {
      out.push('Combo — chain hits for bonus damage');
    }
    return out;
  }

  private computeHint(): string | undefined {
    if (this.floor.number === 1 && !this.currentRoom.visited) return 'WASD or Stick — Move. J / A — Attack. L / X — Spell.';
    return undefined;
  }

  // --- public test hook ---------------------------------------------------

  getSummary(): RunSummary { return this.summary; }
}
