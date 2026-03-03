import { useState } from 'react';
import { FLAGGED_QUEUE, REPORTS, USER_ERRORS } from './data/mock';
import { Badge, Tabs } from '@spm/ui';
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
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '11px 32px',
          borderBottom: '1px solid var(--color-border-default)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(8,10,15,0.92)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a
            href="#"
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 5,
                background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 700,
                color: '#080a0f',
              }}
            >
              A
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                fontWeight: 700,
                color: '#ef4444',
              }}
            >
              spm
            </span>
            <Badge label="ADMIN" color="red" />
          </a>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--color-text-muted)',
            }}
          >
            admin@skillpkg.dev
          </span>
          <a
            href="#"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-text-dim)',
              textDecoration: 'none',
            }}
          >
            &larr; Back to registry
          </a>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 32px 60px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 20,
          }}
        >
          Admin Panel
        </h1>

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
