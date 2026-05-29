import * as Tone from 'tone';

export type SfxName =
  | 'menu' | 'attack' | 'dash' | 'spell' | 'enemyHit' | 'playerHit'
  | 'chest' | 'shrine' | 'descend' | 'bossWarn' | 'bossDeath' | 'pickup'
  | 'doorLock' | 'doorOpen';

export type CinematicMood = 'cosmos' | 'descent' | 'boss' | 'ascent';
export type BossPhase = 1 | 2 | 3;

type Disposable = { dispose(): void };

interface MelodyNote { time: string; note: string; dur: string; vel: number; }

const hzToNote = (f: number): string => Tone.Frequency(f, 'hz').toNote();

// ── Per-sphere music configuration ──────────────────────────────────

interface SphereMusicConfig {
  key: string; bpm: number; loopBars: number;
  chordProg: string[][];
  bass: { root: string; fifth?: string; rhythm: string; type: string; vol: number; };
  pad: { waveform: string; spread: number; vol: number; filterLow: number; filterHigh: number; lfoRate: number; chorusWet: number; };
  melody: MelodyNote[];
  leadType: 'duo' | 'fm' | 'triangle' | 'sawtooth' | 'square';
  texture: 'pink-surf' | 'high-shimmer' | 'pulse-sub' | 'marching' | 'war-drums' | 'timpani' | 'clock' | 'none';
  character: string;
  getBPM: (base: number) => number;
}

const SPHERE_MUSIC: Record<string, SphereMusicConfig> = {
  moon: {
    key: 'Am', bpm: 68, loopBars: 32,
    chordProg: [['A2','E3','A3','C4','E4'], ['D3','A3','C4','F4'], ['G2','D3','F3','B3','E4'], ['C3','G3','C4','E4']],
    bass: { root: 'A1', fifth: 'E2', rhythm: '1m', type: 'sine', vol: -16 },
    pad: { waveform: 'fatsine', spread: 10, vol: -14, filterLow: 400, filterHigh: 1500, lfoRate: 0.07, chorusWet: 0.4 },
    melody: [
      { time:'4:0:0',note:'A4',dur:'4n',vel:0.10},{ time:'5:0:0',note:'G4',dur:'4n',vel:0.08},
      { time:'6:0:0',note:'E4',dur:'2n',vel:0.09},{ time:'7:2:0',note:'D4',dur:'4n',vel:0.07},
      { time:'8:0:0',note:'C4',dur:'2n.',vel:0.10},{ time:'10:0:0',note:'E4',dur:'4n',vel:0.08},
      { time:'11:0:0',note:'G4',dur:'4n',vel:0.07},{ time:'12:0:0',note:'A4',dur:'2n',vel:0.09},
      { time:'13:2:0',note:'C5',dur:'4n.',vel:0.10},{ time:'15:0:0',note:'A4',dur:'2n',vel:0.08},
      { time:'17:0:0',note:'G4',dur:'4n',vel:0.07},{ time:'18:0:0',note:'E4',dur:'4n',vel:0.08},
      { time:'19:0:0',note:'D4',dur:'1n',vel:0.10},{ time:'21:0:0',note:'E4',dur:'2n.',vel:0.08},
      { time:'23:0:0',note:'A4',dur:'4n',vel:0.07},{ time:'24:0:0',note:'C5',dur:'2n',vel:0.10},
      { time:'26:0:0',note:'A4',dur:'2n',vel:0.08},{ time:'28:0:0',note:'E4',dur:'2n.',vel:0.09},
    ],
    leadType: 'triangle', texture: 'pink-surf', character: 'Tidal, cyclical, wistful',
    getBPM: (b) => b,
  },
  mercury: {
    key: 'Ephryg', bpm: 110, loopBars: 16,
    chordProg: [['E2','B2','E3','G#3'], ['F2','C3','F3','A3'], ['G#2','D#3','G#3','B3'], ['E2','B2','E3','G#3']],
    bass: { root: 'E1', rhythm: '4n', type: 'sine', vol: -18 },
    pad: { waveform: 'sine', spread: 4, vol: -18, filterLow: 600, filterHigh: 3000, lfoRate: 0.5, chorusWet: 0 },
    melody: [
      { time:'1:0:0',note:'E5',dur:'8n',vel:0.09},{ time:'1:2:0',note:'F5',dur:'8n',vel:0.07},
      { time:'2:0:0',note:'G#5',dur:'4n',vel:0.10},{ time:'3:0:0',note:'A5',dur:'8n',vel:0.08},
      { time:'3:2:0',note:'B5',dur:'8n',vel:0.09},{ time:'4:2:0',note:'C6',dur:'4n',vel:0.08},
      { time:'5:2:0',note:'B5',dur:'8n',vel:0.07},{ time:'6:0:0',note:'A5',dur:'8n',vel:0.06},
      { time:'6:2:0',note:'G#5',dur:'8n',vel:0.08},{ time:'7:0:0',note:'F5',dur:'8n',vel:0.06},
      { time:'7:2:0',note:'E5',dur:'4n',vel:0.09},{ time:'9:0:0',note:'G#5',dur:'8n',vel:0.08},
      { time:'9:2:0',note:'B5',dur:'8n',vel:0.07},{ time:'10:2:0',note:'C6',dur:'4n',vel:0.10},
      { time:'12:0:0',note:'B5',dur:'8n',vel:0.07},{ time:'12:2:0',note:'A5',dur:'8n',vel:0.06},
      { time:'13:0:0',note:'G#5',dur:'8n',vel:0.08},{ time:'14:0:0',note:'E5',dur:'2n',vel:0.09},
    ],
    leadType: 'fm', texture: 'high-shimmer', character: 'Quicksilver, deceptive, metallic',
    getBPM: (b) => b,
  },
  venus: {
    key: 'DDorian', bpm: 76, loopBars: 32,
    chordProg: [['D2','A2','F3','C4','E4'], ['G2','D3','F3','A3','C4'], ['C3','G3','E4','A4'], ['A2','E3','A3','C4','G4']],
    bass: { root: 'D2', fifth: 'F2', rhythm: '2n', type: 'sine', vol: -18 },
    pad: { waveform: 'fatsine', spread: 14, vol: -14, filterLow: 300, filterHigh: 2000, lfoRate: 0.05, chorusWet: 0.55 },
    melody: [
      { time:'3:0:0',note:'D5',dur:'2n',vel:0.08},{ time:'5:0:0',note:'F5',dur:'2n',vel:0.09},
      { time:'7:0:0',note:'A5',dur:'4n',vel:0.10},{ time:'8:0:0',note:'G5',dur:'2n',vel:0.08},
      { time:'10:0:0',note:'F5',dur:'4n',vel:0.07},{ time:'11:0:0',note:'D5',dur:'2n.',vel:0.10},
      { time:'14:0:0',note:'E5',dur:'4n',vel:0.08},{ time:'15:0:0',note:'C5',dur:'2n',vel:0.07},
      { time:'17:0:0',note:'A4',dur:'2n',vel:0.08},{ time:'19:0:0',note:'C5',dur:'4n',vel:0.09},
      { time:'20:0:0',note:'E5',dur:'2n',vel:0.10},{ time:'22:2:0',note:'D5',dur:'4n',vel:0.08},
      { time:'23:2:0',note:'C5',dur:'2n',vel:0.07},{ time:'25:2:0',note:'A4',dur:'2n.',vel:0.09},
      { time:'28:0:0',note:'C5',dur:'4n',vel:0.08},{ time:'29:0:0',note:'D5',dur:'2n.',vel:0.10},
    ],
    leadType: 'triangle', texture: 'pulse-sub', character: 'Seductive, longing, warm',
    getBPM: (b) => b,
  },
  sun: {
    key: 'CLydian', bpm: 88, loopBars: 16,
    chordProg: [['C3','G3','E4','A4'], ['D3','A3','F4','C5'], ['E3','B3','G4','D5'], ['F#3','C#4','A4','E5']],
    bass: { root: 'C2', fifth: 'G2', rhythm: '4n', type: 'sawtooth', vol: -16 },
    pad: { waveform: 'fatsawtooth', spread: 8, vol: -14, filterLow: 1000, filterHigh: 3000, lfoRate: 0.06, chorusWet: 0.3 },
    melody: [
      { time:'1:0:0',note:'C5',dur:'4n',vel:0.12},{ time:'1:2:0',note:'E5',dur:'4n',vel:0.10},
      { time:'2:0:0',note:'G5',dur:'4n',vel:0.11},{ time:'2:2:0',note:'A5',dur:'4n',vel:0.09},
      { time:'3:0:0',note:'B5',dur:'2n',vel:0.12},{ time:'4:0:0',note:'C6',dur:'4n',vel:0.13},
      { time:'4:2:0',note:'D6',dur:'4n',vel:0.10},{ time:'5:0:0',note:'C6',dur:'4n',vel:0.11},
      { time:'5:2:0',note:'B5',dur:'4n',vel:0.09},{ time:'6:0:0',note:'A5',dur:'4n',vel:0.08},
      { time:'6:2:0',note:'G5',dur:'4n',vel:0.09},{ time:'7:0:0',note:'E5',dur:'4n',vel:0.07},
      { time:'7:2:0',note:'C5',dur:'2n',vel:0.10},{ time:'9:0:0',note:'E5',dur:'4n',vel:0.09},
      { time:'9:2:0',note:'G5',dur:'4n',vel:0.10},{ time:'10:0:0',note:'C6',dur:'2n',vel:0.12},
      { time:'11:2:0',note:'B5',dur:'4n',vel:0.09},{ time:'12:0:0',note:'A5',dur:'2n',vel:0.08},
      { time:'13:2:0',note:'G5',dur:'2n',vel:0.10},{ time:'15:0:0',note:'C5',dur:'2n',vel:0.11},
    ],
    leadType: 'sawtooth', texture: 'marching', character: 'Majestic, bright, arrogant',
    getBPM: (b) => b,
  },
  mars: {
    key: 'FharmMin', bpm: 120, loopBars: 16,
    chordProg: [['F2','C3','F3','G#3'], ['C3','G3','C4','Eb4'], ['F2','C3','F3','G#3'], ['Db3','Ab3','Db4','F4']],
    bass: { root: 'F1', rhythm: '8n', type: 'sawtooth', vol: -14 },
    pad: { waveform: 'sawtooth', spread: 4, vol: -16, filterLow: 200, filterHigh: 800, lfoRate: 0.6, chorusWet: 0 },
    melody: [
      { time:'1:0:0',note:'F5',dur:'8n',vel:0.12},{ time:'1:1:0',note:'Eb5',dur:'8n',vel:0.10},
      { time:'1:2:0',note:'Db5',dur:'8n',vel:0.11},{ time:'1:3:0',note:'C5',dur:'8n',vel:0.09},
      { time:'2:0:0',note:'B4',dur:'4n',vel:0.10},{ time:'2:2:0',note:'C5',dur:'8n',vel:0.11},
      { time:'2:3:0',note:'Db5',dur:'8n',vel:0.10},{ time:'3:0:0',note:'Eb5',dur:'8n',vel:0.09},
      { time:'3:1:0',note:'F5',dur:'8n',vel:0.12},{ time:'3:2:0',note:'Gb5',dur:'8n',vel:0.10},
      { time:'4:0:0',note:'F5',dur:'4n',vel:0.11},{ time:'4:3:0',note:'F5',dur:'16n',vel:0.08},
      { time:'4:3:2',note:'Gb5',dur:'16n',vel:0.10},{ time:'5:0:0',note:'F5',dur:'8n',vel:0.12},
      { time:'5:1:0',note:'Eb5',dur:'8n',vel:0.09},{ time:'5:2:0',note:'Db5',dur:'8n',vel:0.10},
      { time:'6:0:0',note:'C5',dur:'4n',vel:0.11},{ time:'7:0:0',note:'F5',dur:'8n',vel:0.12},
      { time:'7:1:0',note:'Ab5',dur:'8n',vel:0.10},{ time:'8:0:0',note:'F5',dur:'2n',vel:0.12},
    ],
    leadType: 'square', texture: 'war-drums', character: 'Aggressive, martial, violent',
    getBPM: (b) => b,
  },
  jupiter: {
    key: 'GMixolydian', bpm: 92, loopBars: 32,
    chordProg: [['G2','D3','G3','B3','D4'], ['F2','C3','F3','A3','C4'], ['C3','G3','C4','E4'], ['G2','D3','G3','B3','D4']],
    bass: { root: 'G1', fifth: 'D2', rhythm: '1m', type: 'sine', vol: -14 },
    pad: { waveform: 'fatsawtooth', spread: 16, vol: -12, filterLow: 200, filterHigh: 2000, lfoRate: 0.04, chorusWet: 0.35 },
    melody: [
      { time:'4:0:0',note:'G4',dur:'4n',vel:0.09},{ time:'5:0:0',note:'B4',dur:'4n',vel:0.08},
      { time:'6:0:0',note:'D5',dur:'2n',vel:0.10},{ time:'7:2:0',note:'F5',dur:'4n',vel:0.09},
      { time:'8:0:0',note:'G5',dur:'2n',vel:0.12},{ time:'9:2:0',note:'A5',dur:'4n',vel:0.10},
      { time:'10:0:0',note:'G5',dur:'4n',vel:0.08},{ time:'11:0:0',note:'F5',dur:'4n',vel:0.09},
      { time:'12:0:0',note:'D5',dur:'2n',vel:0.10},{ time:'14:0:0',note:'B4',dur:'4n',vel:0.07},
      { time:'15:0:0',note:'G4',dur:'2n',vel:0.09},{ time:'17:0:0',note:'D5',dur:'2n',vel:0.08},
      { time:'19:0:0',note:'G5',dur:'4n',vel:0.10},{ time:'20:0:0',note:'A5',dur:'4n',vel:0.09},
      { time:'21:0:0',note:'G5',dur:'2n',vel:0.11},{ time:'23:0:0',note:'F5',dur:'2n',vel:0.08},
      { time:'25:0:0',note:'D5',dur:'2n',vel:0.09},{ time:'27:0:0',note:'B4',dur:'2n',vel:0.07},
      { time:'29:0:0',note:'G4',dur:'2n.',vel:0.10},
    ],
    leadType: 'sawtooth', texture: 'timpani', character: 'Expansive, grandiose, overwhelming',
    getBPM: (b) => b,
  },
  saturn: {
    key: 'Bdim', bpm: 56, loopBars: 32,
    chordProg: [['B1','F2','B2','D3'], ['F1','C2','F2','Ab2'], ['B1','F2','B2','D3'], ['E1','B1','E2','G2']],
    bass: { root: 'B0', rhythm: '2n', type: 'square', vol: -18 },
    pad: { waveform: 'square', spread: 3, vol: -16, filterLow: 80, filterHigh: 400, lfoRate: 0.03, chorusWet: 0 },
    melody: [
      { time:'4:0:0',note:'B4',dur:'2n',vel:0.08},{ time:'6:0:0',note:'Bb4',dur:'2n',vel:0.07},
      { time:'8:0:0',note:'A4',dur:'2n',vel:0.07},{ time:'10:0:0',note:'Ab4',dur:'2n',vel:0.06},
      { time:'12:0:0',note:'G4',dur:'2n',vel:0.08},{ time:'14:0:0',note:'F#4',dur:'2n',vel:0.07},
      { time:'16:0:0',note:'F4',dur:'2n',vel:0.06},{ time:'18:0:0',note:'E4',dur:'2n',vel:0.07},
      { time:'20:0:0',note:'Eb4',dur:'2n',vel:0.06},{ time:'22:0:0',note:'D4',dur:'2n',vel:0.07},
      { time:'24:0:0',note:'C#4',dur:'2n',vel:0.05},{ time:'26:0:0',note:'C4',dur:'2n',vel:0.06},
      { time:'28:0:0',note:'B3',dur:'4n',vel:0.07},
    ],
    leadType: 'fm', texture: 'clock', character: 'Heavy, temporal, final',
    getBPM: (b) => b,
  },
  ogdoad: {
    key: 'FLydian', bpm: 72, loopBars: 32,
    chordProg: [['F2','C3','F3','A3','E4'], ['G2','D3','G3','B3','D4'], ['A2','E3','A3','C4','E4'], ['G2','D3','G3','B3','D4']],
    bass: { root: 'F1', rhythm: '2n', type: 'sine', vol: -28 },
    pad: { waveform: 'fatsine', spread: 20, vol: -12, filterLow: 200, filterHigh: 8000, lfoRate: 0.04, chorusWet: 0.6 },
    melody: [
      { time:'5:0:0',note:'F5',dur:'2n',vel:0.07},{ time:'7:0:0',note:'A5',dur:'2n',vel:0.08},
      { time:'9:0:0',note:'C6',dur:'4n',vel:0.09},{ time:'10:0:0',note:'E6',dur:'2n',vel:0.10},
      { time:'12:0:0',note:'G6',dur:'4n',vel:0.08},{ time:'13:0:0',note:'F6',dur:'2n',vel:0.09},
      { time:'15:0:0',note:'E6',dur:'4n',vel:0.07},{ time:'16:0:0',note:'D6',dur:'2n',vel:0.08},
      { time:'18:0:0',note:'C6',dur:'4n',vel:0.09},{ time:'19:0:0',note:'B5',dur:'2n',vel:0.07},
      { time:'21:0:0',note:'A5',dur:'4n',vel:0.08},{ time:'22:0:0',note:'G5',dur:'2n',vel:0.06},
      { time:'24:0:0',note:'F5',dur:'4n',vel:0.07},{ time:'25:0:0',note:'A5',dur:'2n',vel:0.08},
      { time:'27:0:0',note:'C6',dur:'2n',vel:0.09},{ time:'29:0:0',note:'F5',dur:'2n.',vel:0.07},
    ],
    leadType: 'fm', texture: 'none', character: 'Transcendent, luminous, release',
    getBPM: (b) => b,
  },
};

export class AudioSystem {
  private unlocked = false;
  private musicVolume = 0.4;
  private sfxVolume = 0.7;

  // Shared signal chain
  private master!: Tone.Gain;
  private musicGain!: Tone.Gain;
  private sfxGain!: Tone.Gain;
  private limiter!: Tone.Limiter;
  private reverb!: Tone.Reverb;
  private chamberReverb!: Tone.Reverb;
  private pingPongDelay!: Tone.PingPongDelay;
  private chorus!: Tone.Chorus;
  private darkDelay!: Tone.FeedbackDelay;
  private darkFilter!: Tone.Filter;

  // Active state
  private menuActive = false;
  private ambienceActive = false;
  private ducked = false;
  private gameOverActive = false;
  private prologueActive = false;
  private epilogueActive = false;
  private codexActive = false;
  private bossMusicActive = false;
  private bossMusicPhase: BossPhase = 1;

  // Tracked nodes for cleanup
  private menuDisposables: Disposable[] = [];
  private ambienceDisposables: Disposable[] = [];
  private bossMusicDisposables: Disposable[] = [];
  private cinematicDisposables: Disposable[] = [];
  private screenDisposables: Disposable[] = [];

  // ── Initialisation ───────────────────────────────────────────────

  unlock(): void {
    if (this.unlocked) return;
    try {
      void Tone.start();

      this.limiter = new Tone.Limiter(-3).toDestination();
      this.master = new Tone.Gain(1).connect(this.limiter);
      this.musicGain = new Tone.Gain(this.musicVolume).connect(this.master);
      this.sfxGain = new Tone.Gain(this.sfxVolume).connect(this.master);

      // Cathedral reverb — 9s decay, the main spatial verb.
      this.reverb = new Tone.Reverb({ decay: 9, preDelay: 0.12, wet: 1 });
      this.reverb.connect(this.musicGain);

      // Chamber reverb — 3.5s, tighter, for contrast and texture sends.
      this.chamberReverb = new Tone.Reverb({ decay: 3.5, preDelay: 0.04, wet: 1 });
      this.chamberReverb.connect(this.musicGain);

      // Ping-pong delay for stereo width — feeds the cathedral verb.
      this.pingPongDelay = new Tone.PingPongDelay({ delayTime: '4n.', feedback: 0.25, wet: 0.4 });
      this.pingPongDelay.connect(this.reverb);

      // Chorus on the pad path for thickness.
      this.chorus = new Tone.Chorus({ frequency: 0.35, depth: 0.6, wet: 0.45 });

      // Dark delay chain — long feedback through a lowpass filter into chamber verb.
      this.darkDelay = new Tone.FeedbackDelay({ delayTime: '2n.', feedback: 0.15, wet: 0.5 });
      this.darkFilter = new Tone.Filter({ frequency: 500, type: 'lowpass', rolloff: -24 });
      this.darkDelay.connect(this.darkFilter);
      this.darkFilter.connect(this.chamberReverb);

      this.unlocked = true;
    } catch {
      this.unlocked = false;
    }
  }

  // ── Volume ───────────────────────────────────────────────────────

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
  }
  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
  }
  getMusicVolume(): number { return this.musicVolume; }
  getSfxVolume(): number { return this.sfxVolume; }

  duckMusic(): void {
    if (!this.musicGain || this.ducked) return;
    this.ducked = true;
    const duckLevel = this.musicVolume * 0.3;
    this.musicGain.gain.linearRampToValueAtTime(duckLevel, Tone.now() + 0.3);
  }
  unduckMusic(): void {
    if (!this.musicGain || !this.ducked) return;
    this.ducked = false;
    this.musicGain.gain.linearRampToValueAtTime(this.musicVolume, Tone.now() + 0.5);
  }

  crossfadeOut(duration = 0.5): void {
    if (!this.musicGain) return;
    this.musicGain.gain.linearRampToValueAtTime(0.001, Tone.now() + duration);
  }

  // ── Menu Hum ─────────────────────────────────────────────────────
  //
  // 32-bar cycle at 56 BPM over Am-F-C-G (8 bars each).
  // 3-layer pad (fatsine/sine/sawtooth) through dual reverb +
  // DuoSynth lead with vibrato + 3 melody variations +
  // FM bell accents + heartbeat sub-pulse + breathing noise.
  // 7-section structural arc automates per-channel dynamics.

  playMenuHum(): void {
    if (!this.unlocked || this.menuActive) return;
    this.menuActive = true;
    this.stopAmbience();

    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = 56;

    const barSec = 60 / 56 * 4; // seconds per bar at 56 BPM

    // ── Per-channel gain nodes for structural arc ──────────────────
    // Initial values are the Intro section (bars 0-1): drone only.
    const padAGain = new Tone.Gain(Tone.dbToGain(-24)).connect(this.musicGain);
    const padBGain = new Tone.Gain(Tone.dbToGain(-24)).connect(this.musicGain);
    const padCGain = new Tone.Gain(Tone.dbToGain(-30)).connect(this.musicGain);
    const leadGain = new Tone.Gain(Tone.dbToGain(-40)).connect(this.musicGain);
    const bellGain = new Tone.Gain(Tone.dbToGain(-30)).connect(this.musicGain);
    const hbGain = new Tone.Gain(0).connect(this.reverb);
    this.menuDisposables.push(padAGain, padBGain, padCGain, leadGain, bellGain, hbGain);

    // ── Drone bed ──────────────────────────────────────────────────
    const drone1 = new Tone.Synth({
      oscillator: { type: 'fatsine', count: 3, spread: 8 } as any,
      envelope: { attack: 3.0, decay: 0.5, sustain: 0.8, release: 5.0 },
    });
    drone1.volume.value = -16;
    drone1.connect(this.musicGain);
    drone1.triggerAttack('C2');
    this.menuDisposables.push(drone1);

    const drone2 = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 2.5, decay: 0.4, sustain: 0.7, release: 4.0 },
    });
    drone2.volume.value = -20;
    drone2.connect(this.musicGain);
    drone2.triggerAttack('G2');
    this.menuDisposables.push(drone2);

    const drone3 = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 2.0, decay: 0.3, sustain: 0.6, release: 3.0 },
    });
    drone3.volume.value = -22;
    drone3.connect(this.musicGain);
    drone3.triggerAttack('C3');
    this.menuDisposables.push(drone3);

    // ── 3-layer pad ────────────────────────────────────────────────
    // Pad A: fatsine → chorus → filter+LFO (350-2000Hz) → padAGain
    const padAFilter = new Tone.Filter({ frequency: 600, type: 'lowpass', rolloff: -12, Q: 0.3 });
    const padALfo = new Tone.LFO({ frequency: 0.09, min: 350, max: 2000, type: 'sine' });
    padALfo.connect(padAFilter.frequency);
    padALfo.start();
    const padA = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 6,
      oscillator: { type: 'fatsine', count: 3, spread: 12 } as any,
      envelope: { attack: 2.0, decay: 0.8, sustain: 0.35, release: 4.0 },
    } as any);
    padA.volume.value = -10;
    padA.connect(this.chorus);
    this.chorus.connect(padAFilter);
    padAFilter.connect(padAGain);
    // Wet send: filtered pad → ping-pong delay → cathedral verb
    const padASend = new Tone.Gain(0.30);
    padAFilter.connect(padASend);
    padASend.connect(this.pingPongDelay);
    this.menuDisposables.push(padA, padAFilter, padALfo, padASend);

    // Pad B: sine → direct to musicGain (body, no filter)
    const padB = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 2.5, decay: 0.6, sustain: 0.4, release: 5.0 },
    } as any);
    padB.volume.value = -12;
    padB.connect(padBGain);
    this.menuDisposables.push(padB);

    // Pad C: sawtooth → filter+LFO (260-1200Hz, phase offset) → chamber verb
    const padCFilter = new Tone.Filter({ frequency: 400, type: 'lowpass', rolloff: -24, Q: 0.3 });
    const padCLfo = new Tone.LFO({ frequency: 0.11, min: 260, max: 1200, type: 'sine', phase: 90 });
    padCLfo.connect(padCFilter.frequency);
    padCLfo.start();
    const padC = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 6,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 3.0, decay: 1.0, sustain: 0.25, release: 6.0 },
    } as any);
    padC.volume.value = -18;
    padC.connect(padCFilter);
    padCFilter.connect(padCGain);
    // Wet send: dark delay → dark filter → chamber verb
    const padCSend = new Tone.Gain(0.40);
    padCFilter.connect(padCSend);
    padCSend.connect(this.darkDelay);
    this.menuDisposables.push(padC, padCFilter, padCLfo, padCSend);

    // ── Chord progression — all 3 pads play Am-F-C-G ─────────────
    const chords: [string, string, string, string][] = [
      ['A3', 'C4', 'E4', 'A4'],
      ['F3', 'A3', 'C4', 'F4'],
      ['C4', 'E4', 'G4', 'C5'],
      ['G3', 'B3', 'D4', 'G4'],
    ];
    let chordIdx = 0;
    const chordLoop = new Tone.Loop((time) => {
      const c = chords[chordIdx % 4];
      const vel = 0.06;
      // Stagger pad attacks for organic texture
      padA.triggerAttackRelease(c, '7.8m', time, vel);
      padB.triggerAttackRelease(c, '7.6m', time + 0.04, vel * 0.8);
      padC.triggerAttackRelease(c, '7.4m', time + 0.08, vel * 0.5);
      chordIdx++;
    }, '8m').start(0);
    this.menuDisposables.push(chordLoop as unknown as Disposable);

    // ── Lead: DuoSynth with vibrato ──────────────────────────────
    const leadFilter = new Tone.Filter({ frequency: 2000, type: 'lowpass', rolloff: -12, Q: 0.4 });
    const leadLfo = new Tone.LFO({ frequency: 0.07, min: 800, max: 3000, type: 'sine' });
    leadLfo.connect(leadFilter.frequency);
    leadLfo.start();
    const lead = new Tone.DuoSynth({
      vibratoAmount: 0.3,
      vibratoRate: 5.5,
      harmonicity: 1.5,
      voice0: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.06, decay: 0.15, sustain: 0.25, release: 0.8 },
        filterEnvelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.4, baseFrequency: 400, octaves: 2 },
      },
      voice1: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.04, decay: 0.12, sustain: 0.2, release: 0.6 },
        filterEnvelope: { attack: 0.01, decay: 0.08, sustain: 0.4, release: 0.3, baseFrequency: 300, octaves: 2.5 },
      },
    });
    lead.volume.value = -14;
    lead.connect(leadFilter);
    leadFilter.connect(leadGain);
    // Wet send to ping-pong delay
    const leadSend = new Tone.Gain(0.30);
    leadFilter.connect(leadSend);
    leadSend.connect(this.pingPongDelay);
    this.menuDisposables.push(lead, leadFilter, leadLfo, leadSend);

    // ── 3 melody variations, cycling every 8 bars ────────────────
    // Var A (floating): A4-C5-A4-D5-E5-D5-C5
    // Var B (introspective): E4-G4-A4-C5-D5-C5-A4-G4-E4
    // Var C (ascending): A4-C5-E5-D5-C5-A4-C5-D5-E5
    const melodyNotes: { time: string; note: string; dur: string; vel: number }[] = [
      // Variation A — bars 0-7
      { time: '1:0:0',  note: 'A4', dur: '2n.', vel: 0.10 },
      { time: '3:0:0',  note: 'C5', dur: '4n',  vel: 0.08 },
      { time: '3:2:0',  note: 'A4', dur: '8n.', vel: 0.09 },
      { time: '4:0:0',  note: 'D5', dur: '2n',  vel: 0.07 },
      { time: '5:2:0',  note: 'E5', dur: '2n',  vel: 0.09 },
      { time: '6:2:0',  note: 'D5', dur: '4n.', vel: 0.08 },
      { time: '7:0:0',  note: 'C5', dur: '1n',  vel: 0.10 },
      // Variation B — bars 8-15
      { time: '8:0:0',  note: 'E4', dur: '4n',  vel: 0.08 },
      { time: '8:2:0',  note: 'G4', dur: '4n',  vel: 0.07 },
      { time: '9:0:0',  note: 'A4', dur: '2n',  vel: 0.09 },
      { time: '10:0:0', note: 'C5', dur: '2n',  vel: 0.08 },
      { time: '11:0:0', note: 'D5', dur: '4n',  vel: 0.07 },
      { time: '11:2:0', note: 'C5', dur: '4n',  vel: 0.06 },
      { time: '12:0:0', note: 'A4', dur: '2n',  vel: 0.09 },
      { time: '13:0:0', note: 'G4', dur: '4n',  vel: 0.07 },
      { time: '13:2:0', note: 'E4', dur: '2n.', vel: 0.08 },
      // Variation C — bars 16-23
      { time: '16:0:0', note: 'A4', dur: '4n',  vel: 0.09 },
      { time: '16:2:0', note: 'C5', dur: '4n',  vel: 0.08 },
      { time: '17:0:0', note: 'E5', dur: '2n',  vel: 0.10 },
      { time: '18:0:0', note: 'D5', dur: '4n',  vel: 0.07 },
      { time: '18:2:0', note: 'C5', dur: '4n',  vel: 0.07 },
      { time: '19:0:0', note: 'A4', dur: '2n',  vel: 0.09 },
      { time: '20:0:0', note: 'C5', dur: '4n',  vel: 0.08 },
      { time: '20:2:0', note: 'D5', dur: '4n',  vel: 0.08 },
      { time: '21:0:0', note: 'E5', dur: '2n.', vel: 0.10 },
      // Variation A (reprise) — bars 24-31
      { time: '24:0:0', note: 'A4', dur: '2n.', vel: 0.09 },
      { time: '26:0:0', note: 'C5', dur: '4n',  vel: 0.07 },
      { time: '26:2:0', note: 'A4', dur: '8n.', vel: 0.08 },
      { time: '27:0:0', note: 'D5', dur: '2n',  vel: 0.07 },
      { time: '28:2:0', note: 'E5', dur: '2n',  vel: 0.08 },
      { time: '29:2:0', note: 'D5', dur: '4n.', vel: 0.07 },
      { time: '30:2:0', note: 'C5', dur: '2n.', vel: 0.09 },
    ];
    const melodyPart = new Tone.Part((time, v) => {
      lead.triggerAttackRelease(v.note, v.dur, time, v.vel);
    }, melodyNotes);
    melodyPart.loop = true;
    melodyPart.loopEnd = '32:0:0';
    melodyPart.start(0);
    this.menuDisposables.push(melodyPart as unknown as Disposable);

    // ── Bell accents — FM temple bell ─────────────────────────────
    const bellSynth = new Tone.FMSynth({
      harmonicity: 3.77,
      modulationIndex: 8,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.005, decay: 2.5, sustain: 0, release: 0.5 },
      modulationEnvelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 0.3 },
    });
    bellSynth.volume.value = -18;
    bellSynth.connect(bellGain);
    bellSynth.connect(this.reverb);
    this.menuDisposables.push(bellSynth);

    const bellPart = new Tone.Part(
      (time, v) => { bellSynth.triggerAttackRelease(v.note, '2m', time, v.vel); },
      [
        { time: '0:0:0',  note: 'A3', vel: 0.06 },
        { time: '8:0:0',  note: 'E4', vel: 0.05 },
        { time: '16:0:0', note: 'A3', vel: 0.07 },
        { time: '24:0:0', note: 'D4', vel: 0.05 },
      ],
    );
    bellPart.loop = true;
    bellPart.loopEnd = '32:0:0';
    bellPart.start(0);
    this.menuDisposables.push(bellPart as unknown as Disposable);

    // ── Heartbeat sub-pulse — 42Hz through reverb ────────────────
    const hbOsc = new Tone.Oscillator({ frequency: 42, type: 'sine' });
    const hbLfo = new Tone.LFO({ frequency: 0.9, min: 0, max: 0.14, type: 'sine' });
    hbLfo.connect(hbGain.gain);
    hbLfo.start();
    hbOsc.connect(hbGain);
    hbOsc.start();
    this.menuDisposables.push(hbOsc, hbLfo);

    // ── Brown noise with breathing filter LFO ─────────────────────
    const noise = new Tone.Noise('brown');
    const noiseFilter = new Tone.Filter({ frequency: 350, type: 'lowpass', rolloff: -24 });
    const noiseLfo = new Tone.LFO({ frequency: 0.06, min: 180, max: 500, type: 'sine' });
    noiseLfo.connect(noiseFilter.frequency);
    noiseLfo.start();
    const noiseGain = new Tone.Gain(0.020);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.musicGain);
    noise.start();
    this.menuDisposables.push(noise, noiseFilter, noiseLfo, noiseGain);

    // ── 7-section structural arc ──────────────────────────────────
    // Transitions at bars 2, 6, 10, 14, 18, 22 (Intro implicit at 0)
    const arcSections = [
      { bar: '2:0:0',  master: -7,  padA: -11, padB: -13, padC: -14, lead: -13, bell: -16, hb: -10 }, // Emergence
      { bar: '6:0:0',  master: -6,  padA: -9,  padB: -11, padC: -12, lead: -11, bell: -14, hb: -8  }, // Deepening
      { bar: '10:0:0', master: -6,  padA: -10, padB: -12, padC: -13, lead: -11, bell: -14, hb: -9  }, // Reflection
      { bar: '14:0:0', master: -5,  padA: -8,  padB: -10, padC: -11, lead: -14, bell: -12, hb: -7  }, // The Abyss
      { bar: '18:0:0', master: -5,  padA: -8,  padB: -10, padC: -11, lead: -10, bell: -12, hb: -8  }, // Ascent
      { bar: '22:0:0', master: -18, padA: -20, padB: -22, padC: -26, lead: -28, bell: -22, hb: -18 }, // Outro
    ];
    const arcPart = new Tone.Part((time, s: Record<string, number>) => {
      const ramp = barSec * 1.5;
      this.musicGain.gain.linearRampToValueAtTime(Tone.dbToGain(s.master), time + ramp);
      padAGain.gain.linearRampToValueAtTime(Tone.dbToGain(s.padA), time + ramp);
      padBGain.gain.linearRampToValueAtTime(Tone.dbToGain(s.padB), time + ramp);
      padCGain.gain.linearRampToValueAtTime(Tone.dbToGain(s.padC), time + ramp);
      leadGain.gain.linearRampToValueAtTime(Tone.dbToGain(s.lead), time + ramp);
      bellGain.gain.linearRampToValueAtTime(Tone.dbToGain(s.bell), time + ramp);
      hbGain.gain.linearRampToValueAtTime(Tone.dbToGain(s.hb), time + ramp);
    }, arcSections);
    arcPart.loop = true;
    arcPart.loopEnd = '32:0:0';
    arcPart.start(0);
    this.menuDisposables.push(arcPart as unknown as Disposable);

    // Ramp into Intro level so transitions are smooth.
    this.musicGain.gain.linearRampToValueAtTime(Tone.dbToGain(-18), Tone.now() + 0.3);

    Tone.Transport.start();
  }

  stopMenuHum(): void {
    if (!this.menuActive) return;
    this.menuActive = false;

    // Crossfade: ramp musicGain down before disposing so the next
    // music state can ramp it back up over the same bus.
    this.musicGain.gain.linearRampToValueAtTime(0.001, Tone.now() + 0.4);

    const clean = () => {
      Tone.Transport.cancel();
      Tone.Transport.stop();
      Tone.Transport.position = 0;
      for (const d of this.menuDisposables) {
        try { d.dispose(); } catch { /* */ }
      }
      this.menuDisposables = [];
    };
    setTimeout(clean, 450);
  }

  // ── Dungeon Ambience — Per-Sphere Musical Themes ──────────────────

  startDungeonAmbience(sphereId?: string): void {
    if (!this.unlocked || this.ambienceActive) return;
    this.stopMenuHum();
    this.stopBossMusic();
    this.ambienceActive = true;

    const id = sphereId ?? 'moon';
    const cfg = SPHERE_MUSIC[id];
    if (!cfg) { this.ambienceActive = false; return; }

    const bpm = cfg.getBPM(cfg.bpm);
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;
    const barSec = 60 / bpm * 4;
    const loopSec = barSec * cfg.loopBars;

    // ── Lead synth ──────────────────────────────────────────────────
    let lead: Tone.Synth | Tone.DuoSynth | Tone.FMSynth;
    switch (cfg.leadType) {
      case 'duo':
        lead = new Tone.DuoSynth({
          vibratoAmount: 0.25, vibratoRate: 5,
          harmonicity: 1.4,
          voice0: { oscillator: { type: 'triangle' }, envelope: { attack: 0.04, decay: 0.2, sustain: 0.22, release: 0.7 } },
          voice1: { oscillator: { type: 'sine' }, envelope: { attack: 0.03, decay: 0.15, sustain: 0.18, release: 0.5 } },
        });
        break;
      case 'fm':
        lead = new Tone.FMSynth({
          harmonicity: 2.5, modulationIndex: 6,
          oscillator: { type: 'sine' },
          modulation: { type: 'sine' },
          envelope: { attack: 0.01, decay: 0.4, sustain: 0.15, release: 0.6 },
          modulationEnvelope: { attack: 0.005, decay: 0.25, sustain: 0, release: 0.3 },
        });
        break;
      case 'sawtooth':
        lead = new Tone.Synth({
          oscillator: { type: 'fatsawtooth', count: 2, spread: 6 } as any,
          envelope: { attack: 0.03, decay: 0.3, sustain: 0.2, release: 0.8 },
        });
        break;
      case 'square':
        lead = new Tone.Synth({
          oscillator: { type: 'square', width: 0.4 } as any,
          envelope: { attack: 0.02, decay: 0.2, sustain: 0.18, release: 0.5 },
        });
        break;
      default:
        lead = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.05, decay: 0.3, sustain: 0.25, release: 1.0 },
        });
    }
    lead.volume.value = -16;
    const leadSend = new Tone.Gain(0.25);
    lead.connect(this.reverb);
    lead.connect(leadSend);
    leadSend.connect(this.pingPongDelay);
    this.ambienceDisposables.push(lead as unknown as Disposable, leadSend);

    // ── Pad — PolySynth with filter+LFO ────────────────────────────
    const padFilter = new Tone.Filter({
      frequency: cfg.pad.filterLow, type: 'lowpass', rolloff: -12, Q: 0.3,
    });
    const padLfo = new Tone.LFO({
      frequency: cfg.pad.lfoRate, min: cfg.pad.filterLow, max: cfg.pad.filterHigh, type: 'sine',
    });
    padLfo.connect(padFilter.frequency);
    padLfo.start();

    const pad = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 8,
      oscillator: { type: cfg.pad.waveform as any, count: 3, spread: cfg.pad.spread } as any,
      envelope: { attack: 2.0, decay: 0.8, sustain: 0.3, release: 4.0 },
    } as any);
    pad.volume.value = cfg.pad.vol;
    pad.connect(this.chorus);
    this.chorus.connect(padFilter);
    padFilter.connect(this.musicGain);
    const padReverbSend = new Tone.Gain(0.35);
    padFilter.connect(padReverbSend);
    padReverbSend.connect(this.reverb);
    this.ambienceDisposables.push(pad, padFilter, padLfo, padReverbSend);

    // ── Chord loop ──────────────────────────────────────────────────
    let chordIdx = 0;
    const chordLoop = new Tone.Loop((time) => {
      const c = cfg.chordProg[chordIdx % cfg.chordProg.length];
      pad.triggerAttackRelease(c, '7.8m', time, 0.05);
      chordIdx++;
    }, '8m').start(0);
    this.ambienceDisposables.push(chordLoop as unknown as Disposable);

    // ── Bass ────────────────────────────────────────────────────────
    const bassSynth = new Tone.Synth({
      oscillator: { type: cfg.bass.type as any },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.5, release: 1.0 },
    });
    bassSynth.volume.value = cfg.bass.vol;
    bassSynth.connect(this.musicGain);
    this.ambienceDisposables.push(bassSynth);

    let bassOnRoot = true;
    const bassLoop = new Tone.Loop((time) => {
      const note = bassOnRoot ? cfg.bass.root : (cfg.bass.fifth ?? cfg.bass.root);
      bassSynth.triggerAttackRelease(note, cfg.bass.rhythm, time, 0.7);
      bassOnRoot = !bassOnRoot;
    }, cfg.bass.rhythm).start(0);
    this.ambienceDisposables.push(bassLoop as unknown as Disposable);

    // ── Melody ──────────────────────────────────────────────────────
    const melodyPart = new Tone.Part((time, v) => {
      lead.triggerAttackRelease(v.note, v.dur, time, v.vel);
    }, cfg.melody);
    melodyPart.loop = true;
    melodyPart.loopEnd = `${cfg.loopBars}:0:0`;
    melodyPart.start(0);
    this.ambienceDisposables.push(melodyPart as unknown as Disposable);

    // ── Texture layers ──────────────────────────────────────────────
    switch (cfg.texture) {
      case 'pink-surf': {
        const surfNoise = new Tone.Noise('pink');
        const surfFilter = new Tone.Filter({ frequency: 400, type: 'lowpass', rolloff: -24 });
        const surfLfo = new Tone.LFO({ frequency: 0.06, min: 200, max: 800, type: 'sine' });
        surfLfo.connect(surfFilter.frequency);
        surfLfo.start();
        const surfGain = new Tone.Gain(0.015);
        surfNoise.connect(surfFilter);
        surfFilter.connect(surfGain);
        surfGain.connect(this.musicGain);
        surfNoise.start();
        this.ambienceDisposables.push(surfNoise, surfFilter, surfLfo, surfGain);
        break;
      }
      case 'high-shimmer': {
        const shimmer = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 1.5, decay: 0.3, sustain: 0.5, release: 2.0 },
        });
        shimmer.volume.value = -28;
        shimmer.connect(this.pingPongDelay);
        shimmer.triggerAttack('E6');
        this.ambienceDisposables.push(shimmer);
        break;
      }
      case 'pulse-sub': {
        const subOsc = new Tone.Oscillator({ frequency: 40, type: 'sine' });
        const subGain = new Tone.Gain(0);
        const subLfo = new Tone.LFO({ frequency: 0.7, min: 0, max: 0.08, type: 'sine' });
        subLfo.connect(subGain.gain);
        subLfo.start();
        subOsc.connect(subGain);
        subGain.connect(this.reverb);
        subOsc.start();
        this.ambienceDisposables.push(subOsc as unknown as Disposable, subGain, subLfo);
        break;
      }
      case 'marching': {
        const marchNoise = new Tone.Noise('white');
        const marchFilter = new Tone.Filter({ frequency: 1000, type: 'bandpass', rolloff: -24, Q: 2 });
        const marchEnv = new Tone.Gain(0);
        marchNoise.connect(marchFilter);
        marchFilter.connect(marchEnv);
        marchEnv.connect(this.musicGain);
        marchNoise.start();
        const marchLoop = new Tone.Loop((time) => {
          marchEnv.gain.setValueAtTime(0.03, time);
          marchEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        }, '4n').start(0);
        this.ambienceDisposables.push(marchNoise, marchFilter, marchEnv, marchLoop as unknown as Disposable);
        break;
      }
      case 'war-drums': {
        const drumNoise = new Tone.Noise('brown');
        const drumFilter = new Tone.Filter({ frequency: 200, type: 'lowpass', rolloff: -24 });
        const drumEnv = new Tone.Gain(0);
        drumNoise.connect(drumFilter);
        drumFilter.connect(drumEnv);
        drumEnv.connect(this.musicGain);
        drumNoise.start();
        // Aggressive 8th-note pattern with accents
        const drumLoop = new Tone.Loop((time) => {
          const vel = (Tone.Transport.position as string).endsWith(':0:0') ? 0.06 : 0.025;
          drumEnv.gain.setValueAtTime(vel, time);
          drumEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
        }, '8n').start(0);
        this.ambienceDisposables.push(drumNoise, drumFilter, drumEnv, drumLoop as unknown as Disposable);
        break;
      }
      case 'timpani': {
        const timp = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.01, decay: 1.5, sustain: 0, release: 0.5 },
        });
        timp.volume.value = -18;
        timp.connect(this.chamberReverb);
        const timpLoop = new Tone.Loop((time) => {
          timp.triggerAttackRelease('G2', '2n', time, 0.06);
        }, '2m').start(0);
        this.ambienceDisposables.push(timp, timpLoop as unknown as Disposable);
        break;
      }
      case 'clock': {
        const tick = new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
        });
        tick.volume.value = -22;
        tick.connect(this.chamberReverb);
        const tickLoop = new Tone.Loop((time) => {
          tick.triggerAttackRelease('C6', '64n', time, 0.03);
        }, '8n').start(0);
        // Funeral bell on downbeats
        const bell = new Tone.FMSynth({
          harmonicity: 3.77, modulationIndex: 8,
          oscillator: { type: 'sine' },
          modulation: { type: 'sine' },
          envelope: { attack: 0.002, decay: 2.5, sustain: 0, release: 0.5 },
          modulationEnvelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 0.3 },
        });
        bell.volume.value = -20;
        bell.connect(this.reverb);
        const bellLoop = new Tone.Loop((time) => {
          bell.triggerAttackRelease('B3', '2m', time, 0.04);
        }, '4m').start(0);
        this.ambienceDisposables.push(tick, tickLoop as unknown as Disposable, bell, bellLoop as unknown as Disposable);
        break;
      }
      case 'none':
        break;
    }

    // Crossfade in
    this.musicGain.gain.linearRampToValueAtTime(this.musicVolume, Tone.now() + 0.6);
    Tone.Transport.start();
  }

  stopAmbience(): void {
    if (!this.ambienceActive) return;
    this.ambienceActive = false;
    this.musicGain.gain.linearRampToValueAtTime(0.001, Tone.now() + 0.4);

    const clean = () => {
      Tone.Transport.cancel();
      Tone.Transport.stop();
      Tone.Transport.position = 0;
      for (const d of this.ambienceDisposables) {
        try { d.dispose(); } catch { /* */ }
      }
      this.ambienceDisposables = [];
    };
    setTimeout(clean, 450);
  }

  // ── Cinematic Pads — Narrative Arcs ───────────────────────────────

  playCinematicPad(mood: CinematicMood = 'cosmos'): () => void {
    if (!this.unlocked) return () => undefined;
    const now = Tone.now();
    const d: Disposable[] = [];
    const dur = 28; // seconds for the arc

    switch (mood) {
      case 'cosmos': {
        // Single tone → Fmaj9 pad swell → floating melody → ethereal peak → dissolve
        const pad = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 6,
          oscillator: { type: 'fatsine', count: 3, spread: 14 } as any,
          envelope: { attack: 6.0, decay: 2.0, sustain: 0.4, release: 8.0 },
        } as any);
        pad.volume.value = -22;
        pad.connect(this.reverb);
        pad.triggerAttack(['F2', 'A2', 'C3', 'E3', 'G3', 'C4']);
        d.push(pad);

        const padGain = new Tone.Gain(0);
        pad.connect(padGain);
        padGain.connect(this.reverb);
        pad.disconnect(this.reverb);
        pad.connect(padGain);
        padGain.gain.setValueAtTime(0, now);
        padGain.gain.linearRampToValueAtTime(0.7, now + 8);
        d.push(padGain);

        // Floating melody — high sine, delayed entry
        const flute = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.8, decay: 0.5, sustain: 0.3, release: 2.0 },
        });
        flute.volume.value = -24;
        flute.connect(this.pingPongDelay);
        d.push(flute);
        const flutePart = new Tone.Part((t, v) => {
          flute.triggerAttackRelease(v.note, v.dur, t, v.vel);
        }, [
          { time: '8:0:0', note: 'C5', dur: '2n', vel: 0.07 },
          { time: '12:0:0', note: 'E5', dur: '2n', vel: 0.08 },
          { time: '16:0:0', note: 'G5', dur: '4n', vel: 0.09 },
          { time: '18:0:0', note: 'A5', dur: '2n.', vel: 0.10 },
          { time: '22:0:0', note: 'G5', dur: '2n', vel: 0.07 },
        ]).start(0);
        d.push(flutePart as unknown as Disposable);
        break;
      }
      case 'descent': {
        // Dark rumble → mysterious Dm9 pad → descending melody → tension → abrupt silence
        const rumble = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.5, decay: 1.0, sustain: 0.6, release: 1.0 },
        });
        rumble.volume.value = -18;
        rumble.connect(this.musicGain);
        rumble.triggerAttack('D1');
        d.push(rumble);

        const pad = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 5,
          oscillator: { type: 'fatsine', count: 2, spread: 8 } as any,
          envelope: { attack: 4.0, decay: 1.0, sustain: 0.4, release: 6.0 },
        } as any);
        pad.volume.value = -20;
        pad.connect(this.reverb);
        d.push(pad);
        pad.triggerAttack(['D3', 'F3', 'A3', 'C4', 'E4']);

        const filter = new Tone.Filter({ frequency: 250, type: 'lowpass', rolloff: -12 });
        pad.disconnect(this.reverb);
        pad.connect(filter);
        filter.connect(this.reverb);
        filter.frequency.linearRampToValueAtTime(1200, now + 14);
        d.push(filter);

        // Descending melody
        const lead = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.3, decay: 0.4, sustain: 0.2, release: 1.5 },
        });
        lead.volume.value = -22;
        lead.connect(this.reverb);
        d.push(lead);
        const notes = ['D5', 'C5', 'Bb4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4', 'F4'];
        notes.forEach((note, i) => {
          const t = now + 4 + i * 1.4;
          lead.triggerAttackRelease(note, '2n', t, 0.06 - i * 0.004);
        });
        break;
      }
      case 'boss': {
        // Aggressive Fm stabs → war drums → climactic fanfare → sustained Fmadd9
        const stab = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 4,
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.02, decay: 0.6, sustain: 0.1, release: 1.0 },
        } as any);
        stab.volume.value = -14;
        stab.connect(this.musicGain);
        d.push(stab);

        // Three stabs
        ['0:0:0', '2:0:0', '4:0:0'].forEach((t, i) => {
          const chord = i === 2 ? ['F2', 'C3', 'F3', 'G#3', 'C4', 'G4'] : ['F2', 'C3', 'F3', 'G#3'];
          stab.triggerAttackRelease(chord, '2n', Tone.Time(t).toSeconds(), 0.12);
        });

        // War drum texture
        const drumN = new Tone.Noise('brown');
        const drumF = new Tone.Filter({ frequency: 180, type: 'lowpass', rolloff: -24 });
        const drumG = new Tone.Gain(0);
        drumN.connect(drumF); drumF.connect(drumG); drumG.connect(this.musicGain);
        drumN.start();
        d.push(drumN, drumF, drumG);
        for (let i = 0; i < 8; i++) {
          const t = now + 4 + i * 0.5;
          drumG.gain.setValueAtTime(0.04, t);
          drumG.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        }

        // Sustained Fmadd9 — held tension
        const held = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 5,
          oscillator: { type: 'fatsine', count: 2, spread: 10 } as any,
          envelope: { attack: 2.0, decay: 0.5, sustain: 0.5, release: 4.0 },
        } as any);
        held.volume.value = -18;
        held.connect(this.reverb);
        held.triggerAttackRelease(['F2', 'C3', 'G#3', 'C4', 'G4'], '16n', now + 8, 0.06);
        d.push(held);
        break;
      }
      case 'ascent': {
        // Hopeful C4 → bright Cmaj7/G pad → growing Lydian texture → transcendent peak → peaceful Cmaj9
        const pad = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 7,
          oscillator: { type: 'fatsine', count: 3, spread: 16 } as any,
          envelope: { attack: 5.0, decay: 1.0, sustain: 0.5, release: 8.0 },
        } as any);
        pad.volume.value = -18;
        pad.connect(this.reverb);
        d.push(pad);

        // Gradual chord build
        pad.triggerAttack(['C3', 'G3'], now);
        pad.triggerAttack(['C3', 'G3', 'E4'], now + 6);
        pad.triggerAttack(['C3', 'G3', 'E4', 'B4'], now + 12);
        pad.triggerAttack(['C3', 'G3', 'E4', 'B4', 'D5'], now + 18);
        pad.triggerAttack(['C3', 'G3', 'E4', 'B4', 'D5', 'F#5'], now + 22);

        // Bright Cmaj9 chord to close
        const close = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 6,
          oscillator: { type: 'fatsine', count: 2, spread: 12 } as any,
          envelope: { attack: 3.0, decay: 0.5, sustain: 0.4, release: 6.0 },
        } as any);
        close.volume.value = -20;
        close.connect(this.reverb);
        close.triggerAttackRelease(['C3', 'E3', 'G3', 'B3', 'D4'], '4n', now + dur, 0.05);
        d.push(close);
        break;
      }
    }

    this.cinematicDisposables.push(...d);

    return () => {
      this.musicGain.gain.linearRampToValueAtTime(0.001, Tone.now() + 0.8);
      setTimeout(() => {
        for (const x of d) { try { x.dispose(); } catch { /* */ } }
      }, 1000);
    };
  }

  playCinematicChime(): void {
    if (!this.unlocked) return;

    const now = Tone.now();
    const chime1 = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0, release: 0.15 },
    });
    chime1.volume.value = -10;
    chime1.connect(this.sfxGain);
    chime1.triggerAttackRelease('A5', '32n', now);

    const chime2 = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0, release: 0.1 },
    });
    chime2.volume.value = -14;
    chime2.connect(this.sfxGain);
    chime2.triggerAttackRelease('E6', '32n', now + 0.03);

    setTimeout(() => { chime1.dispose(); chime2.dispose(); }, 600);
  }

  // ── Boss Music ────────────────────────────────────────────────────

  startBossMusic(sphereId: string): void {
    if (!this.unlocked || this.bossMusicActive) return;
    this.stopAmbience();
    this.bossMusicActive = true;
    this.bossMusicPhase = 1;

    const cfg = SPHERE_MUSIC[sphereId];
    if (!cfg) { this.bossMusicActive = false; return; }

    const bpm = cfg.getBPM(cfg.bpm) + 8;
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;

    // ── Intensified pad ──────────────────────────────────────────────
    const padFilter = new Tone.Filter({ frequency: cfg.pad.filterLow, type: 'lowpass', rolloff: -12, Q: 0.3 });
    const padLfo = new Tone.LFO({ frequency: cfg.pad.lfoRate * 1.3, min: cfg.pad.filterLow, max: cfg.pad.filterHigh, type: 'sine' });
    padLfo.connect(padFilter.frequency);
    padLfo.start();

    const pad = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 8,
      oscillator: { type: cfg.pad.waveform as any, count: 3, spread: cfg.pad.spread } as any,
      envelope: { attack: 1.5, decay: 0.6, sustain: 0.35, release: 3.0 },
    } as any);
    pad.volume.value = cfg.pad.vol + 2;
    pad.connect(this.chorus);
    this.chorus.connect(padFilter);
    padFilter.connect(this.musicGain);
    this.bossMusicDisposables.push(pad, padFilter, padLfo);

    // Chord loop
    let chordIdx = 0;
    const chordLoop = new Tone.Loop((time) => {
      const c = cfg.chordProg[chordIdx % cfg.chordProg.length];
      pad.triggerAttackRelease(c, '7.6m', time, 0.06);
      chordIdx++;
    }, '8m').start(0);
    this.bossMusicDisposables.push(chordLoop as unknown as Disposable);

    // ── Bass — more present ──────────────────────────────────────────
    const bassSynth = new Tone.Synth({
      oscillator: { type: cfg.bass.type as any },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.8 },
    });
    bassSynth.volume.value = cfg.bass.vol + 3;
    bassSynth.connect(this.musicGain);
    this.bossMusicDisposables.push(bassSynth);

    let bassOnRoot = true;
    const bassLoop = new Tone.Loop((time) => {
      const note = bassOnRoot ? cfg.bass.root : (cfg.bass.fifth ?? cfg.bass.root);
      bassSynth.triggerAttackRelease(note, cfg.bass.rhythm, time, 0.75);
      bassOnRoot = !bassOnRoot;
    }, cfg.bass.rhythm).start(0);
    this.bossMusicDisposables.push(bassLoop as unknown as Disposable);

    // ── Lead ─────────────────────────────────────────────────────────
    let lead: Tone.Synth | Tone.FMSynth | Tone.DuoSynth;
    switch (cfg.leadType) {
      case 'fm':
        lead = new Tone.FMSynth({
          harmonicity: 2.5, modulationIndex: 8,
          oscillator: { type: 'sine' }, modulation: { type: 'sine' },
          envelope: { attack: 0.01, decay: 0.35, sustain: 0.15, release: 0.5 },
          modulationEnvelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.3 },
        });
        break;
      case 'sawtooth':
        lead = new Tone.Synth({
          oscillator: { type: 'fatsawtooth', count: 2, spread: 8 } as any,
          envelope: { attack: 0.02, decay: 0.25, sustain: 0.2, release: 0.6 },
        });
        break;
      default:
        lead = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.03, decay: 0.25, sustain: 0.22, release: 0.8 },
        });
    }
    lead.volume.value = -14;
    lead.connect(this.reverb);
    this.bossMusicDisposables.push(lead as unknown as Disposable);

    const melodyPart = new Tone.Part((time, v) => {
      lead.triggerAttackRelease(v.note, v.dur, time, v.vel);
    }, cfg.melody);
    melodyPart.loop = true;
    melodyPart.loopEnd = `${cfg.loopBars}:0:0`;
    melodyPart.start(0);
    this.bossMusicDisposables.push(melodyPart as unknown as Disposable);

    // ── Boss percussion — light kick on quarters ─────────────────────
    const kickN = new Tone.Noise('brown');
    const kickF = new Tone.Filter({ frequency: 140, type: 'lowpass', rolloff: -24 });
    const kickG = new Tone.Gain(0);
    kickN.connect(kickF); kickF.connect(kickG); kickG.connect(this.musicGain);
    kickN.start();
    const kickLoop = new Tone.Loop((time) => {
      kickG.gain.setValueAtTime(0.04, time);
      kickG.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    }, '4n').start(0);
    this.bossMusicDisposables.push(kickN, kickF, kickG, kickLoop as unknown as Disposable);

    this.musicGain.gain.linearRampToValueAtTime(this.musicVolume, Tone.now() + 0.5);
    Tone.Transport.start();
  }

  stopBossMusic(): void {
    if (!this.bossMusicActive) return;
    this.bossMusicActive = false;
    this.musicGain.gain.linearRampToValueAtTime(0.001, Tone.now() + 0.3);

    const clean = () => {
      Tone.Transport.cancel();
      Tone.Transport.stop();
      Tone.Transport.position = 0;
      for (const d of this.bossMusicDisposables) {
        try { d.dispose(); } catch { /* */ }
      }
      this.bossMusicDisposables = [];
      this.bossMusicPhase = 1;
    };
    setTimeout(clean, 350);
  }

  setBossPhase(phase: BossPhase): void {
    if (!this.bossMusicActive) return;
    this.bossMusicPhase = phase;
    const now = Tone.now();

    if (phase === 2) {
      // Intensify — boost music gain, faster LFO
      this.musicGain.gain.linearRampToValueAtTime(Math.min(1, this.musicVolume * 1.15), now + 0.3);
      // Add snare layer on backbeats
      const snareN = new Tone.Noise('white');
      const snareF = new Tone.Filter({ frequency: 800, type: 'bandpass', rolloff: -24, Q: 1.5 });
      const snareG = new Tone.Gain(0);
      snareN.connect(snareF); snareF.connect(snareG); snareG.connect(this.musicGain);
      snareN.start();
      const snareLoop = new Tone.Loop((time) => {
        snareG.gain.setValueAtTime(0.025, time);
        snareG.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      }, '2n').start(Tone.Time('4n').toSeconds());
      this.bossMusicDisposables.push(snareN, snareF, snareG, snareLoop as unknown as Disposable);
    }

    if (phase === 3) {
      // Maximum intensity — boost gain further
      this.musicGain.gain.linearRampToValueAtTime(Math.min(1, this.musicVolume * 1.3), now + 0.3);
      // Double-time percussion feel
      const hatN = new Tone.Noise('white');
      const hatF = new Tone.Filter({ frequency: 3000, type: 'highpass', rolloff: -12 });
      const hatG = new Tone.Gain(0);
      hatN.connect(hatF); hatF.connect(hatG); hatG.connect(this.musicGain);
      hatN.start();
      const hatLoop = new Tone.Loop((time) => {
        hatG.gain.setValueAtTime(0.015, time);
        hatG.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
      }, '8n').start(0);
      this.bossMusicDisposables.push(hatN, hatF, hatG, hatLoop as unknown as Disposable);
    }
  }

  // ── Screen Music ──────────────────────────────────────────────────

  playGameOverMusic(): void {
    if (!this.unlocked || this.gameOverActive) return;
    this.stopAmbience();
    this.stopMenuHum();
    this.gameOverActive = true;

    // Somber Am pad — sine waves through reverb
    const pad = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 2.0, decay: 0.5, sustain: 0.5, release: 4.0 },
    } as any);
    pad.volume.value = -14;
    pad.connect(this.reverb);
    pad.triggerAttack(['A2', 'C3', 'E3', 'A3']);
    this.screenDisposables.push(pad);

    // Funeral bell — tolls every 4 bars
    const bell = new Tone.FMSynth({
      harmonicity: 2.0,
      modulationIndex: 6,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.002, decay: 3.0, sustain: 0, release: 1.0 },
      modulationEnvelope: { attack: 0.001, decay: 1.5, sustain: 0, release: 0.5 },
    });
    bell.volume.value = -16;
    bell.connect(this.reverb);
    this.screenDisposables.push(bell);

    const bellLoop = new Tone.Loop((time) => {
      bell.triggerAttackRelease('A3', '2m', time, 0.05);
    }, '4m').start(0);
    this.screenDisposables.push(bellLoop as unknown as Disposable);

    // Deep sub for weight
    const sub = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 3.0, decay: 0.5, sustain: 0.6, release: 5.0 },
    });
    sub.volume.value = -20;
    sub.connect(this.musicGain);
    sub.triggerAttack('A1');
    this.screenDisposables.push(sub);

    Tone.Transport.bpm.value = 40;
    if (Tone.Transport.state !== 'started') Tone.Transport.start();
  }

  private stopScreenMusicCommon(): void {
    this.musicGain.gain.linearRampToValueAtTime(0.001, Tone.now() + 0.35);
    setTimeout(() => {
      for (const d of this.screenDisposables) {
        try { d.dispose(); } catch { /* */ }
      }
      this.screenDisposables = [];
      Tone.Transport.cancel();
    }, 400);
  }

  stopGameOverMusic(): void {
    if (!this.gameOverActive) return;
    this.gameOverActive = false;
    this.stopScreenMusicCommon();
  }

  playPrologueMusic(): void {
    if (!this.unlocked || this.prologueActive) return;
    this.stopMenuHum();
    this.prologueActive = true;

    // Mysterious Dm pad — starts dark, filter opens as a "reveal"
    const pad = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 4,
      oscillator: { type: 'fatsine', count: 2, spread: 6 } as any,
      envelope: { attack: 4.0, decay: 0.5, sustain: 0.5, release: 6.0 },
    } as any);
    pad.volume.value = -18;
    this.screenDisposables.push(pad);

    const filter = new Tone.Filter({ frequency: 300, type: 'lowpass', rolloff: -12, Q: 0.4 });
    pad.connect(filter);
    filter.connect(this.reverb);
    this.screenDisposables.push(filter);

    pad.triggerAttack(['D3', 'F3', 'A3', 'D4']);

    // Filter opens over 12s — the world is revealed
    filter.frequency.linearRampToValueAtTime(2000, Tone.now() + 12);

    // Sparse high D5 bell every 6 bars
    const bell = new Tone.FMSynth({
      harmonicity: 3.0,
      modulationIndex: 4,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.002, decay: 2.0, sustain: 0, release: 0.5 },
      modulationEnvelope: { attack: 0.001, decay: 1.0, sustain: 0, release: 0.3 },
    });
    bell.volume.value = -22;
    bell.connect(this.reverb);
    this.screenDisposables.push(bell);

    const bellLoop = new Tone.Loop((time) => {
      bell.triggerAttackRelease('D5', '1m', time, 0.03);
    }, '6m').start(0);
    this.screenDisposables.push(bellLoop as unknown as Disposable);

    Tone.Transport.bpm.value = 50;
    if (Tone.Transport.state !== 'started') Tone.Transport.start();
  }

  stopPrologueMusic(): void {
    if (!this.prologueActive) return;
    this.prologueActive = false;
    this.stopScreenMusicCommon();
  }

  playEpilogueMusic(): void {
    if (!this.unlocked || this.epilogueActive) return;
    this.stopAmbience();
    this.stopMenuHum();
    this.epilogueActive = true;

    // Triumphant Cmaj7 — bright fatsine pad through reverb
    const pad = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 6,
      oscillator: { type: 'fatsine', count: 3, spread: 10 } as any,
      envelope: { attack: 3.0, decay: 0.5, sustain: 0.5, release: 6.0 },
    } as any);
    pad.volume.value = -16;
    pad.connect(this.reverb);
    pad.triggerAttack(['C3', 'E3', 'G3', 'C4', 'E4']);
    this.screenDisposables.push(pad);

    // Golden bell — brighter FM ratio
    const bell = new Tone.FMSynth({
      harmonicity: 2.5,
      modulationIndex: 5,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.002, decay: 2.5, sustain: 0, release: 1.0 },
      modulationEnvelope: { attack: 0.001, decay: 1.5, sustain: 0, release: 0.5 },
    });
    bell.volume.value = -18;
    bell.connect(this.reverb);
    this.screenDisposables.push(bell);

    // Ascending bell sequence, loops while the player reads
    const bellPitches = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6', 'E6'];
    const bellSeq = new Tone.Sequence((time, note) => {
      bell.triggerAttackRelease(note, '2m', time, 0.04);
    }, bellPitches, '1m');
    bellSeq.loop = true;
    bellSeq.start(0);
    this.screenDisposables.push(bellSeq as unknown as Disposable);

    Tone.Transport.bpm.value = 60;
    if (Tone.Transport.state !== 'started') Tone.Transport.start();
  }

  stopEpilogueMusic(): void {
    if (!this.epilogueActive) return;
    this.epilogueActive = false;
    this.stopScreenMusicCommon();
  }

  playCodexMusic(): void {
    if (!this.unlocked || this.codexActive) return;
    this.stopMenuHum();
    this.codexActive = true;

    // Scholarly quiet — two soft sine layers, barely there
    const dr1 = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 2.0, decay: 0.5, sustain: 0.5, release: 3.0 },
    });
    dr1.volume.value = -28;
    dr1.connect(this.musicGain);
    dr1.triggerAttack('G2');
    this.screenDisposables.push(dr1);

    const dr2 = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 2.5, decay: 0.5, sustain: 0.4, release: 3.0 },
    });
    dr2.volume.value = -30;
    dr2.connect(this.reverb);
    dr2.triggerAttack('D3');
    this.screenDisposables.push(dr2);
  }

  stopCodexMusic(): void {
    if (!this.codexActive) return;
    this.codexActive = false;
    this.stopScreenMusicCommon();
  }

  // ── SFX ───────────────────────────────────────────────────────────

  sfx(name: SfxName): void {
    if (!this.unlocked) return;

    const now = Tone.now();

    const oneShot = (
      type: string, freq: number,
      attack: number, decay: number, peak: number,
    ): void => {
      const synth = new Tone.Synth({
        oscillator: { type: type as any },
        envelope: { attack, decay, sustain: 0.01, release: decay * 0.3 },
      });
      synth.volume.value = Tone.gainToDb(peak);
      synth.connect(this.sfxGain);
      synth.triggerAttackRelease(hzToNote(freq), attack + decay, now);
      setTimeout(() => synth.dispose(), (attack + decay + 0.2) * 1000);
    };

    switch (name) {
      case 'attack':
        oneShot('square', 400, 0.005, 0.15, 0.25); break;
      case 'dash':
        oneShot('triangle', 220, 0.005, 0.20, 0.20); break;
      case 'spell': {
        const s = new Tone.FMSynth({
          harmonicity: 2.0,
          modulationIndex: 6,
          oscillator: { type: 'sine' },
          modulation: { type: 'sine' },
          envelope: { attack: 0.01, decay: 0.35, sustain: 0.05, release: 0.2 },
          modulationEnvelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 },
        });
        s.volume.value = -12;
        s.connect(this.sfxGain);
        s.triggerAttackRelease('F5', '8n', now);
        setTimeout(() => s.dispose(), 600);
        break;
      }
      case 'enemyHit':
        oneShot('square', 180, 0.005, 0.18, 0.25); break;
      case 'playerHit':
        oneShot('sawtooth', 120, 0.005, 0.25, 0.30); break;
      case 'chest': {
        // Bright rising chime — two quick notes
        const c1 = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.005, decay: 0.25, sustain: 0, release: 0.1 },
        });
        c1.volume.value = -10;
        c1.connect(this.reverb);
        c1.triggerAttackRelease('B5', '16n', now);
        setTimeout(() => c1.dispose(), 400);

        const c2 = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.005, decay: 0.3, sustain: 0, release: 0.15 },
        });
        c2.volume.value = -12;
        c2.connect(this.reverb);
        c2.triggerAttackRelease('E6', '8n', now + 0.06);
        setTimeout(() => c2.dispose(), 500);
        break;
      }
      case 'shrine': {
        const ch1 = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.02, decay: 0.5, sustain: 0, release: 0.3 },
        });
        ch1.volume.value = -10;
        ch1.connect(this.reverb);
        ch1.triggerAttackRelease('A5', '4n', now);

        const ch2 = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.02, decay: 0.4, sustain: 0, release: 0.2 },
        });
        ch2.volume.value = -14;
        ch2.connect(this.reverb);
        ch2.triggerAttackRelease('E6', '4n', now + 0.04);

        setTimeout(() => { ch1.dispose(); ch2.dispose(); }, 1000);
        break;
      }
      case 'descend': {
        // Descending sweep — pitch drops like going down stairs
        const d = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.05, decay: 0.8, sustain: 0, release: 0.3 },
        });
        d.volume.value = -10;
        d.connect(this.sfxGain);
        d.frequency.setValueAtTime(220, now);
        d.frequency.exponentialRampToValueAtTime(55, now + 0.8);
        d.triggerAttackRelease('A3', '4n', now);
        setTimeout(() => d.dispose(), 1200);
        break;
      }
      case 'bossWarn':
        oneShot('sawtooth', 90, 0.02, 0.70, 0.30); break;
      case 'bossDeath': {
        const bd = new Tone.FMSynth({
          harmonicity: 2.5,
          modulationIndex: 10,
          oscillator: { type: 'sawtooth' },
          modulation: { type: 'sine' },
          envelope: { attack: 0.05, decay: 1.2, sustain: 0, release: 0.5 },
          modulationEnvelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 0.3 },
        });
        bd.volume.value = -8;
        bd.connect(this.sfxGain);
        bd.frequency.setValueAtTime(600, now);
        bd.frequency.exponentialRampToValueAtTime(80, now + 1.2);
        bd.triggerAttackRelease('C5', '2n', now);
        setTimeout(() => bd.dispose(), 2000);
        break;
      }
      case 'pickup':
        oneShot('sine', 900, 0.005, 0.12, 0.20); break;
      case 'doorLock':
        oneShot('sawtooth', 100, 0.01, 0.20, 0.25); break;
      case 'doorOpen':
        oneShot('sine', 440, 0.02, 0.30, 0.20); break;
      case 'menu': {
        const m = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.05 },
        });
        m.volume.value = -18;
        m.connect(this.sfxGain);
        m.triggerAttackRelease('E5', '32n', now);
        setTimeout(() => m.dispose(), 200);
        break;
      }
    }
  }

  // ── Global Control ────────────────────────────────────────────────

  stopAll(): void {
    this.stopMenuHum();
    this.stopAmbience();
    this.stopBossMusic();
    this.stopGameOverMusic();
    this.stopPrologueMusic();
    this.stopEpilogueMusic();
    this.stopCodexMusic();

    for (const d of this.cinematicDisposables) {
      try { d.dispose(); } catch { /* */ }
    }
    this.cinematicDisposables = [];

    Tone.Transport.cancel();
    Tone.Transport.stop();
  }
}

export const audio = new AudioSystem();
