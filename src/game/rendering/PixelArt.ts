import { PALETTE } from '../constants';
import type { SphereDef } from '../data/spheres';
import {
  drawCrack, drawRivet, drawMicroRune, drawMossPatch, drawSpiral,
  drawTideRipple, drawPetalCluster, drawSlash, drawCog, drawStarburst,
} from './PixelArtUtils';

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

// Hooded initiate, 14 wide × 17 tall.
// Legend:
//   o = outline (deep indigo)
//   h = hood / cloak primary
//   H = hood highlight (lighter inner)
//   K = hood crest peak
//   f = face shadow (under hood)
//   F = face skin (warm pale)
//   e = eye glow (teal)
//   r = robe body
//   R = robe highlight
//   t = sash / belt
//   c = chest sigil (gold heart-of-lamp)
//   g = gold trim
//   b = boot
const initiate: PixelMatrix = [
  '.....KKKK.....',
  '....KhhhhK....',
  '...KhHHHHhK...',
  '..KhHHffHHhK..',
  '.KhHffFFffHhK.',
  '.KhHfFeeFfHhK.',
  '..KhfFFFFfhK..',
  '...KhhrrhhK...',
  '..ohrrrcrrho..',
  '.ohRrrcgcrrRo.',
  '.ohRrrrcrrrRo.',
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
  K: '#100728',     // hood outline / crest
  h: '#1f1142',
  H: '#3a225f',
  f: '#06020c',     // face shadow
  F: '#c89a72',     // face skin (warm pale)
  e: '#6cf6e5',     // eye glow
  r: '#2a1656',
  R: '#3d2273',
  t: '#1a0b2c',
  c: '#7a4a22',     // chest-sigil setting (dark gold)
  g: '#f4d27a',     // gold trim + sigil heart
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
  // Lesser Shade — a wraith. 12×12. Tall hooded ghost with two
  // burning eyes and a wisp tail trailing into smoke.
  lesserShade: {
    rows: [
      '....oooo....',
      '...oDDDDo...',
      '..oDDDDDDo..',
      '.oDdddddDo..',
      'oDdrddddrDo.',
      'oDdrwddwrDo.',
      'oDddddddDo..',
      '.oDdddddDo..',
      '..oDddddo...',
      '..oDdddDo...',
      '...odDdo....',
      '....of.o....',
    ],
    palette: {
      '.': null,
      o: '#04020c',
      d: '#1c0c30',
      D: '#321456',
      r: '#e23a4a',
      w: '#ffd0d6',
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
  // Lunar Wisp — pale moon-fragment with a single dark-side crescent.
  // 11×11. The dark crescent gives it a clear "moon-phase" silhouette.
  lunarWisp: {
    rows: [
      '...ovvvo...',
      '..ovWWWvo..',
      '.ovWwwwbvo.',
      'ovWwwwbbvo.',
      'ovWwwwbbvo.',
      'ovWWwwbbvo.',
      'ovWwwwbbvo.',
      'ovWwwwbvo..',
      '.ovWwwbvo..',
      '..ovWvvo...',
      '...o.oo....',
    ],
    palette: {
      '.': null,
      o: '#1a0b2c',
      v: '#9b6cff',
      b: '#3a1d70',
      W: '#ffffff',
      w: '#cdd6dc',
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
  // Serpent of Brass — coiled snake with a clear head (left), one
  // burning red eye, a fanged jaw, scaled body coil, and a tapered
  // tail. 18×12.
  serpentOfBrass: {
    rows: [
      '..oooo............',
      '.oYYYYo...........',
      'oYYyyYYo..oooo....',
      'oYwyYyYo.obYYbo...',
      'oYyfyfYo.obYyybo..',
      '.oYyyYo.obYyyyybo.',
      '..oYYo.obYyyyyyybo',
      '...oo.obYyyyyyyybo',
      '......obYyyyyyybo.',
      '.......obYyyyybo..',
      '........obYyybo...',
      '.........oboboo...',
    ],
    palette: {
      '.': null,
      o: '#2a1608',
      b: '#3a2410',
      y: '#c8983f',
      Y: '#f4d27a',
      w: '#e23a4a',     // burning eye
      f: '#fff7d6',     // fang highlight
    },
  },
  // Warden of the Seven Lamps — generic boss (kept for legacy / debug).
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
  // ─── Seven Wardens — same 22×20 silhouette, sphere-coloured ─────────
  // Each is a palette swap of the wardenBoss matrix above. The core
  // gold (y/Y) is kept as the "lit lamp at the heart" for every Warden.
  seleneBoss: {
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
      '.': null, o: '#04020a',
      f: '#2a3a52', G: '#6c8cff', w: '#cdd6dc',
      r: '#9b6cff', g: '#0a0420', y: '#ffe6a3', Y: '#ffffff',
    },
  },
  hermesBoss: {
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
      '.': null, o: '#04020a',
      f: '#0d3a40', G: '#1f8a86', w: '#6cf6e5',
      r: '#a4faf0', g: '#031820', y: '#f4d27a', Y: '#ffffff',
    },
  },
  aphroditeBoss: {
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
      '.': null, o: '#04020a',
      f: '#5b2a52', G: '#9b6cff', w: '#ff9bc1',
      r: '#ffd0e3', g: '#1a0824', y: '#f4d27a', Y: '#ffffff',
    },
  },
  heliosBoss: {
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
      '.': null, o: '#2a1608',
      f: '#7a5a1a', G: '#c8983f', w: '#f4d27a',
      r: '#ffe6a3', g: '#3a2410', y: '#ffffff', Y: '#fff7d6',
    },
  },
  aresBoss: {
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
      '.': null, o: '#04020a',
      f: '#5a1018', G: '#e23a4a', w: '#ff7a5a',
      r: '#ffe6a3', g: '#1a0408', y: '#f4d27a', Y: '#ffffff',
    },
  },
  zeusBoss: {
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
      '.': null, o: '#2a1608',
      f: '#5a3a18', G: '#c8983f', w: '#f4d27a',
      r: '#ffffff', g: '#3a2410', y: '#ffe6a3', Y: '#fff7d6',
    },
  },
  kronosBoss: {
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
      '.': null, o: '#04020a',
      f: '#1a0f2c', G: '#3b265c', w: '#5b3a86',
      r: '#9b6cff', g: '#0a0420', y: '#c8983f', Y: '#ffe6a3',
    },
  },
  // Martyr Beacon — gilded armoured spirit. Saturn Knight silhouette,
  // sun palette. Heals other enemies, doesn't attack on contact much.
  martyrBeacon: {
    rows: [
      '...ooooo.....',
      '..okkkkkoo...',
      '.okKKKKKKko..',
      'okKKyyyKKKko.',
      'okKyy.yyKKko.',
      'okKKyyyKKKko.',
      'okKKKKKKKKko.',
      'okKkkkkkKkko.',
      'okKkKKKKkKko.',
      'okKkkyykkKko.',
      'okKkk..kkKko.',
      '.okkk..kkko..',
      '.ooo....ooo..',
      '..oo....oo...',
    ],
    palette: {
      '.': null,
      o: '#1a0a04',
      k: '#3a1a04',
      K: '#c8983f',
      y: '#ffe6a3',
    },
  },
  // Umbral Stalker — Lesser Shade silhouette but rendered at half-alpha
  // (the engine's status-based draw applies the fade). Saturn palette.
  umbralStalker: {
    rows: [
      '....oooo....',
      '...oDDDDo...',
      '..oDDDDDDo..',
      '.oDdddddDo..',
      'oDdvddddvDo.',
      'oDdvwddwvDo.',
      'oDddddddDo..',
      '.oDdddddDo..',
      '..oDddddo...',
      '..oDdddDo...',
      '...odDdo....',
      '....of.o....',
    ],
    palette: {
      '.': null,
      o: '#04020c',
      d: '#0d041a',
      D: '#1a0824',
      v: '#9b6cff',
      w: '#cdd6dc',
      f: '#0a0420',
    },
  },
  // Mirror Twin — Lunar Wisp silhouette, venus palette. Spawns a copy
  // on first damage taken.
  mirrorTwin: {
    rows: [
      '...ovvvo...',
      '..ovWWWvo..',
      '.ovWwwwbvo.',
      'ovWwwwbbvo.',
      'ovWwwwbbvo.',
      'ovWWwwbbvo.',
      'ovWwwwbbvo.',
      'ovWwwwbvo..',
      '.ovWwwbvo..',
      '..ovWvvo...',
      '...o.oo....',
    ],
    palette: {
      '.': null,
      o: '#1a0b1a',
      v: '#ff6caf',
      b: '#ffd0d6',
      W: '#ffffff',
      w: '#ffe6a3',
    },
  },
  // Kronosian Herald — Salt Golem silhouette, saturn palette. Contact
  // applies slow.
  kronosianHerald: {
    rows: [
      '.ooooooooooo.',
      'oggGGGGGGGggo',
      'ogGGddvvddGgo',
      'ogGvGvvvvGvGo',
      'ogGGvGvvGvGgo',
      'ogGGGGGGGGGgo',
      'oggGGvvvvGggo',
      'oggGGvvvvGggo',
      'oggggggggggo.',
      '.ogGgg.gggo..',
      '.ogGgg.gggo..',
      '.oggg...ggo..',
      '..oo.....oo..',
    ],
    palette: {
      '.': null,
      o: '#0a0420',
      g: '#1a0f2c',
      G: '#3b265c',
      v: '#9b6cff',
      d: '#08030f',
    },
  },
  // Heliokrator — Serpent of Brass silhouette, sun palette. Mid-tier
  // miniboss for Sun → Mars.
  heliokrator: {
    rows: [
      '..oooo............',
      '.oYYYYo...........',
      'oYYyyYYo..oooo....',
      'oYwyYyYo.obYYbo...',
      'oYyfyfYo.obYyybo..',
      '.oYyyYo.obYyyyybo.',
      '..oYYo.obYyyyyyybo',
      '...oo.obYyyyyyyybo',
      '......obYyyyyyybo.',
      '.......obYyyyybo..',
      '........obYYybo...',
      '.........oooo.....',
    ],
    palette: {
      '.': null,
      o: '#1a0a04',
      Y: '#ffe6a3',
      y: '#ff7a3a',
      w: '#ffffff',
      f: '#3a1a04',
      b: '#c8983f',
    },
  },
  // Nikethron — Serpent of Brass silhouette, jupiter palette. Late
  // miniboss for Jupiter → Saturn.
  nikethron: {
    rows: [
      '..oooo............',
      '.oYYYYo...........',
      'oYYyyYYo..oooo....',
      'oYwyYyYo.obYYbo...',
      'oYyfyfYo.obYyybo..',
      '.oYyyYo.obYyyyybo.',
      '..oYYo.obYyyyyyybo',
      '...oo.obYyyyyyyybo',
      '......obYyyyyyybo.',
      '.......obYyyyybo..',
      '........obYYybo...',
      '.........oooo.....',
    ],
    palette: {
      '.': null,
      o: '#04081a',
      Y: '#cdd6dc',
      y: '#6cf6e5',
      w: '#ffe6a3',
      f: '#04081a',
      b: '#3b265c',
    },
  },
};

function parseHexRgb(hex: string): [number, number, number] | null {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

function mixHexToward(hex: string, target: [number, number, number], t: number): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb[0] * (1 - t) + target[0] * t);
  const g = Math.round(rgb[1] * (1 - t) + target[1] * t);
  const b = Math.round(rgb[2] * (1 - t) + target[2] * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  visualKey: string,
  x: number, y: number,
  scale: number,
  flash: number,
  flipX = false,
  tintHex?: string,
): void {
  const vis = ENEMY_VISUALS[visualKey];
  if (!vis) return;
  const pal = { ...vis.palette };
  if (flash > 0) {
    for (const k of Object.keys(pal)) {
      if (pal[k]) pal[k] = '#ffffff';
    }
  } else if (tintHex) {
    // Mix the sphere accent into every visible palette entry so the
    // enemy reads as belonging to the current floor's hue without
    // losing its own silhouette.
    const target = parseHexRgb(tintHex);
    if (target) {
      for (const k of Object.keys(pal)) {
        const v = pal[k];
        if (v) pal[k] = mixHexToward(v, target, 0.22);
      }
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
  /** Optional per-sphere visual data. When omitted the tile renders
   *  with the global PALETTE defaults — used by menu / cinematic
   *  contexts that don't carry a sphere. */
  sphere?: SphereDef,
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

  // Mortar / grout — per-sphere when available
  const mortar = sphere?.floorMortar ?? PALETTE.floorCrack;
  ctx.fillStyle = mortar;
  ctx.fillRect(x, y, size, 1);
  ctx.fillRect(x, y, 1, size);

  // Occasional cracks — Saturn doubles density, Moon halves
  const motif = sphere?.floorMotif ?? null;
  const detail = (h >>> 8) & 0xff;
  const crackGate = motif === 'saturn-crack' ? 22
                  : motif === 'lunar-tide'   ? 6
                  : 16;
  if (detail < crackGate) {
    drawCrack(ctx, x + 3, y + 5, h >>> 4, mortar);
  }

  // Per-sphere ornament — replaces the hardcoded teal rune + gold inlay
  // with sphere-themed micro-decals. Gated rare (6-12 % of tiles) so
  // the floor reads as textured-but-not-cluttered.
  const ornament = (h >>> 16) & 0xff;
  const cx = x + size / 2, cy = y + size / 2;
  if (!motif) {
    // Legacy fallback — keep the original behaviour for menu / cinematic
    // surfaces that don't pass a sphere through.
    if (ornament < 6) {
      ctx.fillStyle = PALETTE.gold3;
      ctx.fillRect(cx - 2, cy - 1, 4, 2);
      ctx.fillRect(cx - 1, cy - 2, 2, 4);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
    } else if (ornament < 12) {
      ctx.fillStyle = 'rgba(108, 246, 229, 0.18)';
      ctx.fillRect(x + size / 2 - 1, y + size / 2 - 1, 2, 2);
    }
    return;
  }

  if (ornament >= 14) return; // most tiles stay clean

  // Sphere-specific motif. Each motif keeps the rare-gate, just with
  // a different glyph so the floor identity reads at room scale.
  switch (motif) {
    case 'lunar-tide':
      drawTideRipple(ctx, x + 3, cy, 'rgba(168, 192, 232, 0.35)');
      break;
    case 'mercury-rivet':
      drawRivet(ctx, x + 2, y + 2, '#c8983f');
      drawRivet(ctx, x + size - 5, y + size - 5, '#c8983f');
      break;
    case 'venus-petal':
      drawPetalCluster(ctx, cx - 1, cy - 1, 'rgba(255, 155, 193, 0.45)');
      break;
    case 'sun-spiral':
      if (ornament < 6) drawSpiral(ctx, cx, cy, '#c8983f');
      else              drawMicroRune(ctx, cx - 1, cy - 1, h, 'rgba(244, 210, 122, 0.35)');
      break;
    case 'mars-scar':
      drawSlash(ctx, x + 4, y + 4, h, 'rgba(122, 16, 32, 0.55)');
      break;
    case 'jupiter-cog':
      if (ornament < 6) drawCog(ctx, cx - 2, cy - 2, 'rgba(200, 152, 63, 0.65)');
      else              drawMicroRune(ctx, cx - 1, cy - 1, h, 'rgba(200, 152, 63, 0.45)');
      break;
    case 'saturn-crack':
      // Crack already amplified above; add the moss patch in the rare
      // ornament slot so the decay reads as living, not just broken.
      drawMossPatch(ctx, x + 3, y + size - 4, h, 'rgba(90, 139, 80, 0.55)');
      break;
    case 'ogdoad-star':
      drawStarburst(ctx, cx, cy, 'rgba(255, 247, 214, 0.65)');
      break;
  }
}

export function drawWallTile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  topEdge: boolean,
  /** Optional sphere — when supplied, cap-stone strip tints toward
   *  `sphere.accent` and the rare carved sigil pulls from
   *  `sphere.wallSigil` + `sphere.wallMotif`. */
  sphere?: SphereDef,
): void {
  // Base stone
  ctx.fillStyle = PALETTE.wallDark;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

  // Highlight ridge on top (cap stones) — tinted by sphere when provided
  if (topEdge) {
    ctx.fillStyle = sphere?.accent ?? PALETTE.wallTop;
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
    // Carved sigil — per-sphere motif when the floor passes a sphere
    // through, otherwise the legacy gold dot. Kept rare (h < 48) so
    // walls read as occasionally-carved stone, not a tapestry.
    const sx = x + size / 2 - 1;
    const sy = y + size / 2 + 1;
    const motif = sphere?.wallMotif ?? null;
    const colour = sphere?.wallSigil ?? '#f4d27a';
    const alpha = 'rgba(244, 210, 122, 0.22)'; // fallback
    if (!motif) {
      ctx.fillStyle = alpha;
      ctx.fillRect(sx, sy + 2, 2, 1);
    } else {
      switch (motif) {
        case 'lunar-tide':
          ctx.fillStyle = colour;
          ctx.fillRect(sx,     sy, 1, 1);
          ctx.fillRect(sx + 1, sy + 1, 1, 1);
          ctx.fillRect(sx,     sy + 2, 1, 1);
          break;
        case 'mercury-rivet':
          drawRivet(ctx, sx - 1, sy - 1, colour);
          break;
        case 'venus-petal':
          drawPetalCluster(ctx, sx, sy, colour);
          break;
        case 'sun-spiral':
          ctx.fillStyle = colour;
          ctx.fillRect(sx,     sy,     1, 1);
          ctx.fillRect(sx + 1, sy,     1, 1);
          ctx.fillRect(sx + 1, sy + 1, 1, 1);
          ctx.fillRect(sx,     sy + 1, 1, 1);
          break;
        case 'mars-scar':
          drawSlash(ctx, sx - 1, sy - 1, h, colour);
          break;
        case 'jupiter-cog':
          ctx.fillStyle = colour;
          ctx.fillRect(sx,     sy,     2, 1);
          ctx.fillRect(sx - 1, sy,     1, 1);
          ctx.fillRect(sx + 2, sy,     1, 1);
          break;
        case 'saturn-crack':
          drawMossPatch(ctx, sx - 1, sy, h, colour);
          break;
        case 'ogdoad-star':
          drawStarburst(ctx, sx, sy + 1, colour);
          break;
      }
    }
  }

  // Bottom shadow line to ground the wall
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y + size - 1, size, 1);
}

export function drawTorch(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, t: number,
  /** Optional sphere-flavoured colour for the halo + outer flame layer.
   * Inner core stays white-hot so torches still read as fire. */
  tint?: { rgb: string; halo: string } | null,
): void {
  const haloColour = tint?.halo ?? 'rgba(244, 210, 122, 0.35)';
  const haloFade = tint ? tint.halo.replace(/[\d.]+\)$/, '0)') : 'rgba(244, 210, 122, 0)';
  // wall halo — soft glow on stone, tinted toward sphere accent when set
  const halo = ctx.createRadialGradient(x + 2, y - 2, 1, x + 2, y - 2, 22);
  halo.addColorStop(0, haloColour);
  halo.addColorStop(1, haloFade);
  ctx.fillStyle = halo;
  ctx.fillRect(x - 20, y - 24, 44, 44);

  // bracket — dark iron with gold rivet
  ctx.fillStyle = '#1a0f2c';
  ctx.fillRect(x - 1, y + 1, 6, 9);
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x, y + 2, 4, 7);
  ctx.fillStyle = PALETTE.gold3;
  ctx.fillRect(x + 1, y + 8, 2, 1);

  // flame — three-layer with flicker. Outer + mid layers take the tint
  // when set; innermost two stay white-hot.
  const flicker = Math.sin(t * 6 + x * 0.3);
  const off = Math.sin(t * 9 + x) * 0.6;
  const outerColour = tint?.rgb ? `rgba(${tint.rgb}, 0.55)` : 'rgba(244, 130, 60, 0.55)';
  const midColour   = tint?.rgb ? `rgba(${tint.rgb}, 0.9)`  : 'rgba(244, 210, 122, 0.9)';
  ctx.fillStyle = outerColour;
  ctx.beginPath();
  ctx.ellipse(x + 2 + off * 0.3, y - 4, 4 + Math.abs(flicker), 7 + Math.abs(flicker), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = midColour;
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

/** ShrineKind drives the column-top decoration. The base platform +
 *  column are shared; each kind ships a 30-40-line custom top so the
 *  alchemical operation reads from across the room before the player
 *  opens the modal. */
type ShrineKindArg =
  | 'calcination' | 'dissolution' | 'separation' | 'conjunction'
  | 'fermentation' | 'distillation' | 'coagulation'
  | 'cursed' | 'library' | 'puzzle';

export function drawShrine(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, used: boolean, t: number,
  kind: ShrineKindArg = 'calcination',
): void {
  // Cursed shrines get a darker stone — the rot has eaten the column.
  const cursed = kind === 'cursed';
  const stoneBase = cursed ? '#100818' : '#1a0f2c';
  const stoneMid  = cursed ? '#1a1428' : '#2a1b3a';
  const stoneTop  = cursed ? '#2a1a36' : '#3b265c';
  const colShade  = cursed ? '#3a2050' : '#5b3a86';
  const colLite   = cursed ? '#54306a' : '#7a559e';

  // base platform (two-tier)
  ctx.fillStyle = stoneBase;
  ctx.fillRect(x - 12, y + 8, 24, 2);
  ctx.fillStyle = stoneMid;
  ctx.fillRect(x - 10, y + 6, 20, 4);
  ctx.fillStyle = stoneTop;
  ctx.fillRect(x - 8, y + 4, 16, 3);

  // column
  ctx.fillStyle = stoneBase;
  ctx.fillRect(x - 5, y - 9, 14, 14);
  ctx.fillStyle = colShade;
  ctx.fillRect(x - 4, y - 8, 12, 13);
  ctx.fillStyle = colLite;
  ctx.fillRect(x - 4, y - 8, 1, 13);
  ctx.fillStyle = '#221636';
  ctx.fillRect(x + 7, y - 8, 1, 13);

  // gold filigree band — blood-red on cursed
  ctx.fillStyle = cursed ? '#7a1020' : PALETTE.gold3;
  ctx.fillRect(x - 4, y - 4, 12, 1);
  ctx.fillStyle = cursed ? PALETTE.crimson : PALETTE.gold;
  ctx.fillRect(x - 3, y - 4, 1, 1);
  ctx.fillRect(x + 1, y - 4, 1, 1);
  ctx.fillRect(x + 5, y - 4, 1, 1);

  // bowl/cap
  ctx.fillStyle = stoneBase;
  ctx.fillRect(x - 6, y - 10, 16, 2);
  ctx.fillStyle = stoneTop;
  ctx.fillRect(x - 5, y - 11, 14, 2);

  if (used) {
    // Spent — a dead bowl regardless of kind
    ctx.fillStyle = '#0a0420';
    ctx.fillRect(x - 3, y - 14, 10, 4);
    ctx.fillStyle = '#1a0f2c';
    ctx.fillRect(x - 2, y - 13, 8, 2);
    return;
  }

  // Per-kind crown — what sits on top of the column.
  drawShrineCrown(ctx, x, y, t, kind);
}

/** Column-top decoration for an unused shrine. Branches on kind so
 *  every alchemical operation has its own silhouette. */
function drawShrineCrown(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, t: number,
  kind: ShrineKindArg,
): void {
  switch (kind) {
    case 'calcination': {
      // Furnace bowl + orange flame plume
      const halo = ctx.createRadialGradient(x + 2, y - 16, 1, x + 2, y - 16, 16);
      halo.addColorStop(0, 'rgba(255, 122, 58, 0.65)');
      halo.addColorStop(1, 'rgba(255, 122, 58, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - 14, y - 32, 32, 32);
      ctx.fillStyle = '#3a1d10';
      ctx.fillRect(x - 4, y - 13, 12, 2);
      const flick = Math.sin(t * 6) * 1.6;
      ctx.fillStyle = '#ff7a3a';
      ctx.beginPath();
      ctx.ellipse(x + 2, y - 17, 4 + Math.abs(flick) * 0.5, 7 + flick * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe6a3';
      ctx.beginPath();
      ctx.ellipse(x + 2, y - 17, 2, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7d6';
      ctx.fillRect(x + 1, y - 19, 2, 3);
      break;
    }
    case 'dissolution': {
      // Water bowl with ripple ring + soft cyan halo
      const halo = ctx.createRadialGradient(x + 2, y - 14, 1, x + 2, y - 14, 14);
      halo.addColorStop(0, 'rgba(108, 246, 229, 0.55)');
      halo.addColorStop(1, 'rgba(108, 246, 229, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - 12, y - 28, 28, 28);
      // Bowl rim
      ctx.fillStyle = '#1f8a86';
      ctx.fillRect(x - 6, y - 14, 16, 2);
      // Water surface
      ctx.fillStyle = '#6cf6e5';
      ctx.fillRect(x - 5, y - 13, 14, 2);
      // Ripple ring (animated)
      const r = ((t * 6) % 5);
      ctx.strokeStyle = `rgba(164, 250, 240, ${0.6 - r * 0.1})`;
      ctx.beginPath(); ctx.arc(x + 2, y - 13, 2 + r, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'separation': {
      // Balance scale — yoke + two pans
      ctx.fillStyle = '#c8983f';
      ctx.fillRect(x + 1, y - 16, 2, 4);          // post
      ctx.fillRect(x - 6, y - 17, 16, 1);         // yoke
      // Chains
      ctx.fillRect(x - 5, y - 16, 1, 3);
      ctx.fillRect(x + 8, y - 16, 1, 3);
      // Left pan
      ctx.fillStyle = '#f4d27a';
      ctx.fillRect(x - 7, y - 13, 5, 1);
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x - 7, y - 12, 5, 1);
      // Right pan
      ctx.fillStyle = '#f4d27a';
      ctx.fillRect(x + 6, y - 13, 5, 1);
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x + 6, y - 12, 5, 1);
      break;
    }
    case 'conjunction': {
      // Two interlocked rings — gold + silver
      ctx.strokeStyle = '#f4d27a';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x - 1, y - 15, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#cdd6dc';
      ctx.beginPath(); ctx.arc(x + 5, y - 15, 4, 0, Math.PI * 2); ctx.stroke();
      // Intersection sparkle
      const sparkle = 0.6 + 0.4 * Math.sin(t * 3);
      ctx.fillStyle = `rgba(255, 247, 214, ${sparkle})`;
      ctx.fillRect(x + 1, y - 16, 2, 2);
      break;
    }
    case 'fermentation': {
      // Squat vat with 3 rising bubbles + greenish glow
      const halo = ctx.createRadialGradient(x + 2, y - 14, 1, x + 2, y - 14, 12);
      halo.addColorStop(0, 'rgba(127, 208, 112, 0.55)');
      halo.addColorStop(1, 'rgba(127, 208, 112, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - 10, y - 26, 24, 24);
      ctx.fillStyle = '#3a5a30';
      ctx.fillRect(x - 6, y - 14, 16, 4);          // vat body
      ctx.fillStyle = '#5a8b50';
      ctx.fillRect(x - 5, y - 13, 14, 1);          // vat surface
      // Three bubbles at hashed y
      for (let i = 0; i < 3; i++) {
        const bx = x - 3 + i * 4;
        const by = y - 16 - ((t * 8 + i * 7) % 6);
        ctx.fillStyle = 'rgba(127, 208, 112, 0.75)';
        ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'distillation': {
      // Retort flask + drip
      ctx.fillStyle = '#1a0f2c';
      ctx.fillRect(x - 3, y - 17, 8, 5);           // flask body (dark glass)
      ctx.fillStyle = 'rgba(244, 210, 122, 0.55)';
      ctx.fillRect(x - 2, y - 16, 6, 3);           // liquid
      ctx.fillStyle = '#c8983f';
      ctx.fillRect(x - 3, y - 18, 8, 1);           // rim
      // Spout angled right
      ctx.fillRect(x + 5, y - 16, 4, 1);
      ctx.fillRect(x + 9, y - 16, 1, 2);
      // Animated drip
      const dripY = (t * 14) % 6;
      ctx.fillStyle = '#ffe6a3';
      ctx.fillRect(x + 9, y - 14 + dripY, 1, 1);
      break;
    }
    case 'coagulation': {
      // Crucible + single crystal sticking up
      ctx.fillStyle = '#3b265c';
      ctx.fillRect(x - 5, y - 14, 14, 3);           // crucible body
      ctx.fillStyle = '#5b3a86';
      ctx.fillRect(x - 4, y - 13, 12, 1);
      // Crystal
      const sparkle = 0.7 + 0.3 * Math.sin(t * 2);
      ctx.fillStyle = '#9b6cff';
      ctx.fillRect(x + 1, y - 18, 2, 5);
      ctx.fillRect(x,     y - 17, 4, 1);
      ctx.fillRect(x + 2, y - 19, 1, 1);
      ctx.fillStyle = `rgba(220, 200, 255, ${sparkle})`;
      ctx.fillRect(x + 1, y - 18, 1, 2);
      break;
    }
    case 'cursed': {
      // Black flame + blood streak (already darkened above)
      const halo = ctx.createRadialGradient(x + 2, y - 16, 1, x + 2, y - 16, 14);
      halo.addColorStop(0, 'rgba(226, 58, 74, 0.55)');
      halo.addColorStop(1, 'rgba(226, 58, 74, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - 12, y - 30, 28, 28);
      const flick = Math.sin(t * 5) * 1.4;
      ctx.fillStyle = '#0a0210';
      ctx.beginPath();
      ctx.ellipse(x + 2, y - 16, 4 + Math.abs(flick) * 0.5, 7 + flick * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a1020';
      ctx.beginPath();
      ctx.ellipse(x + 2, y - 16, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.crimson;
      ctx.fillRect(x + 1, y - 18, 2, 2);
      // Blood streak down column
      ctx.fillStyle = 'rgba(122, 16, 32, 0.65)';
      ctx.fillRect(x + 2, y - 4, 1, 10);
      break;
    }
    case 'library': {
      // Book lectern + glyph cloud
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 6, y - 13, 16, 2);           // lectern base
      ctx.fillStyle = '#5a3a18';
      ctx.fillRect(x - 5, y - 14, 14, 1);
      // Book V-shape
      ctx.fillStyle = '#c8983f';
      ctx.fillRect(x - 5, y - 16, 7, 3);
      ctx.fillRect(x + 2, y - 16, 7, 3);
      ctx.fillStyle = '#7a5a1a';
      ctx.fillRect(x + 1, y - 16, 2, 3);            // spine
      // Floating glyphs
      const off = Math.sin(t * 1.5) * 1;
      ctx.fillStyle = 'rgba(244, 210, 122, 0.75)';
      ctx.fillRect(x - 4, y - 21 + off, 1, 1);
      ctx.fillRect(x + 2, y - 23 + off, 1, 1);
      ctx.fillRect(x + 6, y - 20 + off, 1, 1);
      break;
    }
    case 'puzzle': {
      // Tetragram (4-point star) carved into column face + 4 dim lamps
      ctx.fillStyle = '#c8983f';
      // Star (4 triangles)
      ctx.fillRect(x + 1, y - 17, 2, 6);          // vertical bar
      ctx.fillRect(x - 1, y - 14, 6, 2);          // horizontal bar
      ctx.fillRect(x,     y - 15, 4, 4);          // centre
      // Four dim corner lamps
      const pulse = 0.4 + 0.3 * Math.sin(t * 2);
      ctx.fillStyle = `rgba(108, 246, 229, ${pulse})`;
      ctx.fillRect(x - 5, y - 16, 1, 1);
      ctx.fillRect(x + 7, y - 16, 1, 1);
      ctx.fillRect(x - 5, y - 10, 1, 1);
      ctx.fillRect(x + 7, y - 10, 1, 1);
      break;
    }
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
