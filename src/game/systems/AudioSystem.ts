import * as Tone from 'tone';
import type { AudioDiagnosticsSnapshot } from '../audio/audioDiagnostics';
import { peakToDb, CLIP_DB_THRESHOLD } from '../audio/audioDiagnostics';
import { createMixGraph } from '../audio/mixGraph';
import type { MixGraph } from '../audio/mixGraph';

export type SfxName =
  | 'menu' | 'attack' | 'dash' | 'spell' | 'enemyHit' | 'playerHit'
  | 'chest' | 'shrine' | 'descend' | 'bossWarn' | 'bossDeath' | 'pickup'
  | 'doorLock' | 'doorOpen';

export type CinematicMood = 'cosmos' | 'descent' | 'boss' | 'ascent';
export type BossPhase = 1 | 2 | 3;

type Disposable = { dispose(): void };

interface MelodyNote { time: string; note: string; dur: string; vel: number; }

const hzToNote = (f: number): string => Tone.Frequency(f, 'hz').toNote();
const transpose = (note: string, semitones: number): string => Tone.Frequency(note).transpose(semitones).toNote();

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
      // Arrival bars 0-7: sparse pedal hint
      { time:'0:0:0',note:'E4',dur:'2n',vel:0.05},{ time:'2:0:0',note:'C4',dur:'2n.',vel:0.05},
      // Answer bars 8-15: descending minor third + rising fourth
      { time:'8:0:0',note:'A4',dur:'4n',vel:0.10},{ time:'8:2:0',note:'G4',dur:'4n',vel:0.08},
      { time:'9:0:0',note:'E4',dur:'2n',vel:0.09},{ time:'10:2:0',note:'D4',dur:'4n',vel:0.07},
      { time:'11:0:0',note:'E4',dur:'4n',vel:0.07},{ time:'11:2:0',note:'A4',dur:'4n',vel:0.09},
      { time:'12:0:0',note:'C5',dur:'2n',vel:0.10},{ time:'14:0:0',note:'A4',dur:'2n',vel:0.08},
      // Deepening bars 16-23: higher register with countermelody feel
      { time:'16:0:0',note:'E5',dur:'2n',vel:0.08},{ time:'18:0:0',note:'A4',dur:'4n',vel:0.07},
      { time:'18:2:0',note:'C5',dur:'4n',vel:0.08},{ time:'19:0:0',note:'E5',dur:'2n',vel:0.09},
      { time:'21:0:0',note:'D5',dur:'2n',vel:0.07},{ time:'23:0:0',note:'A4',dur:'2n',vel:0.08},
      // Return bars 24-31: thin back to closing motif tag
      { time:'24:0:0',note:'A3',dur:'2n',vel:0.04},{ time:'26:0:0',note:'C4',dur:'2n',vel:0.04},
      { time:'28:0:0',note:'A4',dur:'2n',vel:0.08},{ time:'29:2:0',note:'G4',dur:'4n',vel:0.06},
      { time:'30:0:0',note:'E4',dur:'2n.',vel:0.07},
    ],
    leadType: 'fm', texture: 'pink-surf', character: 'Tidal, cyclical, wistful — descending minor third, rising fourth, glass bell lead',
    getBPM: (b) => b,
  },
  mercury: {
    key: 'Ephryg', bpm: 110, loopBars: 32,
    chordProg: [['E2','B2','E3','G#3'], ['F2','C3','F3','A3'], ['G#2','D#3','G#3','B3'], ['E2','B2','E3','G#3']],
    bass: { root: 'E1', rhythm: '4n', type: 'sine', vol: -18 },
    pad: { waveform: 'sine', spread: 4, vol: -18, filterLow: 600, filterHigh: 3000, lfoRate: 0.5, chorusWet: 0 },
    melody: [
      // Arrival bars 0-7: quick arpeggiated entrance
      { time:'0:0:0',note:'E5',dur:'8n',vel:0.07},{ time:'0:2:0',note:'B4',dur:'8n',vel:0.06},
      { time:'1:0:0',note:'G#5',dur:'8n',vel:0.08},{ time:'1:2:0',note:'E5',dur:'8n',vel:0.06},
      { time:'2:0:0',note:'B4',dur:'8n',vel:0.07},{ time:'2:2:0',note:'G#5',dur:'8n',vel:0.08},
      // Answer bars 8-15: neighbor tone motif
      { time:'8:0:0',note:'E5',dur:'8n',vel:0.09},{ time:'8:2:0',note:'F5',dur:'8n',vel:0.07},
      { time:'9:0:0',note:'E5',dur:'8n',vel:0.08},{ time:'9:2:0',note:'G#5',dur:'4n',vel:0.10},
      { time:'10:2:0',note:'A5',dur:'8n',vel:0.08},{ time:'11:0:0',note:'G#5',dur:'8n',vel:0.07},
      { time:'11:2:0',note:'B5',dur:'8n',vel:0.09},{ time:'12:0:0',note:'A5',dur:'8n',vel:0.07},
      { time:'12:2:0',note:'C6',dur:'4n',vel:0.10},{ time:'14:0:0',note:'B5',dur:'8n',vel:0.07},
      { time:'14:2:0',note:'A5',dur:'8n',vel:0.06},{ time:'15:0:0',note:'G#5',dur:'8n',vel:0.08},
      // Deepening bars 16-23: rapid ornamental flurries
      { time:'16:0:0',note:'E5',dur:'8n',vel:0.08},{ time:'16:2:0',note:'F5',dur:'8n',vel:0.07},
      { time:'17:0:0',note:'G#5',dur:'8n',vel:0.09},{ time:'17:2:0',note:'A5',dur:'8n',vel:0.07},
      { time:'18:0:0',note:'B5',dur:'8n',vel:0.08},{ time:'18:2:0',note:'C6',dur:'8n',vel:0.09},
      { time:'19:0:0',note:'B5',dur:'8n',vel:0.07},{ time:'19:2:0',note:'A5',dur:'8n',vel:0.06},
      { time:'20:0:0',note:'G#5',dur:'8n',vel:0.08},{ time:'20:2:0',note:'F5',dur:'8n',vel:0.06},
      { time:'21:0:0',note:'E5',dur:'4n',vel:0.09},{ time:'22:2:0',note:'G#5',dur:'8n',vel:0.07},
      { time:'23:0:0',note:'B5',dur:'8n',vel:0.08},{ time:'23:2:0',note:'C6',dur:'8n',vel:0.07},
      // Return bars 24-31: thinning to motif tag
      { time:'24:0:0',note:'B5',dur:'8n',vel:0.06},{ time:'24:2:0',note:'A5',dur:'8n',vel:0.05},
      { time:'25:0:0',note:'G#5',dur:'8n',vel:0.07},{ time:'25:2:0',note:'E5',dur:'4n',vel:0.08},
      { time:'27:0:0',note:'F5',dur:'8n',vel:0.06},{ time:'27:2:0',note:'E5',dur:'8n',vel:0.05},
      { time:'28:0:0',note:'G#5',dur:'8n',vel:0.07},{ time:'28:2:0',note:'A5',dur:'8n',vel:0.06},
      { time:'29:0:0',note:'B5',dur:'8n',vel:0.08},{ time:'29:2:0',note:'A5',dur:'8n',vel:0.06},
      { time:'30:0:0',note:'G#5',dur:'8n',vel:0.07},{ time:'30:2:0',note:'F5',dur:'8n',vel:0.05},
      { time:'31:0:0',note:'E5',dur:'4n',vel:0.08},
    ],
    leadType: 'fm', texture: 'high-shimmer', character: 'Quicksilver, agile, metallic — rapid neighbor tone flurries, delay-drenched plucked lead',
    getBPM: (b) => b,
  },
  venus: {
    key: 'DDorian', bpm: 76, loopBars: 32,
    chordProg: [['D2','A2','F3','C4','E4'], ['G2','D3','F3','A3','C4'], ['C3','G3','E4','A4'], ['A2','E3','A3','C4','G4']],
    bass: { root: 'D2', fifth: 'F2', rhythm: '2n', type: 'sine', vol: -18 },
    pad: { waveform: 'fatsine', spread: 14, vol: -14, filterLow: 300, filterHigh: 2000, lfoRate: 0.05, chorusWet: 0.55 },
    melody: [
      // Arrival bars 0-7: warm pad intro with sparse sixth hints
      { time:'0:0:0',note:'D4',dur:'2n',vel:0.05},{ time:'2:0:0',note:'F4',dur:'2n',vel:0.05},
      { time:'4:0:0',note:'A4',dur:'2n',vel:0.06},
      // Answer bars 8-15: lyrical stepwise in sixths
      { time:'8:0:0',note:'D5',dur:'2n',vel:0.08},{ time:'10:0:0',note:'F5',dur:'2n',vel:0.09},
      { time:'12:0:0',note:'A5',dur:'4n',vel:0.10},{ time:'12:2:0',note:'G5',dur:'4n',vel:0.08},
      { time:'13:0:0',note:'F5',dur:'2n',vel:0.07},{ time:'14:2:0',note:'D5',dur:'2n.',vel:0.10},
      // Deepening bars 16-23: ornamented sixth leaps
      { time:'16:0:0',note:'E5',dur:'4n',vel:0.08},{ time:'16:2:0',note:'C5',dur:'4n',vel:0.07},
      { time:'17:0:0',note:'A4',dur:'2n',vel:0.08},{ time:'19:0:0',note:'C5',dur:'4n',vel:0.09},
      { time:'19:2:0',note:'E5',dur:'4n',vel:0.08},{ time:'20:0:0',note:'D5',dur:'2n',vel:0.10},
      { time:'22:0:0',note:'C5',dur:'2n',vel:0.07},{ time:'23:2:0',note:'A4',dur:'2n',vel:0.07},
      // Return bars 24-31: soft closing phrase
      { time:'24:0:0',note:'A4',dur:'2n',vel:0.07},{ time:'26:0:0',note:'C5',dur:'4n',vel:0.07},
      { time:'26:2:0',note:'D5',dur:'4n',vel:0.08},{ time:'27:0:0',note:'F5',dur:'2n',vel:0.09},
      { time:'28:2:0',note:'E5',dur:'4n',vel:0.07},{ time:'29:0:0',note:'D5',dur:'2n.',vel:0.10},
    ],
    leadType: 'triangle', texture: 'pulse-sub', character: 'Warm, lyrical, longing — stepwise sixths, soft chorus bed, seductive phrasing',
    getBPM: (b) => b,
  },
  sun: {
    key: 'CLydian', bpm: 88, loopBars: 32,
    chordProg: [['C3','G3','E4','A4'], ['D3','A3','F4','C5'], ['E3','B3','G4','D5'], ['F#3','C#4','A4','E5']],
    bass: { root: 'C2', fifth: 'G2', rhythm: '4n', type: 'sawtooth', vol: -16 },
    pad: { waveform: 'fatsawtooth', spread: 8, vol: -14, filterLow: 1000, filterHigh: 3000, lfoRate: 0.06, chorusWet: 0.3 },
    melody: [
      // Arrival bars 0-7: open fifth fanfare intro
      { time:'0:0:0',note:'C4',dur:'2n',vel:0.06},{ time:'2:0:0',note:'G4',dur:'2n',vel:0.06},
      { time:'4:0:0',note:'C5',dur:'2n',vel:0.08},
      // Answer bars 8-15: bright major lift with open fifth leaps
      { time:'8:0:0',note:'C5',dur:'4n',vel:0.12},{ time:'8:2:0',note:'E5',dur:'4n',vel:0.10},
      { time:'9:0:0',note:'G5',dur:'4n',vel:0.11},{ time:'9:2:0',note:'A5',dur:'4n',vel:0.09},
      { time:'10:0:0',note:'B5',dur:'2n',vel:0.12},{ time:'11:2:0',note:'C6',dur:'4n',vel:0.13},
      { time:'12:0:0',note:'D6',dur:'4n',vel:0.10},{ time:'12:2:0',note:'C6',dur:'4n',vel:0.11},
      { time:'13:0:0',note:'B5',dur:'4n',vel:0.09},{ time:'13:2:0',note:'A5',dur:'4n',vel:0.08},
      { time:'14:0:0',note:'G5',dur:'4n',vel:0.09},{ time:'14:2:0',note:'E5',dur:'4n',vel:0.07},
      { time:'15:0:0',note:'C5',dur:'2n',vel:0.10},
      // Deepening bars 16-23: brass-like countermelody
      { time:'16:0:0',note:'E5',dur:'4n',vel:0.09},{ time:'16:2:0',note:'G5',dur:'4n',vel:0.10},
      { time:'17:0:0',note:'C6',dur:'2n',vel:0.12},{ time:'18:2:0',note:'B5',dur:'4n',vel:0.09},
      { time:'19:0:0',note:'A5',dur:'2n',vel:0.08},{ time:'20:2:0',note:'G5',dur:'2n',vel:0.10},
      { time:'22:0:0',note:'C5',dur:'2n',vel:0.08},{ time:'23:2:0',note:'G4',dur:'2n',vel:0.07},
      // Return bars 24-31: triumphant final tag
      { time:'24:0:0',note:'C5',dur:'4n',vel:0.10},{ time:'24:2:0',note:'E5',dur:'4n',vel:0.09},
      { time:'25:0:0',note:'G5',dur:'4n',vel:0.11},{ time:'25:2:0',note:'C6',dur:'2n',vel:0.12},
      { time:'27:0:0',note:'B5',dur:'4n',vel:0.09},{ time:'27:2:0',note:'A5',dur:'4n',vel:0.08},
      { time:'28:0:0',note:'G5',dur:'2n',vel:0.10},{ time:'29:2:0',note:'E5',dur:'2n',vel:0.08},
      { time:'31:0:0',note:'C5',dur:'4n',vel:0.10},
    ],
    leadType: 'sawtooth', texture: 'marching', character: 'Luminous, proud, crowned — open-fifth fanfare, bright Lydian lift, marching brass pulse',
    getBPM: (b) => b,
  },
  mars: {
    key: 'FharmMin', bpm: 120, loopBars: 32,
    chordProg: [['F2','C3','F3','G#3'], ['C3','G3','C4','Eb4'], ['F2','C3','F3','G#3'], ['Db3','Ab3','Db4','F4']],
    bass: { root: 'F1', rhythm: '8n', type: 'sawtooth', vol: -14 },
    pad: { waveform: 'sawtooth', spread: 4, vol: -16, filterLow: 200, filterHigh: 800, lfoRate: 0.6, chorusWet: 0 },
    melody: [
      // Arrival bars 0-7: ominous low drone with sharp edge
      { time:'0:0:0',note:'F3',dur:'2n',vel:0.06},{ time:'1:0:0',note:'G3',dur:'4n',vel:0.08},
      { time:'1:2:0',note:'F3',dur:'4n',vel:0.07},{ time:'2:0:0',note:'Eb3',dur:'2n',vel:0.06},
      // Answer bars 8-15: sharp minor second motif
      { time:'8:0:0',note:'F5',dur:'8n',vel:0.12},{ time:'8:1:0',note:'Gb5',dur:'8n',vel:0.10},
      { time:'8:2:0',note:'F5',dur:'8n',vel:0.11},{ time:'8:3:0',note:'Eb5',dur:'8n',vel:0.09},
      { time:'9:0:0',note:'Db5',dur:'8n',vel:0.10},{ time:'9:1:0',note:'C5',dur:'8n',vel:0.11},
      { time:'9:2:0',note:'Db5',dur:'8n',vel:0.10},{ time:'9:3:0',note:'C5',dur:'8n',vel:0.09},
      { time:'10:0:0',note:'B4',dur:'4n',vel:0.10},{ time:'10:2:0',note:'C5',dur:'8n',vel:0.11},
      { time:'10:3:0',note:'Db5',dur:'8n',vel:0.10},{ time:'11:0:0',note:'Eb5',dur:'8n',vel:0.09},
      { time:'11:1:0',note:'F5',dur:'8n',vel:0.12},{ time:'11:2:0',note:'Gb5',dur:'8n',vel:0.10},
      { time:'12:0:0',note:'F5',dur:'4n',vel:0.11},{ time:'12:3:0',note:'F5',dur:'16n',vel:0.08},
      { time:'12:3:2',note:'Gb5',dur:'16n',vel:0.10},{ time:'13:0:0',note:'F5',dur:'8n',vel:0.12},
      { time:'13:1:0',note:'Eb5',dur:'8n',vel:0.09},{ time:'13:2:0',note:'Db5',dur:'8n',vel:0.10},
      { time:'14:0:0',note:'C5',dur:'4n',vel:0.11},{ time:'15:0:0',note:'F5',dur:'8n',vel:0.12},
      { time:'15:1:0',note:'Ab5',dur:'8n',vel:0.10},{ time:'15:2:0',note:'F5',dur:'4n',vel:0.12},
      // Deepening bars 16-23: aggressive ostinato with chromatic runs
      { time:'16:0:0',note:'F5',dur:'8n',vel:0.11},{ time:'16:1:0',note:'Gb5',dur:'8n',vel:0.09},
      { time:'16:2:0',note:'F5',dur:'8n',vel:0.10},{ time:'16:3:0',note:'Eb5',dur:'8n',vel:0.08},
      { time:'17:0:0',note:'Db5',dur:'8n',vel:0.10},{ time:'17:1:0',note:'C5',dur:'8n',vel:0.09},
      { time:'17:2:0',note:'B4',dur:'8n',vel:0.08},{ time:'17:3:0',note:'C5',dur:'8n',vel:0.10},
      { time:'18:0:0',note:'F5',dur:'4n',vel:0.12},{ time:'18:2:0',note:'Gb5',dur:'8n',vel:0.10},
      { time:'18:3:0',note:'F5',dur:'8n',vel:0.11},{ time:'19:0:0',note:'Eb5',dur:'4n',vel:0.09},
      { time:'19:2:0',note:'F5',dur:'8n',vel:0.12},{ time:'19:3:0',note:'Ab5',dur:'8n',vel:0.10},
      { time:'20:0:0',note:'F5',dur:'2n',vel:0.12},{ time:'21:2:0',note:'Gb5',dur:'8n',vel:0.10},
      { time:'21:3:0',note:'F5',dur:'8n',vel:0.11},{ time:'22:0:0',note:'Eb5',dur:'4n',vel:0.09},
      { time:'22:2:0',note:'Db5',dur:'8n',vel:0.10},{ time:'22:3:0',note:'C5',dur:'8n',vel:0.08},
      { time:'23:0:0',note:'F5',dur:'4n',vel:0.12},
      // Return bars 24-31: forceful resolution with final stabs
      { time:'24:0:0',note:'F5',dur:'8n',vel:0.10},{ time:'24:1:0',note:'Eb5',dur:'8n',vel:0.08},
      { time:'24:2:0',note:'Db5',dur:'8n',vel:0.09},{ time:'24:3:0',note:'C5',dur:'8n',vel:0.07},
      { time:'25:0:0',note:'B4',dur:'8n',vel:0.09},{ time:'25:1:0',note:'C5',dur:'8n',vel:0.10},
      { time:'25:2:0',note:'Db5',dur:'8n',vel:0.08},{ time:'25:3:0',note:'Eb5',dur:'8n',vel:0.09},
      { time:'26:0:0',note:'F5',dur:'4n',vel:0.12},{ time:'26:2:0',note:'Gb5',dur:'8n',vel:0.10},
      { time:'27:0:0',note:'F5',dur:'4n',vel:0.11},{ time:'27:2:0',note:'Ab5',dur:'8n',vel:0.10},
      { time:'28:0:0',note:'F5',dur:'2n',vel:0.12},{ time:'30:0:0',note:'F5',dur:'4n',vel:0.10},
      { time:'30:2:0',note:'Eb5',dur:'4n',vel:0.08},{ time:'31:0:0',note:'F5',dur:'2n',vel:0.12},
    ],
    leadType: 'square', texture: 'war-drums', character: 'Martial, sharp, violent — minor-second stabs, chromatic fury, war drums',
    getBPM: (b) => b,
  },
  jupiter: {
    key: 'GMixolydian', bpm: 92, loopBars: 32,
    chordProg: [['G2','D3','G3','B3','D4'], ['F2','C3','F3','A3','C4'], ['C3','G3','C4','E4'], ['G2','D3','G3','B3','D4']],
    bass: { root: 'G1', fifth: 'D2', rhythm: '1m', type: 'sine', vol: -14 },
    pad: { waveform: 'fatsawtooth', spread: 16, vol: -12, filterLow: 200, filterHigh: 2000, lfoRate: 0.04, chorusWet: 0.35 },
    melody: [
      // Arrival bars 0-7: regal pad intro with broad fourth hint
      { time:'0:0:0',note:'G3',dur:'2n',vel:0.05},{ time:'2:0:0',note:'D4',dur:'2n',vel:0.05},
      { time:'4:0:0',note:'G4',dur:'2n',vel:0.06},
      // Answer bars 8-15: broad fourths with dotted rhythm feel
      { time:'8:0:0',note:'G4',dur:'4n',vel:0.09},{ time:'8:2:0',note:'C5',dur:'4n',vel:0.08},
      { time:'9:0:0',note:'D5',dur:'4n.',vel:0.10},{ time:'9:3:0',note:'G5',dur:'8n',vel:0.09},
      { time:'10:0:0',note:'F5',dur:'4n.',vel:0.12},{ time:'10:3:0',note:'G5',dur:'8n',vel:0.10},
      { time:'11:0:0',note:'A5',dur:'4n',vel:0.10},{ time:'11:2:0',note:'G5',dur:'4n',vel:0.08},
      { time:'12:0:0',note:'F5',dur:'4n.',vel:0.09},{ time:'12:3:0',note:'D5',dur:'8n',vel:0.07},
      { time:'13:0:0',note:'B4',dur:'2n',vel:0.07},{ time:'14:2:0',note:'G4',dur:'2n',vel:0.09},
      // Deepening bars 16-23: grand countermelody with choir pad swell
      { time:'16:0:0',note:'D5',dur:'2n',vel:0.08},{ time:'18:0:0',note:'G5',dur:'4n',vel:0.10},
      { time:'18:2:0',note:'A5',dur:'4n',vel:0.09},{ time:'19:0:0',note:'G5',dur:'2n',vel:0.11},
      { time:'20:2:0',note:'F5',dur:'2n',vel:0.08},{ time:'22:0:0',note:'D5',dur:'2n',vel:0.09},
      { time:'23:2:0',note:'B4',dur:'2n',vel:0.07},
      // Return bars 24-31: majestic final phrase
      { time:'24:0:0',note:'G4',dur:'4n',vel:0.08},{ time:'24:2:0',note:'B4',dur:'4n',vel:0.08},
      { time:'25:0:0',note:'D5',dur:'2n',vel:0.10},{ time:'26:2:0',note:'F5',dur:'4n',vel:0.09},
      { time:'27:0:0',note:'G5',dur:'2n',vel:0.12},{ time:'28:2:0',note:'F5',dur:'4n',vel:0.08},
      { time:'29:0:0',note:'D5',dur:'2n',vel:0.09},{ time:'30:2:0',note:'G4',dur:'2n.',vel:0.10},
    ],
    leadType: 'sawtooth', texture: 'timpani', character: 'Grandiose, regal, ceremonial — broad fourths, dotted fanfare, deep choir pad and timpani',
    getBPM: (b) => b,
  },
  saturn: {
    key: 'Bdim', bpm: 56, loopBars: 32,
    chordProg: [['B1','F2','B2','D3'], ['F1','C2','F2','Ab2'], ['B1','F2','B2','D3'], ['E1','B1','E2','G2']],
    bass: { root: 'B0', rhythm: '2n', type: 'square', vol: -18 },
    pad: { waveform: 'square', spread: 3, vol: -16, filterLow: 80, filterHigh: 400, lfoRate: 0.03, chorusWet: 0 },
    melody: [
      // Arrival bars 0-7: dark drone with tritone anchor
      { time:'0:0:0',note:'B3',dur:'2n',vel:0.05},{ time:'2:0:0',note:'F4',dur:'2n',vel:0.05},
      { time:'4:0:0',note:'B4',dur:'2n',vel:0.06},
      // Answer bars 8-15: slow tritone descent
      { time:'8:0:0',note:'B4',dur:'2n',vel:0.08},{ time:'10:0:0',note:'Bb4',dur:'2n',vel:0.07},
      { time:'12:0:0',note:'A4',dur:'2n',vel:0.07},{ time:'14:0:0',note:'Ab4',dur:'2n',vel:0.06},
      { time:'16:0:0',note:'G4',dur:'2n',vel:0.08},{ time:'18:0:0',note:'F#4',dur:'2n',vel:0.07},
      // Deepening bars 16-23: resolving tension through tritone
      { time:'20:0:0',note:'F4',dur:'2n',vel:0.06},{ time:'22:0:0',note:'E4',dur:'2n',vel:0.07},
      { time:'24:0:0',note:'Eb4',dur:'2n',vel:0.06},{ time:'26:0:0',note:'D4',dur:'2n',vel:0.07},
      // Return bars 24-31: cold final rest
      { time:'28:0:0',note:'C#4',dur:'2n',vel:0.05},{ time:'30:0:0',note:'C4',dur:'2n',vel:0.06},
      { time:'31:2:0',note:'B3',dur:'4n',vel:0.07},
    ],
    leadType: 'fm', texture: 'clock', character: 'Heavy, temporal, final — slow tritone descent, clock-pulse tick, dark low strings',
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
  private mix!: MixGraph;
  private compressor!: Tone.Compressor;
  private reverb!: Tone.Reverb;
  private chamberReverb!: Tone.Reverb;
  private pingPongDelay!: Tone.PingPongDelay;
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
  private transportGeneration = 0;

  // Diagnostics
  /** Name of the currently active audio cue, set by each play/stop method. */
  activeCueName?: string;
  /** Last measured peak level in dBFS read from the master meter. */
  lastPeakDb = -Infinity;
  /** Meter monitoring the final output bus after limiting. */
  private meter!: Tone.Meter;

  // ── Initialisation ───────────────────────────────────────────────

  unlock(): void {
    if (this.unlocked) return;
    try {
      void Tone.start();

      // Create the basic mix bus graph
      this.mix = createMixGraph(this.musicVolume, this.sfxVolume);

      // Meter for diagnostics — after limiter
      this.meter = new Tone.Meter({ normalRange: false });
      this.mix.limiter.connect(this.meter);

      // Insert compressor between master and limiter
      // (mixGraph connects master → limiter directly)
      this.mix.master.disconnect();
      this.compressor = new Tone.Compressor({
        threshold: -14,
        ratio: 2.5,
        attack: 0.01,
        release: 0.18,
      }).connect(this.mix.limiter);
      this.mix.master.connect(this.compressor);
      this.mix.master.gain.value = 0.82;

      // Cathedral reverb, sized for mobile WebAudio headroom.
      this.reverb = new Tone.Reverb({ decay: 4.8, preDelay: 0.08, wet: 1 });
      this.reverb.connect(this.mix.musicContentGain);

      // Chamber reverb, tighter and cheaper for contrast and texture sends.
      this.chamberReverb = new Tone.Reverb({ decay: 2.2, preDelay: 0.035, wet: 1 });
      this.chamberReverb.connect(this.mix.musicContentGain);

      // Ping-pong delay for stereo width — feeds the cathedral verb.
      this.pingPongDelay = new Tone.PingPongDelay({ delayTime: '4n.', feedback: 0.18, wet: 0.28 });
      this.pingPongDelay.connect(this.reverb);

      // Dark delay chain — long feedback through a lowpass filter into chamber verb.
      // Use 4n (0.5s at 120bpm) — Tone.js internal maxDelay is 1s so dotted
      // values like 2n. (1.5s) would be clamped and sound garbled.
      this.darkDelay = new Tone.FeedbackDelay({ delayTime: '4n', feedback: 0.10, wet: 0.32 });
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
    if (this.mix?.musicGain) this.mix.musicGain.gain.value = this.musicVolume;
  }
  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.mix?.sfxGain) this.mix.sfxGain.gain.value = this.sfxVolume;
  }
  getMusicVolume(): number { return this.musicVolume; }
  getSfxVolume(): number { return this.sfxVolume; }

  duckMusic(): void {
    if (!this.mix?.musicStateGain || this.ducked) return;
    this.ducked = true;
    this.mix.musicStateGain.gain.linearRampToValueAtTime(0.3, Tone.now() + 0.3);
  }
  unduckMusic(): void {
    if (!this.mix?.musicStateGain || !this.ducked) return;
    this.ducked = false;
    this.mix.musicStateGain.gain.linearRampToValueAtTime(1, Tone.now() + 0.5);
  }

  crossfadeOut(duration = 0.5): void {
    if (!this.mix?.musicStateGain) return;
    this.mix.musicStateGain.gain.linearRampToValueAtTime(0.001, Tone.now() + duration);
  }

  /** Ramp musicGain back up after a stop-fade.
   *  All stop methods schedule a ramp-to-silence at now+0.4 and dispose
   *  old nodes at the cleanup timeout (now+0.45). We chain the ramp-up
   *  to start AT or after the cleanup point so old and new audio never
   *  overlap.  Do NOT call cancelScheduledValues here — that would
   *  defeat the stop's fade-out and both old+new would play together.
   *
   *  IMPORTANT: must NOT use setValueAtTime here — that schedules an
   *  absolute event that could fire minutes later during a boss phase
   *  transition and kill all gain.  linearRampToValueAtTime is safe
   *  because it defines a trajectory from the previous ramp's endpoint
   *  (0.001 at stop.now+0.4) to the target volume at the later time. */
  private restoreMusicGain(duration = 0.5): void {
    if (!this.mix?.musicStateGain) return;
    const now = Tone.now();
    this.mix.musicStateGain.gain.linearRampToValueAtTime(1, now + 0.45 + duration);
  }

  private resetMusicContentGain(value = 1): void {
    if (!this.mix?.musicContentGain) return;
    const now = Tone.now();
    this.mix.musicContentGain.gain.cancelScheduledValues(now);
    this.mix.musicContentGain.gain.setValueAtTime(value, now);
  }

  // ── Menu Hum ─────────────────────────────────────────────────────
  //
  // 32-bar cycle at 56 BPM over Am-F-C-G (8 bars each).
  // 3-layer pad (fatsine/sine/sawtooth) through dual reverb +
  // DuoSynth lead with vibrato + 3 melody variations +
  // FM bell accents + heartbeat sub-pulse + breathing noise.
  // 7-section structural arc automates per-channel dynamics.

  playMenuHum(): void {
    if (!this.unlocked) return;
    if (this.menuActive) {
      this.restoreMusicGain(0.25);
      return;
    }
    this.menuActive = true;
    this.activeCueName = 'menu';
    this.stopAmbience();
    this.stopBossMusic();
    this.transportGeneration++;

    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = 56;
    this.resetMusicContentGain(Tone.dbToGain(-18));
    this.restoreMusicGain(0.5);

    const barSec = 60 / 56 * 4; // seconds per bar at 56 BPM

    // ── Per-channel gain nodes for structural arc ──────────────────
    // Initial values are the Intro section (bars 0-1): drone only.
    const padAGain = new Tone.Gain(Tone.dbToGain(-26)).connect(this.mix.musicContentGain);
    const padBGain = new Tone.Gain(Tone.dbToGain(-27)).connect(this.mix.musicContentGain);
    const padCGain = new Tone.Gain(Tone.dbToGain(-32)).connect(this.mix.musicContentGain);
    const leadGain = new Tone.Gain(Tone.dbToGain(-40)).connect(this.mix.musicContentGain);
    const bellGain = new Tone.Gain(Tone.dbToGain(-30)).connect(this.mix.musicContentGain);
    const hbGain = new Tone.Gain(0).connect(this.reverb);
    this.menuDisposables.push(padAGain, padBGain, padCGain, leadGain, bellGain, hbGain);

    // ── Drone bed ──────────────────────────────────────────────────
    const drone1 = new Tone.Synth({
      oscillator: { type: 'fatsine', count: 2, spread: 6 } as any,
      envelope: { attack: 3.0, decay: 0.5, sustain: 0.8, release: 5.0 },
    });
    drone1.volume.value = -16;
    drone1.connect(this.mix.musicContentGain);
    drone1.triggerAttack('C2');
    this.menuDisposables.push(drone1);

    const drone2 = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 2.5, decay: 0.4, sustain: 0.7, release: 4.0 },
    });
    drone2.volume.value = -20;
    drone2.connect(this.mix.musicContentGain);
    drone2.triggerAttack('G2');
    this.menuDisposables.push(drone2);

    const drone3 = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 2.0, decay: 0.3, sustain: 0.6, release: 3.0 },
    });
    drone3.volume.value = -22;
    drone3.connect(this.mix.musicContentGain);
    drone3.triggerAttack('C3');
    this.menuDisposables.push(drone3);

    // ── 3-layer pad ────────────────────────────────────────────────
    // Pad A: fatsine → chorus → filter+LFO (350-2000Hz) → padAGain
    const padAFilter = new Tone.Filter({ frequency: 600, type: 'lowpass', rolloff: -12, Q: 0.3 });
    const padALfo = new Tone.LFO({ frequency: 0.09, min: 350, max: 2000, type: 'sine' });
    padALfo.connect(padAFilter.frequency);
    padALfo.start();
    const padA = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 4,
      oscillator: { type: 'fatsine', count: 2, spread: 8 } as any,
      envelope: { attack: 2.0, decay: 0.8, sustain: 0.35, release: 4.0 },
    } as any);
    padA.volume.value = -13;
    const menuChorus = new Tone.Chorus({ frequency: 0.28, depth: 0.42, wet: 0.28 });
    menuChorus.start();
    padA.connect(menuChorus);
    menuChorus.connect(padAFilter);
    padAFilter.connect(padAGain);
    // Wet send: filtered pad → ping-pong delay → cathedral verb
    const padASend = new Tone.Gain(0.20);
    padAFilter.connect(padASend);
    padASend.connect(this.pingPongDelay);
    this.menuDisposables.push(padA, menuChorus, padAFilter, padALfo, padASend);

    // Pad B: sine -> content bus (body, no filter)
    const padB = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 2.5, decay: 0.6, sustain: 0.4, release: 5.0 },
    } as any);
    padB.volume.value = -15;
    padB.connect(padBGain);
    this.menuDisposables.push(padB);

    // Pad C: sawtooth → filter+LFO (260-1200Hz, phase offset) → chamber verb
    const padCFilter = new Tone.Filter({ frequency: 400, type: 'lowpass', rolloff: -24, Q: 0.3 });
    const padCLfo = new Tone.LFO({ frequency: 0.11, min: 260, max: 1200, type: 'sine', phase: 90 });
    padCLfo.connect(padCFilter.frequency);
    padCLfo.start();
    const padC = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 4,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 3.0, decay: 1.0, sustain: 0.25, release: 6.0 },
    } as any);
    padC.volume.value = -22;
    padC.connect(padCFilter);
    padCFilter.connect(padCGain);
    // Wet send: dark delay → dark filter → chamber verb
    const padCSend = new Tone.Gain(0.24);
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
      const vel = 0.045;
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
    lead.volume.value = -17;
    lead.connect(leadFilter);
    leadFilter.connect(leadGain);
    // Wet send to ping-pong delay
    const leadSend = new Tone.Gain(0.18);
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
    bellSynth.volume.value = -22;
    bellSynth.connect(bellGain);
    bellSynth.connect(this.reverb);
    this.menuDisposables.push(bellSynth);

    const bellPart = new Tone.Part(
      (time, v) => { bellSynth.triggerAttackRelease(v.note, '2m', time, v.vel); },
      [
        { time: '0:0:0',  note: 'A3', vel: 0.04 },
        { time: '8:0:0',  note: 'E4', vel: 0.035 },
        { time: '16:0:0', note: 'A3', vel: 0.045 },
        { time: '24:0:0', note: 'D4', vel: 0.035 },
      ],
    );
    bellPart.loop = true;
    bellPart.loopEnd = '32:0:0';
    bellPart.start(0);
    this.menuDisposables.push(bellPart as unknown as Disposable);

    // ── Heartbeat sub-pulse — 42Hz through reverb ────────────────
    const hbOsc = new Tone.Oscillator({ frequency: 42, type: 'sine' });
    const hbLfo = new Tone.LFO({ frequency: 0.9, min: 0, max: 0.07, type: 'sine' });
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
    const noiseGain = new Tone.Gain(0.010);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.mix.musicContentGain);
    noise.start();
    this.menuDisposables.push(noise, noiseFilter, noiseLfo, noiseGain);

    // ── 7-section structural arc ──────────────────────────────────
    // Transitions at bars 2, 6, 10, 14, 18, 22 (Intro implicit at 0)
    const arcSections = [
      { bar: '2:0:0',  master: -10, padA: -14, padB: -16, padC: -18, lead: -17, bell: -20, hb: -16 }, // Emergence
      { bar: '6:0:0',  master: -9,  padA: -13, padB: -15, padC: -17, lead: -15, bell: -19, hb: -15 }, // Deepening
      { bar: '10:0:0', master: -9,  padA: -14, padB: -16, padC: -18, lead: -15, bell: -19, hb: -16 }, // Reflection
      { bar: '14:0:0', master: -8,  padA: -12, padB: -14, padC: -16, lead: -18, bell: -17, hb: -15 }, // The Abyss
      { bar: '18:0:0', master: -8,  padA: -12, padB: -14, padC: -16, lead: -14, bell: -17, hb: -15 }, // Ascent
      { bar: '22:0:0', master: -18, padA: -22, padB: -24, padC: -28, lead: -30, bell: -24, hb: -22 }, // Outro
    ];
    const arcPart = new Tone.Part((time, s: Record<string, number>) => {
      const ramp = barSec * 1.5;
      this.mix.musicContentGain.gain.linearRampToValueAtTime(Tone.dbToGain(s.master), time + ramp);
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
    this.mix.musicContentGain.gain.linearRampToValueAtTime(Tone.dbToGain(-18), Tone.now() + 0.3);

    Tone.Transport.start();
  }

  stopMenuHum(): void {
    if (!this.menuActive) return;
    this.menuActive = false;
    const generation = this.transportGeneration;
    const disposables = this.menuDisposables;
    this.menuDisposables = [];

    // Crossfade: ramp musicGain down before disposing so the next
    // music state can ramp it back up over the same bus.
    this.mix.musicStateGain.gain.linearRampToValueAtTime(0.001, Tone.now() + 0.4);

    const clean = () => {
      if (this.transportGeneration === generation) {
        Tone.Transport.cancel();
        Tone.Transport.stop();
        Tone.Transport.position = 0;
      }
      for (const d of disposables) {
        try { d.dispose(); } catch { /* */ }
      }
    };
    setTimeout(clean, 450);
  }

  // ── Dungeon Ambience — Per-Sphere Musical Themes ──────────────────

  startDungeonAmbience(sphereId?: string): void {
    if (!this.unlocked || this.ambienceActive) return;
    this.stopMenuHum();
    this.stopBossMusic();
    this.ambienceActive = true;
    this.activeCueName = `dungeon-${sphereId ?? 'moon'}`;
    this.transportGeneration++;

    const id = sphereId ?? 'moon';
    const cfg = SPHERE_MUSIC[id];
    if (!cfg) { this.ambienceActive = false; return; }

    const bpm = cfg.getBPM(cfg.bpm);
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;
    this.resetMusicContentGain(1);
    this.restoreMusicGain(0.6);

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
    lead.volume.value = -20;
    const leadSend = new Tone.Gain(0.16);
    const leadVerbSend = new Tone.Gain(0.18);
    lead.connect(this.mix.musicContentGain);
    lead.connect(leadVerbSend);
    leadVerbSend.connect(this.reverb);
    lead.connect(leadSend);
    leadSend.connect(this.pingPongDelay);
    this.ambienceDisposables.push(lead as unknown as Disposable, leadSend, leadVerbSend);

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
      maxPolyphony: 5,
      oscillator: { type: cfg.pad.waveform as any, count: 2, spread: Math.min(cfg.pad.spread, 10) } as any,
      envelope: { attack: 2.0, decay: 0.8, sustain: 0.3, release: 4.0 },
    } as any);
    pad.volume.value = cfg.pad.vol - 3;
    const padChorus = new Tone.Chorus({ frequency: 0.22 + cfg.pad.lfoRate, depth: 0.42, wet: Math.min(0.34, cfg.pad.chorusWet) });
    padChorus.start();
    pad.connect(padChorus);
    padChorus.connect(padFilter);
    padFilter.connect(this.mix.musicContentGain);
    const padReverbSend = new Tone.Gain(0.22);
    padFilter.connect(padReverbSend);
    padReverbSend.connect(this.reverb);
    this.ambienceDisposables.push(pad, padChorus, padFilter, padLfo, padReverbSend);

    // ── Chord loop ──────────────────────────────────────────────────
    let chordIdx = 0;
    const chordBars = Math.max(2, cfg.loopBars / cfg.chordProg.length);
    const chordInterval = `${chordBars}m`;
    const chordDuration = `${Math.max(1, chordBars - 0.2)}m`;
    const chordLoop = new Tone.Loop((time) => {
      const c = cfg.chordProg[chordIdx % cfg.chordProg.length];
      const section = Math.floor(chordIdx / cfg.chordProg.length) % 4;
      const voicing = section === 2 ? [...c, transpose(c[c.length - 1], 12)] : c;
      pad.triggerAttackRelease(voicing, chordDuration, time, section === 3 ? 0.038 : 0.052);
      chordIdx++;
    }, chordInterval).start(0);
    this.ambienceDisposables.push(chordLoop as unknown as Disposable);

    // ── Bass ────────────────────────────────────────────────────────
    const bassSynth = new Tone.Synth({
      oscillator: { type: cfg.bass.type as any },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.5, release: 1.0 },
    });
    bassSynth.volume.value = cfg.bass.vol - 2;
    bassSynth.connect(this.mix.musicContentGain);
    this.ambienceDisposables.push(bassSynth);

    let bassOnRoot = true;
    let bassStep = 0;
    const bassLoop = new Tone.Loop((time) => {
      const note = bassOnRoot ? cfg.bass.root : (cfg.bass.fifth ?? cfg.bass.root);
      const accent = bassStep % 8 === 0 ? 0.58 : bassStep % 4 === 0 ? 0.48 : 0.34;
      bassSynth.triggerAttackRelease(note, cfg.bass.rhythm, time, accent);
      if (bassStep % 16 === 14 && cfg.bass.fifth) {
        bassSynth.triggerAttackRelease(transpose(cfg.bass.fifth, 12), '8n', time + Tone.Time('8n').toSeconds(), 0.18);
      }
      bassOnRoot = !bassOnRoot;
      bassStep++;
    }, cfg.bass.rhythm).start(0);
    this.ambienceDisposables.push(bassLoop as unknown as Disposable);

    // ── Melody ──────────────────────────────────────────────────────
    const melodyPart = new Tone.Part((time, v) => {
      lead.triggerAttackRelease(v.note, v.dur, time, v.vel);
    }, cfg.melody);
    melodyPart.loop = true;
    melodyPart.loopEnd = `${cfg.loopBars}:0:0`;
    melodyPart.start(0);
    (melodyPart as unknown as { humanize?: string }).humanize = '32n';
    this.ambienceDisposables.push(melodyPart as unknown as Disposable);

    const counter = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.04, decay: 0.25, sustain: 0.18, release: 1.4 },
    });
    counter.volume.value = -27;
    const counterDelay = new Tone.Gain(0.12);
    counter.connect(this.chamberReverb);
    counter.connect(counterDelay);
    counterDelay.connect(this.pingPongDelay);
    const counterEvents: MelodyNote[] = cfg.chordProg.flatMap((chord, i) => {
      const bar = i * chordBars;
      const top = chord[chord.length - 1];
      const inner = chord[Math.max(0, chord.length - 2)];
      return [
        { time: `${bar + Math.max(1, chordBars - 2)}:0:0`, note: transpose(inner, 12), dur: '2n', vel: 0.026 },
        { time: `${bar + Math.max(1, chordBars - 1)}:2:0`, note: transpose(top, 12), dur: '4n', vel: 0.022 },
      ];
    });
    const counterPart = new Tone.Part((time, v) => {
      counter.triggerAttackRelease(v.note, v.dur, time, v.vel);
    }, counterEvents);
    counterPart.loop = true;
    counterPart.loopEnd = `${cfg.loopBars}:0:0`;
    counterPart.start(0);
    (counterPart as unknown as { humanize?: string }).humanize = '32n';
    this.ambienceDisposables.push(counter, counterDelay, counterPart as unknown as Disposable);

    const ornament = new Tone.FMSynth({
      harmonicity: 3.01,
      modulationIndex: 5,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.004, decay: 0.8, sustain: 0, release: 0.35 },
      modulationEnvelope: { attack: 0.002, decay: 0.45, sustain: 0, release: 0.2 },
    });
    ornament.volume.value = -30;
    ornament.connect(this.pingPongDelay);
    ornament.connect(this.reverb);
    const ornamentEvents: MelodyNote[] = cfg.chordProg.map((chord, i) => ({
      time: `${i * chordBars + Math.max(0, chordBars - 1)}:2:0`,
      note: transpose(chord[chord.length - 1], 12),
      dur: '8n',
      vel: 0.022,
    }));
    const ornamentPart = new Tone.Part((time, v) => {
      ornament.triggerAttackRelease(v.note, v.dur, time, v.vel);
    }, ornamentEvents);
    ornamentPart.loop = true;
    ornamentPart.loopEnd = `${cfg.loopBars}:0:0`;
    ornamentPart.start(0);
    this.ambienceDisposables.push(ornament, ornamentPart as unknown as Disposable);

    // Four-section 32-bar arc: arrival → answer → deepening → return
    let sectionCycle = 0;
    const sectionLoop = new Tone.Loop((time) => {
      const section = sectionCycle % 4;
      // Arrival (0): sparse pad + bass, motif hinted quietly
      // Answer  (1): motif enters with presence, delay adds depth
      // Deepening (2): countermelody + ornament active, pad swells
      // Return  (3): thin back to pad, final motif tag fades
      lead.volume.linearRampToValueAtTime([-21.5, -19.5, -18.0, -22.0][section], time + 0.4);
      counter.volume.linearRampToValueAtTime([-30, -27, -24.5, -29][section], time + 0.6);
      padReverbSend.gain.linearRampToValueAtTime([0.16, 0.22, 0.30, 0.14][section], time + 0.8);
      leadSend.gain.linearRampToValueAtTime([0.10, 0.16, 0.26, 0.08][section], time + 0.6);
      bassSynth.volume.linearRampToValueAtTime([cfg.bass.vol - 2, cfg.bass.vol, cfg.bass.vol + 2, cfg.bass.vol - 3][section], time + 0.35);
      this.mix.musicContentGain.gain.linearRampToValueAtTime([0.82, 0.92, 1.0, 0.78][section], time + 0.6);
      sectionCycle++;
    }, `${Math.max(4, cfg.loopBars / 4)}m`).start(0);
    this.ambienceDisposables.push(sectionLoop as unknown as Disposable);

    // ── Texture layers ──────────────────────────────────────────────
    switch (cfg.texture) {
      case 'pink-surf': {
        const surfNoise = new Tone.Noise('pink');
        const surfFilter = new Tone.Filter({ frequency: 400, type: 'lowpass', rolloff: -24 });
        const surfLfo = new Tone.LFO({ frequency: 0.06, min: 200, max: 800, type: 'sine' });
        surfLfo.connect(surfFilter.frequency);
        surfLfo.start();
        const surfGain = new Tone.Gain(0.007);
        surfNoise.connect(surfFilter);
        surfFilter.connect(surfGain);
        surfGain.connect(this.mix.musicContentGain);
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
        marchEnv.connect(this.mix.musicContentGain);
        marchNoise.start();
        const marchLoop = new Tone.Loop((time) => {
          marchEnv.gain.setValueAtTime(0.018, time);
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
        drumEnv.connect(this.mix.musicContentGain);
        drumNoise.start();
        // Aggressive 8th-note pattern with accents
        const drumLoop = new Tone.Loop((time) => {
          const vel = (Tone.Transport.position as string).endsWith(':0:0') ? 0.035 : 0.016;
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
        timp.volume.value = -22;
        timp.connect(this.chamberReverb);
        const timpLoop = new Tone.Loop((time) => {
          timp.triggerAttackRelease('G2', '2n', time, 0.038);
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
    this.mix.musicStateGain.gain.linearRampToValueAtTime(1, Tone.now() + 0.6);
    Tone.Transport.start();
  }

  stopAmbience(): void {
    if (!this.ambienceActive) return;
    this.ambienceActive = false;
    const generation = this.transportGeneration;
    const disposables = this.ambienceDisposables;
    this.ambienceDisposables = [];
    this.mix.musicStateGain.gain.linearRampToValueAtTime(0.001, Tone.now() + 0.4);

    const clean = () => {
      if (this.transportGeneration === generation) {
        Tone.Transport.cancel();
        Tone.Transport.stop();
        Tone.Transport.position = 0;
      }
      for (const d of disposables) {
        try { d.dispose(); } catch { /* */ }
      }
    };
    setTimeout(clean, 450);
  }

  // ── Cinematic Pads — Narrative Arcs ───────────────────────────────

  playCinematicPad(mood: CinematicMood = 'cosmos'): () => void {
    if (!this.unlocked) return () => undefined;
    this.activeCueName = `cinematic-${mood}`;
    const now = Tone.now();
    const d: Disposable[] = [];
    const dur = 28; // seconds for the arc
    const cinematicGain = new Tone.Gain(0.78).connect(this.mix.musicContentGain);
    const cinematicVerbSend = new Tone.Gain(0.62).connect(this.reverb);
    d.push(cinematicGain, cinematicVerbSend);

    switch (mood) {
      case 'cosmos': {
        // Single tone → Fmaj9 pad swell → floating melody → ethereal peak → dissolve
        const pad = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 4,
          oscillator: { type: 'fatsine', count: 2, spread: 10 } as any,
          envelope: { attack: 6.0, decay: 2.0, sustain: 0.4, release: 8.0 },
        } as any);
        pad.volume.value = -25;
        const padGain = new Tone.Gain(0);
        pad.connect(padGain);
        padGain.connect(cinematicVerbSend);
        padGain.gain.setValueAtTime(0, now);
        padGain.gain.linearRampToValueAtTime(0.5, now + 8);
        pad.triggerAttack(['F2', 'A2', 'C3', 'E3']);
        d.push(pad);
        d.push(padGain);

        // Floating melody — high sine, delayed entry
        const flute = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.8, decay: 0.5, sustain: 0.3, release: 2.0 },
        });
        flute.volume.value = -27;
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
        rumble.volume.value = -24;
        rumble.connect(cinematicGain);
        rumble.triggerAttack('D1');
        d.push(rumble);

        const pad = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 4,
          oscillator: { type: 'fatsine', count: 2, spread: 8 } as any,
          envelope: { attack: 4.0, decay: 1.0, sustain: 0.4, release: 6.0 },
        } as any);
        pad.volume.value = -24;
        pad.connect(cinematicVerbSend);
        d.push(pad);
        pad.triggerAttack(['D3', 'F3', 'A3', 'C4', 'E4']);

        const filter = new Tone.Filter({ frequency: 250, type: 'lowpass', rolloff: -12 });
        pad.disconnect(cinematicVerbSend);
        pad.connect(filter);
        filter.connect(cinematicVerbSend);
        filter.frequency.linearRampToValueAtTime(1200, now + 14);
        d.push(filter);

        // Descending melody
        const lead = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.3, decay: 0.4, sustain: 0.2, release: 1.5 },
        });
        lead.volume.value = -26;
        lead.connect(cinematicVerbSend);
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
        stab.volume.value = -20;
        stab.connect(cinematicGain);
        d.push(stab);

        // Three stabs
        ['0:0:0', '2:0:0', '4:0:0'].forEach((t, i) => {
          const chord = i === 2 ? ['F2', 'C3', 'F3', 'G#3', 'C4'] : ['F2', 'C3', 'F3', 'G#3'];
          stab.triggerAttackRelease(chord, '2n', now + Tone.Time(t).toSeconds(), 0.06);
        });

        // War drum texture
        const drumN = new Tone.Noise('brown');
        const drumF = new Tone.Filter({ frequency: 180, type: 'lowpass', rolloff: -24 });
        const drumG = new Tone.Gain(0);
        drumN.connect(drumF); drumF.connect(drumG); drumG.connect(cinematicGain);
        drumN.start();
        d.push(drumN, drumF, drumG);
        for (let i = 0; i < 8; i++) {
          const t = now + 4 + i * 0.5;
          drumG.gain.setValueAtTime(0.018, t);
          drumG.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        }

        // Sustained Fmadd9 — held tension
        const held = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 5,
          oscillator: { type: 'fatsine', count: 2, spread: 10 } as any,
          envelope: { attack: 2.0, decay: 0.5, sustain: 0.5, release: 4.0 },
        } as any);
        held.volume.value = -24;
        held.connect(cinematicVerbSend);
        held.triggerAttackRelease(['F2', 'C3', 'G#3', 'C4'], 12, now + 8, 0.04);
        d.push(held);
        break;
      }
      case 'ascent': {
        // Hopeful C4 → bright Cmaj7/G pad → growing Lydian texture → transcendent peak → peaceful Cmaj9
        const pad = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 5,
          oscillator: { type: 'fatsine', count: 2, spread: 10 } as any,
          envelope: { attack: 5.0, decay: 1.0, sustain: 0.5, release: 8.0 },
        } as any);
        pad.volume.value = -24;
        pad.connect(cinematicVerbSend);
        d.push(pad);

        // Gradual chord build
        [
          { t: 0, chord: ['C3', 'G3'] },
          { t: 6, chord: ['C3', 'G3', 'E4'] },
          { t: 12, chord: ['C3', 'G3', 'E4', 'B4'] },
          { t: 18, chord: ['C3', 'G3', 'E4', 'B4', 'D5'] },
          { t: 22, chord: ['C3', 'G3', 'E4', 'B4', 'D5'] },
        ].forEach(({ t, chord }) => {
          pad.triggerAttackRelease(chord, 5.6, now + t, 0.035);
        });

        // Bright Cmaj9 chord to close
        const close = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 5,
          oscillator: { type: 'fatsine', count: 2, spread: 12 } as any,
          envelope: { attack: 3.0, decay: 0.5, sustain: 0.4, release: 6.0 },
        } as any);
        close.volume.value = -25;
        close.connect(cinematicVerbSend);
        close.triggerAttackRelease(['C3', 'E3', 'G3', 'B3', 'D4'], '4n', now + dur, 0.05);
        d.push(close);
        break;
      }
    }

    this.cinematicDisposables.push(...d);

    return () => {
      const stopAt = Tone.now();
      cinematicGain.gain.linearRampToValueAtTime(0.001, stopAt + 0.8);
      cinematicVerbSend.gain.linearRampToValueAtTime(0.001, stopAt + 0.8);
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
    chime1.connect(this.mix.sfxGain);
    chime1.triggerAttackRelease('A5', '32n', now);

    const chime2 = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0, release: 0.1 },
    });
    chime2.volume.value = -14;
    chime2.connect(this.mix.sfxGain);
    chime2.triggerAttackRelease('E6', '32n', now + 0.03);

    setTimeout(() => { chime1.dispose(); chime2.dispose(); }, 600);
  }

  // ── Boss Music ────────────────────────────────────────────────────

  startBossMusic(sphereId: string): void {
    if (!this.unlocked || this.bossMusicActive) return;
    this.stopAmbience();
    this.bossMusicActive = true;
    this.activeCueName = `boss-${sphereId}`;
    this.bossMusicPhase = 1;
    this.transportGeneration++;

    const cfg = SPHERE_MUSIC[sphereId];
    if (!cfg) { this.bossMusicActive = false; return; }

    const bpm = cfg.getBPM(cfg.bpm) + 8;
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;
    this.resetMusicContentGain(1);

    // ── Intensified pad ──────────────────────────────────────────────
    const padFilter = new Tone.Filter({ frequency: cfg.pad.filterLow, type: 'lowpass', rolloff: -12, Q: 0.3 });
    const padLfo = new Tone.LFO({ frequency: cfg.pad.lfoRate * 1.3, min: cfg.pad.filterLow, max: cfg.pad.filterHigh, type: 'sine' });
    padLfo.connect(padFilter.frequency);
    padLfo.start();

    const pad = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 5,
      oscillator: { type: cfg.pad.waveform as any, count: 2, spread: Math.min(cfg.pad.spread, 10) } as any,
      envelope: { attack: 1.5, decay: 0.6, sustain: 0.35, release: 3.0 },
    } as any);
    pad.volume.value = cfg.pad.vol - 1;
    const bossChorus = new Tone.Chorus({ frequency: 0.28 + cfg.pad.lfoRate, depth: 0.4, wet: Math.min(0.34, cfg.pad.chorusWet) });
    bossChorus.start();
    pad.connect(bossChorus);
    bossChorus.connect(padFilter);
    padFilter.connect(this.mix.musicContentGain);
    this.bossMusicDisposables.push(pad, bossChorus, padFilter, padLfo);

    // Chord loop
    let chordIdx = 0;
    const chordBars = Math.max(2, cfg.loopBars / cfg.chordProg.length);
    const chordInterval = `${chordBars}m`;
    const chordDuration = `${Math.max(1, chordBars - 0.25)}m`;
    const chordLoop = new Tone.Loop((time) => {
      const c = cfg.chordProg[chordIdx % cfg.chordProg.length];
      pad.triggerAttackRelease(c, chordDuration, time, 0.06);
      chordIdx++;
    }, chordInterval).start(0);
    this.bossMusicDisposables.push(chordLoop as unknown as Disposable);

    // ── Bass — more present ──────────────────────────────────────────
    const bassSynth = new Tone.Synth({
      oscillator: { type: cfg.bass.type as any },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.8 },
    });
    bassSynth.volume.value = cfg.bass.vol;
    bassSynth.connect(this.mix.musicContentGain);
    this.bossMusicDisposables.push(bassSynth);

    let bassOnRoot = true;
    const bassLoop = new Tone.Loop((time) => {
      const note = bassOnRoot ? cfg.bass.root : (cfg.bass.fifth ?? cfg.bass.root);
      bassSynth.triggerAttackRelease(note, cfg.bass.rhythm, time, 0.52);
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
    lead.volume.value = -18;
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
    kickN.connect(kickF); kickF.connect(kickG); kickG.connect(this.mix.musicContentGain);
    kickN.start();
    const kickLoop = new Tone.Loop((time) => {
        kickG.gain.setValueAtTime(0.024, time);
      kickG.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    }, '4n').start(0);
    this.bossMusicDisposables.push(kickN, kickF, kickG, kickLoop as unknown as Disposable);

    this.restoreMusicGain(0.5);
    Tone.Transport.start();
  }

  stopBossMusic(): void {
    if (!this.bossMusicActive) return;
    this.bossMusicActive = false;
    const generation = this.transportGeneration;
    const disposables = this.bossMusicDisposables;
    this.bossMusicDisposables = [];
    this.mix.musicStateGain.gain.linearRampToValueAtTime(0.001, Tone.now() + 0.3);

    const clean = () => {
      if (this.transportGeneration === generation) {
        Tone.Transport.cancel();
        Tone.Transport.stop();
        Tone.Transport.position = 0;
      }
      for (const d of disposables) {
        try { d.dispose(); } catch { /* */ }
      }
      this.bossMusicPhase = 1;
    };
    setTimeout(clean, 350);
  }

  setBossPhase(phase: BossPhase): void {
    if (!this.bossMusicActive) return;
    const previousPhase = this.bossMusicPhase;
    if (phase <= previousPhase) return;
    this.bossMusicPhase = phase;
    const now = Tone.now();

    if (phase >= 2 && previousPhase < 2) {
      // Phase 2: add percussion on backbeats + rhythmic ostinato
      this.mix.musicContentGain.gain.linearRampToValueAtTime(0.92, now + 0.3);
      // Snare on backbeats
      const snareN = new Tone.Noise('white');
      const snareF = new Tone.Filter({ frequency: 800, type: 'bandpass', rolloff: -24, Q: 1.5 });
      const snareG = new Tone.Gain(0);
      snareN.connect(snareF); snareF.connect(snareG); snareG.connect(this.mix.musicContentGain);
      snareN.start();
      const snareLoop = new Tone.Loop((time) => {
        snareG.gain.setValueAtTime(0.018, time);
        snareG.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      }, '2n').start(Tone.Time('4n').toSeconds());
      this.bossMusicDisposables.push(snareN, snareF, snareG, snareLoop as unknown as Disposable);
      // Rhythmic ostinato — fast arpeggiated 8th-note pattern
      const ostinato = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.05 },
      });
      ostinato.volume.value = -24;
      ostinato.connect(this.chamberReverb);
      const ostNotes = ['C5', 'E5', 'G5', 'C6', 'G5', 'E5'];
      let ostStep = 0;
      const ostLoop = new Tone.Loop((time) => {
        ostinato.triggerAttackRelease(ostNotes[ostStep % ostNotes.length], '16n', time, 0.018);
        ostStep++;
      }, '8n').start(0);
      this.bossMusicDisposables.push(ostinato, ostLoop as unknown as Disposable);
    }

    if (phase >= 3 && previousPhase < 3) {
      // Phase 3: add high countermelody layer, reduce gain 1-2dB to avoid clipping
      this.mix.musicContentGain.gain.linearRampToValueAtTime(0.76, now + 0.3); // ~-2.4dB reduction
      // Bright countermelody — sine synth playing chord tones an octave up
      const highLayer = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.4, decay: 0.3, sustain: 0.2, release: 1.2 },
      });
      highLayer.volume.value = -18;
      const highReverb = new Tone.Gain(0.25);
      highLayer.connect(highReverb);
      highReverb.connect(this.reverb);
      highLayer.connect(this.mix.musicContentGain);
      const highNotes = ['F5', 'A5', 'C6', 'E6', 'C6', 'A5', 'G5', 'E6'];
      let highStep = 0;
      const highLoop = new Tone.Loop((time) => {
        highLayer.triggerAttackRelease(highNotes[highStep % highNotes.length], '4n', time, 0.022);
        highStep++;
      }, '2n').start(0);
      this.bossMusicDisposables.push(highLayer, highReverb, highLoop as unknown as Disposable);
    }
  }

  // ── Screen Music ──────────────────────────────────────────────────

  playGameOverMusic(): void {
    if (!this.unlocked || this.gameOverActive) return;
    this.stopAmbience();
    this.stopMenuHum();
    this.stopBossMusic();
    this.stopPrologueMusic();
    this.stopEpilogueMusic();
    this.stopCodexMusic();
    this.gameOverActive = true;
    this.activeCueName = 'game-over';
    this.transportGeneration++;
    Tone.Transport.cancel();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.resetMusicContentGain(1);
    this.restoreMusicGain(0.5);

    // Somber Am pad — sine waves through reverb
    const pad = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 2.0, decay: 0.5, sustain: 0.5, release: 4.0 },
    } as any);
    pad.volume.value = -18;
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
    bell.volume.value = -20;
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
    sub.volume.value = -26;
    sub.connect(this.mix.musicContentGain);
    sub.triggerAttack('A1');
    this.screenDisposables.push(sub);

    Tone.Transport.bpm.value = 40;
    if (Tone.Transport.state !== 'started') Tone.Transport.start();
  }

  private stopScreenMusicCommon(): void {
    const generation = this.transportGeneration;
    const disposables = this.screenDisposables;
    this.screenDisposables = [];
    this.mix.musicStateGain.gain.linearRampToValueAtTime(0.001, Tone.now() + 0.35);
    setTimeout(() => {
      for (const d of disposables) {
        try { d.dispose(); } catch { /* */ }
      }
      if (this.transportGeneration === generation) {
        Tone.Transport.cancel();
        Tone.Transport.stop();
        Tone.Transport.position = 0;
      }
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
    this.stopAmbience();
    this.stopBossMusic();
    this.stopGameOverMusic();
    this.stopEpilogueMusic();
    this.stopCodexMusic();
    this.prologueActive = true;
    this.activeCueName = 'prologue';
    this.transportGeneration++;
    Tone.Transport.cancel();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.resetMusicContentGain(1);
    this.restoreMusicGain(0.5);

    // Mysterious Dm pad — starts dark, filter opens as a "reveal"
    const pad = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 4,
      oscillator: { type: 'fatsine', count: 2, spread: 6 } as any,
      envelope: { attack: 4.0, decay: 0.5, sustain: 0.5, release: 6.0 },
    } as any);
    pad.volume.value = -22;
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
    this.stopBossMusic();
    this.stopGameOverMusic();
    this.stopPrologueMusic();
    this.stopCodexMusic();
    this.epilogueActive = true;
    this.activeCueName = 'epilogue';
    this.transportGeneration++;
    Tone.Transport.cancel();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.resetMusicContentGain(1);
    this.restoreMusicGain(0.5);

    // Triumphant Cmaj7 — bright fatsine pad through reverb
    const pad = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 5,
      oscillator: { type: 'fatsine', count: 2, spread: 8 } as any,
      envelope: { attack: 3.0, decay: 0.5, sustain: 0.5, release: 6.0 },
    } as any);
    pad.volume.value = -20;
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
    bell.volume.value = -22;
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
    this.stopAmbience();
    this.stopBossMusic();
    this.stopGameOverMusic();
    this.stopPrologueMusic();
    this.stopEpilogueMusic();
    this.codexActive = true;
    this.activeCueName = 'codex';
    this.transportGeneration++;
    this.resetMusicContentGain(1);
    this.restoreMusicGain(0.5);

    // Scholarly quiet — two soft sine layers, barely there
    const dr1 = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 2.0, decay: 0.5, sustain: 0.5, release: 3.0 },
    });
    dr1.volume.value = -28;
    dr1.connect(this.mix.musicContentGain);
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
      synth.connect(this.mix.sfxGain);
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
        s.connect(this.mix.sfxGain);
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
        d.connect(this.mix.sfxGain);
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
        bd.connect(this.mix.sfxGain);
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
        m.connect(this.mix.sfxGain);
        m.triggerAttackRelease('E5', '32n', now);
        setTimeout(() => m.dispose(), 200);
        break;
      }
    }
  }

  // ── Global Control ────────────────────────────────────────────────

  stopAll(): void {
    this.activeCueName = undefined;
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

  dispose(): void {
    this.stopAll();
    this.mix?.dispose();
    [this.compressor, this.meter, this.reverb, this.chamberReverb,
     this.pingPongDelay, this.darkDelay, this.darkFilter].forEach(n => n?.dispose());
  }

  // ── Diagnostics ───────────────────────────────────────────────────

  private countActiveNodes(): number {
    return this.menuDisposables.length + this.ambienceDisposables.length +
      this.bossMusicDisposables.length + this.cinematicDisposables.length +
      this.screenDisposables.length;
  }

  private updatePeakDb(): void {
    if (this.meter) {
      const val = this.meter.getValue();
      const peak = typeof val === 'number' ? val : (val.length > 0 ? val[0] : 0);
      this.lastPeakDb = peakToDb(peak);
    }
  }

  getDiagnostics(): AudioDiagnosticsSnapshot {
    this.updatePeakDb();
    return {
      activeCue: this.activeCueName ?? null,
      transportState: Tone.Transport.state,
      activeNodeCount: this.countActiveNodes(),
      peakDb: this.lastPeakDb,
      clipping: this.lastPeakDb >= CLIP_DB_THRESHOLD,
    };
  }
}

export const audio = new AudioSystem();
