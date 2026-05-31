import { describe, expect, it } from 'vitest';
import { isPlanetaryWardenFloor, requiredWardenIdsBeforeOgdoad } from './progressionRules';

describe('progressionRules', () => {
  describe('isPlanetaryWardenFloor', () => {
    it('floors 1–7 are planetary Warden floors', () => {
      for (let f = 1; f <= 7; f++) {
        expect(isPlanetaryWardenFloor(f)).toBe(true);
      }
    });

    it('floor 8 is not a planetary Warden floor', () => {
      expect(isPlanetaryWardenFloor(8)).toBe(false);
    });

    it('floors 9–15 are planetary Warden floors (next cycle)', () => {
      for (let f = 9; f <= 15; f++) {
        expect(isPlanetaryWardenFloor(f)).toBe(true);
      }
    });

    it('floor 16 is not a planetary Warden floor', () => {
      expect(isPlanetaryWardenFloor(16)).toBe(false);
    });

    it('returns false for floor 0 and below', () => {
      expect(isPlanetaryWardenFloor(0)).toBe(false);
      expect(isPlanetaryWardenFloor(-1)).toBe(false);
    });
  });

  describe('requiredWardenIdsBeforeOgdoad', () => {
    it('returns all seven planetary sphere IDs', () => {
      const ids = requiredWardenIdsBeforeOgdoad();
      expect(ids).toEqual(['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn']);
      expect(ids).toHaveLength(7);
    });
  });
});
