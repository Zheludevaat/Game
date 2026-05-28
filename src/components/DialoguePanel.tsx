interface Props {
  speaker: string;
  text: string;
  onAdvance: () => void;
  choices?: { label: string; onChoose: () => void }[];
}

export function DialoguePanel({ speaker, text, onAdvance, choices }: Props): JSX.Element {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 8,
      pointerEvents: 'auto',
    }}>
      <div style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.85))',
        padding: '14px 24px',
        borderTop: '1px solid var(--gold-3)',
      }}>
        <div style={{
          fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase',
          color: 'var(--teal)', marginBottom: 4,
        }}>{speaker}</div>
        <div style={{
          fontFamily: '"Iowan Old Style", "Georgia", serif',
          fontSize: 14, lineHeight: 1.5, color: 'var(--bone)',
        }}>{text}</div>
        {choices && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {choices.map((c, i) => (
              <button key={i} onClick={c.onChoose} style={{
                padding: '6px 14px', border: '1px solid var(--gold-3)',
                background: 'rgba(20,12,38,0.8)', color: 'var(--gold-1)',
                fontFamily: 'inherit', fontSize: 11, cursor: 'pointer',
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>{c.label}</button>
            ))}
          </div>
        )}
        {!choices && (
          <div style={{ marginTop: 6, fontSize: 9, opacity: 0.4, letterSpacing: '0.2em' }}>
            Interact / Enter — continue
          </div>
        )}
      </div>
    </div>
  );
}
