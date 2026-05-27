import { useEffect, useState } from 'react';
import { SettingsState } from '../game/GameTypes';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { DEFAULT_GAMEPAD_MAP, GAMEPAD_BUTTON_NAMES } from '../game/input/controlMappings';
import { useGamepadButtons } from './useGamepadButtons';

interface Props {
  settings: SettingsState;
  onChange: (s: SettingsState) => void;
  onResetSave: () => void;
  onResetPad: () => void;
  onBack: () => void;
}

type GamepadAction = keyof typeof DEFAULT_GAMEPAD_MAP;

interface RowDef {
  id: string;
  label: string;
  kind: 'slider' | 'toggle' | 'dropdown' | 'remap' | 'button';
  // Slider
  min?: number; max?: number; step?: number;
  // Dropdown
  options?: string[];
  // Remap
  action?: GamepadAction;
}

const PIXEL_SCALE_OPTIONS = ['auto', '1', '2', '3', '4'];

// Human-readable labels for each pad binding row. Source of truth lives
// in controlMappings.ts — keep these in sync if you add a new action.
const PAD_LABELS: Record<GamepadAction, string> = {
  attack: 'Attack',
  dash: 'Dash',
  spell: 'Spell',
  interact: 'Interact / Use',
  pause: 'Pause',
  map: 'Map',
  cycleWeapon: 'Cycle Weapon',
  cycleSpell: 'Cycle Spell',
  cycleConsumable: 'Cycle Item',
  useConsumable: 'Use Item',
  ultimate: 'Ultimate',
  dpadUp: 'D-pad Up',
  dpadDown: 'D-pad Down',
  dpadLeft: 'D-pad Left',
  dpadRight: 'D-pad Right',
};

export function SettingsMenu({ settings, onChange, onResetSave, onResetPad, onBack }: Props): JSX.Element {
  const [confirm, setConfirm] = useState(false);
  const [remapping, setRemapping] = useState<GamepadAction | null>(null);
  const set = <K extends keyof SettingsState>(key: K, val: SettingsState[K]): void => {
    onChange({ ...settings, [key]: val });
  };

  const rows: RowDef[] = [
    { id: 'musicVolume', label: 'Music Volume', kind: 'slider', min: 0, max: 1, step: 0.05 },
    { id: 'sfxVolume',   label: 'SFX Volume',   kind: 'slider', min: 0, max: 1, step: 0.05 },
    { id: 'touchControls', label: 'Touch Controls', kind: 'toggle' },
    { id: 'reducedParticles', label: 'Reduce Particles', kind: 'toggle' },
    { id: 'skipTutorial', label: 'Skip Tutorial', kind: 'toggle' },
    { id: 'pixelScale', label: 'Pixel Scale', kind: 'dropdown', options: PIXEL_SCALE_OPTIONS },
    ...(Object.keys(DEFAULT_GAMEPAD_MAP) as GamepadAction[]).map((action) => ({
      id: `remap.${action}`,
      // Friendlier labels — the raw key names ("cycleWeapon") read as
      // identifiers, not button assignments. Whatever a binding
      // ACTUALLY does in-game must match what the row says.
      label: `Pad: ${PAD_LABELS[action] ?? action}`,
      kind: 'remap' as const,
      action,
    })),
    { id: 'resetPad', label: 'Reset Pad Bindings to Default', kind: 'button' },
    { id: 'resetSave', label: confirm ? 'Confirm Reset' : 'Reset Save Data', kind: 'button' },
    ...(confirm ? [{ id: 'cancelReset', label: 'Cancel', kind: 'button' as const }] : []),
    { id: 'back', label: 'Back', kind: 'button' },
  ];

  const [focus, setFocus] = useState(0);

  // Clamp focus when rows change
  useEffect(() => {
    if (focus >= rows.length) setFocus(Math.max(0, rows.length - 1));
  }, [rows.length, focus]);

  const remapAction = (action: GamepadAction): void => {
    setRemapping(action);
    const start = performance.now();
    // Snapshot any buttons that are ALREADY held when remap begins —
    // these don't count as "the player's chosen button." Only a NEW
    // press (rising edge) is recorded. This stops the click that
    // entered remap from immediately being assigned (e.g. mouse-click
    // bleeding into the next-frame poll, or a held controller button
    // from the navigation that opened this menu).
    const heldAtStart = new Set<number>();
    const pads0 = navigator.getGamepads?.() ?? [];
    for (const pad of pads0) {
      if (!pad) continue;
      for (let i = 0; i < pad.buttons.length; i++) {
        if (pad.buttons[i]?.pressed) heldAtStart.add(i);
      }
      break;
    }
    const tick = (): void => {
      if (performance.now() - start > 6000) { setRemapping(null); return; }
      const pads = navigator.getGamepads?.() ?? [];
      for (const pad of pads) {
        if (!pad) continue;
        for (let i = 0; i < pad.buttons.length; i++) {
          if (!pad.buttons[i]?.pressed) {
            // Button released — it's now eligible for a fresh press.
            heldAtStart.delete(i);
            continue;
          }
          if (heldAtStart.has(i)) continue; // still held from before remap
          // Fresh rising edge — record this binding.
          onChange({ ...settings, gamepadMap: { ...settings.gamepadMap, [action]: i } });
          setRemapping(null);
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const activate = (): void => {
    if (remapping) return;
    const row = rows[focus];
    if (!row) return;
    if (row.kind === 'toggle') {
      const key = row.id as 'touchControls' | 'reducedParticles' | 'skipTutorial';
      set(key, !settings[key] as never);
    } else if (row.kind === 'dropdown') {
      const opts = row.options!;
      const cur = settings.pixelScale;
      const i = opts.indexOf(cur);
      const next = opts[(i + 1) % opts.length] as SettingsState['pixelScale'];
      set('pixelScale', next);
    } else if (row.kind === 'remap' && row.action) {
      remapAction(row.action);
    } else if (row.kind === 'button') {
      if (row.id === 'back') onBack();
      else if (row.id === 'resetSave') {
        if (!confirm) setConfirm(true);
        else { setConfirm(false); onResetSave(); }
      } else if (row.id === 'cancelReset') setConfirm(false);
      else if (row.id === 'resetPad') {
        onChange({ ...settings, gamepadMap: { ...DEFAULT_GAMEPAD_MAP } });
        onResetPad();
      }
    }
  };

  const adjust = (dir: number): void => {
    if (remapping) return;
    const row = rows[focus];
    if (!row) return;
    if (row.kind === 'slider') {
      const key = row.id as 'musicVolume' | 'sfxVolume';
      const cur = settings[key];
      const next = Math.max(row.min!, Math.min(row.max!, +(cur + dir * (row.step ?? 0.05)).toFixed(2)));
      set(key, next as never);
    } else if (row.kind === 'toggle') {
      const key = row.id as 'touchControls' | 'reducedParticles' | 'skipTutorial';
      set(key, !settings[key] as never);
    } else if (row.kind === 'dropdown') {
      const opts = row.options!;
      const i = opts.indexOf(settings.pixelScale);
      const next = opts[(i + dir + opts.length) % opts.length] as SettingsState['pixelScale'];
      set('pixelScale', next);
    }
  };

  useGamepadButtons({
    onA: activate,
    onB: () => { if (remapping) return; if (confirm) setConfirm(false); else onBack(); },
    onStart: () => { if (!remapping) onBack(); },
    onUp:   () => { if (!remapping) setFocus((f) => (f - 1 + rows.length) % rows.length); },
    onDown: () => { if (!remapping) setFocus((f) => (f + 1) % rows.length); },
    onLeft:  () => adjust(-1),
    onRight: () => adjust(1),
    // Disable the whole hook while a remap is active. The remapAction
    // loop is the only thing that should observe pad input until the
    // player has assigned a button — otherwise pressing B to bind
    // would ALSO trigger the menu's cancel handler.
    enabled: !remapping,
  });

  const Row = ({ row, i }: { row: RowDef; i: number }): JSX.Element => {
    const focused = focus === i;
    const focusedClass = focused ? ' settings-row-focused' : '';
    if (row.kind === 'slider') {
      const key = row.id as 'musicVolume' | 'sfxVolume';
      const v = settings[key];
      return (
        <div className={'settings-row' + focusedClass} onMouseEnter={() => setFocus(i)}>
          <span>{row.label}</span>
          <div className="settings-slider">
            <div className="settings-slider-track">
              <div className="settings-slider-fill" style={{ width: `${(v - row.min!) / (row.max! - row.min!) * 100}%` }} />
            </div>
            <input
              type="range"
              min={row.min} max={row.max} step={row.step}
              value={v}
              onChange={(e) => set(key, Number(e.target.value) as never)}
            />
            <span className="settings-value">{Math.round(v * 100)}%</span>
          </div>
        </div>
      );
    }
    if (row.kind === 'toggle') {
      const key = row.id as 'touchControls' | 'reducedParticles' | 'skipTutorial';
      const on = settings[key];
      return (
        <div className={'settings-row' + focusedClass} onMouseEnter={() => setFocus(i)}>
          <span>{row.label}</span>
          <div className={`toggle ${on ? 'on' : ''}`} onClick={() => set(key, !on as never)}>
            <div className="knob" />
          </div>
        </div>
      );
    }
    if (row.kind === 'dropdown') {
      return (
        <div className={'settings-row' + focusedClass} onMouseEnter={() => setFocus(i)}>
          <span>{row.label}</span>
          <div className="settings-dropdown">
            <button type="button" onClick={() => adjustForIdx(i, -1)} className="settings-arrow">◀</button>
            <span className="settings-value">{settings.pixelScale}</span>
            <button type="button" onClick={() => adjustForIdx(i, 1)} className="settings-arrow">▶</button>
          </div>
        </div>
      );
    }
    if (row.kind === 'remap') {
      const action = row.action!;
      const isWaiting = remapping === action;
      return (
        <div className={'settings-row' + focusedClass} onMouseEnter={() => setFocus(i)}>
          <span className="settings-pad-label">{action}</span>
          <button
            type="button"
            className="settings-remap-btn"
            onClick={() => remapAction(action)}
          >
            {isWaiting ? 'PRESS A BUTTON…' : (GAMEPAD_BUTTON_NAMES[settings.gamepadMap[action]] ?? `Btn ${settings.gamepadMap[action]}`)}
          </button>
        </div>
      );
    }
    // button
    return (
      <div className={'settings-row' + focusedClass} onMouseEnter={() => setFocus(i)}>
        <PixelButton
          onClick={() => {
            if (row.id === 'back') onBack();
            else if (row.id === 'resetSave') { if (!confirm) setConfirm(true); else { setConfirm(false); onResetSave(); } }
            else if (row.id === 'cancelReset') setConfirm(false);
            else if (row.id === 'resetPad') { onChange({ ...settings, gamepadMap: { ...DEFAULT_GAMEPAD_MAP } }); onResetPad(); }
          }}
          focused={focused}
        >
          {row.label}
        </PixelButton>
      </div>
    );
  };

  const adjustForIdx = (i: number, dir: number): void => {
    setFocus(i);
    setTimeout(() => adjust(dir), 0);
  };

  return (
    <div className="menu-screen with-bg">
      <PixelPanel title="Settings" subtitle="Adjust the temple" width={560}>
        <div className="scroll-area">
          {rows.map((row, i) => (
            <Row key={row.id} row={row} i={i} />
          ))}
        </div>
        <div style={{ marginTop: 8, textAlign: 'center', fontSize: 10, letterSpacing: '0.18em', color: 'rgba(231,227,215,0.6)' }}>
          D-PAD / WASD · ← → adjust · A toggle · B back
        </div>
      </PixelPanel>
    </div>
  );
}
