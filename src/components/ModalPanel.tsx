import { ReactNode } from 'react';

interface Props {
  /** Subtitle line above the title — e.g. "A shrine of calcination". */
  subtitle?: string;
  /** Main heading — e.g. "Calcination · Forge". */
  title: string;
  /** Footer hint row (input affordance like "Esc / B — Decline"). */
  footer?: ReactNode;
  /** Minimum panel width in px. Default 320. */
  minWidth?: number;
  /** Modal body — the unique content per consumer. */
  children: ReactNode;
}

/** Shared chrome for in-game modal overlays — Shrine confirm,
 *  Lampwright shop, Puzzle altar. Centres on the viewport, wraps
 *  the body in the pixel-panel skin, renders subtitle / title /
 *  divider / body / divider / footer in that fixed order. The three
 *  modal components used to copy this 20-line shell each; now they
 *  pass their unique content as children and inherit the rest. */
export function ModalPanel({ subtitle, title, footer, minWidth = 320, children }: Props): JSX.Element {
  return (
    <div style={{
      position: 'absolute',
      left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'auto',
    }}>
      <div className="pixel-panel" style={{ minWidth, textAlign: 'center' }}>
        {subtitle && <div className="pixel-subtitle">{subtitle}</div>}
        <div className="pixel-title" style={{ fontSize: 22, margin: '4px 0' }}>{title}</div>
        <div className="pixel-divider" />
        {children}
        {footer && (
          <>
            <div className="pixel-divider" />
            <div style={{ fontSize: 11, color: 'var(--bone)' }}>{footer}</div>
          </>
        )}
      </div>
    </div>
  );
}
