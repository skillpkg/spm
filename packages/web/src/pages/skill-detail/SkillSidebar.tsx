import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TRUST_CONFIG, Sparkline } from '@spm/ui';
import { getSkillDownloads, type SkillDownloadsDay } from '../../lib/api';
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
  const [sparklineData, setSparklineData] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSkillDownloads(skill.name)
      .then((res) => {
        if (!cancelled) setSparklineData(buildSparklineData(res.days));
      })
      .catch(() => {
        // Sparkline is non-critical; silently skip on error
      });
    return () => {
      cancelled = true;
    };
  }, [skill.name]);

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
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: row.color || '#94a3b8',
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
          {sparklineData && (
            <div style={{ paddingTop: 8 }}>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 10,
                  color: 'var(--color-text-muted)',
                  marginBottom: 4,
                }}
              >
                Last 30 days
              </div>
              <Sparkline data={sparklineData} width={192} height={32} color="#10b981" />
            </div>
          )}
        </div>

        {/* Authors */}
        <div style={cardStyle}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {skill.authors.length > 1 ? 'Authors' : 'Author'}
          </div>
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
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'var(--color-bg-hover)',
                    border: '1px solid var(--color-border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--color-text-dim)',
                  }}
                >
                  {a.username[0].toUpperCase()}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    @{a.username}
                    {a.role !== 'owner' && (
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--color-text-muted)',
                          marginLeft: 4,
                        }}
                      >
                        {a.role}
                      </span>
                    )}
                  </div>
                  <div
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: aTrust.color }}
                  >
                    {aTrust.checks} {aTrust.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Links */}
        <div style={cardStyle}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Links
          </div>
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
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                color: 'var(--color-text-muted)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Dependencies
            </div>
            {skill.dependencies.system?.map((d) => (
              <div
                key={d}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-text-dim)',
                  padding: '2px 0',
                }}
              >
                {d}
              </div>
            ))}
            {skill.dependencies.pip?.map((d) => (
              <div
                key={d}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-text-dim)',
                  padding: '2px 0',
                }}
              >
                pip: {d}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
