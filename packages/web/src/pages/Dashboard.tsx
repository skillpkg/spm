import { useState } from 'react';
import {
  AUTHOR,
  MY_SKILLS,
  WEEKLY_TREND,
  RECENT_ACTIVITY,
  PUBLISH_HISTORY,
  AGENT_BREAKDOWN,
  TRUST_CONFIG,
} from './dashboard/mock-data';
import { StatCard } from './dashboard/StatCard';
import { MiniChart } from './dashboard/MiniChart';
import { SkillRow } from './dashboard/SkillRow';
import { ActivityItem } from './dashboard/ActivityItem';
import { PublishRow } from './dashboard/PublishRow';
import { TrustProgress } from './dashboard/TrustProgress';
import { BarSegment } from './dashboard/BarSegment';
import { DashboardTabs } from './dashboard/DashboardTabs';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'skills', label: `Skills (${MY_SKILLS.length})` },
  { id: 'publishes', label: 'Publish history' },
  { id: 'analytics', label: 'Analytics' },
];

const SkillsTableHeader = () => (
  <div
    className="grid px-[18px] py-2 border-b border-border-default font-sans text-[11px] text-text-muted uppercase tracking-wide"
    style={{ gridTemplateColumns: '1fr 100px 100px 90px 80px' }}
  >
    <span>Skill</span>
    <span className="text-right">Downloads</span>
    <span className="text-right">Rating</span>
    <span className="text-right">Trust</span>
    <span className="text-right">Updated</span>
  </div>
);

const PublishTableHeader = () => (
  <div
    className="grid px-4 py-2 border-b border-border-default font-sans text-[11px] text-text-muted uppercase tracking-wide gap-3"
    style={{ gridTemplateColumns: '140px 60px 1fr 100px 70px' }}
  >
    <span>Skill</span>
    <span>Status</span>
    <span>Detail</span>
    <span className="text-right">Date</span>
    <span className="text-right">Scan</span>
  </div>
);

const OverviewTab = ({ onViewAllSkills }: { onViewAllSkills: () => void }) => (
  <div className="flex gap-5">
    {/* Main column */}
    <div className="flex-1 min-w-0">
      {/* Skills */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2.5">
          <h2 className="font-sans text-[15px] font-semibold text-text-secondary">Your skills</h2>
          <span
            onClick={onViewAllSkills}
            className="font-mono text-xs text-accent cursor-pointer hover:opacity-80"
          >
            View all &rarr;
          </span>
        </div>
        <div className="border border-border-default rounded-[10px] overflow-hidden">
          <SkillsTableHeader />
          {MY_SKILLS.map((s) => (
            <SkillRow key={s.name} skill={s} />
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="font-sans text-[15px] font-semibold text-text-secondary mb-2.5">
          Recent activity
        </h2>
        <div className="px-[18px] py-1.5 bg-bg-card border border-border-default rounded-[10px]">
          {RECENT_ACTIVITY.map((item, i) => (
            <ActivityItem key={i} item={item} />
          ))}
        </div>
      </div>
    </div>

    {/* Sidebar */}
    <aside className="w-60 shrink-0">
      <TrustProgress currentTier={AUTHOR.trust} />

      {/* Agent breakdown */}
      <div className="px-5 py-[18px] bg-bg-card border border-border-default rounded-[10px] mt-3.5">
        <div className="font-sans text-sm font-semibold text-text-primary mb-3.5">
          Installs by agent
        </div>
        {/* Stacked bar */}
        <div className="flex h-7 rounded-md overflow-hidden mb-3.5">
          {AGENT_BREAKDOWN.map((a) => (
            <BarSegment key={a.agent} pct={a.pct} color={a.color} label={a.agent} />
          ))}
        </div>
        {/* Legend */}
        <div className="flex flex-col gap-1.5">
          {AGENT_BREAKDOWN.map((a) => (
            <div key={a.agent} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm" style={{ background: a.color }} />
                <span className="font-sans text-xs text-text-secondary">{a.agent}</span>
              </div>
              <span className="font-mono text-xs text-text-dim">{a.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="px-5 py-4 bg-bg-card border border-border-default rounded-[10px] mt-3.5">
        <div className="font-sans text-sm font-semibold text-text-primary mb-2.5">Quick links</div>
        {['Public profile', 'Account settings', 'API tokens', 'Publish guide'].map((label) => (
          <a
            key={label}
            href="#"
            className="block font-sans text-[13px] text-blue no-underline py-1 hover:opacity-80"
          >
            {label}
          </a>
        ))}
      </div>
    </aside>
  </div>
);

const SkillsTab = () => (
  <div className="border border-border-default rounded-[10px] overflow-hidden">
    <SkillsTableHeader />
    {MY_SKILLS.map((s) => (
      <SkillRow key={s.name} skill={s} />
    ))}
  </div>
);

const PublishHistoryTab = () => {
  const successCount = PUBLISH_HISTORY.filter((p) => p.status === 'success').length;
  const blockedCount = PUBLISH_HISTORY.filter((p) => p.status === 'blocked').length;
  const heldCount = PUBLISH_HISTORY.filter((p) => p.status === 'held').length;

  return (
    <div>
      <div className="border border-border-default rounded-[10px] overflow-hidden">
        <PublishTableHeader />
        {PUBLISH_HISTORY.map((item, i) => (
          <PublishRow key={i} item={item} />
        ))}
      </div>
      <div className="mt-4 px-[18px] py-3.5 bg-bg-card border border-border-default rounded-[10px]">
        <div className="font-sans text-[13px] text-text-secondary">
          <span className="font-mono text-accent">{successCount}</span> successful
          {' \u00b7 '}
          <span className="font-mono text-red">{blockedCount}</span> blocked
          {' \u00b7 '}
          <span className="font-mono text-yellow">{heldCount}</span> held for review
          {' \u00b7 '}
          <span className="font-mono text-text-dim">{PUBLISH_HISTORY.length}</span> total attempts
        </div>
      </div>
    </div>
  );
};

const AnalyticsTab = () => {
  const maxDownloads = Math.max(...WEEKLY_TREND.map((d) => d.downloads));

  return (
    <div>
      {/* Weekly downloads chart */}
      <div className="px-6 py-5 bg-bg-card border border-border-default rounded-[10px] mb-5">
        <div className="font-sans text-sm font-semibold text-text-primary mb-4">
          Weekly downloads
        </div>
        <div className="flex items-end gap-1.5 h-[120px]">
          {WEEKLY_TREND.map((w, i) => {
            const barHeight = (w.downloads / maxDownloads) * 100;
            const isLast = i === WEEKLY_TREND.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="font-mono text-[10px] text-text-muted">
                  {(w.downloads / 1000).toFixed(1)}k
                </span>
                <div
                  className="w-full max-w-[48px] rounded-t transition-all duration-300"
                  style={{
                    height: barHeight,
                    background: isLast
                      ? 'linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-dim) 100%)'
                      : 'rgba(16,185,129,0.19)',
                  }}
                />
                <span className="font-mono text-[9px] text-text-muted">{w.week.split(' ')[1]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-skill breakdown */}
      <div className="px-6 py-5 bg-bg-card border border-border-default rounded-[10px] mb-5">
        <div className="font-sans text-sm font-semibold text-text-primary mb-4">
          Downloads by skill
        </div>
        {MY_SKILLS.map((skill) => {
          const pct = Math.round((skill.downloads / AUTHOR.totalDownloads) * 100);
          return (
            <div key={skill.name} className="mb-3.5">
              <div className="flex justify-between mb-1">
                <span className="font-mono text-[13px] text-cyan">{skill.name}</span>
                <span className="font-mono text-xs text-text-secondary">
                  {(skill.downloads / 1000).toFixed(1)}k ({pct}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-accent/10 rounded-sm">
                <div
                  className="h-full bg-accent rounded-sm transition-all duration-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent breakdown (bigger version) */}
      <div className="px-6 py-5 bg-bg-card border border-border-default rounded-[10px]">
        <div className="font-sans text-sm font-semibold text-text-primary mb-4">
          Installs by agent platform
        </div>
        {AGENT_BREAKDOWN.map((a) => (
          <div key={a.agent} className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="font-sans text-[13px] text-text-secondary">{a.agent}</span>
              <span className="font-mono text-xs text-text-dim">{a.pct}%</span>
            </div>
            <div
              className="w-full h-1.5 rounded-sm"
              style={{ background: `color-mix(in srgb, ${a.color} 12%, transparent)` }}
            >
              <div
                className="h-full rounded-sm"
                style={{ width: `${a.pct}%`, background: a.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const [tab, setTab] = useState('overview');
  const trustCfg = TRUST_CONFIG[AUTHOR.trust];

  return (
    <div className="max-w-[980px] mx-auto px-8 py-7 pb-16">
      {/* Header */}
      <div className="flex justify-between items-start mb-7">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-11 h-11 rounded-[10px] bg-bg-hover border border-border-default flex items-center justify-center font-mono text-xl text-text-dim">
              A
            </div>
            <div>
              <h1 className="font-mono text-[22px] font-bold text-text-primary">
                @{AUTHOR.username}
              </h1>
              <div className="font-mono text-xs" style={{ color: trustCfg.color }}>
                {trustCfg.checks} {trustCfg.label} Author
              </div>
            </div>
          </div>
        </div>
        <a
          href="#"
          className="font-mono text-[13px] text-accent px-[18px] py-2 rounded-lg border border-accent/25 no-underline hover:border-accent/50 transition-colors"
        >
          + Publish new skill
        </a>
      </div>

      {/* Stat cards */}
      <div className="flex gap-3 mb-6">
        <StatCard
          label="Total downloads"
          value={`${(AUTHOR.totalDownloads / 1000).toFixed(1)}k`}
          sub={`\u2191 ${AUTHOR.weeklyDownloads.toLocaleString()} this week`}
        />
        <StatCard label="Skills published" value={MY_SKILLS.length} />
        <StatCard
          label="Avg rating"
          value={`\u2605 ${AUTHOR.avgRating}`}
          sub={`${AUTHOR.totalReviews} reviews`}
          color="var(--color-yellow)"
        />
        <div className="flex-1 min-w-[150px] px-5 py-[18px] bg-bg-card border border-border-default rounded-[10px]">
          <div className="font-sans text-xs text-text-muted mb-1.5">Weekly trend</div>
          <MiniChart data={WEEKLY_TREND} />
        </div>
      </div>

      {/* Tabs */}
      <DashboardTabs tabs={TABS} active={tab} onChange={setTab} />

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab onViewAllSkills={() => setTab('skills')} />}
      {tab === 'skills' && <SkillsTab />}
      {tab === 'publishes' && <PublishHistoryTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  );
};
