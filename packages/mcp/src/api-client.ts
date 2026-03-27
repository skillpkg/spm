// API response types for the SPM registry
// These match the actual API response shapes from registry.skillpkg.dev/api/v1

export interface SkillSearchResult {
  name: string;
  version: string;
  description: string;
  categories: string[];
  author: { username: string; trust_tier: string };
  downloads: number;
  weekly_downloads: number;
  rating_avg: number;
  rating_count: number;
  tags: string[];
  platforms: string[];
  signed: boolean;
  scan_security_level: string;
  license: string;
  deprecated: boolean;
  published_at: string | null;
  updated_at: string;
}

export interface SkillSearchResponse {
  results: SkillSearchResult[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface SkillDetail {
  name: string;
  description: string;
  categories: string[];
  author: { username: string; github_login: string; trust_tier: string };
  authors: Array<{ username: string; trust_tier: string; role: string }>;
  imported_from: string | null;
  repository: string | null;
  license: string;
  deprecated: boolean;
  rating_avg: number;
  rating_count: number;
  downloads: number;
  weekly_downloads: number;
  tags: string[];
  platforms: string[];
  latest_version: { version: string; published_at: string } | null;
  keywords: string[];
}

export interface CategoryEntry {
  slug: string;
  display: string;
  icon: string;
  count: number;
}

export interface ApiClientError {
  status: number;
  message: string;
}

const isApiClientError = (error: unknown): error is ApiClientError => {
  return typeof error === 'object' && error !== null && 'status' in error && 'message' in error;
};

export const fetchSkills = async (
  baseUrl: string,
  params: { q?: string; category?: string; per_page?: number },
): Promise<SkillSearchResponse> => {
  const url = new URL(`${baseUrl}/skills`);
  if (params.q) url.searchParams.set('q', params.q);
  if (params.category) url.searchParams.set('category', params.category);
  if (params.per_page) url.searchParams.set('per_page', String(params.per_page));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const error: ApiClientError = {
      status: res.status,
      message: `Failed to search skills: ${res.statusText}`,
    };
    throw error;
  }

  return (await res.json()) as SkillSearchResponse;
};

export const fetchSkillInfo = async (baseUrl: string, name: string): Promise<SkillDetail> => {
  const res = await fetch(`${baseUrl}/skills/${encodeURIComponent(name)}`);
  if (!res.ok) {
    const error: ApiClientError = {
      status: res.status,
      message:
        res.status === 404
          ? `Skill "${name}" not found`
          : `Failed to fetch skill info: ${res.statusText}`,
    };
    throw error;
  }

  return (await res.json()) as SkillDetail;
};

export const fetchCategories = async (
  baseUrl: string,
): Promise<{ categories: CategoryEntry[] }> => {
  const res = await fetch(`${baseUrl}/categories`);
  if (!res.ok) {
    const error: ApiClientError = {
      status: res.status,
      message: `Failed to fetch categories: ${res.statusText}`,
    };
    throw error;
  }

  return (await res.json()) as { categories: CategoryEntry[] };
};

export const fetchTemplate = async (
  baseUrl: string,
): Promise<{ manifest: object; skill_md: string }> => {
  const res = await fetch(`${baseUrl}/template`);
  if (!res.ok) {
    const error: ApiClientError = {
      status: res.status,
      message: `Failed to fetch skill template: ${res.statusText}`,
    };
    throw error;
  }

  return (await res.json()) as { manifest: object; skill_md: string };
};

export { isApiClientError };
