import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FilterDropdown, type FilterOption } from './FilterDropdown';

const meta: Meta<typeof FilterDropdown> = {
  title: 'Atoms/FilterDropdown',
  component: FilterDropdown,
};

export default meta;
type Story = StoryObj<typeof FilterDropdown>;

const options: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published', color: 'accent' },
  { value: 'held', label: 'Held', color: 'yellow' },
  { value: 'blocked', label: 'Blocked', color: 'red' },
];

const Interactive = () => {
  const [value, setValue] = useState('all');
  return <FilterDropdown label="Status" value={value} options={options} onChange={setValue} />;
};

export const Default: Story = {
  render: () => <Interactive />,
};
