// Lists every cutscene the user has unlocked / can replay. Lets them
// preview the in-game cinematics from outside a run.

import { useState } from 'react';
import { CinematicShort, Shot } from './CinematicShort';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { useMenuNav } from './useMenuNav';
import { TABULA_CINEMATIC } from '../game/data/cinematicTabula';
import { NEW_GAME_CINEMATIC } from '../game/data/cinematicNewGame';
import { bossIntroShots } from '../game/data/cinematicBossIntro';
import { ENDING_CINEMATIC } from '../game/data/cinematicEnding';
import { SPHERES, SphereId } from '../game/data/spheres';

interface Props {
  onBack: () => void;
  /** If true, the Ending row is unlocked. Otherwise it shows but is disabled. */
  endingUnlocked?: boolean;
}

interface CinematicItem {
  id: string;
  title: string;
  subtitle: string;
  shots: Shot[];
  accent: string;
  chapter: string;
  format: 'film';
}

const ITEMS: CinematicItem[] = [
  {
    id: 'pre-menu',
    title: 'Tabula Smaragdina',
    subtitle: 'Opening film — 6 shots, ~28s',
    shots: TABULA_CINEMATIC,
    accent: '#f4d27a',
    chapter: 'I — OPENING',
    format: 'film',
  },
  {
    id: 'new-game',
    title: 'The Gate Opens',
    subtitle: 'New-run film — 5 shots, ~28s',
    shots: NEW_GAME_CINEMATIC,
    accent: '#6cf6e5',
    chapter: 'II — THE DESCENT BEGINS',
    format: 'film',
  },
  // Boss intros — film-style; one per planetary sphere.
  ...SPHERES.filter((s) => s.id !== 'ogdoad').map((s) => ({
    id: `boss-${s.id}`,
    title: `Warden of the ${s.name.replace('Sphere of the ', '').replace('Sphere of ', '')}`,
    subtitle: `Boss intro — ${s.godName}`,
    shots: bossIntroShots(s.id as SphereId),
    accent: s.colour,
    chapter: `${s.numeral} — ${s.name.toUpperCase()}`,
    format: 'film' as const,
  })),
  // The Ending — locked until the player has actually reached the Ogdoad.
  {
    id: 'ending',
    title: 'The Eighth Sphere',
    subtitle: 'Ending film — 6 shots, ~60s',
    shots: ENDING_CINEMATIC,
    accent: '#ffe6a3',
    chapter: 'VIII — THE OGDOAD',
    format: 'film' as const,
  },
];

export function CinematicsScreen({ onBack, endingUnlocked = false }: Props): JSX.Element {
  const [playing, setPlaying] = useState<CinematicItem | null>(null);

  // Lock the Ending until first victory; everything else is replayable.
  const isLocked = (it: CinematicItem): boolean => it.id === 'ending' && !endingUnlocked;

  const items = [
    ...ITEMS.map((it) => ({
      onActivate: () => { if (!isLocked(it)) setPlaying(it); },
      disabled: isLocked(it),
    })),
    { onActivate: onBack },
  ];
  const focus = useMenuNav(items, { onCancel: onBack, enabled: !playing });

  if (playing) {
    // Pick the pad mood by film id so gallery replays sound like the
    // in-game versions.
    let mood: 'cosmos' | 'descent' | 'boss' | 'ascent' = 'cosmos';
    if (playing.id === 'new-game') mood = 'descent';
    else if (playing.id.startsWith('boss-')) mood = 'boss';
    else if (playing.id === 'ending') mood = 'ascent';
    return (
      <CinematicShort
        shots={playing.shots}
        title={playing.chapter}
        mood={mood}
        onDone={() => setPlaying(null)}
      />
    );
  }

  return (
    <div className="menu-screen with-bg">
      <PixelPanel title="Cinematics" subtitle="Replay the work" width={Math.min(640, window.innerWidth - 48)}>
        <div className="cinematics-list">
          {ITEMS.map((it, i) => {
            const locked = isLocked(it);
            return (
              <button
                key={it.id}
                type="button"
                className={'cinematics-row' + (focus === i ? ' focused' : '') + (locked ? ' locked' : '')}
                onClick={() => { if (!locked) setPlaying(it); }}
                disabled={locked}
                aria-disabled={locked}
                style={{ borderLeftColor: it.accent }}
              >
                <div className="cinematics-row-main">
                  <div className="cinematics-row-title">{locked ? '— Locked —' : it.title}</div>
                  <div className="cinematics-row-sub">
                    {locked ? 'Revealed by reaching the Ogdoad.' : it.subtitle}
                  </div>
                </div>
                <div className="cinematics-row-meta">
                  {locked ? '🔒' : `${it.shots.length} shots · ▶`}
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, letterSpacing: '0.18em', color: 'rgba(231,227,215,0.6)' }}>
          D-PAD / WASD navigate · A / Enter play · B / Esc back
        </div>
        <div style={{ marginTop: 10, textAlign: 'center' }}>
          <PixelButton onClick={onBack} focused={focus === ITEMS.length}>Back</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
