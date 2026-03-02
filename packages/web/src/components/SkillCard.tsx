import { useState } from 'react';
import { Link } from 'react-router-dom';
import { type SkillSummary } from '../data/mock';
import { TrustBadge } from './TrustBadge';

const ACCENT_COLORS = ['#10b981', '#3b82f6', '#a78bfa'];

export const SkillCard = ({ skill, rank }: { skill: SkillSummary; rank: number }) => {
  const [hovered, setHovered] = useState(false);
  const accent = ACCENT_COLORS[rank % 3];

  return (
    <Link
      to={`/skills/${skill.name}`}
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

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 16,
                  color: 'var(--color-cyan)',
                  fontWeight: 600,
                }}
              >
                {skill.name}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-text-faint)',
                }}
              >
                {skill.version}
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--color-text-muted)',
              }}
            >
              by @{skill.author}
            </span>
          </div>
          <TrustBadge tier={skill.trust} />
        </div>

        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: '#8896aa',
            marginBottom: 14,
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
        </p>

        {skill.tags && skill.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {skill.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: '#111318',
                  color: 'var(--color-text-dim)',
                  border: '1px solid var(--color-border-default)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 14,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
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
        </div>
      </div>
    </Link>
  );
};
