import { Link } from 'react-router-dom';
import { type SkillSummary } from '../../data/constants';
import { SkillCard } from '../../components/SkillCard';
import { SkillRow } from '../../components/SkillRow';
import { TrustBadge, Text } from '@spm/ui';
import { skillPath, bareName, extractScope } from '../../lib/urls';

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
          <div className="spm-trending-grid" style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
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
            <Text variant="body-sm" font="sans" weight={500} as="span" style={{ color: '#7a8599' }}>
              Also trending
            </Text>
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
          <Text
            variant="caption"
            font="sans"
            color="muted"
            as="p"
            style={{ marginBottom: 12, marginTop: 0 }}
          >
            Fastest growing installs this week
          </Text>
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
          <Text
            variant="caption"
            font="sans"
            color="muted"
            as="p"
            style={{ marginBottom: 12, marginTop: 0 }}
          >
            All-time most installed skills
          </Text>
          <div
            style={{
              border: '1px solid var(--color-border-default)',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            {mostInstalledSkills.map((s, i) => (
              <Link key={s.name} to={skillPath(s.name)} style={{ textDecoration: 'none' }}>
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
                  <Text
                    variant="body"
                    font="mono"
                    weight={700}
                    as="span"
                    style={{
                      minWidth: 24,
                      textAlign: 'right',
                      color: i < 3 ? '#10b981' : '#334155',
                    }}
                  >
                    #{i + 1}
                  </Text>
                  <Text
                    variant="body-sm"
                    font="mono"
                    weight={500}
                    as="span"
                    style={{ color: 'var(--color-cyan)', minWidth: 140 }}
                  >
                    {bareName(s.name)}
                  </Text>
                  <Text variant="label" font="mono" color="faint" as="span">
                    {s.version}
                  </Text>
                  {extractScope(s.name) && (
                    <Text variant="label" font="sans" color="muted" as="span">
                      by {extractScope(s.name)}
                    </Text>
                  )}
                  <div style={{ flex: 1 }} />
                  <TrustBadge tier={s.trust} showLabel={false} />
                  <Text
                    variant="label"
                    font="mono"
                    color="muted"
                    as="span"
                    style={{ minWidth: 54, textAlign: 'right' }}
                  >
                    &#x2B07; {s.downloads}
                  </Text>
                  <Text
                    variant="label"
                    font="mono"
                    as="span"
                    style={{ color: 'var(--color-yellow)', minWidth: 30 }}
                  >
                    &#x2605; {s.rating}
                  </Text>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {trendingTab === 'new' && (
        <div>
          <Text
            variant="caption"
            font="sans"
            color="muted"
            as="p"
            style={{ marginBottom: 12, marginTop: 0 }}
          >
            Recently published skills
          </Text>
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
