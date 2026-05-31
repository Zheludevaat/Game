export type MusicCueKind = 'menu' | 'dungeon' | 'boss' | 'cinematic' | 'screen';

export interface NoteEvent {
  time: string | number;
  note: string | string[];
  duration: string | number;
  velocity?: number;
}

export interface MusicCue {
  id: string;
  kind: MusicCueKind;
  bpm: number;
  loopBars: number;
  keyCenter: string;
  notes: NoteEvent[];
  mixDb: number;
}
