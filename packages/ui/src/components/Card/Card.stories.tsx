import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Atoms/Card',
  component: Card,
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: 'Card content goes here',
    style: { padding: 20 },
  },
};

export const WithCustomStyle: Story = {
  args: {
    children: 'Custom styled card',
    style: { padding: 24, borderRadius: 16 },
  },
};
