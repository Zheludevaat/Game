import { describe, expect, it } from 'vitest';
import source from './AudioSystem.ts?raw';

describe('AudioSystem music wiring', () => {
  it('keeps user volume separate from song fades and dynamics', () => {
    expect(source).toContain('private musicStateGain!: Tone.Gain');
    expect(source).toContain('this.musicStateGain = new Tone.Gain(1).connect(this.musicGain)');
    expect(source).not.toContain('musicGain.gain.linearRampToValueAtTime');
    expect(source).not.toContain('musicGain.gain.setValueAtTime');
  });

  it('routes music sources through the song-state bus', () => {
    const directMusicConnections = source.match(/connect\(this\.musicGain\)/g) ?? [];
    expect(directMusicConnections).toHaveLength(1);
    expect(source).toContain('new Tone.Gain(1).connect(this.musicGain)');
  });

  it('uses disposable per-song chorus nodes instead of a shared reconnecting chorus', () => {
    expect(source).not.toContain('private chorus!: Tone.Chorus');
    expect(source).not.toContain('this.chorus');
    expect(source).toContain('const menuChorus = new Tone.Chorus');
    expect(source).toContain('const padChorus = new Tone.Chorus');
    expect(source).toContain('const bossChorus = new Tone.Chorus');
  });

  it('does not let cinematic pads fade the global music bus', () => {
    expect(source).toContain('const cinematicGain = new Tone.Gain(1).connect(this.musicStateGain)');
    expect(source).toContain('const cinematicVerbSend = new Tone.Gain(1).connect(this.reverb)');
    expect(source).toContain('cinematicGain.gain.linearRampToValueAtTime(0.001');
    expect(source).toContain('cinematicVerbSend.gain.linearRampToValueAtTime(0.001');
    expect(source).not.toContain('this.musicStateGain.gain.linearRampToValueAtTime(0.001, Tone.now() + 0.8)');
  });
});
