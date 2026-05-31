import { describe, expect, it } from 'vitest';
import { canEnterOgdoad, recordBossDefeat } from './progression';

describe('progression system', () => {
  it('requires each planetary Warden id before Ogdoad entry', () => {
    expect(canEnterOgdoad(['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter'])).toBe(false);
    expect(canEnterOgdoad(['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn'])).toBe(true);
  });

  it('does not treat duplicate Warden defeats as seven lamps', () => {
    expect(canEnterOgdoad(['moon', 'moon', 'moon', 'moon', 'moon', 'moon', 'moon'])).toBe(false);
  });

  it('records Warden sphere ids once', () => {
    expect(recordBossDefeat('moon', [])).toEqual(['moon']);
    expect(recordBossDefeat('moon', ['moon'])).toEqual(['moon']);
  });
});
