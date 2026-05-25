// Lists every cutscene the user has unlocked / can replay. Lets them
// preview the in-game cinematics from outside a run.

import { useState } from 'react';
import { Beat, Cutscene } from './Cutscene';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { useMenuNav } from './useMenuNav';
import { PRE_MENU_CUTSCENE, bossIntroBeats } from '../game/data/cutscenes';
import { SPHERES, SphereId } from '../game/data/spheres';

interface Props { onBack: () => void; }

interface CinematicItem {
  id: string;
  title: string;
  subtitle: string;
  beats: Beat[];
  accent: string;
  chapter: string;
}

const ITEMS: CinematicItem[] = [
  {
    id: 'pre-menu',
    title: 'Tabula Smaragdina',
    subtitle: 'Pre-menu opening',
    beats: PRE_MENU_CUTSCENE,
    accent: '#f4d27a',
    chapter: 'I — OPENING',
  },
  // One boss-intro per planetary sphere, ogdoad excluded (no Warden).
  ...SPHERES.filter((s) => s.id !== 'ogdoad').map((s) => ({
    id: `boss-${s.id}`,
    title: `Warden of the ${s.name.replace('Sphere of the ', '').replace('Sphere of ', '')}`,
    subtitle: `Boss intro — ${s.godName}`,
    beats: bossIntroBeats(s.id as SphereId),
    accent: s.colour,
    chapter: `${s.numeral} — ${s.name.toUpperCase()}`,
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
    return (
      <Cutscene
        beats={playing.beats}
        accent={playing.accent}
        chapterLabel={playing.chapter}
        onDone={() => setPlaying(null)}
      />
    );
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
              <div className="cinematics-row-meta">{it.beats.length} beats · ▶</div>
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
