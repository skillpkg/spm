import { useState } from 'react';
import { Link } from 'react-router-dom';
import { type SkillSummary } from '../data/constants';
import { TrustBadge, SecurityBadge, Text } from '@spm/ui';
import { skillPath } from '../lib/urls';

const ACCENT_COLORS = ['#10b981', '#3b82f6', '#a78bfa'];

export const SkillCard = ({ skill, rank }: { skill: SkillSummary; rank: number }) => {
  const [hovered, setHovered] = useState(false);
  const accent = ACCENT_COLORS[rank % 3];

  return (
    <Link
      to={skillPath(skill.name)}
      className="spm-skill-card"
      style={{ textDecoration: 'none', flex: 1, minWidth: 240, display: 'flex' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 12,
          padding: 20,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: hovered ? '#10131a' : '#0c0e14',
          border: `1px solid ${hovered ? accent + '44' : '#1a1d27'}`,
          transform: hovered ? 'translateY(-2px)' : 'none',
          boxShadow: hovered ? `0 8px 30px ${accent}11` : 'none',
          transition: 'all 0.2s',
        }}
      >
        {/* Rank accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 3,
            height: '100%',
            background: accent,
            opacity: hovered ? 1 : 0.4,
            transition: 'opacity 0.2s',
          }}
        />

        <div style={{ marginBottom: 8 }}>
          <Text
            variant="h3"
            font="mono"
            weight={600}
            as="div"
            style={{ color: 'var(--color-cyan)', marginBottom: 2, wordBreak: 'break-word' }}
          >
            {skill.name}
          </Text>
          <Text variant="caption" font="sans" color="muted" as="div" style={{ marginBottom: 6 }}>
            by @{skill.author}
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text variant="caption" font="mono" color="faint" as="span">
              v{skill.version}
            </Text>
            <TrustBadge tier={skill.trust} />
            {skill.securityLevel && <SecurityBadge level={skill.securityLevel} showLabel={false} />}
          </div>
        </div>

        <Text
          variant="body-sm"
          font="sans"
          as="p"
          style={{
            color: '#8896aa',
            lineHeight: 1.6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            margin: '0 0 14px 0',
            flex: 1,
          }}
        >
          {skill.desc}
        </Text>

        {skill.tags && skill.tags.length > 0 && (
          <div
            className="spm-card-tags"
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}
          >
            {skill.tags.map((tag) => (
              <Text
                key={tag}
                variant="tiny"
                font="mono"
                color="dim"
                as="span"
                style={{
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: '#111318',
                  border: '1px solid var(--color-border-default)',
                }}
              >
                {tag}
              </Text>
            ))}
          </div>
        )}

        <Text
          variant="caption"
          font="mono"
          as="div"
          style={{
            display: 'flex',
            gap: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--color-border-default)',
            marginTop: 'auto',
          }}
        >
          <span style={{ color: 'var(--color-text-dim)' }}>&#x2B07; {skill.downloads}</span>
          {skill.weeklyGrowth && (
            <span style={{ color: 'var(--color-accent)' }}>{skill.weeklyGrowth}</span>
          )}
          {skill.rating && (
            <span style={{ color: 'var(--color-yellow)' }}>&#x2605; {skill.rating}</span>
          )}
        </Text>
      </div>
    </Link>
  );
};
