// API response types for the SPM registry

export interface SkillSearchResult {
  name: string;
  version: string;
  description: string;
  category: string;
  downloads: number;
  downloads_this_week?: number;
  rating: number;
  review_count: number;
  author: string;
  verified?: boolean;
}

export interface SkillSearchResponse {
  skills: SkillSearchResult[];
  total: number;
  page: number;
  per_page: number;
}

export interface SkillDetail {
  name: string;
  version: string;
  description: string;
  category: string;
  license?: string;
  downloads: number;
  downloads_this_week?: number;
  rating: number;
  review_count: number;
  author: string;
  verified?: boolean;
  keywords?: string[];
  platforms?: string[];
}

export interface CategoryEntry {
  slug: string;
  display: string;
  icon: string;
  description: string;
  skill_count: number;
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

export const fetchCategories = async (baseUrl: string): Promise<CategoryEntry[]> => {
  const res = await fetch(`${baseUrl}/categories`);
  if (!res.ok) {
    const error: ApiClientError = {
      status: res.status,
      message: `Failed to fetch categories: ${res.statusText}`,
    };
    throw error;
  }

  return (await res.json()) as CategoryEntry[];
};

export { isApiClientError };
