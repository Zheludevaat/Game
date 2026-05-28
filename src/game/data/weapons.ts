import { WeaponDef, WeaponId } from '../GameTypes';

// Balance philosophy: every weapon has a clear PRO and a CON. DPS is
// tuned within ~25 % of the median (~32 atk/s for a 10-attack baseline)
// so all picks are viable; the differentiation is HOW you fight, not
// HOW HARD. Multi-hit weapons (sickles, coil) trade per-hit damage for
// poison stack rate. Slow / heavy weapons (greatsword, sun disc) trade
// swing speed for raw damage + status. Range weapons (halberd, hook,
// trident) trade arc width for reach.

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  // Starter — quick, light, no special status. Compensates the lack of
  // an effect with the best raw attack speed in the game; a Magus
  // landing it consistently lays into 4.5 swings/s. Short reach forces
  // the player into the danger zone.
  tarnishedDagger: {
    id: 'tarnishedDagger',
    name: 'Tarnished Dagger',
    glyph: '🗡',
    description: 'Quick stabs. Best swing speed; shortest reach.',
    swingType: 'thrust',
    damageMul: 0.78,
    cooldown: 0.20,
    duration: 0.12,
    range: 18,
    arcHalf: 0.35,
    knockback: 40,
    hits: 1,
    swingColour: '#f4d27a',
    hiltColour: '#3a2410',
    bladeColour: '#cdd6dc',
    accentColour: '#e23a4a',
    length: 10,
    thickness: 2,
  },
  // Crowd-clear weapon — widest arc in the game (1.05 rad ≈ 120°) plus
  // 110 knockback so a single swing scatters a packed room.
  boneCleaver: {
    id: 'boneCleaver',
    name: 'Bone Cleaver',
    glyph: '🪓',
    description: 'Widest arc. Single swing scatters a packed room.',
    swingType: 'arc',
    damageMul: 1.15,
    cooldown: 0.40,
    duration: 0.22,
    range: 26,
    arcHalf: 1.05,
    knockback: 110,
    hits: 1,
    swingColour: '#ffe6a3',
    hiltColour: '#3a2410',
    bladeColour: '#f5efd8',
    accentColour: '#c8983f',
    length: 14,
    thickness: 5,
  },
  // Longest-reach poke. 34 px range lets it hit through telegraph
  // windows enemies can't close on. Narrow arc keeps it positional.
  ironHalberd: {
    id: 'ironHalberd',
    name: 'Iron Halberd',
    glyph: '⚒',
    description: 'Longest reach. Heavy pushback, narrow arc.',
    swingType: 'lunge',
    damageMul: 1.15,
    cooldown: 0.36,
    duration: 0.18,
    range: 34,
    arcHalf: 0.30,
    knockback: 150,
    hits: 1,
    swingColour: '#cdd6dc',
    hiltColour: '#3a2410',
    bladeColour: '#cdd6dc',
    accentColour: '#7a5a1a',
    length: 22,
    thickness: 3,
  },
  // Two-hit flurry — best at poison-stacking. Each swing applies
  // poison twice (one roll per hit), making it the fastest way to
  // pile DoT on a tank without burning much MP on spells.
  twinSickles: {
    id: 'twinSickles',
    name: 'Twin Sickles',
    glyph: '☽',
    description: 'Two-hit flurry. Best at stacking poison fast.',
    swingType: 'flurry',
    damageMul: 0.52,
    cooldown: 0.28,
    duration: 0.22,
    range: 22,
    arcHalf: 1.0,
    knockback: 50,
    hits: 2,
    appliesStatus: { kind: 'poison', chance: 0.45, duration: 3.0 },
    swingColour: '#9b6cff',
    hiltColour: '#1a0f2c',
    bladeColour: '#a4faf0',
    accentColour: '#9b6cff',
    length: 12,
    thickness: 3,
  },
  // Biggest hit in the game. Single swing peaks at ~3.8× a dagger
  // strike, plus a 55 % burn roll for follow-up DoT. The 0.62 s
  // cooldown is the longest, so missing hurts.
  ashenGreatsword: {
    id: 'ashenGreatsword',
    name: 'Ashen Greatsword',
    glyph: '⚔',
    description: 'Highest single-swing damage. Slow; ember-charred.',
    swingType: 'overhead',
    damageMul: 1.95,
    cooldown: 0.62,
    duration: 0.30,
    range: 30,
    arcHalf: 1.4,
    knockback: 180,
    hits: 1,
    appliesStatus: { kind: 'burn', chance: 0.60, duration: 2.2 },
    swingColour: '#e23a4a',
    hiltColour: '#1a0f2c',
    bladeColour: '#5b3a86',
    accentColour: '#ffe6a3',
    length: 20,
    thickness: 5,
  },
  // Mob-control weapon. Pulls the struck enemy TOWARD the player +
  // briefly stuns them. Designed for caster archetypes: snag a
  // dangerous melee enemy, stun, kite. Damage is moderate.
  ironHook: {
    id: 'ironHook',
    name: 'Iron Hook',
    glyph: '⚓',
    description: 'Pulls struck enemies in and briefly stuns them.',
    swingType: 'thrust',
    damageMul: 0.95,
    cooldown: 0.34,
    duration: 0.18,
    range: 30,
    arcHalf: 0.32,
    knockback: 140,
    hits: 1,
    pullsToward: true,
    appliesStatus: { kind: 'stun', chance: 0.55, duration: 0.5 },
    swingColour: '#cdd6dc',
    hiltColour: '#3a2410',
    bladeColour: '#9fa6ad',
    accentColour: '#c8983f',
    length: 18,
    thickness: 2,
  },
  // Boss-killer poison stab. Highest poison chance + longest poison
  // duration — designed to be wielded against a single high-HP
  // target where DoT outvalues raw damage.
  tridentOfBrass: {
    id: 'tridentOfBrass',
    name: 'Trident of Brass',
    glyph: '♆',
    description: 'Highest poison chance. Best on bosses; narrow arc.',
    swingType: 'thrust',
    damageMul: 1.10,
    cooldown: 0.38,
    duration: 0.20,
    range: 28,
    arcHalf: 0.28,
    knockback: 90,
    hits: 1,
    appliesStatus: { kind: 'poison', chance: 0.70, duration: 4.0 },
    swingColour: '#c8983f',
    hiltColour: '#3a2410',
    bladeColour: '#f4d27a',
    accentColour: '#9b6cff',
    length: 24,
    thickness: 3,
  },
  // The kiting weapon. Every hit slows; wide arc; modest range. Lets
  // you slow a pack and waltz out without taking contact damage.
  // Damage bumped from the original 0.55 → 0.85 so it's actually
  // worth swinging.
  crystallizedTear: {
    id: 'crystallizedTear',
    name: 'Crystallized Tear',
    glyph: '❅',
    description: 'Every hit slows. The kiter\'s blade.',
    swingType: 'arc',
    damageMul: 0.85,
    cooldown: 0.32,
    duration: 0.20,
    range: 24,
    arcHalf: 1.1,
    knockback: 60,
    hits: 1,
    appliesStatus: { kind: 'slow', chance: 1.0, duration: 2.0 },
    swingColour: '#a4faf0',
    hiltColour: '#1a0f2c',
    bladeColour: '#cdd6dc',
    accentColour: '#6cf6e5',
    length: 12,
    thickness: 3,
  },
  // Three-hit whip — most hits per swing in the game. Lowest per-hit
  // damage, but the rapid poison rolls + extended reach make it
  // strong on swarm rooms.
  serpentCoil: {
    id: 'serpentCoil',
    name: 'Serpent Coil',
    glyph: '🜍',
    description: 'Three lashes per swing. Best for swarms.',
    swingType: 'flurry',
    damageMul: 0.42,
    cooldown: 0.34,
    duration: 0.28,
    range: 28,
    arcHalf: 0.85,
    knockback: 40,
    hits: 3,
    appliesStatus: { kind: 'poison', chance: 0.45, duration: 3.0 },
    swingColour: '#9b6cff',
    hiltColour: '#1a0f2c',
    bladeColour: '#c8a4ff',
    accentColour: '#6cf6e5',
    length: 16,
    thickness: 2,
  },
  // Sustain weapon. 100 % burn + 3 HP heal on every kill makes it
  // the only weapon that returns life during a pack-clear. The slow
  // swing is the cost.
  sunDisc: {
    id: 'sunDisc',
    name: 'Sun Disc',
    glyph: '☉',
    description: 'Always burns. Heals 3 HP on every kill.',
    swingType: 'overhead',
    damageMul: 1.85,
    cooldown: 0.58,
    duration: 0.28,
    range: 28,
    arcHalf: 1.2,
    knockback: 140,
    hits: 1,
    appliesStatus: { kind: 'burn', chance: 1.0, duration: 1.8 },
    healOnKill: 3,
    swingColour: '#ffe6a3',
    hiltColour: '#3a2410',
    bladeColour: '#f4d27a',
    accentColour: '#ff7a3a',
    length: 18,
    thickness: 6,
  },
};

export const WEAPON_IDS: WeaponId[] = Object.keys(WEAPONS) as WeaponId[];

// Weapons that can be found in chests / dropped (everything except the starter)
export const WEAPON_LOOT_POOL: WeaponId[] =
  WEAPON_IDS.filter((id) => id !== 'tarnishedDagger');

export const STARTER_WEAPON: WeaponId = 'tarnishedDagger';
