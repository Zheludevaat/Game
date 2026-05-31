import { useRef, type PointerEvent } from 'react';
import { InputManager } from '../game/input/InputManager';

interface Props { input: InputManager; }

export function TouchControls({ input }: Props): JSX.Element {
  const joyRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const baseRef = useRef({ x: 0, y: 0 });

  const setBase = (clientX: number, clientY: number): void => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const size = rect.width || 120;
    const half = size / 2;
    const x = Math.max(half, Math.min(clientX, window.innerWidth - half));
    const y = Math.max(half, Math.min(clientY, window.innerHeight - half));
    baseRef.current = { x, y };
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.classList.add('is-active');
  };

  const setStick = (clientX: number, clientY: number): void => {
    const stick = stickRef.current;
    const el = joyRef.current;
    if (!stick || !el) return;
    const rect = el.getBoundingClientRect();
    const radius = (rect.width || 120) / 2;
    const dx = clientX - baseRef.current.x;
    const dy = clientY - baseRef.current.y;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(1, len / radius);
    const ux = len > 0 ? dx / len : 0;
    const uy = len > 0 ? dy / len : 0;
    const sx = ux * clamped;
    const sy = uy * clamped;
    input.setTouchAxes(sx, sy);
    stick.style.transform = `translate(calc(-50% + ${sx * radius}px), calc(-50% + ${sy * radius}px))`;
  };

  const resetStick = (): void => {
    activePointerId.current = null;
    input.setTouchAxes(0, 0);
    joyRef.current?.classList.remove('is-active');
    const stick = stickRef.current;
    if (stick) stick.style.transform = 'translate(-50%, -50%)';
  };

  const onZoneDown = (e: PointerEvent<HTMLDivElement>): void => {
    e.preventDefault();
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setBase(e.clientX, e.clientY);
    setStick(e.clientX, e.clientY);
  };

  const onZoneMove = (e: PointerEvent<HTMLDivElement>): void => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    setStick(e.clientX, e.clientY);
  };

  const onZoneUp = (e: PointerEvent<HTMLDivElement>): void => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetStick();
  };

  const button = (name: string, label: string): JSX.Element => {
    const setBtn = (down: boolean): void => input.setTouchButton(name, down);
    const press = (e: PointerEvent<HTMLButtonElement>): void => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      e.currentTarget.classList.add('active');
      setBtn(true);
    };
    const release = (e: PointerEvent<HTMLButtonElement>): void => {
      e.preventDefault();
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      e.currentTarget.classList.remove('active');
      setBtn(false);
    };
    return (
      <button
        type="button"
        aria-label={label}
        data-action={name}
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={(e) => { e.currentTarget.classList.remove('active'); setBtn(false); }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="touch-controls">
      <div
        className="touch-joystick-zone"
        aria-label="Move zone"
        role="application"
        onPointerDown={onZoneDown}
        onPointerMove={onZoneMove}
        onPointerUp={onZoneUp}
        onPointerCancel={onZoneUp}
        onLostPointerCapture={resetStick}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="touch-joystick" ref={joyRef} aria-label="Move">
          <div className="stick" ref={stickRef} />
        </div>
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
        {button('map', 'MAP')}
      </div>
    </div>
  );
}
