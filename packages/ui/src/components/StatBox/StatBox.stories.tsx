import type { Meta, StoryObj } from '@storybook/react';
import { StatBox } from './StatBox';

const meta: Meta<typeof StatBox> = {
  title: 'Atoms/StatBox',
  component: StatBox,
  argTypes: {
    color: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof StatBox>;

export const Default: Story = {
  args: { label: 'Downloads', value: '45.1k' },
};

export const WithSub: Story = {
  args: { label: 'Total downloads', value: '24.6k', sub: '\u2191 2,840 this week' },
};

export const Colored: Story = {
  args: { label: 'Avg rating', value: '\u2605 4.7', color: 'yellow', sub: '185 reviews' },
};

export const Numeric: Story = {
  args: { label: 'Skills published', value: 3 },
};
