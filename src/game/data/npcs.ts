// Non-hostile NPC data — kicks off the deferred Track 3 work tracked
// in docs/npcs.md. Phase A here ships only the Hierophant on the main
// menu (the rest of the roster lives in-run and arrives in later
// phases). The full data shape mirrors the eventual NpcDef so the
// engine-side extensions can land without re-typing.

import { ArchetypeId, MetaState } from '../GameTypes';
import { SphereId } from './spheres';

export type NpcInteraction = 'ambient' | 'limited' | 'full';

/** Render context passed into each NPC's `draw` callback. The engine
 *  does the halo + ground-shadow prelude before invoking; the callback
 *  paints the sprite-specific shape on top. */
export interface NpcDrawCtx {
  /** Idle bob phase — used for any per-NPC subtle motion if wanted. */
  phase: number;
  /** Unique entity id, used by Mendicant for the coin-glint modulo. */
  entityId: number;
  /** Accumulated seconds since run start — drives flicker / pulse loops. */
  timeAlive: number;
  /** Current sphere accent colour — used by Penitent to tint the lamp. */
  sphereAccent: string;
}

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  sphere: SphereId | null; // null = universal / hub
  interaction: NpcInteraction;
  /** Hint colour for the portrait outline + caption tag. */
  colour: string;
  /** Ambient lines surfaced as floating text over the NPC the first
   *  time the player walks within range. */
  ambientLines?: string[];
  /** Passive proximity gift — fires while the player stands within
   *  radius for at least `every` seconds. Reed-Cutter style. */
  passive?: {
    kind: 'essence' | 'mp' | 'hp' | 'coin';
    amount: number;
    radius: number;
    every: number;
  };
  /** Sprite-specific draw — called by GameEngine.drawNpcs AFTER the
   *  shared halo + ground-shadow prelude. If omitted, the fallback
   *  silhouette in `drawFallbackNpcSprite` renders. */
  draw?: (ctx: CanvasRenderingContext2D, x: number, y: number, rctx: NpcDrawCtx, def: NpcDef) => void;
}

/** Fallback sprite — a small robed silhouette so an unauthored NPC
 *  still renders. The engine calls this when def.draw is undefined. */
export function drawFallbackNpcSprite(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  _rctx: NpcDrawCtx, def: NpcDef,
): void {
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x - 4, y - 4, 8, 10);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 3, y - 6, 6, 3);
}

// hexToRgbString — duplicated here so npc draw closures don't have to
// import the engine. Identical to the helper in GameEngine.ts.
function hexToRgbString(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}`;
}

// ─── Per-NPC sprite draw functions ──────────────────────────────────
// Each was inline in GameEngine.drawNpcs (~280 lines across 10 NPCs).
// Moving them here lets new NPCs ship as a single data-file edit.

function drawReedCutter(ctx: CanvasRenderingContext2D, x: number, y: number, _r: NpcDrawCtx, def: NpcDef): void {
  // Kneeling silhouette with a sickle + reed-bundle.
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x - 5, y - 2, 10, 8);
  ctx.fillStyle = '#231142';
  ctx.fillRect(x - 4, y - 7, 8, 4);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 4, y - 7, 8, 1);
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 3, y - 5, 6, 2);
  // Sickle — bronze blade leaning across the lap
  ctx.fillStyle = '#a4faf0';
  ctx.fillRect(x + 4, y + 1, 4, 1);
  ctx.fillRect(x + 7, y - 1, 1, 3);
  // Reed bundle at side
  ctx.fillStyle = '#cdf6ff';
  ctx.fillRect(x - 9, y + 2, 3, 4);
  ctx.fillStyle = '#dac8ff';
  ctx.fillRect(x - 9, y + 2, 3, 1);
}

function drawGarlandkeep(ctx: CanvasRenderingContext2D, x: number, y: number, _r: NpcDrawCtx, def: NpcDef): void {
  // Seated tender with garlands strewn around her.
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 12, y + 5, 2, 2);
  ctx.fillRect(x + 9, y + 6, 2, 2);
  ctx.fillRect(x + 3, y + 7, 2, 2);
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x - 5, y - 1, 10, 9);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 6, y + 3, 12, 1);
  ctx.fillStyle = '#5b3a86';
  ctx.fillRect(x - 4, y - 6, 8, 4);
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 3, y - 4, 6, 2);
  ctx.fillStyle = '#ffe6a3';
  ctx.fillRect(x - 1, y - 6, 2, 1);
}

function drawMute(ctx: CanvasRenderingContext2D, x: number, y: number, _r: NpcDrawCtx, def: NpcDef): void {
  // Tall featureless silhouette — the hood swallows the face entirely.
  ctx.fillStyle = '#1a0f2c';
  ctx.fillRect(x - 5, y - 4, 10, 12);
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 4, y - 10, 8, 7);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 4, y - 10, 8, 1);
  ctx.fillRect(x - 4, y - 3, 8, 1);
}

function drawCartographer(ctx: CanvasRenderingContext2D, x: number, y: number, _r: NpcDrawCtx, def: NpcDef): void {
  // Wiry leaning figure with a scroll roll and a quill behind the ear.
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x - 4, y - 2, 8, 9);
  ctx.fillRect(x - 3, y + 7, 6, 1);
  ctx.fillStyle = '#5b3a86';
  ctx.fillRect(x - 4, y - 6, 8, 4);
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 3, y - 4, 6, 2);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x + 3, y - 7, 1, 4);
  ctx.fillStyle = '#dac8ff';
  ctx.fillRect(x - 8, y + 1, 4, 3);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 8, y + 1, 4, 1);
}

function drawSmith(ctx: CanvasRenderingContext2D, x: number, y: number, _r: NpcDrawCtx, def: NpcDef): void {
  // Broad-shouldered with a hammer over the back, anvil glinting beside.
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x + 6, y + 4, 6, 3);
  ctx.fillStyle = '#1a0f2c';
  ctx.fillRect(x + 6, y + 7, 6, 1);
  ctx.fillStyle = '#ff7a3a';
  ctx.fillRect(x + 7, y + 6, 4, 1);
  ctx.fillStyle = '#5a3a18';
  ctx.fillRect(x - 6, y - 2, 12, 9);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 6, y + 3, 12, 1);
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(x - 5, y - 7, 10, 5);
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 4, y - 5, 8, 2);
  ctx.fillStyle = '#dac8ff';
  ctx.fillRect(x - 8, y - 6, 2, 6);
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(x - 9, y - 7, 4, 3);
}

function drawVeteran(ctx: CanvasRenderingContext2D, x: number, y: number, _r: NpcDrawCtx, def: NpcDef): void {
  // Seated cloaked warrior leaning on a notched spear, scar across the helm.
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x - 7, y + 6, 14, 2);
  ctx.fillStyle = '#2a0e1a';
  ctx.fillRect(x - 5, y - 2, 10, 8);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 5, y + 5, 10, 1);
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(x - 5, y - 7, 10, 5);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 4, y - 5, 5, 1);
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 3, y - 4, 6, 2);
  ctx.fillStyle = '#5a3a18';
  ctx.fillRect(x + 4, y - 10, 1, 14);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x + 3, y - 11, 3, 2);
}

function drawLampwright(ctx: CanvasRenderingContext2D, x: number, y: number, r: NpcDrawCtx, def: NpcDef): void {
  // Travelling tinker with a backpack frame draped with small lit lamps.
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(x - 4, y - 1, 8, 8);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 4, y + 5, 8, 1);
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x - 4, y - 5, 8, 4);
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 3, y - 3, 6, 2);
  ctx.fillStyle = '#5a3a18';
  ctx.fillRect(x + 4, y - 8, 1, 12);
  ctx.fillRect(x + 6, y - 8, 1, 12);
  const lampSeed = Math.floor(r.timeAlive * 6);
  for (let li = 0; li < 3; li++) {
    const lx = x + 4 + (li * 2 % 3);
    const ly = y - 6 + li * 4;
    const flick = 0.7 + 0.3 * Math.sin(r.timeAlive * 4 + li + lampSeed * 0.001);
    ctx.fillStyle = '#1a0f2c';
    ctx.fillRect(lx, ly, 2, 2);
    ctx.fillStyle = `rgba(255, 230, 163, ${flick})`;
    ctx.fillRect(lx, ly - 1, 2, 1);
  }
}

function drawMendicant(ctx: CanvasRenderingContext2D, x: number, y: number, r: NpcDrawCtx, def: NpcDef): void {
  // Hunched figure with an outstretched begging bowl; coin glints
  // intermittently in the bowl on a time-based modulo.
  ctx.fillStyle = '#1a0f2c';
  ctx.fillRect(x - 4, y - 1, 8, 8);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 4, y + 6, 8, 1);
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 4, y - 6, 8, 5);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 2, y - 4, 1, 1);
  ctx.fillRect(x + 1, y - 4, 1, 1);
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(x + 4, y + 2, 4, 2);
  ctx.fillStyle = '#5a3a18';
  ctx.fillRect(x + 4, y + 1, 4, 1);
  if ((Math.floor(r.timeAlive) + r.entityId) % 4 === 0) {
    ctx.fillStyle = '#f4d27a';
    ctx.fillRect(x + 5, y + 1, 1, 1);
  }
}

function drawPenitent(ctx: CanvasRenderingContext2D, x: number, y: number, r: NpcDrawCtx, _def: NpcDef): void {
  // Kneeling hooded figure cradling a small lamp that burns in the
  // current sphere's accent colour ("this Warden's lamp"). The accent
  // comes via NpcDrawCtx instead of sphereForFloor so the data layer
  // stays decoupled from the engine.
  const accent = r.sphereAccent;
  const accentRgb = hexToRgbString(accent);
  ctx.fillStyle = '#231142';
  ctx.fillRect(x - 5, y - 1, 10, 7);
  ctx.fillStyle = '#1a0f2c';
  ctx.fillRect(x - 4, y - 6, 8, 4);
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 3, y - 4, 6, 2);
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x - 3, y + 3, 6, 2);
  ctx.fillStyle = '#1a0f2c';
  ctx.fillRect(x - 2, y + 1, 4, 3);
  ctx.fillStyle = accent;
  ctx.fillRect(x - 1, y - 1, 2, 3);
  ctx.fillStyle = '#ffe6a3';
  ctx.fillRect(x, y, 1, 2);
  const lampHalo = ctx.createRadialGradient(x, y, 1, x, y, 10);
  lampHalo.addColorStop(0, `rgba(${accentRgb}, 0.35)`);
  lampHalo.addColorStop(1, `rgba(${accentRgb}, 0)`);
  ctx.fillStyle = lampHalo;
  ctx.fillRect(x - 10, y - 10, 20, 20);
}

function drawDiviner(ctx: CanvasRenderingContext2D, x: number, y: number, _r: NpcDrawCtx, def: NpcDef): void {
  // Tall figure with arms wide, brass-rim mirror at chest level.
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x - 5, y - 2, 10, 10);
  ctx.fillStyle = '#231142';
  ctx.fillRect(x - 4, y - 8, 8, 5);
  ctx.fillStyle = '#f4d27a';
  ctx.fillRect(x - 3, y + 1, 6, 4);
  ctx.fillStyle = '#1a0f2c';
  ctx.fillRect(x - 2, y + 2, 4, 2);
  ctx.fillStyle = '#ffe6a3';
  ctx.fillRect(x - 1, y + 2, 1, 1);
  ctx.fillRect(x + 1, y + 3, 1, 1);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 7, y, 2, 2);
  ctx.fillRect(x + 5, y, 2, 2);
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 3, y - 6, 6, 2);
}

function drawChorister(ctx: CanvasRenderingContext2D, x: number, y: number, r: NpcDrawCtx, def: NpcDef): void {
  // Tall standing figure, arms slightly raised, surrounded by a halo
  // of fixed-star pinpricks. The Chorister hymns the Powers — the
  // light reads as belonging to the cosmos, not to her.
  const accentRgb = hexToRgbString(def.colour);
  // Halo — soft cream radial bloom encompassing the whole sprite
  const halo = ctx.createRadialGradient(x, y - 2, 2, x, y - 2, 22);
  halo.addColorStop(0, `rgba(${accentRgb}, 0.45)`);
  halo.addColorStop(1, `rgba(${accentRgb}, 0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(x - 22, y - 24, 44, 44);
  // Robe — pale ivory
  ctx.fillStyle = '#3b265c';
  ctx.fillRect(x - 4, y - 2, 8, 10);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 5, y + 4, 10, 1);
  ctx.fillRect(x - 4, y + 8, 8, 1);
  // Raised sleeves
  ctx.fillRect(x - 6, y - 1, 2, 4);
  ctx.fillRect(x + 4, y - 1, 2, 4);
  // Hood (open — the Chorister is unhooded, the cosmos sees her face)
  ctx.fillStyle = '#231142';
  ctx.fillRect(x - 4, y - 6, 8, 4);
  ctx.fillStyle = def.colour;
  ctx.fillRect(x - 4, y - 7, 8, 1);
  // Closed-eye serenity — a pale line where the eyes would be
  ctx.fillStyle = '#0a0420';
  ctx.fillRect(x - 3, y - 4, 2, 1);
  ctx.fillRect(x + 1, y - 4, 2, 1);
  // Star pinpricks orbiting — twinkle from `r.timeAlive` so the cosmos
  // breathes around her without animating the sprite
  const t = r.timeAlive;
  ctx.fillStyle = '#fff7d6';
  const stars: [number, number, number][] = [
    [-10, -10, 0], [ 9, -8, 1], [-11,  -1, 2], [11,  2, 3],
    [-7, -14, 4], [ 6, -14, 5], [ -1, -16, 6],
  ];
  for (const [sx, sy, k] of stars) {
    const tw = 0.55 + 0.45 * Math.sin(t * 1.6 + k * 1.3);
    ctx.globalAlpha = tw;
    ctx.fillRect(x + sx, y + sy, 1, 1);
  }
  ctx.globalAlpha = 1;
  // Bright crown-mark at brow — the Eighth Sphere's signature
  ctx.fillStyle = '#fff7d6';
  ctx.fillRect(x - 1, y - 8, 2, 1);
}

export const NPCS: Record<string, NpcDef> = {
  hierophant: {
    id: 'hierophant',
    name: 'The Hierophant',
    title: 'Keeper of the First Threshold',
    sphere: null,
    interaction: 'full',
    colour: '#ffe6a3',
  },
  reedCutter: {
    id: 'reedCutter',
    name: 'The Reed-Cutter',
    title: 'Patient of the Moon',
    sphere: 'moon',
    interaction: 'ambient',
    colour: '#cdf6ff',
    ambientLines: [
      '"The tide does not ask."',
      '"Reeds remember the moon."',
      '"Stay a moment. The water listens."',
    ],
    passive: { kind: 'essence', amount: 1, radius: 40, every: 2.0 },
    draw: drawReedCutter,
  },
  garlandkeep: {
    id: 'garlandkeep',
    name: 'The Garlandkeep',
    title: 'Tender of Venus',
    sphere: 'venus',
    interaction: 'ambient',
    colour: '#ff7a8a',
    ambientLines: [
      '"For the heart you have lost."',
      '"The flower opens because it must."',
      '"Mercy is a blade. Sharpen yours."',
    ],
    // Drops one HP-token every 10 s the player keeps her company.
    passive: { kind: 'hp', amount: 12, radius: 42, every: 10.0 },
    draw: drawGarlandkeep,
  },
  mute: {
    id: 'mute',
    name: 'The Mute',
    title: 'Watcher of Kronos',
    sphere: 'saturn',
    interaction: 'ambient',
    colour: '#9b6cff',
    // Says nothing on purpose. The codex line tied to first contact
    // lives in the codex layer; this NPC stays silent in-game.
    ambientLines: [],
    // Slow heal-over-time: +1 HP every second within range.
    passive: { kind: 'hp', amount: 1, radius: 42, every: 1.0 },
    draw: drawMute,
  },
  cartographer: {
    id: 'cartographer',
    name: 'The Cartographer',
    title: 'Scribe of Hermes',
    sphere: 'mercury',
    // 'limited' surfaces an interact prompt in the engine — one-shot
    // payment for a map reveal. Ambient gifts still flow while the
    // player stands close; the interact unlocks an additional reward.
    interaction: 'limited',
    colour: '#a4faf0',
    ambientLines: [
      '"Every door is a sentence."',
      '"Trade me silence for a rumour."',
      '"Five tears of essence, and the floor unrolls."',
    ],
    passive: { kind: 'mp', amount: 8, radius: 40, every: 5.0 },
    draw: drawCartographer,
  },
  smith: {
    id: 'smith',
    name: 'The Smith',
    title: 'Forge-keeper of Helios',
    sphere: 'sun',
    // 'limited' — interact pays the Smith 30 coins for a permanent
    // +2 attack the rest of the run. The "give me coin and I'll give
    // you weight" line was a tease for an interaction that didn't
    // exist before; now it does.
    interaction: 'limited',
    colour: '#f4d27a',
    ambientLines: [
      '"Brass and bone."',
      '"Give me coin and I\'ll give you weight."',
      '"Thirty coins for the edge that lasts."',
    ],
    passive: { kind: 'coin', amount: 5, radius: 42, every: 4.0 },
    draw: drawSmith,
  },
  veteran: {
    id: 'veteran',
    name: 'The Veteran',
    title: 'Survivor of Ares',
    sphere: 'mars',
    interaction: 'ambient',
    colour: '#e23a4a',
    ambientLines: [
      '"I died on Mars. You will not."',
      '"Strike first. Strike twice. Then run."',
      '"The spear remembers every hand."',
    ],
    passive: { kind: 'essence', amount: 2, radius: 42, every: 8.0 },
    draw: drawVeteran,
  },
  diviner: {
    id: 'diviner',
    name: 'The Diviner',
    title: 'Seer of Jove',
    sphere: 'jupiter',
    interaction: 'ambient',
    colour: '#dac8ff',
    ambientLines: [
      '"Zeus throws five marks."',
      '"The third is yours to stand on."',
      '"Hear the long thunder."',
    ],
    passive: { kind: 'mp', amount: 12, radius: 44, every: 6.0 },
    draw: drawDiviner,
  },
  penitent: {
    id: 'penitent',
    name: 'The Penitent',
    title: 'Mourner of the Lamp',
    sphere: null,           // spawned via boss death, not sphere rolls
    interaction: 'ambient',
    colour: '#ffe6a3',
    // Sphere-keyed lines live in PENITENT_LINES below — the spawner
    // picks one based on the Warden that just fell. We leave this empty
    // so the default ambient-line surfaced is filled in by the engine.
    ambientLines: [],
    draw: drawPenitent,
  },
  mendicant: {
    id: 'mendicant',
    name: 'The Mendicant',
    title: 'Beggar of the In-Between',
    sphere: null,           // universal — appears on any sphere
    interaction: 'ambient',
    colour: '#6cf6e5',
    ambientLines: [
      '"For the lamp."',
      '"Bless your descent."',
      '"You should not have come."',
      '"A coin spared is a coin remembered."',
    ],
    // Spare change — the player who lingers receives 1 essence every
    // 4 s, sustained as long as they keep him company. Felt as "alms
    // returned" rather than a vending transaction.
    passive: { kind: 'essence', amount: 1, radius: 38, every: 4.0 },
    draw: drawMendicant,
  },
  lampwright: {
    id: 'lampwright',
    name: 'The Lampwright',
    title: 'Travelling Tinker',
    sphere: null,
    interaction: 'full',
    colour: '#ffe6a3',
    ambientLines: [
      '"Some descend with one lamp. Some come back with none."',
      '"Take two."',
      '"Coin for the road, initiate."',
    ],
    draw: drawLampwright,
  },
  chorister: {
    id: 'chorister',
    name: 'The Chorister',
    title: 'Singer of the Eighth',
    sphere: 'ogdoad',
    interaction: 'ambient',
    colour: '#fff7d6',
    ambientLines: [
      '"Be silent, son. Listen to the silence."',
      '"Mind to Mind. Word to Word. Light to Light."',
      '"What no tongue can sing, my faculty hymns."',
    ],
    // Generous essence — the climax sphere returns the soul's tribute.
    passive: { kind: 'essence', amount: 3, radius: 44, every: 5.0 },
    draw: drawChorister,
  },
};

/** Lampwright shop catalogue — three consumables at coin prices.
 *  Selected by index inside the shop modal. */
export interface LampwrightWare {
  consumableId: 'healingPhial' | 'manaPhial' | 'cleansingSalt';
  cost: number;
  label: string;
  description: string;
}

export const LAMPWRIGHT_WARES: LampwrightWare[] = [
  { consumableId: 'healingPhial', cost: 25, label: 'Healing Phial',  description: 'A phial of bottled light. Restores 25 HP.' },
  { consumableId: 'manaPhial',    cost: 30, label: 'Mana Phial',     description: 'A phial of cobalt vapour. Restores 30 MP.' },
  { consumableId: 'cleansingSalt',cost: 40, label: 'Cleansing Salt', description: 'Strips debuffs, grants a small shield.' },
];

/** Sphere-keyed lament spoken by the Penitent over a fallen Warden's
 *  lamp. The engine picks the line for the current sphere when the
 *  Penitent spawns; the ambient-line system surfaces it on first
 *  proximity. */
export const PENITENT_LINES: Record<SphereId, string> = {
  moon:    '"Selene asked nothing of us. We gave her everything."',
  mercury: '"Hermes ran the message to its end. He carried it home."',
  venus:   '"The Garlandkeep wept for her. She was a kindness in chains."',
  sun:     '"Helios burned for the door. The door is gone now."',
  mars:    '"Ares only knew the spear. He has nothing else left."',
  jupiter: '"Zeus heard the prayer and answered. Both went silent."',
  saturn:  '"Kronos kept every hour. He has dropped them all at once."',
  ogdoad:  '"The Eighth has no lamp. There is nothing to mourn."',
};

/** Pick the wandering NPC for a given sphere — null if no in-run NPC
 *  is authored for that sphere yet. Each sphere gets at most one
 *  wanderer per the docs/npcs.md plan. */
export function npcForSphere(sphereId: SphereId): NpcDef | null {
  if (sphereId === 'moon')    return NPCS.reedCutter;
  if (sphereId === 'mercury') return NPCS.cartographer;
  if (sphereId === 'venus')   return NPCS.garlandkeep;
  if (sphereId === 'sun')     return NPCS.smith;
  if (sphereId === 'mars')    return NPCS.veteran;
  if (sphereId === 'jupiter') return NPCS.diviner;
  if (sphereId === 'saturn')  return NPCS.mute;
  if (sphereId === 'ogdoad')  return NPCS.chorister;
  return null;
}

/** A single dialogue line — speaker line plus an optional follow-up
 *  string the menu uses to label the "next" advance button. */
export interface NpcLine {
  text: string;
  /** Optional emoji-style cue used by the portrait state (subtle gesture). */
  cue?: 'still' | 'gesture' | 'turn';
}

/** Pick the Hierophant's greeting for the current player state.
 *  Reads `MetaState.runHistory[0]` for the most recent death cause,
 *  `MetaState.ogdoadReached` for the Ogdoad win count, and the daily
 *  history for the latest seeded attempt — returns 1-3 ordered lines
 *  that the menu cycles through on advance. */
export function pickHierophantGreeting(
  meta: MetaState,
  archetype: ArchetypeId | null,
): NpcLine[] {
  const lastRun = meta.runHistory?.[0];
  const ogdoadCount = meta.ogdoadReached ?? 0;
  const lastDaily = meta.dailyHistory?.[0];
  const todayIndex = Math.floor(Date.now() / 86_400_000);
  const dailyCleared = lastDaily && lastDaily.dayIndex === todayIndex && lastDaily.ogdoadReached;

  // First-time greeting — no prior runs at all. Sets the stage.
  if (!lastRun) {
    return [
      { text: '"You are not the first to read the Tabula."', cue: 'still' },
      { text: '"You will not be the last. Take this lamp."', cue: 'gesture' },
      { text: '"Descend, initiate. The Seven wait."', cue: 'turn' },
    ];
  }

  // Last run was an Ogdoad clear — congratulatory but warning.
  if (lastRun.deathCause === 'descend') {
    return [
      { text: '"The Eighth opens, and you walk through it."', cue: 'gesture' },
      { text: '"Few do. Fewer return without losing themselves."', cue: 'still' },
      { text: '"Will you climb again, or stay in the Crown a while?"', cue: 'turn' },
    ];
  }

  // Today's daily was cleared
  if (dailyCleared) {
    return [
      { text: '"Today\'s seal — broken before noon."', cue: 'gesture' },
      { text: '"Tomorrow brings another."', cue: 'still' },
    ];
  }

  // After several Ogdoad clears
  if (ogdoadCount >= 3) {
    return [
      { text: '"You have stood beyond the seventh, more than once."', cue: 'gesture' },
      { text: '"What is left for the soul that has seen its own?"', cue: 'still' },
    ];
  }

  // Slain by a Warden — name them
  const wardenLines: Record<string, string[]> = {
    seleneBoss: [
      '"Selene swallowed your light again. Of course."',
      '"The Moon counts patience as her only virtue. Match hers."',
    ],
    hermesBoss: [
      '"Hermes ran circles. He always does."',
      '"Trade speed for measure, initiate."',
    ],
    aphroditeBoss: [
      '"The Garlandkeep\'s mother wept over you."',
      '"Mercy is a blade. Sharpen yours."',
    ],
    heliosBoss: [
      '"Helios burned. You did not duck."',
      '"Stand sideways to the Sun next time."',
    ],
    aresBoss: [
      '"Ares took you. He takes all of us, eventually."',
      '"Strike first. Strike twice. Then run."',
    ],
    zeusBoss: [
      '"Zeus heard your prayer and answered with thunder."',
      '"Listen to the storm before you stand in it."',
    ],
    kronosBoss: [
      '"Kronos folded your time. He has plenty."',
      '"He keeps every hour you spend in him. Take some back."',
    ],
  };
  if (lastRun.deathCause && wardenLines[lastRun.deathCause]) {
    return wardenLines[lastRun.deathCause].map((text) => ({ text }));
  }

  // Slain by a hazard
  if (lastRun.deathCause?.startsWith('hazard:')) {
    return [
      { text: '"The stones killed you. The stones are not your enemy."', cue: 'still' },
      { text: '"Read the floor before the floor reads you."', cue: 'gesture' },
    ];
  }

  // Slain by a regular enemy — mild rebuke + encouragement
  if (lastRun.deathCause) {
    return [
      { text: '"The Abyss is patient. You are not."', cue: 'still' },
      { text: '"Begin again."', cue: 'turn' },
    ];
  }

  // Default — quit out, or unknown cause
  const archGreeting = archetype === 'magus'
    ? '"The Word is yours to speak. Speak it well."'
    : archetype === 'hermit'
    ? '"The lamp is heavy. Carry it lower."'
    : archetype === 'star'
    ? '"You are light. Light bends, but it does not break."'
    : '"Take the lamp. Choose the form."';
  return [
    { text: '"Returning, initiate?"', cue: 'gesture' },
    { text: archGreeting, cue: 'still' },
  ];
}
