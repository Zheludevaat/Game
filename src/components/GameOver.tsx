import { RunSummary } from '../game/GameEngine';
import { RELICS } from '../game/data/relics';
import { WEAPONS } from '../game/data/weapons';
import { SPELLS } from '../game/data/spells';
import { CODEX_BY_ID } from '../game/data/codex';
import { SPHERE_BY_ID, SphereId } from '../game/data/spheres';
import { BOSSES } from '../game/data/bosses';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { useMenuNav } from './useMenuNav';

// Human-readable name for a death-cause string. Bosses pull from
// BOSSES.displayName, regular enemies use the hand-keyed table, and
// the hazard:* / projectile / dot / sigil tokens get prose summaries
// so the "Slain by …" line never says a raw engine identifier.
const ENEMY_NAMES: Record<string, string> = {
  lesserShade: 'a Lesser Shade',
  mercuryImp: 'a Mercury Imp',
  saltGolem: 'a Salt Golem',
  lunarWisp: 'a Lunar Wisp',
  saturnKnight: 'a Saturn Knight',
  serpentOfBrass: 'the Serpent of Brass',
  martyrBeacon: 'a Martyr Beacon',
  umbralStalker: 'an Umbral Stalker',
  mirrorTwin: 'a Mirror Twin',
  kronosianHerald: 'a Kronosian Herald',
  heliokrator: 'the Heliokrator',
  nikethron: 'the Nikethron',
};

function deathCauseLabel(cause: string | undefined, sphereId: SphereId | undefined): string | null {
  if (!cause || cause === 'descend') return null;
  // Boss visualKeys flow first — Wardens get their full title.
  for (const sid of Object.keys(BOSSES) as SphereId[]) {
    if (BOSSES[sid].visualKey === cause) return BOSSES[sid].displayName;
  }
  if (ENEMY_NAMES[cause]) {
    const sphere = sphereId ? SPHERE_BY_ID[sphereId] : null;
    if (sphere) return `${ENEMY_NAMES[cause]} in the Sphere of ${sphere.name}`;
    return ENEMY_NAMES[cause];
  }
  if (cause.startsWith('hazard:')) {
    const kind = cause.slice(7);
    const pretty: Record<string, string> = {
      blade: 'a spinning blade trap',
      solar: 'a solar flare',
      lightning: 'a sigil of lightning',
      vine: 'a thorned root',
    };
    return pretty[kind] ?? 'a sphere hazard';
  }
  if (cause === 'projectile') return 'an enemy projectile';
  if (cause === 'sigil') return 'an enemy sigil';
  if (cause === 'dot') return 'lingering poison and flame';
  return null;
}

interface Props {
  summary: RunSummary;
  bestFloor: number;
  essenceTotal: number;
  onNewRun: () => void;
  onMenu: () => void;
  onCodex: () => void;
}

export function GameOverScreen({ summary, bestFloor, essenceTotal, onNewRun, onMenu, onCodex }: Props): JSX.Element {
  const items = [
    { onActivate: onNewRun },
    { onActivate: onCodex },
    { onActivate: onMenu },
  ];
  const focus = useMenuNav(items, { horizontal: false, onCancel: onMenu });
  const newFragments = summary.codexUnlockedThisRun
    .map((id) => CODEX_BY_ID[id])
    .filter(Boolean);
  const title = summary.ogdoadReached ? 'The Eighth Sphere' : 'The Lamps Dim';
  const subtitle = summary.ogdoadReached ? 'The soul, made bare, returns' : 'The initiate falls — what is learned, remains';
  const slainBy = deathCauseLabel(summary.deathCause, summary.deathSphereId);
  return (
    <div className="menu-screen with-bg">
      <PixelPanel title={title} subtitle={subtitle} width={560}>
        {slainBy && (
          <div
            className="crimson-text"
            style={{
              marginTop: 8, marginBottom: 4,
              fontSize: 12, letterSpacing: '0.16em',
              textAlign: 'center',
            }}
          >
            Slain by {slainBy}
          </div>
        )}
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
        <div style={{ fontSize: 12, letterSpacing: '0.18em', marginBottom: 6 }} className="glow-text">SPHERES VISITED</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {summary.spheresVisited.length === 0 && <span style={{ opacity: 0.6, fontSize: 12 }}>None</span>}
          {summary.spheresVisited.map((id) => {
            const s = SPHERE_BY_ID[id];
            return (
              <div key={id} className="relic-icon" title={`${s.name} — ${s.godName}`} data-name={s.name} style={{ color: s.colour, borderColor: s.colour }}>
                {s.glyph}
              </div>
            );
          })}
        </div>
        <div className="pixel-divider" />
        <div style={{ fontSize: 12, letterSpacing: '0.18em', marginBottom: 6 }} className="violet-text">FRAGMENTS LEARNED THIS DESCENT</div>
        {newFragments.length === 0 ? (
          <div style={{ opacity: 0.6, fontSize: 12 }}>The soul remembered nothing new.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 130, overflowY: 'auto', paddingRight: 4 }}>
            {newFragments.map((f) => (
              <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, letterSpacing: '0.06em' }}>
                <span className="gold-text" style={{ flex: 1 }}>{f.title}</span>
                <span style={{ opacity: 0.65, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{f.source}</span>
              </div>
            ))}
          </div>
        )}
        <div className="pixel-divider" />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <PixelButton onClick={onNewRun} focused={focus === 0}>New Run</PixelButton>
          <PixelButton onClick={onCodex} focused={focus === 1}>Codex</PixelButton>
          <PixelButton onClick={onMenu} focused={focus === 2}>Main Menu</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
