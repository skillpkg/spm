import { useState } from 'react';
import { Link } from 'react-router-dom';
import { type SkillSummary } from '../data/mock';
import { TrustBadge } from './TrustBadge';

export const SkillRow = ({
  skill,
  showGrowth = false,
  showDaysAgo = false,
}: {
  skill: SkillSummary;
  showGrowth?: boolean;
  showDaysAgo?: boolean;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/skills/${skill.name}`}
      style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '11px 16px',
          gap: 12,
          transition: 'background 0.1s',
          borderBottom: '1px solid #1a1d2744',
          background: hovered ? '#10131a' : 'transparent',
        }}
      >
        <div style={{ minWidth: 150 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--color-cyan)',
              fontWeight: 500,
            }}
          >
            {skill.name}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-text-faint)',
              marginLeft: 6,
            }}
          >
            {skill.version}
          </span>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: '#5a6578',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {skill.desc || ''}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}
        >
          <TrustBadge tier={skill.trust} showLabel={false} />
          <span style={{ minWidth: 50, textAlign: 'right' }}>&#x2B07; {skill.downloads}</span>
          {showGrowth && skill.weeklyGrowth && (
            <span style={{ color: 'var(--color-accent)', minWidth: 40, textAlign: 'right' }}>
              {skill.weeklyGrowth}
            </span>
          )}
          {showDaysAgo && skill.daysAgo != null && (
            <span style={{ color: 'var(--color-text-dim)', minWidth: 50, textAlign: 'right' }}>
              {skill.daysAgo === 0
                ? 'today'
                : skill.daysAgo === 1
                  ? '1d ago'
                  : `${skill.daysAgo}d ago`}
            </span>
          )}
          <span style={{ color: 'var(--color-yellow)', minWidth: 30 }}>
            &#x2605; {skill.rating || '\u2014'}
          </span>
        </div>
      </div>
    </Link>
  );
};
