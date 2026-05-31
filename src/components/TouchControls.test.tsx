import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TouchControls } from './TouchControls';

describe('TouchControls', () => {
  it('starts the movement joystick where the left thumb lands', () => {
    const input = {
      setTouchAxes: vi.fn(),
      setTouchButton: vi.fn(),
    };
    render(<TouchControls input={input as any} />);

    const zone = screen.getByLabelText('Move zone');
    const joystick = screen.getByLabelText('Move');

    fireEvent.pointerDown(zone, { pointerId: 7, clientX: 96, clientY: 284 });
    fireEvent.pointerMove(zone, { pointerId: 7, clientX: 144, clientY: 284 });

    expect(joystick.style.left).toBe('96px');
    expect(joystick.style.top).toBe('284px');
    expect(input.setTouchAxes).toHaveBeenLastCalledWith(expect.closeTo(0.8, 2), expect.closeTo(0, 2));
  });
});
