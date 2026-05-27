import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameEngine } from '../GameEngine';
import { InputManager } from '../input/InputManager';
import { MetaState } from '../GameTypes';

// Smoke harness. Build a stub canvas with a fake 2D context so the
// engine can mount in jsdom without throwing, then exercise the boot
// path for every archetype + every run mode. The assertion is just
// "mount doesn't throw" — the most common refactor regression is "I
// changed PlayerState but missed a reader, now mount fails during
// initPlayer or the first render frame." This catches that without
// coupling to engine internals or rAF timing (jsdom's rAF is flaky).

function makeStubCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  // Use a Proxy so any canvas method the engine touches becomes a no-op
  // without us enumerating the whole CanvasRenderingContext2D surface.
  const noop = (): void => undefined;
  const gradientStub = { addColorStop: noop };
  const target: Record<string, unknown> = {
    canvas,
    fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1,
    globalCompositeOperation: 'source-over', imageSmoothingEnabled: true,
    lineWidth: 1, font: '', textAlign: 'left', textBaseline: 'alphabetic',
    shadowColor: 'rgba(0,0,0,0)', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    lineCap: 'butt', lineJoin: 'miter', miterLimit: 10,
    createLinearGradient: () => gradientStub,
    createRadialGradient: () => gradientStub,
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 }),
    createImageData: () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 }),
    measureText: () => ({ width: 0 } as TextMetrics),
  };
  const ctx = new Proxy(target, {
    get(t, prop: string | symbol) {
      if (prop in t) return t[prop as string];
      return noop;
    },
    set(t, prop: string | symbol, value) {
      t[prop as string] = value;
      return true;
    },
  });
  (canvas as unknown as { getContext: (id: string) => unknown }).getContext = (id: string) =>
    id === '2d' ? ctx : null;
  return canvas;
}

function blankMeta(): MetaState {
  return {
    bonusMaxHp: 0,
    bonusStartingMp: 0,
    bonusEssenceGain: 0,
    cosmeticLampAura: false,
    unlockedCodex: [],
    seenPrologue: true,
    seenNewRunCinematic: true,
    bossesSeen: [],
    seenEnding: true,
    ogdoadReached: 0,
    seenTutorial: true,
  };
}

describe('GameEngine smoke', () => {
  let mounted: GameEngine[] = [];
  let attachedInputs: InputManager[] = [];

  beforeEach(() => {
    mounted = [];
    attachedInputs = [];
  });

  afterEach(() => {
    for (const e of mounted) {
      try { e.unmount(); } catch { /* test-only cleanup */ }
    }
    for (const i of attachedInputs) {
      try { i.detach(); } catch { /* test-only cleanup */ }
    }
  });

  function mountFresh(archetypeId: 'magus' | 'hermit' | 'star', extra: Partial<{ bossRushMode: boolean }> = {}): GameEngine {
    const canvas = makeStubCanvas();
    const input = new InputManager();
    attachedInputs.push(input);
    const engine = new GameEngine({
      onHud: () => undefined,
      onPause: () => undefined,
      onOpenMap: () => undefined,
      onGameOver: () => undefined,
      onFloorChange: () => undefined,
      onCodexUnlock: () => undefined,
      onOgdoadReached: () => undefined,
    });
    engine.mount(canvas, input, {
      archetypeId,
      meta: blankMeta(),
      runSeed: 1,
      skipTutorial: true,
      ...extra,
    });
    mounted.push(engine);
    return engine;
  }

  it('mounts as Magus without throwing', () => {
    expect(() => mountFresh('magus')).not.toThrow();
  });

  it('mounts as Hermit without throwing', () => {
    expect(() => mountFresh('hermit')).not.toThrow();
  });

  it('mounts as Star without throwing', () => {
    expect(() => mountFresh('star')).not.toThrow();
  });

  it('mounts in Boss Rush mode without throwing', () => {
    expect(() => mountFresh('magus', { bossRushMode: true })).not.toThrow();
  });

  it('unmount + remount in the same test', () => {
    const e1 = mountFresh('magus');
    expect(() => e1.unmount()).not.toThrow();
    expect(() => mountFresh('hermit')).not.toThrow();
  });

  it('getSummary returns a defined RunSummary after mount', () => {
    const e = mountFresh('magus');
    const summary = e.getSummary();
    expect(summary).toBeDefined();
    expect(summary.floorReached).toBeGreaterThanOrEqual(1);
    expect(summary.archetype.id).toBe('magus');
  });
});
