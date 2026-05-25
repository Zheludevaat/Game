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
}
