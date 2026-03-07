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

export const CATEGORIES: Category[] = [
  { name: 'Documents', slug: 'documents', icon: '📄', count: 34 },
  { name: 'Data & Visualization', slug: 'data-viz', icon: '📊', count: 28 },
  { name: 'Frontend', slug: 'frontend', icon: '🎨', count: 22 },
  { name: 'Backend', slug: 'backend', icon: '🔌', count: 18 },
  { name: 'Infrastructure', slug: 'infra', icon: '⚙️', count: 19 },
  { name: 'Testing', slug: 'testing', icon: '🧪', count: 16 },
  { name: 'Code Quality', slug: 'code-quality', icon: '✨', count: 10 },
  { name: 'Security', slug: 'security', icon: '🛡', count: 9 },
  { name: 'Productivity', slug: 'productivity', icon: '⚡', count: 11 },
];

export const CATEGORY_NAMES = [
  'All',
  'Documents',
  'Data & Visualization',
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
