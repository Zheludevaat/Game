export interface AudioDiagnosticsSnapshot {
  activeCue: string | null;
  transportState: string;
  scheduledEvents: number;
  disposableCount: number;
  peakDb: number;
  clipping: boolean;
}

export function peakToDb(peak: number): number {
  if (peak <= 0) return -Infinity;
  return 20 * Math.log10(peak);
}

export function isClippingPeak(peak: number): boolean {
  return peak >= 0.98;
}
