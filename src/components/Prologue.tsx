import { useEffect, useRef, useState } from 'react';
import { PixelButton } from './PixelButton';

interface Props {
  onContinue: () => void;
  onSkip: () => void;
}

interface Page {
  title?: string;
  subtitle?: string;
  body: string;
  source?: string;
}

const PAGES: Page[] = [
  {
    subtitle: 'On a certain day, when thought soared high…',
    title: 'A voice in the silence',
    body:
      '"What dost thou wish to hear and see, and learn and come to know?" said the voice. "Who art thou?" I said. "I am Poimandres," said he, "the Mind of the Sovereignty. I know what thou wishest, and I am with thee everywhere."',
    source: 'Corpus Hermeticum I.1–2',
  },
  {
    subtitle: 'And before me, a vision without bound…',
    title: 'The Anthropos falls',
    body:
      'And the Father of all things — Mind, being Light and Life — brought forth Man of his own essence: the Anthropos, who bore the image of his Father. Yet, beholding his beautiful form upon the waters of Nature, he loved that reflection, willed to dwell with it — and so, in willing, he descended.',
    source: 'Corpus Hermeticum I.12–14',
  },
  {
    subtitle: 'Seven rings the soul must cross to remember…',
    title: 'The Seven Governors',
    body:
      'Seven Governors fashioned the rings of the cosmos: Moon, Mercury, Venus, the Sun, Mars, Jupiter, Saturn. To pass downward through them is to forget; to pass upward is to surrender. The soul must give up to each ring the energy that ring bestowed.',
    source: 'Corpus Hermeticum I.9 & I.25',
  },
  {
    subtitle: 'The Seven Lamps have gone out.',
    title: 'Thou art the Initiate',
    body:
      'The Abyss is not below thee; the Abyss is thy forgetting. Take up thy lamp, surrender each veil to its Warden, and remember. To ascend, thou must first descend.',
    source: 'Title of the Work',
  },
];

export function Prologue({ onContinue, onSkip }: Props): JSX.Element {
  const [page, setPage] = useState(0);
  const [shown, setShown] = useState(false);
  useEffect(() => { setShown(false); const id = setTimeout(() => setShown(true), 60); return () => clearTimeout(id); }, [page]);

  const next = (): void => {
    if (page < PAGES.length - 1) setPage(page + 1);
    else onContinue();
  };
  const prev = (): void => { if (page > 0) setPage(page - 1); };

  // Canvas backdrop — drifting lamps
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = canvasRef.current!; if (!c) return;
    const ctx = c.getContext('2d')!;
    let raf = 0; let W = 0, H = 0;
    const resize = (): void => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      c.width = Math.floor(W * dpr); c.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const motes = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      z: 0.3 + Math.random() * 1.1,
      t: Math.random() * Math.PI * 2,
    }));

    const tick = (): void => {
      ctx.fillStyle = 'rgba(2, 1, 10, 0.5)';
      ctx.fillRect(0, 0, W, H);
      const now = performance.now() / 1000;
      const halo = ctx.createRadialGradient(W / 2, H * 0.55, 60, W / 2, H * 0.55, H);
      halo.addColorStop(0, 'rgba(80, 30, 140, 0.22)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
      for (const m of motes) {
        m.t += 0.01;
        const a = 0.4 + 0.5 * Math.abs(Math.sin(m.t));
        ctx.fillStyle = `rgba(244, 210, 122, ${a * m.z * 0.5})`;
        ctx.fillRect(m.x, m.y, 1.5 * m.z, 1.5 * m.z);
        m.y -= 0.18 * m.z;
        if (m.y < 0) { m.y = H; m.x = Math.random() * W; }
      }
      // Seven lamps at top
      const cx = W / 2, cy = Math.max(48, H * 0.10);
      const spacing = Math.min(70, Math.max(40, W / 13));
      for (let i = 0; i < 7; i++) {
        const x = cx + (i - 3) * spacing;
        const flick = 0.7 + Math.sin(now * 2.4 + i * 0.9) * 0.3;
        const h = ctx.createRadialGradient(x, cy, 1, x, cy, 22);
        h.addColorStop(0, `rgba(255, 230, 163, ${0.5 * flick})`);
        h.addColorStop(1, 'rgba(244, 210, 122, 0)');
        ctx.fillStyle = h;
        ctx.beginPath(); ctx.arc(x, cy, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3b265c';
        ctx.fillRect(x - 1, cy + 4, 2, 8);
        ctx.fillRect(x - 4, cy + 11, 8, 2);
        const fh = 6 + Math.sin(now * 5 + i) * 1.2;
        ctx.fillStyle = `rgba(244, 210, 122, ${0.85 * flick})`;
        ctx.beginPath(); ctx.ellipse(x, cy, 3.3, fh, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe6a3';
        ctx.beginPath(); ctx.ellipse(x, cy + 1, 1.4, fh * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  const p = PAGES[page];
  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }} />
      <div className="menu-screen no-bg" style={{ zIndex: 5 }}>
        <div className="prologue-card" style={{ opacity: shown ? 1 : 0 }}>
          {p.subtitle && <div className="pixel-subtitle" style={{ textAlign: 'center' }}>{p.subtitle}</div>}
          {p.title && (
            <h2 className="pixel-title" style={{ fontSize: 28, margin: '6px 0 14px', textAlign: 'center', letterSpacing: '0.18em' }}>
              {p.title}
            </h2>
          )}
          <p className="prologue-body">{p.body}</p>
          {p.source && (
            <div className="prologue-source">— {p.source}</div>
          )}
        </div>
        <div className="prologue-controls">
          <div className="prologue-pips">
            {PAGES.map((_, i) => (
              <span key={i} className={'prologue-pip' + (i === page ? ' active' : '')} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {page > 0 && <PixelButton onClick={prev}>Back</PixelButton>}
            <PixelButton onClick={next}>
              {page === PAGES.length - 1 ? 'Take Up The Lamp' : 'Continue'}
            </PixelButton>
            {page < PAGES.length - 1 && <PixelButton onClick={onSkip}>Skip</PixelButton>}
          </div>
        </div>
      </div>
    </>
  );
}
