// Persistent, lifetime achievements. Each declares a `check` that
// receives the run summary (and a few extra signals like ascension)
// and returns true when the player has earned it for the first time.

import { RunSummary } from '../GameEngine';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  glyph: string;
  /** Lower tiers unlock first; sort + ordering hint. */
  tier: 1 | 2 | 3 | 4;
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  firstLight: {
    id: 'firstLight',
    name: 'First Light',
    description: 'Defeat Selene, the Warden of the Moon.',
    glyph: '☾',
    tier: 1,
  },
  reachMercury: {
    id: 'reachMercury',
    name: 'Beyond the Tide',
    description: 'Reach the sphere of Mercury (floor 4).',
    glyph: '☿',
    tier: 1,
  },
  reachVenus: {
    id: 'reachVenus',
    name: 'Garlanded',
    description: 'Reach the sphere of Venus (floor 7).',
    glyph: '♀',
    tier: 2,
  },
  reachSun: {
    id: 'reachSun',
    name: 'Solar Ascent',
    description: 'Reach the sphere of the Sun (floor 10).',
    glyph: '☉',
    tier: 2,
  },
  fourBosses: {
    id: 'fourBosses',
    name: 'The Fourfold Path',
    description: 'Defeat four Wardens in a single run.',
    glyph: '✦',
    tier: 3,
  },
  centurion: {
    id: 'centurion',
    name: 'Hundred Spirits',
    description: 'Defeat 100 lesser souls across a single descent.',
    glyph: '⚔',
    tier: 2,
  },
  eighth: {
    id: 'eighth',
    name: 'The Eighth',
    description: 'Reach the Ogdoad — the Eighth Sphere.',
    glyph: '✶',
    tier: 4,
  },
  ascendant: {
    id: 'ascendant',
    name: 'Ascendant',
    description: 'Clear an Ogdoad under any Ascension tier.',
    glyph: '✺',
    tier: 4,
  },
  triarchy: {
    id: 'triarchy',
    name: 'Triarchy',
    description: 'Complete a run with each archetype.',
    glyph: '☥',
    tier: 4,
  },
};

export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS);

/** Per-run achievement evaluation. The first time a check passes, the
 *  host adds the id to meta.achievements (set in App.tsx). Returns the
 *  list of NEWLY-earned ids — caller filters against already-owned. */
export function evaluateAchievements(
  summary: RunSummary,
  meta: { achievements?: string[]; perArchetypeBest?: Record<string, number> },
  ascensionLevel: number,
): string[] {
  const owned = new Set(meta.achievements ?? []);
  const newOnes: string[] = [];

  const check = (id: string, cond: boolean): void => {
    if (cond && !owned.has(id)) newOnes.push(id);
  };

  check('reachMercury', summary.floorReached >= 4);
  check('reachVenus',   summary.floorReached >= 7);
  check('reachSun',     summary.floorReached >= 10);
  check('firstLight',   summary.bossesDefeated >= 1);
  check('fourBosses',   summary.bossesDefeated >= 4);
  check('centurion',    summary.enemiesDefeated >= 100);
  check('eighth',       summary.ogdoadReached);
  check('ascendant',    summary.ogdoadReached && ascensionLevel > 0);

  // Triarchy — once perArchetypeBest has all 3 keys with > 1 floor cleared.
  const ab = meta.perArchetypeBest ?? {};
  const cleared3 = (['magus', 'hermit', 'star'] as const).every((a) => (ab[a] ?? 0) >= 5);
  check('triarchy', cleared3);

  return newOnes;
}
