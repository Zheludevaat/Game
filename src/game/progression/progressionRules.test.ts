import { describe, it, expect } from 'vitest';
import {
  storyCycleIndexForFloor,
  isPlanetaryWardenFloor,
  isOgdoadFloorNumber,
  sphereForProgressionFloor,
  requiredWardenIdsBeforeOgdoad,
  isSaturnWardenFloor,
} from './progressionRules';

describe('progressionRules', () => {
  describe('storyCycleIndexForFloor', () => {
    it('returns 0 for floors 1–8', () => {
      for (let f = 1; f <= 8; f++) {
        expect(storyCycleIndexForFloor(f)).toBe(0);
      }
    });

    it('returns 1 for floors 9–16', () => {
      for (let f = 9; f <= 16; f++) {
        expect(storyCycleIndexForFloor(f)).toBe(1);
      }
    });

    it('returns 0 for floor < 1', () => {
      expect(storyCycleIndexForFloor(0)).toBe(0);
      expect(storyCycleIndexForFloor(-1)).toBe(0);
    });
  });

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

  describe('isOgdoadFloorNumber', () => {
    it('floor 8 is the Ogdoad', () => {
      expect(isOgdoadFloorNumber(8)).toBe(true);
    });

    it('floor 16 is the Ogdoad (next cycle)', () => {
      expect(isOgdoadFloorNumber(16)).toBe(true);
    });

    it('floors 1–7 are not the Ogdoad', () => {
      for (let f = 1; f <= 7; f++) {
        expect(isOgdoadFloorNumber(f)).toBe(false);
      }
    });

    it('returns false for floor 0 and below', () => {
      expect(isOgdoadFloorNumber(0)).toBe(false);
      expect(isOgdoadFloorNumber(-1)).toBe(false);
    });
  });

  describe('sphereForProgressionFloor', () => {
    const expectedPlanetaryIds = ['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn'];

    it('floors 1–7 map to planetary Wardens in order', () => {
      for (let f = 1; f <= 7; f++) {
        const sphere = sphereForProgressionFloor(f);
        expect(sphere.id).toBe(expectedPlanetaryIds[f - 1]);
      }
    });

    it('floor 8 is the Ogdoad', () => {
      const sphere = sphereForProgressionFloor(8);
      expect(sphere.id).toBe('ogdoad');
    });

    it('floor 9 resumes at moon', () => {
      const sphere = sphereForProgressionFloor(9);
      expect(sphere.id).toBe('moon');
    });

    it('returns moon for floor 0 and below', () => {
      expect(sphereForProgressionFloor(0).id).toBe('moon');
      expect(sphereForProgressionFloor(-1).id).toBe('moon');
    });
  });

  describe('requiredWardenIdsBeforeOgdoad', () => {
    it('returns all seven planetary sphere IDs', () => {
      const ids = requiredWardenIdsBeforeOgdoad();
      expect(ids).toEqual(['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn']);
      expect(ids).toHaveLength(7);
    });
  });

  describe('isSaturnWardenFloor', () => {
    it('floor 7 is Saturn Warden', () => {
      expect(isSaturnWardenFloor(7)).toBe(true);
    });

    it('floor 15 is Saturn Warden (next cycle)', () => {
      expect(isSaturnWardenFloor(15)).toBe(true);
    });

    it('floor 8 is not Saturn Warden (it is the Ogdoad)', () => {
      expect(isSaturnWardenFloor(8)).toBe(false);
    });

    it('floor 6 is not Saturn Warden', () => {
      expect(isSaturnWardenFloor(6)).toBe(false);
    });
  });
});
