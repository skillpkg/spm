import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders the label', () => {
    render(<Badge label="Published" color="accent" />);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('applies color-based styles', () => {
    const { container } = render(<Badge label="Test" color="red" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toBe('var(--color-red)');
  });

  it('handles raw color values', () => {
    const { container } = render(<Badge label="Raw" color="#ff0000" />);
    const el = container.firstChild as HTMLElement;
    // jsdom normalizes hex to rgb
    expect(el.style.color).toBe('rgb(255, 0, 0)');
  });
});
