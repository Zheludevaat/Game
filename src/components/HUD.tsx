import { HudSnapshot } from '../game/GameEngine';
import { RELICS } from '../game/data/relics';
import { WEAPONS } from '../game/data/weapons';
import { SPELLS } from '../game/data/spells';
import { CONSUMABLES } from '../game/data/consumables';
import { RELIC_SYNERGIES } from '../game/data/relicSynergies';
import { STATUS_CONFIG } from '../game/data/statusEffects';
import { InputManager } from '../game/input/InputManager';
import { ModalPanel } from './ModalPanel';

interface Props {
  hud: HudSnapshot;
  input?: InputManager | null;
  /** Lampwright shop callbacks — touch users tap rows directly since
   *  the engine's uiUp/uiDown/uiConfirm wiring is keyboard / pad only. */
  onShopBuy?: (idx: number) => void;
  onShopClose?: () => void;
}

export function HUD({ hud, input, onShopBuy, onShopClose }: Props): JSX.Element {
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
          <RunTimer seconds={hud.runTimer} mode={hud.mode} />
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

      <div className="hud-bottom-right" style={{ maxWidth: 'min(360px, 60vw)' }}>
        {hud.prompts.map((t) => (
          <div key={t} className="glow-text" style={{ fontSize: 11, marginBottom: 4, wordBreak: 'break-word' }}>{t}</div>
        ))}
        {hud.hint && <div style={{ color: 'var(--gold-1)', fontSize: 10, wordBreak: 'break-word' }}>{hud.hint}</div>}
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
        <ShrinePrompt
          name={hud.pendingShrine.name}
          effect={hud.pendingShrine.effect}
          downside={hud.pendingShrine.downside}
          isTouch={isTouch}
          input={input}
        />
      )}

      {hud.pendingShop && (
        <ShopPrompt
          wares={hud.pendingShop.wares}
          focus={hud.pendingShop.focus}
          coins={hud.pendingShop.coins}
          onBuy={(idx) => onShopBuy?.(idx)}
          onClose={() => onShopClose?.()}
        />
      )}

      {hud.pendingPuzzle && (
        <PuzzlePrompt
          target={hud.pendingPuzzle.target}
          progress={hud.pendingPuzzle.progress}
          failed={hud.pendingPuzzle.failed}
          isTouch={isTouch}
          input={input}
        />
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
      <div style={{ position: 'relative', width: w, height: h, marginBottom: 2 }}>
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
                  width: 3, height: 3,
                  background: r.chestLocked ? '#e23a4a' : '#f4d27a',
                  boxShadow: r.chestLocked ? '0 0 3px #e23a4a' : '0 0 3px #f4d27a',
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
      <MinimapLegend />
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
    // Secret rooms used to share the shrine purple — players couldn't
    // tell which floor had which type. Rose-pink reads distinct from
    // every other minimap hue.
    case 'secret': return '#ff6caf';
    default: return '#3b265c';
  }
}

/** Tiny inline legend rendered below the minimap so players can decode
 *  the colour palette without learning by accident. Order matches the
 *  likely encounter sequence on a typical floor. */
function MinimapLegend(): JSX.Element {
  const entries: { colour: string; label: string }[] = [
    { colour: '#f4d27a', label: 'TREASURE' },
    { colour: '#9b6cff', label: 'SHRINE' },
    { colour: '#ff6caf', label: 'SECRET' },
    { colour: '#cdf6ff', label: 'SANCTUARY' },
    { colour: '#e23a4a', label: 'LOCKED' },
    { colour: '#ff9a4a', label: 'TRAP' },
    { colour: '#ff7a5a', label: 'MINI-BOSS' },
    { colour: '#ff3a4a', label: 'BOSS' },
  ];
  return (
    <div style={{
      marginTop: 4,
      display: 'flex',
      flexWrap: 'wrap',
      gap: '2px 6px',
      fontSize: 8,
      letterSpacing: '0.12em',
      color: 'rgba(231,227,215,0.7)',
      maxWidth: 132,
    }}>
      {entries.map((e) => (
        <span key={e.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 5, height: 5, background: e.colour, display: 'inline-block' }} />
          {e.label}
        </span>
      ))}
    </div>
  );
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

function RunTimer({ seconds, mode }: { seconds: number; mode?: HudSnapshot['mode'] }): JSX.Element {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const racing = mode === 'timeAttack';
  return (
    <div style={{
      fontFamily: 'monospace',
      fontSize: racing ? 11 : 10,
      letterSpacing: '0.18em',
      color: racing ? '#ff7a5a' : 'var(--bone)',
      opacity: racing ? 1 : 0.7,
      padding: racing ? '1px 6px' : 0,
      border: racing ? '1px solid #ff7a5a' : 'none',
      textShadow: racing ? '0 0 6px #ff7a5a99' : 'none',
      animation: racing ? 'tutorial-pulse 1.6s ease-in-out infinite' : undefined,
    }}>
      {racing && <span style={{ marginRight: 6, fontSize: 9 }}>RACE</span>}
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
        // Dark outline + soft gold glow so the combo number reads
        // against the bright crit white-flash. The 1 px black border
        // is faked via four offset text-shadows.
        textShadow: [
          '0 0 6px rgba(244, 210, 122, 0.85)',
          '1px 1px 0 rgba(0,0,0,0.95)',
          '-1px 1px 0 rgba(0,0,0,0.95)',
          '1px -1px 0 rgba(0,0,0,0.95)',
          '-1px -1px 0 rgba(0,0,0,0.95)',
        ].join(', '),
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
  const isTouch = hud.inputMethod === 'touch';
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
          {isTouch ? '↻I / USE I →' : '[G / H]'}
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
            <div style={{ fontSize: 8, lineHeight: 1, marginTop: 1, color: 'var(--bone)', opacity: 0.85, textAlign: 'center' }}>
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

/** Tap button that fires an InputManager touch flag for one frame.
 *  Used inside modals so iPhone players can drive the same engine
 *  paths as keyboard arrows / Enter / Escape — InputManager.tick has
 *  the matching `touchPressedThisFrame[name]` reader for each. */
function ModalTapButton({
  input, name, label, accent = '#f4d27a',
}: {
  input?: InputManager | null;
  name: string;
  label: string;
  accent?: string;
}): JSX.Element {
  const press = (down: boolean): void => { input?.setTouchButton(name, down); };
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        press(true);
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* */ }
      }}
      onPointerUp={(e) => {
        press(false);
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* */ }
      }}
      onPointerCancel={() => press(false)}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        minWidth: 56, minHeight: 44,
        padding: '8px 14px',
        background: 'rgba(0,0,0,0.55)',
        border: `1px solid ${accent}`,
        color: accent,
        fontSize: 12,
        letterSpacing: '0.18em',
        fontFamily: "'Press Start 2P', monospace, sans-serif",
        cursor: 'pointer',
        touchAction: 'none',
      }}
    >
      {label}
    </button>
  );
}

function ShrinePrompt({
  name, effect, downside, isTouch, input,
}: {
  name: string;
  effect: string;
  downside: string;
  isTouch: boolean;
  input?: InputManager | null;
}): JSX.Element {
  const footer = isTouch
    ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <ModalTapButton input={input} name="uiConfirm" label="ACCEPT" accent="#6cf6e5" />
          <ModalTapButton input={input} name="uiCancel"  label="DECLINE" accent="#e23a4a" />
        </div>
      )
    : (<>Interact / Enter — Accept &nbsp;·&nbsp; Esc / B — Decline</>);
  return (
    <ModalPanel
      subtitle={`A shrine of ${name.toLowerCase()}`}
      title={name}
      footer={footer}
    >
      <div className="glow-text" style={{ fontSize: 13 }}>Boon: <span className="gold-text">{effect}</span></div>
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>
        <span style={{
          display: 'inline-block',
          padding: '3px 10px',
          background: 'rgba(226, 58, 74, 0.22)',
          border: '1px solid #e23a4a',
          color: '#ffb9b1',
          letterSpacing: '0.2em',
          fontSize: 11,
        }}>
          COST · {downside}
        </span>
      </div>
    </ModalPanel>
  );
}

interface ShopWareView {
  label: string;
  description: string;
  cost: number;
  affordable: boolean;
  canAccept: boolean;
}

interface ShopPromptProps {
  wares: ShopWareView[];
  focus: number;
  coins: number;
  onBuy: (idx: number) => void;
  onClose: () => void;
}

function ShopPrompt({ wares, focus, coins, onBuy, onClose }: ShopPromptProps): JSX.Element {
  return (
    <ModalPanel
      subtitle="The Lampwright opens his pack"
      title="Wares for the Lamp"
      minWidth={360}
      footer={
        <>
          <div>↑ / ↓ — Pick &nbsp;·&nbsp; Interact / Enter — Buy &nbsp;·&nbsp; Esc / B — Leave</div>
          <div style={{ marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              onPointerDown={(e) => e.preventDefault()}
              style={{
                padding: '4px 12px',
                background: 'transparent',
                border: '1px solid var(--gold-3)',
                color: 'var(--bone)',
                fontSize: 10,
                letterSpacing: '0.2em',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', monospace, sans-serif",
              }}
            >
              CLOSE
            </button>
          </div>
        </>
      }
    >
      <div style={{ fontSize: 11, color: 'var(--gold-1)', marginBottom: 6 }}>
        $ {coins} coins
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {wares.map((w, i) => {
          const enabled = w.affordable && w.canAccept;
          const tag = !w.canAccept ? 'FULL' : !w.affordable ? 'NEED COIN' : 'BUY';
          return (
            <button
              key={w.label}
              type="button"
              onClick={() => onBuy(i)}
              disabled={!enabled}
              onPointerDown={(e) => e.preventDefault()}
              style={{
                textAlign: 'left',
                padding: '6px 10px',
                background: i === focus ? 'rgba(244, 210, 122, 0.18)' : 'rgba(0, 0, 0, 0.45)',
                border: `1px solid ${i === focus ? '#f4d27a' : '#3b265c'}`,
                color: enabled ? 'var(--bone)' : 'rgba(231,227,215,0.4)',
                cursor: enabled ? 'pointer' : 'not-allowed',
                letterSpacing: '0.06em',
                fontSize: 12,
                fontFamily: "'Press Start 2P', monospace, sans-serif",
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="gold-text">{w.label}</span>
                <span>$ {w.cost} · {tag}</span>
              </div>
              <div className="help-text" style={{ fontSize: 9, marginTop: 4, fontFamily: 'inherit' }}>
                {w.description}
              </div>
            </button>
          );
        })}
      </div>
    </ModalPanel>
  );
}

interface PuzzlePromptProps {
  target: ('up' | 'down' | 'left' | 'right')[];
  progress: ('up' | 'down' | 'left' | 'right')[];
  failed: boolean;
  isTouch: boolean;
  input?: InputManager | null;
}

const ARROW_GLYPH: Record<'up' | 'down' | 'left' | 'right', string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

function PuzzlePrompt({ target, progress, failed, isTouch, input }: PuzzlePromptProps): JSX.Element {
  const footer = failed
    ? (<span className="crimson-text" style={{ letterSpacing: '0.18em' }}>The sigil shatters. The Abyss takes its tribute.</span>)
    : (<>↑ ↓ ← → — Mark &nbsp;·&nbsp; Esc / B — Step back</>);
  return (
    <ModalPanel
      subtitle="A sigil locks the altar"
      title="Sigil Lock"
      minWidth={360}
      footer={footer}
    >
      <div className="help-text" style={{ fontSize: 11, marginBottom: 8 }}>
        Match the three-mark sequence with the direction keys.
      </div>
      {/* Target row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 10 }}>
        {target.map((dir, i) => (
          <span key={i} style={{
            display: 'inline-block',
            width: 30, height: 30,
            lineHeight: '30px',
            fontSize: 18,
            color: 'var(--gold-1)',
            border: '1px solid var(--gold-3)',
            background: 'rgba(0,0,0,0.5)',
          }}>{ARROW_GLYPH[dir]}</span>
        ))}
      </div>
      {/* Progress row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
        {target.map((_, i) => {
          const entered = progress[i];
          const correct = entered === target[i];
          const colour = failed && entered && !correct ? '#e23a4a'
            : entered ? '#6cf6e5'
            : 'rgba(231,227,215,0.25)';
          return (
            <span key={i} style={{
              display: 'inline-block',
              width: 30, height: 30,
              lineHeight: '30px',
              fontSize: 18,
              color: colour,
              border: `1px solid ${colour}`,
              background: 'rgba(0,0,0,0.5)',
            }}>{entered ? ARROW_GLYPH[entered] : '·'}</span>
          );
        })}
      </div>
      {/* Touch direction pad — only renders on touch input mode. The
       *  buttons fire the engine's uiUp / uiDown / uiLeft / uiRight
       *  flags via setTouchButton, identical to keyboard arrow presses. */}
      {isTouch && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <ModalTapButton input={input} name="uiUp"    label="↑" />
          <div style={{ display: 'flex', gap: 6 }}>
            <ModalTapButton input={input} name="uiLeft"  label="←" />
            <ModalTapButton input={input} name="uiRight" label="→" />
          </div>
          <ModalTapButton input={input} name="uiDown"  label="↓" />
        </div>
      )}
    </ModalPanel>
  );
}
