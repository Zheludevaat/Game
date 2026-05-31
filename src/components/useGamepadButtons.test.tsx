import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useGamepadButtons } from './useGamepadButtons';

function GamepadHarness(props: { onA: () => void; onB?: () => void }): JSX.Element {
  useGamepadButtons({ onA: props.onA, onB: props.onB });
  return (
    <div>
      <button type="button">Real Button</button>
      <input aria-label="Name" />
      <input aria-label="Volume" type="range" min="0" max="1" step="0.1" />
    </div>
  );
}

describe('useGamepadButtons keyboard fallback', () => {
  it('does not hijack keyboard input from real UI controls', () => {
    const onA = vi.fn();
    const onB = vi.fn();
    render(<GamepadHarness onA={onA} onB={onB} />);

    fireEvent.keyDown(screen.getByRole('button', { name: /real button/i }), { code: 'Space' });
    fireEvent.keyDown(screen.getByLabelText('Name'), { code: 'Enter' });
    fireEvent.keyDown(screen.getByLabelText('Volume'), { code: 'ArrowRight' });
    fireEvent.keyDown(screen.getByLabelText('Name'), { code: 'Escape' });

    expect(onA).not.toHaveBeenCalled();
    expect(onB).not.toHaveBeenCalled();
  });

  it('still handles keyboard fallback when the game surface owns focus', () => {
    const onA = vi.fn();
    render(<GamepadHarness onA={onA} />);

    fireEvent.keyDown(window, { code: 'Enter' });

    expect(onA).toHaveBeenCalledTimes(1);
  });
});
