import { useEffect, useRef } from 'react';
import { PixelButton } from './PixelButton';
import { useMenuNav } from './useMenuNav';

interface Props {
  bestFloor: number;
  essence: number;
  resumeAvailable: boolean;
  codexUnlocked: number;
  codexTotal: number;
  onNewRun: () => void;
  onContinue: () => void;
  onMeta: () => void;
  onSettings: () => void;
  onController: () => void;
  onHowTo: () => void;
  onCodex: () => void;
  onCinematics: () => void;
}

export function MainMenu(p: Props): JSX.Element {
  const bgRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = bgRef.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    let W = 0, H = 0;
    const stars: { x: number; y: number; z: number; t: number }[] = [];
    const N = 140;

    const init = (): void => {
      stars.length = 0;
      for (let i = 0; i < N; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          z: 0.3 + Math.random() * 1,
          t: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = (): void => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      c.width = Math.floor(W * dpr);
      c.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init();
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = (): void => {
      ctx.fillStyle = 'rgba(2, 1, 10, 0.42)';
      ctx.fillRect(0, 0, W, H);

      const g = ctx.createRadialGradient(W / 2, H * 0.7, 40, W / 2, H * 0.7, H);
      g.addColorStop(0, 'rgba(80, 30, 140, 0.22)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      const now = performance.now() / 1000;
      for (const s of stars) {
        s.t += 0.01;
        const a = 0.3 + 0.7 * Math.abs(Math.sin(s.t));
        ctx.fillStyle = `rgba(244, 210, 122, ${a * s.z * 0.5})`;
        ctx.fillRect(s.x, s.y, 1.5 * s.z, 1.5 * s.z);
        s.y -= 0.2 * s.z;
        if (s.y < 0) { s.y = H; s.x = Math.random() * W; }
      }

      const cx = W / 2;
      const cy = Math.max(48, H * 0.08);
      const spacing = Math.min(72, Math.max(40, W / 12));
      for (let i = 0; i < 7; i++) {
        const x = cx + (i - 3) * spacing;
        const flick = 0.7 + Math.sin(now * 3 + i * 0.9) * 0.3;
        const halo = ctx.createRadialGradient(x, cy, 1, x, cy, 22);
        halo.addColorStop(0, `rgba(255, 230, 163, ${0.55 * flick})`);
        halo.addColorStop(1, 'rgba(244, 210, 122, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, cy, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3b265c';
        ctx.fillRect(x - 1, cy + 4, 2, 8);
        ctx.fillRect(x - 4, cy + 11, 8, 2);
        const fh = 7 + Math.sin(now * 5 + i) * 1.2;
        ctx.fillStyle = `rgba(244, 210, 122, ${0.85 * flick})`;
        ctx.beginPath();
        ctx.ellipse(x, cy, 3.5, fh, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe6a3';
        ctx.beginPath();
        ctx.ellipse(x, cy + 1, 1.5, fh * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff7d6';
        ctx.fillRect(x - 0.5, cy - 1, 1, 2);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const items = [
    { onActivate: p.onNewRun },
    { onActivate: p.resumeAvailable ? p.onContinue : () => undefined, disabled: !p.resumeAvailable },
    { onActivate: p.onCodex },
    { onActivate: p.onCinematics },
    { onActivate: p.onMeta },
    { onActivate: p.onSettings },
    { onActivate: p.onController },
    { onActivate: p.onHowTo },
  ];
  const focus = useMenuNav(items);
  const codexLabel = `${p.codexUnlocked}/${p.codexTotal}`;

  return (
    <>
      <canvas ref={bgRef} className="main-menu-canvas" />
      <div className="menu-screen main-menu-screen no-bg">
        <div className="main-menu-shell">
          <div className="main-menu-crest" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="main-menu-title">
            <div className="pixel-subtitle">The Initiate Approaches</div>
            <h1 className="pixel-title main-menu-heading">
              Abyss of the<br />Seven Lamps
            </h1>
          </div>

          <div className="main-menu-status" aria-label="Run status">
            <div><span>Best</span><strong>{p.bestFloor}</strong></div>
            <div><span>Essence</span><strong>{p.essence}</strong></div>
            <div><span>Codex</span><strong>{codexLabel}</strong></div>
          </div>

          <div className="main-menu-actions">
            <div className="main-menu-primary">
              <PixelButton onClick={p.onNewRun} focused={focus === 0} className="pixel-btn-primary">New Run</PixelButton>
              <PixelButton onClick={p.onContinue} disabled={!p.resumeAvailable} focused={focus === 1} className="pixel-btn-quiet">
                Continue {p.resumeAvailable ? '' : '(none)'}
              </PixelButton>
            </div>

            <div className="main-menu-secondary">
              <PixelButton onClick={p.onCodex} focused={focus === 2} badge={codexLabel}>Codex</PixelButton>
              <PixelButton onClick={p.onCinematics} focused={focus === 3} badge="Play">Films</PixelButton>
              <PixelButton onClick={p.onMeta} focused={focus === 4} badge={`${p.essence}`}>Boons</PixelButton>
              <PixelButton onClick={p.onSettings} focused={focus === 5}>Settings</PixelButton>
              <PixelButton onClick={p.onController} focused={focus === 6}>Pad Test</PixelButton>
              <PixelButton onClick={p.onHowTo} focused={focus === 7}>Guide</PixelButton>
            </div>
          </div>

          <div className="main-menu-version">
            A Solitary Descent / v0.1
          </div>
        </div>
      </div>
    </>
  );
}
