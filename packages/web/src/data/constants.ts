import { type TrustTier, type SecurityLevel } from '@spm/ui';

export type { TrustTier };

export interface SkillSummary {
  name: string;
  version: string;
  desc: string;
  author: string;
  trust: TrustTier;
  securityLevel?: SecurityLevel;
  downloads: string;
  weeklyGrowth?: string;
  rating?: string;
  tags?: string[];
  daysAgo?: number;
}

export interface Category {
  name: string;
  slug: string;
  icon: string;
  count: number;
}

export const CATEGORY_NAMES = [
  'All',
  'Documents',
  'Data & Visualization',
  'Data Analysis',
  'AI & Machine Learning',
  'Frontend',
  'Backend',
  'Infrastructure',
  'Testing',
  'Code Quality',
  'Security',
  'Productivity',
] as const;

export const CATEGORY_SLUGS: Record<string, string> = {
  Documents: 'documents',
  'Data & Visualization': 'data-viz',
  'Data Analysis': 'data-analysis',
  'AI & Machine Learning': 'ai-ml',
  Frontend: 'frontend',
  Backend: 'backend',
  Infrastructure: 'infra',
  Testing: 'testing',
  'Code Quality': 'code-quality',
  Security: 'security',
  Productivity: 'productivity',
};

export const TRUST_TIERS = ['All', 'Official', 'Verified', 'Scanned', 'Registered'] as const;

export const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'downloads', label: 'Most downloads' },
  { id: 'rating', label: 'Highest rated' },
  { id: 'updated', label: 'Recently updated' },
  { id: 'new', label: 'Newest' },
] as const;
