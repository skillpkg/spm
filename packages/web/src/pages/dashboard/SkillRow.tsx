import { useState } from 'react';
import { TRUST_CONFIG, type Skill } from './mock-data';

interface SkillRowProps {
  skill: Skill;
}

export const SkillRow = ({ skill }: SkillRowProps) => {
  const [hovered, setHovered] = useState(false);
  const trustCfg = TRUST_CONFIG[skill.trust];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 100px 100px 90px 80px',
        alignItems: 'center',
        padding: '14px 18px',
        borderBottom: '1px solid rgba(26,29,39,0.25)',
        cursor: 'pointer',
        transition: 'background 100ms',
        background: hovered ? 'var(--color-bg-hover)' : 'transparent',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              color: 'var(--color-cyan)',
              fontWeight: 600,
            }}
          >
            {skill.name}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-text-faint)',
            }}
          >
            {skill.version}
          </span>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {skill.desc}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--color-text-primary)',
          }}
        >
          {(skill.downloads / 1000).toFixed(1)}k
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-accent)',
          }}
        >
          {skill.weeklyGrowth}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--color-yellow)',
          }}
        >
          &#9733; {skill.rating}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-text-muted)',
          }}
        >
          {skill.reviews} reviews
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: trustCfg.color,
          }}
        >
          {trustCfg.checks} {trustCfg.label}
        </span>
      </div>
      <div
        style={{
          textAlign: 'right',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--color-text-muted)',
        }}
      >
        {skill.updated}
      </div>
    </div>
  );
};
