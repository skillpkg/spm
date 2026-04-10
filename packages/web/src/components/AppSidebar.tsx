import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, SidebarUserFooter, Text, type SidebarSection } from '@spm/ui';
import { useAuth } from '../context/AuthContext';
import { docSections } from '../data/docSections';

const SpmLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <img src="/logo-64.png" alt="SPM" style={{ width: 28, height: 28 }} />
    <Text
      variant="h3"
      as="span"
      style={{
        fontFamily: "'Alfa Slab One', serif",
        fontSize: 18,
        fontWeight: 400,
        backgroundImage: 'linear-gradient(135deg, #3dfce4 0%, #2564ff 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        display: 'inline-block',
      }}
    >
      spm
    </Text>
  </div>
);

const SidebarFooter = () => {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return (
      <button
        type="button"
        onClick={() => navigate('/signin')}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-bg)',
          background: 'var(--color-accent)',
          border: 'none',
          borderRadius: 6,
          padding: '6px 14px',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Sign in
      </button>
    );
  }

  return <SidebarUserFooter username={user.username} onSignOut={signOut} />;
};

const SidebarLinks = () => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '8px 0 4px',
        borderTop: '1px solid var(--color-border-default)',
        marginTop: 8,
      }}
    >
      {[
        { label: 'Privacy', to: '/privacy' },
        { label: 'GitHub', href: 'https://github.com/skillpkg/spm' },
        { label: 'Contact', href: 'mailto:support@skillpkg.dev' },
      ].map((link) => (
        <button
          key={link.label}
          type="button"
          onClick={() =>
            'to' in link && link.to ? navigate(link.to) : window.open(link.href, '_blank')
          }
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            color: 'var(--color-text-dim)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          {link.label}
        </button>
      ))}
    </div>
  );
};

const pathToActiveId = (pathname: string): string => {
  if (pathname === '/') return 'home';
  if (pathname === '/search') return 'search';
  if (pathname === '/docs') return 'doc-what-is-spm';
  if (pathname.startsWith('/docs/')) {
    const slug = pathname.split('/')[2];
    return `doc-${slug}`;
  }
  if (pathname === '/cli') return 'cli';
  if (pathname === '/publish') return 'publish';
  if (pathname === '/dashboard') return 'dashboard';
  return '';
};

/** Find which docSection a slug belongs to */
const sectionForSlug = (slug: string): string | null => {
  for (const section of docSections) {
    if (section.items.some((item) => item.slug === slug)) return section.title;
  }
  return null;
};

export const AppSidebar = ({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) => {
  const { isAuthenticated, isAdmin, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentSlug = location.pathname.startsWith('/docs/')
    ? location.pathname.split('/')[2]
    : null;
  const activeSection = currentSlug ? sectionForSlug(currentSlug) : null;

  const sections: SidebarSection[] = [
    {
      title: 'Discover',
      items: [
        {
          id: 'home',
          label: 'Home',
          onClick: () => {
            navigate('/');
            onMobileClose?.();
          },
        },
        {
          id: 'search',
          label: 'Search',
          onClick: () => {
            navigate('/search');
            onMobileClose?.();
          },
        },
      ],
    },
    {
      title: 'Docs',
      items: [
        {
          id: 'doc-what-is-spm',
          label: 'What is SPM?',
          onClick: () => {
            navigate('/docs/what-is-spm');
            onMobileClose?.();
          },
        },
        ...docSections.flatMap((section) => {
          const isExpanded = activeSection === section.title;
          return [
            {
              id: `doc-group-${section.title}`,
              label: section.title,
              onClick: () => {
                navigate(`/docs/${section.items[0].slug}`);
                onMobileClose?.();
              },
            },
            ...(isExpanded
              ? section.items.map((item) => ({
                  id: `doc-${item.slug}`,
                  label: item.label,
                  indent: 1,
                  onClick: () => {
                    navigate(`/docs/${item.slug}`);
                    onMobileClose?.();
                  },
                }))
              : []),
          ];
        }),
        {
          id: 'cli',
          label: 'CLI Reference',
          onClick: () => {
            navigate('/cli');
            onMobileClose?.();
          },
        },
        {
          id: 'publish',
          label: 'Publishing',
          onClick: () => {
            navigate('/publish');
            onMobileClose?.();
          },
        },
      ],
    },
  ];

  if (isAuthenticated) {
    sections.push({
      title: 'My Account',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          onClick: () => {
            navigate('/dashboard');
            onMobileClose?.();
          },
        },
      ],
    });
  }

  if (isAdmin) {
    sections.push({
      items: [
        {
          id: 'admin',
          label: 'Admin Panel',
          href: `https://admin.skillpkg.dev${token ? `#token=${token}` : ''}`,
          external: true,
        },
      ],
    });
  }

  return (
    <Sidebar
      header={<SpmLogo />}
      sections={sections}
      activeId={pathToActiveId(location.pathname)}
      footer={
        <>
          <SidebarFooter />
          <SidebarLinks />
        </>
      }
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
    />
  );
};
