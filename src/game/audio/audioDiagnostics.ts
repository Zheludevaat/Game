export interface AudioDiagnosticsSnapshot {
  activeCue: string | null;
  transportState: string;
  activeNodeCount: number;
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

/** dBFS threshold corresponding to a linear peak of 0.98. */
export const CLIP_DB_THRESHOLD = -0.18;
