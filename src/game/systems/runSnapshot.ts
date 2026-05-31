import { ArchetypeId, RelicId, SpellId, WeaponId } from '../GameTypes';

export const RUN_SNAPSHOT_VERSION = 1;

export interface RunSnapshot {
  version: 1;
  archetype: ArchetypeId;
  runSeed: number;
  floor: number;
  roomId: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  coins: number;
  keys: number;
  weapons: WeaponId[];
  spells: SpellId[];
  relics: RelicId[];
  defeatedWardenIds: string[];
  openedChestRoomIds: number[];
  clearedRoomIds: number[];
  shrineUsedRoomIds: number[];
}
