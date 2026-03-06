import type { Meta, StoryObj } from '@storybook/react';
import { Sparkline } from './Sparkline';

const meta: Meta<typeof Sparkline> = {
  title: 'Components/Sparkline',
  component: Sparkline,
  args: {
    width: 120,
    height: 32,
  },
};
export default meta;

type Story = StoryObj<typeof Sparkline>;

export const Default: Story = {
  args: {
    data: [
      12, 18, 25, 22, 30, 28, 35, 40, 38, 42, 50, 48, 55, 60, 58, 62, 70, 68, 75, 80, 78, 82, 90,
      88, 95, 100, 98, 105, 110, 108,
    ],
  },
};

export const Empty: Story = {
  args: { data: [] },
};

export const SinglePoint: Story = {
  args: { data: [42] },
};

export const AllZeros: Story = {
  args: { data: [0, 0, 0, 0, 0, 0, 0] },
};

export const CustomSize: Story = {
  args: {
    data: [5, 10, 8, 15, 12, 20, 18],
    width: 200,
    height: 48,
  },
};

export const CustomColor: Story = {
  args: {
    data: [5, 10, 8, 15, 12, 20, 18],
    color: '#3b82f6',
  },
};
