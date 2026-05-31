import { DebugSnapshot } from '../game/GameTypes';

export function DebugOverlay({ snapshot }: { snapshot: DebugSnapshot | null }): JSX.Element | null {
  if (!snapshot) return null;
  return (
    <aside className="debug-overlay" aria-label="Debug overlay">
      <div>FPS {snapshot.fps.toFixed(0)}</div>
      <div>Frame {snapshot.frameMs.toFixed(1)}ms</div>
      <div>Floor {snapshot.floor}</div>
      <div>Room {snapshot.roomType}</div>
      <div>Enemies {snapshot.enemies}</div>
      <div>Particles {snapshot.particles}</div>
      {snapshot.audio && <div>Audio {snapshot.audio.activeCue ?? 'none'} {snapshot.audio.clipping ? 'CLIP' : 'OK'}</div>}
    </aside>
  );
}
