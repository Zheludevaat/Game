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
export const DEFAULT_GAMEPAD_MAP: GamepadMap = {
  attack: 0,      // A / Cross
  dash: 1,        // B / Circle
  spell: 2,       // X / Square
  interact: 3,    // Y / Triangle
  useItem: 4,     // LB / L1
  cycleRelic: 5,  // RB / R1
  pause: 9,       // Start / Menu
  map: 8,         // Select / Share
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
};

export const GAMEPAD_BUTTON_NAMES: Record<number, string> = {
  0: 'A / ×',
  1: 'B / ○',
  2: 'X / □',
  3: 'Y / △',
  4: 'LB / L1',
  5: 'RB / R1',
  6: 'LT / L2',
  7: 'RT / R2',
  8: 'Select / Share',
  9: 'Start / Menu',
  10: 'L Stick Click',
  11: 'R Stick Click',
  12: 'D-pad Up',
  13: 'D-pad Down',
  14: 'D-pad Left',
  15: 'D-pad Right',
  16: 'Home',
};

export type InputMethod = 'controller' | 'keyboard' | 'touch';
