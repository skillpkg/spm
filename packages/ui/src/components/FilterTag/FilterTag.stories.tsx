import type { Meta, StoryObj } from '@storybook/react';
import { FilterTag } from './FilterTag';

const meta: Meta<typeof FilterTag> = {
  title: 'Atoms/FilterTag',
  component: FilterTag,
  argTypes: {
    color: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof FilterTag>;

export const Default: Story = {
  args: { label: 'documents', color: 'accent', onRemove: () => {} },
};

export const Blue: Story = {
  args: { label: 'verified', color: 'blue', onRemove: () => {} },
};

export const Red: Story = {
  args: { label: 'blocked', color: 'red', onRemove: () => {} },
};
