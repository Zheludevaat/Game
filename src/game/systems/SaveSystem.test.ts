import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSettings, saveSettings,
  loadBestFloor, saveBestFloor,
  loadEssence, saveEssence,
  loadMeta, saveMeta,
  loadLastArchetype, saveLastArchetype,
  loadResume, saveResume,
  resetAllSave,
} from './SaveSystem';

const STORAGE_KEYS = [
  'sl.settings', 'sl.best', 'sl.essence', 'sl.meta',
  'sl.lastArchetype', 'sl.gamepadMap', 'sl.resume',
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
});
