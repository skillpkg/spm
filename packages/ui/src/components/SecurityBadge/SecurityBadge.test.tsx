import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SecurityBadge } from './SecurityBadge';

describe('SecurityBadge', () => {
  it('renders full level with green color and label', () => {
    const { container } = render(<SecurityBadge level="full" />);
    expect(screen.getByText(/Verified/)).toBeInTheDocument();
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toBe('rgb(16, 185, 129)');
  });

  it('renders partial level with yellow color', () => {
    const { container } = render(<SecurityBadge level="partial" />);
    expect(screen.getByText(/Partial/)).toBeInTheDocument();
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toBe('rgb(234, 179, 8)');
  });

  it('renders flagged level with orange color', () => {
    const { container } = render(<SecurityBadge level="flagged" />);
    expect(screen.getByText(/Flagged/)).toBeInTheDocument();
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toBe('rgb(249, 115, 22)');
  });

  it('renders blocked level with red color', () => {
    const { container } = render(<SecurityBadge level="blocked" />);
    expect(screen.getByText(/Blocked/)).toBeInTheDocument();
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toBe('rgb(239, 68, 68)');
  });

  it('renders unscanned level with gray color', () => {
    const { container } = render(<SecurityBadge level="unscanned" />);
    expect(screen.getByText(/Unscanned/)).toBeInTheDocument();
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toBe('rgb(100, 116, 139)');
  });

  it('hides label when showLabel=false', () => {
    render(<SecurityBadge level="full" showLabel={false} />);
    expect(screen.queryByText(/Verified/)).not.toBeInTheDocument();
  });

  it('renders shield SVG icon', () => {
    const { container } = render(<SecurityBadge level="full" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies larger size for lg', () => {
    const { container } = render(<SecurityBadge level="full" size="lg" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.fontSize).toBe('13px');
  });

  it('applies small size by default', () => {
    const { container } = render(<SecurityBadge level="full" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.fontSize).toBe('11px');
  });
});
