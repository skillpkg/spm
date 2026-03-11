import { useQuery } from '@tanstack/react-query';
import { useTabParam } from '../../lib/useTabParam';
import { useAuth } from '../../context/AuthContext';
import {
  type Author,
  type Skill,
  type WeeklyData,
  type ActivityEvent,
  type AgentStat,
} from './types';
import { MiniChart, StatBox, Tabs, TRUST_CONFIG, type TrustTier } from '@spm/ui';
import { OverviewTab } from './OverviewTab';
import { SkillsTab } from './SkillsTab';
import { PublishHistoryTab } from './PublishHistoryTab';
import { AnalyticsTab } from './AnalyticsTab';
import { authorStatsQuery, dashboardSkillsQuery } from './queries';

const AGENT_COLORS: Record<string, string> = {
  'claude-code': 'var(--color-accent)',
  cursor: 'var(--color-blue)',
  codex: 'var(--color-purple)',
  windsurf: 'var(--color-yellow)',
};

export const Dashboard = () => {
  const [tab, setTab] = useTabParam('tab', 'overview');
  const { user, token } = useAuth();
  const username = user?.username ?? 'unknown';
  const trustTier = (user?.trust_tier as TrustTier) ?? 'registered';
  const trustCfg = TRUST_CONFIG[trustTier] ?? TRUST_CONFIG['registered'];

  const { data: statsData } = useQuery(authorStatsQuery(username, token ?? ''));
  const { data: skillsData } = useQuery(dashboardSkillsQuery());

  const authorStats: Author = {
    username,
    github: username,
    email: '',
    trust: trustTier,
    joined: '',
    totalDownloads: statsData?.total_downloads ?? 0,
    weeklyDownloads: statsData?.weekly_downloads ?? 0,
    avgRating: statsData?.rating_avg ?? 0,
    totalReviews: statsData?.total_reviews ?? 0,
  };

  const weeklyTrend: WeeklyData[] =
    statsData?.weekly_trend.map((w) => ({
      week: w.week,
      downloads: w.downloads,
    })) ?? [];

  const agentBreakdown: AgentStat[] =
    statsData?.agent_breakdown.map((a) => ({
      agent: a.agent,
      pct: a.percentage,
      color: AGENT_COLORS[a.agent.toLowerCase()] ?? 'var(--color-text-dim)',
    })) ?? [];

  const recentActivity: ActivityEvent[] =
    statsData?.recent_activity.map((a) => ({
      type: a.type as ActivityEvent['type'],
      skill: a.skill,
      version: a.version,
      date: a.date.split('T')[0],
      detail: a.version ? `Published ${a.version}` : a.type,
    })) ?? [];

  const skills: Skill[] =
    skillsData?.results
      .filter((s) => s.author.username === username)
      .map((s) => ({
        name: s.name,
        version: s.version,
        categories: s.categories,
        desc: s.description,
        downloads: s.downloads,
        weeklyDownloads: s.weekly_downloads,
        weeklyGrowth: '',
        rating: s.rating_avg ?? 0,
        reviews: s.rating_count ?? 0,
        trust: s.author.trust_tier as TrustTier,
        published: s.published_at?.split('T')[0] ?? '',
        updated: s.updated_at?.split('T')[0] ?? '',
        status: 'published',
      })) ?? [];

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 32px 64px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 28,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <img
              src={`https://github.com/${username}.png?size=44`}
              alt={username}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: '1px solid var(--color-border-default)',
              }}
            />
            <div>
              <h1
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                @{username}
              </h1>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: trustCfg.color }}>
                {trustCfg.checks} {trustCfg.label} Author
              </div>
            </div>
          </div>
        </div>
        <a
          href="#"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--color-accent)',
            padding: '8px 18px',
            borderRadius: 8,
            border: '1px solid rgba(16,185,129,0.25)',
            textDecoration: 'none',
          }}
        >
          + Publish new skill
        </a>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <StatBox
          label="Total downloads"
          value={`${(authorStats.totalDownloads / 1000).toFixed(1)}k`}
          sub={`\u2191 ${authorStats.weeklyDownloads.toLocaleString()} this week`}
        />
        <StatBox label="Skills published" value={skills.length} />
        <StatBox
          label="Avg rating"
          value={`\u2605 ${authorStats.avgRating}`}
          sub={`${authorStats.totalReviews} reviews`}
          color="var(--color-yellow)"
        />
        <div
          style={{
            flex: 1,
            minWidth: 150,
            padding: '18px 20px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 10,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              marginBottom: 6,
            }}
          >
            Weekly trend
          </div>
          <MiniChart data={weeklyTrend.map((d) => ({ value: d.downloads }))} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'skills', label: `Skills (${skills.length})` },
          { id: 'publishes', label: 'Publish history' },
          { id: 'analytics', label: 'Analytics' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Tab content */}
      {tab === 'overview' && (
        <OverviewTab
          onViewAllSkills={() => setTab('skills')}
          skills={skills}
          activity={recentActivity}
          trustTier={trustTier}
          agents={agentBreakdown}
        />
      )}
      {tab === 'skills' && <SkillsTab skills={skills} />}
      {tab === 'publishes' && <PublishHistoryTab />}
      {tab === 'analytics' && (
        <AnalyticsTab
          trend={weeklyTrend}
          skills={skills}
          author={authorStats}
          agents={agentBreakdown}
        />
      )}
    </div>
  );
};
