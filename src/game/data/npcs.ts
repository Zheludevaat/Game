import { ArchetypeId, RelicId } from '../GameTypes';
import { SphereId } from './spheres';

// ─── Types ─────────────────────────────────────────────────────────────

export type NpcInteraction = 'ambient' | 'limited' | 'full';

export interface DialogueLine {
  speaker: string;
  text: string;
  emote?: 'still' | 'gesture' | 'turn';
}

export interface DialogueChoice {
  label: string;
  cost?: { kind: 'coins' | 'essence'; amount: number };
  effect?: string; // effect id resolved by the engine
  gotoLine?: number;
  closesDialogue?: boolean;
}

export interface DialogueTree {
  lines: DialogueLine[];
  choices?: DialogueChoice[];
  postLines?: DialogueLine[];
}

export interface NpcPassive {
  kind: 'heal' | 'mp' | 'essence';
  perSec: number;
  radius: number;
}

export type NpcSpawnRule = 'sanctuary' | 'rare' | 'bossDefeated';

export interface NpcDef {
  id: string;
  name: string;
  sphere?: SphereId | null;  // null = universal
  interaction: NpcInteraction;
  dialogue?: DialogueTree;
  ambientLine?: string;
  passive?: NpcPassive;
  spawnRule: NpcSpawnRule;
  weight?: number;
}

// ─── NPC registry ──────────────────────────────────────────────────────

export const NPCS: NpcDef[] = [
  {
    id: 'mute',
    name: 'The Mute',
    sphere: 'saturn',
    interaction: 'ambient',
    ambientLine: '…',
    passive: { kind: 'heal', perSec: 1, radius: 40 },
    spawnRule: 'sanctuary',
  },
  {
    id: 'echo',
    name: 'An Echo',
    sphere: null,
    interaction: 'ambient',
    ambientLine: 'I almost saw it.',
    spawnRule: 'rare',
    weight: 5,
  },
  {
    id: 'hierophant',
    name: 'The Hierophant',
    sphere: null,
    interaction: 'full',
    dialogue: {
      lines: [
        { speaker: 'Hierophant', text: 'The ascent demands sacrifice. Each sphere strips away what you thought you were.' },
        { speaker: 'Hierophant', text: 'When the seventh lamp is lit, the Ogdoad opens. But only for those who have paid the price in full.' },
      ],
      choices: [
        { label: 'I understand.', closesDialogue: true },
      ],
    },
    spawnRule: 'sanctuary',
  },
  {
    id: 'smith',
    name: 'The Smith',
    sphere: null,
    interaction: 'full',
    dialogue: {
      lines: [
        { speaker: 'Smith', text: 'Let me see your blade. I can reforge it — for a price.' },
        { speaker: 'Smith', text: 'What do you offer?' },
      ],
      choices: [
        { label: 'Pay 12 coins — upgrade weapon', cost: { kind: 'coins', amount: 12 }, effect: 'upgradeWeapon' },
        { label: 'Not now.', closesDialogue: true },
      ],
    },
    spawnRule: 'sanctuary',
  },
  {
    id: 'diviner',
    name: 'The Diviner',
    sphere: null,
    interaction: 'full',
    dialogue: {
      lines: [
        { speaker: 'Diviner', text: 'I see the Warden that awaits you. Its gaze is fixed upon this place.' },
        { speaker: 'Diviner', text: 'Would you like to know what stands between you and the next sphere?' },
      ],
      choices: [
        { label: 'Reveal the Warden', effect: 'revealBoss' },
        { label: 'I\'ll face it blind.', closesDialogue: true },
      ],
    },
    spawnRule: 'sanctuary',
  },
  {
    id: 'lampwright',
    name: 'The Lampwright',
    sphere: null,
    interaction: 'full',
    dialogue: {
      lines: [
        { speaker: 'Lampwright', text: 'The lamps grow dim. Let me kindle what I can.' },
        { speaker: 'Lampwright', text: 'What do you need?' },
      ],
      choices: [
        { label: 'Restore a lamp', effect: 'restoreLamp' },
        { label: 'Heal me', cost: { kind: 'coins', amount: 6 }, effect: 'healFull' },
        { label: 'No need.', closesDialogue: true },
      ],
    },
    spawnRule: 'sanctuary',
  },
];

export const NPC_BY_ID: Record<string, NpcDef> =
  Object.fromEntries(NPCS.map((n) => [n.id, n]));
