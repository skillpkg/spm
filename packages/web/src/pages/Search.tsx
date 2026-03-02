import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  SKILLS_DB,
  CATEGORY_NAMES,
  CATEGORY_SLUGS,
  TRUST_TIERS,
  SORT_OPTIONS,
  type SkillFull,
} from '../data/mock';
import { TrustBadge } from '../components/TrustBadge';

const SearchResultRow = ({ skill }: { skill: SkillFull }) => {
  return (
    <Link to={`/skills/${skill.name}`} className="no-underline block">
      <div className="px-5 py-4 border-b border-[#1a1d2744] hover:bg-bg-hover cursor-pointer transition-colors duration-100">
        <div className="flex justify-between items-start mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[15px] text-cyan font-semibold">{skill.name}</span>
            <span className="font-mono text-xs text-text-faint">{skill.version}</span>
            <TrustBadge tier={skill.trust} />
          </div>
          <div className="flex gap-4 font-mono text-xs text-text-muted">
            <span>&#x2B07; {skill.downloads}</span>
            <span className="text-yellow">&#x2605; {skill.rating}</span>
          </div>
        </div>
        <p className="font-sans text-[13px] text-text-dim mb-2 leading-relaxed">{skill.desc}</p>
        <div className="flex items-center gap-3">
          <span className="font-sans text-xs text-text-muted">by @{skill.author}</span>
          <div className="flex gap-1">
            {skill.tags?.slice(0, 4).map((t) => (
              <span
                key={t}
                className="font-mono text-[11px] px-2 py-[3px] rounded bg-[#111318] text-text-dim border border-border-default"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};

export const Search = () => {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || 'All';

  const [category, setCategory] = useState(
    CATEGORY_NAMES.includes(categoryParam as (typeof CATEGORY_NAMES)[number])
      ? categoryParam
      : (Object.entries(CATEGORY_SLUGS).find(([, slug]) => slug === categoryParam)?.[0] ?? 'All'),
  );
  const [trustFilter, setTrustFilter] = useState('All');
  const [sort, setSort] = useState('relevance');

  const searchResults = queryParam.trim()
    ? SKILLS_DB.filter(
        (s) =>
          s.name.includes(queryParam.toLowerCase()) ||
          s.desc.toLowerCase().includes(queryParam.toLowerCase()) ||
          s.author.includes(queryParam.toLowerCase()) ||
          s.tags?.some((t) => t.includes(queryParam.toLowerCase())),
      )
    : SKILLS_DB;

  const filtered = searchResults
    .filter((s) => category === 'All' || s.category === CATEGORY_SLUGS[category])
    .filter((s) => trustFilter === 'All' || s.trust === trustFilter.toLowerCase());

  return (
    <div className="flex max-w-[1060px] mx-auto px-8 py-6 gap-7">
      {/* Sidebar filters */}
      <aside className="w-[200px] shrink-0">
        <div className="sticky top-[70px]">
          {/* Category filter */}
          <div className="mb-7">
            <h3 className="font-sans text-xs font-semibold text-text-dim mb-2.5 uppercase tracking-wide">
              Category
            </h3>
            {CATEGORY_NAMES.map((cat) => (
              <div
                key={cat}
                onClick={() => setCategory(cat)}
                className="font-sans text-[13px] px-2.5 py-1.5 rounded-md cursor-pointer transition-all duration-100 mb-[1px]"
                style={{
                  color: category === cat ? '#e2e8f0' : '#64748b',
                  background: category === cat ? 'rgba(16,185,129,0.07)' : 'transparent',
                }}
              >
                {cat}
              </div>
            ))}
          </div>

          {/* Trust filter */}
          <div className="mb-7">
            <h3 className="font-sans text-xs font-semibold text-text-dim mb-2.5 uppercase tracking-wide">
              Trust tier
            </h3>
            {TRUST_TIERS.map((tier) => (
              <div
                key={tier}
                onClick={() => setTrustFilter(tier)}
                className="font-sans text-[13px] px-2.5 py-1.5 rounded-md cursor-pointer transition-all duration-100 mb-[1px]"
                style={{
                  color: trustFilter === tier ? '#e2e8f0' : '#64748b',
                  background: trustFilter === tier ? 'rgba(16,185,129,0.07)' : 'transparent',
                }}
              >
                {tier}
              </div>
            ))}
          </div>

          {/* Platform filter */}
          <div>
            <h3 className="font-sans text-xs font-semibold text-text-dim mb-2.5 uppercase tracking-wide">
              Platform
            </h3>
            {['All platforms', 'Claude Code', 'Cursor', 'Codex'].map((p) => (
              <div
                key={p}
                className="font-sans text-[13px] px-2.5 py-1.5 rounded-md cursor-pointer mb-[1px]"
                style={{
                  color: p === 'All platforms' ? '#e2e8f0' : '#64748b',
                  background: p === 'All platforms' ? 'rgba(16,185,129,0.07)' : 'transparent',
                }}
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Results */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="font-sans text-sm text-text-secondary">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
            {queryParam && (
              <span className="font-sans text-sm text-text-dim"> for &quot;{queryParam}&quot;</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-sans text-xs text-text-muted">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="font-sans text-xs bg-bg-card text-text-secondary border border-border-default rounded-md px-2 py-1 outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filters */}
        {(category !== 'All' || trustFilter !== 'All') && (
          <div className="flex gap-1.5 mb-3.5 flex-wrap">
            {category !== 'All' && (
              <span
                onClick={() => setCategory('All')}
                className="font-sans text-xs px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  color: '#10b981',
                }}
              >
                {category} <span className="text-[10px]">&#x2715;</span>
              </span>
            )}
            {trustFilter !== 'All' && (
              <span
                onClick={() => setTrustFilter('All')}
                className="font-sans text-xs px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  color: '#10b981',
                }}
              >
                {trustFilter} <span className="text-[10px]">&#x2715;</span>
              </span>
            )}
          </div>
        )}

        {/* Skill list */}
        <div className="border border-border-default rounded-[10px] overflow-hidden">
          {filtered.length > 0 ? (
            filtered.map((skill) => <SearchResultRow key={skill.name} skill={skill} />)
          ) : (
            <div className="p-12 text-center">
              <div className="font-sans text-[15px] text-text-dim mb-2">
                No skills match these filters
              </div>
              <div className="font-sans text-[13px] text-text-muted">
                Try broadening your search or{' '}
                <Link to="#" className="text-accent no-underline">
                  publish your own
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
