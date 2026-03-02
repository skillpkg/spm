import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  argTypes: {
    color: { control: 'text' },
    small: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { label: 'Approve', color: 'accent' },
};

export const Red: Story = {
  args: { label: 'Reject', color: 'red' },
};

export const Small: Story = {
  args: { label: 'View', color: 'blue', small: true },
};

export const Yellow: Story = {
  args: { label: 'Hold', color: 'yellow' },
};
