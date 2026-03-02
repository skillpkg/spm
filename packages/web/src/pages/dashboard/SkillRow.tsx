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
      className="grid items-center px-[18px] py-3.5 border-b border-border-default/25 cursor-pointer transition-colors duration-100"
      style={{
        gridTemplateColumns: '1fr 100px 100px 90px 80px',
        background: hovered ? 'var(--color-bg-hover)' : 'transparent',
      }}
    >
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-sm text-cyan font-semibold">{skill.name}</span>
          <span className="font-mono text-[11px] text-text-faint">{skill.version}</span>
        </div>
        <div className="font-sans text-xs text-text-muted truncate">{skill.desc}</div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[13px] text-text-primary">
          {(skill.downloads / 1000).toFixed(1)}k
        </div>
        <div className="font-mono text-[11px] text-accent">{skill.weeklyGrowth}</div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[13px] text-yellow">&#9733; {skill.rating}</div>
        <div className="font-mono text-[11px] text-text-muted">{skill.reviews} reviews</div>
      </div>
      <div className="text-right">
        <span className="font-mono text-[11px]" style={{ color: trustCfg.color }}>
          {trustCfg.checks} {trustCfg.label}
        </span>
      </div>
      <div className="text-right font-mono text-[11px] text-text-muted">{skill.updated}</div>
    </div>
  );
};
