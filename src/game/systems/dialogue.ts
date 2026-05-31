import { DialogueChoice, DialogueTree, NpcDef } from '../data/npcs';

export interface DialogueView {
  speaker: string;
  text: string;
  choices: DialogueChoice[];
  canAdvance: boolean;
}

export function getDialogueView(npc: NpcDef, lineIndex: number): DialogueView | null {
  const tree = npc.dialogue;
  if (!tree) return null;
  const line = tree.lines[lineIndex];
  if (!line) return null;
  const isLastLine = lineIndex >= tree.lines.length - 1;
  return {
    speaker: line.speaker || npc.name,
    text: line.text,
    choices: isLastLine ? tree.choices ?? [] : [],
    canAdvance: !isLastLine,
  };
}
