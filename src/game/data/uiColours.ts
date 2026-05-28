// UI palette — semantic colour names used by HUD overlays + floating
// damage / status / event numbers. Replaces inline hex strings that
// used to be scattered across spawnDamageNumber call sites. Adding a
// new event type (e.g. a new buff label) gets its own slot here so
// retheming is a single-file edit.

/** Damage / status / event tints used by `spawnDamageNumber`. */
export const DAMAGE_COLOURS = {
  /** Bright crit / synergy / generic celebratory gold. */
  crit:    '#ffe6a3',
  /** Mana / spell / spell-pickup / "TOO FAR" hint. */
  spell:   '#9b6cff',
  /** Coin / weapon name pickups. */
  weapon:  '#f4d27a',
  /** Heal / shield / mana-return. */
  heal:    '#6cf6e5',
  /** Burn / poison DoT damage. */
  burn:    '#ff7a3a',
  /** Locked / error / damage-taken / failure. */
  error:   '#e23a4a',
  /** Revive label (slightly warmer than gold). */
  revive:  '#ffd97a',
  /** Echo charm / cool-mint accent. */
  echo:    '#a4faf0',
  /** Mirror Sigil reflect label — pale ice-blue. */
  reflect: '#cdf6ff',
} as const;
