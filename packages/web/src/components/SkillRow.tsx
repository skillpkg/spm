import { useState } from 'react';
import { Link } from 'react-router-dom';
import { type SkillSummary } from '../data/constants';
import { TrustBadge, SecurityBadge, Text } from '@spm/ui';
import { skillPath, bareName, extractScope } from '../lib/urls';

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
      to={skillPath(skill.name)}
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
          <Text
            variant="body-sm"
            font="mono"
            weight={500}
            as="span"
            style={{ color: 'var(--color-cyan)' }}
          >
            {bareName(skill.name)}
          </Text>
          <Text variant="label" font="mono" color="faint" as="span" style={{ marginLeft: 6 }}>
            v{skill.version}
          </Text>
          {extractScope(skill.name) && (
            <Text variant="label" font="sans" color="muted" as="span" style={{ marginLeft: 8 }}>
              {extractScope(skill.name)}
            </Text>
          )}
        </div>
        <Text
          variant="caption"
          font="sans"
          as="div"
          style={{
            flex: 1,
            minWidth: 0,
            color: '#5a6578',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {skill.desc || ''}
        </Text>
        <Text
          variant="label"
          font="mono"
          color="muted"
          as="div"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexShrink: 0,
          }}
        >
          <TrustBadge tier={skill.trust} showLabel={false} />
          {skill.securityLevel && <SecurityBadge level={skill.securityLevel} showLabel={false} />}
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
        </Text>
      </div>
    </Link>
  );
};
