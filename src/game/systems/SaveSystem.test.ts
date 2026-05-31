import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSettings, saveSettings,
  loadBestFloor, saveBestFloor,
  loadEssence, saveEssence,
  loadMeta, saveMeta,
  loadLastArchetype, saveLastArchetype,
  loadResume, saveResume,
  loadRunSnapshot, saveRunSnapshot, clearRunSnapshot,
  resetAllSave,
} from './SaveSystem';
import { RUN_SNAPSHOT_VERSION, RunSnapshot } from './runSnapshot';

const STORAGE_KEYS = [
  'sl.settings', 'sl.best', 'sl.essence', 'sl.meta',
  'sl.lastArchetype', 'sl.gamepadMap', 'sl.resume', 'sl.runSnapshot',
];

beforeEach(() => {
  for (const k of STORAGE_KEYS) localStorage.removeItem(k);
});

describe('SaveSystem', () => {
  it('loadSettings returns defaults when empty', () => {
    const s = loadSettings();
    expect(s.musicVolume).toBe(0.4);
    expect(s.sfxVolume).toBe(0.7);
    expect(s.touchControls).toBe(true);
  });

  it('round-trips settings', () => {
    const s = loadSettings();
    s.musicVolume = 0.8;
    s.reducedParticles = true;
    saveSettings(s);
    const loaded = loadSettings();
    expect(loaded.musicVolume).toBe(0.8);
    expect(loaded.reducedParticles).toBe(true);
  });

  it('round-trips best floor', () => {
    saveBestFloor(15);
    expect(loadBestFloor()).toBe(15);
    saveBestFloor(3);
    expect(loadBestFloor()).toBe(3);
  });

  it('round-trips essence', () => {
    saveEssence(999);
    expect(loadEssence()).toBe(999);
  });

  it('round-trips meta', () => {
    const m = loadMeta();
    m.bonusMaxHp = 20;
    m.bonusStartingMp = 10;
    m.unlockedCodex = ['awaken.pimander', 'death.palingenesia'];
    m.bossesSeen = ['moon', 'mercury'];
    saveMeta(m);
    const loaded = loadMeta();
    expect(loaded.bonusMaxHp).toBe(20);
    expect(loaded.bonusStartingMp).toBe(10);
    expect(loaded.unlockedCodex).toEqual(['awaken.pimander', 'death.palingenesia']);
    expect(loaded.bossesSeen).toEqual(['moon', 'mercury']);
  });

  it('loadLastArchetype returns null for invalid values', () => {
    localStorage.setItem('sl.lastArchetype', JSON.stringify('invalid'));
    expect(loadLastArchetype()).toBeNull();
  });

  it('round-trips last archetype', () => {
    saveLastArchetype('hermit');
    expect(loadLastArchetype()).toBe('hermit');
  });

  it('round-trips resume state', () => {
    saveResume({ archetype: 'magus', floor: 7, seed: 12345 });
    const r = loadResume();
    expect(r).not.toBeNull();
    expect(r!.archetype).toBe('magus');
    expect(r!.floor).toBe(7);
    expect(r!.seed).toBe(12345);
  });

  it('loadResume returns null when cleared', () => {
    saveResume(null);
    expect(loadResume()).toBeNull();
  });

  it('resetAllSave clears everything', () => {
    saveBestFloor(10);
    saveEssence(500);
    saveMeta(loadMeta());
    resetAllSave();
    expect(loadBestFloor()).toBe(0);
    expect(loadEssence()).toBe(0);
  });

  it('round-trips run snapshot', () => {
    const snap: RunSnapshot = {
      version: RUN_SNAPSHOT_VERSION,
      archetype: 'magus',
      runSeed: 42,
      floor: 5,
      roomId: 3,
      hp: 20, maxHp: 60,
      mp: 10, maxMp: 40,
      coins: 99, keys: 2,
      weapons: ['tarnishedDagger'],
      spells: ['sparkBolt'],
      relics: ['blackSalt'],
      defeatedWardenIds: ['moon'],
      openedChestRoomIds: [1],
      clearedRoomIds: [1, 2],
      shrineUsedRoomIds: [3],
    };
    saveRunSnapshot(snap);
    const loaded = loadRunSnapshot();
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(1);
    expect(loaded!.archetype).toBe('magus');
    expect(loaded!.runSeed).toBe(42);
    expect(loaded!.floor).toBe(5);
    expect(loaded!.roomId).toBe(3);
    expect(loaded!.hp).toBe(20);
    expect(loaded!.maxHp).toBe(60);
    expect(loaded!.coins).toBe(99);
    expect(loaded!.weapons).toEqual(['tarnishedDagger']);
    expect(loaded!.defeatedWardenIds).toEqual(['moon']);
    expect(loaded!.clearedRoomIds).toEqual([1, 2]);
  });

  it('loadRunSnapshot returns null for missing data', () => {
    localStorage.removeItem('sl.runSnapshot');
    expect(loadRunSnapshot()).toBeNull();
  });

  it('clearRunSnapshot removes saved data', () => {
    const snap: RunSnapshot = {
      version: RUN_SNAPSHOT_VERSION,
      archetype: 'hermit',
      runSeed: 0,
      floor: 1, roomId: 0,
      hp: 10, maxHp: 50,
      mp: 5, maxMp: 30,
      coins: 0, keys: 0,
      weapons: [], spells: [], relics: [],
      defeatedWardenIds: [],
      openedChestRoomIds: [], clearedRoomIds: [], shrineUsedRoomIds: [],
    };
    saveRunSnapshot(snap);
    clearRunSnapshot();
    expect(loadRunSnapshot()).toBeNull();
  });
});
