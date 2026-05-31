import { useState } from 'react';
import { DebugSnapshot } from '../game/GameTypes';
import { SpritePreview } from './SpritePreview';

export function DebugOverlay({ snapshot }: { snapshot: DebugSnapshot | null }): JSX.Element | null {
  const [showSprites, setShowSprites] = useState(false);

  if (!snapshot) return null;

  if (showSprites) return <SpritePreview onClose={() => setShowSprites(false)} />;

  return (
    <aside className="debug-overlay" aria-label="Debug overlay">
      <div>FPS {snapshot.fps.toFixed(0)}</div>
      <div>Frame {snapshot.frameMs.toFixed(1)}ms</div>
      <div>Floor {snapshot.floor}</div>
      <div>Room {snapshot.roomType}</div>
      <div>Enemies {snapshot.enemies}</div>
      <div>Particles {snapshot.particles}</div>
      {snapshot.audio && <div>Audio {snapshot.audio.activeCue ?? 'none'} {snapshot.audio.clipping ? 'CLIP' : 'OK'}</div>}
      <button
        type="button"
        onClick={() => setShowSprites(true)}
        style={{
          marginTop: 8, padding: '3px 8px',
          background: '#1a1124', color: '#888', border: '1px solid #3d2273',
          fontFamily: 'monospace', fontSize: 10, cursor: 'pointer',
        }}
      >
        Sprites
      </button>
    </aside>
  );
}
