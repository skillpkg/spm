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
      className="no-underline flex-1 min-w-[240px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative overflow-hidden rounded-xl p-5 transition-all duration-200"
        style={{
          background: hovered ? '#10131a' : '#0c0e14',
          border: `1px solid ${hovered ? accent + '44' : '#1a1d27'}`,
          transform: hovered ? 'translateY(-2px)' : 'none',
          boxShadow: hovered ? `0 8px 30px ${accent}11` : 'none',
        }}
      >
        {/* Rank accent bar */}
        <div
          className="absolute top-0 left-0 w-[3px] h-full transition-opacity duration-200"
          style={{
            background: accent,
            opacity: hovered ? 1 : 0.4,
          }}
        />

        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-base text-cyan font-semibold">{skill.name}</span>
              <span className="font-mono text-xs text-text-faint">{skill.version}</span>
            </div>
            <span className="font-sans text-xs text-text-muted">by @{skill.author}</span>
          </div>
          <TrustBadge tier={skill.trust} />
        </div>

        <p className="font-sans text-[13px] text-[#8896aa] mb-3.5 leading-relaxed line-clamp-2">
          {skill.desc}
        </p>

        {skill.tags && skill.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3.5">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[10px] px-[7px] py-[2px] rounded bg-[#111318] text-text-dim border border-border-default"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-3.5 font-mono text-xs pt-3 border-t border-border-default">
          <span className="text-text-dim">&#x2B07; {skill.downloads}</span>
          {skill.weeklyGrowth && <span className="text-accent">{skill.weeklyGrowth}</span>}
          {skill.rating && <span className="text-yellow">&#x2605; {skill.rating}</span>}
        </div>
      </div>
    </Link>
  );
};
