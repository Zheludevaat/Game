// Lists every cutscene the user has unlocked / can replay. Lets them
// preview the in-game cinematics from outside a run.

import { useState } from 'react';
import { Beat, Cutscene } from './Cutscene';
import { CinematicShort, Shot } from './CinematicShort';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { useMenuNav } from './useMenuNav';
import { bossIntroBeats } from '../game/data/cutscenes';
import { TABULA_CINEMATIC } from '../game/data/cinematicTabula';
import { NEW_GAME_CINEMATIC } from '../game/data/cinematicNewGame';
import { SPHERES, SphereId } from '../game/data/spheres';

interface Props { onBack: () => void; }

interface CinematicItem {
  id: string;
  title: string;
  subtitle: string;
  /** Film-style — full-screen shots, subtitles at the bottom. */
  shots?: Shot[];
  /** Card-style — text panel with animated backdrop. */
  beats?: Beat[];
  accent: string;
  chapter: string;
  format: 'film' | 'card';
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
  // Boss intros — currently card-style. Will be converted to film as
  // the cinematic vocabulary expands.
  ...SPHERES.filter((s) => s.id !== 'ogdoad').map((s) => ({
    id: `boss-${s.id}`,
    title: `Warden of the ${s.name.replace('Sphere of the ', '').replace('Sphere of ', '')}`,
    subtitle: `Boss intro — ${s.godName} (card)`,
    beats: bossIntroBeats(s.id as SphereId),
    accent: s.colour,
    chapter: `${s.numeral} — ${s.name.toUpperCase()}`,
    format: 'card' as const,
  })),
];

export function CinematicsScreen({ onBack }: Props): JSX.Element {
  const [playing, setPlaying] = useState<CinematicItem | null>(null);

  const items = [
    ...ITEMS.map((it) => ({ onActivate: () => setPlaying(it) })),
    { onActivate: onBack },
  ];
  const focus = useMenuNav(items, { onCancel: onBack, enabled: !playing });

  if (playing) {
    if (playing.format === 'film' && playing.shots) {
      return (
        <CinematicShort
          shots={playing.shots}
          title={playing.chapter}
          onDone={() => setPlaying(null)}
        />
      );
    }
    if (playing.beats) {
      return (
        <Cutscene
          beats={playing.beats}
          accent={playing.accent}
          chapterLabel={playing.chapter}
          onDone={() => setPlaying(null)}
        />
      );
    }
    return <></>;
  }

  return (
    <div className="menu-screen with-bg">
      <PixelPanel title="Cinematics" subtitle="Replay the work" width={Math.min(640, window.innerWidth - 48)}>
        <div className="cinematics-list">
          {ITEMS.map((it, i) => (
            <button
              key={it.id}
              type="button"
              className={'cinematics-row' + (focus === i ? ' focused' : '')}
              onClick={() => setPlaying(it)}
              onMouseEnter={() => { /* focus follows mouse via the parent menu nav */ }}
              style={{ borderLeftColor: it.accent }}
            >
              <div className="cinematics-row-main">
                <div className="cinematics-row-title">{it.title}</div>
                <div className="cinematics-row-sub">{it.subtitle}</div>
              </div>
              <div className="cinematics-row-meta">
                {it.format === 'film'
                  ? `${it.shots?.length ?? 0} shots · ▶`
                  : `${it.beats?.length ?? 0} beats · ▶`}
              </div>
            </button>
          ))}
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
