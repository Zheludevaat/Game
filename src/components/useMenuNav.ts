import { useEffect, useRef, useState } from 'react';
import { getConfirmButton, getCancelButton } from '../game/input/activeLayout';
import { audio } from '../game/systems/AudioSystem';

export interface MenuItem {
  onActivate: () => void;
  disabled?: boolean;
}

export function useMenuNav(items: MenuItem[], opts?: { onCancel?: () => void; horizontal?: boolean; enabled?: boolean }): number {
  const [focused, setFocused] = useState(0);
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const move = (dir: number): void => {
      setFocused((f) => {
        const n = itemsRef.current.length;
        if (n === 0) return f;
        let next = f;
        for (let i = 0; i < n; i++) {
          next = (next + dir + n) % n;
          if (!itemsRef.current[next]?.disabled) break;
        }
        if (next !== f) audio.sfx('uiFocus');
        return next;
      });
    };
    const onKey = (e: KeyboardEvent): void => {
      if (optsRef.current?.enabled === false) return;
      const horiz = !!optsRef.current?.horizontal;
      if (e.code === 'ArrowDown' || (!horiz && e.code === 'KeyS')) { move(1); e.preventDefault(); }
      else if (e.code === 'ArrowUp' || (!horiz && e.code === 'KeyW')) { move(-1); e.preventDefault(); }
      else if (horiz && (e.code === 'ArrowRight' || e.code === 'KeyD')) { move(1); e.preventDefault(); }
      else if (horiz && (e.code === 'ArrowLeft' || e.code === 'KeyA')) { move(-1); e.preventDefault(); }
      else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyJ') {
        const item = itemsRef.current[focusedRef.current];
        if (item && !item.disabled) {
          audio.sfx('uiConfirm');
          item.onActivate();
        }
        e.preventDefault();
      } else if (e.code === 'Escape') {
        if (optsRef.current?.onCancel) {
          audio.sfx('uiCancel');
          optsRef.current.onCancel();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Gamepad polling
  useEffect(() => {
    let raf = 0;
    const prevPressed: Record<number, boolean> = {};
    let firstTick = true;
    const tick = (): void => {
      if (optsRef.current?.enabled === false) {
        // Same stale-prev guard as useGamepadButtons — advance the
        // button snapshot during the disabled window so a press that
        // happens while the hook is off doesn't manifest as a phantom
        // rising-edge once it re-enables.
        const pads = navigator.getGamepads?.() ?? [];
        let pad: Gamepad | null = null;
        for (const p of pads) if (p) { pad = p; break; }
        if (pad) {
          for (let i = 0; i < pad.buttons.length; i++) prevPressed[i] = !!pad.buttons[i]?.pressed;
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
          for (let i = 0; i < pad.buttons.length; i++) prevPressed[i] = !!pad.buttons[i]?.pressed;
          firstTick = false;
          raf = requestAnimationFrame(tick);
          return;
        }
        const horiz = !!optsRef.current?.horizontal;
        const ax = pad.axes[0] ?? 0;
        const ay = pad.axes[1] ?? 0;
        const up = pad.buttons[12]?.pressed || ay < -0.5;
        const down = pad.buttons[13]?.pressed || ay > 0.5;
        const left = pad.buttons[14]?.pressed || ax < -0.5;
        const right = pad.buttons[15]?.pressed || ax > 0.5;
        const isPress = (key: number, val: boolean): boolean => {
          const was = prevPressed[key] ?? false;
          prevPressed[key] = val;
          return val && !was;
        };
        const padMove = (dir: number): void => {
          const n = itemsRef.current.length;
          setFocused((f) => {
            let next = f;
            for (let i = 0; i < n; i++) { next = (next + dir + n) % n; if (!itemsRef.current[next]?.disabled) break; }
            if (next !== f) audio.sfx('uiFocus');
            return next;
          });
        };
        if (horiz) {
          if (isPress(15, !!right)) padMove(1);
          if (isPress(14, !!left))  padMove(-1);
        } else {
          if (isPress(13, !!down))  padMove(1);
          if (isPress(12, !!up))    padMove(-1);
        }
        // confirm / cancel — index depends on controller layout
        const confirmIdx = getConfirmButton();
        const cancelIdx = getCancelButton();
        const confirmBtn = pad.buttons[confirmIdx]?.pressed ?? false;
        const confirmWas = prevPressed[confirmIdx] ?? false;
        prevPressed[confirmIdx] = confirmBtn;
        if (confirmBtn && !confirmWas) {
          const item = itemsRef.current[focusedRef.current];
          if (item && !item.disabled) {
            audio.sfx('uiConfirm');
            item.onActivate();
          }
        }
        const cancelBtn = pad.buttons[cancelIdx]?.pressed ?? false;
        const cancelWas = prevPressed[cancelIdx] ?? false;
        prevPressed[cancelIdx] = cancelBtn;
        if (cancelBtn && !cancelWas) {
          if (optsRef.current?.onCancel) {
            audio.sfx('uiCancel');
            optsRef.current.onCancel();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return focused;
}
