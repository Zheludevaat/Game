import {
  DEFAULT_GAMEPAD_MAP, GamepadMap, InputMethod,
  detectLayoutFromPadId, presetForLayout,
} from './controlMappings';
import { STORAGE_KEYS } from '../constants';

export interface InputState {
  moveX: number;
  moveY: number;
  attackPressed: boolean;
  attackHeld: boolean;
  dashPressed: boolean;
  spellPressed: boolean;
  spellHeld: boolean;
  interactPressed: boolean;
  pausePressed: boolean;
  mapPressed: boolean;
  useItemPressed: boolean;
  cycleRelicPressed: boolean;
  cycleWeaponPressed: boolean;
  cycleSpellPressed: boolean;
  uiUp: boolean;
  uiDown: boolean;
  uiLeft: boolean;
  uiRight: boolean;
  uiConfirm: boolean;
  uiCancel: boolean;
}

export type GamepadInfo = {
  connected: boolean;
  id: string;
  index: number;
  axes: number[];
  buttons: number[]; // 0..1
  pressed: boolean[];
};

const DEADZONE = 0.22;

export class InputManager {
  private keysDown = new Set<string>();
  private keysPressedThisFrame = new Set<string>();

  private touchAxes = { x: 0, y: 0 };
  private touchButtons: Record<string, boolean> = {};
  private touchPressedThisFrame: Record<string, boolean> = {};

  private prevPadButtons: boolean[] = [];
  private gamepadIndex: number | null = null;
  private gamepadInfo: GamepadInfo = {
    connected: false, id: '', index: -1, axes: [], buttons: [], pressed: [],
  };
  private mapping: GamepadMap = { ...DEFAULT_GAMEPAD_MAP };
  private mappingIsCustom = false;

  private method: InputMethod = 'keyboard';
  private onMethodChange?: (m: InputMethod) => void;

  state: InputState = this.blankState();

  constructor() {
    this.loadMapping();
  }

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('gamepadconnected', this.onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    window.addEventListener('blur', this.onBlur);
    // Probe any existing pads
    this.scanPads();
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('gamepadconnected', this.onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    window.removeEventListener('blur', this.onBlur);
  }

  setMethodCallback(cb: (m: InputMethod) => void): void {
    this.onMethodChange = cb;
  }

  getMethod(): InputMethod { return this.method; }
  getGamepad(): GamepadInfo { return this.gamepadInfo; }
  getMapping(): GamepadMap { return { ...this.mapping }; }

  setMapping(m: GamepadMap): void {
    this.mapping = { ...m };
    this.mappingIsCustom = true;
    try { localStorage.setItem(STORAGE_KEYS.gamepadMap, JSON.stringify(m)); } catch { /* */ }
  }

  resetMapping(): void { this.setMapping({ ...DEFAULT_GAMEPAD_MAP }); }

  private loadMapping(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.gamepadMap);
      if (raw) {
        this.mapping = { ...DEFAULT_GAMEPAD_MAP, ...JSON.parse(raw) };
        this.mappingIsCustom = true;
      }
    } catch { /* */ }
  }

  /**
   * Auto-apply Switch or Xbox face-button preset when a new pad connects.
   * Skipped when the user has explicitly customised the map (persisted to
   * localStorage by setMapping). The detection is by pad.id substring.
   */
  private maybeApplyControllerPreset(padId: string): void {
    if (this.mappingIsCustom) return;
    const layout = detectLayoutFromPadId(padId);
    const preset = presetForLayout(layout);
    // Compare and only mutate if different — avoid pointless re-renders.
    let differs = false;
    for (const k of Object.keys(preset) as (keyof GamepadMap)[]) {
      if (this.mapping[k] !== preset[k]) { differs = true; break; }
    }
    if (differs) this.mapping = preset;
  }

  // --- Touch input bridge ---
  setTouchAxes(x: number, y: number): void {
    this.touchAxes.x = x;
    this.touchAxes.y = y;
    if (Math.hypot(x, y) > 0.05) this.setMethod('touch');
  }
  setTouchButton(name: string, down: boolean): void {
    if (down && !this.touchButtons[name]) this.touchPressedThisFrame[name] = true;
    this.touchButtons[name] = down;
    if (down) this.setMethod('touch');
  }

  // --- Tick ---
  tick(): void {
    this.scanPads();
    this.computeState();
    this.keysPressedThisFrame.clear();
    this.touchPressedThisFrame = {};
  }

  private blankState(): InputState {
    return {
      moveX: 0, moveY: 0,
      attackPressed: false, attackHeld: false,
      dashPressed: false, spellPressed: false, spellHeld: false,
      interactPressed: false, pausePressed: false, mapPressed: false,
      useItemPressed: false, cycleRelicPressed: false,
      cycleWeaponPressed: false, cycleSpellPressed: false,
      uiUp: false, uiDown: false, uiLeft: false, uiRight: false,
      uiConfirm: false, uiCancel: false,
    };
  }

  private computeState(): void {
    const s = this.blankState();

    // Keyboard movement
    const kbX = (this.keysDown.has('ArrowRight') || this.keysDown.has('KeyD') ? 1 : 0) -
                (this.keysDown.has('ArrowLeft')  || this.keysDown.has('KeyA') ? 1 : 0);
    const kbY = (this.keysDown.has('ArrowDown')  || this.keysDown.has('KeyS') ? 1 : 0) -
                (this.keysDown.has('ArrowUp')    || this.keysDown.has('KeyW') ? 1 : 0);

    s.moveX = kbX;
    s.moveY = kbY;

    // Keyboard actions
    if (this.keysDown.has('KeyJ')) s.attackHeld = true;
    if (this.keysDown.has('KeyL')) s.spellHeld = true;
    s.attackPressed   ||= this.keysPressedThisFrame.has('KeyJ');
    s.dashPressed     ||= this.keysPressedThisFrame.has('KeyK') || this.keysPressedThisFrame.has('Space');
    s.spellPressed    ||= this.keysPressedThisFrame.has('KeyL');
    s.interactPressed ||= this.keysPressedThisFrame.has('KeyE') || this.keysPressedThisFrame.has('Enter');
    s.pausePressed    ||= this.keysPressedThisFrame.has('Escape') || this.keysPressedThisFrame.has('KeyP');
    s.mapPressed      ||= this.keysPressedThisFrame.has('KeyM') || this.keysPressedThisFrame.has('Tab');
    s.useItemPressed  ||= this.keysPressedThisFrame.has('KeyU');
    s.cycleRelicPressed ||= this.keysPressedThisFrame.has('KeyT');
    s.cycleWeaponPressed ||= this.keysPressedThisFrame.has('KeyQ');
    s.cycleSpellPressed  ||= this.keysPressedThisFrame.has('KeyR');

    s.uiUp     ||= this.keysPressedThisFrame.has('ArrowUp')    || this.keysPressedThisFrame.has('KeyW');
    s.uiDown   ||= this.keysPressedThisFrame.has('ArrowDown')  || this.keysPressedThisFrame.has('KeyS');
    s.uiLeft   ||= this.keysPressedThisFrame.has('ArrowLeft')  || this.keysPressedThisFrame.has('KeyA');
    s.uiRight  ||= this.keysPressedThisFrame.has('ArrowRight') || this.keysPressedThisFrame.has('KeyD');
    s.uiConfirm||= this.keysPressedThisFrame.has('Enter') || this.keysPressedThisFrame.has('Space') || this.keysPressedThisFrame.has('KeyJ');
    s.uiCancel ||= this.keysPressedThisFrame.has('Escape');

    // Touch
    if (Math.hypot(this.touchAxes.x, this.touchAxes.y) > 0.05) {
      s.moveX = this.touchAxes.x;
      s.moveY = this.touchAxes.y;
    }
    if (this.touchButtons['attack']) s.attackHeld = true;
    if (this.touchButtons['spell']) s.spellHeld = true;
    s.attackPressed   ||= !!this.touchPressedThisFrame['attack'];
    s.dashPressed     ||= !!this.touchPressedThisFrame['dash'];
    s.spellPressed    ||= !!this.touchPressedThisFrame['spell'];
    s.interactPressed ||= !!this.touchPressedThisFrame['interact'];
    s.pausePressed    ||= !!this.touchPressedThisFrame['pause'];
    s.mapPressed      ||= !!this.touchPressedThisFrame['map'];
    s.cycleWeaponPressed ||= !!this.touchPressedThisFrame['cycleWeapon'];
    s.cycleSpellPressed  ||= !!this.touchPressedThisFrame['cycleSpell'];

    // Gamepad
    if (this.gamepadInfo.connected) {
      const ax = this.applyDead(this.gamepadInfo.axes[0] ?? 0);
      const ay = this.applyDead(this.gamepadInfo.axes[1] ?? 0);
      if (Math.abs(ax) > 0 || Math.abs(ay) > 0) {
        s.moveX = ax; s.moveY = ay;
      }
      const m = this.mapping;
      const dpadX = (this.padDown(m.dpadRight) ? 1 : 0) - (this.padDown(m.dpadLeft) ? 1 : 0);
      const dpadY = (this.padDown(m.dpadDown) ? 1 : 0) - (this.padDown(m.dpadUp) ? 1 : 0);
      if (dpadX !== 0 || dpadY !== 0) { s.moveX = dpadX; s.moveY = dpadY; }

      if (this.padDown(m.attack)) s.attackHeld = true;
      if (this.padDown(m.spell)) s.spellHeld = true;
      s.attackPressed   ||= this.padPressed(m.attack);
      s.dashPressed     ||= this.padPressed(m.dash);
      s.spellPressed    ||= this.padPressed(m.spell);
      s.interactPressed ||= this.padPressed(m.interact);
      s.pausePressed    ||= this.padPressed(m.pause);
      s.mapPressed      ||= this.padPressed(m.map);
      s.useItemPressed  ||= this.padPressed(m.useItem);
      s.cycleRelicPressed ||= this.padPressed(m.cycleRelic);
      s.cycleWeaponPressed ||= this.padPressed(m.cycleRelic);
      s.cycleSpellPressed  ||= this.padPressed(m.useItem);

      s.uiUp     ||= this.padPressed(m.dpadUp);
      s.uiDown   ||= this.padPressed(m.dpadDown);
      s.uiLeft   ||= this.padPressed(m.dpadLeft);
      s.uiRight  ||= this.padPressed(m.dpadRight);
      s.uiConfirm||= this.padPressed(m.attack);
      s.uiCancel ||= this.padPressed(m.dash);
    }

    // Normalize diagonal movement
    const ml = Math.hypot(s.moveX, s.moveY);
    if (ml > 1) { s.moveX /= ml; s.moveY /= ml; }

    this.state = s;
  }

  private applyDead(v: number): number {
    if (Math.abs(v) < DEADZONE) return 0;
    const s = Math.sign(v);
    return s * (Math.abs(v) - DEADZONE) / (1 - DEADZONE);
  }

  private setMethod(m: InputMethod): void {
    if (this.method !== m) {
      this.method = m;
      this.onMethodChange?.(m);
    }
  }

  private padDown(idx: number): boolean {
    return (this.gamepadInfo.buttons[idx] ?? 0) > 0.5;
  }
  private padPressed(idx: number): boolean {
    const now = (this.gamepadInfo.buttons[idx] ?? 0) > 0.5;
    const prev = this.prevPadButtons[idx] ?? false;
    return now && !prev;
  }

  private scanPads(): void {
    const pads = (navigator.getGamepads?.() ?? []) as (Gamepad | null)[];
    let active: Gamepad | null = null;
    // Prefer remembered index if still connected
    if (this.gamepadIndex != null && pads[this.gamepadIndex]) {
      active = pads[this.gamepadIndex];
    } else {
      for (const p of pads) if (p) { active = p; break; }
    }
    if (!active) {
      if (this.gamepadInfo.connected) {
        this.gamepadInfo = { connected: false, id: '', index: -1, axes: [], buttons: [], pressed: [] };
      }
      this.prevPadButtons = [];
      this.gamepadIndex = null;
      return;
    }
    this.gamepadIndex = active.index;

    const buttons = active.buttons.map((b) => (typeof b === 'number' ? b : b.value));
    const pressed = active.buttons.map((b) => (typeof b === 'number' ? b > 0.5 : b.pressed));
    const newPad: GamepadInfo = {
      connected: true,
      id: active.id,
      index: active.index,
      axes: Array.from(active.axes),
      buttons,
      pressed,
    };

    // Detect interaction => switch method
    if (!this.gamepadInfo.connected) {
      this.prevPadButtons = pressed.map(() => false);
    }
    // When a new (or different) pad first connects, auto-apply the
    // matching preset — but only if the user hasn't customised the map.
    if (this.gamepadInfo.id !== active.id) {
      this.maybeApplyControllerPreset(active.id);
    }
    let anyEdge = false;
    for (let i = 0; i < pressed.length; i++) {
      if (pressed[i] && !this.prevPadButtons[i]) anyEdge = true;
    }
    if (anyEdge || Math.abs(newPad.axes[0] ?? 0) > DEADZONE || Math.abs(newPad.axes[1] ?? 0) > DEADZONE) {
      this.setMethod('controller');
    }

    this.gamepadInfo = newPad;
    this.prevPadButtons = pressed.slice();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (e.code === 'Tab') e.preventDefault();
    if (!this.keysDown.has(e.code)) this.keysPressedThisFrame.add(e.code);
    this.keysDown.add(e.code);
    this.setMethod('keyboard');
  };
  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };
  private onGamepadConnected = (e: GamepadEvent): void => {
    this.gamepadIndex = e.gamepad.index;
    this.scanPads();
    this.setMethod('controller');
  };
  private onGamepadDisconnected = (_e: GamepadEvent): void => {
    this.gamepadIndex = null;
    this.gamepadInfo = { connected: false, id: '', index: -1, axes: [], buttons: [], pressed: [] };
  };
  private onBlur = (): void => {
    this.keysDown.clear();
  };
}
