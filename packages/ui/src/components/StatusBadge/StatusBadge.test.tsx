import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders known status labels', () => {
    render(<StatusBadge status="published" />);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('renders blocked in red', () => {
    const { container } = render(<StatusBadge status="blocked" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toBe('var(--color-red)');
  });

  it('falls back for unknown status', () => {
    render(<StatusBadge status="unknown-status" />);
    expect(screen.getByText('unknown-status')).toBeInTheDocument();
  });

  it('renders wontfix label', () => {
    render(<StatusBadge status="wontfix" />);
    expect(screen.getByText("Won't fix")).toBeInTheDocument();
  });
});
