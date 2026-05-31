import { describe, expect, it } from 'vitest';
import { createTestEngine } from './testing/createTestEngine';
import { RUN_SNAPSHOT_VERSION, RunSnapshot } from './systems/runSnapshot';

const defeatedWardens = ['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn'];

function floorEightSnapshot(): RunSnapshot {
  return {
    version: RUN_SNAPSHOT_VERSION,
    archetype: 'magus',
    runSeed: 1234,
    floor: 8,
    roomId: 1,
    hp: 30,
    maxHp: 60,
    mp: 10,
    maxMp: 40,
    coins: 0,
    keys: 1,
    weapons: ['tarnishedDagger'],
    spells: ['sparkBolt'],
    relics: [],
    defeatedWardenIds: defeatedWardens,
    openedChestRoomIds: [],
    clearedRoomIds: [1],
    shrineUsedRoomIds: [],
  };
}

describe('GameEngine progression', () => {
  it('does not fire Ogdoad ending before seven Wardens are defeated', () => {
    const { engine, callbacks } = createTestEngine();
    engine.setDebugBossesDefeated(6);
    engine.goToFloorForTest(8);
    expect(callbacks.ogdoadReached).not.toHaveBeenCalled();
  });

  it('fires Ogdoad ending after seven Wardens are defeated', () => {
    const { engine, callbacks } = createTestEngine();
    engine.setDebugBossesDefeated(7);
    engine.goToFloorForTest(8);
    expect(callbacks.ogdoadReached).toHaveBeenCalledTimes(1);
  });

  it('does not fire Ogdoad ending on non-Ogdoad floors even with 7 Wardens', () => {
    const { engine, callbacks } = createTestEngine();
    engine.setDebugBossesDefeated(7);
    engine.goToFloorForTest(7);
    expect(callbacks.ogdoadReached).not.toHaveBeenCalled();
  });

  it('fires Ogdoad ending when resuming a saved floor 8 run after all Wardens', () => {
    const { engine, callbacks } = createTestEngine();
    engine.initForTest();

    engine.applyResumeSnapshotForTest(floorEightSnapshot());

    expect(callbacks.ogdoadReached).toHaveBeenCalledTimes(1);
  });
});
