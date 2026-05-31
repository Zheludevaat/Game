// ── Armor ───────────────────────────────────────────────────────────────────

/**
 * Apply flat armor damage reduction.
 * Formula: incoming - armor, minimum 1.
 */
export function applyArmorDamage(incoming: number, armor: number): number {
  return Math.max(1, Math.round(incoming - armor));
}

// ── Hit-pause ───────────────────────────────────────────────────────────────

/**
 * Duration of hit-pause (seconds) based on damage dealt.
 * Big hits (>8) get a longer pause for "punch" feel.
 */
export function hitPauseDuration(damage: number): number {
  return damage >= 8 ? 0.05 : 0.025;
}

/**
 * Maximum time-alive boundary for hit-pause stacking.
 * Prevents multi-hits from locking the world.
 */
export function hitPauseMaxBound(): number {
  return 0.06;
}

// ── Damage computation ──────────────────────────────────────────────────────

export function calculateMeleeDamage(
  attack: number,
  damageMul: number,
  weaponDamageMul: number,
): number {
  return attack * damageMul * weaponDamageMul;
}

export function calculateSpellDamage(
  spellPower: number,
  damageMul: number,
  spellDamageMul: number,
): number {
  return spellPower * damageMul * spellDamageMul;
}
