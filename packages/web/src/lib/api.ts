export {
  requestDeviceCode,
  pollToken,
  whoami,
  logout,
  AuthPendingError,
  AuthExpiredError,
  type AuthUser,
  type UserProfile,
  type DeviceCodeResponse,
  type TokenResponse,
} from '@spm/web-auth';

import { skillApiPath } from './urls';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const apiFetch = async <T>(path: string, opts?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
};

// -- Trending --

export interface TrendingSkill {
  name: string;
  version: string | null;
  description: string;
  author: { username: string; trust_tier: string };
  categories: string[];
  downloads: number;
  weekly_downloads: number;
  weekly_growth_pct?: number;
  rating_avg: number | null;
}

export interface TrendingResponse {
  tab: string;
  skills: TrendingSkill[];
}

export const getTrending = (tab: string, limit = 10): Promise<TrendingResponse> =>
  apiFetch(`/trending?tab=${encodeURIComponent(tab)}&limit=${limit}`);

// -- Search / Skills list --

export interface SearchResultItem {
  name: string;
  version: string;
  description: string;
  author: { username: string; trust_tier: string };
  categories: string[];
  tags?: string[];
  platforms?: string[];
  downloads: number;
  weekly_downloads: number;
  rating_avg: number | null;
  rating_count: number | null;
  signed: boolean;
  scan_security_level?: string;
  license?: string;
  published_at: string;
  updated_at: string;
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const searchSkills = (params: Record<string, string | number>): Promise<SearchResponse> => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== 'All') {
      qs.set(k, String(v));
    }
  }
  const queryString = qs.toString();
  return apiFetch(`/skills${queryString ? `?${queryString}` : ''}`);
};

// -- Skill Detail --

export interface SkillVersionInfo {
  version: string;
  published_at: string;
}

export interface SkillDetailResponse {
  name: string;
  description: string;
  author: { username: string; github_login: string; trust_tier: string };
  authors?: Array<{ username: string; github_login: string; trust_tier: string; role: string }>;
  categories: string[];
  tags?: string[];
  platforms?: string[];
  license?: string;
  repository?: string;
  imported_from?: string;
  deprecated: boolean;
  readme_md: string | null;
  latest_version: string;
  downloads: number;
  weekly_downloads: number;
  rating_avg: number | null;
  rating_count: number | null;
  security: {
    signed: boolean;
    signer_identity?: string;
    scan_status: string;
    scan_security_level?: string;
    scan_layers?: Array<{
      layer: number;
      name: string;
      status: string;
      confidence?: number | null;
      detail?: string;
    }>;
  } | null;
  versions: SkillVersionInfo[];
  dependencies?: {
    skills?: string[];
    system?: string[];
    packages?: string[];
  };
  created_at: string;
  updated_at: string;
}

export const getSkill = (name: string): Promise<SkillDetailResponse> =>
  apiFetch(skillApiPath(name));

// -- Reviews --

export interface ReviewItem {
  id: string;
  user: { username: string; trust_tier: string };
  rating: number;
  comment: string;
  created_at: string;
}

export interface ReviewsResponse {
  skill: string;
  rating_avg: number;
  rating_count: number;
  rating_distribution: Record<string, number>;
  reviews: ReviewItem[];
  total: number;
  page: number;
}

export const getSkillReviews = (name: string): Promise<ReviewsResponse> =>
  apiFetch(`${skillApiPath(name)}/reviews`);

// -- Categories --

export interface CategoryItem {
  slug: string;
  display: string;
  count: number;
  icon: string;
}

export interface CategoriesResponse {
  categories: CategoryItem[];
  total_skills: number;
}

export const getCategories = (): Promise<CategoriesResponse> => apiFetch('/categories');

// -- Author Search (autocomplete) --

export interface AuthorSuggestion {
  username: string;
  trust_tier: string;
  skill_count: number;
}

export interface AuthorSearchResponse {
  authors: AuthorSuggestion[];
  total: number;
}

export const searchAuthors = (q: string, perPage = 8): Promise<AuthorSearchResponse> =>
  apiFetch(`/authors?q=${encodeURIComponent(q)}&per_page=${perPage}`);

// -- Tag Search (autocomplete) --

export interface TagSuggestion {
  tag: string;
  count: number;
}

export interface TagSearchResponse {
  tags: TagSuggestion[];
  total: number;
}

export const searchTags = (q: string, perPage = 20): Promise<TagSearchResponse> =>
  apiFetch(`/tags?q=${encodeURIComponent(q)}&per_page=${perPage}`);

// -- Authors --

export interface AuthorSkill {
  name: string;
  version: string;
  downloads: number;
  rating_avg: number | null;
  categories: string[];
  description?: string;
}

export interface AuthorProfileResponse {
  username: string;
  github_login: string;
  trust_tier: string;
  skills: AuthorSkill[];
  total_downloads: number;
  created_at: string;
}

export const getAuthorProfile = (username: string): Promise<AuthorProfileResponse> =>
  apiFetch(`/authors/${encodeURIComponent(username)}`);

// -- Skill Downloads (sparkline) --

export interface SkillDownloadsDay {
  date: string;
  count: number;
}

export interface SkillDownloadsResponse {
  name: string;
  days: SkillDownloadsDay[];
}

export const getSkillDownloads = (name: string): Promise<SkillDownloadsResponse> =>
  apiFetch(`${skillApiPath(name)}/downloads`);

// -- Organizations --

export interface OrgInfo {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  avatar_url: string | null;
  website: string | null;
  member_count: number;
  skill_count: number;
  created_at: string;
}

export interface OrgMemberInfo {
  username: string;
  role: string;
  joined_at: string;
}

export interface OrgDetailResponse extends OrgInfo {
  members: OrgMemberInfo[];
}

export interface OrgSkillsResponse {
  skills: Array<{
    name: string;
    version: string;
    description: string;
    downloads: number;
    rating_avg: number | null;
    categories: string[];
  }>;
}

export const getOrg = (name: string): Promise<OrgDetailResponse> =>
  apiFetch(`/orgs/${encodeURIComponent(name)}`);

export const getOrgSkills = (name: string): Promise<OrgSkillsResponse> =>
  apiFetch(`/orgs/${encodeURIComponent(name)}/skills`);

// -- Author Stats (auth required) --

export interface WeeklyTrend {
  week: string;
  downloads: number;
}

export interface AgentBreakdown {
  agent: string;
  percentage: number;
}

export interface AuthorStatsResponse {
  total_downloads: number;
  weekly_downloads: number;
  rating_avg: number;
  total_reviews: number;
  weekly_trend: WeeklyTrend[];
  agent_breakdown: AgentBreakdown[];
  recent_activity: Array<{
    type: string;
    skill: string;
    version?: string;
    date: string;
  }>;
}

export const getAuthorStats = (username: string, token: string): Promise<AuthorStatsResponse> =>
  apiFetch(`/authors/${encodeURIComponent(username)}/stats`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
