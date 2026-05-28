// Status effects — burn / poison (damage-over-time), slow / stun
// (debuffs), shield / regen (buffs). A single StatusEffect[] array
// rides on every Enemy and on the Player. Tick-driven from
// updatePlayer / updateEnemies.

export type StatusEffectKind =
  | 'burn'      // small DoT, stacks up to 3
  | 'poison'    // small DoT, stacks up to 4
  | 'slow'      // movement / attack speed reduction
  | 'stun'      // full freeze
  | 'shield'    // absorbs N damage before HP
  | 'regen';    // heal-over-time (player only practical use)

export interface StatusEffect {
  kind: StatusEffectKind;
  /** seconds remaining before this effect expires */
  remaining: number;
  /** time of the next DoT / HoT tick (engine timeAlive) */
  nextTickAt: number;
  /** stack count — burn/poison stack; others stay at 1 */
  stacks: number;
  /** absorb pool for shield */
  shieldHp?: number;
  /** damage per tick (burn/poison) or heal per tick (regen) */
  perTick?: number;
  /** seconds between ticks */
  tickEvery?: number;
}

/** Per-kind static config — duration default, stack cap, interval, magnitude. */
export const STATUS_CONFIG: Record<StatusEffectKind, {
  defaultDuration: number;
  stackCap: number;
  tickEvery?: number;     // for DoT/HoT
  perTickBase?: number;   // for DoT/HoT
  glyph: string;
  colour: string;
}> = {
  burn:   { defaultDuration: 1.6, stackCap: 3, tickEvery: 0.4, perTickBase: 1.0, glyph: '🔥', colour: '#ff7a3a' },
  poison: { defaultDuration: 3.0, stackCap: 4, tickEvery: 0.5, perTickBase: 0.6, glyph: '☠',  colour: '#9b6cff' },
  slow:   { defaultDuration: 1.5, stackCap: 1, glyph: '❄', colour: '#a4faf0' },
  stun:   { defaultDuration: 0.8, stackCap: 1, glyph: '⚡', colour: '#ffe6a3' },
  shield: { defaultDuration: 8.0, stackCap: 1, glyph: '🛡', colour: '#6cf6e5' },
  regen:  { defaultDuration: 6.0, stackCap: 1, tickEvery: 1.0, perTickBase: 1.0, glyph: '✚', colour: '#6cf6e5' },
};

/** Description of "this weapon / spell applies a status on hit." */
export interface AppliesStatus {
  kind: StatusEffectKind;
  /** 0..1 probability per hit */
  chance: number;
  /** seconds (falls back to STATUS_CONFIG.defaultDuration) */
  duration?: number;
  /** override per-tick damage for DoT, or shield amount, or slow magnitude */
  magnitude?: number;
}

/** Container — anything that can carry status effects. */
export interface StatusCarrier {
  status: StatusEffect[];
}

/** Apply (or refresh) a status. Stack-cap-aware. Returns true if newly applied (vs. refreshed). */
export function applyStatusEffect(
  target: StatusCarrier,
  kind: StatusEffectKind,
  nowT: number,
  opts: { duration?: number; magnitude?: number } = {},
): boolean {
  const cfg = STATUS_CONFIG[kind];
  const dur = opts.duration ?? cfg.defaultDuration;
  const existing = target.status.find((s) => s.kind === kind);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, dur);
    if (cfg.stackCap > 1 && existing.stacks < cfg.stackCap) existing.stacks += 1;
    if (kind === 'shield' && opts.magnitude != null) {
      existing.shieldHp = Math.max(existing.shieldHp ?? 0, opts.magnitude);
    }
    return false;
  }
  const eff: StatusEffect = {
    kind,
    remaining: dur,
    nextTickAt: nowT + (cfg.tickEvery ?? 1),
    stacks: 1,
    perTick: cfg.perTickBase != null ? (opts.magnitude ?? cfg.perTickBase) : undefined,
    tickEvery: cfg.tickEvery,
  };
  if (kind === 'shield') eff.shieldHp = opts.magnitude ?? 10;
  target.status.push(eff);
  return true;
}

/** Tick a carrier's status effects. Returns total damage from DoT this tick
 *  (caller applies it). Also fires `onTickHeal(n)` for regen. */
export function tickStatusEffects(
  target: StatusCarrier,
  dt: number,
  nowT: number,
  onTickHeal?: (n: number) => void,
): number {
  let dmg = 0;
  for (let i = target.status.length - 1; i >= 0; i--) {
    const s = target.status[i];
    s.remaining -= dt;
    if (s.remaining <= 0) {
      target.status.splice(i, 1);
      continue;
    }
    if (s.tickEvery && s.perTick && nowT >= s.nextTickAt) {
      s.nextTickAt = nowT + s.tickEvery;
      if (s.kind === 'burn' || s.kind === 'poison') {
        dmg += s.perTick * s.stacks;
      } else if (s.kind === 'regen' && onTickHeal) {
        onTickHeal(s.perTick);
      }
    }
  }
  return dmg;
}

export function hasStatus(target: StatusCarrier, kind: StatusEffectKind): boolean {
  return target.status.some((s) => s.kind === kind);
}

export function getStatus(target: StatusCarrier, kind: StatusEffectKind): StatusEffect | undefined {
  return target.status.find((s) => s.kind === kind);
}

/** Damage-mitigation hook for shield. Returns the damage that punches
 *  through after the shield absorbs what it can. Mutates target.status. */
export function absorbWithShield(target: StatusCarrier, raw: number): number {
  const sh = target.status.find((s) => s.kind === 'shield');
  if (!sh || !sh.shieldHp || sh.shieldHp <= 0) return raw;
  if (sh.shieldHp >= raw) {
    sh.shieldHp -= raw;
    return 0;
  }
  const through = raw - sh.shieldHp;
  sh.shieldHp = 0;
  // Shield broken — remove it. Visual feedback handled by caller.
  const idx = target.status.indexOf(sh);
  if (idx >= 0) target.status.splice(idx, 1);
  return through;
}

/** Slow modifier — 0.55× speed when slowed. */
export function speedMultiplierFromStatus(target: StatusCarrier): number {
  if (hasStatus(target, 'stun')) return 0;
  return hasStatus(target, 'slow') ? 0.55 : 1;
}
