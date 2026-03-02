import type { Meta, StoryObj } from '@storybook/react';
import { BarSegment } from './BarSegment';

const meta: Meta<typeof BarSegment> = {
  title: 'Molecules/BarSegment',
  component: BarSegment,
  argTypes: {
    pct: { control: { type: 'range', min: 0, max: 100 } },
    color: { control: 'color' },
    label: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof BarSegment>;

export const Default: Story = {
  args: { pct: 48, color: '#10b981', label: 'Claude Code' },
};

export const StackedBar: Story = {
  render: () => (
    <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden' }}>
      <BarSegment pct={48} color="var(--color-accent)" label="Claude Code" />
      <BarSegment pct={28} color="var(--color-blue)" label="Cursor" />
      <BarSegment pct={12} color="var(--color-purple)" label="Codex" />
      <BarSegment pct={7} color="var(--color-yellow)" label="Windsurf" />
      <BarSegment pct={5} color="var(--color-text-dim)" label="Other" />
    </div>
  ),
};
