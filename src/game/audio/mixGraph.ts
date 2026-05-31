import * as Tone from 'tone';

export interface MixGraph {
  limiter: Tone.Limiter;
  master: Tone.Gain;
  musicGain: Tone.Gain;
  sfxGain: Tone.Gain;
  musicStateGain: Tone.Gain;
  musicContentGain: Tone.Gain;
  dispose(): void;
}

export function createMixGraph(musicVolume: number, sfxVolume: number): MixGraph {
  const limiter = new Tone.Limiter(-1).toDestination();
  const master = new Tone.Gain(0.9).connect(limiter);
  const musicGain = new Tone.Gain(musicVolume).connect(master);
  const sfxGain = new Tone.Gain(sfxVolume).connect(master);
  const musicStateGain = new Tone.Gain(1).connect(musicGain);
  const musicContentGain = new Tone.Gain(1).connect(musicStateGain);
  return {
    limiter, master, musicGain, sfxGain, musicStateGain, musicContentGain,
    dispose() {
      [musicContentGain, musicStateGain, musicGain, sfxGain, master, limiter].forEach(n => n.dispose());
    },
  };
}
