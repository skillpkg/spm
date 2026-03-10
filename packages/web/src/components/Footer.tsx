import { Link } from 'react-router-dom';

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
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: '#0deaff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Alfa Slab One', serif",
            fontSize: 10,
            fontWeight: 400,
            color: 'var(--color-bg)',
          }}
        >
          S
        </div>
        <span
          style={{
            fontFamily: "'Alfa Slab One', serif",
            fontSize: 15,
            fontWeight: 400,
            color: '#0deaff',
          }}
        >
          spm
        </span>
        <span
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-faint)' }}
        >
          Skills Package Manager
        </span>
      </div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <code
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-faint)' }}
        >
          npm i -g @skillpkg/cli
        </code>
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
      </div>
    </footer>
  );
};
