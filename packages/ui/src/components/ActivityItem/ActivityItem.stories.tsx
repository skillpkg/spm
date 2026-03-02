import type { Meta, StoryObj } from '@storybook/react';
import { ActivityItem } from './ActivityItem';

const meta: Meta<typeof ActivityItem> = {
  title: 'Molecules/ActivityItem',
  component: ActivityItem,
};

export default meta;
type Story = StoryObj<typeof ActivityItem>;

export const Publish: Story = {
  args: {
    item: {
      type: 'publish',
      skill: 'data-viz',
      version: '1.2.3',
      date: '2026-02-15',
      detail: 'Published new version',
    },
  },
};

export const Review: Story = {
  args: {
    item: {
      type: 'review',
      skill: 'csv-transform',
      date: '2026-02-23',
      detail: 'New 5-star review from @chen',
    },
  },
};

export const Milestone: Story = {
  args: {
    item: {
      type: 'milestone',
      skill: 'data-viz',
      date: '2026-02-18',
      detail: 'Reached 12,000 downloads',
    },
  },
};

export const ActivityFeed: Story = {
  render: () => (
    <div
      style={{ maxWidth: 400, background: 'var(--color-bg-card)', borderRadius: 8, padding: 16 }}
    >
      <ActivityItem
        item={{
          type: 'publish',
          skill: 'chart-export',
          version: '0.8.0',
          date: '2026-02-25',
          detail: 'Published new version',
        }}
      />
      <ActivityItem
        item={{
          type: 'review',
          skill: 'data-viz',
          date: '2026-02-23',
          detail: 'New 5-star review from @chen',
        }}
      />
      <ActivityItem
        item={{
          type: 'milestone',
          skill: 'data-viz',
          date: '2026-02-18',
          detail: 'Reached 12,000 downloads',
        }}
      />
    </div>
  ),
};
