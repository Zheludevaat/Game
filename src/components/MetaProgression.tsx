import { MetaState } from '../game/GameTypes';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { useMenuNav } from './useMenuNav';

interface Props {
  essence: number;
  meta: MetaState;
  onSpend: (key: keyof MetaState, cost: number, apply: (m: MetaState) => MetaState) => void;
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

export function MetaProgression({ essence, meta, onSpend, onBack }: Props): JSX.Element {
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
        <div style={{ textAlign: 'center' }}>
          <PixelButton onClick={onBack} focused={focus === UPGRADES.length}>Back</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
