import { describe, expect, it } from 'vitest';
import { DEFAULT_GAMEPAD_MAP } from './controlMappings';

describe('control mappings', () => {
  it('names cycle actions by the actual game verbs', () => {
    expect(DEFAULT_GAMEPAD_MAP).toHaveProperty('cycleWeapon');
    expect(DEFAULT_GAMEPAD_MAP).toHaveProperty('cycleSpell');
    expect(DEFAULT_GAMEPAD_MAP).not.toHaveProperty('cycleRelic');
    expect(DEFAULT_GAMEPAD_MAP).not.toHaveProperty('useItem');
  });
});
