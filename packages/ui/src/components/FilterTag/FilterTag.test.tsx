import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterTag } from './FilterTag';

describe('FilterTag', () => {
  it('renders label', () => {
    render(<FilterTag label="Published" color="accent" onRemove={() => {}} />);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('calls onRemove when X clicked', () => {
    const onRemove = vi.fn();
    render(<FilterTag label="Tag" color="blue" onRemove={onRemove} />);
    fireEvent.click(screen.getByText('\u00D7'));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('applies color styles', () => {
    const { container } = render(<FilterTag label="Test" color="red" onRemove={() => {}} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toBe('var(--color-red)');
  });
});
