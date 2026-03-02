import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FEATURED,
  RISING,
  MOST_INSTALLED,
  NEW_THIS_WEEK,
  CATEGORIES,
  SEARCH_SUGGESTIONS,
  ALL_SKILLS,
} from '../data/mock';
import { SkillCard } from '../components/SkillCard';
import { SkillRow } from '../components/SkillRow';
import { TrustBadge } from '../components/TrustBadge';

type TrendingTab = 'featured' | 'rising' | 'most-installed' | 'new';

const TABS: { id: TrendingTab; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'rising', label: 'Rising' },
  { id: 'most-installed', label: 'Most installed' },
  { id: 'new', label: 'New' },
];

export const Home = () => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [trendingTab, setTrendingTab] = useState<TrendingTab>('featured');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = query.trim()
    ? ALL_SKILLS.filter(
        (s) =>
          s.name.includes(query.toLowerCase()) ||
          (s.desc || '').toLowerCase().includes(query.toLowerCase()) ||
          s.author.includes(query.toLowerCase()),
      )
    : null;

  const showSuggestions = focused && !query.trim();

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
      <section className="pt-10 pb-8 px-8 flex flex-col items-center relative">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: 500,
            height: 250,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.035) 0%, transparent 70%)',
          }}
        />

        <h1 className="font-sans text-2xl font-semibold text-text-primary mb-1 relative">
          Find skills for your agents
        </h1>
        <p className="font-sans text-sm text-text-muted mb-5">
          200+ skills &middot; 8 categories &middot; 37+ agent platforms
        </p>

        <div className="w-full max-w-[600px] relative">
          <form onSubmit={handleSubmit}>
            <div
              className="flex items-center bg-bg-card rounded-[10px] px-4 transition-all duration-200"
              style={{
                border: `1.5px solid ${focused ? '#10b981' : '#1e293b'}`,
                boxShadow: focused ? '0 0 0 3px rgba(16,185,129,0.07)' : 'none',
              }}
            >
              <span className="text-text-muted text-[15px] mr-2.5">&#x2315;</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="Search skills..."
                className="flex-1 font-sans text-[15px] py-[13px] bg-transparent border-none text-text-primary outline-none"
              />
              {!query && (
                <kbd className="font-mono text-[11px] px-1.5 py-[2px] bg-[#111318] border border-[#1e293b] rounded text-text-muted">
                  /
                </kbd>
              )}
              {query && (
                <span
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="text-text-muted cursor-pointer text-sm p-1"
                >
                  &#x2715;
                </span>
              )}
            </div>
          </form>

          {showSuggestions && (
            <div className="absolute top-[calc(100%+4px)] w-full bg-bg-card border border-[#1e293b] rounded-[10px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.4)] z-50">
              <div className="px-3.5 py-2 font-sans text-[11px] text-text-muted uppercase tracking-wide">
                Popular searches
              </div>
              {SEARCH_SUGGESTIONS.map((s, i) => (
                <div
                  key={i}
                  onMouseDown={() => {
                    setQuery(s.query);
                    navigate(`/search?q=${encodeURIComponent(s.query)}`);
                  }}
                  className="flex justify-between px-3.5 py-2.5 cursor-pointer hover:bg-bg-hover transition-colors"
                >
                  <span className="font-sans text-[13px] text-[#c8d0dc]">{s.query}</span>
                  <span className="font-mono text-[11px] text-text-muted">{s.results}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="max-w-[920px] mx-auto px-8 pb-[60px]">
        {filtered ? (
          <div>
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="font-sans text-[13px] text-text-dim">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &quot;{query}&quot;
              </span>
              <span className="font-mono text-xs text-text-muted">sorted by relevance</span>
            </div>
            <div className="border border-border-default rounded-[10px] overflow-hidden">
              {filtered.length > 0 ? (
                filtered.map((s) => <SkillRow key={s.name} skill={s} />)
              ) : (
                <div className="p-10 text-center">
                  <div className="font-sans text-[15px] text-text-dim mb-2">
                    No skills found for &quot;{query}&quot;
                  </div>
                  <div className="font-sans text-[13px] text-text-muted">
                    Try a different search, or{' '}
                    <Link to="#" className="text-accent no-underline">
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
            <div className="mb-10">
              <div className="flex gap-0.5 mb-[18px] border-b border-border-default">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTrendingTab(tab.id)}
                    className="font-sans text-[13px] font-medium px-4 py-2 pb-2.5 border-none bg-transparent cursor-pointer transition-all duration-150"
                    style={{
                      borderBottom:
                        trendingTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
                      color: trendingTab === tab.id ? '#e2e8f0' : '#64748b',
                      marginBottom: -1,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {trendingTab === 'featured' && (
                <div>
                  <div className="flex gap-3.5 mb-6">
                    {FEATURED.map((s, i) => (
                      <SkillCard key={s.name} skill={s} rank={i} />
                    ))}
                  </div>
                  <div className="flex justify-between items-center mb-2.5 px-0.5">
                    <span className="font-sans text-[13px] font-medium text-[#7a8599]">
                      Also trending
                    </span>
                    <Link to="/search" className="font-mono text-xs text-accent no-underline">
                      View all &rarr;
                    </Link>
                  </div>
                  <div className="border border-border-default rounded-[10px] overflow-hidden">
                    {RISING.slice(0, 3).map((s) => (
                      <SkillRow key={s.name} skill={s} showGrowth />
                    ))}
                  </div>
                </div>
              )}

              {trendingTab === 'rising' && (
                <div>
                  <p className="font-sans text-xs text-text-muted mb-3">
                    Fastest growing installs this week
                  </p>
                  <div className="border border-border-default rounded-[10px] overflow-hidden">
                    {RISING.map((s) => (
                      <SkillRow key={s.name} skill={s} showGrowth />
                    ))}
                  </div>
                </div>
              )}

              {trendingTab === 'most-installed' && (
                <div>
                  <p className="font-sans text-xs text-text-muted mb-3">
                    All-time most installed skills
                  </p>
                  <div className="border border-border-default rounded-[10px] overflow-hidden">
                    {MOST_INSTALLED.map((s, i) => (
                      <Link key={s.name} to={`/skills/${s.name}`} className="no-underline">
                        <div className="flex items-center px-4 py-[11px] gap-3 cursor-pointer hover:bg-bg-hover transition-colors border-b border-[#1a1d2744]">
                          <span
                            className="font-mono text-sm font-bold min-w-[24px] text-right"
                            style={{
                              color: i < 3 ? '#10b981' : '#334155',
                            }}
                          >
                            #{i + 1}
                          </span>
                          <span className="font-mono text-[13px] text-cyan font-medium min-w-[140px]">
                            {s.name}
                          </span>
                          <span className="font-mono text-[11px] text-text-faint">{s.version}</span>
                          <div className="flex-1" />
                          <TrustBadge tier={s.trust} showLabel={false} />
                          <span className="font-mono text-[11px] text-text-muted min-w-[54px] text-right">
                            &#x2B07; {s.downloads}
                          </span>
                          <span className="font-mono text-[11px] text-yellow min-w-[30px]">
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
                  <p className="font-sans text-xs text-text-muted mb-3">
                    Recently published skills
                  </p>
                  <div className="border border-border-default rounded-[10px] overflow-hidden">
                    {NEW_THIS_WEEK.map((s) => (
                      <SkillRow key={s.name} skill={s} showDaysAgo />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Categories */}
            <div>
              <div className="flex justify-between items-center mb-3.5">
                <h2 className="font-sans text-[15px] font-semibold text-text-secondary m-0">
                  Browse by category
                </h2>
                <Link to="/search" className="font-mono text-xs text-accent no-underline">
                  All categories &rarr;
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Link key={cat.name} to={`/search?category=${cat.slug}`} className="no-underline">
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-bg-card border border-border-default rounded-lg cursor-pointer hover:bg-bg-hover hover:border-border-hover transition-all duration-150">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="font-sans text-[13px] text-[#c8d0dc]">{cat.name}</span>
                      <span className="font-mono text-[11px] text-text-muted">{cat.count}</span>
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
