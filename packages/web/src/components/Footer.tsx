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
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dim) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--color-bg)',
          }}
        >
          S
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-accent)', fontWeight: 600 }}>
          spm
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-faint)' }}>
          Skills Package Manager
        </span>
      </div>
      <div style={{ display: 'flex', gap: 18 }}>
        {(['Docs', 'GitHub', 'Status', 'Discord'] as const).map((item) => (
          <Link
            key={item}
            to="#"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
            }}
          >
            {item}
          </Link>
        ))}
      </div>
    </footer>
  );
};
