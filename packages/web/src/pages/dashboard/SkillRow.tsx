import { useState } from 'react';
import { TRUST_CONFIG, Text } from '@spm/ui';
import { type Skill } from './types';

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

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
          <Text
            variant="body"
            font="mono"
            weight={600}
            as="span"
            style={{ color: 'var(--color-cyan)' }}
          >
            {skill.name}
          </Text>
          <Text variant="label" font="mono" color="faint" as="span">
            {skill.version}
          </Text>
          {skill.visibility === 'private' && (
            <span
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                padding: '1px 6px',
                borderRadius: 3,
                background: 'rgba(234,179,8,0.12)',
                color: 'var(--color-yellow)',
                border: '1px solid rgba(234,179,8,0.2)',
              }}
            >
              Private
            </span>
          )}
        </div>
        <Text
          variant="caption"
          font="sans"
          color="muted"
          as="div"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {skill.desc}
        </Text>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Text variant="body-sm" font="mono" color="primary" as="div">
          {formatCount(skill.downloads)}
        </Text>
        <Text variant="label" font="mono" color="accent" as="div">
          {skill.weeklyGrowth}
        </Text>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Text variant="body-sm" font="mono" as="div" style={{ color: 'var(--color-yellow)' }}>
          &#9733; {skill.rating}
        </Text>
        <Text variant="label" font="mono" color="muted" as="div">
          {skill.reviews} reviews
        </Text>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Text variant="label" font="mono" as="span" style={{ color: trustCfg.color }}>
          {trustCfg.checks} {trustCfg.label}
        </Text>
      </div>
      <Text variant="label" font="mono" color="muted" as="div" style={{ textAlign: 'right' }}>
        {skill.updated}
      </Text>
    </div>
  );
};
