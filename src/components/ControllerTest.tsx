import { useEffect, useState } from 'react';
import { InputManager } from '../game/input/InputManager';
import { GAMEPAD_BUTTON_NAMES } from '../game/input/controlMappings';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { useGamepadButtons } from './useGamepadButtons';

interface Props {
  input: InputManager | null;
  onBack: () => void;
}

interface PadSnap {
  connected: boolean;
  id: string;
  mapping: string;          // "standard" or "" (non-standard)
  axes: number[];
  buttons: { pressed: boolean; value: number }[];
  lastPressedIdx: number | null;
}

export function ControllerTest({ onBack }: Props): JSX.Element {
  // ControllerTest WANTS the user to press every button — so don't bind A.
  // B (cancel) + Start exit the screen.
  useGamepadButtons({ onB: onBack, onStart: onBack });
  const [snap, setSnap] = useState<PadSnap>({ connected: false, id: '', mapping: '', axes: [], buttons: [], lastPressedIdx: null });
  useEffect(() => {
    let raf = 0;
    let lastBtn: number | null = null;
    let prev: boolean[] = [];
    const tick = (): void => {
      const pads = navigator.getGamepads?.() ?? [];
      let pad: Gamepad | null = null;
      for (const p of pads) if (p) { pad = p; break; }
      if (!pad) {
        setSnap({ connected: false, id: '', mapping: '', axes: [], buttons: [], lastPressedIdx: null });
        prev = [];
      } else {
        // Track the most recently pressed button (rising edge) so the user
        // can identify which physical button is on which index.
        const buttons = pad.buttons.map((b) => ({ pressed: !!b.pressed, value: typeof b === 'number' ? b : b.value }));
        for (let i = 0; i < buttons.length; i++) {
          if (buttons[i].pressed && !prev[i]) { lastBtn = i; break; }
        }
        prev = buttons.map((b) => b.pressed);
        setSnap({
          connected: true,
          id: pad.id,
          mapping: pad.mapping ?? '',
          axes: Array.from(pad.axes),
          buttons,
          lastPressedIdx: lastBtn,
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="menu-screen with-bg" style={{ overflow: 'auto' }}>
      <PixelPanel title="Controller Test" subtitle="A communion of hands" width={620}>
        <div style={{ marginBottom: 8 }}>
          Status: {snap.connected ? <span className="glow-text">CONNECTED</span> : <span className="crimson-text">NOT DETECTED</span>}
        </div>
        <div style={{ fontSize: 11, marginBottom: 4, color: 'var(--gold-1)', wordBreak: 'break-all' }}>
          {snap.connected ? snap.id : '—'}
        </div>
        {snap.connected && (
          <div style={{ fontSize: 11, marginBottom: 8 }}>
            <span style={{ color: 'var(--teal)' }}>Mapping:</span>{' '}
            <span style={{ color: snap.mapping === 'standard' ? 'var(--teal)' : 'var(--crimson)' }}>
              {snap.mapping === 'standard' ? 'STANDARD' : 'NON-STANDARD'}
            </span>
            {' · '}
            <span style={{ color: 'var(--teal)' }}>Buttons:</span>{' '}
            <span className="gold-text">{snap.buttons.length}</span>
            {' · '}
            <span style={{ color: 'var(--teal)' }}>Last pressed:</span>{' '}
            <span className="gold-text">
              {snap.lastPressedIdx == null
                ? '—'
                : `index ${snap.lastPressedIdx} (${GAMEPAD_BUTTON_NAMES[snap.lastPressedIdx] ?? `Btn ${snap.lastPressedIdx}`})`}
            </span>
          </div>
        )}
        {snap.connected && snap.mapping !== 'standard' && (
          <div className="crimson-text" style={{ fontSize: 11, marginBottom: 8, padding: '6px 8px', border: '1px solid var(--crimson)', background: 'rgba(60,10,18,0.4)' }}>
            ⚠ This controller reports as <strong>non-standard</strong>. The default Xbox-style action
            assignments may not match your buttons. Press each face button below to see its index, then
            go to <span className="gold-text">Settings</span> and remap any action whose default doesn't fire.
          </div>
        )}
        <div className="help-text" style={{ marginBottom: 12 }}>
          Pair your controller in iPad/iPhone Bluetooth settings, open the app, then press a controller
          button to test. Most modern controllers (Xbox, PS4, PS5, Switch Pro, MFi) are auto-detected.
          Generic third-party pads may need manual remapping in Settings → Pad bindings.
        </div>
        <div className="controller-test">
          {Array.from({ length: 17 }).map((_, i) => (
            <div key={i} className="row">
              <span className="label">{GAMEPAD_BUTTON_NAMES[i] ?? `Btn ${i}`}</span>
              <span className="value" style={{ color: snap.buttons[i]?.pressed ? '#6cf6e5' : 'var(--gold-3)' }}>
                {snap.buttons[i]?.pressed ? '●' : '○'} {(snap.buttons[i]?.value ?? 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="pixel-divider" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          {snap.axes.map((v, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--teal)' }}>Axis {i}</span>
              <span className="gold-text">{v.toFixed(3)}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <PixelButton onClick={onBack}>Back</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
