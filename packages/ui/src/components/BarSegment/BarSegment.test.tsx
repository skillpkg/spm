import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BarSegment } from './BarSegment';

describe('BarSegment', () => {
  it('renders with correct width percentage', () => {
    const { container } = render(<BarSegment pct={48} color="#10b981" label="Claude Code" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('48%');
  });

  it('applies the color as background', () => {
    const { container } = render(<BarSegment pct={30} color="var(--color-blue)" label="Cursor" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toBe('var(--color-blue)');
  });

  it('shows tooltip on hover', () => {
    const { container } = render(<BarSegment pct={48} color="#10b981" label="Claude Code" />);
    const el = container.firstChild as HTMLElement;
    // tooltip is hidden by default since hover state is false
    expect(screen.queryByText('Claude Code 48%')).not.toBeInTheDocument();

    // trigger hover
    fireEvent.mouseEnter(el);
    expect(screen.getByText('Claude Code 48%')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', () => {
    const { container } = render(<BarSegment pct={20} color="#3b82f6" label="Cursor" />);
    const el = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(el);
    expect(screen.getByText('Cursor 20%')).toBeInTheDocument();
    fireEvent.mouseLeave(el);
    expect(screen.queryByText('Cursor 20%')).not.toBeInTheDocument();
  });

  it('uses full border-radius when pct is 100', () => {
    const { container } = render(<BarSegment pct={100} color="#10b981" label="All" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderRadius).toBe('6px');
  });

  it('uses no border-radius when pct is not 100', () => {
    const { container } = render(<BarSegment pct={50} color="#10b981" label="Half" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderRadius).toBe('0');
  });
});
