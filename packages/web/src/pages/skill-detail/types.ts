import { type TrustTier, type SecurityLevel } from '@spm/ui';
import { type SkillDetailResponse } from '../../lib/api';

export interface SkillVersion {
  v: string;
  date: string;
  changes: string;
}

export interface SkillFull {
  name: string;
  version: string;
  desc: string;
  longDesc: string;
  author: string;
  authors: Array<{ username: string; trust: TrustTier; role: string }>;
  trust: TrustTier;
  downloads: string;
  weeklyDownloads: string;
  rating: string;
  reviews: number;
  license: string;
  published: string;
  updated: string;
  platforms: string[];
  categories: string[];
  tags?: string[];
  readmeMd: string | null;
  versions: SkillVersion[];
  dependencies: {
    skills: string[];
    system: string[];
    pip: string[];
  };
  security: {
    signed: boolean;
    signer?: string;
    scanned: string;
    level: SecurityLevel;
    layers: Array<{
      layer: number;
      name: string;
      status: string;
      confidence: number | null;
      detail?: string;
    }>;
  };
  repo: string;
  importedFrom?: string;
  isPrivate: boolean;
}

const formatDownloads = (n: number): string => {
  if (n >= 1000) return n.toLocaleString();
  return String(n);
};

export const apiToSkillFull = (data: SkillDetailResponse): SkillFull => ({
  name: data.name,
  version: data.latest_version,
  desc: data.description,
  longDesc: data.description,
  author: data.author.username,
  authors: data.authors
    ? data.authors.map((a) => ({
        username: a.username,
        trust: a.trust_tier as TrustTier,
        role: a.role,
      }))
    : [
        {
          username: data.author.username,
          trust: data.author.trust_tier as TrustTier,
          role: 'owner',
        },
      ],
  trust: data.author.trust_tier as SkillFull['trust'],
  downloads: formatDownloads(data.downloads ?? 0),
  weeklyDownloads: formatDownloads(data.weekly_downloads ?? 0),
  rating: data.rating_avg != null ? String(data.rating_avg) : '--',
  reviews: data.rating_count ?? 0,
  license: data.license ?? 'Unknown',
  published: data.created_at?.split('T')[0] ?? '',
  updated: data.updated_at?.split('T')[0] ?? '',
  platforms: data.platforms ?? ['all'],
  categories: data.categories,
  tags: data.tags,
  readmeMd: data.readme_md ?? null,
  versions: data.versions.map((v) => ({
    v: v.version,
    date: v.published_at?.split('T')[0] ?? '',
    changes: '',
  })),
  dependencies: {
    skills: data.dependencies?.skills ?? [],
    system: data.dependencies?.system ?? [],
    pip: data.dependencies?.packages ?? [],
  },
  security: {
    signed: data.security?.signed ?? false,
    signer: data.security?.signer_identity,
    scanned: data.security?.scan_status ?? 'unknown',
    level: (data.security?.scan_security_level as SecurityLevel) ?? 'unscanned',
    layers:
      data.security?.scan_layers?.map((l) => ({
        layer: l.layer,
        name: l.name ?? `Layer ${l.layer}`,
        status: l.status,
        confidence: l.confidence ?? null,
        detail: l.detail,
      })) ?? [],
  },
  repo: data.repository ?? '',
  importedFrom: data.imported_from,
  isPrivate: data.visibility === 'private',
});

export const cardStyle: React.CSSProperties = {
  padding: 14,
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 10,
  marginBottom: 14,
};
