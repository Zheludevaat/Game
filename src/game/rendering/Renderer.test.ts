import { describe, expect, it } from 'vitest';
import { computeViewportTransform } from './Renderer';

describe('computeViewportTransform', () => {
  it('contains the full virtual room on extra-wide iPhone landscape screens', () => {
    const view = computeViewportTransform(852, 393);

    expect(view.offY).toBeGreaterThanOrEqual(0);
    expect(view.height).toBeLessThanOrEqual(393);
    expect(view.width).toBeLessThanOrEqual(852);
  });
});
