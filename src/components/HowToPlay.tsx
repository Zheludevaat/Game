import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';

export function HowToPlay({ onBack }: { onBack: () => void }): JSX.Element {
  return (
    <div className="menu-screen with-bg">
      <PixelPanel title="How to Play" subtitle="A guide for the Initiate" width={620}>
        <div className="scroll-area help-text">
          <p><span className="glow-text">Controller (recommended)</span>: Left stick or D-pad to move. A — Attack. B — Dash. X — Spell. Y — Interact. Start — Pause. Select — Map. LB/RB — Cycle relic focus.</p>
          <p><span className="glow-text">Keyboard</span>: WASD or arrow keys to move. J — Attack. K — Dash. L — Spell. E — Interact. M — Map. Esc — Pause.</p>
          <p><span className="glow-text">Touch</span>: Virtual joystick on the left, attack/dash/spell/interact on the right. The touch UI auto-hides when a controller or keyboard is in use.</p>
          <div className="pixel-divider" />
          <p><span className="gold-text">Rooms</span> connect through golden doors. Enemy rooms seal until cleared. Stairs lead deeper.</p>
          <p><span className="gold-text">Relics</span> alter your run permanently — they appear on bosses, chests, and rare drops.</p>
          <p><span className="gold-text">Shrines</span> offer a boon and a cost. Choose carefully.</p>
          <p><span className="gold-text">Bosses</span> wait on floors 10, 20, 30… expect radial bursts, summons, and burning sigils.</p>
          <div className="pixel-divider" />
          <p><span className="violet-text">PWA Install (iPad):</span> Open this page in Safari, tap the Share icon, choose <em>Add to Home Screen</em>, then launch from the Home Screen for full-screen play. The app caches itself for offline use after the first load.</p>
          <p style={{ opacity: 0.7 }}>Recommended: landscape orientation, Bluetooth controller paired in iPad Settings.</p>
        </div>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <PixelButton onClick={onBack}>Back</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
