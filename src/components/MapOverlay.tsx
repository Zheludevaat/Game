import { HudSnapshot } from '../game/GameEngine';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { useGamepadButtons } from './useGamepadButtons';

interface Props { hud: HudSnapshot; onClose: () => void; }

export function MapOverlay({ hud, onClose }: Props): JSX.Element {
  useGamepadButtons({ onA: onClose, onB: onClose, onStart: onClose, onSelect: onClose });
  const xs = hud.rooms.map((r) => r.gx);
  const ys = hud.rooms.map((r) => r.gy);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const cell = 24;
  const w = (maxX - minX + 1) * (cell + 2);
  const h = (maxY - minY + 1) * (cell + 2);
  return (
    <div className="menu-screen with-bg">
      <PixelPanel title={`Floor ${hud.floor} Map`} subtitle={hud.roomName} width={Math.min(720, Math.max(360, w + 60))}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 14, position: 'relative' }}>
          <div style={{ position: 'relative', width: w, height: h }}>
            {hud.rooms.map((r) => {
              if (!r.discovered) return null;
              return (
                <div key={`${r.gx},${r.gy}`} style={{
                  position: 'absolute',
                  left: (r.gx - minX) * (cell + 2),
                  top: (r.gy - minY) * (cell + 2),
                  width: cell, height: cell,
                  background: colourForRoom(r.type, r.current),
                  border: r.current ? '2px solid #fff' : '1px solid #221636',
                  boxShadow: r.current ? '0 0 14px rgba(244,210,122,0.7)' : 'none',
                }} />
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 11, flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#6cf6e5', marginRight: 4 }} />Start</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f4d27a', marginRight: 4 }} />Treasure</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#9b6cff', marginRight: 4 }} />Shrine</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#e23a4a', marginRight: 4 }} />Locked</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#a4faf0', marginRight: 4 }} />Exit</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ff7a5a', marginRight: 4 }} />Mini-Boss</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ff3a4a', marginRight: 4 }} />Boss</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <PixelButton onClick={onClose}>Close</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}

function colourForRoom(type: HudSnapshot['rooms'][number]['type'], current: boolean): string {
  if (current) return '#f4d27a';
  switch (type) {
    case 'start': return '#6cf6e5';
    case 'treasure': return '#f4d27a';
    case 'shrine': return '#9b6cff';
    case 'locked': return '#e23a4a';
    case 'exit': return '#a4faf0';
    case 'miniBoss': return '#ff7a5a';
    case 'boss': return '#ff3a4a';
    case 'sanctuary': return '#6cf6e5';
    default: return '#3b265c';
  }
}
