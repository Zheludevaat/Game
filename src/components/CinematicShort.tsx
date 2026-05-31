// A FILM-style cutscene player.
//
// Differs from <Cutscene> in three ways that matter:
//
//   1. No reading-pane card. Each shot's renderer takes the full
//      viewport. Letterbox bars top and bottom signal "watch this".
//   2. Subtitles fade in at the bottom — like a foreign film. The
//      reader is supposed to be watching the screen, not the text.
//   3. Shots auto-advance after their duration. The viewer just
//      watches. A/Enter/tap → skip to next shot. B/Esc → previous
//      shot. Start → end the whole film.

import { useEffect, useRef, useState } from 'react';
import { useGamepadButtons } from './useGamepadButtons';
import { audio, CinematicMood } from '../game/systems/AudioSystem';

export interface ShotArgs {
  ctx: CanvasRenderingContext2D;
  /** Visible (non-letterboxed) frame in CSS pixels. */
  width: number;
  height: number;
  /** Seconds since this shot started. */
  t: number;
  /** This shot's planned duration in seconds. */
  duration: number;
  /** Seconds since the film started. */
  total: number;
  /** 0..1 — Used for the cross-cut fade-out at the end of a shot. */
  outAlpha: number;
}

export interface Shot {
  /** Approximate length in seconds — when this elapses we cut to next. */
  duration: number;
  /** Renders the shot. Origin is the visible frame's top-left. */
  render: (a: ShotArgs) => void;
  /** Optional subtitle text. Fades in over fadeInMs and holds. */
  subtitle?: string;
  /** Subtitle fade-in duration ms. Defaults 600. */
  fadeInMs?: number;
  /** Hold subtitle visible until cut. If false, fades out 600 ms before cut. */
  holdSubtitle?: boolean;
  /** Small attribution under the subtitle, optional. */
  source?: string;
}

export interface CinematicShortProps {
  shots: Shot[];
  onDone: () => void;
  /** Chapter label shown briefly at top of first shot. */
  title?: string;
  /** Cinematic mood for the underlying pad. Defaults to 'cosmos'. */
  mood?: CinematicMood;
}

export function CinematicShort(p: CinematicShortProps): JSX.Element {
  const [idx, setIdx] = useState(0);
  const [shotStart, setShotStart] = useState(() => performance.now());
  const filmStart = useRef(performance.now());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Audio: a sustained pad runs underneath every cinematic, with a
  // chime cued on each beat advance. Stop fn captured here so unmount
  // (or skip) cleanly fades the pad out.
  const padStop = useRef<(() => void) | null>(null);

  const shot = p.shots[idx];

  // Start pad on mount, stop on unmount.
  useEffect(() => {
    padStop.current = audio.playCinematicPad(p.mood ?? 'cosmos');
    return () => {
      padStop.current?.();
      padStop.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = (): void => {
    if (idx < p.shots.length - 1) {
      audio.playCinematicChime();
      setIdx(idx + 1);
      setShotStart(performance.now());
    } else {
      p.onDone();
    }
  };
  const prev = (): void => {
    if (idx > 0) {
      setIdx(idx - 1);
      setShotStart(performance.now());
    }
  };
  const skip = (): void => p.onDone();

  // Auto-advance through shots
  useEffect(() => {
    if (!shot) return;
    const t = setTimeout(() => next(), shot.duration * 1000);
    return () => clearTimeout(t);
  }, [idx]);

  // Controls
  useGamepadButtons({
    onA: next,
    onB: () => (idx > 0 ? prev() : skip()),
    onStart: skip,
    onRight: next,
    onLeft: prev,
  });

  // Render loop
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
      const now = performance.now();
      const total = (now - filmStart.current) / 1000;
      const tShot = (now - shotStart) / 1000;
      const dur = shot?.duration ?? 1;

      // The cross-cut: fade in over 0.35s at start of shot, fade out
      // over 0.4s at end.
      const fadeIn = Math.min(1, tShot / 0.35);
      const fadeOut = Math.min(1, Math.max(0, (dur - tShot) / 0.4));
      const overlay = 1 - Math.min(fadeIn, fadeOut);
      const outAlpha = Math.max(0, Math.min(1, (dur - tShot) / 0.4));

      // Clear full canvas (letterbox area always black)
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      const letterbox = Math.min(56, Math.max(24, H * 0.075));

      // Clip the visible frame (between the letterbox bars) and render.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, letterbox, W, H - letterbox * 2);
      ctx.clip();
      ctx.translate(0, letterbox);
      try {
        shot?.render({
          ctx, width: W, height: H - letterbox * 2,
          t: tShot, duration: dur, total, outAlpha,
        });
      } catch { /* don't crash the film */ }
      ctx.restore();

      // Black overlay for cross-cuts
      if (overlay > 0) {
        ctx.fillStyle = `rgba(0,0,0,${overlay})`;
        ctx.fillRect(0, 0, W, H);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
    };
  }, [shot, shotStart]);

  // Subtitle fade alpha
  const [subAlpha, setSubAlpha] = useState(0);
  useEffect(() => {
    if (!shot?.subtitle) { setSubAlpha(0); return; }
    setSubAlpha(0);
    const fadeIn = shot.fadeInMs ?? 600;
    const startedAt = performance.now();
    const dur = shot.duration * 1000;
    let raf = 0;
    const tick = (): void => {
      const t = performance.now() - startedAt;
      let a = Math.min(1, t / fadeIn);
      if (!shot.holdSubtitle) {
        const fadeOutStart = dur - 600;
        if (t > fadeOutStart) a *= Math.max(0, (dur - t) / 600);
      }
      setSubAlpha(a);
      if (t < dur) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idx, shot?.subtitle]);

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }} />

      {p.title && idx === 0 && (
        <div className="cinematic-chapter" style={{ opacity: 1 - Math.min(1, (performance.now() - filmStart.current) / 2400) }}>
          {p.title}
        </div>
      )}

      {shot?.subtitle && (
        <div className="cinematic-subtitle-band" style={{ opacity: subAlpha }}>
          <div className="cinematic-subtitle">{shot.subtitle}</div>
          {shot.source && <div className="cinematic-source">— {shot.source}</div>}
        </div>
      )}

      <div className="cinematic-controls-hint">
        <span>{idx + 1} / {p.shots.length}</span>
        <span className="cinematic-controls-copy"> &middot; Tap next &middot; Start end</span>
      </div>

      {/* Invisible tap target so phone users can tap anywhere to advance */}
      <div
        className="cinematic-tap-target"
        onPointerDown={(e) => { e.preventDefault(); next(); }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </>
  );
}
