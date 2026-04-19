import { type TrustTier } from '@spm/ui';

export type { TrustTier };

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
  categories: string[];
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
  visibility?: string;
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
