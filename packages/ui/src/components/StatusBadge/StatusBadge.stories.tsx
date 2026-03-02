import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Atoms/StatusBadge',
  component: StatusBadge,
  argTypes: {
    status: {
      control: 'select',
      options: [
        'published',
        'held',
        'blocked',
        'yanked',
        'deprecated',
        'open',
        'investigating',
        'resolved',
        'wontfix',
        'active',
        'flagged',
        'suspended',
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Published: Story = { args: { status: 'published' } };
export const Blocked: Story = { args: { status: 'blocked' } };
export const Held: Story = { args: { status: 'held' } };
export const Investigating: Story = { args: { status: 'investigating' } };
