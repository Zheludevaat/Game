import { useEffect, useState } from 'react';

const EPIGRAPHS: string[] = [
  '"As above, so below."  — Tabula Smaragdina',
  '"Holy is God, who would be known and is known by his own."  — Corp. Herm. XIII.18',
  '"The flight of the Alone to the Alone."  — Plotinus, Enneads VI.9.11',
  '"What is below is like that which is above."  — Tabula Smaragdina',
  '"Holy art Thou, of whom all Nature is the image."  — Corp. Herm. XIII.19',
  '"It is intellectual contact that bonds the soul to the gods."  — Iamblichus, De Myst. I.12',
  '"First become god-like and beautiful — then thou shalt see God and Beauty."  — Plotinus I.6.9',
  '"I am Poimandres, the Mind of the Sovereignty."  — Corp. Herm. I.2',
];

export function LoadingScreen(): JSX.Element {
  const [idx] = useState(() => Math.floor(Math.random() * EPIGRAPHS.length));
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 380);
    return () => clearInterval(id);
  }, []);
  const ep = EPIGRAPHS[idx];

  return (
    <div className="menu-screen with-bg">
      <div style={{ textAlign: 'center', maxWidth: 560 }}>
        <div className="pixel-subtitle" style={{ marginBottom: 6 }}>An initiate descends</div>
        <h1 className="pixel-title" style={{ fontSize: 38, margin: 0, letterSpacing: '0.18em' }}>
          Abyss of the Seven Lamps
        </h1>
        <div className="loading-lamps" role="presentation" style={{ justifyContent: 'center' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="loading-lamp" />
          ))}
        </div>
        <p style={{
          marginTop: 22,
          fontSize: 12,
          fontStyle: 'italic',
          fontFamily: '"Iowan Old Style","Georgia",serif',
          color: 'var(--bone)',
          opacity: 0.85,
          lineHeight: 1.6,
        }}>
          {ep}
        </p>
        <div style={{ marginTop: 18, fontSize: 11, letterSpacing: '0.3em', color: 'var(--gold-1)' }}>
          PREPARING THE TEMPLE{dots}
        </div>
      </div>
    </div>
  );
}
