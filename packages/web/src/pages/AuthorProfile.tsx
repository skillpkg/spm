import { useParams, Link } from 'react-router-dom';
import { SKILLS_DB } from '../data/mock';
import { TrustBadge } from '../components/TrustBadge';

export const AuthorProfile = () => {
  const { username } = useParams<{ username: string }>();

  const authorSkills = SKILLS_DB.filter((s) => s.author === username);

  if (authorSkills.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 32px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 20, color: 'var(--color-text-dim)', marginBottom: 16 }}>
          Author not found
        </div>
        <Link to="/" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontSize: 14 }}>
          Back to registry
        </Link>
      </div>
    );
  }

  const primaryTrust = authorSkills[0].trust;
  const totalDownloads = authorSkills.reduce((sum, s) => {
    const num = parseInt(s.downloads.replace(/,/g, ''), 10);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 32px 32px' }}>
      {/* Breadcrumb */}
      <div style={{ padding: '16px 0', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
        <Link to="/" style={{ color: 'var(--color-text-dim)', textDecoration: 'none' }}>
          Registry
        </Link>
        <span style={{ color: 'var(--color-text-faint)', margin: '0 8px' }}>/</span>
        <span style={{ color: 'var(--color-text-secondary)' }}>@{username}</span>
      </div>

      {/* Author header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: 24,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 12,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: 'var(--color-bg-hover)',
            border: '1px solid var(--color-border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 24,
            color: 'var(--color-text-dim)',
          }}
        >
          {username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              @{username}
            </h1>
            <TrustBadge tier={primaryTrust} size="lg" />
          </div>
          <div style={{ display: 'flex', gap: 24, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
            <span>
              {authorSkills.length} skill{authorSkills.length !== 1 ? 's' : ''}
            </span>
            <span>&#x2B07; {totalDownloads.toLocaleString()} total downloads</span>
          </div>
        </div>
      </div>

      {/* Skills list */}
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
        Published skills
      </h2>
      <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 10, overflow: 'hidden' }}>
        {authorSkills.map((skill) => (
          <Link key={skill.name} to={`/skills/${skill.name}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #1a1d2744',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--color-cyan)', fontWeight: 600 }}>
                    {skill.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-faint)' }}>
                    {skill.version}
                  </span>
                  <TrustBadge tier={skill.trust} />
                </div>
                <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  <span>&#x2B07; {skill.downloads}</span>
                  <span style={{ color: 'var(--color-yellow)' }}>&#x2605; {skill.rating}</span>
                </div>
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-dim)', lineHeight: 1.6, margin: 0 }}>
                {skill.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
