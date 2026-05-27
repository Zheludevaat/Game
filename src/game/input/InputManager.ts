import {
  DEFAULT_GAMEPAD_MAP, GAMEPAD_BUTTON_NAMES, GamepadMap, InputMethod,
  detectLayoutFromPadId, presetForLayout,
} from './controlMappings';
import { STORAGE_KEYS } from '../constants';

/** Parse the vendor / product hints out of a pad.id string. Chromium
 *  reports them as "Vendor: 057e Product: 2009"; older WebKit emits
 *  "057e-2009" or "(STANDARD GAMEPAD Vendor: 057e Product: 2009)". */
function extractIds(padId: string): { vendor?: string; product?: string } {
  const m1 = /vendor:?\s*([0-9a-f]{4}).*product:?\s*([0-9a-f]{4})/i.exec(padId);
  if (m1) return { vendor: m1[1].toLowerCase(), product: m1[2].toLowerCase() };
  const m2 = /([0-9a-f]{4})[\s-]([0-9a-f]{4})/i.exec(padId);
  if (m2) return { vendor: m2[1].toLowerCase(), product: m2[2].toLowerCase() };
  return {};
}

/** Console diagnostic when a new pad connects. Surfaces everything a
 *  developer needs to diagnose a misbehaving controller: raw id,
 *  vendor/product, mapping mode, button/axis counts, and the layout
 *  we picked for it. Tagged so it's easy to grep in devtools. */
function logPadDiagnostics(pad: Gamepad): void {
  const { vendor, product } = extractIds(pad.id);
  const layout = detectLayoutFromPadId(pad.id);
  // eslint-disable-next-line no-console
  console.info(
    '%c[gamepad] connected',
    'color: #6cf6e5; font-weight: bold',
    {
      id: pad.id,
      index: pad.index,
      mapping: pad.mapping || '(empty — non-standard)',
      vendor: vendor ?? '(not parsed)',
      product: product ?? '(not parsed)',
      buttons: pad.buttons.length,
      axes: pad.axes.length,
      detectedLayout: layout,
      preset: layout === 'switch'
        ? 'SWITCH (A=right idx 1, B=bottom idx 0, attack→1)'
        : 'XBOX (A=bottom idx 0, B=right idx 1, attack→0)',
    },
  );
}

/** Log the first button press on the pad after connect — lets the
 *  user verify "I pressed A and it fired index X". Resets on each
 *  fresh connect via firstEdgeLogged. */
function logFirstEdge(idx: number): void {
  // eslint-disable-next-line no-console
  console.info(
    '%c[gamepad] first press',
    'color: #ffe6a3; font-weight: bold',
    {
      index: idx,
      label: GAMEPAD_BUTTON_NAMES[idx] ?? `Btn ${idx}`,
    },
  );
}

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

// Radial deadzone applied to the analog stick magnitude (not per-axis).
// Joy-Cons and worn Pro Controllers commonly drift past 0.22 on a single
// axis — going radial + raising the threshold to 0.30 kills the drift
// without making intentional small movements feel sluggish.
const DEADZONE = 0.30;

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
  // Live mapping source: when set, computeState reads from this on every
  // tick instead of from the cached `mapping` field. App.tsx wires this
  // to point at settings.gamepadMap (the user-visible state) so the
  // in-game bindings never drift from what the Settings UI shows.
  private mappingProvider: (() => GamepadMap) | null = null;
  // When the auto-preset (e.g. Switch swap on first connect) wants to
  // change the bindings, it calls this callback so App.tsx can update
  // settings.gamepadMap — the single source of truth — instead of
  // mutating only the InputManager's cached copy.
  private onAutoPresetApplied: ((m: GamepadMap) => void) | null = null;

  private method: InputMethod = 'keyboard';
  private onMethodChange?: (m: InputMethod) => void;
  /** Wall-clock time (engine timeAlive proxy via performance.now) the
   *  pad last produced input. Used to keep `method='controller'` sticky
   *  on iPad — accidental touch / pause-button taps no longer flip the
   *  input method back to "touch" within ~2 s of pad activity. */
  private lastControllerActivityMs = 0;
  /** True once any pad button or stick movement has been seen this
   *  session. iPad Safari hides connected pads from navigator.getGamepads
   *  until first user interaction with the pad; this flag lets the HUD
   *  show "CONTROLLER" the moment we know one is actually live. */
  private padHasBeenUsed = false;
  /** Track whether we've already logged the FIRST button edge on the
   *  active pad. Resets when the pad changes (different id). */
  private firstEdgeLoggedForId = '';

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
    // Continuous gamepad polling outside the engine's update loop. iPad
    // and other platforms only populate navigator.getGamepads() AFTER
    // first user interaction; the engine's update tick is also paused
    // by the auto-pause-on-tab-hide path. This rAF runs independent
    // of both so the pad is always observable for the HUD pill, menu
    // navigation, and method tracking.
    this.startBackgroundPoll();
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('gamepadconnected', this.onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    window.removeEventListener('blur', this.onBlur);
    this.stopBackgroundPoll();
  }

  private bgRaf = 0;
  private startBackgroundPoll(): void {
    const tick = (): void => {
      // Cheap — getGamepads is fast and scanPads early-outs when nothing
      // is connected. Running this every frame guarantees the gamepad
      // is detected the moment iPadOS Safari exposes it, regardless of
      // whether the game's main update loop is currently active.
      this.scanPads();
      this.bgRaf = requestAnimationFrame(tick);
    };
    this.bgRaf = requestAnimationFrame(tick);
  }
  private stopBackgroundPoll(): void {
    if (this.bgRaf) cancelAnimationFrame(this.bgRaf);
    this.bgRaf = 0;
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

  /** Wire a live mapping source. Once set, computeState reads the
   * provider's return value on every tick — the cached `mapping` field
   * is bypassed. This eliminates the divergence between settings.gamepadMap
   * (user-visible) and InputManager.mapping (in-engine) that caused
   * custom bindings to be ignored in-game. */
  setMappingProvider(fn: (() => GamepadMap) | null): void {
    this.mappingProvider = fn;
  }

  /** Wire a callback fired when the auto-preset (Switch swap on first
   * connect) wants to change bindings. App.tsx uses this to update
   * settings.gamepadMap so the SettingsMenu, Controller Test, and
   * in-game reader all see the same map. */
  setAutoPresetCallback(cb: ((m: GamepadMap) => void) | null): void {
    this.onAutoPresetApplied = cb;
  }

  /** Returns the actively-used mapping (provider's value if wired,
   * else the cached one). Useful for debug / inspection. */
  getActiveMapping(): GamepadMap {
    return this.mappingProvider ? this.mappingProvider() : this.mapping;
  }

  /** Restore the default Xbox-style binding AND clear the "user
   * customised" flag, so the next time a Nintendo pad connects the
   * auto-Switch preset can apply itself. */
  resetMapping(): void {
    this.mapping = { ...DEFAULT_GAMEPAD_MAP };
    this.mappingIsCustom = false;
    try { localStorage.removeItem(STORAGE_KEYS.gamepadMap); } catch { /* */ }
    // If a pad is already connected, re-apply the matching preset right
    // now (Switch → swap; otherwise stays Xbox default).
    if (this.gamepadInfo.connected) this.maybeApplyControllerPreset(this.gamepadInfo.id);
  }

  private loadMapping(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.gamepadMap);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GamepadMap> & { useItem?: number; cycleRelic?: number };
        // Migrate keys renamed in this build: the old `useItem` /
        // `cycleRelic` slots were actually wired in-game to cycle spell
        // and cycle weapon respectively. Carry the user's saved
        // indices over so a returning player doesn't lose their
        // remap when the names changed.
        if (parsed.useItem != null && parsed.cycleSpell == null) {
          parsed.cycleSpell = parsed.useItem;
        }
        if (parsed.cycleRelic != null && parsed.cycleWeapon == null) {
          parsed.cycleWeapon = parsed.cycleRelic;
        }
        delete parsed.useItem;
        delete parsed.cycleRelic;
        this.mapping = { ...DEFAULT_GAMEPAD_MAP, ...parsed };
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
    // Active mapping is whatever the provider returns (the user's live
    // settings.gamepadMap) when wired — so we don't auto-swap if they've
    // already customised. Falls back to the cached field otherwise.
    const current = this.mappingProvider ? this.mappingProvider() : this.mapping;
    let differs = false;
    for (const k of Object.keys(preset) as (keyof GamepadMap)[]) {
      if (current[k] !== preset[k]) { differs = true; break; }
    }
    if (!differs) return;
    // Don't auto-override a map that's already non-default — only nudge
    // when the user is still on a Xbox-default map AND we detect Switch.
    const isOnDefault = Object.keys(DEFAULT_GAMEPAD_MAP).every(
      (k) => current[k as keyof GamepadMap] === DEFAULT_GAMEPAD_MAP[k as keyof GamepadMap]
    );
    if (!isOnDefault) return;
    this.mapping = preset;
    // Notify App so settings.gamepadMap stays in sync with the auto-swap.
    if (this.onAutoPresetApplied) this.onAutoPresetApplied(preset);
  }

  // --- Touch input bridge ---
  setTouchAxes(x: number, y: number): void {
    this.touchAxes.x = x;
    this.touchAxes.y = y;
    // Don't flip the input method to "touch" if the controller has been
    // active in the last 2 s. iPad players with a paired pad shouldn't
    // see touch overlays summoned by an accidental screen brush.
    if (Math.hypot(x, y) > 0.05 && !this.controllerRecentlyActive()) {
      this.setMethod('touch');
    }
  }
  setTouchButton(name: string, down: boolean): void {
    if (down && !this.touchButtons[name]) this.touchPressedThisFrame[name] = true;
    this.touchButtons[name] = down;
    if (down && !this.controllerRecentlyActive()) this.setMethod('touch');
  }

  /** True if the controller has produced input within the stickiness
   *  window. Used to suppress touch-method flips that would otherwise
   *  fire on accidental screen contact (HUD pause button, palm rest,
   *  etc.) on iPad / iPadOS Safari. */
  private controllerRecentlyActive(): boolean {
    if (!this.padHasBeenUsed) return false;
    return performance.now() - this.lastControllerActivityMs < 2000;
  }

  /** True the instant any pad has been seen with input this session.
   *  HUD reads this so an iPad player with a connected pad sees the
   *  "controller" pill even before the first button-edge fires. */
  hasControllerBeenUsed(): boolean { return this.padHasBeenUsed; }

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
    s.cycleWeaponPressed ||= this.keysPressedThisFrame.has('KeyQ');
    s.cycleSpellPressed  ||= this.keysPressedThisFrame.has('KeyR');

    s.uiUp     ||= this.keysPressedThisFrame.has('ArrowUp')    || this.keysPressedThisFrame.has('KeyW');
    s.uiDown   ||= this.keysPressedThisFrame.has('ArrowDown')  || this.keysPressedThisFrame.has('KeyS');
    s.uiLeft   ||= this.keysPressedThisFrame.has('ArrowLeft')  || this.keysPressedThisFrame.has('KeyA');
    s.uiRight  ||= this.keysPressedThisFrame.has('ArrowRight') || this.keysPressedThisFrame.has('KeyD');
    s.uiConfirm||= this.keysPressedThisFrame.has('Enter') || this.keysPressedThisFrame.has('Space') || this.keysPressedThisFrame.has('KeyJ');
    s.uiCancel ||= this.keysPressedThisFrame.has('Escape');

    // Touch — gated on "the controller is NOT actively in use." If a
    // controller is currently producing input we ignore touch entirely
    // for this frame so an accidental screen brush (or a stuck touch
    // button from a TouchControls unmount mid-press) can't override
    // the controller's stick / button reads below.
    const padActive = this.controllerRecentlyActive();
    if (!padActive) {
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
    }

    // Gamepad
    if (this.gamepadInfo.connected) {
      // Radial deadzone — kill drift regardless of axis. Then rescale so
      // values past the deadzone span [0..1] smoothly.
      const rawX = this.gamepadInfo.axes[0] ?? 0;
      const rawY = this.gamepadInfo.axes[1] ?? 0;
      const mag = Math.hypot(rawX, rawY);
      let ax = 0, ay = 0;
      if (mag > DEADZONE) {
        const scale = Math.min(1, (mag - DEADZONE) / (1 - DEADZONE)) / mag;
        ax = rawX * scale;
        ay = rawY * scale;
      }
      if (ax !== 0 || ay !== 0) {
        s.moveX = ax; s.moveY = ay;
      }
      // Live source of truth — read the user's current settings.gamepadMap
      // every tick when wired. Falls back to the cached field only when
      // no provider is attached (e.g. early boot before App connects).
      const m = this.mappingProvider ? this.mappingProvider() : this.mapping;
      const dpadX = (this.padDown(m.dpadRight) ? 1 : 0) - (this.padDown(m.dpadLeft) ? 1 : 0);
      const dpadY = (this.padDown(m.dpadDown) ? 1 : 0) - (this.padDown(m.dpadUp) ? 1 : 0);
      if (dpadX !== 0 || dpadY !== 0) { s.moveX = dpadX; s.moveY = dpadY; }

      if (this.padDown(m.attack)) s.attackHeld = true;
      if (this.padDown(m.spell)) s.spellHeld = true;
      // Diagnostic: log every action edge so the user can verify in
      // devtools that the engine actually receives their pad input.
      // If the test screen shows "btn 5 = attack" but the player
      // presses btn 5 in-game and no [gamepad action] line appears,
      // the engine isn't seeing the press at all (network / focus
      // issue). If the line appears but the action doesn't visibly
      // fire, the bug is in the gameplay layer.
      const padFired = (label: string, idx: number, was: boolean): boolean => {
        if (was) {
          // eslint-disable-next-line no-console
          console.info('%c[gamepad action] ' + label, 'color: #a4faf0', `via btn ${idx}`);
        }
        return was;
      };
      s.attackPressed       ||= padFired('attack',      m.attack,      this.padPressed(m.attack));
      s.dashPressed         ||= padFired('dash',        m.dash,        this.padPressed(m.dash));
      s.spellPressed        ||= padFired('spell',       m.spell,       this.padPressed(m.spell));
      s.interactPressed     ||= padFired('interact',    m.interact,    this.padPressed(m.interact));
      s.pausePressed        ||= padFired('pause',       m.pause,       this.padPressed(m.pause));
      s.mapPressed          ||= padFired('map',         m.map,         this.padPressed(m.map));
      s.cycleWeaponPressed  ||= padFired('cycleWeapon', m.cycleWeapon, this.padPressed(m.cycleWeapon));
      s.cycleSpellPressed   ||= padFired('cycleSpell',  m.cycleSpell,  this.padPressed(m.cycleSpell));

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
      // Diagnostic — surfaces in browser devtools so the user can see
      // exactly how their controller is being recognised. Includes
      // mapping mode ("standard" or empty), vendor/product extracted
      // from the id when present, button + axes count.
      logPadDiagnostics(active);
    }
    let anyEdge = false;
    let firstEdgeIdx = -1;
    for (let i = 0; i < pressed.length; i++) {
      if (pressed[i] && !this.prevPadButtons[i]) {
        anyEdge = true;
        if (firstEdgeIdx < 0) firstEdgeIdx = i;
      }
    }
    // Log the very first edge per pad so the user can confirm which
    // raw index their physical button maps to. Tagged so devtools
    // shows it clearly without spamming.
    if (firstEdgeIdx >= 0 && this.firstEdgeLoggedForId !== active.id) {
      this.firstEdgeLoggedForId = active.id;
      logFirstEdge(firstEdgeIdx);
    }
    // Also catch buttons that are HELD past the first frame so iPad
    // players who pair + grip the controller see the "controller"
    // input method flip even without releasing.
    let anyHeld = false;
    for (let i = 0; i < pressed.length; i++) {
      if (pressed[i]) { anyHeld = true; break; }
    }
    // Use radial magnitude to decide "the player intentionally moved the
    // stick" so drift can't flip the input method to controller.
    const stickMag = Math.hypot(newPad.axes[0] ?? 0, newPad.axes[1] ?? 0);
    if (anyEdge || stickMag > DEADZONE) {
      this.setMethod('controller');
      this.lastControllerActivityMs = performance.now();
      this.padHasBeenUsed = true;
    } else if (anyHeld) {
      // Held button still counts as "controller active" for stickiness,
      // even though we don't re-fire setMethod on every tick.
      this.lastControllerActivityMs = performance.now();
      this.padHasBeenUsed = true;
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
    // gamepadconnected on iPadOS Safari fires only after first user
    // interaction with the pad — so the event firing is itself a
    // confirmed "controller is live" signal. Stamp the activity timer.
    this.lastControllerActivityMs = performance.now();
    this.padHasBeenUsed = true;
  };
  private onGamepadDisconnected = (_e: GamepadEvent): void => {
    this.gamepadIndex = null;
    this.gamepadInfo = { connected: false, id: '', index: -1, axes: [], buttons: [], pressed: [] };
  };
  private onBlur = (): void => {
    this.keysDown.clear();
  };
}
