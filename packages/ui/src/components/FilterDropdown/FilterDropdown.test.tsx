import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterDropdown } from './FilterDropdown';

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published', color: 'accent' },
  { value: 'held', label: 'Held', color: 'yellow' },
];

describe('FilterDropdown', () => {
  it('renders label', () => {
    render(<FilterDropdown label="Status" value="all" options={OPTIONS} onChange={() => {}} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<FilterDropdown label="Status" value="all" options={OPTIONS} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Status'));
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Held')).toBeInTheDocument();
  });

  it('calls onChange when option selected', () => {
    const onChange = vi.fn();
    render(<FilterDropdown label="Status" value="all" options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByText('Status'));
    fireEvent.click(screen.getByText('Published'));
    expect(onChange).toHaveBeenCalledWith('published');
  });

  it('closes after selection', () => {
    render(<FilterDropdown label="Status" value="all" options={OPTIONS} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Status'));
    fireEvent.click(screen.getByText('Held'));
    expect(screen.queryByText('All')).not.toBeInTheDocument();
  });
});
