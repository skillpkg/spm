import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SearchInput } from './SearchInput';

const meta: Meta<typeof SearchInput> = {
  title: 'Atoms/SearchInput',
  component: SearchInput,
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

const Interactive = () => {
  const [value, setValue] = useState('');
  return <SearchInput value={value} onChange={setValue} placeholder="Search skills..." />;
};

export const Default: Story = {
  render: () => <Interactive />,
};

export const WithMaxWidth: Story = {
  args: { value: '', onChange: () => {}, placeholder: 'Search...', maxWidth: 500 },
};
