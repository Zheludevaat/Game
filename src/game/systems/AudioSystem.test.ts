import { describe, expect, it } from 'vitest';
import source from './AudioSystem.ts?raw';

describe('AudioSystem music wiring', () => {
  it('keeps user volume separate from song fades and dynamics', () => {
    expect(source).toContain('private musicStateGain!: Tone.Gain');
    expect(source).toContain('private musicContentGain!: Tone.Gain');
    expect(source).toContain('this.musicStateGain = new Tone.Gain(1).connect(this.musicGain)');
    expect(source).toContain('this.musicContentGain = new Tone.Gain(1).connect(this.musicStateGain)');
    expect(source).not.toContain('musicGain.gain.linearRampToValueAtTime');
    expect(source).not.toContain('musicGain.gain.setValueAtTime');
  });

  it('routes music sources through the content bus, not the transition bus', () => {
    const directMusicConnections = source.match(/connect\(this\.musicGain\)/g) ?? [];
    expect(directMusicConnections).toHaveLength(1);
    expect(source).toContain('new Tone.Gain(1).connect(this.musicGain)');

    const transitionBusConnections = source.match(/connect\(this\.musicStateGain\)/g) ?? [];
    expect(transitionBusConnections).toHaveLength(1);
    expect(source).toContain('new Tone.Gain(1).connect(this.musicStateGain)');
    expect(source).toContain('connect(this.musicContentGain)');
  });

  it('uses disposable per-song chorus nodes instead of a shared reconnecting chorus', () => {
    expect(source).not.toContain('private chorus!: Tone.Chorus');
    expect(source).not.toContain('this.chorus');
    expect(source).toContain('const menuChorus = new Tone.Chorus');
    expect(source).toContain('const padChorus = new Tone.Chorus');
    expect(source).toContain('const bossChorus = new Tone.Chorus');
  });

  it('does not let cinematic pads fade the global music bus', () => {
    expect(source).toContain('const cinematicGain = new Tone.Gain(0.78).connect(this.musicContentGain)');
    expect(source).toContain('const cinematicVerbSend = new Tone.Gain(0.62).connect(this.reverb)');
    expect(source).toContain('cinematicGain.gain.linearRampToValueAtTime(0.001');
    expect(source).toContain('cinematicVerbSend.gain.linearRampToValueAtTime(0.001');
    expect(source).not.toContain('this.musicStateGain.gain.linearRampToValueAtTime(0.001, Tone.now() + 0.8)');
  });

  it('keeps menu composition dynamics off the global transition bus', () => {
    expect(source).toContain('this.musicContentGain.gain.linearRampToValueAtTime(Tone.dbToGain(s.master)');
    expect(source).toContain('this.musicContentGain.gain.linearRampToValueAtTime(Tone.dbToGain(-18)');
    expect(source).not.toContain('this.musicStateGain.gain.linearRampToValueAtTime(Tone.dbToGain(s.master)');
    expect(source).not.toContain('this.musicStateGain.gain.linearRampToValueAtTime(Tone.dbToGain(-18)');
  });

  it('resets content dynamics when entering non-menu music states', () => {
    expect(source.match(/this\.resetMusicContentGain\(1\)/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(source).toContain('this.resetMusicContentGain(Tone.dbToGain(-18))');
    expect(source).toContain('this.restoreMusicGain(0.5)');
  });

  it('keeps browser music under WebAudio headroom limits', () => {
    expect(source).toContain('new Tone.Compressor');
    expect(source).toContain('this.master = new Tone.Gain(0.82).connect(this.compressor)');
    expect(source).toContain('new Tone.Limiter(-1).toDestination()');
    expect(source).not.toContain('new Tone.Reverb({ decay: 9');
    expect(source).not.toContain('new Tone.Reverb({ decay: 3.5');
    expect(source.match(/maxPolyphony: [6-9]/g) ?? []).toHaveLength(0);
  });

  it('schedules cinematic hits relative to current audio time', () => {
    expect(source).toContain("stab.triggerAttackRelease(chord, '2n', now + Tone.Time(t).toSeconds()");
    expect(source).not.toContain("stab.triggerAttackRelease(chord, '2n', Tone.Time(t).toSeconds()");
    expect(source).not.toContain("pad.triggerAttack(['C3', 'G3'], now + 6)");
  });
});
