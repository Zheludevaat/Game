import { describe, expect, it } from 'vitest';
import { createTestEngine } from './testing/createTestEngine';
import { RNG } from './math/rng';

describe('deterministic rewards', () => {
  it('identical seeds produce identical RNG state', () => {
    const e1 = createTestEngine();
    e1.engine.setDebugRngSeed(12345);
    const e2 = createTestEngine();
    e2.engine.setDebugRngSeed(12345);

    expect(e1.engine.getDebugRngState()).toBe(e2.engine.getDebugRngState());
  });

  it('different seeds produce different RNG state', () => {
    const e1 = createTestEngine();
    e1.engine.setDebugRngSeed(12345);
    const e2 = createTestEngine();
    e2.engine.setDebugRngSeed(67890);

    expect(e1.engine.getDebugRngState()).not.toBe(e2.engine.getDebugRngState());
  });

  it('RNG produces deterministic sequences from same seed', () => {
    const rng1 = new RNG(42);
    const rng2 = new RNG(42);

    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('randChance is deterministic with same seed', () => {
    const rng1 = new RNG(99);
    const rng2 = new RNG(99);
    const probs = [0.25, 0.5, 0.75, 0.1, 0.9];

    for (const p of probs) {
      expect(rng1.chance(p)).toBe(rng2.chance(p));
    }
  });

  it('randInt produces same values for same seed', () => {
    const rng1 = new RNG(77);
    const rng2 = new RNG(77);

    for (let i = 0; i < 50; i++) {
      expect(rng1.int(0, 100)).toBe(rng2.int(0, 100));
    }
  });

  it('randPick produces same picks for same seed', () => {
    const rng1 = new RNG(55);
    const rng2 = new RNG(55);
    const items = [10, 20, 30, 40, 50];

    for (let i = 0; i < 20; i++) {
      expect(rng1.pick(items)).toBe(rng2.pick(items));
    }
  });
});
