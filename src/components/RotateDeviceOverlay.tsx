export function RotateDeviceOverlay(): JSX.Element {
  return (
    <div className="rotate-overlay">
      <div className="glyph">⟳</div>
      <h2 className="pixel-title" style={{ fontSize: 24 }}>Rotate Device</h2>
      <div className="help-text" style={{ marginTop: 6, maxWidth: 280 }}>
        Abyss of the Seven Lamps is designed for landscape orientation. Please rotate your device sideways.
      </div>
    </div>
  );
}
