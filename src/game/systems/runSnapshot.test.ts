import { describe, expect, it } from 'vitest';
import { RUN_SNAPSHOT_VERSION, RunSnapshot } from './runSnapshot';

describe('run snapshot', () => {
  it('uses a versioned schema', () => {
    const snapshot: RunSnapshot = {
      version: RUN_SNAPSHOT_VERSION,
      archetype: 'magus',
      runSeed: 123,
      floor: 3,
      roomId: 1,
      hp: 10, maxHp: 50,
      mp: 5, maxMp: 30,
      coins: 7,
      keys: 1,
      weapons: ['tarnishedDagger'],
      spells: ['sparkBolt'],
      relics: [],
      defeatedWardenIds: ['moon'],
      openedChestRoomIds: [],
      clearedRoomIds: [1],
      shrineUsedRoomIds: [],
    };
    expect(snapshot.version).toBe(1);
  });
});
