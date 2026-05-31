import { describe, expect, it } from 'vitest';
import { getDialogueView } from './dialogue';
import { NpcDef } from '../data/npcs';

const npc: NpcDef = {
  id: 'test',
  name: 'Tester',
  sphere: null,
  interaction: 'full',
  spawnRule: 'sanctuary',
  dialogue: {
    lines: [{ speaker: 'Tester', text: 'First.' }, { speaker: 'Tester', text: 'Second.' }],
    choices: [{ label: 'Close', closesDialogue: true }],
  },
};

describe('dialogue resolver', () => {
  it('shows choices only on the final line', () => {
    expect(getDialogueView(npc, 0)?.choices).toEqual([]);
    expect(getDialogueView(npc, 1)?.choices).toEqual([{ label: 'Close', closesDialogue: true }]);
  });

  it('returns null for missing dialogue', () => {
    const noDialogue: NpcDef = {
      id: 'silent',
      name: 'Silent',
      sphere: null,
      interaction: 'ambient',
      spawnRule: 'sanctuary',
    };
    expect(getDialogueView(noDialogue, 0)).toBeNull();
  });

  it('returns null for out-of-bounds line index', () => {
    expect(getDialogueView(npc, 99)).toBeNull();
  });

  it('sets canAdvance true for non-final lines', () => {
    expect(getDialogueView(npc, 0)?.canAdvance).toBe(true);
    expect(getDialogueView(npc, 1)?.canAdvance).toBe(false);
  });

  it('uses line speaker when present', () => {
    const view = getDialogueView(npc, 0);
    expect(view?.speaker).toBe('Tester');
  });
});
