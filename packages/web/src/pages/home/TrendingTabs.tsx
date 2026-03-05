import { Link } from 'react-router-dom';
import { type SkillSummary } from '../../data/constants';
import { SkillCard } from '../../components/SkillCard';
import { SkillRow } from '../../components/SkillRow';
import { TrustBadge } from '@spm/ui';

type TrendingTab = 'featured' | 'rising' | 'most-installed' | 'new';

const TABS: { id: TrendingTab; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'rising', label: 'Rising' },
  { id: 'most-installed', label: 'Most installed' },
  { id: 'new', label: 'New' },
];

interface TrendingTabsProps {
  trendingTab: TrendingTab;
  setTrendingTab: (tab: TrendingTab) => void;
  featuredSkills: SkillSummary[];
  risingSkills: SkillSummary[];
  mostInstalledSkills: SkillSummary[];
  newSkills: SkillSummary[];
}

export const TrendingTabs = ({
  trendingTab,
  setTrendingTab,
  featuredSkills,
  risingSkills,
  mostInstalledSkills,
  newSkills,
}: TrendingTabsProps) => {
  return (
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
              borderBottom: trendingTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
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
              <Link key={s.name} to={`/skills/${s.name}`} style={{ textDecoration: 'none' }}>
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
  );
};

export type { TrendingTab };
