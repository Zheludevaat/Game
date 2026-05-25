import { useEffect, useRef, useState } from 'react';
import { PixelButton } from './PixelButton';
import { useGamepadButtons } from './useGamepadButtons';

interface Props {
  onContinue: () => void;
  /** How many times the player has reached the Ogdoad (1, 2, 3…) */
  ogdoadCount: number;
}

interface Page {
  subtitle?: string;
  title?: string;
  body: string;
  source?: string;
}

const BASE_PAGES: Page[] = [
  {
    subtitle: 'Made bare of all the workings of the cosmic frame…',
    title: 'Thou comest to the Eighth Nature',
    body:
      'Then, with thine own proper power, thou comest to the Eighth Nature, and hymnest with the Powers that are there to the Father.',
    source: 'Corpus Hermeticum I.26',
  },
  {
    title: 'The Hymn of the Reborn',
    body:
      'Holy is God, the Father of all things. Holy is God, whose will is accomplished by his own powers. Holy is God, who would be known and is known by his own. Holy art Thou, who by Thy Word hast formed all that is. Holy art Thou, of whom all Nature is the image.',
    source: 'Corpus Hermeticum XIII.18',
  },
  {
    title: 'The Flight of the Alone',
    body:
      'This is the life of the gods and of the godlike and blessed among men: liberation from the alien that besets us here, a life taking no pleasure in the things of earth — the passing of solitary to solitary, the flight of the Alone to the Alone.',
    source: 'Plotinus, Enneads VI.9.11',
  },
];

const RETURN_PAGE: Page = {
  subtitle: 'The Initiate descends once more.',
  title: 'And the cycle turns',
  body:
    'No vision is held once and kept. The work returns upon itself a hundredfold, each pass purer than the last. So with the soul: not by one cleansing but by the long return of the Work is the white tincture brought forth.',
  source: 'Pseudo-Llull, Testamentum',
};

export function Epilogue({ onContinue, ogdoadCount }: Props): JSX.Element {
  const pages = ogdoadCount > 1 ? [...BASE_PAGES, RETURN_PAGE] : BASE_PAGES;
  const [page, setPage] = useState(0);
  const next = (): void => {
    if (page < pages.length - 1) setPage(page + 1);
    else onContinue();
  };
  const prev = (): void => { if (page > 0) setPage(page - 1); };
  useGamepadButtons({
    onA: next,
    onB: prev,
    onStart: onContinue,
    onRight: next,
    onLeft: prev,
  });

  // Brighter, warmer backdrop than the prologue — the player has arrived.
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
    const tick = (): void => {
      ctx.fillStyle = 'rgba(2, 1, 10, 0.35)';
      ctx.fillRect(0, 0, W, H);
      const now = performance.now() / 1000;
      // Sunrise gradient from below
      const g = ctx.createRadialGradient(W / 2, H * 1.05, 40, W / 2, H * 1.05, H * 1.4);
      g.addColorStop(0, 'rgba(255, 230, 163, 0.35)');
      g.addColorStop(0.5, 'rgba(155, 108, 255, 0.18)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // Eighth Star
      const cx = W / 2, cy = H * 0.18;
      const pulse = 0.85 + Math.sin(now * 1.4) * 0.12;
      const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, 110);
      halo.addColorStop(0, `rgba(255, 247, 214, ${0.85 * pulse})`);
      halo.addColorStop(0.5, `rgba(244, 210, 122, ${0.45 * pulse})`);
      halo.addColorStop(1, 'rgba(244, 210, 122, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, 120, 0, Math.PI * 2); ctx.fill();
      // Eight-pointed glyph
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(now * 0.04);
      ctx.fillStyle = `rgba(255, 247, 214, ${pulse})`;
      ctx.fillRect(-1, -16, 2, 32);
      ctx.fillRect(-16, -1, 32, 2);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-1, -12, 2, 24);
      ctx.fillRect(-12, -1, 24, 2);
      ctx.restore();
      // Scatter of distant stars
      for (let i = 0; i < 100; i++) {
        const x = (i * 113 + now * 2) % W;
        const y = ((i * 71) + now * 3) % H;
        ctx.fillStyle = `rgba(255, 247, 214, ${0.18 + 0.18 * Math.abs(Math.sin(now + i))})`;
        ctx.fillRect(x, y, 1, 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  const p = pages[page];
  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }} />
      <div className="menu-screen no-bg" style={{ zIndex: 5 }}>
        <div className="epilogue-banner">
          <div className="pixel-subtitle" style={{ letterSpacing: '0.4em' }}>VIII — THE EIGHTH SPHERE</div>
          {ogdoadCount > 1 && (
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2, letterSpacing: '0.3em' }}>
              REACHED {ogdoadCount} TIMES
            </div>
          )}
        </div>
        <div className="prologue-card" style={{ borderColor: 'rgba(255, 230, 163, 0.6)' }}>
          {p.subtitle && <div className="pixel-subtitle" style={{ textAlign: 'center' }}>{p.subtitle}</div>}
          {p.title && (
            <h2 className="pixel-title" style={{ fontSize: 26, margin: '6px 0 14px', textAlign: 'center', letterSpacing: '0.18em' }}>
              {p.title}
            </h2>
          )}
          <p className="prologue-body">{p.body}</p>
          {p.source && <div className="prologue-source">— {p.source}</div>}
        </div>
        <div className="prologue-controls">
          <div className="prologue-pips">
            {pages.map((_, i) => (
              <span key={i} className={'prologue-pip' + (i === page ? ' active' : '')} />
            ))}
          </div>
          <PixelButton onClick={next}>
            {page === pages.length - 1 ? 'Descend Again' : 'Continue'}
          </PixelButton>
        </div>
      </div>
    </>
  );
}
