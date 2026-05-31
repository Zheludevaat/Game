import { describe, expect, it } from 'vitest';
import { isClippingPeak, peakToDb } from './audioDiagnostics';

describe('audio diagnostics', () => {
  it('converts peaks to decibels', () => {
    expect(peakToDb(1)).toBeCloseTo(0);
    expect(peakToDb(0.5)).toBeCloseTo(-6.0205, 3);
  });

  it('flags near-full-scale peaks as clipping risk', () => {
    expect(isClippingPeak(0.97)).toBe(false);
    expect(isClippingPeak(0.98)).toBe(true);
  });
});
