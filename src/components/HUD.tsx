import { HudSnapshot } from '../game/GameEngine';
import { RELICS } from '../game/data/relics';
import { WEAPONS } from '../game/data/weapons';
import { SPELLS } from '../game/data/spells';
import { InputManager } from '../game/input/InputManager';

interface Props { hud: HudSnapshot; input?: InputManager | null }

export function HUD({ hud, input }: Props): JSX.Element {
  // Always-visible "pause" affordance — so a player whose Bluetooth
  // controller has a non-firing Start button can still reach the menu.
  const onPauseTap = (): void => { input?.setTouchButton('pause', true); setTimeout(() => input?.setTouchButton('pause', false), 30); };
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
        <div className="hud-currency-row">
          <span className="gold-text">✦ {hud.essence}</span> &nbsp;·&nbsp;
          <span className="gold-text">$ {hud.coins}</span> &nbsp;·&nbsp;
          <span className="gold-text">⚷ {hud.keys}</span>
          {hud.lampsLit > 0 && <span> &nbsp;·&nbsp; <span className="violet-text">☩ {hud.lampsLit}</span></span>}
        </div>
        <LoadoutStrip hud={hud} />
      </div>

      <div className="hud-top-right">
        <div className="hud-location-row">
          <button
            type="button"
            className="hud-pause-btn"
            aria-label="Pause"
            title="Pause"
            onClick={onPauseTap}
            onTouchStart={(e) => { e.preventDefault(); onPauseTap(); }}
          >☰</button>
          <div className="hud-floor-label">
            {hud.sphereGlyph} Floor {hud.floor}
          </div>
        </div>
        <div className="violet-text" style={{ fontSize: 10, letterSpacing: '0.2em', marginTop: 2 }}>
          {hud.sphereName}
        </div>
        <div className="glow-text" style={{ fontSize: 10, marginTop: 2 }}>{hud.roomName}</div>
        <div className="pixel-tag" style={{ marginTop: 6 }}>{hud.roomType?.toUpperCase()}</div>
        <div className="hud-minimap-wrap">
          <Minimap rooms={hud.rooms} />
        </div>
        <div className="relic-strip">
          {hud.relics.map((id) => (
            <div key={id} className="relic-icon" title={RELICS[id].name} data-name={RELICS[id].name}>
              {RELICS[id].glyph}
            </div>
          ))}
        </div>
      </div>

      <div className="hud-bottom-left">
        <span className="input-method-pill">
          {hud.inputMethod === 'controller' ? '🎮' : hud.inputMethod === 'keyboard' ? '⌨' : '👆'} {hud.inputMethod.toUpperCase()}
        </span>
        {hud.gamepadConnected && (
          <div style={{ fontSize: 9, marginTop: 4, color: 'var(--teal)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {hud.gamepadName || 'Controller connected'}
          </div>
        )}
      </div>

      <div className="hud-bottom-right">
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
        <>
          <div style={{
            position: 'absolute', inset: 0, zIndex: 3,
            background: 'rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 4,
            fontSize: 9, letterSpacing: '0.2em', color: 'var(--teal)', opacity: 0.7, pointerEvents: 'none',
          }}>
            ⏸ GAME PAUSED
          </div>
          <ShrinePrompt name={hud.pendingShrine.name} effect={hud.pendingShrine.effect} downside={hud.pendingShrine.downside} />
        </>
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
  const icon = (type: HudSnapshot['rooms'][number]['type']): string => {
    switch (type) {
      case 'locked': return '⚷';
      case 'treasure': return '$';
      case 'exit': return '↓';
      case 'boss': return '★';
      case 'miniBoss': return '◆';
      case 'sanctuary': return '☸';
      case 'shrine': return '✦';
      default: return '';
    }
  };
  return (
    <div style={{ marginTop: 8, padding: '4px 2px', border: '1px solid var(--gold-3)', background: 'rgba(0,0,0,0.6)' }}>
      <div style={{ position: 'relative', width: w, height: h }}>
        {rooms.map((r) => {
          if (!r.discovered) return null;
          const colour = colourForRoom(r.type, r.current);
          const ic = icon(r.type);
          return (
            <div key={`${r.gx},${r.gy}`} style={{
              position: 'absolute',
              left: (r.gx - minX) * (cell + 1),
              top: (r.gy - minY) * (cell + 1),
              width: cell, height: cell,
              background: colour,
              border: r.current ? '1px solid #fff' : '1px solid #221636',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 7, color: '#000', fontWeight: 700,
            }}>{ic}</div>
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
    case 'sanctuary': return '#6cf6e5';
    default: return '#3b265c';
  }
}

function LoadoutStrip({ hud }: { hud: HudSnapshot }): JSX.Element {
  const w = WEAPONS[hud.currentWeapon];
  const s = SPELLS[hud.currentSpell];
  return (
    <div className="loadout-strip">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="loadout-icon" title={w?.name} style={{ borderColor: w?.swingColour }}>
          <span style={{ color: w?.swingColour }}>{w?.glyph ?? '?'}</span>
        </div>
        <div className="loadout-copy">
          <div className="gold-text" style={{ fontSize: 10 }}>{w?.name ?? 'No weapon'}</div>
          {hud.weapons.length > 1 && (
            <div className="loadout-hint">[Q] cycle ({hud.weapons.indexOf(hud.currentWeapon) + 1}/{hud.weapons.length})</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="loadout-icon" title={s?.name} style={{ borderColor: s?.projColour }}>
          <span style={{ color: s?.projColour }}>{s?.glyph ?? '?'}</span>
        </div>
        <div className="loadout-copy">
          <div className="violet-text" style={{ fontSize: 10 }}>{s?.name ?? 'No spell'}</div>
          {hud.spells.length > 1 && (
            <div className="loadout-hint">[R] cycle ({hud.spells.indexOf(hud.currentSpell) + 1}/{hud.spells.length})</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShrinePrompt({ name, effect, downside }: { name: string; effect: string; downside: string }): JSX.Element {
  return (
    <div className="shrine-prompt">
      <div className="pixel-panel shrine-prompt-panel">
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
