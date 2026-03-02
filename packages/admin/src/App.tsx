import { useState } from 'react';
import { FLAGGED_QUEUE, REPORTS, USER_ERRORS } from './data/mock';
import { Badge, Tabs } from './components/ui';
import { FlaggedQueue } from './components/FlaggedQueue';
import { SkillModeration } from './components/SkillModeration';
import { ScanAnalytics } from './components/ScanAnalytics';
import { UsersTab } from './components/UsersTab';
import { ReportsTab } from './components/ReportsTab';
import { ErrorsTab } from './components/ErrorsTab';

const TABS = [
  {
    id: 'flagged',
    label: 'Review Queue',
    count: FLAGGED_QUEUE.length,
    countColor: 'yellow',
  },
  { id: 'skills', label: 'Skills' },
  { id: 'analytics', label: 'Scan Analytics' },
  { id: 'trust', label: 'Users' },
  {
    id: 'reports',
    label: 'Reports',
    count: REPORTS.filter((r) => r.status === 'open').length,
    countColor: 'yellow',
  },
  {
    id: 'errors',
    label: 'Errors',
    count: USER_ERRORS.filter((e) => e.status === 'open').length,
    countColor: 'red',
  },
];

export const App = () => {
  const [tab, setTab] = useState('flagged');

  return (
    <div className="bg-bg text-text-primary min-h-screen">
      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-[11px] border-b border-border-default sticky top-0 z-[100] bg-bg/90 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <a href="#" className="flex items-center gap-2 no-underline">
            <div className="w-[26px] h-[26px] rounded-[5px] bg-gradient-to-br from-red to-orange flex items-center justify-center font-mono text-xs font-bold text-bg">
              A
            </div>
            <span className="font-mono text-base font-bold text-red">spm</span>
            <Badge label="ADMIN" color="red" />
          </a>
        </div>
        <div className="flex gap-3 items-center">
          <span className="font-mono text-xs text-text-muted">admin@spm.dev</span>
          <a href="#" className="font-sans text-[13px] text-text-dim no-underline">
            &larr; Back to registry
          </a>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-[1040px] mx-auto px-8 pt-6 pb-16">
        <h1 className="font-sans text-[22px] font-bold text-text-primary mb-5">Admin Panel</h1>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'flagged' && <FlaggedQueue />}
        {tab === 'skills' && <SkillModeration />}
        {tab === 'analytics' && <ScanAnalytics />}
        {tab === 'trust' && <UsersTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'errors' && <ErrorsTab />}
      </div>
    </div>
  );
};
