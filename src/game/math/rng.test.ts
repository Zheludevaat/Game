import { describe, it, expect } from 'vitest';
import { RNG, hashSeed } from './rng';

describe('RNG', () => {
  it('produces deterministic output for the same seed', () => {
    const a = new RNG(42);
    const b = new RNG(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different output for different seeds', () => {
    const a = new RNG(42);
    const b = new RNG(99);
    const results: boolean[] = [];
    for (let i = 0; i < 100; i++) {
      if (a.next() !== b.next()) results.push(true);
    }
    expect(results.some(Boolean)).toBe(true);
  });

  it('int generates values in [min, max)', () => {
    const rng = new RNG(7);
    for (let i = 0; i < 200; i++) {
      const n = rng.int(2, 8);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThan(8);
    }
  });

  it('chance returns boolean based on probability', () => {
    const rng = new RNG(13);
    let trues = 0;
    for (let i = 0; i < 1000; i++) {
      if (rng.chance(0.5)) trues++;
    }
    // Should be roughly around 500, with generous bounds
    expect(trues).toBeGreaterThan(300);
    expect(trues).toBeLessThan(700);
  });

  it('range generates values within [min, max)', () => {
    const rng = new RNG(21);
    for (let i = 0; i < 100; i++) {
      const n = rng.range(10, 20);
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThan(20);
    }
  });
});

describe('hashSeed', () => {
  it('is deterministic', () => {
    const a = hashSeed(42, 1);
    const b = hashSeed(42, 1);
    expect(a).toBe(b);
  });

  it('produces different values for different inputs', () => {
    const a = hashSeed(42, 1);
    const b = hashSeed(42, 2);
    expect(a).not.toBe(b);
  });
});
