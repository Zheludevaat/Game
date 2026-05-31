import { describe, expect, it } from 'vitest';
import { BOSSES } from './bosses';
import { ENEMY_REGISTRY, enemiesForSphere } from './enemies';
import { SPHERES } from './spheres';

describe('content matrix - bosses', () => {
  it('has a BossDef for every planetary sphere', () => {
    const planetarySpheres = SPHERES.filter((s) => s.id !== 'ogdoad');
    for (const sphere of planetarySpheres) {
      expect(BOSSES[sphere.id]).toBeDefined();
      expect(BOSSES[sphere.id].sphere).toBe(sphere.id);
      expect(BOSSES[sphere.id].displayName).toBeTruthy();
      expect(BOSSES[sphere.id].baseHp).toBeGreaterThan(0);
      expect(BOSSES[sphere.id].patterns.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('has a BossDef for the Eighth Sphere (ogdoad)', () => {
    expect(BOSSES.ogdoad).toBeDefined();
    expect(BOSSES.ogdoad.sphere).toBe('ogdoad');
    expect(BOSSES.ogdoad.baseHp).toBeGreaterThan(0);
  });

  it('each Warden has at least one sphere-specific pattern', () => {
    const sphereSpecificPatterns = [
      'tidalPulse', 'mercurialStep', 'loveBind',
      'solarLance', 'chargeAndSever', 'wrathOfHeaven', 'stopTime',
    ];
    for (const [sphereId, boss] of Object.entries(BOSSES)) {
      if (sphereId === 'ogdoad') continue; // Ogdoad is the merging of all
      const hasUnique = boss.patterns.some((p) => sphereSpecificPatterns.includes(p));
      expect(hasUnique).toBe(true);
    }
  });
});

describe('content matrix - enemies', () => {
  it('every registered enemy has valid non-zero stats', () => {
    for (const enemy of Object.values(ENEMY_REGISTRY)) {
      expect(enemy.baseHp).toBeGreaterThan(0);
      expect(enemy.speed).toBeGreaterThan(0);
      expect(enemy.visualKey).toBeTruthy();
      expect(typeof enemy.behavior).toBe('string');
    }
  });

  it('each sphere returns at least one enemy from enemiesForSphere', () => {
    for (const sphere of SPHERES) {
      const pool = enemiesForSphere(sphere.id);
      expect(pool.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('lesserShade is available in every sphere', () => {
    for (const sphere of SPHERES) {
      const pool = enemiesForSphere(sphere.id);
      expect(pool).toContain('lesserShade');
    }
  });
});
