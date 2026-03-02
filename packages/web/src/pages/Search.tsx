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
    <Link to={`/skills/${skill.name}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1a1d2744',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--color-cyan)', fontWeight: 600 }}>
              {skill.name}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-faint)' }}>
              {skill.version}
            </span>
            <TrustBadge tier={skill.trust} />
          </div>
          <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
            <span>&#x2B07; {skill.downloads}</span>
            <span style={{ color: 'var(--color-yellow)' }}>&#x2605; {skill.rating}</span>
          </div>
        </div>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-dim)', marginBottom: 8, lineHeight: 1.6, marginTop: 0 }}>
          {skill.desc}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-muted)' }}>
            by @{skill.author}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {skill.tags?.slice(0, 4).map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: '#111318',
                  color: 'var(--color-text-dim)',
                  border: '1px solid var(--color-border-default)',
                }}
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

const sidebarItemStyle = (isActive: boolean): React.CSSProperties => ({
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  padding: '6px 10px',
  borderRadius: 6,
  cursor: 'pointer',
  marginBottom: 1,
  color: isActive ? '#e2e8f0' : '#64748b',
  background: isActive ? 'rgba(16,185,129,0.07)' : 'transparent',
});

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
    <div style={{ display: 'flex', maxWidth: 1060, margin: '0 auto', padding: '24px 32px', gap: 28 }}>
      {/* Sidebar filters */}
      <aside style={{ width: 200, flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: 70 }}>
          {/* Category filter */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 0 }}>
              Category
            </h3>
            {CATEGORY_NAMES.map((cat) => (
              <div key={cat} onClick={() => setCategory(cat)} style={sidebarItemStyle(category === cat)}>
                {cat}
              </div>
            ))}
          </div>

          {/* Trust filter */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 0 }}>
              Trust tier
            </h3>
            {TRUST_TIERS.map((tier) => (
              <div key={tier} onClick={() => setTrustFilter(tier)} style={sidebarItemStyle(trustFilter === tier)}>
                {tier}
              </div>
            ))}
          </div>

          {/* Platform filter */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 0 }}>
              Platform
            </h3>
            {['All platforms', 'Claude Code', 'Cursor', 'Codex'].map((p) => (
              <div key={p} style={sidebarItemStyle(p === 'All platforms')}>
                {p}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Results */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
            {queryParam && (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-dim)' }}>
                {' '}for &quot;{queryParam}&quot;
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-muted)' }}>Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 6,
                padding: '4px 8px',
                outline: 'none',
                cursor: 'pointer',
              }}
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
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {category !== 'All' && (
              <span
                onClick={() => setCategory('All')}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(16,185,129,0.08)',
                  color: '#10b981',
                }}
              >
                {category} <span style={{ fontSize: 10 }}>&#x2715;</span>
              </span>
            )}
            {trustFilter !== 'All' && (
              <span
                onClick={() => setTrustFilter('All')}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(16,185,129,0.08)',
                  color: '#10b981',
                }}
              >
                {trustFilter} <span style={{ fontSize: 10 }}>&#x2715;</span>
              </span>
            )}
          </div>
        )}

        {/* Skill list */}
        <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 10, overflow: 'hidden' }}>
          {filtered.length > 0 ? (
            filtered.map((skill) => <SearchResultRow key={skill.name} skill={skill} />)
          ) : (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--color-text-dim)', marginBottom: 8 }}>
                No skills match these filters
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-muted)' }}>
                Try broadening your search or{' '}
                <Link to="#" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
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
