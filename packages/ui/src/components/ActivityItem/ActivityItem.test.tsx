import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityItem } from './ActivityItem';
import type { ActivityEvent } from './ActivityItem';

const publishEvent: ActivityEvent = {
  type: 'publish',
  skill: 'data-viz',
  version: '1.2.3',
  date: '2026-02-15',
  detail: 'Published new version',
};

const reviewEvent: ActivityEvent = {
  type: 'review',
  skill: 'csv-transform',
  date: '2026-02-23',
  detail: 'New 5-star review',
};

describe('ActivityItem', () => {
  it('renders the detail text', () => {
    render(<ActivityItem item={publishEvent} />);
    expect(screen.getByText('Published new version')).toBeTruthy();
  });

  it('renders the skill name', () => {
    render(<ActivityItem item={publishEvent} />);
    expect(screen.getByText('data-viz')).toBeTruthy();
  });

  it('renders the date', () => {
    render(<ActivityItem item={publishEvent} />);
    expect(screen.getByText(/2026-02-15/)).toBeTruthy();
  });

  it('renders version when present', () => {
    render(<ActivityItem item={publishEvent} />);
    expect(screen.getByText('v1.2.3')).toBeTruthy();
  });

  it('does not render version when absent', () => {
    render(<ActivityItem item={reviewEvent} />);
    expect(screen.queryByText(/^v\d/)).toBeNull();
  });

  it('renders the default icon for known types', () => {
    const { container } = render(<ActivityItem item={publishEvent} />);
    expect(container.textContent).toContain('\ud83d\udce6');
  });

  it('renders custom icons when provided', () => {
    const customIcons = { publish: '\ud83d\ude80' };
    const { container } = render(<ActivityItem item={publishEvent} icons={customIcons} />);
    expect(container.textContent).toContain('\ud83d\ude80');
    expect(container.textContent).not.toContain('\ud83d\udce6');
  });

  it('renders a fallback bullet for unknown event types', () => {
    const unknownEvent: ActivityEvent = {
      type: 'unknown',
      skill: 'test',
      date: '2026-01-01',
      detail: 'Something',
    };
    const { container } = render(<ActivityItem item={unknownEvent} />);
    expect(container.textContent).toContain('\u25cf');
  });
});
