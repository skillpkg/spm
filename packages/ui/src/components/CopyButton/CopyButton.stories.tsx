import type { Meta, StoryObj } from '@storybook/react';
import { CopyButton } from './CopyButton';

const meta: Meta<typeof CopyButton> = {
  title: 'Atoms/CopyButton',
  component: CopyButton,
};

export default meta;
type Story = StoryObj<typeof CopyButton>;

export const Default: Story = {
  args: { text: 'spm install pdf' },
};
