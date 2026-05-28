import { ReactNode } from 'react';

interface Props {
  /** Subtitle line above the title — e.g. "A shrine of calcination". */
  subtitle?: string;
  /** Main heading — e.g. "Calcination · Forge". */
  title: string;
  /** Footer hint row (input affordance like "Esc / B — Decline"). */
  footer?: ReactNode;
  /** Minimum panel width in px. Default 320. Becomes the upper bound
   *  on narrow viewports — see comment in body. */
  minWidth?: number;
  /** Modal body — the unique content per consumer. */
  children: ReactNode;
}

/** Shared chrome for in-game modal overlays — Shrine confirm,
 *  Lampwright shop, Puzzle altar. Centres on the viewport, wraps
 *  the body in the pixel-panel skin, renders subtitle / title /
 *  divider / body / divider / footer in that fixed order. The three
 *  modal components used to copy this 20-line shell each; now they
 *  pass their unique content as children and inherit the rest.
 *
 *  Width policy: the authored `minWidth` (default 320, callers override
 *  up to 360) becomes the UPPER clamp on narrow viewports. iPhone SE
 *  landscape (~667 w minus safe-area + 24 px gutter) was leaving the
 *  hard-coded 360 px Shop / Puzzle modal pressed against both edges —
 *  `min(minWidth, 100vw - safe-area - gutter)` keeps the panel breathing
 *  on phones without crowding desktop / iPad. Body also gets a
 *  max-height + overflowY so tall modals (long shop ware lists) can
 *  scroll on short landscape phones. */
export function ModalPanel({ subtitle, title, footer, minWidth = 320, children }: Props): JSX.Element {
  return (
    <div style={{
      position: 'absolute',
      left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'auto',
      maxWidth: 'calc(100vw - var(--safe-left) - var(--safe-right) - 16px)',
    }}>
      <div
        className="pixel-panel"
        style={{
          minWidth: `min(${minWidth}px, calc(100vw - var(--safe-left) - var(--safe-right) - 24px))`,
          maxWidth: 'calc(100vw - var(--safe-left) - var(--safe-right) - 24px)',
          maxHeight: 'calc(100vh - var(--safe-top) - var(--safe-bottom) - 24px)',
          overflowY: 'auto',
          textAlign: 'center',
        }}
      >
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
