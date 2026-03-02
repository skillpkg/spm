import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

const SIMPLE_TABS = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

const TABS_WITH_COUNTS = [
  { id: 'queue', label: 'Queue', count: 3, countColor: 'yellow' },
  { id: 'done', label: 'Done', count: 10 },
];

describe('Tabs', () => {
  it('renders all tab labels', () => {
    render(<Tabs tabs={SIMPLE_TABS} active="a" onChange={() => {}} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('calls onChange with tab id', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={SIMPLE_TABS} active="a" onChange={onChange} />);
    fireEvent.click(screen.getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('renders count badges when provided', () => {
    render(<Tabs tabs={TABS_WITH_COUNTS} active="queue" onChange={() => {}} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('does not render count badges when count is undefined', () => {
    render(<Tabs tabs={SIMPLE_TABS} active="a" onChange={() => {}} />);
    const container = screen.getByText('Alpha').parentElement?.parentElement;
    const spans = container?.querySelectorAll('span');
    expect(spans?.length ?? 0).toBe(0);
  });
});
