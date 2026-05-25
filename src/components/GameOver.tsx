import { RunSummary } from '../game/GameEngine';
import { RELICS } from '../game/data/relics';
import { WEAPONS } from '../game/data/weapons';
import { SPELLS } from '../game/data/spells';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { useMenuNav } from './useMenuNav';

interface Props {
  summary: RunSummary;
  bestFloor: number;
  essenceTotal: number;
  onNewRun: () => void;
  onMenu: () => void;
}

export function GameOverScreen({ summary, bestFloor, essenceTotal, onNewRun, onMenu }: Props): JSX.Element {
  const items = [
    { onActivate: onNewRun },
    { onActivate: onMenu },
  ];
  const focus = useMenuNav(items, { horizontal: false, onCancel: onMenu });
  return (
    <div className="menu-screen with-bg">
      <PixelPanel title="The Lamps Dim" subtitle="The initiate falls" width={520}>
        <div className="gameover-grid" style={{ marginTop: 8 }}>
          <span className="stat-name">Archetype</span><span className="stat-value">{summary.archetype.name}</span>
          <span className="stat-name">Floor Reached</span><span className="stat-value">{summary.floorReached}</span>
          <span className="stat-name">Rooms Cleared</span><span className="stat-value">{summary.roomsCleared}</span>
          <span className="stat-name">Enemies Defeated</span><span className="stat-value">{summary.enemiesDefeated}</span>
          <span className="stat-name">Bosses Defeated</span><span className="stat-value">{summary.bossesDefeated}</span>
          <span className="stat-name">Essence Collected</span><span className="stat-value">{summary.essenceCollected}</span>
          <span className="stat-name">Coins Collected</span><span className="stat-value">{summary.coinsCollected}</span>
        </div>
        <div className="pixel-divider" />
        <div style={{ fontSize: 12, letterSpacing: '0.18em', marginBottom: 6 }} className="glow-text">WEAPONS WIELDED</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {summary.weaponsFound.length === 0 && <span style={{ opacity: 0.6, fontSize: 12 }}>None</span>}
          {summary.weaponsFound.map((id) => (
            <div key={id} className="relic-icon" data-name={WEAPONS[id].name} title={WEAPONS[id].name}>
              {WEAPONS[id].glyph}
            </div>
          ))}
        </div>
        <div className="pixel-divider" />
        <div style={{ fontSize: 12, letterSpacing: '0.18em', marginBottom: 6 }} className="violet-text">SPELLS LEARNED</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {summary.spellsFound.length === 0 && <span style={{ opacity: 0.6, fontSize: 12 }}>None</span>}
          {summary.spellsFound.map((id) => (
            <div key={id} className="relic-icon" data-name={SPELLS[id].name} title={SPELLS[id].name}>
              {SPELLS[id].glyph}
            </div>
          ))}
        </div>
        <div className="pixel-divider" />
        <div style={{ fontSize: 12, letterSpacing: '0.18em', marginBottom: 6 }} className="glow-text">RELICS FOUND</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {summary.relicsFound.length === 0 && <span style={{ opacity: 0.6, fontSize: 12 }}>None</span>}
          {summary.relicsFound.map((id) => (
            <div key={id} className="relic-icon" data-name={RELICS[id].name} title={RELICS[id].name}>
              {RELICS[id].glyph}
            </div>
          ))}
        </div>
        <div className="pixel-divider" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, letterSpacing: '0.2em' }}>
          <span>Best Floor: <span className="gold-text">{bestFloor}</span></span>
          <span>Total Essence: <span className="gold-text">{essenceTotal}</span></span>
        </div>
        <div className="pixel-divider" />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <PixelButton onClick={onNewRun} focused={focus === 0}>New Run</PixelButton>
          <PixelButton onClick={onMenu} focused={focus === 1}>Main Menu</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
