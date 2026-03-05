import { Link } from 'react-router-dom';
import { TRUST_CONFIG } from '@spm/ui';
import { type SkillFull, cardStyle } from './types';

export const SkillSidebar = ({ skill }: { skill: SkillFull }) => {
  const trustInfo = TRUST_CONFIG[skill.trust];

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
            { label: 'Size', value: skill.size },
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
        </div>

        {/* Author */}
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
            Author
          </div>
          <Link
            to={`/authors/${skill.author}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
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
              {skill.author[0].toUpperCase()}
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--color-text-primary)',
                }}
              >
                @{skill.author}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: trustInfo.color }}>
                {trustInfo.checks} {trustInfo.label}
              </div>
            </div>
          </Link>
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
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-blue)',
              padding: '4px 0',
            }}
          >
            Repository
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-blue)',
              padding: '4px 0',
            }}
          >
            Report issue
          </div>
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
