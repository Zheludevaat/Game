export type SfxName =
  | 'menu' | 'attack' | 'dash' | 'spell' | 'enemyHit' | 'playerHit'
  | 'chest' | 'shrine' | 'descend' | 'bossWarn' | 'bossDeath' | 'pickup'
  | 'doorLock' | 'doorOpen' | 'crit';

interface VoiceSpec {
  type: OscillatorType;
  freq: number;
  end: number;
  attack: number;
  decay: number;
  peak: number;
}

export type CinematicMood = 'cosmos' | 'descent' | 'boss' | 'ascent';

interface Voice {
  o: OscillatorNode;
  g: GainNode;
}

// Per-mood drone chords. Frequencies are deliberately low so the pad
// sits underneath dialogue / subtitles without competing.
const PAD_CHORDS: Record<CinematicMood, number[]> = {
  cosmos:  [65.4, 130.8, 196.0],   // F2 + C3 + G3 — open, hopeful
  descent: [49.0, 65.4],           // G1 + F2 — dark minor
  boss:    [58.3, 87.3],           // A#1 + F2 — dissonant tritone
  ascent:  [65.4, 130.8, 164.8],   // F2 + C3 + E3 — warm major
};

// Per-sphere "top voice" overlaid on the dungeon ambient drone.
// Indexed by SphereId; the spheres at the deepest descent get sub-bass,
// the upper spheres get airy triangle / sine harmonics.
const SPHERE_TOP_VOICE: Record<string, { freq: number; type: OscillatorType; gain: number }> = {
  moon:    { freq: 440, type: 'triangle', gain: 0.025 }, // pale silver bell
  mercury: { freq: 330, type: 'sine',     gain: 0.030 }, // quicksilver shimmer
  venus:   { freq: 264, type: 'sine',     gain: 0.030 }, // warm middle voice
  sun:     { freq: 220, type: 'triangle', gain: 0.035 }, // bright gold pad
  mars:    { freq: 110, type: 'sawtooth', gain: 0.022 }, // edged sustain
  jupiter: { freq: 82,  type: 'triangle', gain: 0.030 }, // deep brass undertone
  saturn:  { freq: 55,  type: 'square',   gain: 0.020 }, // black sub
  ogdoad:  { freq: 528, type: 'sine',     gain: 0.040 }, // bright octave above all
};

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private unlocked = false;
  private musicVolume = 0.4;
  private sfxVolume = 0.7;
  private ambientNodes: Voice[] = [];
  private ambientStarted = false;
  private menuStarted = false;

  unlock(): void {
    if (this.unlocked) return;
    try {
      const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AC = w.AudioContext ?? w.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.master);
      this.unlocked = true;
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.unlocked = false;
    }
  }

  /** Best-effort context resume — call when the page becomes visible
   *  again. iOS Safari + standalone PWAs suspend the AudioContext when
   *  the user switches apps; without this nudge the menu drone + SFX
   *  fall silent until the next pointerdown. */
  resume(): void {
    if (!this.unlocked || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

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

  playMenuHum(): void {
    if (!this.unlocked || !this.ctx || this.menuStarted) return;
    this.menuStarted = true;
    const now = this.ctx.currentTime;
    [55, 110, 220].forEach((f, i) => {
      const o = this.ctx!.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = this.ctx!.createGain();
      g.gain.value = 0.08 / (i + 1);
      o.connect(g);
      g.connect(this.musicGain);
      o.start(now);
      this.ambientNodes.push({ o, g });
    });
  }

  startDungeonAmbience(sphereId?: string): void {
    if (!this.unlocked || !this.ctx || this.ambientStarted) return;
    this.stopMenuHum();
    this.ambientStarted = true;
    const now = this.ctx.currentTime;
    [40, 60, 120, 180].forEach((f, i) => {
      const o = this.ctx!.createOscillator();
      o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      const g = this.ctx!.createGain();
      g.gain.value = 0.05 / (i + 1);
      o.connect(g);
      g.connect(this.musicGain);
      o.start(now);
      this.ambientNodes.push({ o, g });
    });
    // Sphere-specific top voice — gives floor 1 (Moon) a different
    // sonic signature from floor 7 (Saturn) without rewriting the bed.
    if (sphereId && SPHERE_TOP_VOICE[sphereId]) {
      const cfg = SPHERE_TOP_VOICE[sphereId];
      const o = this.ctx.createOscillator();
      o.type = cfg.type;
      o.frequency.value = cfg.freq;
      const g = this.ctx.createGain();
      g.gain.value = cfg.gain;
      o.connect(g);
      g.connect(this.musicGain);
      o.start(now);
      this.ambientNodes.push({ o, g });
    }
  }

  /** Start a sustained pad tuned for one of four cinematic moods.
   * Returns a stop function the caller invokes on unmount / film end. */
  playCinematicPad(mood: CinematicMood = 'cosmos'): () => void {
    if (!this.unlocked || !this.ctx) return () => undefined;
    const ctx = this.ctx;
    const chord = PAD_CHORDS[mood] ?? PAD_CHORDS.cosmos;
    const now = ctx.currentTime;
    const voices: Voice[] = [];
    chord.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : (i === 1 ? 'triangle' : 'sine');
      o.frequency.value = f;
      // Slow detune LFO for a "breathing" pad.
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.12 + i * 0.04;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.6 + i * 0.4; // cents — extremely subtle
      lfo.connect(lfoGain);
      lfoGain.connect(o.detune);
      lfo.start(now);
      const g = ctx.createGain();
      // Fade in over 1.2s so the pad eases under the first beat.
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.08 / (i + 1), now + 1.2);
      o.connect(g);
      g.connect(this.musicGain);
      o.start(now);
      voices.push({ o, g });
      voices.push({ o: lfo, g: lfoGain });
    });
    return () => {
      const stopAt = ctx.currentTime;
      for (const v of voices) {
        try {
          v.g.gain.cancelScheduledValues(stopAt);
          v.g.gain.setValueAtTime(v.g.gain.value, stopAt);
          v.g.gain.linearRampToValueAtTime(0.0001, stopAt + 0.6);
          v.o.stop(stopAt + 0.7);
        } catch { /* */ }
      }
    };
  }

  /** Quick attack-decay chime used as a beat-advance cue inside films. */
  playCinematicChime(): void {
    if (!this.unlocked || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const mix = ctx.createGain();
    mix.gain.value = 0;
    mix.connect(this.sfxGain);
    // Fundamental + perfect fifth — bell-like
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.18 : 0.10;
      o.connect(g);
      g.connect(mix);
      o.start(now);
      o.stop(now + 0.45);
    });
    mix.gain.setValueAtTime(0, now);
    mix.gain.linearRampToValueAtTime(1, now + 0.02);
    mix.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  }

  stopAll(): void {
    this.stopMenuHum();
    this.stopAmbience();
  }
  stopMenuHum(): void {
    this.menuStarted = false;
    for (const v of this.ambientNodes) { try { v.o.stop(); } catch { /* */ } }
    this.ambientNodes = [];
  }
  stopAmbience(): void {
    this.ambientStarted = false;
    for (const v of this.ambientNodes) { try { v.o.stop(); } catch { /* */ } }
    this.ambientNodes = [];
  }

  /** Schedule a stack of oscillator voices, each with its own envelope,
   *  all summed into sfxGain. The single-osc shortcut becomes
   *  playLayered([oneVoice]) — and the four "big" SFX get genuine 2-3
   *  voice chords so impacts have body, mid-snap, and high ting. */
  private playLayered(layers: VoiceSpec[]): void {
    if (!this.unlocked || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    for (const v of layers) {
      const env = ctx.createGain();
      env.gain.value = 0;
      env.connect(this.sfxGain);
      const osc = ctx.createOscillator();
      osc.type = v.type;
      osc.frequency.setValueAtTime(v.freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, v.end), now + v.attack + v.decay);
      osc.connect(env);
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(v.peak, now + v.attack);
      env.gain.exponentialRampToValueAtTime(0.001, now + v.attack + v.decay);
      osc.start(now);
      osc.stop(now + v.attack + v.decay + 0.05);
    }
  }

  /** Brief filtered noise burst — adds "transient" / impact texture
   *  that single sines/squares can't reach. Used to thicken player /
   *  enemy hits and the dash whoosh. */
  private playNoiseBurst(duration: number, peak: number, filterFreq: number): void {
    if (!this.unlocked || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const len = Math.max(0.02, duration);
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * len)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;
    const env = ctx.createGain();
    env.gain.value = 0;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.004);
    env.gain.exponentialRampToValueAtTime(0.001, now + len);
    src.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);
    src.start(now);
    src.stop(now + len + 0.02);
  }

  sfx(name: SfxName): void {
    if (!this.unlocked || !this.ctx) return;
    switch (name) {
      // --- Four big SFX — layered voices for body + snap + ting ---
      case 'enemyHit':
        // Low square thump body + mid square snap + high triangle ting.
        this.playLayered([
          { type: 'square',   freq: 90,  end: 50,  attack: 0.003, decay: 0.10, peak: 0.18 },
          { type: 'square',   freq: 200, end: 80,  attack: 0.003, decay: 0.16, peak: 0.18 },
          { type: 'triangle', freq: 1100,end: 600, attack: 0.003, decay: 0.10, peak: 0.10 },
        ]);
        this.playNoiseBurst(0.08, 0.10, 1400);
        break;
      case 'playerHit':
        // Heavy sawtooth body + mid grind + filtered noise impact.
        this.playLayered([
          { type: 'sawtooth', freq: 70,  end: 30,  attack: 0.003, decay: 0.20, peak: 0.22 },
          { type: 'sawtooth', freq: 320, end: 120, attack: 0.003, decay: 0.22, peak: 0.18 },
        ]);
        this.playNoiseBurst(0.14, 0.16, 900);
        break;
      case 'spell':
        // Existing sawtooth sweep + low body + airy harmonic above.
        this.playLayered([
          { type: 'sawtooth', freq: 700, end: 220, attack: 0.005, decay: 0.30, peak: 0.18 },
          { type: 'sine',     freq: 1400,end: 440, attack: 0.005, decay: 0.32, peak: 0.07 },
          { type: 'triangle', freq: 175, end: 110, attack: 0.005, decay: 0.34, peak: 0.10 },
        ]);
        break;
      case 'pickup':
        // Original sine sweep + low body thump + high shimmer.
        this.playLayered([
          { type: 'sine',     freq: 900, end: 1320,attack: 0.005, decay: 0.12, peak: 0.18 },
          { type: 'triangle', freq: 220, end: 200, attack: 0.005, decay: 0.10, peak: 0.10 },
          { type: 'sine',     freq: 1760,end: 2200,attack: 0.005, decay: 0.18, peak: 0.06 },
        ]);
        break;
      // --- Crit — bright two-voice gold ping ---
      case 'crit':
        this.playLayered([
          { type: 'sine', freq: 1760, end: 2640, attack: 0.002, decay: 0.18, peak: 0.18 },
          { type: 'sine', freq: 2640, end: 3520, attack: 0.002, decay: 0.14, peak: 0.10 },
        ]);
        break;
      // --- Remaining 9 SFX stay as single-voice envelopes ---
      case 'attack':    this.playLayered([{ type: 'square',   freq: 400, end: 120, attack: 0.005, decay: 0.15, peak: 0.25 }]); break;
      case 'dash':      this.playLayered([{ type: 'triangle', freq: 220, end: 80,  attack: 0.005, decay: 0.20, peak: 0.20 }]); this.playNoiseBurst(0.12, 0.06, 1800); break;
      case 'chest':     this.playLayered([{ type: 'triangle', freq: 500, end: 900, attack: 0.01,  decay: 0.30, peak: 0.25 }]); break;
      case 'shrine':    this.playLayered([{ type: 'sine',     freq: 880, end: 1320,attack: 0.02,  decay: 0.50, peak: 0.20 }]); break;
      case 'descend':   this.playLayered([{ type: 'triangle', freq: 110, end: 55,  attack: 0.05,  decay: 0.80, peak: 0.30 }]); break;
      case 'bossWarn':  this.playLayered([{ type: 'sawtooth', freq: 90,  end: 220, attack: 0.02,  decay: 0.70, peak: 0.30 }]); break;
      case 'bossDeath': this.playLayered([{ type: 'sawtooth', freq: 600, end: 80,  attack: 0.05,  decay: 1.20, peak: 0.35 }]); break;
      case 'doorLock':  this.playLayered([{ type: 'sawtooth', freq: 100, end: 50,  attack: 0.01,  decay: 0.20, peak: 0.25 }]); break;
      case 'doorOpen':  this.playLayered([{ type: 'sine',     freq: 440, end: 880, attack: 0.02,  decay: 0.30, peak: 0.20 }]); break;
      case 'menu':      this.playLayered([{ type: 'sine',     freq: 660, end: 990, attack: 0.01,  decay: 0.15, peak: 0.10 }]); break;
    }
  }
}

export const audio = new AudioSystem();
