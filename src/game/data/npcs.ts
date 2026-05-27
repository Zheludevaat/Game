// Non-hostile NPC data — kicks off the deferred Track 3 work tracked
// in docs/npcs.md. Phase A here ships only the Hierophant on the main
// menu (the rest of the roster lives in-run and arrives in later
// phases). The full data shape mirrors the eventual NpcDef so the
// engine-side extensions can land without re-typing.

import { ArchetypeId, MetaState } from '../GameTypes';
import { SphereId } from './spheres';

export type NpcInteraction = 'ambient' | 'limited' | 'full';

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
  },
  cartographer: {
    id: 'cartographer',
    name: 'The Cartographer',
    title: 'Scribe of Hermes',
    sphere: 'mercury',
    interaction: 'ambient',
    colour: '#a4faf0',
    ambientLines: [
      '"Every door is a sentence."',
      '"You are four chambers from the stair."',
      '"Trade me silence for a rumour."',
    ],
    passive: { kind: 'mp', amount: 8, radius: 40, every: 5.0 },
  },
  smith: {
    id: 'smith',
    name: 'The Smith',
    title: 'Forge-keeper of Helios',
    sphere: 'sun',
    interaction: 'ambient',
    colour: '#f4d27a',
    ambientLines: [
      '"Brass and bone."',
      '"Give me coin and I\'ll give you weight."',
      '"The Sun forges twice — once with fire, once with patience."',
    ],
    passive: { kind: 'coin', amount: 5, radius: 42, every: 4.0 },
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
  },
};

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
