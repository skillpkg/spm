import { useState } from 'react';
import { ALL_SKILLS_ADMIN, TRUST_CONFIG } from '../data/mock';
import { ActionButton, SectionCard, SearchInput, StatusBadge } from './ui';

export const SkillModeration = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = ALL_SKILLS_ADMIN.filter(
    (s) =>
      !search || s.name.includes(search.toLowerCase()) || s.author.includes(search.toLowerCase()),
  ).filter((s) => statusFilter === 'all' || s.status === statusFilter);

  const filters = ['all', 'published', 'held', 'blocked'] as const;

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-4 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search skills or authors..."
          maxWidth="max-w-xs"
        />
        <div className="flex gap-1">
          {filters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`font-sans text-xs px-3 py-1.5 rounded-md border-none cursor-pointer capitalize ${
                statusFilter === s ? 'bg-accent/10 text-accent' : 'bg-transparent text-text-dim'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <SectionCard>
        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_80px_90px_80px_110px] gap-2.5 px-4 py-2 border-b border-border-default font-sans text-[11px] text-text-muted uppercase tracking-wider">
          <span>Skill</span>
          <span>Status</span>
          <span>Trust</span>
          <span className="text-right">Downloads</span>
          <span className="text-right">Published</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        {filtered.map((skill) => (
          <div
            key={skill.name}
            className="grid grid-cols-[1fr_80px_80px_90px_80px_110px] gap-2.5 px-4 py-2.5 border-b border-border-default/25 items-center hover:bg-bg-hover"
          >
            <div>
              <span className="font-mono text-[13px] text-cyan font-medium">{skill.name}</span>
              <span className="font-mono text-[11px] text-text-faint ml-1.5">{skill.version}</span>
              <span className="font-sans text-[11px] text-text-muted ml-2">@{skill.author}</span>
            </div>
            <StatusBadge status={skill.status} />
            <span className={`font-mono text-[11px] text-${TRUST_CONFIG[skill.trust].color}`}>
              {TRUST_CONFIG[skill.trust].checks}
            </span>
            <span className="font-mono text-xs text-text-secondary text-right">
              {skill.downloads > 0 ? `${(skill.downloads / 1000).toFixed(1)}k` : '\u2014'}
            </span>
            <span className="font-mono text-[11px] text-text-muted text-right">
              {skill.published.slice(5)}
            </span>
            <div className="flex gap-1 justify-end">
              <ActionButton label="View" color="blue" small />
              <ActionButton label="Yank" color="red" small />
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
};
