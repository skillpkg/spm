import type { SearchParams, ResolveRequest, ApiError, Manifest } from '@spm/shared';
import { loadConfig } from './config.js';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly apiError: ApiError;

  constructor(status: number, apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.apiError = apiError;
  }
}

interface ApiClientConfig {
  registry: string;
  token?: string | null;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: {
    username: string;
    github_username: string;
    trust_tier: string;
  };
}

interface TokenPendingResponse {
  status: 'authorization_pending' | 'slow_down' | 'expired';
}

interface WhoamiResponse {
  username: string;
  github_username: string;
  trust_tier: string;
  registered_at: string;
  skills_published: number;
}

export interface SkillSearchResultItem {
  name: string;
  version: string;
  description: string;
  author: string;
  trust_tier: string;
  signed: boolean;
  downloads: number;
  rating: number;
  review_count: number;
  platforms: string[];
  category: string;
  updated_at: string;
}

export interface SkillSearchResult {
  results: SkillSearchResultItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface SkillVersionInfo {
  version: string;
  created_at: string;
  latest: boolean;
}

export interface SkillDetail {
  name: string;
  version: string;
  description: string;
  author: string;
  trust_tier: string;
  signed: boolean;
  signer?: string;
  scanned: boolean;
  verified: boolean;
  license?: string;
  downloads: number;
  downloads_week: number;
  rating: number;
  review_count: number;
  platforms: string[];
  category: string;
  repository?: string;
  published_at: string;
  versions: SkillVersionInfo[];
}

export interface VersionDetail {
  name: string;
  version: string;
  description: string;
  checksum: string;
  created_at: string;
}

export interface ResolveResponse {
  resolved: Array<{
    name: string;
    version: string;
    checksum: string;
    download_url: string;
    dependencies: Record<string, string>;
  }>;
}

export interface PublishResponse {
  name: string;
  version: string;
  url: string;
  trust_tier: string;
  signed: boolean;
}

export interface ClassifyResponse {
  detected_category: string;
  confidence: number;
}

export interface YankResponse {
  ok: boolean;
  name: string;
  version: string;
}

export interface UpdateSkillResponse {
  ok: boolean;
  name: string;
}

export interface ReportResponse {
  ok: boolean;
  report_id: string;
}

const isApiError = (body: unknown): body is ApiError => {
  return typeof body === 'object' && body !== null && 'error' in body && 'message' in body;
};

export const createApiClient = (config?: ApiClientConfig) => {
  const resolved = config ?? loadConfig();
  const { registry, token } = resolved;

  const headers = (): Record<string, string> => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'spm-cli/0.0.1',
    };
    if (token) {
      h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  };

  const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const url = `${registry}${path}`;
    const opts: RequestInit = {
      method,
      headers: headers(),
    };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);

    if (!res.ok) {
      let errorBody: unknown;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = { error: 'unknown', message: res.statusText };
      }

      if (isApiError(errorBody)) {
        throw new ApiClientError(res.status, errorBody);
      }

      throw new ApiClientError(res.status, {
        error: 'unknown',
        message: res.statusText,
      });
    }

    return (await res.json()) as T;
  };

  return {
    // -- Auth --
    deviceCode: () => request<DeviceCodeResponse>('POST', '/auth/device-code'),

    pollToken: (deviceCode: string) =>
      request<TokenResponse | TokenPendingResponse>('POST', '/auth/token', {
        device_code: deviceCode,
      }),

    whoami: () => request<WhoamiResponse>('GET', '/auth/whoami'),

    logout: () => request<{ ok: boolean }>('POST', '/auth/logout'),

    // -- Skills --
    searchSkills: (params: Partial<SearchParams> | Record<string, string | number>) => {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      return request<SkillSearchResult>('GET', `/skills${qs ? `?${qs}` : ''}`);
    },

    getSkill: (name: string) => request<SkillDetail>('GET', `/skills/${encodeURIComponent(name)}`),

    getVersion: (name: string, version: string) =>
      request<VersionDetail>(
        'GET',
        `/skills/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
      ),

    downloadSkill: async (name: string, version: string): Promise<ArrayBuffer> => {
      const url = `${registry}/skills/${encodeURIComponent(name)}/${encodeURIComponent(version)}/download`;
      const res = await fetch(url, {
        method: 'GET',
        headers: headers(),
      });

      if (!res.ok) {
        let errorBody: unknown;
        try {
          errorBody = await res.json();
        } catch {
          errorBody = { error: 'unknown', message: res.statusText };
        }

        if (isApiError(errorBody)) {
          throw new ApiClientError(res.status, errorBody);
        }

        throw new ApiClientError(res.status, {
          error: 'unknown',
          message: res.statusText,
        });
      }

      return res.arrayBuffer();
    },

    // -- Publish --
    publishSkill: async (sklBuffer: ArrayBuffer, manifest: Manifest): Promise<PublishResponse> => {
      const url = `${registry}/skills`;
      const formData = new FormData();
      formData.append('package', new Blob([sklBuffer]), 'skill.skl');
      formData.append('manifest', JSON.stringify(manifest));

      const h: Record<string, string> = {
        'User-Agent': 'spm-cli/0.0.1',
      };
      if (token) {
        h['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: h,
        body: formData,
      });

      if (!res.ok) {
        let errorBody: unknown;
        try {
          errorBody = await res.json();
        } catch {
          errorBody = { error: 'unknown', message: res.statusText };
        }

        if (isApiError(errorBody)) {
          throw new ApiClientError(res.status, errorBody);
        }

        throw new ApiClientError(res.status, {
          error: 'unknown',
          message: res.statusText,
        });
      }

      return (await res.json()) as PublishResponse;
    },

    yankVersion: (name: string, version: string, reason?: string) =>
      request<YankResponse>(
        'DELETE',
        `/skills/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
        reason ? { reason } : undefined,
      ),

    updateSkill: (name: string, body: Record<string, unknown>) =>
      request<UpdateSkillResponse>('PATCH', `/skills/${encodeURIComponent(name)}`, body),

    classifySkill: (manifest: Record<string, unknown>) =>
      request<ClassifyResponse>('POST', '/categories/classify', manifest),

    reportSkill: (name: string, body: { reason: string; detail?: string }) =>
      request<ReportResponse>('POST', `/skills/${encodeURIComponent(name)}/report`, body),

    // -- Resolution --
    resolve: (skills: ResolveRequest['skills'], platform?: string) =>
      request<ResolveResponse>('POST', '/resolve', { skills, platform }),
  };
};

export type ApiClient = ReturnType<typeof createApiClient>;
