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
  },
];

export const SPHERE_BY_ID: Record<SphereId, SphereDef> =
  Object.fromEntries(SPHERES.map((s) => [s.id, s])) as Record<SphereId, SphereDef>;

/**
 * Map a floor number to a sphere. Floors 1–7 → planetary spheres in order
 * (Moon → Saturn); floor 8 → the Ogdoad; floor 9+ cycles through the same
 * 8-floor block (each turn is a new, deeper ascent).
 *
 * Floor 1 is the FIRST sphere reached by the player (the closest to matter),
 * so the array index = floor - 1 within each 8-floor block.
 */
export function sphereForFloor(floor: number): SphereDef {
  if (floor < 1) return SPHERES[0]!;
  const local = ((floor - 1) % 8) + 1;
  if (local === 8) return SPHERE_BY_ID.ogdoad;
  return SPHERES[local - 1]!;
}

/** True when the floor number is the Ogdoad (every 8th floor). */
export function isOgdoadFloor(floor: number): boolean {
  if (floor < 1) return false;
  return ((floor - 1) % 8) + 1 === 8;
}
