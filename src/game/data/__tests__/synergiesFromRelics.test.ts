import { describe, expect, it } from 'vitest';
import { RELIC_SYNERGIES, SYNERGY_IDS, synergiesFromRelics } from '../relicSynergies';
import { RelicId } from '../../GameTypes';

// synergiesFromRelics is the core gate that drives every paired-relic
// behaviour in the engine. If a synergy fires too eagerly (with one
// relic) or refuses to fire when both relics are owned, dozens of
// downstream effects silently break.

describe('synergiesFromRelics', () => {
  it('returns no synergies for an empty relic set', () => {
    expect(synergiesFromRelics([])).toEqual([]);
  });

  it('returns no synergies when only one parent of a pair is owned', () => {
    for (const id of SYNERGY_IDS) {
      const [a] = RELIC_SYNERGIES[id].pair;
      expect(synergiesFromRelics([a]), `synergy ${id} fired with only ${a}`).not.toContain(id);
    }
  });

  it('returns the synergy when both parents are owned', () => {
    for (const id of SYNERGY_IDS) {
      const [a, b] = RELIC_SYNERGIES[id].pair;
      expect(synergiesFromRelics([a, b]), `synergy ${id} should fire with ${a}+${b}`).toContain(id);
    }
  });

  it('returns multiple synergies when multiple pairs are complete', () => {
    // Pull two disjoint pairs from the registry to test compound state.
    const ids = SYNERGY_IDS.slice(0, 2);
    const relics: RelicId[] = [];
    for (const id of ids) relics.push(...RELIC_SYNERGIES[id].pair);
    const got = synergiesFromRelics(relics);
    for (const id of ids) {
      expect(got, `compound case missing ${id}`).toContain(id);
    }
  });

  it('order of relics does not affect the result', () => {
    const id = SYNERGY_IDS[0];
    const [a, b] = RELIC_SYNERGIES[id].pair;
    expect(synergiesFromRelics([a, b])).toEqual(synergiesFromRelics([b, a]));
  });
});
