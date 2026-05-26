import { useEffect, useRef } from 'react';
import { ARCHETYPES } from '../game/data/archetypes';
import { ArchetypeId } from '../game/GameTypes';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { RELICS } from '../game/data/relics';
import { useMenuNav } from './useMenuNav';

interface Props {
  lastArchetype: ArchetypeId | null;
  onSelect: (id: ArchetypeId) => void;
  onBack: () => void;
}

export function ArchetypeSelect({ onSelect, onBack, lastArchetype }: Props): JSX.Element {
  const items = ARCHETYPES.map((a) => ({ onActivate: () => onSelect(a.id) }));
  const focus = useMenuNav(items, { onCancel: onBack, horizontal: true });

  // Set initial focus to last archetype
  const setRef = useRef(false);
  useEffect(() => {
    if (setRef.current) return;
    setRef.current = true;
  }, [lastArchetype]);

  return (
    <div className="menu-screen with-bg">
      <div className="archetype-header" style={{ textAlign: 'center', marginBottom: 16 }}>
        <div className="pixel-subtitle">Choose Your Vessel</div>
        <h2 className="pixel-title" style={{ fontSize: 'clamp(18px, 5vh, 28px)', margin: 4 }}>Initiation</h2>
      </div>
      <div className="archetype-grid">
        {ARCHETYPES.map((a, i) => (
          <PixelPanel key={a.id}>
            <div className="archetype-card" onClick={() => onSelect(a.id)}>
              <ArchetypeArt id={a.id} />
              <h3>{a.name}</h3>
              <div className="pixel-tag" style={{ alignSelf: 'flex-start' }}>{a.subtitle}</div>
              <div className="help-text" style={{ margin: '4px 0 6px' }}>{a.description}</div>
              <div className="pixel-divider" />
              <div className="stat-line"><span>HP</span><span className="gold-text">{a.stats.maxHp}</span></div>
              <div className="stat-line"><span>MP</span><span className="gold-text">{a.stats.maxMp}</span></div>
              <div className="stat-line"><span>ATK</span><span className="gold-text">{a.stats.attack}</span></div>
              <div className="stat-line"><span>SPL</span><span className="gold-text">{a.stats.spellPower}</span></div>
              <div className="stat-line"><span>SPD</span><span className="gold-text">{a.stats.speed}</span></div>
              <div className="stat-line"><span>ARM</span><span className="gold-text">{a.stats.armor}</span></div>
              <div className="stat-line"><span>LCK</span><span className="gold-text">{a.stats.luck}</span></div>
              <div className="pixel-divider" />
              <div style={{ fontSize: 11, letterSpacing: '0.12em' }}>
                <span className="glow-text">Starting Relic</span>
                <div className="gold-text" style={{ fontSize: 12 }}>
                  {RELICS[a.startingRelic].glyph} {RELICS[a.startingRelic].name}
                </div>
                <div className="help-text" style={{ fontSize: 10 }}>{RELICS[a.startingRelic].description}</div>
              </div>
              <div style={{ marginTop: 'auto' }}>
                <PixelButton onClick={() => onSelect(a.id)} focused={focus === i}>Begin</PixelButton>
              </div>
            </div>
          </PixelPanel>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <PixelButton onClick={onBack}>Back</PixelButton>
      </div>
    </div>
  );
}

function ArchetypeArt({ id }: { id: ArchetypeId }): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const start = performance.now() / 1000;
    const tick = (): void => {
      const t = performance.now() / 1000 - start;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, c.width, c.height);
      // glow
      const colours: Record<ArchetypeId, string> = {
        magus: 'rgba(108, 246, 229, 0.5)',
        hermit: 'rgba(244, 210, 122, 0.5)',
        star: 'rgba(155, 108, 255, 0.6)',
      };
      const g = ctx.createRadialGradient(c.width / 2, 30, 4, c.width / 2, 30, c.width * 0.6);
      g.addColorStop(0, colours[id]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      // pixel figure
      const scale = 4;
      const px = c.width / 2;
      const py = 36 + Math.sin(t * 3) * 1.5;
      drawTinyFigure(ctx, px, py, scale, id);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [id]);
  return <canvas ref={ref} width={220} height={120} className="archetype-portrait" />;
}

function drawTinyFigure(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: ArchetypeId): void {
  const cap = id === 'magus' ? '#1f8a86' : id === 'hermit' ? '#3a2310' : '#3a1d70';
  const robe = id === 'magus' ? '#2a1b66' : id === 'hermit' ? '#3b265c' : '#5b3a86';
  const accent = id === 'magus' ? '#6cf6e5' : id === 'hermit' ? '#f4d27a' : '#9b6cff';

  ctx.fillStyle = cap;
  ctx.fillRect(x - 5 * s, y - 8 * s, 10 * s, 4 * s); // hood
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 4 * s, y - 5 * s, 8 * s, 3 * s); // face shadow
  ctx.fillStyle = accent;
  ctx.fillRect(x - 2 * s, y - 4 * s, 1 * s, 1 * s);
  ctx.fillRect(x + 1 * s, y - 4 * s, 1 * s, 1 * s);
  ctx.fillStyle = robe;
  ctx.fillRect(x - 6 * s, y - 2 * s, 12 * s, 10 * s);
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 6 * s, y - 2 * s, 1 * s, 10 * s);
  ctx.fillStyle = accent;
  ctx.fillRect(x - 1 * s, y + 1 * s, 2 * s, 4 * s); // pendant
}
