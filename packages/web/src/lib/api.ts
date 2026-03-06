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
  categories: string[];
  tags?: string[];
  platforms?: string[];
  license?: string;
  repository?: string;
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
    scan_layers?: Array<{ layer: number; status: string; detail?: string; confidence?: number }>;
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
  apiFetch(`/skills/${encodeURIComponent(name)}`);

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
  apiFetch(`/skills/${encodeURIComponent(name)}/reviews`);

// -- Categories --

export interface CategoryItem {
  slug: string;
  display: string;
  count: number;
  icon: string;
}

export interface CategoriesResponse {
  categories: CategoryItem[];
}

export const getCategories = (): Promise<CategoriesResponse> => apiFetch('/categories');

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
