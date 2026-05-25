import { useEffect, useRef, useState } from 'react';
import { getConfirmButton, getCancelButton } from '../game/input/activeLayout';

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
        itemsRef.current[focusedRef.current]?.onActivate();
        e.preventDefault();
      } else if (e.code === 'Escape') {
        optsRef.current?.onCancel?.();
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
      if (optsRef.current?.enabled === false) { raf = requestAnimationFrame(tick); return; }
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
        if (horiz) {
          if (isPress(15, !!right)) {
            const n = itemsRef.current.length;
            setFocused((f) => {
              let next = f;
              for (let i = 0; i < n; i++) { next = (next + 1 + n) % n; if (!itemsRef.current[next]?.disabled) break; }
              return next;
            });
          }
          if (isPress(14, !!left)) {
            const n = itemsRef.current.length;
            setFocused((f) => {
              let next = f;
              for (let i = 0; i < n; i++) { next = (next - 1 + n) % n; if (!itemsRef.current[next]?.disabled) break; }
              return next;
            });
          }
        } else {
          if (isPress(13, !!down)) {
            const n = itemsRef.current.length;
            setFocused((f) => {
              let next = f;
              for (let i = 0; i < n; i++) { next = (next + 1 + n) % n; if (!itemsRef.current[next]?.disabled) break; }
              return next;
            });
          }
          if (isPress(12, !!up)) {
            const n = itemsRef.current.length;
            setFocused((f) => {
              let next = f;
              for (let i = 0; i < n; i++) { next = (next - 1 + n) % n; if (!itemsRef.current[next]?.disabled) break; }
              return next;
            });
          }
        }
        // confirm / cancel — index depends on controller layout
        const confirmIdx = getConfirmButton();
        const cancelIdx = getCancelButton();
        const confirmBtn = pad.buttons[confirmIdx]?.pressed ?? false;
        const confirmWas = prevPressed[confirmIdx] ?? false;
        prevPressed[confirmIdx] = confirmBtn;
        if (confirmBtn && !confirmWas) {
          itemsRef.current[focusedRef.current]?.onActivate();
        }
        const cancelBtn = pad.buttons[cancelIdx]?.pressed ?? false;
        const cancelWas = prevPressed[cancelIdx] ?? false;
        prevPressed[cancelIdx] = cancelBtn;
        if (cancelBtn && !cancelWas) {
          optsRef.current?.onCancel?.();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return focused;
}
