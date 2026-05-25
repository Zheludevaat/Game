// Reusable cutscene player. Drives a list of `Beat`s through a canvas
// backdrop with parallax + a typed text card. Each beat can:
//   - Render a hand-authored procedural backdrop into a canvas
//     (function of time-in-beat).
//   - Show a title / subtitle / body / source citation.
//   - Auto-advance after `holdMs` (or wait forever for player input).
//
// Controls:
//   A / Enter / tap         → next beat (or end the scene)
//   B / Esc / right-click   → previous beat (or skip the scene)
//   Start                   → skip the whole scene
//   D-pad ← / →             → prev / next beat
//
// The reading-pane text fades in over `fadeInMs`, holds, then optionally
// auto-advances to the next beat after `holdMs`. The pip pager at the
// foot reflects beat progress and the controls hint shows current
// keybinds.

import { useEffect, useRef, useState } from 'react';
import { PixelButton } from './PixelButton';
import { useGamepadButtons } from './useGamepadButtons';

export interface BeatRenderArgs {
  ctx: CanvasRenderingContext2D;
  width: number;          // CSS pixels
  height: number;
  /** Seconds since this beat started. */
  beatT: number;
  /** Seconds since the cutscene started. */
  totalT: number;
}

export interface Beat {
  /** Optional small caption above the title (gold, teal-shadowed). */
  subtitle?: string;
  /** Title — gold serif, uppercase letter-spacing. */
  title?: string;
  /** Body — italic Iowan serif, soft white. */
  body: string;
  /** Cited source — small uppercase gold. */
  source?: string;
  /** Optional procedural backdrop renderer. */
  render?: (a: BeatRenderArgs) => void;
  /** Auto-advance this many ms after fadeIn completes. 0/undef = wait. */
  holdMs?: number;
  /** Card fade-in duration (defaults to 600 ms). */
  fadeInMs?: number;
  /** Card horizontal alignment override (defaults to center). */
  align?: 'left' | 'center';
}

export interface CutsceneProps {
  beats: Beat[];
  onDone: () => void;
  /** Shown at the foot when the player has the option to skip. */
  showSkip?: boolean;
  /** Hue tint applied behind the card (matches the cutscene's sphere). */
  accent?: string;
  /** Title shown above the pip pager (e.g. "Pre-menu", "Boss Intro"). */
  chapterLabel?: string;
}

export function Cutscene(p: CutsceneProps): JSX.Element {
  const [idx, setIdx] = useState(0);
  const [beatStart, setBeatStart] = useState(() => performance.now());
  const [shown, setShown] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cutsceneStart = useRef(performance.now());

  const beat = p.beats[idx];
  const fadeInMs = beat?.fadeInMs ?? 600;

  const next = (): void => {
    if (idx < p.beats.length - 1) {
      setIdx(idx + 1);
      setBeatStart(performance.now());
      setShown(false);
    } else {
      p.onDone();
    }
  };
  const prev = (): void => {
    if (idx > 0) {
      setIdx(idx - 1);
      setBeatStart(performance.now());
      setShown(false);
    }
  };
  const skip = (): void => p.onDone();

  // Fade-in trigger after beat changes
  useEffect(() => {
    setShown(false);
    const t = setTimeout(() => setShown(true), 30);
    return () => clearTimeout(t);
  }, [idx]);

  // Auto-advance if requested
  useEffect(() => {
    if (!beat?.holdMs) return;
    const t = setTimeout(() => next(), fadeInMs + beat.holdMs);
    return () => clearTimeout(t);
  }, [idx, beat?.holdMs]);

  // Controller / keyboard
  useGamepadButtons({
    onA: next,
    onB: () => (idx > 0 ? prev() : skip()),
    onStart: skip,
    onRight: next,
    onLeft: prev,
  });

  // Backdrop animation
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    let W = 0, H = 0;
    const resize = (): void => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      c.width = Math.floor(W * dpr); c.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);

    const tick = (): void => {
      // Base sky — dark abyss with a subtle accent radial pulse so each
      // cutscene's sphere accent reads even when no backdrop renders.
      const now = performance.now();
      const totalT = (now - cutsceneStart.current) / 1000;
      const beatT = (now - beatStart) / 1000;
      ctx.fillStyle = '#02010a';
      ctx.fillRect(0, 0, W, H);
      if (p.accent) {
        const g = ctx.createRadialGradient(W / 2, H * 0.55, 30, W / 2, H * 0.55, H);
        g.addColorStop(0, withAlpha(p.accent, 0.18));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      // Drifting motes everywhere — the standard layer-1 starfield.
      const N = 80;
      for (let i = 0; i < N; i++) {
        const x = ((i * 113.7) + totalT * 6) % W;
        const y = ((i * 71.3) + totalT * 4) % H;
        const a = 0.18 + 0.18 * Math.abs(Math.sin(totalT + i));
        ctx.fillStyle = `rgba(244, 210, 122, ${a})`;
        ctx.fillRect(x, y, 1, 1);
      }
      // Beat-specific backdrop
      try {
        beat?.render?.({ ctx, width: W, height: H, beatT, totalT });
      } catch {
        // Don't let a backdrop bug kill the cutscene
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
    };
  }, [beat, beatStart, p.accent]);

  if (!beat) return <></>;

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }} />
      <div className="menu-screen no-bg" style={{ zIndex: 5 }}>
        {p.chapterLabel && (
          <div className="cutscene-chapter">
            {p.chapterLabel}
          </div>
        )}
        <div
          className="prologue-card cutscene-card"
          style={{
            opacity: shown ? 1 : 0,
            textAlign: beat.align ?? 'left',
            borderColor: p.accent ? withAlpha(p.accent, 0.55) : undefined,
          }}
        >
          {beat.subtitle && <div className="pixel-subtitle" style={{ textAlign: 'center' }}>{beat.subtitle}</div>}
          {beat.title && (
            <h2
              className="pixel-title"
              style={{ fontSize: 28, margin: '6px 0 14px', textAlign: 'center', letterSpacing: '0.18em' }}
            >
              {beat.title}
            </h2>
          )}
          <p className="prologue-body" style={{ textAlign: beat.align ?? 'left' }}>{beat.body}</p>
          {beat.source && <div className="prologue-source">— {beat.source}</div>}
        </div>
        <div className="prologue-controls">
          <div className="prologue-pips">
            {p.beats.map((_, i) => (
              <span key={i} className={'prologue-pip' + (i === idx ? ' active' : '')} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {idx > 0 && <PixelButton onClick={prev}>Back</PixelButton>}
            <PixelButton onClick={next}>
              {idx === p.beats.length - 1 ? 'Begin' : 'Continue'}
            </PixelButton>
            {p.showSkip !== false && idx < p.beats.length - 1 && (
              <PixelButton onClick={skip}>Skip</PixelButton>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function withAlpha(hex: string, a: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb(')) return hex;
  // Accept #rgb or #rrggbb
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
