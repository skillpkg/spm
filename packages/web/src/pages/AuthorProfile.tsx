import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrustBadge, Text, type TrustTier } from '@spm/ui';
import { authorProfileQuery } from './author/queries';

interface AuthorDisplaySkill {
  name: string;
  version: string;
  desc: string;
  trust: TrustTier;
  downloads: string;
  rating: string;
}

export const AuthorProfile = () => {
  const { username } = useParams<{ username: string }>();

  const { data: authorData, isLoading: loading } = useQuery(authorProfileQuery(username ?? ''));

  // Build display data from API
  const authorSkills: AuthorDisplaySkill[] = authorData
    ? authorData.skills.map((s) => ({
        name: s.name,
        version: s.version,
        desc: s.description ?? '',
        trust: authorData.trust_tier as TrustTier,
        downloads: s.downloads >= 1000 ? s.downloads.toLocaleString() : String(s.downloads),
        rating: s.rating_avg != null ? String(s.rating_avg) : '--',
      }))
    : [];

  const primaryTrust: TrustTier =
    (authorData?.trust_tier as TrustTier) ?? (authorSkills[0]?.trust || 'registered');
  const totalDownloads = authorData?.total_downloads ?? 0;

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 32px', textAlign: 'center' }}>
        <Text variant="h4" font="sans" color="muted" as="div">
          Loading author profile...
        </Text>
      </div>
    );
  }

  if (authorSkills.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 32px', textAlign: 'center' }}>
        <Text variant="h2" font="sans" color="dim" as="div" style={{ marginBottom: 16 }}>
          Author not found
        </Text>
        <Link
          to="/"
          style={{
            color: 'var(--color-accent)',
            textDecoration: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
          }}
        >
          Back to registry
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 32px 32px' }}>
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
        <Text
          variant="h1"
          font="mono"
          color="dim"
          as="div"
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: 'var(--color-bg-hover)',
            border: '1px solid var(--color-border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {username?.[0]?.toUpperCase() ?? '?'}
        </Text>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <Text variant="h2" font="mono" color="primary" as="h1" style={{ margin: 0 }}>
              @{username}
            </Text>
            <TrustBadge tier={primaryTrust} size="lg" />
          </div>
          <Text
            variant="caption"
            font="mono"
            color="muted"
            as="div"
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 8,
            }}
          >
            <span>
              {authorSkills.length} skill{authorSkills.length !== 1 ? 's' : ''}
            </span>
            <span>&#x2B07; {totalDownloads.toLocaleString()} total downloads</span>
          </Text>
        </div>
      </div>

      {/* Skills list */}
      <Text variant="h4" font="sans" color="secondary" as="h2" style={{ marginBottom: 12 }}>
        Published skills
      </Text>
      <div
        style={{
          border: '1px solid var(--color-border-default)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {authorSkills.map((skill) => (
          <Link
            key={skill.name}
            to={`/skills/${skill.name}`}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #1a1d2744',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text
                    variant="h4"
                    font="mono"
                    weight={600}
                    as="span"
                    style={{ color: 'var(--color-cyan)' }}
                  >
                    {skill.name}
                  </Text>
                  <Text variant="caption" font="mono" color="faint" as="span">
                    {skill.version}
                  </Text>
                  <TrustBadge tier={skill.trust} />
                </div>
                <Text
                  variant="caption"
                  font="mono"
                  color="muted"
                  as="div"
                  style={{
                    display: 'flex',
                    gap: 16,
                  }}
                >
                  <span>&#x2B07; {skill.downloads}</span>
                  <span style={{ color: 'var(--color-yellow)' }}>&#x2605; {skill.rating}</span>
                </Text>
              </div>
              <Text
                variant="body-sm"
                font="sans"
                color="dim"
                as="p"
                style={{ lineHeight: 1.6, margin: 0 }}
              >
                {skill.desc}
              </Text>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
