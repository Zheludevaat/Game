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
];

export const NPC_BY_ID: Record<string, NpcDef> =
  Object.fromEntries(NPCS.map((n) => [n.id, n]));
