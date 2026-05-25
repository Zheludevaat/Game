export type ActionName =
  | 'attack'
  | 'dash'
  | 'spell'
  | 'interact'
  | 'pause'
  | 'map'
  | 'useItem'
  | 'cycleRelic';

export interface GamepadMap {
  attack: number;
  dash: number;
  spell: number;
  interact: number;
  pause: number;
  map: number;
  useItem: number;
  cycleRelic: number;
  // D-pad
  dpadUp: number;
  dpadDown: number;
  dpadLeft: number;
  dpadRight: number;
}

// Standard mapping ids — see https://www.w3.org/TR/gamepad/
//
// Xbox-style controllers use the canonical "Standard Gamepad" mapping:
//   button[0] = bottom (Xbox A),   button[1] = right (Xbox B)
//   button[2] = left   (Xbox X),   button[3] = top   (Xbox Y)
//
// Nintendo controllers (Switch Pro, Joy-Con) report the SAME physical
// positions through the Standard Gamepad mapping — but the BUTTON LABELS
// are reversed:
//   button[0] = bottom (Nintendo B),  button[1] = right (Nintendo A)
//   button[2] = left   (Nintendo Y),  button[3] = top   (Nintendo X)
//
// Nintendo convention treats "A" (right) as confirm and "B" (bottom) as
// cancel — the inverse of Xbox. We detect Nintendo controllers by their
// pad.id and apply a swapped preset so the action a Switch player
// presses by NAME ("press A to attack") does what they expect.
export const DEFAULT_GAMEPAD_MAP: GamepadMap = {
  attack: 0,      // A / Cross  (Xbox A, bottom)
  dash: 1,        // B / Circle (Xbox B, right)
  spell: 2,       // X / Square (Xbox X, left)
  interact: 3,    // Y / Triangle (Xbox Y, top)
  useItem: 4,     // LB / L1
  cycleRelic: 5,  // RB / R1
  pause: 9,       // Start / Menu / +
  map: 8,         // Select / Share / −
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
};

// Nintendo Switch preset — swaps face buttons so labelled "A" (right,
// index 1) is the primary action and labelled "B" (bottom, index 0) is
// the secondary, matching Nintendo's house style.
export const SWITCH_GAMEPAD_MAP: GamepadMap = {
  attack: 1,      // A button (Nintendo right)
  dash: 0,        // B button (Nintendo bottom)
  spell: 3,       // X button (Nintendo top)
  interact: 2,    // Y button (Nintendo left)
  useItem: 4,     // L
  cycleRelic: 5,  // R
  pause: 9,       // + (Plus)
  map: 8,         // − (Minus)
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
};

export type ControllerLayout = 'xbox' | 'switch';

/** Identify a Nintendo controller by its Gamepad API id string.
 *
 * Conservative on purpose — generic / third-party controllers must keep
 * the Xbox-style default. Only specific Nintendo identifiers count:
 *   - "Joy-Con" or "Pro Controller" in the human-readable id, OR
 *   - Nintendo's USB vendor id 057e (formatted as "Vendor: 057e" by
 *     Chromium and "057e-xxxx" or "057exxxx" by older WebKit).
 * The bare words "switch" and "nintendo" are NOT matched because they
 * collide with generic third-party controllers that use those terms in
 * marketing strings.
 */
export function detectLayoutFromPadId(id: string | undefined | null): ControllerLayout {
  if (!id) return 'xbox';
  const lower = id.toLowerCase();
  if (lower.includes('joy-con') || lower.includes('joycon')) return 'switch';
  if (lower.includes('pro controller')) return 'switch';
  if (lower.includes('057e')) return 'switch';
  return 'xbox';
}

/** Pick the right default preset for an identified controller. */
export function presetForLayout(layout: ControllerLayout): GamepadMap {
  return layout === 'switch' ? { ...SWITCH_GAMEPAD_MAP } : { ...DEFAULT_GAMEPAD_MAP };
}

/**
 * Semantic button indices used by menu screens. Each layout designates
 * a different physical index for "confirm" / "cancel" — Switch uses the
 * right-position button (idx 1) for confirm because that's its labelled A;
 * Xbox uses the bottom-position button (idx 0).
 */
export function confirmButtonIdx(layout: ControllerLayout): number {
  return layout === 'switch' ? 1 : 0;
}
export function cancelButtonIdx(layout: ControllerLayout): number {
  return layout === 'switch' ? 0 : 1;
}

// Names show both naming systems and the physical position so the user
// is never confused by Xbox vs Nintendo labelling differences.
export const GAMEPAD_BUTTON_NAMES: Record<number, string> = {
  0: 'A / × / B (bottom)',
  1: 'B / ○ / A (right)',
  2: 'X / □ / Y (left)',
  3: 'Y / △ / X (top)',
  4: 'LB / L1 / L',
  5: 'RB / R1 / R',
  6: 'LT / L2 / ZL',
  7: 'RT / R2 / ZR',
  8: 'Select / Share / −',
  9: 'Start / Menu / +',
  10: 'L Stick Click',
  11: 'R Stick Click',
  12: 'D-pad Up',
  13: 'D-pad Down',
  14: 'D-pad Left',
  15: 'D-pad Right',
  16: 'Home',
};

export type InputMethod = 'controller' | 'keyboard' | 'touch';
