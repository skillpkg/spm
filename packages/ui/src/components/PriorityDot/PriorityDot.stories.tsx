import type { Meta, StoryObj } from '@storybook/react';
import { PriorityDot } from './PriorityDot';

const meta: Meta<typeof PriorityDot> = {
  title: 'Atoms/PriorityDot',
  component: PriorityDot,
  argTypes: {
    priority: { control: 'radio', options: ['high', 'medium', 'low'] },
  },
};

export default meta;
type Story = StoryObj<typeof PriorityDot>;

export const High: Story = { args: { priority: 'high' } };
export const Medium: Story = { args: { priority: 'medium' } };
export const Low: Story = { args: { priority: 'low' } };
