import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMenuNav } from './useMenuNav';

function MenuNavHarness(props: { onActivate: () => void; onCancel?: () => void }): JSX.Element {
  useMenuNav([{ onActivate: props.onActivate }], { onCancel: props.onCancel });
  return (
    <div>
      <button type="button">Real Button</button>
      <input aria-label="Name" />
      <input aria-label="Volume" type="range" min="0" max="1" step="0.1" />
    </div>
  );
}

describe('useMenuNav keyboard navigation', () => {
  it('does not activate focused menu items from native controls', () => {
    const onActivate = vi.fn();
    const onCancel = vi.fn();
    render(<MenuNavHarness onActivate={onActivate} onCancel={onCancel} />);

    fireEvent.keyDown(screen.getByRole('button', { name: /real button/i }), { code: 'Space' });
    fireEvent.keyDown(screen.getByLabelText('Name'), { code: 'Enter' });
    fireEvent.keyDown(screen.getByLabelText('Volume'), { code: 'ArrowRight' });
    fireEvent.keyDown(screen.getByLabelText('Name'), { code: 'Escape' });

    expect(onActivate).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('still activates menu items from the game-level keyboard fallback', () => {
    const onActivate = vi.fn();
    render(<MenuNavHarness onActivate={onActivate} />);

    fireEvent.keyDown(window, { code: 'Enter' });

    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
