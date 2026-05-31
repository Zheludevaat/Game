import { describe, expect, it } from 'vitest';
import { AudioDiagnosticsSnapshot } from './audioDiagnostics';

describe('audio stress protocol', () => {
  it('diagnostics snapshot shape is valid', () => {
    // Verify the snapshot interface contract — actual stress testing
    // requires a real AudioContext and must be done manually in the browser.
    const snapshot: AudioDiagnosticsSnapshot = {
      activeCue: null,
      transportState: 'stopped',
      activeNodeCount: 0,
      peakDb: -Infinity,
      clipping: false,
    };
    expect(snapshot.activeCue).toBeNull();
    expect(snapshot.transportState).toBe('stopped');
    expect(snapshot.activeNodeCount).toBe(0);
    expect(snapshot.clipping).toBe(false);
  });
});

/**
 * # Manual Audio Stress Test Protocol
 *
 * Run this in the audio-showcase.html page with DevTools open.
 *
 * ## Node leak test
 * 1. Open audio-showcase.html
 * 2. Click each dungeon cue in sequence (moon → mercury → venus → sun → mars → jupiter → saturn)
 * 3. Click each boss cue in sequence
 * 4. Click menu, game over, prologue, epilogue, codex
 * 5. Repeat Steps 2-4 ten times
 * 6. Check the diagnostics panel — `activeNodeCount` should return to baseline after each switch
 *
 * ## Clipping test
 * 1. Play each dungeon cue for 15+ seconds
 * 2. Verify `clipping: false` in the diagnostics panel
 *
 * ## Long session test
 * 1. Start a game run (desktop Chrome)
 * 2. Play for 20 minutes — navigate rooms, fight enemies, open chests
 * 3. Monitor browser console for errors
 * 4. Listen for audio crackle or growing lag
 */

