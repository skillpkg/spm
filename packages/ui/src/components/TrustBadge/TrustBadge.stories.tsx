import type { Meta, StoryObj } from '@storybook/react';
import { TrustBadge } from './TrustBadge';

const meta: Meta<typeof TrustBadge> = {
  title: 'Atoms/TrustBadge',
  component: TrustBadge,
  argTypes: {
    tier: {
      control: 'select',
      options: ['official', 'verified', 'scanned', 'registered'],
    },
    showLabel: { control: 'boolean' },
    size: { control: 'radio', options: ['sm', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof TrustBadge>;

export const Official: Story = { args: { tier: 'official' } };
export const Verified: Story = { args: { tier: 'verified' } };
export const Scanned: Story = { args: { tier: 'scanned' } };
export const Registered: Story = { args: { tier: 'registered' } };
export const LargeVerified: Story = { args: { tier: 'verified', size: 'lg' } };
export const IconOnly: Story = { args: { tier: 'official', showLabel: false } };
