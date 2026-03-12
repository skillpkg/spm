import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TRUST_CONFIG, Sparkline, Text } from '@spm/ui';
import { type SkillDownloadsDay } from '../../lib/api';
import { skillDownloadsQuery } from './queries';
import { type SkillFull, cardStyle } from './types';

const buildSparklineData = (days: SkillDownloadsDay[]): number[] => {
  const counts = new Map<string, number>();
  for (const d of days) counts.set(d.date, d.count);

  const result: number[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().split('T')[0];
    result.push(counts.get(key) ?? 0);
  }
  return result;
};

export const SkillSidebar = ({ skill }: { skill: SkillFull }) => {
  const { data: downloadsData } = useQuery(skillDownloadsQuery(skill.name));
  const sparklineData = downloadsData ? buildSparklineData(downloadsData.days) : null;

  return (
    <aside style={{ width: 220, flexShrink: 0 }}>
      <div style={{ position: 'sticky', top: 70 }}>
        {/* Stats */}
        <div style={cardStyle}>
          {[
            { label: 'Downloads', value: skill.downloads },
            { label: 'This week', value: skill.weeklyDownloads },
            {
              label: 'Rating',
              value: `\u2605 ${skill.rating} (${skill.reviews})`,
              color: '#fbbf24',
            },
            { label: 'License', value: skill.license },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px solid #1a1d2733',
              }}
            >
              <Text variant="caption" font="sans" color="muted" as="span">
                {row.label}
              </Text>
              <Text
                variant="caption"
                font="mono"
                as="span"
                style={{ color: row.color || '#94a3b8' }}
              >
                {row.value}
              </Text>
            </div>
          ))}
          {sparklineData && (
            <div style={{ paddingTop: 8 }}>
              <Text variant="tiny" font="sans" color="muted" as="div" style={{ marginBottom: 4 }}>
                Last 30 days
              </Text>
              <Sparkline data={sparklineData} width={192} height={32} color="#10b981" />
            </div>
          )}
        </div>

        {/* Authors */}
        <div style={cardStyle}>
          <Text
            variant="label"
            font="sans"
            color="muted"
            as="div"
            style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {skill.authors.length > 1 ? 'Authors' : 'Author'}
          </Text>
          {skill.authors.map((a) => {
            const aTrust = TRUST_CONFIG[a.trust];
            return (
              <Link
                key={a.username}
                to={`/authors/${a.username}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textDecoration: 'none',
                  marginBottom: 8,
                }}
              >
                <Text
                  variant="caption"
                  font="mono"
                  color="dim"
                  as="div"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'var(--color-bg-hover)',
                    border: '1px solid var(--color-border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {a.username[0].toUpperCase()}
                </Text>
                <div>
                  <Text variant="body-sm" font="mono" color="primary" as="div">
                    @{a.username}
                    {a.role !== 'owner' && (
                      <Text variant="tiny" color="muted" as="span" style={{ marginLeft: 4 }}>
                        {a.role}
                      </Text>
                    )}
                  </Text>
                  <Text variant="label" font="mono" as="div" style={{ color: aTrust.color }}>
                    {aTrust.checks} {aTrust.label}
                  </Text>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Imported from */}
        {skill.importedFrom && (
          <div style={cardStyle}>
            <Text
              variant="label"
              font="sans"
              color="muted"
              as="div"
              style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Imported from
            </Text>
            <a
              href={skill.importedFrom}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: '#818cf8',
                textDecoration: 'none',
                wordBreak: 'break-all',
              }}
            >
              {skill.importedFrom.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
            <Text
              variant="label"
              font="sans"
              color="faint"
              as="div"
              style={{ marginTop: 6, lineHeight: 1.4 }}
            >
              This skill was imported by SPM from an external source. The original author did not
              publish it directly.
            </Text>
          </div>
        )}

        {/* Links */}
        <div style={cardStyle}>
          <Text
            variant="label"
            font="sans"
            color="muted"
            as="div"
            style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Links
          </Text>
          {skill.repo && (
            <a
              href={skill.repo}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--color-blue)',
                padding: '4px 0',
                display: 'block',
                textDecoration: 'none',
              }}
            >
              Repository
            </a>
          )}
          <a
            href={
              skill.repo
                ? `${skill.repo}/issues`
                : `/report?skill=${encodeURIComponent(skill.name)}`
            }
            target={skill.repo ? '_blank' : undefined}
            rel={skill.repo ? 'noopener noreferrer' : undefined}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-blue)',
              padding: '4px 0',
              display: 'block',
              textDecoration: 'none',
            }}
          >
            Report issue
          </a>
        </div>

        {/* Dependencies */}
        {((skill.dependencies?.pip?.length ?? 0) > 0 ||
          (skill.dependencies?.system?.length ?? 0) > 0) && (
          <div style={cardStyle}>
            <Text
              variant="label"
              font="sans"
              color="muted"
              as="div"
              style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Dependencies
            </Text>
            {skill.dependencies.system?.map((d) => (
              <Text
                key={d}
                variant="caption"
                font="mono"
                color="dim"
                as="div"
                style={{ padding: '2px 0' }}
              >
                {d}
              </Text>
            ))}
            {skill.dependencies.pip?.map((d) => (
              <Text
                key={d}
                variant="caption"
                font="mono"
                color="dim"
                as="div"
                style={{ padding: '2px 0' }}
              >
                pip: {d}
              </Text>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
