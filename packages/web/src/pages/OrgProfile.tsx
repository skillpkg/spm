import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@spm/ui';
import { orgQuery, orgSkillsQuery } from './org/queries';
import { skillPath, bareName } from '../lib/urls';

export const OrgProfile = () => {
  const { name } = useParams<{ name: string }>();

  const { data: org, isLoading } = useQuery(orgQuery(name ?? ''));
  const { data: skillsData } = useQuery(orgSkillsQuery(name ?? ''));

  const skills = skillsData?.skills ?? [];

  if (isLoading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 32px', textAlign: 'center' }}>
        <Text variant="h4" font="sans" color="muted" as="div">
          Loading organization...
        </Text>
      </div>
    );
  }

  if (!org) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 32px', textAlign: 'center' }}>
        <Text variant="h2" font="sans" color="dim" as="div" style={{ marginBottom: 16 }}>
          Organization not found
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
      {/* Org header */}
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
          {name?.[0]?.toUpperCase() ?? '?'}
        </Text>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <Text variant="h2" font="mono" color="primary" as="h1" style={{ margin: 0 }}>
              @{name}
            </Text>
            {org.display_name && (
              <Text variant="body-sm" font="sans" color="dim" as="span">
                {org.display_name}
              </Text>
            )}
          </div>
          {org.description && (
            <Text
              variant="body-sm"
              font="sans"
              color="secondary"
              as="p"
              style={{ margin: '4px 0 0', lineHeight: 1.5 }}
            >
              {org.description}
            </Text>
          )}
          <Text
            variant="caption"
            font="mono"
            color="muted"
            as="div"
            style={{ display: 'flex', gap: 24, marginTop: 8 }}
          >
            <span>
              {org.member_count} member{org.member_count !== 1 ? 's' : ''}
            </span>
            <span>
              {org.skill_count} skill{org.skill_count !== 1 ? 's' : ''}
            </span>
            {org.website && (
              <a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
              >
                {org.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </Text>
        </div>
      </div>

      {/* Members */}
      {org.members && org.members.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <Text variant="h4" font="sans" color="secondary" as="h2" style={{ marginBottom: 12 }}>
            Members
          </Text>
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {org.members.map((m) => (
              <Link
                key={m.username}
                to={`/authors/${m.username}`}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 8,
                }}
              >
                <Text variant="body-sm" font="mono" as="span" style={{ color: 'var(--color-cyan)' }}>
                  @{m.username}
                </Text>
                <Text
                  variant="label"
                  font="mono"
                  as="span"
                  style={{
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontSize: 10,
                    background:
                      m.role === 'owner'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : m.role === 'admin'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(100, 116, 139, 0.15)',
                    color:
                      m.role === 'owner'
                        ? '#34d399'
                        : m.role === 'admin'
                          ? '#60a5fa'
                          : '#94a3b8',
                  }}
                >
                  {m.role}
                </Text>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div>
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
            {skills.map((skill) => (
              <Link
                key={skill.name}
                to={skillPath(skill.name)}
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
                        {bareName(skill.name)}
                      </Text>
                      <Text variant="caption" font="mono" color="faint" as="span">
                        v{skill.version}
                      </Text>
                    </div>
                    <Text
                      variant="caption"
                      font="mono"
                      color="muted"
                      as="div"
                      style={{ display: 'flex', gap: 16 }}
                    >
                      <span>&#x2B07; {skill.downloads}</span>
                      <span style={{ color: 'var(--color-yellow)' }}>
                        &#x2605; {skill.rating_avg ?? '--'}
                      </span>
                    </Text>
                  </div>
                  <Text
                    variant="body-sm"
                    font="sans"
                    color="dim"
                    as="p"
                    style={{ lineHeight: 1.6, margin: 0 }}
                  >
                    {skill.description}
                  </Text>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {skills.length === 0 && (
        <Text variant="body-sm" font="sans" color="muted" as="div" style={{ textAlign: 'center' }}>
          No skills published yet
        </Text>
      )}
    </div>
  );
};
