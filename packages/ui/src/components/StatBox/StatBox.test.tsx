import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatBox } from './StatBox';

describe('StatBox', () => {
  it('renders label and value', () => {
    render(<StatBox label="Downloads" value="45.1k" />);
    expect(screen.getByText('Downloads')).toBeInTheDocument();
    expect(screen.getByText('45.1k')).toBeInTheDocument();
  });

  it('renders numeric value', () => {
    render(<StatBox label="Skills" value={12} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders sub text when provided', () => {
    render(<StatBox label="Total" value="24.6k" sub="+2,840 this week" />);
    expect(screen.getByText('+2,840 this week')).toBeInTheDocument();
  });

  it('does not render sub when not provided', () => {
    const { container } = render(<StatBox label="Count" value="5" />);
    const children = container.firstChild?.childNodes;
    expect(children?.length).toBe(2);
  });

  it('applies custom color to value', () => {
    const { container } = render(<StatBox label="Rating" value="4.7" color="yellow" />);
    const valueEl = container.querySelector('div > div:nth-child(2)') as HTMLElement;
    expect(valueEl.style.color).toBe('var(--color-yellow)');
  });
});
