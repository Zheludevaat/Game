import { describe, expect, it } from 'vitest';
import { createTestEngine } from './testing/createTestEngine';

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
});
