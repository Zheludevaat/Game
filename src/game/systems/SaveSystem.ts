import { STORAGE_KEYS } from '../constants';
import { ArchetypeId, MetaState, SettingsState } from '../GameTypes';
import { DEFAULT_GAMEPAD_MAP } from '../input/controlMappings';

const DEFAULT_SETTINGS: SettingsState = {
  musicVolume: 0.4,
  sfxVolume: 0.7,
  touchControls: true,
  pixelScale: 'auto',
  reducedParticles: false,
  gamepadMap: { ...DEFAULT_GAMEPAD_MAP },
};

const DEFAULT_META: MetaState = {
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

export function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      gamepadMap: { ...DEFAULT_GAMEPAD_MAP, ...(parsed.gamepadMap ?? {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function safeSave(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {
    console.warn('[SaveSystem] failed to save', key, e);
  }
}
function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn('[SaveSystem] failed to load', key, e);
    return fallback;
  }
}

export function saveSettings(s: SettingsState): void {
  safeSave(STORAGE_KEYS.settings, s);
}

export function loadBestFloor(): number {
  return safeLoad(STORAGE_KEYS.best, 0);
}
export function saveBestFloor(n: number): void {
  try { localStorage.setItem(STORAGE_KEYS.best, String(n)); } catch (e) { console.warn('[SaveSystem] failed to save best floor', e); }
}

export function loadEssence(): number {
  return safeLoad(STORAGE_KEYS.essence, 0);
}
export function saveEssence(n: number): void {
  try { localStorage.setItem(STORAGE_KEYS.essence, String(n)); } catch (e) { console.warn('[SaveSystem] failed to save essence', e); }
}

export function loadMeta(): MetaState {
  const parsed = safeLoad<Partial<MetaState>>(STORAGE_KEYS.meta, {});
  if (Object.keys(parsed).length === 0) return { ...DEFAULT_META };
  return {
    ...DEFAULT_META,
    ...parsed,
    unlockedCodex: Array.isArray(parsed.unlockedCodex) ? parsed.unlockedCodex : [],
    bossesSeen: Array.isArray(parsed.bossesSeen) ? parsed.bossesSeen : [],
  };
}
export function saveMeta(m: MetaState): void {
  safeSave(STORAGE_KEYS.meta, m);
}

export function loadLastArchetype(): ArchetypeId | null {
  const v = safeLoad<string | null>(STORAGE_KEYS.lastArchetype, null);
  if (v === 'magus' || v === 'hermit' || v === 'star') return v;
  return null;
}
export function saveLastArchetype(a: ArchetypeId): void {
  safeSave(STORAGE_KEYS.lastArchetype, a);
}

export function resetAllSave(): void {
  for (const k of Object.values(STORAGE_KEYS)) {
    try { localStorage.removeItem(k); } catch (e) { console.warn('[SaveSystem] failed to remove', k, e); }
  }
}

export interface ResumeState {
  archetype: ArchetypeId;
  floor: number;
  seed: number;
}

export function loadResume(): ResumeState | null {
  const parsed = safeLoad<ResumeState | null>(STORAGE_KEYS.resume, null);
  if (!parsed?.archetype) return null;
  return parsed;
}
export function saveResume(r: ResumeState | null): void {
  try {
    if (r) localStorage.setItem(STORAGE_KEYS.resume, JSON.stringify(r));
    else localStorage.removeItem(STORAGE_KEYS.resume);
  } catch (e) { console.warn('[SaveSystem] failed to save resume', e); }
}
