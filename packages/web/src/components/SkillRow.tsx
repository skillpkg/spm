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
      className="no-underline"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center px-4 py-[11px] gap-3 transition-colors duration-100"
        style={{
          borderBottom: '1px solid #1a1d2744',
          background: hovered ? '#10131a' : 'transparent',
        }}
      >
        <div className="min-w-[150px]">
          <span className="font-mono text-[13px] text-cyan font-medium">{skill.name}</span>
          <span className="font-mono text-[11px] text-text-faint ml-1.5">{skill.version}</span>
        </div>
        <div className="flex-1 min-w-0 font-sans text-xs text-[#5a6578] whitespace-nowrap overflow-hidden text-ellipsis">
          {skill.desc || ''}
        </div>
        <div className="flex items-center gap-3.5 font-mono text-[11px] text-text-muted shrink-0">
          <TrustBadge tier={skill.trust} showLabel={false} />
          <span className="min-w-[50px] text-right">&#x2B07; {skill.downloads}</span>
          {showGrowth && skill.weeklyGrowth && (
            <span className="text-accent min-w-[40px] text-right">{skill.weeklyGrowth}</span>
          )}
          {showDaysAgo && skill.daysAgo != null && (
            <span className="text-text-dim min-w-[50px] text-right">
              {skill.daysAgo === 0
                ? 'today'
                : skill.daysAgo === 1
                  ? '1d ago'
                  : `${skill.daysAgo}d ago`}
            </span>
          )}
          <span className="text-yellow min-w-[30px]">&#x2605; {skill.rating || '\u2014'}</span>
        </div>
      </div>
    </Link>
  );
};
