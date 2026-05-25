import { useEffect, useState } from 'react';
import { InputManager } from '../game/input/InputManager';
import { GAMEPAD_BUTTON_NAMES } from '../game/input/controlMappings';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';

interface Props {
  input: InputManager | null;
  onBack: () => void;
}

interface PadSnap {
  connected: boolean;
  id: string;
  axes: number[];
  buttons: { pressed: boolean; value: number }[];
}

export function ControllerTest({ onBack }: Props): JSX.Element {
  const [snap, setSnap] = useState<PadSnap>({ connected: false, id: '', axes: [], buttons: [] });
  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      const pads = navigator.getGamepads?.() ?? [];
      let pad: Gamepad | null = null;
      for (const p of pads) if (p) { pad = p; break; }
      if (!pad) {
        setSnap({ connected: false, id: '', axes: [], buttons: [] });
      } else {
        setSnap({
          connected: true,
          id: pad.id,
          axes: Array.from(pad.axes),
          buttons: pad.buttons.map((b) => ({ pressed: !!b.pressed, value: typeof b === 'number' ? b : b.value })),
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
        <div style={{ fontSize: 11, marginBottom: 8, color: 'var(--gold-1)', wordBreak: 'break-all' }}>
          {snap.connected ? snap.id : '—'}
        </div>
        <div className="help-text" style={{ marginBottom: 12 }}>
          Pair your controller in iPad Bluetooth settings, open the app, then press a controller button.
          Most controllers (Xbox, PS4, PS5, MFi) are auto-detected via the browser Gamepad API.
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
