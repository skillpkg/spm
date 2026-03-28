import { Link } from 'react-router-dom';
import { Text } from '@spm/ui';
import { InstallTabs } from './InstallTabs';

export const Footer = () => {
  return (
    <footer
      style={{
        padding: '16px 32px',
        borderTop: '1px solid var(--color-border-default)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Text
          variant="tiny"
          as="div"
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: '#0deaff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Alfa Slab One', serif",
            fontWeight: 400,
            color: 'var(--color-bg)',
          }}
        >
          S
        </Text>
        <Text
          variant="h4"
          as="span"
          style={{
            fontFamily: "'Alfa Slab One', serif",
            fontWeight: 400,
            color: '#0deaff',
          }}
        >
          spm
        </Text>
        <Text variant="label" font="mono" color="faint" as="span">
          Skills Package Manager
        </Text>
      </div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <InstallTabs compact />
        <Link
          to="/docs"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
          }}
        >
          Docs
        </Link>
        <a
          href="mailto:support@skillpkg.dev"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
          }}
        >
          Contact
        </a>
        <a
          href="https://github.com/skillpkg/spm"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
          }}
        >
          GitHub
        </a>
      </div>
    </footer>
  );
};
