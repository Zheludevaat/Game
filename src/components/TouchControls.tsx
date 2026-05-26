import { useEffect, useRef } from 'react';
import { InputManager } from '../game/input/InputManager';

interface Props { input: InputManager; }

// Pointer-event-only implementation. Earlier versions wired both touch
// and pointer handlers, which on iOS Safari double-fired every press
// (touchstart fires the touch handler, then pointerdown fires the pointer
// handler independently — they're not synthetic on iOS). Using Pointer
// Events exclusively gives one unified path across iOS, Android, mouse,
// stylus, and avoids ghost-click race conditions entirely.

export function TouchControls({ input }: Props): JSX.Element {
  const joyRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);

  useEffect(() => {
    const el = joyRef.current;
    const stick = stickRef.current;
    if (!el || !stick) return;
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
    const onDown = (e: PointerEvent): void => {
      e.preventDefault();
      // Capture the pointer so dragging outside the joystick still steers.
      if (activePointerId.current != null) return; // ignore additional fingers on the stick
      activePointerId.current = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch { /* */ }
      const rect = el.getBoundingClientRect();
      setStick(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
    };
    const onMove = (e: PointerEvent): void => {
      if (activePointerId.current !== e.pointerId) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      setStick(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
    };
    const onUp = (e: PointerEvent): void => {
      if (activePointerId.current !== e.pointerId) return;
      activePointerId.current = null;
      try { el.releasePointerCapture(e.pointerId); } catch { /* */ }
      reset();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [input]);

  // Per-button: pointer down → "pressed", pointer up / cancel → "released".
  // setPointerCapture so a finger dragged off the button still releases
  // correctly when lifted. Stop click from firing so iOS doesn't synthesise
  // a delayed mouse event after we've already handled the press.
  const button = (name: string, label: string): JSX.Element => {
    const setBtn = (down: boolean): void => input.setTouchButton(name, down);
    return (
      <button
        type="button"
        aria-label={label}
        onPointerDown={(e) => {
          e.preventDefault();
          setBtn(true);
          e.currentTarget.classList.add('active');
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* */ }
        }}
        onPointerUp={(e) => {
          setBtn(false);
          e.currentTarget.classList.remove('active');
          try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* */ }
        }}
        onPointerCancel={(e) => {
          setBtn(false);
          e.currentTarget.classList.remove('active');
        }}
        onContextMenu={(e) => e.preventDefault()}
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
      <div className="touch-cycle">
        {button('cycleWeapon', '↻W')}
        {button('cycleSpell', '↻S')}
      </div>
      <div className="touch-pause">
        {button('pause', '☰')}
      </div>
    </div>
  );
}
