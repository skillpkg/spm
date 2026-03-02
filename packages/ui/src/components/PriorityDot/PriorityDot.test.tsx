import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PriorityDot } from './PriorityDot';

describe('PriorityDot', () => {
  it('renders high priority in red', () => {
    const { container } = render(<PriorityDot priority="high" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.backgroundColor).toBe('var(--color-red)');
  });

  it('renders medium priority in yellow', () => {
    const { container } = render(<PriorityDot priority="medium" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.backgroundColor).toBe('var(--color-yellow)');
  });

  it('renders low priority in dim', () => {
    const { container } = render(<PriorityDot priority="low" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.backgroundColor).toBe('var(--color-text-dim)');
  });

  it('renders as a circle', () => {
    const { container } = render(<PriorityDot priority="high" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderRadius).toBe('50%');
    expect(el.style.width).toBe('8px');
    expect(el.style.height).toBe('8px');
  });
});
