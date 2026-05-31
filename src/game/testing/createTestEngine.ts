import { vi, type Mock } from 'vitest';
import { GameEngine, RunSummary } from '../GameEngine';
import { InputManager } from '../input/InputManager';

export interface TestEngineHarness {
  canvas: HTMLCanvasElement;
  input: InputManager;
  engine: GameEngine;
  callbacks: {
    hud: Mock;
    pause: Mock;
    openMap: Mock;
    gameOver: Mock;
    floorChange: Mock;
    codexUnlock: Mock;
    ogdoadReached: Mock;
    bossRoomEntered: Mock;
  };
}

export function createTestEngine(): TestEngineHarness {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;

  const callbacks = {
    hud: vi.fn(),
    pause: vi.fn(),
    openMap: vi.fn(),
    gameOver: vi.fn(),
    floorChange: vi.fn(),
    codexUnlock: vi.fn(),
    ogdoadReached: vi.fn(),
    bossRoomEntered: vi.fn(),
  };

  const input = new InputManager();
  const engine = new GameEngine({
    onHud: callbacks.hud,
    onPause: callbacks.pause,
    onOpenMap: callbacks.openMap,
    onGameOver: callbacks.gameOver,
    onFloorChange: callbacks.floorChange,
    onCodexUnlock: callbacks.codexUnlock,
    onOgdoadReached: callbacks.ogdoadReached,
    onBossRoomEntered: callbacks.bossRoomEntered,
  });

  return { canvas, input, engine, callbacks };
}
