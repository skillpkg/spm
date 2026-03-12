import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CATEGORY_NAMES, CATEGORY_SLUGS, TRUST_TIERS, SORT_OPTIONS } from '../data/constants';
import { TrustBadge, SecurityBadge, Text, type TrustTier, type SecurityLevel } from '@spm/ui';
import { type SearchResultItem } from '../lib/api';
import { searchSkillsQuery } from './search/queries';

interface DisplaySkill {
  name: string;
  version: string;
  desc: string;
  author: string;
  trust: TrustTier;
  securityLevel: SecurityLevel;
  downloads: string;
  rating: string;
  tags?: string[];
}

const apiResultToDisplay = (s: SearchResultItem): DisplaySkill => ({
  name: s.name,
  version: s.version,
  desc: s.description,
  author: s.author.username,
  trust: s.author.trust_tier as TrustTier,
  securityLevel: (s.scan_security_level as SecurityLevel) ?? 'unscanned',
  downloads: s.downloads >= 1000 ? `${(s.downloads / 1000).toFixed(1)}k` : String(s.downloads),
  rating: s.rating_avg != null ? String(s.rating_avg) : '--',
  tags: s.tags,
});

const SearchResultRow = ({ skill }: { skill: DisplaySkill }) => {
  return (
    <Link to={`/skills/${skill.name}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1a1d2744',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text
              variant="h4"
              font="mono"
              weight={600}
              as="span"
              style={{ color: 'var(--color-cyan)' }}
            >
              {skill.name}
            </Text>
            <Text variant="caption" font="mono" color="faint" as="span">
              {skill.version}
            </Text>
            <TrustBadge tier={skill.trust} />
            <SecurityBadge level={skill.securityLevel} showLabel={false} />
          </div>
          <Text
            variant="caption"
            font="mono"
            color="muted"
            as="div"
            style={{ display: 'flex', gap: 16 }}
          >
            <span>&#x2B07; {skill.downloads}</span>
            <span style={{ color: 'var(--color-yellow)' }}>&#x2605; {skill.rating}</span>
          </Text>
        </div>
        <Text
          variant="body-sm"
          font="sans"
          color="dim"
          as="p"
          style={{ marginBottom: 8, lineHeight: 1.6, marginTop: 0 }}
        >
          {skill.desc}
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text variant="caption" font="sans" color="muted" as="span">
            by @{skill.author}
          </Text>
          <div style={{ display: 'flex', gap: 4 }}>
            {skill.tags?.slice(0, 4).map((t) => (
              <Text
                key={t}
                variant="label"
                font="mono"
                color="dim"
                as="span"
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: '#111318',
                  border: '1px solid var(--color-border-default)',
                }}
              >
                {t}
              </Text>
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
  const [securityFilter, setSecurityFilter] = useState('Any');
  const [sort, setSort] = useState('relevance');
  const params: Record<string, string | number> = { per_page: 50 };
  if (queryParam.trim()) params.q = queryParam.trim();
  if (category !== 'All') params.category = CATEGORY_SLUGS[category] ?? category;
  if (trustFilter !== 'All') params.trust = trustFilter.toLowerCase();
  if (securityFilter !== 'Any') params.security = securityFilter.toLowerCase().replace(' ', '');
  if (sort !== 'relevance') params.sort = sort;

  const { data: searchData } = useQuery(searchSkillsQuery(params));

  const filtered: DisplaySkill[] = searchData?.results.map(apiResultToDisplay) ?? [];
  const displayTotal = searchData?.total ?? filtered.length;

  return (
    <div
      style={{ display: 'flex', maxWidth: 1060, margin: '0 auto', padding: '24px 32px', gap: 28 }}
    >
      {/* Sidebar filters */}
      <aside style={{ width: 200, flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: 70 }}>
          {/* Category filter */}
          <div style={{ marginBottom: 28 }}>
            <Text
              variant="caption"
              font="sans"
              color="dim"
              weight={600}
              as="h3"
              style={{
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 0,
              }}
            >
              Category
            </Text>
            {CATEGORY_NAMES.map((cat) => (
              <div
                key={cat}
                onClick={() => setCategory(cat)}
                style={sidebarItemStyle(category === cat)}
              >
                {cat}
              </div>
            ))}
          </div>

          {/* Trust filter */}
          <div style={{ marginBottom: 28 }}>
            <Text
              variant="caption"
              font="sans"
              color="dim"
              weight={600}
              as="h3"
              style={{
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 0,
              }}
            >
              Trust tier
            </Text>
            {TRUST_TIERS.map((tier) => (
              <div
                key={tier}
                onClick={() => setTrustFilter(tier)}
                style={sidebarItemStyle(trustFilter === tier)}
              >
                {tier}
              </div>
            ))}
          </div>

          {/* Security filter */}
          <div style={{ marginBottom: 28 }}>
            <Text
              variant="caption"
              font="sans"
              color="dim"
              weight={600}
              as="h3"
              style={{
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 0,
              }}
            >
              Security
            </Text>
            {['Any', 'Verified', 'Partial'].map((opt) => (
              <div
                key={opt}
                onClick={() => setSecurityFilter(opt)}
                style={sidebarItemStyle(securityFilter === opt)}
              >
                {opt}
              </div>
            ))}
          </div>

          {/* Platform filter */}
          <div>
            <Text
              variant="caption"
              font="sans"
              color="dim"
              weight={600}
              as="h3"
              style={{
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 0,
              }}
            >
              Platform
            </Text>
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div>
            <Text variant="body" font="sans" color="secondary" as="span">
              {displayTotal} result{displayTotal !== 1 ? 's' : ''}
            </Text>
            {queryParam && (
              <Text variant="body" font="sans" color="dim" as="span">
                {' '}
                for &quot;{queryParam}&quot;
              </Text>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text variant="caption" font="sans" color="muted" as="span">
              Sort:
            </Text>
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
        {(category !== 'All' || trustFilter !== 'All' || securityFilter !== 'Any') && (
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
                {category}{' '}
                <Text variant="tiny" as="span">
                  &#x2715;
                </Text>
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
                {trustFilter}{' '}
                <Text variant="tiny" as="span">
                  &#x2715;
                </Text>
              </span>
            )}
            {securityFilter !== 'Any' && (
              <span
                onClick={() => setSecurityFilter('Any')}
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
                {securityFilter}{' '}
                <Text variant="tiny" as="span">
                  &#x2715;
                </Text>
              </span>
            )}
          </div>
        )}

        {/* Skill list */}
        <div
          style={{
            border: '1px solid var(--color-border-default)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {filtered.length > 0 ? (
            filtered.map((skill) => <SearchResultRow key={skill.name} skill={skill} />)
          ) : (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Text variant="h4" font="sans" color="dim" as="div" style={{ marginBottom: 8 }}>
                No skills match these filters
              </Text>
              <Text variant="body-sm" font="sans" color="muted" as="div">
                Try broadening your search or{' '}
                <Link to="#" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                  publish your own
                </Link>
              </Text>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
