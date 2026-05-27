import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { useGamepadButtons } from './useGamepadButtons';

export function HowToPlay({ onBack }: { onBack: () => void }): JSX.Element {
  useGamepadButtons({ onA: onBack, onB: onBack, onStart: onBack });
  return (
    <div className="menu-screen with-bg">
      <PixelPanel title="How to Play" subtitle="A guide for the Initiate" width={620}>
        <div className="scroll-area help-text">
          <p><span className="glow-text">Controller (recommended)</span>: Left stick or D-pad to move. A — Attack. B — Dash. X — Spell. Y — Interact. Start — Pause. Select — Map. LB/RB — Cycle relic focus.</p>
          <p><span className="glow-text">Keyboard</span>: WASD or arrow keys to move. J — Attack. K — Dash. L — Spell. E — Interact. M — Map. Esc — Pause.</p>
          <p><span className="glow-text">Cycle</span>: Q — switch weapon. R — switch spell. (Touch: tap the small ↻ buttons. Controller: LB/RB.)</p>
          <p><span className="glow-text">Touch (iPhone / iPad)</span>: Virtual joystick on the left, attack / dash / spell / interact on the right. A second row of small round buttons handles cycle weapon / cycle spell / cycle item / use item / ultimate / map. The pause button sits at the top centre. Shrine, shop and puzzle modals show on-screen accept / decline or direction-pad buttons — every keyboard action is reachable by tap. The touch UI auto-hides when a controller or keyboard is in use.</p>
          <div className="pixel-divider" />
          <p><span className="gold-text">Weapons</span>: you begin with the Tarnished Dagger — quick stabs, short reach. Find others in chests or by defeating bosses on odd-numbered floors. Each has its own swing, range and tempo.</p>
          <p><span className="gold-text">Spells</span>: you begin with Spark Bolt. New schools — Frost Lance (spread), Hellfire Orb (explosion), Thunder Sigil (placed trap) — drop from chests and even-numbered floor bosses.</p>
          <p><span className="gold-text">Rooms</span> connect through golden doors. Enemy rooms seal until cleared. Stairs lead deeper.</p>
          <p><span className="gold-text">Relics</span> alter your run permanently — they appear on bosses, chests, and rare drops.</p>
          <p><span className="gold-text">Shrines</span> offer a boon and a cost. Choose carefully.</p>
          <p><span className="gold-text">Bosses</span> wait on floors 10, 20, 30… expect radial bursts, summons, and burning sigils.</p>
          <div className="pixel-divider" />
          <p><span className="violet-text">PWA Install (iPad or iPhone):</span> Open this page in <em>Safari</em>, tap the Share icon, choose <em>Add to Home Screen</em>, then launch from the Home Screen for full-screen play. The app caches itself for offline use after the first load.</p>
          <p style={{ opacity: 0.7 }}>Recommended: landscape orientation, Bluetooth controller paired in iOS Settings.</p>
        </div>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <PixelButton onClick={onBack}>Back</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
