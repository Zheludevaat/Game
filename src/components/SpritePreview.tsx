// SpritePreview — dev-only visual reference for all cinematic sprites.
//
// Renders each sprite at 1x, 2x, 4x, 8x with palette info.
// Accessible from the DebugOverlay (Shift+Backquote → "Sprites").
// Not bundled in production — guarded behind the debug visibility gate.

import { useEffect, useRef, useState } from 'react';
import {
  drawInitiateProfile,
  drawInitiateFace,
  drawStoneArch,
  drawDistantLamp,
  drawInitiateHeroic,
  drawHandsDagger,
  drawInitiateFalling,
  drawOgdoadGlyph,
  drawInitiateLookingUp,
} from '../game/rendering/cinematicSprites';

interface SpriteEntry {
  name: string;
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => void;
  nativeW: number;
  nativeH: number;
}

const SCALES = [1, 2, 4, 8];

const SPRITES: SpriteEntry[] = [
  { name: 'Initiate Profile (walk)', draw: (c, x, y, s) => drawInitiateProfile(c, x, y, s, 0, false, 'cosmic'), nativeW: 16, nativeH: 26 },
  { name: 'Initiate Face (close-up)', draw: (c, x, y, s) => drawInitiateFace(c, x, y, s, 0.6, 'cosmic'), nativeW: 28, nativeH: 28 },
  { name: 'Initiate Heroic', draw: (c, x, y, s) => drawInitiateHeroic(c, x, y, s, 0.6, 'cosmic'), nativeW: 22, nativeH: 30 },
  { name: 'Initiate Falling', draw: (c, x, y, s) => drawInitiateFalling(c, x, y, s, 0, 'cosmic'), nativeW: 14, nativeH: 22 },
  { name: 'Initiate Looking Up', draw: (c, x, y, s) => drawInitiateLookingUp(c, x, y, s, 0.5, 'cosmic'), nativeW: 14, nativeH: 22 },
  { name: 'Ogdoad Glyph', draw: (c, x, y, s) => drawOgdoadGlyph(c, x, y, s, 0.85, 0), nativeW: 48, nativeH: 48 },
  { name: 'Stone Arch', draw: (c, x, y, s) => drawStoneArch(c, x, y + 18 * s, s, 'gold'), nativeW: 28, nativeH: 36 },
  { name: 'Distant Lamp', draw: (c, x, y, s) => drawDistantLamp(c, x, y, 1, 0.85), nativeW: 24, nativeH: 22 },
  { name: 'Hands + Dagger', draw: (c, x, y, s) => drawHandsDagger(c, x, y, s), nativeW: 22, nativeH: 14 },
];

interface Props {
  onClose: () => void;
}

export function SpritePreview({ onClose }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bgMode, setBgMode] = useState<'black' | 'dark' | 'bright'>('dark');
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = 960, H = SPRITES.length * 130 + 40;
    c.width = Math.floor(W * dpr); c.height = Math.floor(H * dpr);
    c.style.width = `${W}px`; c.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    const bg = bgMode === 'black' ? '#000' : bgMode === 'bright' ? '#444' : '#111';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const colW = 220;
    const gutter = 20;
    const startX = gutter;

    ctx.font = '11px monospace';
    ctx.textBaseline = 'top';

    SPRITES.forEach((sprite, si) => {
      const rowY = si * 130 + gutter + 16;
      const maxNative = Math.max(sprite.nativeW, sprite.nativeH);

      SCALES.forEach((scale, sci) => {
        const colX = startX + sci * colW;
        const cx = colX + 90;
        const cy = rowY + 40;

        // Grid
        if (showGrid) {
          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          ctx.lineWidth = 0.5;
          for (let gx = colX; gx < colX + colW - gutter; gx += scale) {
            ctx.beginPath();
            ctx.moveTo(gx, rowY);
            ctx.lineTo(gx, rowY + 90);
            ctx.stroke();
          }
          for (let gy = rowY; gy < rowY + 90; gy += scale) {
            ctx.beginPath();
            ctx.moveTo(colX, gy);
            ctx.lineTo(colX + colW - gutter, gy);
            ctx.stroke();
          }
        }

        // Draw sprite centred
        ctx.save();
        ctx.translate(cx, cy);
        sprite.draw(ctx, -(sprite.nativeW * scale) / 2, -(sprite.nativeH * scale) / 2, scale);
        ctx.restore();

        // Label
        ctx.fillStyle = '#888';
        ctx.fillText(`${scale}x (${sprite.nativeW * scale}x${sprite.nativeH * scale})`, colX, rowY + 94);
      });

      // Sprite name
      ctx.fillStyle = '#f4d27a';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(sprite.name, startX, si * 130 + gutter);
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.fillText(`native ${sprite.nativeW}x${sprite.nativeH}`, startX + 180, si * 130 + gutter + 1);
    });

  }, [bgMode, showGrid]);

  // Keyboard: Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.92)',
      overflow: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#f4d27a', fontWeight: 'bold', fontSize: 14 }}>Sprite Preview</span>
        <button type="button" onClick={() => setBgMode('black')} style={btnStyle(bgMode === 'black')}>Bg: Black</button>
        <button type="button" onClick={() => setBgMode('dark')} style={btnStyle(bgMode === 'dark')}>Bg: Dark</button>
        <button type="button" onClick={() => setBgMode('bright')} style={btnStyle(bgMode === 'bright')}>Bg: Bright</button>
        <button type="button" onClick={() => setShowGrid(!showGrid)} style={btnStyle(showGrid)}>Grid</button>
        <button type="button" onClick={onClose} style={{ ...btnStyle(false), marginLeft: 'auto' }}>Close (Esc)</button>
      </div>
      <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto', imageRendering: 'pixelated' }} />
    </div>
  );
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 10px',
    background: active ? '#3d2273' : '#1a1124',
    color: active ? '#f4d27a' : '#888',
    border: '1px solid #3d2273',
    fontFamily: 'monospace',
    fontSize: 11,
    cursor: 'pointer',
  };
}
