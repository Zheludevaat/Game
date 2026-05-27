import { MetaState } from '../game/GameTypes';
import { ACHIEVEMENTS, ACHIEVEMENT_IDS } from '../game/data/achievements';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { useMenuNav } from './useMenuNav';

interface Props {
  essence: number;
  meta: MetaState;
  onSpend: (key: keyof MetaState, cost: number, apply: (m: MetaState) => MetaState) => void;
  onSetAscension: (level: number) => void;
  onBack: () => void;
}

interface Upgrade {
  label: string;
  description: string;
  cost: (m: MetaState) => number;
  apply: (m: MetaState) => MetaState;
  maxed: (m: MetaState) => boolean;
  key: keyof MetaState;
}

const UPGRADES: Upgrade[] = [
  {
    label: '+10 Max Health',
    description: 'Each rank adds 10 to starting health (max 5 ranks).',
    cost: (m) => 10 + Math.floor(m.bonusMaxHp / 10) * 5,
    apply: (m) => ({ ...m, bonusMaxHp: m.bonusMaxHp + 10 }),
    maxed: (m) => m.bonusMaxHp >= 50,
    key: 'bonusMaxHp',
  },
  {
    label: '+10 Starting Mana',
    description: 'Begin runs with more mana (max 5 ranks).',
    cost: (m) => 8 + Math.floor(m.bonusStartingMp / 10) * 4,
    apply: (m) => ({ ...m, bonusStartingMp: m.bonusStartingMp + 10 }),
    maxed: (m) => m.bonusStartingMp >= 50,
    key: 'bonusStartingMp',
  },
  {
    label: '+10% Essence Gain',
    description: 'All essence pickups yield more (max 5 ranks).',
    cost: (m) => 12 + Math.floor(m.bonusEssenceGain * 10) * 6,
    apply: (m) => ({ ...m, bonusEssenceGain: Math.min(0.5, m.bonusEssenceGain + 0.1) }),
    maxed: (m) => m.bonusEssenceGain >= 0.5,
    key: 'bonusEssenceGain',
  },
  {
    label: 'Cosmetic: Lamp Aura',
    description: 'A subtle aura accompanies your initiate.',
    cost: () => 30,
    apply: (m) => ({ ...m, cosmeticLampAura: true }),
    maxed: (m) => m.cosmeticLampAura,
    key: 'cosmeticLampAura',
  },
];

export function MetaProgression({ essence, meta, onSpend, onSetAscension, onBack }: Props): JSX.Element {
  const items = UPGRADES.map((u) => ({
    onActivate: () => {
      if (u.maxed(meta)) return;
      const cost = u.cost(meta);
      if (essence < cost) return;
      onSpend(u.key, cost, u.apply);
    },
    disabled: u.maxed(meta) || essence < u.cost(meta),
  }));
  const focus = useMenuNav([...items, { onActivate: onBack }], { onCancel: onBack });
  const ascensionMax = Math.min(5, meta.ogdoadReached ?? 0);
  const ascensionLevel = meta.ascensionLevel ?? 0;
  const achievementsOwned = new Set(meta.achievements ?? []);
  const runHistory = (meta.runHistory ?? []).slice(0, 6);

  return (
    <div className="menu-screen with-bg">
      <PixelPanel title="Meta Progression" subtitle="Trade essence for boons" width={520}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span className="gold-text">✦ {essence}</span> Essence
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {UPGRADES.map((u, i) => {
            const maxed = u.maxed(meta);
            const cost = u.cost(meta);
            return (
              <div key={u.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="glow-text" style={{ fontSize: 13 }}>{u.label}</div>
                  <div className="help-text" style={{ fontSize: 10 }}>{u.description}</div>
                </div>
                <PixelButton
                  onClick={() => {
                    if (maxed) return;
                    if (essence < cost) return;
                    onSpend(u.key, cost, u.apply);
                  }}
                  disabled={maxed || essence < cost}
                  focused={focus === i}
                  badge={maxed ? 'MAX' : `✦ ${cost}`}
                  style={{ minWidth: 160 }}
                >
                  {maxed ? 'Acquired' : 'Purchase'}
                </PixelButton>
              </div>
            );
          })}
        </div>
        <div className="pixel-divider" />
        <div style={{ marginBottom: 8 }}>
          <div className="glow-text" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 4 }}>ASCENSION</div>
          <div className="help-text" style={{ fontSize: 10, marginBottom: 6 }}>
            Each tier raises enemy HP +30 % and damage +20 %. Unlocks one tier per Ogdoad clear.
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {[0, 1, 2, 3, 4, 5].map((lvl) => {
              const enemyHpMul = 1 + lvl * 0.30;
              const enemyDmgMul = 1 + lvl * 0.20;
              const tip = lvl === 0
                ? 'Standard difficulty.'
                : `A${lvl} — enemy HP ×${enemyHpMul.toFixed(2)}, enemy damage ×${enemyDmgMul.toFixed(2)}.`;
              return (
                <button
                  key={lvl}
                  type="button"
                  title={tip}
                  onClick={() => { if (lvl <= ascensionMax) onSetAscension(lvl); }}
                  disabled={lvl > ascensionMax}
                  className={lvl === ascensionLevel ? 'pixel-tag selected' : 'pixel-tag'}
                  style={{
                    background: lvl === ascensionLevel ? 'var(--gold-1)' : 'transparent',
                    color: lvl === ascensionLevel ? '#0d0717' : (lvl > ascensionMax ? 'rgba(255,255,255,0.25)' : 'var(--bone)'),
                    border: '1px solid var(--gold-3)',
                    padding: '3px 8px',
                    cursor: lvl > ascensionMax ? 'not-allowed' : 'pointer',
                    fontSize: 10,
                    letterSpacing: '0.2em',
                  }}
                >
                  {lvl === 0 ? 'OFF' : `A${lvl}`}
                </button>
              );
            })}
          </div>
          <div className="help-text" style={{ fontSize: 9, textAlign: 'center', marginTop: 6, opacity: 0.85 }}>
            {(() => {
              if (ascensionLevel === 0) return 'Standard difficulty.';
              const enemyHpMul = 1 + ascensionLevel * 0.30;
              const enemyDmgMul = 1 + ascensionLevel * 0.20;
              return `A${ascensionLevel} active — enemy HP ×${enemyHpMul.toFixed(2)}, enemy damage ×${enemyDmgMul.toFixed(2)}.`;
            })()}
          </div>
        </div>
        <div className="pixel-divider" />
        <div style={{ marginBottom: 8 }}>
          <div className="glow-text" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 6 }}>ACHIEVEMENTS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {ACHIEVEMENT_IDS.map((id) => {
              const a = ACHIEVEMENTS[id];
              const got = achievementsOwned.has(id);
              return (
                <div
                  key={id}
                  title={a.description}
                  style={{
                    padding: 6,
                    border: '1px solid var(--gold-3)',
                    background: got ? 'rgba(244,210,122,0.15)' : 'rgba(0,0,0,0.35)',
                    opacity: got ? 1 : 0.55,
                    fontSize: 10,
                    lineHeight: 1.25,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className={got ? 'gold-text' : ''}>{a.glyph} {a.name}</span>
                    <span style={{ opacity: 0.5 }}>T{a.tier}</span>
                  </div>
                  <div className="help-text" style={{ fontSize: 9, marginTop: 2 }}>{a.description}</div>
                </div>
              );
            })}
          </div>
        </div>
        {runHistory.length > 0 && (
          <>
            <div className="pixel-divider" />
            <div style={{ marginBottom: 8 }}>
              <div className="glow-text" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 6 }}>RECENT RUNS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10 }}>
                {runHistory.map((r) => (
                  <div key={r.date} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
                    <span>{r.archetype.padEnd(7)}</span>
                    <span>Fl {r.floorReached}</span>
                    <span>{r.bossesDefeated} ✦</span>
                    <span>{r.essenceCollected} essence</span>
                    {r.ascensionLevel > 0 && <span className="gold-text">A{r.ascensionLevel}</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {(meta.dailyHistory ?? []).length > 0 && (
          <>
            <div className="pixel-divider" />
            <div style={{ marginBottom: 8 }}>
              <div className="glow-text" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 6 }}>DAILY RUN RECORD</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10 }}>
                {(meta.dailyHistory ?? []).slice(0, 8).map((r) => (
                  <div key={r.date} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
                    <span>{new Date(r.date).toISOString().slice(0, 10)}</span>
                    <span>{r.archetype.padEnd(7)}</span>
                    <span>Fl {r.floorReached}</span>
                    <span className="gold-text">{r.score}</span>
                    {r.ogdoadReached && <span className="gold-text">✦CLEAR</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="pixel-divider" />
        <div style={{ textAlign: 'center' }}>
          <PixelButton onClick={onBack} focused={focus === UPGRADES.length}>Back</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
