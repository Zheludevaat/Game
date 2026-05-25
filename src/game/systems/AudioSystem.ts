export type SfxName =
  | 'menu' | 'attack' | 'dash' | 'spell' | 'enemyHit' | 'playerHit'
  | 'chest' | 'shrine' | 'descend' | 'bossWarn' | 'bossDeath' | 'pickup'
  | 'doorLock' | 'doorOpen';

interface Voice {
  o: OscillatorNode;
  g: GainNode;
}

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

  startDungeonAmbience(): void {
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

  sfx(name: SfxName): void {
    if (!this.unlocked || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const env = ctx.createGain();
    env.gain.value = 0;
    env.connect(this.sfxGain);
    const osc = ctx.createOscillator();
    osc.connect(env);

    const setup = (
      type: OscillatorType, freq: number, end: number,
      attack: number, decay: number, peak: number,
    ): void => {
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + attack + decay);
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(peak, now + attack);
      env.gain.exponentialRampToValueAtTime(0.001, now + attack + decay);
      osc.start(now);
      osc.stop(now + attack + decay + 0.05);
    };

    switch (name) {
      case 'attack':    setup('square',   400, 120, 0.005, 0.15, 0.25); break;
      case 'dash':      setup('triangle', 220, 80,  0.005, 0.20, 0.20); break;
      case 'spell':     setup('sawtooth', 700, 220, 0.005, 0.30, 0.20); break;
      case 'enemyHit':  setup('square',   180, 60,  0.005, 0.18, 0.25); break;
      case 'playerHit': setup('sawtooth', 120, 40,  0.005, 0.25, 0.30); break;
      case 'chest':     setup('triangle', 500, 900, 0.01,  0.30, 0.25); break;
      case 'shrine':    setup('sine',     880, 1320,0.02,  0.50, 0.20); break;
      case 'descend':   setup('triangle', 110, 55,  0.05,  0.80, 0.30); break;
      case 'bossWarn':  setup('sawtooth', 90,  220, 0.02,  0.70, 0.30); break;
      case 'bossDeath': setup('sawtooth', 600, 80,  0.05,  1.20, 0.35); break;
      case 'pickup':    setup('sine',     900,1320, 0.005, 0.12, 0.20); break;
      case 'doorLock':  setup('sawtooth', 100, 50,  0.01,  0.20, 0.25); break;
      case 'doorOpen':  setup('sine',     440, 880, 0.02,  0.30, 0.20); break;
      case 'menu':      setup('sine',     660, 990, 0.01,  0.15, 0.10); break;
    }
  }
}

export const audio = new AudioSystem();
