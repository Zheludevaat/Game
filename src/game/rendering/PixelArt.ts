import { PALETTE } from '../constants';

export type PixelMatrix = string[]; // each string is a row, characters reference palette key

// Draws a string-based sprite to a context at (x,y) with scale.
// `palette` maps single characters in `rows` to CSS colour strings (or null for transparent).
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  rows: PixelMatrix,
  palette: Record<string, string | null>,
  x: number,
  y: number,
  scale = 1,
  flipX = false
): void {
  const h = rows.length;
  if (!h) return;
  const w = rows[0].length;
  ctx.save();
  if (flipX) {
    ctx.translate(x + w * scale, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }
  for (let j = 0; j < h; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      const col = palette[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(i * scale, j * scale, scale, scale);
    }
  }
  ctx.restore();
}

// --- Procedural sprites -----------------------------------------------------

const initiate: PixelMatrix = [
  '...gggg...',
  '..ghhhhg..',
  '.ghefefhg.',
  '.ghhhhhhg.',
  '..gccccg..',
  '.gcccccccg',
  'gccccccccg',
  'gcccwwcccg',
  '.gcccccg..',
  '.bb....bb.',
];

const initiatePalette: Record<string, string | null> = {
  '.': null,
  g: '#2a1b66',
  h: '#0a0420',
  c: '#3a2370',
  e: '#6cf6e5',
  f: '#0a0420',
  w: '#f4d27a',
  b: '#1a0b2c',
};

export function drawInitiate(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
  facing: { x: number; y: number },
  walkPhase: number,
  flash: number
): void {
  const flipX = facing.x < 0;
  const pal = { ...initiatePalette };
  if (flash > 0) {
    pal.g = '#ffffff'; pal.c = '#ffffff'; pal.h = '#ffffff'; pal.b = '#ffffff';
  }
  // Step bounce
  const bob = Math.floor(Math.abs(Math.sin(walkPhase)) * 1.5);
  drawSprite(ctx, initiate, pal, Math.floor(x), Math.floor(y - bob), scale, flipX);
  // Eye glow facing
  if (flash <= 0) {
    ctx.fillStyle = '#a4faf0';
    const ex = flipX ? x + (initiate[0].length - 4) * scale : x + 3 * scale;
    ctx.fillRect(Math.floor(ex), Math.floor(y - bob + 2 * scale), scale, scale);
  }
}

// Generic enemy shape (drawn from a definition)
export interface EnemyVisual {
  rows: PixelMatrix;
  palette: Record<string, string | null>;
  flashColour?: string;
}

export const ENEMY_VISUALS: Record<string, EnemyVisual> = {
  lesserShade: {
    rows: [
      '..gggg..',
      '.gddddg.',
      'gdddddrg',
      'gdrddrdg',
      'gddddddg',
      'gddwddwg',
      '.gddddg.',
      '..gffg..',
    ],
    palette: {
      '.': null,
      g: '#0a0420',
      d: '#2a1450',
      r: '#e23a4a',
      w: '#6cf6e5',
      f: '#1a0824',
    },
  },
  mercuryImp: {
    rows: [
      '..g..g..',
      '.gtgtgt.',
      'gttttttg',
      'gtwtttwg',
      'gttttttg',
      '.gttttg.',
      '..g..g..',
    ],
    palette: {
      '.': null,
      g: '#0a2030',
      t: '#6cf6e5',
      w: '#ffffff',
    },
  },
  saltGolem: {
    rows: [
      'gggggggggg',
      'gwwwwwwwwg',
      'gwddwwddwg',
      'gwwwwwwwwg',
      'gwwwggwwwg',
      'gggggggggg',
      'gwwwggwwwg',
      'gwwwggwwwg',
      'gggggggggg',
    ],
    palette: {
      '.': null,
      g: '#3b3a55',
      w: '#cdd6dc',
      d: '#0a0420',
    },
  },
  lunarWisp: {
    rows: [
      '..vvvv..',
      '.vbbbbv.',
      'vbwwwwbv',
      'vbwbbwbv',
      'vbwwwwbv',
      '.vbbbbv.',
      '..vvvv..',
    ],
    palette: {
      '.': null,
      v: '#9b6cff',
      b: '#3a1d70',
      w: '#f5efd8',
    },
  },
  saturnKnight: {
    rows: [
      '..gggg..',
      '.gkkkkg.',
      'gkrkkrkg',
      'gkkkkkkg',
      'gkggggkg',
      'gkgkkgkg',
      'gkggggkg',
      'gkk..kkg',
      '.gg..gg.',
    ],
    palette: {
      '.': null,
      g: '#2a1b66',
      k: '#0a0420',
      r: '#e23a4a',
    },
  },
  serpentOfBrass: {
    rows: [
      '....gggg......',
      '...gbbbbg.....',
      'g.gbywywbg...g',
      'gggbbbbbbgggg.',
      'gbbbbbbbbbbg..',
      '.gbbbbbbbbg...',
      '..gbbbbbbg....',
      '...gbbbbg.....',
      '....gggg......',
    ],
    palette: {
      '.': null,
      g: '#3a2410',
      b: '#c8983f',
      y: '#f4d27a',
      w: '#e23a4a',
    },
  },
  wardenBoss: {
    rows: [
      '.......gggg.......',
      '......gffffg......',
      '.....gfwwwwfg.....',
      '....gfwggggwfg....',
      '...gfwgrrrrgwfg...',
      '..gfwgrwwwwrgwfg..',
      '.gfwgrwGGGGwrgwfg.',
      'gfwgrwGyyGGwrgwfg.',
      'gfwgrwGyyGGwrgwfg.',
      'gfwgrwGGGGGGwrgwf.',
      '.gfwgrwwwwwwrgwfg.',
      '..gfwgrrrrrrgwfg..',
      '...gfwggggggwfg...',
      '....gfwwwwwwfg....',
      '.....gfffffffg....',
      '......gggggg......',
    ],
    palette: {
      '.': null,
      g: '#0a0420',
      f: '#3a2380',
      w: '#9b6cff',
      r: '#e23a4a',
      G: '#f4d27a',
      y: '#ffe6a3',
    },
  },
};

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  visualKey: string,
  x: number, y: number,
  scale: number,
  flash: number,
  flipX = false
): void {
  const vis = ENEMY_VISUALS[visualKey];
  if (!vis) return;
  const pal = { ...vis.palette };
  if (flash > 0) {
    for (const k of Object.keys(pal)) {
      if (pal[k]) pal[k] = '#ffffff';
    }
  }
  drawSprite(ctx, vis.rows, pal, Math.floor(x), Math.floor(y), scale, flipX);
}

// --- Tile rendering ---------------------------------------------------------

export function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  seed: number,
): void {
  // base
  ctx.fillStyle = (seed % 7 === 0) ? PALETTE.floor2 : PALETTE.floor;
  ctx.fillRect(x, y, size, size);
  // grout
  ctx.fillStyle = PALETTE.floorCrack;
  ctx.fillRect(x, y, size, 1);
  ctx.fillRect(x, y, 1, size);
  // occasional crack
  if (seed % 13 === 0) {
    ctx.fillStyle = PALETTE.floorCrack;
    ctx.fillRect(x + 4, y + 6, 4, 1);
    ctx.fillRect(x + 6, y + 7, 3, 1);
  }
  // occasional gold inlay
  if (seed % 31 === 0) {
    ctx.fillStyle = PALETTE.gold3;
    ctx.fillRect(x + size / 2 - 1, y + size / 2 - 1, 2, 2);
  }
}

export function drawWallTile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  topEdge: boolean,
): void {
  ctx.fillStyle = PALETTE.wallDark;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  if (topEdge) {
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(x, y, size, 3);
  }
  // brick lines
  ctx.fillStyle = PALETTE.wallDark;
  ctx.fillRect(x + size / 2, y + 1, 1, size / 2 - 1);
  ctx.fillRect(x, y + size / 2, size, 1);
}

export function drawTorch(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, t: number,
): void {
  // bracket
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x, y, 4, 8);
  // flame
  const flicker = Math.sin(t * 6 + x * 0.3) * 1.2;
  ctx.fillStyle = 'rgba(244, 210, 122, 0.6)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y - 4, 4 + Math.abs(flicker), 7 + Math.abs(flicker), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe6a3';
  ctx.beginPath();
  ctx.ellipse(x + 2, y - 4, 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 1, y - 4, 2, 2);
}

export function drawChest(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, opened: boolean, locked: boolean,
): void {
  ctx.fillStyle = '#3a2310';
  ctx.fillRect(x, y + 4, 18, 12);
  ctx.fillStyle = '#7a5a1a';
  ctx.fillRect(x + 1, y + 5, 16, 10);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(x, y + 4, 18, 2);
  if (!opened) {
    ctx.fillStyle = '#3a2310';
    ctx.fillRect(x + 8, y + 9, 2, 3);
    ctx.fillStyle = locked ? '#e23a4a' : '#f4d27a';
    ctx.fillRect(x + 7, y + 8, 4, 2);
  } else {
    ctx.fillStyle = '#0a0420';
    ctx.fillRect(x + 1, y + 5, 16, 4);
    ctx.fillStyle = '#f4d27a';
    ctx.fillRect(x + 4, y + 2, 10, 2);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffe6a3';
    ctx.fillRect(x + 2, y, 14, 4);
    ctx.globalAlpha = 1;
  }
}

export function drawShrine(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, used: boolean, t: number,
): void {
  // base
  ctx.fillStyle = '#2a1b3a';
  ctx.fillRect(x - 8, y + 6, 20, 8);
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x - 6, y + 4, 16, 4);
  // column
  ctx.fillStyle = '#5b3a86';
  ctx.fillRect(x - 4, y - 8, 12, 14);
  ctx.fillStyle = '#221636';
  ctx.fillRect(x - 4, y - 8, 1, 14);
  // flame / orb on top
  if (!used) {
    const flicker = Math.sin(t * 5) * 2;
    ctx.fillStyle = 'rgba(108,246,229,0.7)';
    ctx.beginPath();
    ctx.arc(x + 2, y - 14, 6 + flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a4faf0';
    ctx.beginPath();
    ctx.arc(x + 2, y - 14, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 1, y - 15, 2, 2);
  } else {
    ctx.fillStyle = '#0a0420';
    ctx.fillRect(x - 2, y - 12, 8, 4);
  }
}

export function drawStairs(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, t: number,
): void {
  // glow
  const g = ctx.createRadialGradient(x + 12, y + 12, 2, x + 12, y + 12, 36);
  g.addColorStop(0, 'rgba(244, 210, 122, 0.5)');
  g.addColorStop(1, 'rgba(244, 210, 122, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 24, y - 24, 72, 72);
  // staircase
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#0a0420' : '#1a0f2c';
    ctx.fillRect(x + i * 2, y + i * 2, 24 - i * 4, 24 - i * 4);
  }
  // rune
  ctx.fillStyle = `rgba(244, 210, 122, ${0.5 + 0.5 * Math.sin(t * 3)})`;
  ctx.fillRect(x + 10, y + 10, 4, 4);
}
