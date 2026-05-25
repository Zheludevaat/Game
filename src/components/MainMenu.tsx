import { useEffect, useRef } from 'react';
import { PixelButton } from './PixelButton';
import { useMenuNav } from './useMenuNav';

interface Props {
  bestFloor: number;
  essence: number;
  resumeAvailable: boolean;
  onNewRun: () => void;
  onContinue: () => void;
  onMeta: () => void;
  onSettings: () => void;
  onController: () => void;
  onHowTo: () => void;
}

export function MainMenu(p: Props): JSX.Element {
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = bgRef.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const stars: { x: number; y: number; z: number; t: number }[] = [];
    const N = 120;
    const init = (): void => {
      stars.length = 0;
      for (let i = 0; i < N; i++) {
        stars.push({
          x: Math.random() * c.width,
          y: Math.random() * c.height,
          z: 0.3 + Math.random() * 1,
          t: Math.random() * Math.PI * 2,
        });
      }
    };
    const resize = (): void => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.floor(window.innerWidth * dpr);
      c.height = Math.floor(window.innerHeight * dpr);
      init();
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = (): void => {
      ctx.fillStyle = 'rgba(2, 1, 10, 0.4)';
      ctx.fillRect(0, 0, c.width, c.height);
      // Parallax abyss glow
      const g = ctx.createRadialGradient(c.width / 2, c.height * 0.65, 40, c.width / 2, c.height * 0.65, c.height);
      g.addColorStop(0, 'rgba(80, 30, 140, 0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      // Stars / dust
      const now = performance.now() / 1000;
      for (const s of stars) {
        s.t += 0.01;
        const a = 0.3 + 0.7 * Math.abs(Math.sin(s.t));
        ctx.fillStyle = `rgba(244, 210, 122, ${a * s.z * 0.5})`;
        ctx.fillRect(s.x, s.y, 1.5 * s.z, 1.5 * s.z);
        s.y -= 0.2 * s.z;
        if (s.y < 0) { s.y = c.height; s.x = Math.random() * c.width; }
      }
      // Seven lamps row
      const cx = c.width / 2;
      const cy = c.height * 0.18;
      for (let i = 0; i < 7; i++) {
        const x = cx + (i - 3) * 60;
        const flick = 0.6 + Math.sin(now * 3 + i) * 0.35;
        ctx.fillStyle = `rgba(244, 210, 122, ${flick * 0.6})`;
        ctx.beginPath();
        ctx.arc(x, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe6a3';
        ctx.beginPath();
        ctx.arc(x, cy, 4, 0, Math.PI * 2);
        ctx.fill();
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
    { onActivate: p.onMeta },
    { onActivate: p.onSettings },
    { onActivate: p.onController },
    { onActivate: p.onHowTo },
  ];
  const focus = useMenuNav(items);

  return (
    <>
      <canvas ref={bgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }} />
      <div className="menu-screen no-bg" style={{ zIndex: 5 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="pixel-subtitle">The Initiate Approaches</div>
          <h1 className="pixel-title" style={{ fontSize: 48, margin: '8px 0 0', letterSpacing: '0.18em' }}>
            Abyss of the<br />Seven Lamps
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PixelButton onClick={p.onNewRun} focused={focus === 0}>New Run</PixelButton>
          <PixelButton onClick={p.onContinue} disabled={!p.resumeAvailable} focused={focus === 1}>
            Continue {p.resumeAvailable ? '' : '(none)'}
          </PixelButton>
          <PixelButton onClick={p.onMeta} focused={focus === 2} badge={`✦ ${p.essence}`}>
            Meta Progression
          </PixelButton>
          <PixelButton onClick={p.onSettings} focused={focus === 3}>Settings</PixelButton>
          <PixelButton onClick={p.onController} focused={focus === 4}>Controller Test</PixelButton>
          <PixelButton onClick={p.onHowTo} focused={focus === 5}>How to Play</PixelButton>
        </div>
        <div style={{ marginTop: 24, fontSize: 11, letterSpacing: '0.3em', color: 'var(--teal)' }}>
          Best Floor: <span className="gold-text">{p.bestFloor}</span> &nbsp;·&nbsp; Essence: <span className="gold-text">{p.essence}</span>
        </div>
        <div style={{ position: 'absolute', bottom: 14, fontSize: 10, letterSpacing: '0.3em', color: 'rgba(231,227,215,0.5)' }}>
          A SOLITARY DESCENT &nbsp;·&nbsp; v0.1
        </div>
      </div>
    </>
  );
}
