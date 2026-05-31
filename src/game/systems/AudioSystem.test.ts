import { describe, expect, it } from 'vitest';
import source from './AudioSystem.ts?raw';

describe('AudioSystem music wiring', () => {
  it('keeps user volume separate from song fades and dynamics', () => {
    // Uses mix graph for bus creation; volume nodes accessed via this.mix
    expect(source).toContain('private mix!: MixGraph');
    expect(source).toContain("import { createMixGraph } from '../audio/mixGraph'");
    expect(source).toContain('this.mix.musicStateGain.gain.linearRampToValueAtTime');
    expect(source).toContain('this.mix.musicContentGain.gain.linearRampToValueAtTime');
    // No direct musicGain ramps
    expect(source).not.toContain('this.mix.musicGain.gain.linearRampToValueAtTime');
    expect(source).not.toContain('this.mix.musicGain.gain.setValueAtTime');
  });

  it('routes music sources through the content bus, not the transition bus', () => {
    // Music sources connect to musicContentGain (via this.mix)
    const contentBusConnections = source.match(/connect\(this\.mix\.musicContentGain\)/g) ?? [];
    expect(contentBusConnections.length).toBeGreaterThan(0);

    // No sources connect directly to musicStateGain (only restore/duck ramp it)
    const stateBusConnections = source.match(/connect\(this\.mix\.musicStateGain\)/g) ?? [];
    expect(stateBusConnections).toHaveLength(0);

    // The bus chain is created in mixGraph, only the import remains in AudioSystem
    expect(source).toContain("from '../audio/mixGraph'");
  });

  it('uses disposable per-song chorus nodes instead of a shared reconnecting chorus', () => {
    expect(source).not.toContain('private chorus!: Tone.Chorus');
    expect(source).not.toContain('this.chorus');
    expect(source).toContain('const menuChorus = new Tone.Chorus');
    expect(source).toContain('const padChorus = new Tone.Chorus');
    expect(source).toContain('const bossChorus = new Tone.Chorus');
  });

  it('does not let cinematic pads fade the global music bus', () => {
    expect(source).toContain('const cinematicGain = new Tone.Gain(0.78).connect(this.mix.musicContentGain)');
    expect(source).toContain('const cinematicVerbSend = new Tone.Gain(0.62).connect(this.reverb)');
    expect(source).toContain('cinematicGain.gain.linearRampToValueAtTime(0.001');
    expect(source).toContain('cinematicVerbSend.gain.linearRampToValueAtTime(0.001');
    expect(source).not.toContain('this.mix.musicStateGain.gain.linearRampToValueAtTime(0.001, Tone.now() + 0.8)');
  });

  it('keeps menu composition dynamics off the global transition bus', () => {
    expect(source).toContain('this.mix.musicContentGain.gain.linearRampToValueAtTime(Tone.dbToGain(s.master)');
    expect(source).toContain('this.mix.musicContentGain.gain.linearRampToValueAtTime(Tone.dbToGain(-18)');
    expect(source).not.toContain('this.mix.musicStateGain.gain.linearRampToValueAtTime(Tone.dbToGain(s.master)');
    expect(source).not.toContain('this.mix.musicStateGain.gain.linearRampToValueAtTime(Tone.dbToGain(-18)');
  });

  it('resets content dynamics when entering non-menu music states', () => {
    expect(source.match(/this\.resetMusicContentGain\(1\)/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(source).toContain('this.resetMusicContentGain(Tone.dbToGain(-18))');
    expect(source).toContain('this.restoreMusicGain(0.5)');
  });

  it('keeps browser music under WebAudio headroom limits', () => {
    // Compressor is connected between master and limiter
    expect(source).toContain('new Tone.Compressor');
    expect(source).toContain('this.mix.master.connect(this.compressor)');
    expect(source).toContain('this.mix.master.gain.value = 0.82');
    expect(source).toContain('new Tone.Meter({ normalRange: true })');
    expect(source).not.toContain('new Tone.Meter({ normalRange: false })');
    // Limiter is created in mixGraph; verify no oversized reverbs
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
