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
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search skills or authors..."
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {filters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'capitalize',
                background: statusFilter === s ? 'rgba(16,185,129,0.1)' : 'transparent',
                color: statusFilter === s ? 'var(--color-accent)' : 'var(--color-text-dim)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <SectionCard>
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 80px 90px 80px 110px',
            gap: 10,
            padding: '8px 16px',
            borderBottom: '1px solid var(--color-border-default)',
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <span>Skill</span>
          <span>Status</span>
          <span>Trust</span>
          <span style={{ textAlign: 'right' }}>Downloads</span>
          <span style={{ textAlign: 'right' }}>Published</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {/* Rows */}
        {filtered.map((skill) => (
          <div
            key={skill.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 80px 90px 80px 110px',
              gap: 10,
              padding: '10px 16px',
              borderBottom: '1px solid rgba(26,29,39,0.25)',
              alignItems: 'center',
            }}
          >
            <div>
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
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  marginLeft: 8,
                }}
              >
                @{skill.author}
              </span>
            </div>
            <StatusBadge status={skill.status} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: `var(--color-${TRUST_CONFIG[skill.trust].color})`,
              }}
            >
              {TRUST_CONFIG[skill.trust].checks}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                textAlign: 'right',
              }}
            >
              {skill.downloads > 0 ? `${(skill.downloads / 1000).toFixed(1)}k` : '\u2014'}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-text-muted)',
                textAlign: 'right',
              }}
            >
              {skill.published.slice(5)}
            </span>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <ActionButton label="View" color="blue" small />
              <ActionButton label="Yank" color="red" small />
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
};
