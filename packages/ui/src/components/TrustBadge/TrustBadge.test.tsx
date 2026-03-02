import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrustBadge } from './TrustBadge';

describe('TrustBadge', () => {
  it('renders official tier with label', () => {
    render(<TrustBadge tier="official" />);
    expect(screen.getByText('\u2713\u2713\u2713 Official')).toBeInTheDocument();
  });

  it('hides label when showLabel=false', () => {
    render(<TrustBadge tier="verified" showLabel={false} />);
    expect(screen.getByText('\u2713\u2713')).toBeInTheDocument();
    expect(screen.queryByText('\u2713\u2713 Verified')).not.toBeInTheDocument();
  });

  it('renders registered tier', () => {
    render(<TrustBadge tier="registered" />);
    expect(screen.getByText('\u25CB Registered')).toBeInTheDocument();
  });

  it('applies larger font size for lg', () => {
    const { container } = render(<TrustBadge tier="scanned" size="lg" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.fontSize).toBe('13px');
  });

  it('applies small font size by default', () => {
    const { container } = render(<TrustBadge tier="scanned" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.fontSize).toBe('11px');
  });
});
