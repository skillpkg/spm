import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Atoms/Badge',
  component: Badge,
  argTypes: {
    color: { control: 'text' },
    label: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { label: 'Published', color: 'accent' },
};

export const Red: Story = {
  args: { label: 'Blocked', color: 'red' },
};

export const Blue: Story = {
  args: { label: 'Scanned', color: 'blue' },
};

export const Yellow: Story = {
  args: { label: 'Held', color: 'yellow' },
};
