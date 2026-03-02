import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('renders with placeholder', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Search skills..." />);
    expect(screen.getByPlaceholderText('Search skills...')).toBeInTheDocument();
  });

  it('calls onChange on input', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} placeholder="Search..." />);
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'pdf' } });
    expect(onChange).toHaveBeenCalledWith('pdf');
  });

  it('shows current value', () => {
    render(<SearchInput value="data-viz" onChange={() => {}} placeholder="Search..." />);
    expect(screen.getByDisplayValue('data-viz')).toBeInTheDocument();
  });

  it('applies custom maxWidth', () => {
    const { container } = render(
      <SearchInput value="" onChange={() => {}} placeholder="Search..." maxWidth={500} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.maxWidth).toBe('500px');
  });
});
