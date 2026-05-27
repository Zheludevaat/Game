import { useEffect, useState } from 'react';
import { InputManager } from '../game/input/InputManager';
import {
  DEFAULT_GAMEPAD_MAP, GAMEPAD_BUTTON_NAMES, GamepadMap,
  detectLayoutFromPadId,
} from '../game/input/controlMappings';
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
  vendor?: string;
  product?: string;
  layout: 'xbox' | 'switch';
  axes: number[];
  buttons: { pressed: boolean; value: number }[];
  lastPressedIdx: number | null;
}

/** Same regex as InputManager.extractIds — kept inline here to avoid
 *  exporting an internal helper. */
function extractIds(padId: string): { vendor?: string; product?: string } {
  const m1 = /vendor:?\s*([0-9a-f]{4}).*product:?\s*([0-9a-f]{4})/i.exec(padId);
  if (m1) return { vendor: m1[1].toLowerCase(), product: m1[2].toLowerCase() };
  const m2 = /([0-9a-f]{4})[\s-]([0-9a-f]{4})/i.exec(padId);
  if (m2) return { vendor: m2[1].toLowerCase(), product: m2[2].toLowerCase() };
  return {};
}

/** Each in-game action and the gamepad button index it currently
 *  reads. Used to show "ATTACK = button X" rows so the user can
 *  verify the engine and the physical pad agree. */
const ACTION_LABELS: Array<{ key: keyof GamepadMap; pretty: string }> = [
  { key: 'attack', pretty: 'Attack' },
  { key: 'dash', pretty: 'Dash' },
  { key: 'spell', pretty: 'Spell' },
  { key: 'interact', pretty: 'Interact / Use' },
  { key: 'cycleWeapon', pretty: 'Cycle Weapon' },
  { key: 'cycleSpell', pretty: 'Cycle Spell' },
  { key: 'pause', pretty: 'Pause' },
  { key: 'map', pretty: 'Map' },
];

export function ControllerTest({ input, onBack }: Props): JSX.Element {
  // ControllerTest wants the player to press every button on their
  // controller and see which index lights up — so we don't bind ANY
  // gamepad button to "exit." Start used to do that too but it
  // collided with mapping verification (the player couldn't test
  // their Start binding). Use the on-screen Back button or Escape
  // on a keyboard.
  useGamepadButtons({});
  const [snap, setSnap] = useState<PadSnap>({
    connected: false, id: '', mapping: '', layout: 'xbox',
    axes: [], buttons: [], lastPressedIdx: null,
  });
  useEffect(() => {
    let raf = 0;
    let lastBtn: number | null = null;
    let prev: boolean[] = [];
    const tick = (): void => {
      const pads = navigator.getGamepads?.() ?? [];
      let pad: Gamepad | null = null;
      for (const p of pads) if (p) { pad = p; break; }
      if (!pad) {
        setSnap({ connected: false, id: '', mapping: '', layout: 'xbox', axes: [], buttons: [], lastPressedIdx: null });
        prev = [];
      } else {
        const buttons = pad.buttons.map((b) => ({ pressed: !!b.pressed, value: typeof b === 'number' ? b : b.value }));
        for (let i = 0; i < buttons.length; i++) {
          if (buttons[i].pressed && !prev[i]) { lastBtn = i; break; }
        }
        prev = buttons.map((b) => b.pressed);
        const { vendor, product } = extractIds(pad.id);
        setSnap({
          connected: true,
          id: pad.id,
          mapping: pad.mapping ?? '',
          vendor, product,
          layout: detectLayoutFromPadId(pad.id),
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

  // Pull the live action→button mapping from the InputManager so the
  // user can see "ATTACK = button N" matching what they pressed.
  const activeMap = input?.getActiveMapping() ?? DEFAULT_GAMEPAD_MAP;

  const copyDiag = async (): Promise<void> => {
    const lines = [
      `id: ${snap.id || '(none)'}`,
      `mapping: ${snap.mapping || '(empty)'}`,
      `vendor: ${snap.vendor ?? '(none)'}  product: ${snap.product ?? '(none)'}`,
      `detected layout: ${snap.layout}`,
      `buttons: ${snap.buttons.length}  axes: ${snap.axes.length}`,
      `last pressed: ${snap.lastPressedIdx ?? '(none)'}`,
      '',
      'Active bindings:',
      ...ACTION_LABELS.map((a) => `  ${a.pretty.padEnd(16)} = btn ${activeMap[a.key]}`),
      '',
      'Buttons live:',
      ...snap.buttons.map((b, i) => `  [${i}] ${b.pressed ? '●' : '○'} ${b.value.toFixed(2)}  ${GAMEPAD_BUTTON_NAMES[i] ?? ''}`),
      '',
      'Axes live:',
      ...snap.axes.map((v, i) => `  [${i}] ${v.toFixed(3)}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch { /* clipboard blocked; user can still read the panel */ }
  };

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
            <span style={{ color: 'var(--teal)' }}>Vendor:</span>{' '}
            <span className="gold-text">{snap.vendor ?? '—'}</span>
            {' · '}
            <span style={{ color: 'var(--teal)' }}>Product:</span>{' '}
            <span className="gold-text">{snap.product ?? '—'}</span>
            <br />
            <span style={{ color: 'var(--teal)' }}>Detected layout:</span>{' '}
            <span className="gold-text">{snap.layout.toUpperCase()}</span>
            {' · '}
            <span style={{ color: 'var(--teal)' }}>Buttons:</span>{' '}
            <span className="gold-text">{snap.buttons.length}</span>
            {' · '}
            <span style={{ color: 'var(--teal)' }}>Axes:</span>{' '}
            <span className="gold-text">{snap.axes.length}</span>
            <br />
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
        {snap.connected && (
          <div style={{ marginBottom: 10, padding: '6px 8px', border: '1px solid var(--gold-3)', background: 'rgba(20,10,40,0.4)' }}>
            <div style={{ fontSize: 11, color: 'var(--teal)', marginBottom: 4 }}>
              ACTIVE BINDINGS — which physical button index runs each in-game action
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', fontSize: 11 }}>
              {ACTION_LABELS.map((a) => {
                const idx = activeMap[a.key];
                const live = snap.buttons[idx]?.pressed;
                return (
                  <div key={a.key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: live ? 'var(--teal)' : 'var(--bone)' }}>
                      {live ? '●' : '○'} {a.pretty}
                    </span>
                    <span className="gold-text">btn {idx}</span>
                  </div>
                );
              })}
            </div>
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
        <div style={{ marginTop: 14, textAlign: 'center', display: 'flex', gap: 10, justifyContent: 'center' }}>
          <PixelButton onClick={() => { void copyDiag(); }}>Copy Diagnostics</PixelButton>
          <PixelButton onClick={onBack}>Back</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
