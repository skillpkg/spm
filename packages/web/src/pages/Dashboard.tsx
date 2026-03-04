import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  type Author,
  type Skill,
  type WeeklyData,
  type ActivityEvent,
  type AgentStat,
} from './dashboard/types';
import {
  ActivityItem,
  BarSegment,
  MiniChart,
  StatBox,
  Tabs,
  TRUST_CONFIG,
  type TrustTier,
} from '@spm/ui';
import { SkillRow } from './dashboard/SkillRow';
import { TrustProgress } from './dashboard/TrustProgress';
import { getAuthorStats, searchSkills } from '../lib/api';

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 10,
  overflow: 'hidden',
};

const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  marginBottom: 16,
};

const SkillsTableHeader = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '1fr 100px 100px 90px 80px',
      padding: '8px 18px',
      borderBottom: '1px solid var(--color-border-default)',
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      color: 'var(--color-text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}
  >
    <span>Skill</span>
    <span style={{ textAlign: 'right' }}>Downloads</span>
    <span style={{ textAlign: 'right' }}>Rating</span>
    <span style={{ textAlign: 'right' }}>Trust</span>
    <span style={{ textAlign: 'right' }}>Updated</span>
  </div>
);

interface OverviewTabProps {
  onViewAllSkills: () => void;
  skills: Skill[];
  activity: ActivityEvent[];
  trustTier: TrustTier;
  agents: AgentStat[];
}

const OverviewTab = ({
  onViewAllSkills,
  skills: skillsList,
  activity,
  trustTier: tier,
  agents,
}: OverviewTabProps) => (
  <div style={{ display: 'flex', gap: 20 }}>
    {/* Main column */}
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Skills */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
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
            Your skills
          </h2>
          <span
            onClick={onViewAllSkills}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--color-accent)',
              cursor: 'pointer',
            }}
          >
            View all &rarr;
          </span>
        </div>
        <div style={cardStyle}>
          <SkillsTableHeader />
          {skillsList.map((s) => (
            <SkillRow key={s.name} skill={s} />
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            marginBottom: 10,
            marginTop: 0,
          }}
        >
          Recent activity
        </h2>
        <div style={{ ...cardStyle, padding: '6px 18px' }}>
          {activity.map((item, i) => (
            <ActivityItem key={i} item={item} />
          ))}
        </div>
      </div>
    </div>

    {/* Sidebar */}
    <aside style={{ width: 240, flexShrink: 0 }}>
      <TrustProgress currentTier={tier} />

      {/* Agent breakdown */}
      <div style={{ ...cardStyle, padding: '18px 20px', marginTop: 14 }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 14,
          }}
        >
          Installs by agent
        </div>
        {/* Stacked bar */}
        <div
          style={{
            display: 'flex',
            height: 28,
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: 14,
          }}
        >
          {agents.map((a) => (
            <BarSegment key={a.agent} pct={a.pct} color={a.color} label={a.agent} />
          ))}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {agents.map((a) => (
            <div
              key={a.agent}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color }} />
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {a.agent}
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-text-dim)',
                }}
              >
                {a.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ ...cardStyle, padding: '16px 20px', marginTop: 14 }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 10,
          }}
        >
          Quick links
        </div>
        {['Public profile', 'Account settings', 'API tokens', 'Publish guide'].map((label) => (
          <a
            key={label}
            href="#"
            style={{
              display: 'block',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-blue)',
              textDecoration: 'none',
              padding: '4px 0',
            }}
          >
            {label}
          </a>
        ))}
      </div>
    </aside>
  </div>
);

const SkillsTab = ({ skills: skillsList }: { skills: Skill[] }) => (
  <div style={cardStyle}>
    <SkillsTableHeader />
    {skillsList.map((s) => (
      <SkillRow key={s.name} skill={s} />
    ))}
  </div>
);

const PublishHistoryTab = () => (
  <div>
    <div style={cardStyle}>
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            color: 'var(--color-text-dim)',
          }}
        >
          No publish history yet
        </div>
      </div>
    </div>
  </div>
);

interface AnalyticsTabProps {
  trend: WeeklyData[];
  skills: Skill[];
  author: Author;
  agents: AgentStat[];
}

const AnalyticsTab = ({
  trend,
  skills: skillsList,
  author: authorData,
  agents,
}: AnalyticsTabProps) => {
  const maxDownloads = Math.max(...trend.map((d) => d.downloads));

  return (
    <div>
      {/* Weekly downloads chart */}
      <div style={{ ...cardStyle, padding: '20px 24px', marginBottom: 20 }}>
        <div style={sectionTitle}>Weekly downloads</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
          {trend.map((w, i) => {
            const barHeight = (w.downloads / maxDownloads) * 100;
            const isLast = i === trend.length - 1;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {(w.downloads / 1000).toFixed(1)}k
                </span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 48,
                    borderRadius: '4px 4px 0 0',
                    height: barHeight,
                    background: isLast
                      ? 'linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-dim) 100%)'
                      : 'rgba(16,185,129,0.19)',
                    transition: 'all 0.3s',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {w.week.split(' ')[1]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-skill breakdown */}
      <div style={{ ...cardStyle, padding: '20px 24px', marginBottom: 20 }}>
        <div style={sectionTitle}>Downloads by skill</div>
        {skillsList.map((skill) => {
          const pct = Math.round((skill.downloads / (authorData.totalDownloads || 1)) * 100);
          return (
            <div key={skill.name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--color-cyan)',
                  }}
                >
                  {skill.name}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {(skill.downloads / 1000).toFixed(1)}k ({pct}%)
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 6,
                  background: 'rgba(16,185,129,0.1)',
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: 'var(--color-accent)',
                    borderRadius: 2,
                    width: `${pct}%`,
                    transition: 'all 0.4s',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent breakdown (bigger version) */}
      <div style={{ ...cardStyle, padding: '20px 24px' }}>
        <div style={sectionTitle}>Installs by agent platform</div>
        {agents.map((a) => (
          <div key={a.agent} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {a.agent}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-text-dim)',
                }}
              >
                {a.pct}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                borderRadius: 2,
                background: `color-mix(in srgb, ${a.color} 12%, transparent)`,
              }}
            >
              <div
                style={{ height: '100%', borderRadius: 2, width: `${a.pct}%`, background: a.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
