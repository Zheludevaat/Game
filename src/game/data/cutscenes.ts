// Cutscene data — text, beat structure, and beat-specific renderer hooks.
// See docs/cutscenes.md for the full design.

import { Beat } from '../../components/Cutscene';
import {
  drawTabulaStar, drawTabulaNiche, drawTabulaSevenLamps,
  drawBossSphereGlyph, drawBossOccultCircle, drawBossThreshold,
} from '../rendering/cutsceneArt';
import { SPHERE_BY_ID, SphereId } from './spheres';

// ─── Cutscene 1: Tabula Smaragdina (pre-menu) ─────────────────────────

export const PRE_MENU_CUTSCENE: Beat[] = [
  {
    subtitle: 'As above…',
    title: 'Tabula Smaragdina',
    body: 'It is true, without lies, certain and most true.',
    source: 'Tabula Smaragdina',
    render: drawTabulaStar,
    holdMs: 3000,
  },
  {
    subtitle: '…so below',
    title: 'The Likeness of the One',
    body:
      'That which is below is like that which is above, and that which ' +
      'is above is like that which is below — to perform the miracles ' +
      'of the One Thing.',
    source: 'Tabula Smaragdina (Newton trans.)',
    render: drawTabulaNiche,
    holdMs: 4500,
  },
  {
    subtitle: 'The Seven Lamps have gone out.',
    title: 'Abyss of the Seven Lamps',
    body: 'A solitary descent. To ascend, thou must first descend.',
    source: 'Title of the Work',
    render: drawTabulaSevenLamps,
    holdMs: 4000,
  },
];

// ─── Cutscene 3: Boss intro — Warden Manifests ──────────────────────
// One data row per Warden. Generated from the spheres + their epithets.
// The cutscene player passes the renderer a closure that bakes in this
// sphere's colours.

export interface BossIntroData {
  wardenName: string;
  epithet: string;
  surrender: string;
}

export const BOSS_INTROS: Record<SphereId, BossIntroData> = {
  moon: {
    wardenName: 'Selene the Tide-keeper',
    epithet: 'She who counts the breaths of the body.',
    surrender: 'Surrender the energy of growth and waning.',
  },
  mercury: {
    wardenName: 'Hermes the Quicksilver',
    epithet: 'Whose lies are silvered like the moon.',
    surrender: 'Surrender the device of evils, and deceit no longer working.',
  },
  venus: {
    wardenName: 'Aphrodite of a Thousand Loves',
    epithet: 'Whose desire scatters the soul.',
    surrender: 'Surrender the illusion of desire.',
  },
  sun: {
    wardenName: 'Helios the Crowned',
    epithet: 'Who mistakes the lamp for the Light.',
    surrender: 'Surrender the ruling arrogance.',
  },
  mars: {
    wardenName: 'Ares the Edge-warden',
    epithet: 'Whose sword does not know what it cuts.',
    surrender: 'Surrender the unholy daring.',
  },
  jupiter: {
    wardenName: 'Zeus the Wide-vessel',
    epithet: 'Whose largeness cannot contain its own light.',
    surrender: 'Surrender the striving for wealth by evil means.',
  },
  saturn: {
    wardenName: 'Kronos the Boundary',
    epithet: 'Beyond him is no clock and no need of one.',
    surrender: 'Surrender the falsehood that ensnares.',
  },
  ogdoad: {
    wardenName: 'The Eighth',
    epithet: 'There is no Warden here.',
    surrender: 'There remains nothing to surrender.',
  },
};

export function bossIntroBeats(sphereId: SphereId): Beat[] {
  const s = SPHERE_BY_ID[sphereId];
  const data = BOSS_INTROS[sphereId];
  const intro: { glyph: string; glyphColour: string; accentColour: string } = {
    glyph: s.glyph,
    glyphColour: s.colour,
    accentColour: s.accent,
  };
  return [
    {
      subtitle: s.numeral + ' — ' + s.name.toUpperCase(),
      title: s.godName,
      body: 'A ring of the cosmos draws near.',
      source: 'CORPUS HERMETICUM I.9',
      render: (a) => drawBossSphereGlyph(a, intro),
      align: 'center',
      holdMs: 2200,
    },
    {
      subtitle: '— A guardian awakens —',
      title: data.wardenName.toUpperCase(),
      body: data.epithet,
      render: (a) => drawBossOccultCircle(a, intro),
      align: 'center',
      holdMs: 2800,
    },
    {
      subtitle: 'The doors lock behind thee.',
      body: data.surrender,
      source: 'PIMANDER I.25',
      render: (a) => drawBossThreshold(a, intro),
      align: 'center',
      holdMs: 2200,
    },
  ];
}
