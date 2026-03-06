import type { TrustTier } from '@spm/ui';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const apiFetch = async <T>(path: string, token: string, opts?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
};

// -- Queue --

export interface QueueFlag {
  layer: number;
  type: string;
  confidence: number | null;
}

export interface QueueItem {
  id: string;
  skill: string;
  version: string;
  author: { username: string; trust_tier: string };
  flags: QueueFlag[];
  submitted_at: string;
  size_bytes: number | null;
}

export interface QueueResponse {
  queue: QueueItem[];
  total: number;
}

export const getQueue = (
  token: string,
  sort = 'oldest',
  status = 'pending',
): Promise<QueueResponse> => apiFetch(`/admin/queue?sort=${sort}&status=${status}`, token);

export const approveQueueItem = (
  token: string,
  id: string,
  notes?: string,
): Promise<{ id: string; status: string; skill: string; version: string; approved_at: string }> =>
  apiFetch(`/admin/queue/${id}/approve`, token, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });

export const rejectQueueItem = (
  token: string,
  id: string,
  reason: string,
  feedback?: string,
): Promise<{ id: string; status: string; skill: string; version: string }> =>
  apiFetch(`/admin/queue/${id}/reject`, token, {
    method: 'POST',
    body: JSON.stringify({ reason, notify_author: true, feedback }),
  });

// -- Skills --

export interface AdminSkillItem {
  name: string;
  description: string;
  categories: string[];
  deprecated: boolean;
  author: string;
  trust_tier: string;
  latest_version: string | null;
  scan_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSkillsResponse {
  results: AdminSkillItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const getAdminSkills = (
  token: string,
  page = 1,
  perPage = 20,
): Promise<AdminSkillsResponse> =>
  apiFetch(`/admin/skills?page=${page}&per_page=${perPage}`, token);

export const yankSkill = (
  token: string,
  name: string,
  version: string,
  reason: string,
): Promise<{ name: string; version: string; yanked: boolean; reason: string }> =>
  apiFetch(`/admin/skills/${encodeURIComponent(name)}/yank`, token, {
    method: 'POST',
    body: JSON.stringify({ version, reason, notify_author: true }),
  });

// -- Users --

export interface AdminUserItem {
  id: string;
  username: string;
  github_login: string | null;
  email: string | null;
  trust_tier: TrustTier;
  role: 'admin' | 'user';
  skills_count: number;
  created_at: string;
}

export interface AdminUsersResponse {
  results: AdminUserItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const getAdminUsers = (
  token: string,
  params?: { sort?: string; trust?: string; page?: number; per_page?: number },
): Promise<AdminUsersResponse> => {
  const qs = new URLSearchParams();
  if (params?.sort) qs.set('sort', params.sort);
  if (params?.trust) qs.set('trust', params.trust);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  const queryString = qs.toString();
  return apiFetch(`/admin/users${queryString ? `?${queryString}` : ''}`, token);
};

export const updateUserTrust = (
  token: string,
  username: string,
  trustTier: TrustTier,
  reason: string,
): Promise<{ username: string; trust_tier: string; previous_tier: string }> =>
  apiFetch(`/admin/users/${encodeURIComponent(username)}/trust`, token, {
    method: 'PATCH',
    body: JSON.stringify({ trust_tier: trustTier, reason }),
  });

export const updateUserRole = (
  token: string,
  username: string,
  role: 'admin' | 'user',
  reason: string,
): Promise<{ username: string; role: string; previous_role: string }> =>
  apiFetch(`/admin/users/${encodeURIComponent(username)}/role`, token, {
    method: 'PATCH',
    body: JSON.stringify({ role, reason }),
  });

// -- Reports --

export interface AdminReportItem {
  id: string;
  skill: string;
  reporter: string | null;
  reason: string;
  priority: string;
  status: string;
  resolution: string | null;
  action_taken: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminReportsResponse {
  results: AdminReportItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const getAdminReports = (
  token: string,
  params?: { status?: string; priority?: string; page?: number },
): Promise<AdminReportsResponse> => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.priority) qs.set('priority', params.priority);
  if (params?.page) qs.set('page', String(params.page));
  const queryString = qs.toString();
  return apiFetch(`/admin/reports${queryString ? `?${queryString}` : ''}`, token);
};

export const updateReport = (
  token: string,
  id: string,
  status: string,
  resolution?: string,
  actionTaken?: string,
): Promise<{ id: string; status: string }> =>
  apiFetch(`/admin/reports/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status, resolution, action_taken: actionTaken }),
  });

// -- Errors --

export interface AdminErrorItem {
  id: string;
  type: string;
  error_code: string;
  message: string;
  count: number;
  affected_users: number;
  affected_skill: string | null;
  first_seen: string;
  last_seen: string;
  status: string;
}

export interface AdminErrorsResponse {
  errors: AdminErrorItem[];
  total: number;
}

export const getAdminErrors = (token: string): Promise<AdminErrorsResponse> =>
  apiFetch('/admin/errors', token);

export const updateError = (
  token: string,
  id: string,
  status: string,
  resolution?: string,
): Promise<{ id: string; status: string }> =>
  apiFetch(`/admin/errors/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status, resolution }),
  });

// -- Public skill endpoints (used for inline detail) --

export interface SkillDetailVersion {
  version: string;
  published_at: string;
  yanked: boolean;
  downloads: number;
}

export interface SkillDetailAuthor {
  username: string;
  github_login: string;
  trust_tier: string;
  role: string;
}

export interface SkillDetailResponse {
  name: string;
  description: string;
  categories: string[];
  latest_version: string | null;
  author: { username: string; trust_tier: string };
  authors: SkillDetailAuthor[];
  status: string;
  deprecated: boolean;
  scan_status: string | null;
  created_at: string;
  updated_at: string;
  versions: SkillDetailVersion[];
  downloads: number;
}

export interface SkillVersionResponse {
  name: string;
  version: string;
  readme_md: string | null;
  manifest: Record<string, unknown>;
  published_at: string;
  yanked: boolean;
  signed: boolean;
}

export const getSkillDetail = (token: string, name: string): Promise<SkillDetailResponse> =>
  apiFetch(`/skills/${encodeURIComponent(name)}`, token);

export const getSkillVersion = (
  token: string,
  name: string,
  version: string,
): Promise<SkillVersionResponse> =>
  apiFetch(`/skills/${encodeURIComponent(name)}/${encodeURIComponent(version)}`, token);

export const blockSkill = (
  token: string,
  name: string,
  reason: string,
): Promise<{ name: string; status: string; reason: string; blocked_at: string }> =>
  apiFetch(`/admin/skills/${encodeURIComponent(name)}/block`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const unblockSkill = (
  token: string,
  name: string,
): Promise<{ name: string; status: string; unblocked_at: string }> =>
  apiFetch(`/admin/skills/${encodeURIComponent(name)}/unblock`, token, {
    method: 'POST',
  });

export const getAdminSkillVersion = (
  token: string,
  name: string,
  version: string,
): Promise<SkillVersionResponse> =>
  apiFetch(
    `/admin/skills/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}`,
    token,
  );

// -- Skill Downloads (sparkline) --

export interface SkillDownloadsDay {
  date: string;
  count: number;
}

export interface SkillDownloadsResponse {
  name: string;
  days: SkillDownloadsDay[];
}

export const getSkillDownloads = (token: string, name: string): Promise<SkillDownloadsResponse> =>
  apiFetch(`/skills/${encodeURIComponent(name)}/downloads`, token);

// -- Stats --

export interface AdminStatsResponse {
  publishes: {
    total: number;
    published: number;
    blocked: number;
    rejected: number;
  };
  scans: {
    passed: number;
    flagged: number;
    blocked: number;
    manual_approved: number;
  };
  queue_depth: number;
  open_reports: number;
  open_errors: number;
  users_by_trust: Record<string, number>;
  total_skills: number;
  total_users: number;
  total_downloads: number;
}

export const getAdminStats = (token: string): Promise<AdminStatsResponse> =>
  apiFetch('/admin/stats', token);
