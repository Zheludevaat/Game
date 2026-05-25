export function LoadingScreen(): JSX.Element {
  return (
    <div className="menu-screen with-bg">
      <div style={{ textAlign: 'center' }}>
        <div className="pixel-subtitle" style={{ marginBottom: 6 }}>An initiate descends</div>
        <h1 className="pixel-title" style={{ fontSize: 38, margin: 0, letterSpacing: '0.18em' }}>
          Abyss of the Seven Lamps
        </h1>
        <div className="loading-lamps" role="presentation" style={{ justifyContent: 'center' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="loading-lamp" />
          ))}
        </div>
        <div style={{ marginTop: 24, fontSize: 12, letterSpacing: '0.3em', color: 'var(--gold-1)' }}>
          PREPARING THE TEMPLE…
        </div>
      </div>
    </div>
  );
}
