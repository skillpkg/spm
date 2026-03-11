import { Sidebar, Badge, type SidebarSection } from '@spm/ui';
import { useAuth } from '@spm/web-auth';

const TABS_MAP: Record<string, string> = {
  overview: 'Overview',
  flagged: 'Review Queue',
  skills: 'Skills',
  reports: 'Reports',
  errors: 'Errors',
  analytics: 'Scan Analytics',
  trust: 'Users',
};

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const { user, signOut } = useAuth();

  const sections: SidebarSection[] = [
    {
      items: [{ id: 'overview', label: 'Overview', onClick: () => onTabChange('overview') }],
    },
    {
      title: 'Moderation',
      items: [
        { id: 'flagged', label: 'Review Queue', onClick: () => onTabChange('flagged') },
        { id: 'skills', label: 'Skills', onClick: () => onTabChange('skills') },
        { id: 'reports', label: 'Reports', onClick: () => onTabChange('reports') },
        { id: 'errors', label: 'Errors', onClick: () => onTabChange('errors') },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { id: 'analytics', label: 'Scan Analytics', onClick: () => onTabChange('analytics') },
        { id: 'trust', label: 'Users', onClick: () => onTabChange('trust') },
      ],
    },
    {
      items: [
        {
          id: 'skillpkg-dev',
          label: 'skillpkg.dev',
          href: 'https://skillpkg.dev',
          external: true,
        },
      ],
    },
  ];

  const header = (
    <div
      onClick={() => onTabChange('overview')}
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
    >
      <img src="/logo-64.png" alt="SPM" style={{ width: 28, height: 28 }} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 16,
          fontWeight: 700,
          backgroundImage: 'linear-gradient(135deg, #3dfce4 0%, #2564ff 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          display: 'inline-block',
        }}
      >
        spm
      </span>
      <Badge label="ADMIN" color="red" />
    </div>
  );

  const footer = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--color-text-muted)',
        }}
      >
        @{user?.username || 'admin'}
      </span>
      <button
        onClick={signOut}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--color-text-dim)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        Sign out
      </button>
    </div>
  );

  return <Sidebar header={header} sections={sections} activeId={activeTab} footer={footer} />;
};

export { TABS_MAP };
