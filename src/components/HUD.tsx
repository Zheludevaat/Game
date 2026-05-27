import { HudSnapshot } from '../game/GameEngine';
import { RELICS } from '../game/data/relics';
import { WEAPONS } from '../game/data/weapons';
import { SPELLS } from '../game/data/spells';
import { CONSUMABLES } from '../game/data/consumables';
import { RELIC_SYNERGIES } from '../game/data/relicSynergies';
import { STATUS_CONFIG } from '../game/data/statusEffects';
import { InputManager } from '../game/input/InputManager';

interface Props { hud: HudSnapshot; input?: InputManager | null }

export function HUD({ hud, input }: Props): JSX.Element {
  // Always-visible "pause" affordance — so a player whose Bluetooth
  // controller has a non-firing Start button can still reach the menu.
  // Hidden on touch devices since TouchControls renders its own dedicated
  // top-centre pause; showing two pause buttons confuses the eye.
  const onPauseTap = (): void => { input?.setTouchButton('pause', true); setTimeout(() => input?.setTouchButton('pause', false), 30); };
  const isTouch = hud.inputMethod === 'touch';
  const hpFrac = hud.maxHp > 0 ? hud.hp / hud.maxHp : 0;
  const mpFrac = hud.maxMp > 0 ? hud.mp / hud.maxMp : 0;
  const bossFrac = hud.bossMaxHp ? Math.max(0, (hud.bossHp ?? 0) / hud.bossMaxHp) : 0;

  return (
    <div className="hud-root">
      <div className="hud-top-left">
        <div className="bar hp" style={{ marginBottom: 6 }}>
          <div className="fill" style={{ transform: `scaleX(${Math.max(0, hpFrac)})` }} />
          <div className="label">HP {Math.max(0, Math.round(hud.hp))} / {hud.maxHp}</div>
        </div>
        <div className="bar mp">
          <div className="fill" style={{ transform: `scaleX(${Math.max(0, mpFrac)})` }} />
          <div className="label">MP {Math.round(hud.mp)} / {hud.maxMp}</div>
        </div>
        <div style={{ marginTop: 8, fontSize: 10 }}>
          <span className="gold-text">✦ {hud.essence}</span> &nbsp;·&nbsp;
          <span className="gold-text">$ {hud.coins}</span> &nbsp;·&nbsp;
          <span className="gold-text">⚷ {hud.keys}</span>
        </div>
        <PlayerStatusStrip status={hud.playerStatus} />
        <LoadoutStrip hud={hud} />
        <ConsumableStrip hud={hud} />
        <UltimateIndicator hud={hud} />
      </div>

      <div className="hud-top-right">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <RunTimer seconds={hud.runTimer} />
          {hud.combo >= 2 && <ComboTag count={hud.combo} pulse={hud.comboPulse} />}
          {!isTouch && (
            <button
              type="button"
              className="hud-pause-btn"
              aria-label="Pause"
              title="Pause"
              onPointerDown={(e) => { e.preventDefault(); onPauseTap(); }}
            >☰</button>
          )}
          <div style={{ letterSpacing: '0.3em', color: 'var(--gold-1)' }}>
            {hud.sphereGlyph} Floor {hud.floor}
          </div>
        </div>
        <div className="violet-text" style={{ fontSize: 10, letterSpacing: '0.2em', marginTop: 2 }}>
          {hud.sphereName}
        </div>
        <div className="glow-text" style={{ fontSize: 10, marginTop: 2 }}>{hud.roomName}</div>
        <div className="pixel-tag" style={{ marginTop: 6 }}>{hud.roomType?.toUpperCase()}</div>
        <Minimap rooms={hud.rooms} />
        <SynergyStrip synergies={hud.synergies} />
        <div className="relic-strip" style={{ marginTop: 8 }}>
          {hud.relics.map((id) => (
            <div key={id} className="relic-icon" title={RELICS[id].name} data-name={RELICS[id].name}>
              {RELICS[id].glyph}
            </div>
          ))}
        </div>
      </div>

      <div className="hud-bottom-left">
        {(() => {
          // Display the active controller as soon as we know one is in
          // use — not just when inputMethod has flipped. iPad players
          // pair a pad, get into the run, and previously kept seeing
          // "TOUCH" until the first button press; now the pill flips
          // the moment any pad input is observed.
          const showAsController = hud.controllerActive || hud.inputMethod === 'controller';
          const icon = showAsController ? '🎮' : hud.inputMethod === 'keyboard' ? '⌨' : '👆';
          const label = showAsController ? 'CONTROLLER' : hud.inputMethod.toUpperCase();
          return <span className="input-method-pill">{icon} {label}</span>;
        })()}
        {hud.gamepadConnected && (
          <div style={{ fontSize: 9, marginTop: 4, color: 'var(--teal)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {hud.gamepadName || 'Controller connected'}
          </div>
        )}
      </div>

      <div className="hud-bottom-right" style={{ maxWidth: 360 }}>
        {hud.prompts.map((t) => (
          <div key={t} className="glow-text" style={{ fontSize: 11, marginBottom: 4 }}>{t}</div>
        ))}
        {hud.hint && <div style={{ color: 'var(--gold-1)', fontSize: 10 }}>{hud.hint}</div>}
      </div>

      {hud.showFloorBanner && hud.floorBannerText && (
        <div className="boss-banner" style={{ top: '40%' }}>
          <div className="pixel-title" style={{ fontSize: 22, letterSpacing: '0.3em' }}>{hud.floorBannerText}</div>
        </div>
      )}

      {hud.tutorialPrompts.length > 0 && (
        <div className="tutorial-prompts">
          {hud.tutorialPrompts.map((t, i) => (
            <div key={t} className="tutorial-prompt" style={{ animationDelay: `${i * 0.3}s` }}>{t}</div>
          ))}
        </div>
      )}

      {hud.showBossBanner && hud.bossName && (
        <div className="boss-banner">
          <div className="pixel-subtitle">— A guardian awakens —</div>
          <div className="title pixel-title" style={{ marginTop: 4 }}>{hud.bossName}</div>
        </div>
      )}

      {hud.bossMaxHp != null && (
        <div className="boss-bar">
          <div className="bar boss">
            <div className="fill" style={{ transform: `scaleX(${bossFrac})` }} />
            <div className="label">{hud.bossName}</div>
          </div>
        </div>
      )}

      {hud.pendingShrine && (
        <ShrinePrompt name={hud.pendingShrine.name} effect={hud.pendingShrine.effect} downside={hud.pendingShrine.downside} />
      )}
    </div>
  );
}

function Minimap({ rooms }: { rooms: HudSnapshot['rooms'] }): JSX.Element {
  if (rooms.length === 0) return <div />;
  const xs = rooms.map((r) => r.gx);
  const ys = rooms.map((r) => r.gy);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const cell = 10;
  const w = (maxX - minX + 1) * (cell + 1);
  const h = (maxY - minY + 1) * (cell + 1);
  return (
    <div style={{ marginTop: 8, padding: 4, border: '1px solid var(--gold-3)', background: 'rgba(0,0,0,0.6)' }}>
      <div style={{ position: 'relative', width: w, height: h }}>
        {rooms.map((r) => {
          if (!r.discovered) return null;
          const colour = colourForRoom(r.type, r.current);
          const isBoss = r.type === 'boss' && !r.current;
          return (
            <div key={`${r.gx},${r.gy}`} style={{
              position: 'absolute',
              left: (r.gx - minX) * (cell + 1),
              top: (r.gy - minY) * (cell + 1),
              width: cell, height: cell,
              background: colour,
              border: r.current ? '1px solid #fff' : '1px solid #221636',
              animation: isBoss ? 'minimap-boss-pulse 1.4s ease-in-out infinite' : undefined,
            }}>
              {/* Content pips — small dots in the cell when an
                  unfinished chest or shrine remains. */}
              {r.chestIntact && (
                <span style={{
                  position: 'absolute', left: 1, top: 1,
                  width: 3, height: 3, background: '#f4d27a',
                  boxShadow: '0 0 3px #f4d27a',
                }} />
              )}
              {r.shrineIntact && (
                <span style={{
                  position: 'absolute', right: 1, bottom: 1,
                  width: 3, height: 3, background: '#9b6cff',
                  boxShadow: '0 0 3px #9b6cff',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function colourForRoom(type: HudSnapshot['rooms'][number]['type'], current: boolean): string {
  if (current) return 'var(--gold-1)';
  switch (type) {
    case 'start': return '#6cf6e5';
    case 'treasure': return '#f4d27a';
    case 'shrine': return '#9b6cff';
    case 'locked': return '#e23a4a';
    case 'exit': return '#a4faf0';
    case 'miniBoss': return '#ff7a5a';
    case 'boss': return '#ff3a4a';
    case 'trap': return '#ff9a4a';
    case 'sanctuary': return '#cdf6ff';
    default: return '#3b265c';
  }
}

function LoadoutStrip({ hud }: { hud: HudSnapshot }): JSX.Element {
  const w = WEAPONS[hud.currentWeapon];
  const s = SPELLS[hud.currentSpell];
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="loadout-icon" title={w?.name} style={{ borderColor: w?.swingColour }}>
          <span style={{ color: w?.swingColour }}>{w?.glyph ?? '?'}</span>
        </div>
        <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--bone)' }}>
          <div className="gold-text" style={{ fontSize: 10 }}>{w?.name ?? 'No weapon'}</div>
          {hud.weapons.length > 1 && (
            <div style={{ opacity: 0.7 }}>[Q] cycle ({hud.weapons.indexOf(hud.currentWeapon) + 1}/{hud.weapons.length})</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="loadout-icon" title={s?.name} style={{ borderColor: s?.projColour }}>
          <span style={{ color: s?.projColour }}>{s?.glyph ?? '?'}</span>
        </div>
        <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--bone)' }}>
          <div className="violet-text" style={{ fontSize: 10 }}>{s?.name ?? 'No spell'}</div>
          {hud.spells.length > 1 && (
            <div style={{ opacity: 0.7 }}>[R] cycle ({hud.spells.indexOf(hud.currentSpell) + 1}/{hud.spells.length})</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RunTimer({ seconds }: { seconds: number }): JSX.Element {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return (
    <div style={{
      fontFamily: 'monospace',
      fontSize: 10,
      letterSpacing: '0.18em',
      color: 'var(--bone)',
      opacity: 0.7,
    }}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
}

function ComboTag({ count, pulse }: { count: number; pulse: number }): JSX.Element {
  // Scale grows briefly on increment then settles. pulse decays 0.4→0 in-engine.
  const scale = 1 + pulse * 0.6;
  return (
    <div
      style={{
        fontFamily: "'Press Start 2P', monospace, sans-serif",
        fontSize: 14,
        color: '#ffe6a3',
        letterSpacing: '0.12em',
        textShadow: '0 0 6px rgba(244, 210, 122, 0.85)',
        transform: `scale(${scale.toFixed(2)})`,
        transformOrigin: 'right center',
        transition: 'transform 0.18s cubic-bezier(.2,.7,.2,1)',
      }}
    >
      ×{count}
    </div>
  );
}

function SynergyStrip({ synergies }: { synergies: HudSnapshot['synergies'] }): JSX.Element | null {
  if (!synergies || synergies.length === 0) return null;
  return (
    <div style={{
      marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4,
      maxWidth: 240, justifyContent: 'flex-end',
    }}>
      {synergies.map((id) => {
        const def = RELIC_SYNERGIES[id];
        return (
          <div
            key={id}
            title={`${def.name} — ${def.description}`}
            style={{
              padding: '1px 5px',
              fontSize: 9,
              letterSpacing: '0.12em',
              color: def.colour,
              background: 'rgba(244, 210, 122, 0.10)',
              border: `1px solid ${def.colour}`,
              boxShadow: `0 0 6px ${def.colour}55`,
            }}
          >
            ✦ {def.name.toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}

function UltimateIndicator({ hud }: { hud: HudSnapshot }): JSX.Element {
  const ready = hud.ultimateCdMax > 0
    ? Math.max(0, 1 - hud.ultimateCd / hud.ultimateCdMax)
    : 1;
  const isReady = hud.ultimateCd <= 0.01;
  const remaining = Math.max(0, Math.ceil(hud.ultimateCd));
  return (
    <div
      title={`${hud.ultimateName} — ${isReady ? 'READY' : `${remaining}s`}`}
      style={{
        marginTop: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <div style={{
        position: 'relative',
        width: 30, height: 30,
        border: `2px solid ${isReady ? hud.ultimateColour : '#3b265c'}`,
        background: 'rgba(0,0,0,0.55)',
        boxShadow: isReady ? `0 0 12px ${hud.ultimateColour}88` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isReady ? hud.ultimateColour : 'var(--bone)',
        fontSize: 16,
        opacity: isReady ? 1 : 0.6,
      }}>
        <span style={{ position: 'relative', zIndex: 2 }}>{hud.ultimateGlyph}</span>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to top, ${hud.ultimateColour}33 0%, ${hud.ultimateColour}33 ${ready * 100}%, transparent ${ready * 100}%)`,
            zIndex: 1,
          }}
        />
      </div>
      <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--bone)' }}>
        <div style={{ color: isReady ? hud.ultimateColour : 'var(--bone)' }}>
          {hud.ultimateName.toUpperCase()}
        </div>
        <div style={{ opacity: 0.7 }}>
          {(() => {
            if (!isReady) return `${remaining}s`;
            switch (hud.inputMethod) {
              case 'touch':      return 'TAP ULT — READY';
              case 'controller': return 'L STICK CLICK — READY';
              default:           return '[V or F] READY';
            }
          })()}
        </div>
      </div>
    </div>
  );
}

function ConsumableStrip({ hud }: { hud: HudSnapshot }): JSX.Element {
  const hasItems = hud.consumables && hud.consumables.length > 0;
  const buffs = hud.freeNextSpell || hud.reflectCharges > 0;
  if (!hasItems && !buffs) {
    return (
      <div style={{
        marginTop: 6, fontSize: 9, color: 'var(--bone)', opacity: 0.55, letterSpacing: '0.16em',
      }}>
        ITEMS — none
      </div>
    );
  }
  return (
    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {hasItems && (
        <span style={{ fontSize: 9, color: 'var(--bone)', opacity: 0.75, letterSpacing: '0.18em', marginRight: 2 }}>
          [G / H]
        </span>
      )}
      {hud.consumables.map((slot, i) => {
        const def = CONSUMABLES[slot.id];
        const selected = i === hud.consumableIdx;
        return (
          <div
            key={slot.id}
            title={`${def.name} ×${slot.count} — ${def.description}`}
            style={{
              minWidth: 24,
              padding: '1px 3px',
              fontSize: 12,
              lineHeight: 1.1,
              textAlign: 'center',
              color: def.colour,
              background: selected ? 'rgba(244, 210, 122, 0.18)' : 'rgba(0, 0, 0, 0.45)',
              border: `1px solid ${selected ? '#f4d27a' : '#3b265c'}`,
              boxShadow: selected ? '0 0 6px rgba(244, 210, 122, 0.55)' : 'none',
            }}
          >
            {def.glyph}
            <div style={{ fontSize: 8, color: 'var(--bone)', opacity: 0.85 }}>
              ×{slot.count}
            </div>
          </div>
        );
      })}
      {hud.freeNextSpell && (
        <span
          title="Next spell costs no mana"
          style={{
            fontSize: 9,
            color: '#a4faf0',
            letterSpacing: '0.18em',
            marginLeft: 6,
          }}
        >
          ECHO
        </span>
      )}
      {hud.reflectCharges > 0 && (
        <span
          title={`Mirror Sigil — ${hud.reflectCharges} reflect${hud.reflectCharges === 1 ? '' : 's'} ready`}
          style={{
            fontSize: 9,
            color: '#cdf6ff',
            letterSpacing: '0.18em',
            marginLeft: 6,
            textShadow: '0 0 6px #cdf6ff88',
          }}
        >
          MIRROR ×{hud.reflectCharges}
        </span>
      )}
    </div>
  );
}

function PlayerStatusStrip({ status }: { status: HudSnapshot['playerStatus'] }): JSX.Element | null {
  if (!status || status.length === 0) return null;
  return (
    <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
      {status.map((s) => {
        const cfg = STATUS_CONFIG[s.kind];
        return (
          <div
            key={s.kind}
            title={`${s.kind} (${s.remaining.toFixed(1)}s${s.stacks > 1 ? `, ×${s.stacks}` : ''})`}
            style={{
              minWidth: 22,
              padding: '1px 4px',
              fontSize: 9,
              color: '#0d0717',
              background: cfg.colour,
              border: '1px solid rgba(0,0,0,0.35)',
              letterSpacing: '0.1em',
              textAlign: 'center',
              opacity: 0.92,
            }}
          >
            {cfg.glyph}{s.stacks > 1 ? s.stacks : ''}
          </div>
        );
      })}
    </div>
  );
}

function ShrinePrompt({ name, effect, downside }: { name: string; effect: string; downside: string }): JSX.Element {
  return (
    <div style={{
      position: 'absolute',
      left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'auto',
    }}>
      <div className="pixel-panel" style={{ minWidth: 320, textAlign: 'center' }}>
        <div className="pixel-subtitle">A shrine of {name.toLowerCase()}</div>
        <div className="pixel-title" style={{ fontSize: 22, margin: '4px 0' }}>{name}</div>
        <div className="pixel-divider" />
        <div className="glow-text" style={{ fontSize: 13 }}>Boon: <span className="gold-text">{effect}</span></div>
        <div className="crimson-text" style={{ fontSize: 13 }}>Cost: {downside}</div>
        <div className="pixel-divider" />
        <div style={{ fontSize: 11, color: 'var(--bone)' }}>
          Interact / Enter — Accept &nbsp;·&nbsp; Esc / B — Decline
        </div>
      </div>
    </div>
  );
}
