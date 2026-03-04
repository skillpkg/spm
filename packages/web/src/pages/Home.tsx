import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CATEGORIES, type SkillSummary, type Category } from '../data/constants';
import { SkillCard } from '../components/SkillCard';
import { SkillRow } from '../components/SkillRow';
import { TrustBadge } from '@spm/ui';
import { getTrending, getCategories, type TrendingSkill, type CategoryItem } from '../lib/api';

type TrendingTab = 'featured' | 'rising' | 'most-installed' | 'new';

const TABS: { id: TrendingTab; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'rising', label: 'Rising' },
  { id: 'most-installed', label: 'Most installed' },
  { id: 'new', label: 'New' },
];

const formatDownloads = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const trendingToSummary = (s: TrendingSkill): SkillSummary => ({
  name: s.name,
  version: s.version ?? '0.0.0',
  desc: s.description,
  author: s.author.username,
  trust: s.author.trust_tier as SkillSummary['trust'],
  downloads: formatDownloads(s.downloads),
  weeklyGrowth: s.weekly_growth_pct ? `+${s.weekly_growth_pct}%` : undefined,
  rating: s.rating_avg != null ? String(s.rating_avg) : undefined,
});

const apiCategoryToCategory = (c: CategoryItem): Category => ({
  name: c.display,
  slug: c.slug,
  icon: c.icon,
  count: c.count,
});

export const Home = () => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [trendingTab, setTrendingTab] = useState<TrendingTab>('featured');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // API state for trending tabs
  const [featuredSkills, setFeaturedSkills] = useState<SkillSummary[]>([]);
  const [risingSkills, setRisingSkills] = useState<SkillSummary[]>([]);
  const [mostInstalledSkills, setMostInstalledSkills] = useState<SkillSummary[]>([]);
  const [newSkills, setNewSkills] = useState<SkillSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);

  // Fetch trending data on mount and tab change
  useEffect(() => {
    let cancelled = false;
    const apiTab = trendingTab === 'most-installed' ? 'most_installed' : trendingTab;

    getTrending(apiTab)
      .then((data) => {
        if (cancelled) return;
        const mapped = data.skills.map(trendingToSummary);
        if (mapped.length === 0) return;
        switch (trendingTab) {
          case 'featured':
            setFeaturedSkills(mapped);
            break;
          case 'rising':
            setRisingSkills(mapped);
            break;
          case 'most-installed':
            setMostInstalledSkills(mapped);
            break;
          case 'new':
            setNewSkills(mapped);
            break;
        }
      })
      .catch(() => {
        // On error: leave empty arrays
      });

    return () => {
      cancelled = true;
    };
  }, [trendingTab]);

  // Fetch categories on mount
  useEffect(() => {
    getCategories()
      .then((data) => {
        if (data.categories.length > 0) {
          setCategories(data.categories.map(apiCategoryToCategory));
        }
      })
      .catch(() => {
        // Fallback: keep static categories
      });
  }, []);

  const allSkills = [...featuredSkills, ...risingSkills, ...newSkills];
  const filtered = query.trim()
    ? allSkills.filter(
        (s) =>
          s.name.includes(query.toLowerCase()) ||
          (s.desc || '').toLowerCase().includes(query.toLowerCase()) ||
          s.author.includes(query.toLowerCase()),
      )
    : null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && (document.activeElement as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div>
      {/* Hero search */}
      <section
        style={{
          paddingTop: 40,
          paddingBottom: 32,
          paddingLeft: 32,
          paddingRight: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            width: 500,
            height: 250,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.035) 0%, transparent 70%)',
          }}
        />

        <h1
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 4,
            position: 'relative',
            marginTop: 0,
          }}
        >
          Find skills for your agents
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            color: 'var(--color-text-muted)',
            marginBottom: 20,
            marginTop: 0,
          }}
        >
          {categories.reduce((sum, c) => sum + c.count, 0)} skills &middot;{' '}
          {categories.length} categories
        </p>

        <div style={{ width: '100%', maxWidth: 600, position: 'relative' }}>
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--color-bg-card)',
                borderRadius: 10,
                padding: '0 16px',
                border: `1.5px solid ${focused ? '#10b981' : '#1e293b'}`,
                boxShadow: focused ? '0 0 0 3px rgba(16,185,129,0.07)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ color: 'var(--color-text-muted)', fontSize: 15, marginRight: 10 }}>
                &#x2315;
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="Search skills..."
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 15,
                  padding: '13px 0',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
              />
              {!query && (
                <kbd
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    padding: '2px 6px',
                    background: '#111318',
                    border: '1px solid #1e293b',
                    borderRadius: 4,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  /
                </kbd>
              )}
              {query && (
                <span
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  style={{
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: 4,
                  }}
                >
                  &#x2715;
                </span>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Content */}
      <section style={{ maxWidth: 920, margin: '0 auto', padding: '0 32px 60px' }}>
        {filtered ? (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                padding: '0 4px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--color-text-dim)',
                }}
              >
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &quot;{query}&quot;
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                }}
              >
                sorted by relevance
              </span>
            </div>
            <div
              style={{
                border: '1px solid var(--color-border-default)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {filtered.length > 0 ? (
                filtered.map((s) => <SkillRow key={s.name} skill={s} />)
              ) : (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 15,
                      color: 'var(--color-text-dim)',
                      marginBottom: 8,
                    }}
                  >
                    No skills found for &quot;{query}&quot;
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 13,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Try a different search, or{' '}
                    <Link to="#" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                      publish your own
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Trending section with tabs */}
            <div style={{ marginBottom: 40 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 0,
                  marginBottom: 18,
                  borderBottom: '1px solid var(--color-border-default)',
                }}
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTrendingTab(tab.id)}
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 13,
                      fontWeight: 500,
                      padding: '10px 18px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      borderBottom:
                        trendingTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
                      color: trendingTab === tab.id ? '#e2e8f0' : '#64748b',
                      marginBottom: -1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {trendingTab === 'featured' && (
                <div>
                  <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
                    {featuredSkills.slice(0, 3).map((s, i) => (
                      <SkillCard key={s.name} skill={s} rank={i} />
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                      padding: '0 2px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#7a8599',
                      }}
                    >
                      Also trending
                    </span>
                    <Link
                      to="/search"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--color-accent)',
                        textDecoration: 'none',
                      }}
                    >
                      View all &rarr;
                    </Link>
                  </div>
                  <div
                    style={{
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    {risingSkills.slice(0, 3).map((s) => (
                      <SkillRow key={s.name} skill={s} showGrowth />
                    ))}
                  </div>
                </div>
              )}

              {trendingTab === 'rising' && (
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      marginBottom: 12,
                      marginTop: 0,
                    }}
                  >
                    Fastest growing installs this week
                  </p>
                  <div
                    style={{
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    {risingSkills.map((s) => (
                      <SkillRow key={s.name} skill={s} showGrowth />
                    ))}
                  </div>
                </div>
              )}

              {trendingTab === 'most-installed' && (
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      marginBottom: 12,
                      marginTop: 0,
                    }}
                  >
                    All-time most installed skills
                  </p>
                  <div
                    style={{
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    {mostInstalledSkills.map((s, i) => (
                      <Link
                        key={s.name}
                        to={`/skills/${s.name}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '11px 16px',
                            gap: 12,
                            cursor: 'pointer',
                            borderBottom: '1px solid #1a1d2744',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 14,
                              fontWeight: 700,
                              minWidth: 24,
                              textAlign: 'right',
                              color: i < 3 ? '#10b981' : '#334155',
                            }}
                          >
                            #{i + 1}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 13,
                              color: 'var(--color-cyan)',
                              fontWeight: 500,
                              minWidth: 140,
                            }}
                          >
                            {s.name}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 11,
                              color: 'var(--color-text-faint)',
                            }}
                          >
                            {s.version}
                          </span>
                          <div style={{ flex: 1 }} />
                          <TrustBadge tier={s.trust} showLabel={false} />
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 11,
                              color: 'var(--color-text-muted)',
                              minWidth: 54,
                              textAlign: 'right',
                            }}
                          >
                            &#x2B07; {s.downloads}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 11,
                              color: 'var(--color-yellow)',
                              minWidth: 30,
                            }}
                          >
                            &#x2605; {s.rating}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {trendingTab === 'new' && (
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      marginBottom: 12,
                      marginTop: 0,
                    }}
                  >
                    Recently published skills
                  </p>
                  <div
                    style={{
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    {newSkills.map((s) => (
                      <SkillRow key={s.name} skill={s} showDaysAgo />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Categories */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <h2
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    margin: 0,
                  }}
                >
                  Browse by category
                </h2>
                <Link
                  to="/search"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--color-accent)',
                    textDecoration: 'none',
                  }}
                >
                  All categories &rarr;
                </Link>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {categories.map((cat) => (
                  <Link
                    key={cat.name}
                    to={`/search?category=${cat.slug}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 14px',
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{cat.icon}</span>
                      <span
                        style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#c8d0dc' }}
                      >
                        {cat.name}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {cat.count}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
