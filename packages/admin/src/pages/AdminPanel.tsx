import { useCallback } from 'react';
import { SidebarLayout } from '@spm/ui';
import { useSearchParamsState } from '../lib/useSearchParamsState';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminTopBar } from '../components/AdminTopBar';
import { OverviewTab } from '../components/OverviewTab';
import { FlaggedQueue } from '../components/FlaggedQueue';
import { SkillModeration } from '../components/SkillModeration';
import { ScanAnalytics } from '../components/ScanAnalytics';
import { UsersTab } from '../components/UsersTab';
import { ReportsTab } from '../components/ReportsTab';
import { ErrorsTab } from '../components/ErrorsTab';

const TAB_PARAMS: Record<string, string[]> = {
  skills: ['search', 'page', 'skill'],
  trust: ['search', 'role', 'trust'],
};

export const AdminPanel = () => {
  const { get, set } = useSearchParamsState();
  const tab = get('tab', 'overview');

  const handleTabChange = useCallback(
    (newTab: string) => {
      // Clear params belonging to the old tab
      const oldTabParams = TAB_PARAMS[tab] ?? [];
      const clears: Record<string, null> = {};
      for (const p of oldTabParams) {
        clears[p] = null;
      }
      set({ ...clears, tab: newTab === 'overview' ? null : newTab });
    },
    [tab, set],
  );

  return (
    <SidebarLayout
      sidebar={<AdminSidebar activeTab={tab} onTabChange={handleTabChange} />}
      topBar={<AdminTopBar activeTab={tab} onNavigateHome={() => handleTabChange('overview')} />}
    >
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 32px 60px' }}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'flagged' && <FlaggedQueue />}
        {tab === 'skills' && <SkillModeration />}
        {tab === 'analytics' && <ScanAnalytics />}
        {tab === 'trust' && <UsersTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'errors' && <ErrorsTab />}
      </div>
    </SidebarLayout>
  );
};
