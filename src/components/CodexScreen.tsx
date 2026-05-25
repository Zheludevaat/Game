import { useMemo, useState } from 'react';
import {
  CODEX, CHAPTER_ORDER, CHAPTER_TITLES, CHAPTER_SUBTITLES,
  CodexChapter, CodexEntry,
} from '../game/data/codex';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';

interface Props {
  unlocked: string[];
  onBack: () => void;
  /** Optional: highlight these ids with a "NEW" badge */
  newIds?: string[];
}

export function CodexScreen({ unlocked, onBack, newIds }: Props): JSX.Element {
  const unlockedSet = useMemo(() => new Set(unlocked), [unlocked]);
  const newSet = useMemo(() => new Set(newIds ?? []), [newIds]);

  const [chapter, setChapter] = useState<CodexChapter>('awakening');
  const [openId, setOpenId] = useState<string | null>(null);

  const entriesByChapter = useMemo(() => {
    const m = new Map<CodexChapter, CodexEntry[]>();
    for (const ch of CHAPTER_ORDER) m.set(ch, []);
    for (const e of CODEX) m.get(e.chapter)!.push(e);
    return m;
  }, []);

  const totalUnlocked = unlocked.length;
  const totalEntries = CODEX.length;

  const chapterEntries = entriesByChapter.get(chapter) ?? [];
  const openEntry = openId ? CODEX.find((e) => e.id === openId) ?? null : null;
  const openIsUnlocked = openEntry ? unlockedSet.has(openEntry.id) : false;

  return (
    <div className="menu-screen with-bg" style={{ overflow: 'hidden' }}>
      <PixelPanel
        title="Codex Hermeticum"
        subtitle={`The remembered fragments — ${totalUnlocked} / ${totalEntries} known`}
        width={Math.min(880, window.innerWidth - 48)}
      >
        <div className="codex-layout">
          {/* Chapter sidebar */}
          <div className="codex-chapters">
            {CHAPTER_ORDER.map((ch) => {
              const list = entriesByChapter.get(ch)!;
              const u = list.filter((e) => unlockedSet.has(e.id)).length;
              const newCount = list.filter((e) => newSet.has(e.id)).length;
              const active = ch === chapter;
              return (
                <button
                  key={ch}
                  type="button"
                  className={'codex-chapter-btn' + (active ? ' active' : '')}
                  onClick={() => { setChapter(ch); setOpenId(null); }}
                >
                  <span className="codex-chapter-title">{CHAPTER_TITLES[ch]}</span>
                  <span className="codex-chapter-meta">
                    {u} / {list.length}
                    {newCount > 0 && <span className="codex-new-badge">NEW</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Entry list + preview */}
          <div className="codex-main">
            <div className="codex-chapter-header">
              <div className="pixel-subtitle">{CHAPTER_SUBTITLES[chapter]}</div>
              <h3 className="pixel-title" style={{ fontSize: 20, margin: '4px 0' }}>{CHAPTER_TITLES[chapter]}</h3>
            </div>
            <div className="codex-entries">
              {chapterEntries.map((e) => {
                const unlocked = unlockedSet.has(e.id);
                const isNew = newSet.has(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={'codex-entry-row' + (openId === e.id ? ' active' : '')}
                    onClick={() => unlocked && setOpenId(e.id)}
                    disabled={!unlocked}
                    aria-disabled={!unlocked}
                  >
                    <span className="codex-entry-title">
                      {unlocked ? e.title : '— Unknown Fragment —'}
                    </span>
                    <span className="codex-entry-meta">
                      {isNew && <span className="codex-new-badge">NEW</span>}
                      {unlocked
                        ? <span className="codex-entry-source">{e.source}</span>
                        : <span className="codex-entry-hint">{hintFor(e)}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="codex-preview">
              {openEntry && openIsUnlocked ? (
                <>
                  <div className="pixel-subtitle">{openEntry.source}</div>
                  <h4 className="pixel-title" style={{ fontSize: 18, margin: '4px 0 10px' }}>{openEntry.title}</h4>
                  <p className="codex-body">{openEntry.text}</p>
                </>
              ) : (
                <div className="codex-empty">
                  <p style={{ opacity: 0.7, fontSize: 12, letterSpacing: '0.1em' }}>
                    {chapterEntries.some((e) => unlockedSet.has(e.id))
                      ? 'Select an unlocked fragment to read.'
                      : 'No fragments yet remembered from this chapter. Descend, surrender, return.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <PixelButton onClick={onBack}>Back</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}

function hintFor(e: CodexEntry): string {
  switch (e.unlock.kind) {
    case 'opening':       return 'Revealed upon awakening.';
    case 'firstFloor':    return 'Revealed at the threshold of the abyss.';
    case 'sphereReached': return `Revealed upon entering the ${prettySphere(e.unlock.sphere)}.`;
    case 'sphereBoss':    return `Revealed by overcoming the ${prettySphere(e.unlock.sphere)}'s Warden.`;
    case 'shrine':        return `Revealed by communing at the Shrine of ${e.unlock.shrineKind}.`;
    case 'victory':       return e.unlock.minVictories && e.unlock.minVictories > 1
                            ? `Revealed after ${e.unlock.minVictories} Wardens have fallen.`
                            : 'Revealed in the Eighth Sphere.';
    case 'death':         return 'Revealed by the soul\'s first dissolution.';
    default:              return 'Unrevealed.';
  }
}

function prettySphere(s?: string): string {
  if (!s) return 'sphere';
  const map: Record<string, string> = {
    moon: 'Sphere of the Moon',
    mercury: 'Sphere of Mercury',
    venus: 'Sphere of Venus',
    sun: 'Sphere of the Sun',
    mars: 'Sphere of Mars',
    jupiter: 'Sphere of Jupiter',
    saturn: 'Sphere of Saturn',
    ogdoad: 'Ogdoad',
  };
  return map[s] ?? s;
}
