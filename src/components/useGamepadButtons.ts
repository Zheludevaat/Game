import { useEffect, useRef } from 'react';
import { getActiveLayout } from '../game/input/activeLayout';

/**
 * Lightweight gamepad button hook. Fires the matching callback on the
 * rising edge of each button press. Also wires Escape to onB (a.k.a.
 * cancel) and Enter to onA when given, so keyboard users get parity for
 * screens that don't otherwise have keyboard handlers.
 *
 * Standard mapping:
 *   buttons[0] = A (cross),   buttons[1] = B (circle)
 *   buttons[2] = X (square),  buttons[3] = Y (triangle)
 *   buttons[4] = LB,          buttons[5] = RB
 *   buttons[8] = Select,      buttons[9] = Start
 *   buttons[12..15]           = D-pad up/down/left/right
 */
export interface GamepadButtonHandlers {
  onA?: () => void;
  onB?: () => void;
  onX?: () => void;
  onY?: () => void;
  onLB?: () => void;
  onRB?: () => void;
  onStart?: () => void;
  onSelect?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
}

export function useGamepadButtons(handlers: GamepadButtonHandlers & { enabled?: boolean }): void {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (ref.current.enabled === false) return;
      const h = ref.current;
      if (e.code === 'Escape') { h.onB?.(); }
      else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyJ') { h.onA?.(); }
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') { if (h.onUp) { h.onUp(); e.preventDefault(); } }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { if (h.onDown) { h.onDown(); e.preventDefault(); } }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { if (h.onLeft) { h.onLeft(); e.preventDefault(); } }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { if (h.onRight) { h.onRight(); e.preventDefault(); } }
      else if (e.code === 'KeyQ') { h.onLB?.(); }
      else if (e.code === 'KeyR') { h.onRB?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let raf = 0;
    const prev: Record<number, boolean> = {};
    const prevAxis = { up: false, down: false, left: false, right: false };
    let firstTick = true;
    const tick = (): void => {
      if (ref.current.enabled === false) {
        // While the hook is disabled (e.g. a SettingsMenu remap is in
        // progress), still ADVANCE the previous-button snapshot so
        // any press / release that happens during the disabled window
        // doesn't create a phantom rising-edge on the very first
        // frame after we re-enable. Without this, a B press that
        // completed a remap fires onB the moment the hook wakes back
        // up — and onB is "exit menu" — kicking the player out.
        const pads = navigator.getGamepads?.() ?? [];
        let pad: Gamepad | null = null;
        for (const p of pads) if (p) { pad = p; break; }
        if (pad) {
          for (let i = 0; i < pad.buttons.length; i++) prev[i] = !!pad.buttons[i]?.pressed;
          prevAxis.up    = (pad.axes[1] ?? 0) < -0.5;
          prevAxis.down  = (pad.axes[1] ?? 0) >  0.5;
          prevAxis.left  = (pad.axes[0] ?? 0) < -0.5;
          prevAxis.right = (pad.axes[0] ?? 0) >  0.5;
        } else {
          firstTick = true;
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      const pads = navigator.getGamepads?.() ?? [];
      let pad: Gamepad | null = null;
      for (const p of pads) if (p) { pad = p; break; }
      if (pad) {
        if (firstTick) {
          for (let i = 0; i < pad.buttons.length; i++) prev[i] = !!pad.buttons[i]?.pressed;
          firstTick = false;
          raf = requestAnimationFrame(tick);
          return;
        }
        const h = ref.current;
        const ax = pad.axes[0] ?? 0;
        const ay = pad.axes[1] ?? 0;
        const dpadUp    = !!pad.buttons[12]?.pressed;
        const dpadDown  = !!pad.buttons[13]?.pressed;
        const dpadLeft  = !!pad.buttons[14]?.pressed;
        const dpadRight = !!pad.buttons[15]?.pressed;
        const stickUp    = ay < -0.5;
        const stickDown  = ay >  0.5;
        const stickLeft  = ax < -0.5;
        const stickRight = ax >  0.5;
        // d-pad rising edge
        const dEdge = (idx: number, val: boolean): boolean => {
          const was = prev[idx] ?? false; prev[idx] = val; return val && !was;
        };
        // analog stick rising edge (separate from d-pad so they don't double-fire)
        const aEdge = (key: keyof typeof prevAxis, val: boolean): boolean => {
          const was = prevAxis[key]; prevAxis[key] = val; return val && !was;
        };
        if (dEdge(12, dpadUp)    || aEdge('up',    stickUp))    h.onUp?.();
        if (dEdge(13, dpadDown)  || aEdge('down',  stickDown))  h.onDown?.();
        if (dEdge(14, dpadLeft)  || aEdge('left',  stickLeft))  h.onLeft?.();
        if (dEdge(15, dpadRight) || aEdge('right', stickRight)) h.onRight?.();
        // face buttons — A/B/X/Y are SEMANTIC. On Switch we swap 0↔1 and
        // 2↔3 so the labelled "A" button (right) fires onA, etc.
        const layout = getActiveLayout();
        const aIdx = layout === 'switch' ? 1 : 0;
        const bIdx = layout === 'switch' ? 0 : 1;
        const xIdx = layout === 'switch' ? 3 : 2;
        const yIdx = layout === 'switch' ? 2 : 3;
        if (dEdge(aIdx, !!pad.buttons[aIdx]?.pressed)) h.onA?.();
        if (dEdge(bIdx, !!pad.buttons[bIdx]?.pressed)) h.onB?.();
        if (dEdge(xIdx, !!pad.buttons[xIdx]?.pressed)) h.onX?.();
        if (dEdge(yIdx, !!pad.buttons[yIdx]?.pressed)) h.onY?.();
        if (dEdge(4, !!pad.buttons[4]?.pressed)) h.onLB?.();
        if (dEdge(5, !!pad.buttons[5]?.pressed)) h.onRB?.();
        if (dEdge(8, !!pad.buttons[8]?.pressed)) h.onSelect?.();
        if (dEdge(9, !!pad.buttons[9]?.pressed)) h.onStart?.();
      } else {
        firstTick = true;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}
