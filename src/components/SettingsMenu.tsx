import { useState } from 'react';
import { SettingsState } from '../game/GameTypes';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { DEFAULT_GAMEPAD_MAP, GAMEPAD_BUTTON_NAMES } from '../game/input/controlMappings';

interface Props {
  settings: SettingsState;
  onChange: (s: SettingsState) => void;
  onResetSave: () => void;
  onBack: () => void;
}

export function SettingsMenu({ settings, onChange, onResetSave, onBack }: Props): JSX.Element {
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof SettingsState>(key: K, val: SettingsState[K]): void => {
    onChange({ ...settings, [key]: val });
  };

  const remapAction = async (action: keyof typeof DEFAULT_GAMEPAD_MAP): Promise<void> => {
    // Wait for next button press on the gamepad
    const start = performance.now();
    return new Promise((resolve) => {
      const tick = (): void => {
        if (performance.now() - start > 6000) { resolve(); return; }
        const pads = navigator.getGamepads?.() ?? [];
        for (const pad of pads) {
          if (!pad) continue;
          for (let i = 0; i < pad.buttons.length; i++) {
            if (pad.buttons[i]?.pressed) {
              const m = { ...settings.gamepadMap, [action]: i };
              onChange({ ...settings, gamepadMap: m });
              resolve();
              return;
            }
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };

  return (
    <div className="menu-screen with-bg">
      <PixelPanel title="Settings" subtitle="Adjust the temple" width={520}>
        <div className="scroll-area">
          <div className="settings-row">
            <span>Music Volume</span>
            <input type="range" min={0} max={1} step={0.05}
              value={settings.musicVolume}
              onChange={(e) => set('musicVolume', Number(e.target.value))} />
          </div>
          <div className="settings-row">
            <span>SFX Volume</span>
            <input type="range" min={0} max={1} step={0.05}
              value={settings.sfxVolume}
              onChange={(e) => set('sfxVolume', Number(e.target.value))} />
          </div>
          <div className="settings-row">
            <span>Touch Controls</span>
            <div className={`toggle ${settings.touchControls ? 'on' : ''}`}
              onClick={() => set('touchControls', !settings.touchControls)}>
              <div className="knob" />
            </div>
          </div>
          <div className="settings-row">
            <span>Reduce Particles</span>
            <div className={`toggle ${settings.reducedParticles ? 'on' : ''}`}
              onClick={() => set('reducedParticles', !settings.reducedParticles)}>
              <div className="knob" />
            </div>
          </div>
          <div className="settings-row">
            <span>Pixel Scale</span>
            <select value={settings.pixelScale}
              onChange={(e) => set('pixelScale', e.target.value as SettingsState['pixelScale'])}
              style={{ background: '#0a0420', color: 'var(--bone)', border: '1px solid var(--gold-2)', padding: '4px 8px' }}>
              <option value="auto">Auto</option>
              <option value="1">1×</option>
              <option value="2">2×</option>
              <option value="3">3×</option>
              <option value="4">4×</option>
            </select>
          </div>
          <div className="pixel-divider" />
          <div style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--gold-1)' }}>CONTROLLER MAPPING</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginTop: 8 }}>
            {(Object.keys(DEFAULT_GAMEPAD_MAP) as (keyof typeof DEFAULT_GAMEPAD_MAP)[]).map((action) => (
              <button key={action}
                onClick={() => remapAction(action)}
                className="pixel-btn"
                style={{ minWidth: 0, padding: '8px 12px', fontSize: 11 }}>
                <span style={{ color: 'var(--teal)' }}>{action}</span>
                <span className="badge">{GAMEPAD_BUTTON_NAMES[settings.gamepadMap[action]] ?? `Btn ${settings.gamepadMap[action]}`}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 6 }}>
            Tap an action then press the controller button to assign it. 6-second timeout.
          </div>
          <div className="pixel-divider" />
          {!confirm ? (
            <PixelButton onClick={() => setConfirm(true)}>Reset Save Data…</PixelButton>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <PixelButton onClick={() => { setConfirm(false); onResetSave(); }}>Confirm Reset</PixelButton>
              <PixelButton onClick={() => setConfirm(false)}>Cancel</PixelButton>
            </div>
          )}
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
          <PixelButton onClick={onBack}>Back</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
