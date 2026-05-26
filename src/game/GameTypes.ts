import { GamepadMap } from './input/controlMappings';

export type ArchetypeId = 'magus' | 'hermit' | 'star';

export interface ArchetypeDef {
  id: ArchetypeId;
  name: string;
  subtitle: string;
  description: string;
  startingRelic: RelicId;
  stats: {
    maxHp: number;
    maxMp: number;
    attack: number;
    spellPower: number;
    speed: number;
    armor: number;
    luck: number;
    dashCooldown: number;
    manaRegen: number; // per second
  };
}

export type RelicId =
  | 'emeraldTablet'
  | 'blackSalt'
  | 'crownSpark'
  | 'serpentWand'
  | 'lunarMirror'
  | 'solarCoin'
  | 'saturnSeal'
  | 'mercurySandals'
  | 'roseCross'
  | 'sulfurHeart'
  | 'chaliceOfLuna'
  | 'keyOfTheGate';

export interface RelicDef {
  id: RelicId;
  name: string;
  glyph: string;
  description: string;
}

export type WeaponId =
  | 'tarnishedDagger'
  | 'boneCleaver'
  | 'ironHalberd'
  | 'twinSickles'
  | 'ashenGreatsword';

export type WeaponSwingType = 'thrust' | 'arc' | 'lunge' | 'flurry' | 'overhead';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  glyph: string;
  description: string;
  swingType: WeaponSwingType;
  damageMul: number;
  cooldown: number;
  duration: number;
  range: number;
  arcHalf: number;
  knockback: number;
  hits: number;
  // visual
  swingColour: string;
  hiltColour: string;
  bladeColour: string;
  accentColour: string;
  length: number;
  thickness: number;
}

export type SpellId =
  | 'sparkBolt'
  | 'frostLance'
  | 'hellfireOrb'
  | 'thunderSigil';

export type SpellKind = 'singleProjectile' | 'spread' | 'sigil';
export type SpellVisual = 'orb' | 'shard' | 'flame' | 'sigil';

export interface SpellDef {
  id: SpellId;
  name: string;
  glyph: string;
  description: string;
  kind: SpellKind;
  manaCost: number;
  cooldown: number;
  damageMul: number;
  projCount: number;
  spreadHalf: number;
  speed: number;
  radius: number;
  life: number;
  pierce: number;
  seeking: boolean;
  explodeRadius: number;
  sigilDelay?: number;
  sigilRange?: number;
  projColour: string;
  trailColour: string;
  projVisual: SpellVisual;
}

export type RoomType =
  | 'start'
  | 'enemy'
  | 'treasure'
  | 'shrine'
  | 'locked'
  | 'exit'
  | 'miniBoss'
  | 'boss';

export interface RoomGrid {
  x: number;
  y: number;
}

export interface RoomDoorState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface Room {
  id: number;
  grid: RoomGrid;
  type: RoomType;
  doors: RoomDoorState;
  discovered: boolean;
  visited: boolean;
  cleared: boolean;
  enemiesSpawned: boolean;
  hasChest: boolean;
  chestLocked: boolean;
  chestOpened: boolean;
  hasShrine: boolean;
  shrineUsed: boolean;
  shrineKind?: ShrineKind;
  name: string;
  // procedural decor seed
  seed: number;
}

export type ShrineKind =
  | 'calcination'
  | 'dissolution'
  | 'separation'
  | 'conjunction'
  | 'fermentation'
  | 'distillation'
  | 'coagulation';

export interface Floor {
  number: number;
  seed: number;
  rooms: Room[];
  roomGrid: Map<string, Room>;
  startRoomId: number;
  exitRoomId: number;
  isBoss: boolean;
  isMiniBoss: boolean;
}

export interface SettingsState {
  musicVolume: number;
  sfxVolume: number;
  touchControls: boolean;
  pixelScale: 'auto' | '1' | '2' | '3' | '4';
  reducedParticles: boolean;
  gamepadMap: GamepadMap;
}

export interface MetaState {
  bonusMaxHp: number;
  bonusStartingMp: number;
  bonusEssenceGain: number;
  cosmeticLampAura: boolean;
  // Persistent narrative state
  unlockedCodex: string[];
  seenPrologue: boolean;          // doubles as "has seen the Tabula film at boot"
  seenNewRunCinematic: boolean;   // "has seen The Gate Opens"
  bossesSeen: string[];           // sphere ids whose Warden intro film has played
  seenEnding: boolean;            // "has seen the Eighth Sphere film"
  ogdoadReached: number; // count of times the player has reached the Eighth Sphere
}

export interface SaveState {
  bestFloor: number;
  totalEssence: number;
  meta: MetaState;
  lastArchetype: ArchetypeId | null;
}

export interface RunStats {
  floorReached: number;
  roomsCleared: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  essenceCollected: number;
  coinsCollected: number;
  relicsFound: RelicId[];
  weaponsFound: WeaponId[];
  spellsFound: SpellId[];
}
