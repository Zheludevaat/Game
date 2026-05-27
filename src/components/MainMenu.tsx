import { useEffect, useMemo, useRef, useState } from 'react';
import { PixelButton } from './PixelButton';
import { useMenuNav } from './useMenuNav';
import { ArchetypeId, MetaState } from '../game/GameTypes';
import { NPCS, pickHierophantGreeting } from '../game/data/npcs';

interface Props {
  bestFloor: number;
  essence: number;
  resumeAvailable: boolean;
  codexUnlocked: number;
  codexTotal: number;
  /** True if the player has already attempted today's Daily Run. */
  dailyAttemptedToday: boolean;
  /** Display name of the archetype the Daily Run is locked to today. */
  dailyArchetypeName: string;
  /** Full meta state — fed to the Hierophant so his greeting reflects the
   *  player's last death cause / Ogdoad count / daily clears. */
  meta: MetaState;
  /** Last archetype chosen, for archetype-flavoured idle lines. Null on a
   *  brand-new save. */
  lastArchetype: ArchetypeId | null;
  /** True once the player has cleared the Ogdoad at least once. */
  bossRushUnlocked: boolean;
  /** Persistent best Boss Rush clear time in seconds. */
  bossRushBestSeconds?: number;
  /** Highest floor reached across all Boss Rush attempts (including failed). */
  bossRushBestFloor?: number;
  /** Persistent best Time Attack score (composite). */
  timeAttackBestScore?: number;
  onNewRun: () => void;
  onDailyRun: () => void;
  onBossRush: () => void;
  onTimeAttack: () => void;
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
      // Parallax abyss glow
      const g = ctx.createRadialGradient(W / 2, H * 0.7, 40, W / 2, H * 0.7, H);
      g.addColorStop(0, 'rgba(80, 30, 140, 0.22)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Stars / dust
      const now = performance.now() / 1000;
      for (const s of stars) {
        s.t += 0.01;
        const a = 0.3 + 0.7 * Math.abs(Math.sin(s.t));
        ctx.fillStyle = `rgba(244, 210, 122, ${a * s.z * 0.5})`;
        ctx.fillRect(s.x, s.y, 1.5 * s.z, 1.5 * s.z);
        s.y -= 0.2 * s.z;
        if (s.y < 0) { s.y = H; s.x = Math.random() * W; }
      }
      // Seven lamps row — positioned well above the title block, never overlapping it.
      // Skipped entirely on short landscape (iPhone) where the row
      // bled into the title text; the candle decor is cosmetic only.
      const skipLamps = H < 500;
      const cx = W / 2;
      const cy = Math.max(48, H * 0.08);
      const spacing = Math.min(72, Math.max(40, W / 12));
      for (let i = 0; i < 7; i++) {
        if (skipLamps) break;
        const x = cx + (i - 3) * spacing;
        const flick = 0.7 + Math.sin(now * 3 + i * 0.9) * 0.3;
        // halo
        const halo = ctx.createRadialGradient(x, cy, 1, x, cy, 22);
        halo.addColorStop(0, `rgba(255, 230, 163, ${0.55 * flick})`);
        halo.addColorStop(1, 'rgba(244, 210, 122, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, cy, 22, 0, Math.PI * 2);
        ctx.fill();
        // bracket
        ctx.fillStyle = '#3b265c';
        ctx.fillRect(x - 1, cy + 4, 2, 8);
        ctx.fillRect(x - 4, cy + 11, 8, 2);
        // flame body
        const fh = 7 + Math.sin(now * 5 + i) * 1.2;
        ctx.fillStyle = `rgba(244, 210, 122, ${0.85 * flick})`;
        ctx.beginPath();
        ctx.ellipse(x, cy, 3.5, fh, 0, 0, Math.PI * 2);
        ctx.fill();
        // hot core
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
    { onActivate: p.dailyAttemptedToday ? () => undefined : p.onDailyRun, disabled: p.dailyAttemptedToday },
    { onActivate: p.bossRushUnlocked ? p.onBossRush : () => undefined, disabled: !p.bossRushUnlocked },
    { onActivate: p.onTimeAttack },
    { onActivate: p.resumeAvailable ? p.onContinue : () => undefined, disabled: !p.resumeAvailable },
    { onActivate: p.onCodex },
    { onActivate: p.onCinematics },
    { onActivate: p.onMeta },
    { onActivate: p.onSettings },
    { onActivate: p.onController },
    { onActivate: p.onHowTo },
  ];
  const focus = useMenuNav(items);

  return (
    <>
      <canvas ref={bgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }} />
      <div className="menu-screen no-bg main-menu" style={{ zIndex: 5 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }} className="main-menu-title">
          <div className="pixel-subtitle">The Initiate Approaches</div>
          <h1 className="pixel-title" style={{ fontSize: 'clamp(22px, 6.5vh, 48px)', margin: '8px 0 0', letterSpacing: '0.18em', lineHeight: 1.05 }}>
            Abyss of the<br />Seven Lamps
          </h1>
        </div>
        <HierophantPanel meta={p.meta} lastArchetype={p.lastArchetype} />
        <div className="main-menu-grid">
          <PixelButton onClick={p.onNewRun} focused={focus === 0}>New Run</PixelButton>
          <PixelButton
            onClick={p.onDailyRun}
            disabled={p.dailyAttemptedToday}
            focused={focus === 1}
            badge={p.dailyAttemptedToday
              ? (() => {
                // Time until the next UTC midnight rollover —
                // recomputed once per render, which is good enough
                // since the menu is interactive but not real-time.
                const now = Date.now();
                const nextDay = (Math.floor(now / 86_400_000) + 1) * 86_400_000;
                const ms = Math.max(0, nextDay - now);
                const h = Math.floor(ms / 3_600_000);
                const m = Math.floor((ms % 3_600_000) / 60_000);
                return `${h}h ${m}m`;
              })()
              : p.dailyArchetypeName.split(' ').slice(-1)[0]}
          >
            Daily Run
          </PixelButton>
          <PixelButton
            onClick={p.onBossRush}
            disabled={!p.bossRushUnlocked}
            focused={focus === 2}
            badge={(() => {
              if (!p.bossRushUnlocked) return 'LOCKED';
              if (p.bossRushBestSeconds != null) {
                const m = Math.floor(p.bossRushBestSeconds / 60);
                const s = p.bossRushBestSeconds % 60;
                return `${m}:${String(s).padStart(2, '0')}`;
              }
              // No clear yet but partial progress earned — show the
              // highest floor reached so a floor-50 death reads
              // differently from a floor-10 death.
              if (p.bossRushBestFloor != null && p.bossRushBestFloor > 0) {
                return `F${p.bossRushBestFloor}`;
              }
              return 'NEW';
            })()}
          >
            Boss Rush {p.bossRushUnlocked ? '' : '(clear Ogdoad to unlock)'}
          </PixelButton>
          <PixelButton
            onClick={p.onTimeAttack}
            focused={focus === 3}
            badge={p.timeAttackBestScore == null ? 'NEW' : `★ ${p.timeAttackBestScore}`}
          >
            Time Attack
          </PixelButton>
          <PixelButton onClick={p.onContinue} disabled={!p.resumeAvailable} focused={focus === 4}>
            Continue {p.resumeAvailable ? '' : '(none)'}
          </PixelButton>
          <PixelButton onClick={p.onCodex} focused={focus === 5} badge={`☥ ${p.codexUnlocked}/${p.codexTotal}`}>
            Codex Hermeticum
          </PixelButton>
          <PixelButton onClick={p.onCinematics} focused={focus === 6} badge="▶">
            Cinematics
          </PixelButton>
          <PixelButton onClick={p.onMeta} focused={focus === 7} badge={`✦ ${p.essence}`}>
            Meta Progression
          </PixelButton>
          <PixelButton onClick={p.onSettings} focused={focus === 8}>Settings</PixelButton>
          <PixelButton onClick={p.onController} focused={focus === 9}>Controller Test</PixelButton>
          <PixelButton onClick={p.onHowTo} focused={focus === 10}>How to Play</PixelButton>
        </div>
        <div className="main-menu-stats" style={{ marginTop: 18, fontSize: 11, letterSpacing: '0.3em', color: 'var(--teal)' }}>
          Best Floor: <span className="gold-text">{p.bestFloor}</span> &nbsp;·&nbsp; Essence: <span className="gold-text">{p.essence}</span>
        </div>
        <div className="main-menu-footer" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'rgba(231,227,215,0.5)' }}>
          A SOLITARY DESCENT &nbsp;·&nbsp; v0.1
        </div>
      </div>
    </>
  );
}

interface HierophantPanelProps {
  meta: MetaState;
  lastArchetype: ArchetypeId | null;
}

// The Hierophant — non-hostile NPC sitting on the main menu. Speaks one
// to three lines drawn from `pickHierophantGreeting`, which inspects
// the most recent death cause / Ogdoad count / today's daily clear and
// returns context-appropriate dialogue. Phase A of the docs/npcs.md
// roll-out — in-run NPCs come in later phases.
function HierophantPanel({ meta, lastArchetype }: HierophantPanelProps): JSX.Element {
  const lines = useMemo(() => pickHierophantGreeting(meta, lastArchetype), [meta, lastArchetype]);
  const [lineIdx, setLineIdx] = useState(0);
  const def = NPCS.hierophant;
  const advance = (): void => {
    setLineIdx((i) => Math.min(i + 1, lines.length - 1));
  };
  const isLast = lineIdx >= lines.length - 1;
  const cue = lines[lineIdx]?.cue ?? 'still';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '8px 12px',
        margin: '0 auto 14px',
        maxWidth: 540,
        background: 'rgba(20, 10, 40, 0.55)',
        border: `1px solid ${def.colour}55`,
        boxShadow: `0 0 18px ${def.colour}22`,
        cursor: isLast ? 'default' : 'pointer',
      }}
      onClick={isLast ? undefined : advance}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (!isLast) { e.preventDefault(); advance(); }
        }
      }}
      role="button"
      tabIndex={isLast ? -1 : 0}
      aria-label={`${def.name}: ${lines[lineIdx]?.text}`}
    >
      <HierophantPortrait cue={cue} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 9,
          letterSpacing: '0.24em',
          color: def.colour,
          opacity: 0.9,
        }}>
          {def.name.toUpperCase()} — {def.title}
        </div>
        <div style={{
          fontSize: 12,
          letterSpacing: '0.05em',
          marginTop: 4,
          color: 'var(--bone)',
          lineHeight: 1.4,
          minHeight: 32,
        }}>
          {lines[lineIdx]?.text}
        </div>
        {!isLast && (
          <div style={{ fontSize: 9, color: 'var(--bone)', opacity: 0.55, marginTop: 4, letterSpacing: '0.2em' }}>
            ▸ click / tap / enter to continue ({lineIdx + 1}/{lines.length})
          </div>
        )}
      </div>
    </div>
  );
}

interface HierophantPortraitProps {
  cue: 'still' | 'gesture' | 'turn';
}

// Tall robed pixel portrait. Hooded silhouette with two crossed staves
// behind and a gold-rimmed brow. Drawn imperatively on a small canvas
// so the flame at his hands flickers and the robe sways with the cue.
function HierophantPortrait({ cue }: HierophantPortraitProps): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const start = performance.now() / 1000;
    const draw = (): void => {
      const t = performance.now() / 1000 - start;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, c.width, c.height);
      // Soft halo behind the figure — gold for the Hierophant.
      const haloR = 32 + Math.sin(t * 1.4) * 1.2;
      const g = ctx.createRadialGradient(c.width / 2, 24, 4, c.width / 2, 24, haloR);
      g.addColorStop(0, 'rgba(255, 230, 175, 0.55)');
      g.addColorStop(1, 'rgba(244, 210, 122, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      // Sway amount keyed to the cue — 'gesture' shifts harder, 'turn' offsets the head.
      const swayBase = cue === 'gesture' ? 1.8 : 1;
      const bob = Math.sin(t * 2.6) * swayBase * 0.5;
      const headOff = cue === 'turn' ? Math.sin(t * 1.5) * 1.2 : 0;
      const s = 3;
      const px = c.width / 2;
      const py = 22 + bob;
      // Crossed staves behind — drawn first so the robe overlays them.
      ctx.fillStyle = '#5a3a18';
      ctx.fillRect(px - 9 * s, py - 4 * s, 1 * s, 16 * s);
      ctx.fillRect(px + 8 * s, py - 4 * s, 1 * s, 16 * s);
      // Staff caps
      ctx.fillStyle = '#f4d27a';
      ctx.fillRect(px - 10 * s, py - 5 * s, 3 * s, 2 * s);
      ctx.fillRect(px + 7 * s, py - 5 * s, 3 * s, 2 * s);
      // Hood
      ctx.fillStyle = '#231142';
      ctx.fillRect(px - 5 * s + headOff, py - 8 * s, 10 * s, 5 * s);
      // Gold rim around the hood
      ctx.fillStyle = '#ffe6a3';
      ctx.fillRect(px - 5 * s + headOff, py - 8 * s, 10 * s, 1);
      ctx.fillRect(px - 5 * s + headOff, py - 3 * s - 1, 10 * s, 1);
      // Face shadow
      ctx.fillStyle = '#0a0420';
      ctx.fillRect(px - 4 * s + headOff, py - 6 * s, 8 * s, 3 * s);
      // Two glowing eyes
      const eyeFlicker = 0.7 + Math.sin(t * 3.4) * 0.3;
      ctx.fillStyle = `rgba(255, 230, 163, ${eyeFlicker})`;
      ctx.fillRect(px - 2 * s + headOff, py - 5 * s, 1 * s, 1 * s);
      ctx.fillRect(px + 1 * s + headOff, py - 5 * s, 1 * s, 1 * s);
      // Robe body
      ctx.fillStyle = '#3b265c';
      ctx.fillRect(px - 6 * s, py - 2 * s, 12 * s, 12 * s);
      // Robe gold trim
      ctx.fillStyle = '#f4d27a';
      ctx.fillRect(px - 6 * s, py - 2 * s, 12 * s, 1);
      ctx.fillRect(px - 6 * s, py + 9 * s, 12 * s, 1);
      // Inner robe shadow stripe
      ctx.fillStyle = '#2a1b66';
      ctx.fillRect(px - 5 * s, py - 1 * s, 1 * s, 10 * s);
      ctx.fillRect(px + 4 * s, py - 1 * s, 1 * s, 10 * s);
      // Hands holding a small lamp at chest level
      ctx.fillStyle = '#231142';
      ctx.fillRect(px - 2 * s, py + 4 * s, 4 * s, 2 * s);
      // Lamp body + flame
      const flick = 0.7 + Math.sin(t * 6) * 0.3;
      ctx.fillStyle = `rgba(255, 230, 163, ${flick})`;
      ctx.beginPath();
      ctx.ellipse(px, py + 3 * s, 2 * s, 3 * s * flick, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7d6';
      ctx.fillRect(px - 1, py + 2 * s, 2, 2);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [cue]);
  return (
    <canvas
      ref={ref}
      width={72}
      height={96}
      style={{ flex: '0 0 auto', imageRendering: 'pixelated' }}
    />
  );
}
