import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, type TabDef } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Atoms/Tabs',
  component: Tabs,
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const SimpleTabs = () => {
  const [active, setActive] = useState('overview');
  const tabs: TabDef[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'skills', label: 'Skills (3)' },
    { id: 'analytics', label: 'Analytics' },
  ];
  return <Tabs tabs={tabs} active={active} onChange={setActive} />;
};

export const Simple: Story = {
  render: () => <SimpleTabs />,
};

const WithCountsTabs = () => {
  const [active, setActive] = useState('queue');
  const tabs: TabDef[] = [
    { id: 'queue', label: 'Review Queue', count: 3, countColor: 'yellow' },
    { id: 'skills', label: 'Skills' },
    { id: 'reports', label: 'Reports', count: 2, countColor: 'yellow' },
    { id: 'errors', label: 'Errors', count: 1, countColor: 'red' },
  ];
  return <Tabs tabs={tabs} active={active} onChange={setActive} />;
};

export const WithCounts: Story = {
  render: () => <WithCountsTabs />,
};
