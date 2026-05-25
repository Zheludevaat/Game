export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  colour: string;
  gravity?: number;
  drag?: number;
  shrink?: number;
}

export class ParticleSystem {
  parts: Particle[] = [];
  reduce = false;
  maxParts = 600;

  emit(p: Particle): void {
    if (this.parts.length >= this.maxParts) return;
    this.parts.push(p);
  }

  burst(x: number, y: number, count: number, opts: Partial<Particle> = {}): void {
    const n = this.reduce ? Math.max(1, Math.floor(count / 3)) : count;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.life ?? 0.6) * 30 + Math.random() * 40;
      this.emit({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        size: 1 + Math.random() * 1.5,
        colour: '#f4d27a',
        drag: 0.92,
        ...opts,
      });
    }
  }

  trail(x: number, y: number, colour: string): void {
    if (this.reduce && Math.random() < 0.6) return;
    this.emit({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      life: 0.3,
      maxLife: 0.3,
      size: 1.5,
      colour,
      drag: 0.85,
    });
  }

  update(dt: number): void {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.drag != null) { p.vx *= p.drag; p.vy *= p.drag; }
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.shrink) p.size = Math.max(0, p.size - p.shrink * dt);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.parts) {
      const a = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.colour;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
