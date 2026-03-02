export const TRUST_CONFIG = {
  official: { label: 'Official', color: 'var(--color-accent)', checks: '\u2713\u2713\u2713' },
  verified: { label: 'Verified', color: 'var(--color-accent)', checks: '\u2713\u2713' },
  scanned: { label: 'Scanned', color: 'var(--color-blue)', checks: '\u2713' },
  registered: { label: 'Registered', color: 'var(--color-text-dim)', checks: '\u25cb' },
} as const;

export type TrustTier = keyof typeof TRUST_CONFIG;

export interface Author {
  username: string;
  github: string;
  email: string;
  trust: TrustTier;
  joined: string;
  totalDownloads: number;
  weeklyDownloads: number;
  avgRating: number;
  totalReviews: number;
}

export interface Skill {
  name: string;
  version: string;
  category: string;
  desc: string;
  downloads: number;
  weeklyDownloads: number;
  weeklyGrowth: string;
  rating: number;
  reviews: number;
  trust: TrustTier;
  published: string;
  updated: string;
  status: string;
}

export interface WeeklyData {
  week: string;
  downloads: number;
}

export interface ActivityEvent {
  type: 'publish' | 'review' | 'milestone';
  skill: string;
  version?: string;
  date: string;
  detail: string;
}

export interface PublishEvent {
  skill: string;
  version: string;
  date: string;
  status: 'success' | 'blocked' | 'held';
  scanTime: string;
  reason?: string;
}

export interface AgentStat {
  agent: string;
  pct: number;
  color: string;
}

export const AUTHOR: Author = {
  username: 'almog',
  github: 'almog',
  email: 'almog@example.com',
  trust: 'verified',
  joined: '2025-11-01',
  totalDownloads: 24600,
  weeklyDownloads: 2840,
  avgRating: 4.7,
  totalReviews: 185,
};

export const MY_SKILLS: Skill[] = [
  {
    name: 'data-viz',
    version: '1.2.3',
    category: 'data-viz',
    desc: 'Charts, dashboards, and visualizations from CSV, JSON, or database output',
    downloads: 12400,
    weeklyDownloads: 1200,
    weeklyGrowth: '+31%',
    rating: 4.8,
    reviews: 142,
    trust: 'verified',
    published: '2025-11-01',
    updated: '2026-02-15',
    status: 'published',
  },
  {
    name: 'csv-transform',
    version: '1.0.2',
    category: 'data-viz',
    desc: 'Clean, reshape, and merge CSV files with auto-detected schemas',
    downloads: 8200,
    weeklyDownloads: 940,
    weeklyGrowth: '+18%',
    rating: 4.6,
    reviews: 38,
    trust: 'verified',
    published: '2025-12-10',
    updated: '2026-02-20',
    status: 'published',
  },
  {
    name: 'chart-export',
    version: '0.8.0',
    category: 'data-viz',
    desc: 'Export interactive charts to PNG, SVG, and PDF with custom themes',
    downloads: 4000,
    weeklyDownloads: 700,
    weeklyGrowth: '+45%',
    rating: 4.5,
    reviews: 5,
    trust: 'scanned',
    published: '2026-01-20',
    updated: '2026-02-25',
    status: 'published',
  },
];

export const WEEKLY_TREND: WeeklyData[] = [
  { week: 'Jan 6', downloads: 1420 },
  { week: 'Jan 13', downloads: 1580 },
  { week: 'Jan 20', downloads: 1890 },
  { week: 'Jan 27', downloads: 2100 },
  { week: 'Feb 3', downloads: 2240 },
  { week: 'Feb 10', downloads: 2510 },
  { week: 'Feb 17', downloads: 2680 },
  { week: 'Feb 24', downloads: 2840 },
];

export const RECENT_ACTIVITY: ActivityEvent[] = [
  {
    type: 'publish',
    skill: 'chart-export',
    version: '0.8.0',
    date: '2026-02-25',
    detail: 'Published new version',
  },
  {
    type: 'review',
    skill: 'data-viz',
    date: '2026-02-23',
    detail: 'New 5\u2605 review from @chen',
  },
  {
    type: 'publish',
    skill: 'csv-transform',
    version: '1.0.2',
    date: '2026-02-20',
    detail: 'Bug fix: UTF-8 BOM handling',
  },
  { type: 'milestone', skill: 'data-viz', date: '2026-02-18', detail: 'Reached 12,000 downloads' },
  {
    type: 'review',
    skill: 'csv-transform',
    date: '2026-02-15',
    detail: 'New 4\u2605 review from @sarah',
  },
  {
    type: 'publish',
    skill: 'data-viz',
    version: '1.2.3',
    date: '2026-02-15',
    detail: 'Heatmap support, color palette improvements',
  },
];

export const PUBLISH_HISTORY: PublishEvent[] = [
  {
    skill: 'chart-export',
    version: '0.8.0',
    date: '2026-02-25',
    status: 'success',
    scanTime: '1.2s',
  },
  {
    skill: 'csv-transform',
    version: '1.0.2',
    date: '2026-02-20',
    status: 'success',
    scanTime: '0.9s',
  },
  { skill: 'data-viz', version: '1.2.3', date: '2026-02-15', status: 'success', scanTime: '1.1s' },
  {
    skill: 'chart-export',
    version: '0.7.0',
    date: '2026-02-01',
    status: 'blocked',
    scanTime: '0.8s',
    reason: 'env_access pattern in export script',
  },
  { skill: 'data-viz', version: '1.2.0', date: '2026-01-05', status: 'success', scanTime: '1.0s' },
  {
    skill: 'csv-transform',
    version: '1.0.0',
    date: '2025-12-10',
    status: 'held',
    scanTime: '3.2s',
    reason: 'ML confidence 0.72 \u2014 approved after review',
  },
];

export const AGENT_BREAKDOWN: AgentStat[] = [
  { agent: 'Claude Code', pct: 48, color: 'var(--color-accent)' },
  { agent: 'Cursor', pct: 28, color: 'var(--color-blue)' },
  { agent: 'Codex', pct: 12, color: 'var(--color-purple)' },
  { agent: 'Windsurf', pct: 7, color: 'var(--color-yellow)' },
  { agent: 'Other', pct: 5, color: 'var(--color-text-dim)' },
];
