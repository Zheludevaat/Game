import { audio, BossPhase, CinematicMood, SfxName } from './game/systems/AudioSystem';

type CueKind = 'music' | 'dungeon' | 'boss' | 'cinematic' | 'screen' | 'sfx';

interface Cue {
  id: string;
  label: string;
  kind: CueKind;
  note: string;
  play: () => void | (() => void);
}

const spheres = [
  ['moon', 'I - Moon', 'Descending minor third, rising fourth answer — glass bell lead over tidal pads'],
  ['mercury', 'II - Mercury', 'Rapid neighbor tone flurries — nimble plucked FM with delay-drenched shimmer'],
  ['venus', 'III - Venus', 'Warm sixths and lyrical stepwise phrases — soft chorus on a bed of longing'],
  ['sun', 'IV - Sun', 'Open-fifth fanfare, bright major lift — low brass-like pulse over Lydian glow'],
  ['mars', 'V - Mars', 'Sharp minor-second stabs and chromatic fury — martial drums, aggressive bass'],
  ['jupiter', 'VI - Jupiter', 'Broad fourths with regal dotted rhythm — deep choir pad and ceremonial timpani'],
  ['saturn', 'VII - Saturn', 'Slow tritone resolution over clock-pulse tick — dark low strings, cold finality'],
  ['ogdoad', 'VIII - Ogdoad', 'Transcendent Lydian release — luminous pad, rising arcs, boundless air'],
] as const;

const moods = ['cosmos', 'descent', 'boss', 'ascent'] as CinematicMood[];
const sfxNames = ['menu', 'attack', 'dash', 'spell', 'enemyHit', 'playerHit', 'chest', 'shrine', 'descend', 'bossWarn', 'bossDeath', 'pickup', 'doorLock', 'doorOpen'] as SfxName[];

let activeStop: (() => void) | null = null;
let currentCueId = '';
let currentCueKind: CueKind | '' = '';
let hasActiveLongCue = false;
let playRequest = 0;

const stopActive = (): void => {
  activeStop?.();
  activeStop = null;
  audio.stopAll();
};

const cues: Cue[] = [
  {
    id: 'menu',
    label: 'Main Menu - The Seven Lamps',
    kind: 'music',
    note: 'Long-form title score with evolving pads, bell accents, and the shared lamp identity.',
    play: () => audio.playMenuHum(),
  },
  ...spheres.map<Cue>(([id, label, note]) => ({
    id: `dungeon-${id}`,
    label: `Dungeon ${label}`,
    kind: 'dungeon',
    note,
    play: () => audio.startDungeonAmbience(id),
  })),
  ...spheres.map<Cue>(([id, label]) => ({
    id: `boss-${id}`,
    label: `Boss ${label}`,
    kind: 'boss',
    note: 'Reuses sphere motif in forceful rhythm. Phase buttons add percussion, ostinato, then high countermelody with gain reduction.',
    play: () => audio.startBossMusic(id),
  })),
  ...moods.map<Cue>((mood) => ({
    id: `cinematic-${mood}`,
    label: `Cinematic - ${mood}`,
    kind: 'cinematic',
    note: 'Narrative pad layer used under film scenes.',
    play: () => audio.playCinematicPad(mood),
  })),
  {
    id: 'screen-game-over',
    label: 'Screen - Game Over',
    kind: 'screen',
    note: 'Failure state music.',
    play: () => audio.playGameOverMusic(),
  },
  {
    id: 'screen-prologue',
    label: 'Screen - Prologue',
    kind: 'screen',
    note: 'Opening narrative score.',
    play: () => audio.playPrologueMusic(),
  },
  {
    id: 'screen-epilogue',
    label: 'Screen - Epilogue',
    kind: 'screen',
    note: 'Closing release cue.',
    play: () => audio.playEpilogueMusic(),
  },
  {
    id: 'screen-codex',
    label: 'Screen - Codex',
    kind: 'screen',
    note: 'Codex reading bed.',
    play: () => audio.playCodexMusic(),
  },
  ...sfxNames.map<Cue>((name) => ({
    id: `sfx-${name}`,
    label: `SFX - ${name}`,
    kind: 'sfx',
    note: 'One-shot sound effect. Click repeatedly to test responsiveness.',
    play: () => audio.sfx(name),
  })),
];

const root = document.getElementById('audio-showcase-root');
if (!root) throw new Error('Missing audio showcase root');

root.innerHTML = `
  <main class="shell">
    <section class="masthead">
      <div>
        <p class="eyebrow">Abyss of the Seven Lamps</p>
        <h1>Audio Showcase</h1>
      </div>
      <button id="stop-all" class="stop" type="button">Stop</button>
    </section>

    <section class="transport">
      <span class="label">Now Playing</span>
      <strong id="now-playing">Nothing yet</strong>
      <p id="now-note">Tap a cue. The first tap unlocks browser audio.</p>
      <div class="boss-phase" aria-label="Boss phases">
        <button type="button" data-phase="1">Phase 1</button>
        <button type="button" data-phase="2">Phase 2</button>
        <button type="button" data-phase="3">Phase 3</button>
      </div>
    </section>

    <section class="mix">
      <label>Music <input id="music-volume" type="range" min="0" max="100" value="55" /></label>
      <label>SFX <input id="sfx-volume" type="range" min="0" max="100" value="70" /></label>
    </section>

    <section id="cue-groups" class="groups"></section>
  </main>
`;

const style = document.createElement('style');
style.textContent = `
  :root {
    color-scheme: dark;
    --bg: #06040b;
    --panel: #15101f;
    --panel-2: #211931;
    --gold: #f4d27a;
    --teal: #6cf6e5;
    --ink: #f5efd8;
    --muted: rgba(245, 239, 216, 0.68);
    --line: rgba(244, 210, 122, 0.22);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at 15% 0%, rgba(108, 246, 229, 0.12), transparent 32rem),
      radial-gradient(circle at 85% 8%, rgba(244, 210, 122, 0.10), transparent 28rem),
      var(--bg);
    color: var(--ink);
    font-family: Georgia, "Times New Roman", serif;
  }
  button, input { font: inherit; }
  .shell { width: min(1180px, calc(100vw - 32px)); margin: 0 auto; padding: 28px 0 48px; }
  .masthead, .transport, .mix {
    border: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(33, 25, 49, 0.96), rgba(12, 9, 20, 0.96));
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
  }
  .masthead { min-height: 132px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 24px; }
  .eyebrow { margin: 0 0 8px; color: var(--gold); letter-spacing: 0.18em; text-transform: uppercase; font-size: 12px; }
  h1 { margin: 0; font-size: clamp(38px, 6vw, 76px); line-height: 0.92; letter-spacing: 0; }
  .stop, .cue, .boss-phase button {
    border: 1px solid rgba(244, 210, 122, 0.34);
    color: var(--ink);
    background: rgba(6, 4, 11, 0.55);
    min-height: 42px;
    cursor: pointer;
  }
  .stop { padding: 0 18px; color: var(--gold); }
  .transport { margin-top: 14px; padding: 18px 20px; }
  .label { display: block; color: var(--teal); text-transform: uppercase; letter-spacing: 0.14em; font-size: 11px; margin-bottom: 5px; }
  #now-playing { display: block; color: var(--gold); font-size: 24px; letter-spacing: 0; }
  #now-note { margin: 6px 0 14px; color: var(--muted); font-size: 15px; }
  .boss-phase { display: flex; gap: 8px; flex-wrap: wrap; }
  .boss-phase button { padding: 0 12px; color: var(--muted); }
  .mix { margin-top: 14px; display: flex; gap: 24px; flex-wrap: wrap; padding: 14px 18px; }
  .mix label { display: grid; grid-template-columns: 56px minmax(160px, 260px); align-items: center; gap: 10px; color: var(--muted); }
  .groups { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
  .group { border-top: 1px solid var(--line); padding-top: 14px; }
  .group h2 { margin: 0 0 10px; color: var(--teal); font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; }
  .cue-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 8px; }
  .cue { min-height: 58px; padding: 9px 11px; text-align: left; }
  .cue strong { display: block; color: var(--ink); font-size: 15px; line-height: 1.15; }
  .cue span { display: block; margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.25; }
  .cue.active { border-color: var(--teal); background: rgba(108, 246, 229, 0.13); }
  #audio-diagnostics {
    margin-top: 16px;
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid var(--line);
    border-radius: 4px;
    font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted);
    white-space: pre;
    overflow-x: auto;
  }
  @media (max-width: 760px) {
    .masthead { align-items: flex-start; flex-direction: column; }
    .groups { grid-template-columns: 1fr; }
    .mix label { grid-template-columns: 1fr; }
  }
`;
document.head.appendChild(style);

const nowPlaying = document.getElementById('now-playing') as HTMLElement;
const nowNote = document.getElementById('now-note') as HTMLElement;
const musicSlider = document.getElementById('music-volume') as HTMLInputElement;
const sfxSlider = document.getElementById('sfx-volume') as HTMLInputElement;
const groupsEl = document.getElementById('cue-groups') as HTMLElement;

const grouped: Record<CueKind, Cue[]> = {
  music: cues.filter((cue) => cue.kind === 'music'),
  dungeon: cues.filter((cue) => cue.kind === 'dungeon'),
  boss: cues.filter((cue) => cue.kind === 'boss'),
  cinematic: cues.filter((cue) => cue.kind === 'cinematic'),
  screen: cues.filter((cue) => cue.kind === 'screen'),
  sfx: cues.filter((cue) => cue.kind === 'sfx'),
};

const groupNames: Record<CueKind, string> = {
  music: 'Main Music',
  dungeon: 'Dungeon Spheres',
  boss: 'Boss Scores',
  cinematic: 'Cinematics',
  screen: 'Screen Scores',
  sfx: 'Sound Effects',
};

const renderButtons = (): void => {
  groupsEl.innerHTML = (Object.keys(grouped) as CueKind[]).map((kind) => `
    <section class="group">
      <h2>${groupNames[kind]}</h2>
      <div class="cue-grid">
        ${grouped[kind].map((cue) => `
          <button class="cue ${cue.id === currentCueId ? 'active' : ''}" type="button" data-cue="${cue.id}">
            <strong>${cue.label}</strong>
            <span>${cue.note}</span>
          </button>
        `).join('')}
      </div>
    </section>
  `).join('');
};

const playCue = (cue: Cue): void => {
  audio.unlock();
  audio.setMusicVolume(musicSlider.valueAsNumber / 100);
  audio.setSfxVolume(sfxSlider.valueAsNumber / 100);
  const requestId = ++playRequest;
  const needsHandoff = cue.kind !== 'sfx' && hasActiveLongCue;
  currentCueId = cue.id;
  currentCueKind = cue.kind;
  nowPlaying.textContent = cue.label;
  nowNote.textContent = cue.note;
  renderButtons();

  const startCue = (): void => {
    if (requestId !== playRequest) return;
    try {
      const maybeStop = cue.play();
      activeStop = typeof maybeStop === 'function' ? maybeStop : null;
      if (cue.kind !== 'sfx') hasActiveLongCue = true;
    } catch (error) {
      currentCueId = '';
      currentCueKind = '';
      if (cue.kind !== 'sfx') hasActiveLongCue = false;
      nowPlaying.textContent = 'Could not play cue';
      nowNote.textContent = error instanceof Error ? error.message : 'The audio engine rejected this cue.';
      renderButtons();
    }
  };

  if (cue.kind === 'sfx') {
    startCue();
    return;
  }

  if (needsHandoff) {
    stopActive();
    window.setTimeout(startCue, 520);
    return;
  }

  stopActive();
  startCue();
};

groupsEl.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-cue]');
  const cue = cues.find((item) => item.id === button?.dataset.cue);
  if (cue) playCue(cue);
});

document.getElementById('stop-all')?.addEventListener('click', () => {
  stopActive();
  currentCueId = '';
  currentCueKind = '';
  hasActiveLongCue = false;
  playRequest++;
  nowPlaying.textContent = 'Nothing yet';
  nowNote.textContent = 'Tap a cue. The first tap unlocks browser audio.';
  renderButtons();
});

document.querySelectorAll<HTMLButtonElement>('[data-phase]').forEach((button) => {
  button.addEventListener('click', () => {
    audio.setBossPhase(Number(button.dataset.phase) as BossPhase);
  });
});

musicSlider.addEventListener('input', () => audio.setMusicVolume(musicSlider.valueAsNumber / 100));
sfxSlider.addEventListener('input', () => audio.setSfxVolume(sfxSlider.valueAsNumber / 100));

renderButtons();

// ── Diagnostics panel ──────────────────────────────────────────────

const diagnosticsEl = document.createElement('pre');
diagnosticsEl.id = 'audio-diagnostics';
root.appendChild(diagnosticsEl);

setInterval(() => {
  const d = audio.getDiagnostics();
  diagnosticsEl.textContent = JSON.stringify(d, null, 2);
}, 250);
