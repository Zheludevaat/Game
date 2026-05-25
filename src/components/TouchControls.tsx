import { useEffect, useRef } from 'react';
import { InputManager } from '../game/input/InputManager';

interface Props { input: InputManager; }

export function TouchControls({ input }: Props): JSX.Element {
  const joyRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const activeTouchId = useRef<number | null>(null);

  useEffect(() => {
    const el = joyRef.current!;
    const stick = stickRef.current!;
    const getRadius = (): number => el.getBoundingClientRect().width / 2;
    const setStick = (dx: number, dy: number): void => {
      const radius = getRadius();
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(1, len / radius);
      const ux = len > 0 ? dx / len : 0;
      const uy = len > 0 ? dy / len : 0;
      const sx = ux * clamped;
      const sy = uy * clamped;
      input.setTouchAxes(sx, sy);
      stick.style.transform = `translate(calc(-50% + ${sx * radius}px), calc(-50% + ${sy * radius}px))`;
    };
    const reset = (): void => {
      input.setTouchAxes(0, 0);
      stick.style.transform = `translate(-50%, -50%)`;
    };
    const onStart = (e: TouchEvent | PointerEvent): void => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const t = 'touches' in e ? e.touches[0] : (e as PointerEvent);
      if (!t) return;
      if ('identifier' in t) activeTouchId.current = t.identifier;
      setStick(t.clientX - (rect.left + rect.width / 2), t.clientY - (rect.top + rect.height / 2));
    };
    const onMove = (e: TouchEvent | PointerEvent): void => {
      const rect = el.getBoundingClientRect();
      let cx: number | null = null, cy: number | null = null;
      if ('touches' in e) {
        for (let i = 0; i < e.touches.length; i++) {
          const t = e.touches[i];
          if (activeTouchId.current == null || t.identifier === activeTouchId.current) {
            cx = t.clientX; cy = t.clientY;
            break;
          }
        }
      } else { cx = e.clientX; cy = e.clientY; }
      if (cx == null || cy == null) return;
      setStick(cx - (rect.left + rect.width / 2), cy - (rect.top + rect.height / 2));
    };
    const onEnd = (): void => { activeTouchId.current = null; reset(); };

    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    el.addEventListener('pointerdown', onStart);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onEnd);
    el.addEventListener('pointercancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
      el.removeEventListener('pointerdown', onStart);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onEnd);
      el.removeEventListener('pointercancel', onEnd);
    };
  }, [input]);

  const button = (name: string, label: string): JSX.Element => {
    const setBtn = (down: boolean): void => input.setTouchButton(name, down);
    return (
      <button
        onTouchStart={(e) => { e.preventDefault(); setBtn(true); e.currentTarget.classList.add('active'); }}
        onTouchEnd={(e) => { setBtn(false); e.currentTarget.classList.remove('active'); }}
        onTouchCancel={(e) => { setBtn(false); e.currentTarget.classList.remove('active'); }}
        onPointerDown={(e) => { setBtn(true); e.currentTarget.classList.add('active'); }}
        onPointerUp={(e) => { setBtn(false); e.currentTarget.classList.remove('active'); }}
        onPointerCancel={(e) => { setBtn(false); e.currentTarget.classList.remove('active'); }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="touch-controls">
      <div className="touch-joystick" ref={joyRef}>
        <div className="stick" ref={stickRef} />
      </div>
      <div className="touch-buttons">
        {button('spell', 'SPELL')}
        {button('attack', 'ATTACK')}
        {button('interact', 'USE')}
        {button('dash', 'DASH')}
      </div>
    </div>
  );
}
