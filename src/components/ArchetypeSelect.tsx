import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { ARCHETYPES } from '../game/data/archetypes';
import { ArchetypeId } from '../game/GameTypes';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { RELICS } from '../game/data/relics';
import { useGamepadButtons } from './useGamepadButtons';

interface Props {
  lastArchetype: ArchetypeId | null;
  onSelect: (id: ArchetypeId) => void;
  onBack: () => void;
}

type StatKey = keyof (typeof ARCHETYPES)[number]['stats'];

const VESSEL_GUIDE: Record<ArchetypeId, {
  role: string;
  bestFor: string;
  rhythm: string;
  strengths: string[];
}> = {
  magus: {
    role: 'Balanced spellcaster',
    bestFor: 'Best for learning the dungeon with strong mana, piercing spells, and safe mid-range control.',
    rhythm: 'Cast first, dash once, finish with a blade.',
    strengths: ['Piercing magic', 'Reliable mana', 'Flexible range'],
  },
  hermit: {
    role: 'Armored wanderer',
    bestFor: 'Best for players who want forgiveness, heavy melee hits, and more room to survive mistakes.',
    rhythm: 'Hold ground, punish close, outlast the room.',
    strengths: ['High health', 'Hard armor', 'Heavy melee'],
  },
  star: {
    role: 'Fast astral striker',
    bestFor: 'Best for confident players who want speed, lucky breaks, fast mana recovery, and risky burst.',
    rhythm: 'Slip through danger, strike bright, never stay still.',
    strengths: ['Top speed', 'Fast dashes', 'High luck'],
  },
};

const STAT_ROWS: Array<{ key: StatKey; label: string; cap: number }> = [
  { key: 'maxHp', label: 'HP', cap: 130 },
  { key: 'maxMp', label: 'MP', cap: 90 },
  { key: 'attack', label: 'ATK', cap: 16 },
  { key: 'spellPower', label: 'SPL', cap: 16 },
  { key: 'speed', label: 'SPD', cap: 92 },
  { key: 'armor', label: 'ARM', cap: 4 },
  { key: 'luck', label: 'LCK', cap: 3 },
  { key: 'manaRegen', label: 'REG', cap: 6 },
];

export function ArchetypeSelect({ onSelect, onBack, lastArchetype }: Props): JSX.Element {
  const initialIndex = Math.max(0, ARCHETYPES.findIndex((a) => a.id === lastArchetype));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const swipeStart = useRef<number | null>(null);
  const active = ARCHETYPES[activeIndex];
  const guide = VESSEL_GUIDE[active.id];
  const relic = RELICS[active.startingRelic];

  const move = useCallback((dir: number): void => {
    setActiveIndex((current) => (current + dir + ARCHETYPES.length) % ARCHETYPES.length);
  }, []);

  const selectActive = useCallback((): void => {
    onSelect(ARCHETYPES[activeIndex].id);
  }, [activeIndex, onSelect]);

  useGamepadButtons({
    onA: selectActive,
    onB: onBack,
    onLeft: () => move(-1),
    onRight: () => move(1),
    onLB: () => move(-1),
    onRB: () => move(1),
  });

  // Set initial focus to last archetype
  const setRef = useRef(false);
  useEffect(() => {
    if (setRef.current) return;
    setRef.current = true;
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    swipeStart.current = e.clientX;
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    if (swipeStart.current == null) return;
    const delta = e.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(delta) < 42) return;
    move(delta < 0 ? 1 : -1);
  };

  return (
    <div className="menu-screen archetype-screen with-bg">
      <div className="archetype-header vessel-header">
        <div className="pixel-subtitle">Choose Your Vessel</div>
        <h2 className="pixel-title archetype-heading">Initiation</h2>
        <p className="vessel-intro">
          Pick the body that fits how you want to survive: magic control, armored pressure, or fast astral risk.
        </p>
      </div>
      <div className="archetype-grid vessel-grid vessel-carousel" data-vessel={active.id} aria-live="polite">
        <button className="vessel-arrow vessel-arrow-left" type="button" aria-label="Previous vessel" onClick={() => move(-1)}>
          <span aria-hidden="true">&lt;</span>
        </button>
        <PixelPanel key={active.id} className={`vessel-panel vessel-panel-${active.id} vessel-carousel-panel`}>
          <div
            className={`archetype-card vessel-card vessel-card-${active.id} vessel-card-focused`}
            role="group"
            aria-label={`${active.name}, ${guide.role}`}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            <div className="vessel-stage">
              <ArchetypeArt id={active.id} />
              <div className="vessel-stage-base" aria-hidden="true" />
            </div>
            <div className="vessel-copy">
              <div className="vessel-title-row">
                <div>
                  <h3>{active.name}</h3>
                  <div className="pixel-tag vessel-subtitle">{active.subtitle}</div>
                </div>
                <div className="vessel-badges">
                  <span className="vessel-index">0{activeIndex + 1}/03</span>
                  <span className="vessel-role">{guide.role}</span>
                </div>
              </div>
              <div className="help-text archetype-description vessel-description">{guide.bestFor}</div>
              <div className="vessel-rhythm">{guide.rhythm}</div>
              <div className="vessel-strengths" aria-label={`${active.name} strengths`}>
                {guide.strengths.map((strength) => (
                  <span key={strength}>{strength}</span>
                ))}
              </div>
              <div className="vessel-stats" aria-label={`${active.name} starting stats`}>
                {STAT_ROWS.map(({ key, label, cap }) => {
                  const value = active.stats[key];
                  const width = Math.min(100, Math.max(8, Math.round((value / cap) * 100)));
                  return (
                    <div className="archetype-stat vessel-stat" key={key}>
                      <span className="vessel-stat-label">{label}</span>
                      <span className="vessel-stat-bar" aria-hidden="true">
                        <span style={{ width: `${width}%` }} />
                      </span>
                      <span className="gold-text vessel-stat-value">{value}</span>
                    </div>
                  );
                })}
              </div>
              <div className="archetype-relic vessel-relic">
                <span className="glow-text">Starting Relic</span>
                <div className="gold-text vessel-relic-name">
                  {relic.glyph} {relic.name}
                </div>
                <div className="help-text vessel-relic-description">{relic.description}</div>
              </div>
              <PixelButton onClick={selectActive} focused className="vessel-select-button">
                Begin as {active.name.replace('The ', '')}
              </PixelButton>
            </div>
          </div>
        </PixelPanel>
        <button className="vessel-arrow vessel-arrow-right" type="button" aria-label="Next vessel" onClick={() => move(1)}>
          <span aria-hidden="true">&gt;</span>
        </button>
      </div>
      <div className="vessel-dots" aria-label="Vessel choices">
        {ARCHETYPES.map((a, i) => (
          <button
            key={a.id}
            type="button"
            className={i === activeIndex ? 'is-active' : ''}
            aria-label={`Show ${a.name}`}
            aria-pressed={i === activeIndex}
            onClick={() => setActiveIndex(i)}
          />
        ))}
      </div>
      <div className="archetype-back">
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
      drawVesselPortrait(ctx, id, t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [id]);
  return <canvas ref={ref} width={260} height={420} className="archetype-portrait vessel-portrait" />;
}

function drawVesselPortrait(ctx: CanvasRenderingContext2D, id: ArchetypeId, t: number): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const palette = {
    magus: { glow: '#6cf6e5', robe: '#3032a5', trim: '#55f1de', shade: '#100745', face: '#07112a', leg: '#1d1974', metal: '#f4d27a' },
    hermit: { glow: '#f4d27a', robe: '#5a3375', trim: '#d98b36', shade: '#1a0d24', face: '#1c0e08', leg: '#2d1742', metal: '#ffe28e' },
    star: { glow: '#c7a2ff', robe: '#7046ba', trim: '#ff8fd6', shade: '#1c0d45', face: '#160738', leg: '#3a237b', metal: '#bff7ff' },
  }[id];
  const bob = Math.sin(t * 1.8) * 2;
  const cx = w / 2;
  const top = 44 + bob;
  const rect = (x: number, y: number, rw: number, rh: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(rw), Math.round(rh));
  };

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#080415');
  bg.addColorStop(0.6, '#03020a');
  bg.addColorStop(1, '#020108');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.13;
  ctx.fillStyle = palette.glow;
  for (let i = 0; i < 5; i += 1) {
    const x = 28 + i * 46;
    ctx.fillRect(x, 34 + (i % 2) * 18, 14, h - 110);
  }
  ctx.globalAlpha = 1;

  const aura = ctx.createRadialGradient(cx, 220, 16, cx, 220, 150);
  aura.addColorStop(0, `${palette.glow}7a`);
  aura.addColorStop(0.45, `${palette.glow}22`);
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = `${palette.glow}8c`;
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 26, w - 56, h - 60);
  ctx.strokeRect(45, 47, w - 90, h - 104);

  rect(cx - 86, 370, 172, 16, 'rgba(0, 0, 0, 0.58)');
  rect(cx - 65, 358, 130, 8, `${palette.glow}55`);

  ctx.globalAlpha = 0.54;
  rect(cx - 66, top + 82, 132, 214, palette.glow);
  rect(cx - 45, top + 24, 90, 82, palette.glow);
  ctx.globalAlpha = 1;

  if (id === 'magus') {
    rect(cx - 36, top + 254, 26, 92, palette.leg);
    rect(cx + 12, top + 254, 26, 92, palette.leg);
    rect(cx - 46, top + 342, 42, 14, palette.shade);
    rect(cx + 4, top + 342, 42, 14, palette.shade);
    rect(cx - 58, top + 140, 116, 142, palette.robe);
    rect(cx - 74, top + 164, 32, 118, '#1a1f89');
    rect(cx + 42, top + 164, 32, 118, '#1a1f89');
    rect(cx - 32, top + 158, 64, 124, palette.shade);
    rect(cx - 20, top + 202, 40, 10, palette.trim);
    rect(cx - 6, top + 232, 12, 46, palette.trim);
    rect(cx - 50, top + 60, 100, 30, palette.glow);
    rect(cx - 42, top + 78, 84, 54, '#1d5c91');
    rect(cx - 28, top + 88, 56, 34, palette.face);
    rect(cx - 16, top + 101, 8, 6, palette.glow);
    rect(cx + 8, top + 101, 8, 6, palette.glow);
    rect(cx - 34, top + 40, 68, 22, '#1d5c91');
    rect(cx - 8, top + 18, 16, 26, palette.metal);
    rect(cx + 78, top + 54, 8, 276, palette.glow);
    rect(cx + 66, top + 44, 32, 10, palette.glow);
    rect(cx + 75, top + 24, 18, 20, palette.glow);
    rect(cx - 96, top + 176, 34, 44, '#142a56');
    rect(cx - 90, top + 182, 22, 30, palette.metal);
  } else if (id === 'hermit') {
    rect(cx - 40, top + 256, 30, 90, palette.leg);
    rect(cx + 10, top + 256, 30, 90, palette.leg);
    rect(cx - 48, top + 342, 42, 14, '#110815');
    rect(cx + 4, top + 342, 42, 14, '#110815');
    rect(cx - 74, top + 126, 148, 164, palette.robe);
    rect(cx - 56, top + 118, 112, 190, palette.shade);
    rect(cx - 42, top + 158, 84, 116, '#4e2176');
    rect(cx - 22, top + 208, 44, 10, '#ff9b3a');
    rect(cx - 52, top + 54, 104, 42, palette.metal);
    rect(cx - 64, top + 82, 128, 68, '#6f4a1e');
    rect(cx - 36, top + 100, 72, 42, palette.face);
    rect(cx - 18, top + 116, 8, 7, palette.metal);
    rect(cx + 10, top + 116, 8, 7, palette.metal);
    rect(cx - 90, top + 92, 8, 228, '#7a4c22');
    rect(cx - 110, top + 180, 46, 52, palette.metal);
    rect(cx - 120, top + 166, 66, 78, 'rgba(244, 210, 122, 0.42)');
    rect(cx - 98, top + 194, 24, 22, '#14070a');
    rect(cx + 76, top + 114, 9, 230, '#7a4c22');
  } else {
    rect(cx - 38, top + 252, 28, 94, palette.leg);
    rect(cx + 10, top + 252, 28, 94, palette.leg);
    rect(cx - 46, top + 342, 42, 14, palette.shade);
    rect(cx + 4, top + 342, 42, 14, palette.shade);
    rect(cx - 84, top + 134, 168, 154, '#4d238e');
    rect(cx - 58, top + 112, 116, 188, palette.robe);
    rect(cx - 34, top + 152, 68, 132, palette.shade);
    rect(cx - 24, top + 206, 48, 10, palette.trim);
    rect(cx - 10, top + 236, 20, 44, palette.trim);
    rect(cx - 54, top + 60, 108, 34, palette.glow);
    rect(cx - 44, top + 80, 88, 62, '#5b2b90');
    rect(cx - 28, top + 96, 56, 34, palette.face);
    rect(cx - 16, top + 108, 8, 6, palette.glow);
    rect(cx + 8, top + 108, 8, 6, palette.glow);
    rect(cx - 48, top + 36, 96, 7, palette.trim);
    rect(cx - 5, top + 18, 10, 22, palette.glow);
    for (let i = 0; i < 5; i += 1) {
      const sx = cx - 82 + i * 41;
      const sy = top + 18 + (i % 2) * 18;
      rect(sx, sy, 10, 10, palette.glow);
      rect(sx + 3, sy - 5, 4, 20, palette.glow);
      rect(sx - 5, sy + 3, 20, 4, palette.glow);
    }
    rect(cx - 96, top + 166, 18, 116, palette.trim);
    rect(cx + 78, top + 166, 18, 116, palette.trim);
    rect(cx + 86, top + 112, 28, 64, `${palette.glow}dd`);
  }

  rect(0, h - 24, w, 24, 'rgba(0, 0, 0, 0.34)');
}
