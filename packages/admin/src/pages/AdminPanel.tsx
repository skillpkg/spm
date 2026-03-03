import { useState } from 'react';
import { Badge, Tabs } from '@spm/ui';
import { useAuth } from '@spm/web-auth';
import { FlaggedQueue } from '../components/FlaggedQueue';
import { SkillModeration } from '../components/SkillModeration';
import { ScanAnalytics } from '../components/ScanAnalytics';
import { UsersTab } from '../components/UsersTab';
import { ReportsTab } from '../components/ReportsTab';
import { ErrorsTab } from '../components/ErrorsTab';

const TABS = [
  { id: 'flagged', label: 'Review Queue' },
  { id: 'skills', label: 'Skills' },
  { id: 'analytics', label: 'Scan Analytics' },
  { id: 'trust', label: 'Users' },
  { id: 'reports', label: 'Reports' },
  { id: 'errors', label: 'Errors' },
];

export const AdminPanel = () => {
  const [tab, setTab] = useState('flagged');
  const { user, signOut } = useAuth();

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
            {user?.username || 'admin'}
          </span>
          <button
            onClick={signOut}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-text-dim)',
              textDecoration: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Sign out
          </button>
          <a
            href="https://skillpkg.dev"
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
