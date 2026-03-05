import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  type Author,
  type Skill,
  type WeeklyData,
  type ActivityEvent,
  type AgentStat,
} from './dashboard/types';
import { MiniChart, StatBox, Tabs, TRUST_CONFIG, type TrustTier } from '@spm/ui';
import { OverviewTab } from './dashboard/OverviewTab';
import { SkillsTab } from './dashboard/SkillsTab';
import { PublishHistoryTab } from './dashboard/PublishHistoryTab';
import { AnalyticsTab } from './dashboard/AnalyticsTab';
import { getAuthorStats, searchSkills } from '../lib/api';

const AGENT_COLORS: Record<string, string> = {
  'claude-code': 'var(--color-accent)',
  cursor: 'var(--color-blue)',
  codex: 'var(--color-purple)',
  windsurf: 'var(--color-yellow)',
};

export const Dashboard = () => {
  const [tab, setTab] = useState('overview');
  const { user, token } = useAuth();
  const username = user?.username ?? 'unknown';
  const trustTier = (user?.trust_tier as TrustTier) ?? 'registered';
  const trustCfg = TRUST_CONFIG[trustTier] ?? TRUST_CONFIG['registered'];

  // API-driven state
  const [authorStats, setAuthorStats] = useState<Author>({
    username,
    github: username,
    email: '',
    trust: trustTier,
    joined: '',
    totalDownloads: 0,
    weeklyDownloads: 0,
    avgRating: 0,
    totalReviews: 0,
  });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyData[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [agentBreakdown, setAgentBreakdown] = useState<AgentStat[]>([]);

  useEffect(() => {
    if (!username || !token) return;
    let cancelled = false;

    // Fetch author stats
    getAuthorStats(username, token)
      .then((data) => {
        if (cancelled) return;
        setAuthorStats((prev) => ({
          ...prev,
          username,
          totalDownloads: data.total_downloads,
          weeklyDownloads: data.weekly_downloads,
          avgRating: data.rating_avg,
          totalReviews: data.total_reviews,
        }));
        if (data.weekly_trend.length > 0) {
          setWeeklyTrend(
            data.weekly_trend.map((w) => ({
              week: w.week,
              downloads: w.downloads,
            })),
          );
        }
        if (data.agent_breakdown.length > 0) {
          setAgentBreakdown(
            data.agent_breakdown.map((a) => ({
              agent: a.agent,
              pct: a.percentage,
              color: AGENT_COLORS[a.agent.toLowerCase()] ?? 'var(--color-text-dim)',
            })),
          );
        }
        if (data.recent_activity.length > 0) {
          setRecentActivity(
            data.recent_activity.map((a) => ({
              type: a.type as ActivityEvent['type'],
              skill: a.skill,
              version: a.version,
              date: a.date.split('T')[0],
              detail: a.version ? `Published ${a.version}` : a.type,
            })),
          );
        }
      })
      .catch(() => {
        // On error: leave empty state
      });

    // Fetch user's skills
    searchSkills({ q: '', per_page: 50 })
      .then((data) => {
        if (cancelled) return;
        const mySkills = data.results
          .filter((s) => s.author.username === username)
          .map((s) => ({
            name: s.name,
            version: s.version,
            category: s.category,
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
          }));
        setSkills(mySkills);
      })
      .catch(() => {
        // On error: leave empty state
      });

    return () => {
      cancelled = true;
    };
  }, [username, token]);

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
