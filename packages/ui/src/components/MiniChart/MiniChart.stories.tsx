import type { Meta, StoryObj } from '@storybook/react';
import { MiniChart } from './MiniChart';

const meta: Meta<typeof MiniChart> = {
  title: 'Molecules/MiniChart',
  component: MiniChart,
  argTypes: {
    width: { control: { type: 'range', min: 100, max: 500 } },
    height: { control: { type: 'range', min: 24, max: 120 } },
    color: { control: 'color' },
    fillOpacity: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
  },
};

export default meta;
type Story = StoryObj<typeof MiniChart>;

const trendingUp = [
  { value: 1420 },
  { value: 1580 },
  { value: 1890 },
  { value: 2100 },
  { value: 2240 },
  { value: 2510 },
  { value: 2680 },
  { value: 2840 },
];

const volatile = [
  { value: 300 },
  { value: 150 },
  { value: 420 },
  { value: 280 },
  { value: 510 },
  { value: 190 },
  { value: 460 },
];

export const Default: Story = {
  args: { data: trendingUp },
};

export const CustomColor: Story = {
  args: { data: trendingUp, color: 'var(--color-blue)', fillOpacity: 0.12 },
};

export const Volatile: Story = {
  args: { data: volatile, color: 'var(--color-yellow)' },
};

export const LargeSize: Story = {
  args: { data: trendingUp, width: 400, height: 100 },
};
