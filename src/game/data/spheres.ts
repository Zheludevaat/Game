// The Seven Governors and the Eighth Sphere.
//
// The cosmology of the Corpus Hermeticum I (Poimandres) places the soul,
// during its descent into incarnation, under the rule of seven planetary
// rings — Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn — and posits
// an Eighth Nature (the Ogdoad, the Sphere of the Fixed Stars) which the
// soul, in its ascent, reaches once it has surrendered the influence of
// each ring (Pimander I.25).
//
// In-game we map dungeon floors to spheres in ascending order of dignity.
// Floor 1 sits closest to the material world (the Moon) and floor 7
// closest to the Boundary; floor 8 is the Ogdoad, the climactic reach.
// Beyond the Ogdoad the cycle repeats deeper into the abyss (endless mode)
// — each turn around the spheres is a new ascent through harder matter.

export type SphereId =
  | 'moon' | 'mercury' | 'venus' | 'sun'
  | 'mars' | 'jupiter' | 'saturn' | 'ogdoad';

export type SphereMotif =
  | 'lunar-tide' | 'mercury-rivet' | 'venus-petal' | 'sun-spiral'
  | 'mars-scar' | 'jupiter-cog' | 'saturn-crack' | 'ogdoad-star';

export interface SphereDef {
  id: SphereId;
  /** Roman ordinal — "I", "II", ... "VIII" */
  numeral: string;
  /** "Sphere of the Moon" */
  name: string;
  /** Greek divine name — "Selene", "Hermes", … */
  godName: string;
  /** Single-character planetary glyph */
  glyph: string;
  /** Vice or principle the soul surrenders here (Pimander I.25) */
  surrender: string;
  /** Short inscription, used on the floor banner */
  inscription: string;
  /** Hex colour for the sphere's accent */
  colour: string;
  /** Secondary palette colour */
  accent: string;
  /** Multiply-pass ambient tint applied over the full room. Per-sphere
   *  values give Sun a warm gold cast, Saturn a cold violet, Moon a
   *  cool silver — without this every floor reads as the same
   *  cool-lavender room with a swapped accent. */
  ambientTint: string;
  /** Mortar + crack colour for `drawFloorTile`. Subtle but ties the
   *  floor decoration into the per-sphere palette. */
  floorMortar: string;
  /** Ornament motif dispatched in `drawFloorTile` — replaces the
   *  hardcoded teal rune mark with a sphere-themed micro-decal. */
  floorMotif: SphereMotif;
  /** Wall-carved sigil colour rendered in `drawWallTile`. */
  wallSigil: string;
  /** Wall motif dispatched in `drawWallTile`. */
  wallMotif: SphereMotif;
}

export const SPHERES: SphereDef[] = [
  {
    id: 'moon',
    numeral: 'I',
    name: 'Sphere of the Moon',
    godName: 'Selene',
    glyph: '☾',
    surrender: 'the energy of growth and waning',
    inscription: 'I — Selene. Where the body remembers the tide.',
    colour: '#cdd6dc',
    accent: '#6c8cff',
    ambientTint: 'rgb(205, 215, 230)',
    floorMortar: '#1c1530',
    floorMotif: 'lunar-tide',
    wallSigil: '#a8c0e8',
    wallMotif: 'lunar-tide',
  },
  {
    id: 'mercury',
    numeral: 'II',
    name: 'Sphere of Mercury',
    godName: 'Hermes',
    glyph: '☿',
    surrender: 'the device of evils, and deceit no longer working',
    inscription: 'II — Hermes. The quicksilver tongue, sundered.',
    colour: '#6cf6e5',
    accent: '#1f8a86',
    ambientTint: 'rgb(200, 230, 235)',
    floorMortar: '#0e2230',
    floorMotif: 'mercury-rivet',
    wallSigil: '#6cf6e5',
    wallMotif: 'mercury-rivet',
  },
  {
    id: 'venus',
    numeral: 'III',
    name: 'Sphere of Venus',
    godName: 'Aphrodite',
    glyph: '♀',
    surrender: 'the illusion of desire, no longer working',
    inscription: 'III — Aphrodite. Many loves, one Beloved unknown.',
    colour: '#ff9bc1',
    accent: '#9b6cff',
    ambientTint: 'rgb(235, 210, 220)',
    floorMortar: '#2a1430',
    floorMotif: 'venus-petal',
    wallSigil: '#ff9bc1',
    wallMotif: 'venus-petal',
  },
  {
    id: 'sun',
    numeral: 'IV',
    name: 'Sphere of the Sun',
    godName: 'Helios',
    glyph: '☉',
    surrender: 'the ruling arrogance, no longer being filled',
    inscription: 'IV — Helios. Mistake not the lamp for the Light.',
    colour: '#f4d27a',
    accent: '#ffe6a3',
    ambientTint: 'rgb(240, 230, 200)',
    floorMortar: '#3a2010',
    floorMotif: 'sun-spiral',
    wallSigil: '#ffe6a3',
    wallMotif: 'sun-spiral',
  },
  {
    id: 'mars',
    numeral: 'V',
    name: 'Sphere of Mars',
    godName: 'Ares',
    glyph: '♂',
    surrender: 'the unholy daring and the rashness of audacity',
    inscription: 'V — Ares. The sword that severs is not the sword that knows.',
    colour: '#e23a4a',
    accent: '#ff7a5a',
    ambientTint: 'rgb(235, 195, 195)',
    floorMortar: '#3a0e16',
    floorMotif: 'mars-scar',
    wallSigil: '#7a1020',
    wallMotif: 'mars-scar',
  },
  {
    id: 'jupiter',
    numeral: 'VI',
    name: 'Sphere of Jupiter',
    godName: 'Zeus',
    glyph: '♃',
    surrender: 'the striving for wealth by evil means, deprived of its means',
    inscription: 'VI — Zeus. The vessel too wide to hold its light.',
    colour: '#c8983f',
    accent: '#f4d27a',
    ambientTint: 'rgb(235, 220, 195)',
    floorMortar: '#2a1c10',
    floorMotif: 'jupiter-cog',
    wallSigil: '#c8983f',
    wallMotif: 'jupiter-cog',
  },
  {
    id: 'saturn',
    numeral: 'VII',
    name: 'Sphere of Saturn',
    godName: 'Kronos',
    glyph: '♄',
    surrender: 'the falsehood that doth ensnare',
    inscription: 'VII — Kronos. Beyond is no clock, and no need of one.',
    colour: '#3b265c',
    accent: '#5b3a86',
    ambientTint: 'rgb(195, 185, 220)',
    floorMortar: '#0e0a18',
    floorMotif: 'saturn-crack',
    wallSigil: '#5a8b50',
    wallMotif: 'saturn-crack',
  },
  {
    id: 'ogdoad',
    numeral: 'VIII',
    name: 'The Ogdoad',
    godName: 'The Eighth Nature',
    glyph: '✴',
    surrender: 'nothing — for nothing remains to be surrendered',
    inscription: 'VIII — The Eighth. Hymn with the Powers to the Father.',
    colour: '#ffe6a3',
    accent: '#fff7d6',
    ambientTint: 'rgb(230, 225, 235)',
    floorMortar: '#0a0820',
    floorMotif: 'ogdoad-star',
    wallSigil: '#fff7d6',
    wallMotif: 'ogdoad-star',
  },
];

export const SPHERE_BY_ID: Record<SphereId, SphereDef> =
  Object.fromEntries(SPHERES.map((s) => [s.id, s])) as Record<SphereId, SphereDef>;

/**
 * Map a floor number to a sphere. Floors 1–7 → planetary spheres in order
 * (Moon → Saturn); floor 8 → the Ogdoad; floor 9+ cycles back through the
 * planetary spheres (each turn is a new, deeper ascent).
 *
 * Floor 1 is the FIRST sphere reached by the player (the closest to matter),
 * so the array index = floor - 1.
 */
export function sphereForFloor(floor: number): SphereDef {
  if (floor < 1) return SPHERES[0]!;
  if (floor === 8) return SPHERE_BY_ID.ogdoad;
  const idx = (floor - 1) % 7;
  return SPHERES[idx]!;
}

/** True only the first time the player ever stands in the Eighth Sphere. */
export function isOgdoadFloor(floor: number): boolean {
  return floor === 8;
}
