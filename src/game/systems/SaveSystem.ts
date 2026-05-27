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
  seenTutorial: false,
  runHistory: [],
  perArchetypeBest: {},
  achievements: [],
  ascensionLevel: 0,
};

export function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    // Migrate the renamed gamepad bindings — `useItem` and `cycleRelic`
    // were displayed in Settings but actually drove cycle-spell /
    // cycle-weapon in-game, which was the source of the "controls
    // differ between settings and the actual game" complaint. Carry
    // any custom indices over to the new keys so a returning player
    // doesn't lose their remap, then drop the old labels.
    const padRaw = (parsed.gamepadMap ?? {}) as Partial<typeof DEFAULT_GAMEPAD_MAP> & { useItem?: number; cycleRelic?: number };
    if (padRaw.useItem != null && padRaw.cycleSpell == null) padRaw.cycleSpell = padRaw.useItem;
    if (padRaw.cycleRelic != null && padRaw.cycleWeapon == null) padRaw.cycleWeapon = padRaw.cycleRelic;
    delete padRaw.useItem;
    delete padRaw.cycleRelic;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      gamepadMap: { ...DEFAULT_GAMEPAD_MAP, ...padRaw },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: SettingsState): void {
  try { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(s)); } catch { /* */ }
}

export function loadBestFloor(): number {
  try { return Number(localStorage.getItem(STORAGE_KEYS.best) ?? 0) || 0; } catch { return 0; }
}
export function saveBestFloor(n: number): void {
  try { localStorage.setItem(STORAGE_KEYS.best, String(n)); } catch { /* */ }
}

export function loadEssence(): number {
  try { return Number(localStorage.getItem(STORAGE_KEYS.essence) ?? 0) || 0; } catch { return 0; }
}
export function saveEssence(n: number): void {
  try { localStorage.setItem(STORAGE_KEYS.essence, String(n)); } catch { /* */ }
}

export function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.meta);
    if (!raw) return { ...DEFAULT_META };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_META,
      ...parsed,
      unlockedCodex: Array.isArray(parsed.unlockedCodex) ? parsed.unlockedCodex : [],
      bossesSeen: Array.isArray(parsed.bossesSeen) ? parsed.bossesSeen : [],
      runHistory: Array.isArray(parsed.runHistory) ? parsed.runHistory : [],
      perArchetypeBest: typeof parsed.perArchetypeBest === 'object' && parsed.perArchetypeBest
        ? parsed.perArchetypeBest : {},
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      ascensionLevel: typeof parsed.ascensionLevel === 'number' ? parsed.ascensionLevel : 0,
    };
  } catch { return { ...DEFAULT_META }; }
}
export function saveMeta(m: MetaState): void {
  try { localStorage.setItem(STORAGE_KEYS.meta, JSON.stringify(m)); } catch { /* */ }
}

export function loadLastArchetype(): ArchetypeId | null {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.lastArchetype);
    if (v === 'magus' || v === 'hermit' || v === 'star') return v;
    return null;
  } catch { return null; }
}
export function saveLastArchetype(a: ArchetypeId): void {
  try { localStorage.setItem(STORAGE_KEYS.lastArchetype, a); } catch { /* */ }
}

export function resetAllSave(): void {
  for (const k of Object.values(STORAGE_KEYS)) {
    try { localStorage.removeItem(k); } catch { /* */ }
  }
}

export interface ResumeState {
  archetype: ArchetypeId;
  floor: number;
  seed: number;
}

export function loadResume(): ResumeState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.resume);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.archetype) return null;
    return parsed;
  } catch { return null; }
}
export function saveResume(r: ResumeState | null): void {
  try {
    if (r) localStorage.setItem(STORAGE_KEYS.resume, JSON.stringify(r));
    else localStorage.removeItem(STORAGE_KEYS.resume);
  } catch { /* */ }
}
