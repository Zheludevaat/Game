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

// Hooded initiate, 14 wide × 16 tall.
// Legend:
//   o = outline (deep indigo)
//   h = hood / cloak primary
//   H = hood highlight
//   s = cloak shadow
//   f = face shadow (under hood)
//   e = eye glow (teal)
//   r = robe body
//   R = robe highlight
//   t = trim / sash
//   g = gold trim
//   b = boot
const initiate: PixelMatrix = [
  '....oooooo....',
  '...ohHHHHho...',
  '..oHhhhhhhHo..',
  '..ohffefefho..',
  '..ohfffffffo..',
  '...ohhhhhho...',
  '..ohrrtttrho..',
  '.ohrrrtttrrho.',
  '.ohRrrtttrrRo.',
  '.ohRrrrrrrrRo.',
  '..ohRrrrrrRo..',
  '..ohgggggggo..',
  '...orrrrrro...',
  '...orr..rro...',
  '...obb..bbo...',
  '...ooo..ooo...',
];

const initiatePalette: Record<string, string | null> = {
  '.': null,
  o: '#06030f',
  h: '#1f1142',
  H: '#3a225f',
  s: '#0e0824',
  f: '#08030f',
  e: '#6cf6e5',
  r: '#2a1656',
  R: '#3d2273',
  t: '#1a0b2c',
  g: '#f4d27a',
  b: '#0a0420',
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
    for (const k of Object.keys(pal)) if (pal[k]) pal[k] = '#ffffff';
  }
  // Step bounce
  const bob = Math.floor(Math.abs(Math.sin(walkPhase)) * 1.5);
  drawSprite(ctx, initiate, pal, Math.floor(x), Math.floor(y - bob), scale, flipX);
}

// Generic enemy shape (drawn from a definition)
export interface EnemyVisual {
  rows: PixelMatrix;
  palette: Record<string, string | null>;
  flashColour?: string;
}

export const ENEMY_VISUALS: Record<string, EnemyVisual> = {
  // Lesser Shade — a wraith. 12×11
  lesserShade: {
    rows: [
      '....oooo....',
      '..ooddddoo..',
      '.odDDDDDDdo.',
      'odDDrDDrDDdo',
      'odDDDDDDDDdo',
      'odDddwwddDdo',
      '.odDdddddDdo',
      '..odDddddDdo',
      '...oddddddo.',
      '....offfo...',
      '.....oo.....',
    ],
    palette: {
      '.': null,
      o: '#04020c',
      d: '#1c0c30',
      D: '#321456',
      r: '#e23a4a',
      w: '#6cf6e5',
      f: '#0a0420',
    },
  },
  // Mercury Imp — sharp, fast little spirit. 11×10
  mercuryImp: {
    rows: [
      '..o.o..o.o.',
      '.ohohohoho.',
      'ohttttttttp',
      'ottwttttwto',
      'ottttwwtttO',
      'ottttttttto',
      '.oTTtttTTo.',
      '..oTtttTo..',
      '...ottto...',
      '....ofo....',
    ],
    palette: {
      '.': null,
      o: '#03101a',
      h: '#053040',
      t: '#6cf6e5',
      T: '#3ab9b3',
      p: '#053040',
      O: '#03101a',
      w: '#ffffff',
      f: '#02080e',
    },
  },
  // Salt Golem — stocky construct. 13×13
  saltGolem: {
    rows: [
      '.ooooooooooo.',
      'oggGGGGGGGggo',
      'ogGGddwwddGgo',
      'ogGwGwwwwGwGo',
      'ogGGwGwwGwGgo',
      'ogGGGGGGGGGgo',
      'oggGGwwwwGggo',
      'oggGGwwwwGggo',
      'oggggggggggo.',
      '.ogGgg.gggo..',
      '.ogGgg.gggo..',
      '.oggg...ggo..',
      '..oo.....oo..',
    ],
    palette: {
      '.': null,
      o: '#0a0420',
      g: '#3b3a55',
      G: '#cdd6dc',
      w: '#f5efd8',
      d: '#08030f',
    },
  },
  // Lunar Wisp — small glowing orb-creature. 11×11
  lunarWisp: {
    rows: [
      '...ovvvo...',
      '..ovbbbvo..',
      '.ovbWWWbvo.',
      'ovbWwwwWbvo',
      'ovbWwbbwWbo',
      'ovbWwwwwWbo',
      'ovbWWwwWWbo',
      '.ovbWWWbvo.',
      '..ovbbbvo..',
      '...ovvvo...',
      '....o.o....',
    ],
    palette: {
      '.': null,
      o: '#1a0b2c',
      v: '#9b6cff',
      b: '#3a1d70',
      W: '#f5efd8',
      w: '#ffffff',
    },
  },
  // Saturn Knight — armoured. 13×14
  saturnKnight: {
    rows: [
      '...ooooo.....',
      '..okkkkkoo...',
      '.okKKKKKKko..',
      'okKKrrrKKKko.',
      'okKrr.rrKKko.',
      'okKKrrrKKKko.',
      'okKKKKKKKKko.',
      'okKkkkkkKkko.',
      'okKkKKKKkKko.',
      'okKkkggkkKko.',
      'okKkk..kkKko.',
      '.okkk..kkko..',
      '.ooo....ooo..',
      '..oo....oo...',
    ],
    palette: {
      '.': null,
      o: '#04020a',
      k: '#0a0420',
      K: '#2a1b66',
      r: '#e23a4a',
      g: '#f4d27a',
    },
  },
  // Serpent of Brass — long brass coil. 18×12
  serpentOfBrass: {
    rows: [
      '......oooo........',
      '....oobbbboo......',
      '..oobyyyybboo.....',
      '.obbYYyywYYbbo....',
      'obbyyyyyyybbbo....',
      'obyyyyyyyyybbo.oo.',
      '.obyyyyyyyyybobyo.',
      '..obyyyyyyyybbyyo.',
      '....obyyyyyyybbbo.',
      '......obbyyyyyyyo.',
      '........obbbbbboo.',
      '..........oooo....',
    ],
    palette: {
      '.': null,
      o: '#2a1608',
      b: '#3a2410',
      y: '#c8983f',
      Y: '#f4d27a',
      w: '#e23a4a',
    },
  },
  // Warden of the Seven Lamps — boss. 22×20
  wardenBoss: {
    rows: [
      '........oooooooo......',
      '.......offfffffo......',
      '......ofGGGGGGGfo.....',
      '.....ofGwwwwwwwGfo....',
      '....ofGwffffffwwGfo...',
      '...ofGwfggggggfwGfo...',
      '..ofGwfgrrrrrrgfwGfo..',
      '.ofGwfgrwwwwwwrgfwGfo.',
      '.ofGwfgrwyyyywwgfwGfo.',
      'ofGwfgrwyYYyywrwGfwGfo',
      'ofGwfgrwyYYyywrwGfwGfo',
      '.ofGwfgrwwyywwrgfwGfo.',
      '.ofGwfgrwwwwwwrgfwGfo.',
      '..ofGwfgrrrrrrgfwGfo..',
      '...ofGwfgggggggfwGfo..',
      '....ofGwffffffwwGfo...',
      '.....ofGwwwwwwGfo.....',
      '......ofGGGGGGfo......',
      '.......offffffo.......',
      '........oooooo........',
    ],
    palette: {
      '.': null,
      o: '#04020a',
      f: '#3a2380',
      G: '#9b6cff',
      w: '#c8a4ff',
      r: '#e23a4a',
      g: '#1a0824',
      y: '#f4d27a',
      Y: '#ffe6a3',
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

export function getEnemySize(visualKey: string): { w: number; h: number } {
  const vis = ENEMY_VISUALS[visualKey];
  if (!vis) return { w: 0, h: 0 };
  return { w: vis.rows[0].length, h: vis.rows.length };
}

// --- Tile rendering ---------------------------------------------------------

// Deterministic tiny PRNG for tile variation
function tileHash(x: number, y: number, seed: number): number {
  let h = (x * 73856093) ^ (y * 19349663) ^ (seed * 83492791);
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

export function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  seed: number,
): void {
  const h = tileHash(x, y, seed);
  // Base tile — alternating large slabs with subtle banding
  const variant = h & 0xff;
  const base = variant < 24 ? PALETTE.floor2 : PALETTE.floor;
  ctx.fillStyle = base;
  ctx.fillRect(x, y, size, size);

  // Subtle inner shading — darker at edges, lighter top-left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.fillRect(x + 1, y + 1, size - 2, 1);
  ctx.fillRect(x + 1, y + 1, 1, size - 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fillRect(x, y + size - 1, size, 1);
  ctx.fillRect(x + size - 1, y, 1, size);

  // Mortar / grout
  ctx.fillStyle = PALETTE.floorCrack;
  ctx.fillRect(x, y, size, 1);
  ctx.fillRect(x, y, 1, size);

  // Occasional cracks
  const detail = (h >>> 8) & 0xff;
  if (detail < 10) {
    ctx.fillStyle = PALETTE.floorCrack;
    ctx.fillRect(x + 3, y + 5, 5, 1);
    ctx.fillRect(x + 7, y + 6, 3, 1);
    ctx.fillRect(x + 9, y + 7, 2, 1);
  } else if (detail < 16) {
    ctx.fillStyle = PALETTE.floorCrack;
    ctx.fillRect(x + 4, y + size - 5, 6, 1);
    ctx.fillRect(x + 6, y + size - 6, 1, 2);
  }

  // Rare gold inlay / mosaic star
  const ornament = (h >>> 16) & 0xff;
  if (ornament < 6) {
    const cx = x + size / 2, cy = y + size / 2;
    ctx.fillStyle = PALETTE.gold3;
    ctx.fillRect(cx - 2, cy - 1, 4, 2);
    ctx.fillRect(cx - 1, cy - 2, 2, 4);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  } else if (ornament < 12) {
    // tiny rune mark
    ctx.fillStyle = 'rgba(108, 246, 229, 0.18)';
    ctx.fillRect(x + size / 2 - 1, y + size / 2 - 1, 2, 2);
  }
}

export function drawWallTile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  topEdge: boolean,
): void {
  // Base stone
  ctx.fillStyle = PALETTE.wallDark;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

  // Highlight ridge on top (cap stones)
  if (topEdge) {
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(x, y, size, 3);
    ctx.fillStyle = '#7a559e';
    ctx.fillRect(x + 1, y + 1, size - 2, 1);
  }

  // Brick mortar — offset every other row for masonry feel
  const offset = (Math.floor(y / size) % 2 === 0) ? 0 : size / 2;
  ctx.fillStyle = PALETTE.wallDark;
  // horizontal mortar
  ctx.fillRect(x, y + size / 2, size, 1);
  // vertical mortar — offset
  const vx = x + offset;
  ctx.fillRect(vx, y + 1, 1, size / 2 - 1);
  ctx.fillRect(vx - offset + (offset ? -size / 2 : size / 2), y + size / 2 + 1, 1, size / 2 - 1);

  // Subtle stone variation — pseudo-random little shadow
  const h = tileHash(x, y, 1337) & 0xff;
  if (h < 32) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 4 + (h & 3), y + 3, 2, 1);
  } else if (h < 48) {
    // tiny carved sigil — soft gold dot
    ctx.fillStyle = 'rgba(244, 210, 122, 0.18)';
    ctx.fillRect(x + size / 2 - 1, y + size / 2 + 3, 2, 1);
  }

  // Bottom shadow line to ground the wall
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y + size - 1, size, 1);
}

export function drawTorch(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, t: number,
): void {
  // wall halo — soft warm glow on stone
  const halo = ctx.createRadialGradient(x + 2, y - 2, 1, x + 2, y - 2, 22);
  halo.addColorStop(0, 'rgba(244, 210, 122, 0.35)');
  halo.addColorStop(1, 'rgba(244, 210, 122, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - 20, y - 24, 44, 44);

  // bracket — dark iron with gold rivet
  ctx.fillStyle = '#1a0f2c';
  ctx.fillRect(x - 1, y + 1, 6, 9);
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x, y + 2, 4, 7);
  ctx.fillStyle = PALETTE.gold3;
  ctx.fillRect(x + 1, y + 8, 2, 1);

  // flame — three-layer with flicker
  const flicker = Math.sin(t * 6 + x * 0.3);
  const off = Math.sin(t * 9 + x) * 0.6;
  ctx.fillStyle = 'rgba(244, 130, 60, 0.55)';
  ctx.beginPath();
  ctx.ellipse(x + 2 + off * 0.3, y - 4, 4 + Math.abs(flicker), 7 + Math.abs(flicker), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(244, 210, 122, 0.9)';
  ctx.beginPath();
  ctx.ellipse(x + 2 + off * 0.2, y - 4, 3, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe6a3';
  ctx.beginPath();
  ctx.ellipse(x + 2, y - 4, 1.6, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff7d6';
  ctx.fillRect(x + 1, y - 5, 2, 2);

  // ember
  if (Math.sin(t * 7 + x) > 0.7) {
    ctx.fillStyle = 'rgba(244, 130, 60, 0.85)';
    ctx.fillRect(x + 2 + Math.round(off), y - 12 + Math.round(off * 2), 1, 1);
  }
}

export function drawChest(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, opened: boolean, locked: boolean,
): void {
  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x - 1, y + 16, 20, 1);

  // body — wood with banding
  ctx.fillStyle = '#1a0b1a';
  ctx.fillRect(x, y + 4, 18, 12);
  ctx.fillStyle = '#5a3a18';
  ctx.fillRect(x + 1, y + 5, 16, 10);
  ctx.fillStyle = '#7a5a1a';
  ctx.fillRect(x + 2, y + 6, 14, 8);

  // wood grain
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(x + 3, y + 8, 12, 1);
  ctx.fillRect(x + 3, y + 12, 12, 1);

  // gold bands
  ctx.fillStyle = PALETTE.gold3;
  ctx.fillRect(x, y + 4, 18, 1);
  ctx.fillRect(x, y + 15, 18, 1);

  if (!opened) {
    // lid bevel
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x, y + 4, 18, 2);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(x, y + 4, 18, 1);
    // corner studs
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(x + 1, y + 5, 1, 1);
    ctx.fillRect(x + 16, y + 5, 1, 1);
    ctx.fillRect(x + 1, y + 14, 1, 1);
    ctx.fillRect(x + 16, y + 14, 1, 1);
    // lock plate
    ctx.fillStyle = '#1a0f2c';
    ctx.fillRect(x + 7, y + 8, 4, 5);
    ctx.fillStyle = locked ? PALETTE.crimson : PALETTE.gold;
    ctx.fillRect(x + 8, y + 9, 2, 3);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 8, y + 9, 1, 1);
  } else {
    // open interior
    ctx.fillStyle = '#0a0420';
    ctx.fillRect(x + 1, y + 5, 16, 5);
    // lid flipped back
    ctx.fillStyle = '#5a3a18';
    ctx.fillRect(x + 1, y + 2, 16, 2);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(x + 1, y + 2, 16, 1);
    // loot beam
    ctx.fillStyle = 'rgba(244, 210, 122, 0.55)';
    ctx.fillRect(x + 6, y - 4, 6, 8);
    ctx.fillStyle = '#ffe6a3';
    ctx.fillRect(x + 8, y - 6, 2, 8);
    // pile of coins
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(x + 4, y + 7, 10, 2);
    ctx.fillStyle = PALETTE.gold3;
    ctx.fillRect(x + 4, y + 8, 10, 1);
  }
}

export function drawShrine(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, used: boolean, t: number,
): void {
  // base platform (two-tier)
  ctx.fillStyle = '#1a0f2c';
  ctx.fillRect(x - 12, y + 8, 24, 2);
  ctx.fillStyle = '#2a1b3a';
  ctx.fillRect(x - 10, y + 6, 20, 4);
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x - 8, y + 4, 16, 3);

  // column
  ctx.fillStyle = '#1a0f2c';
  ctx.fillRect(x - 5, y - 9, 14, 14);
  ctx.fillStyle = '#5b3a86';
  ctx.fillRect(x - 4, y - 8, 12, 13);
  ctx.fillStyle = '#7a559e';
  ctx.fillRect(x - 4, y - 8, 1, 13);
  ctx.fillStyle = '#221636';
  ctx.fillRect(x + 7, y - 8, 1, 13);

  // gold filigree band
  ctx.fillStyle = PALETTE.gold3;
  ctx.fillRect(x - 4, y - 4, 12, 1);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(x - 3, y - 4, 1, 1);
  ctx.fillRect(x + 1, y - 4, 1, 1);
  ctx.fillRect(x + 5, y - 4, 1, 1);

  // bowl/cap
  ctx.fillStyle = '#1a0f2c';
  ctx.fillRect(x - 6, y - 10, 16, 2);
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x - 5, y - 11, 14, 2);

  // flame / orb on top
  if (!used) {
    // halo
    const halo = ctx.createRadialGradient(x + 2, y - 16, 1, x + 2, y - 16, 14);
    halo.addColorStop(0, 'rgba(108, 246, 229, 0.55)');
    halo.addColorStop(1, 'rgba(108, 246, 229, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 12, y - 30, 28, 28);
    // flame
    const flicker = Math.sin(t * 5) * 1.4;
    ctx.fillStyle = 'rgba(108,246,229,0.75)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y - 15, 4.5 + Math.abs(flicker) * 0.4, 6 + flicker * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a4faf0';
    ctx.beginPath();
    ctx.ellipse(x + 2, y - 15, 2.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 1, y - 16, 2, 2);
  } else {
    ctx.fillStyle = '#0a0420';
    ctx.fillRect(x - 3, y - 14, 10, 4);
    ctx.fillStyle = '#1a0f2c';
    ctx.fillRect(x - 2, y - 13, 8, 2);
  }
}

export function drawStairs(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, t: number,
): void {
  // glow
  const g = ctx.createRadialGradient(x + 12, y + 12, 2, x + 12, y + 12, 40);
  g.addColorStop(0, 'rgba(244, 210, 122, 0.55)');
  g.addColorStop(1, 'rgba(244, 210, 122, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 24, y - 24, 72, 72);

  // outer arch (frame)
  ctx.fillStyle = '#1a0f2c';
  ctx.fillRect(x - 2, y - 2, 28, 28);
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(x - 1, y - 1, 26, 26);

  // descending steps — receding rectangles
  for (let i = 0; i < 5; i++) {
    const inset = i * 2;
    const dark = i % 2 === 0;
    ctx.fillStyle = dark ? '#04020a' : '#1a0f2c';
    ctx.fillRect(x + inset, y + inset, 24 - inset * 2, 24 - inset * 2);
  }
  // bottom step highlight
  ctx.fillStyle = '#2a1b66';
  ctx.fillRect(x + 8, y + 8, 8, 8);
  ctx.fillStyle = '#04020a';
  ctx.fillRect(x + 10, y + 10, 4, 4);

  // rune glyph hovering
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  ctx.fillStyle = `rgba(244, 210, 122, ${pulse})`;
  ctx.fillRect(x + 11, y + 11, 2, 2);
  ctx.fillStyle = `rgba(255, 230, 163, ${pulse * 0.8})`;
  ctx.fillRect(x + 11, y + 8, 2, 1);
  ctx.fillRect(x + 11, y + 15, 2, 1);
  ctx.fillRect(x + 8, y + 11, 1, 2);
  ctx.fillRect(x + 15, y + 11, 1, 2);
}
