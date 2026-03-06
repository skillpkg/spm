import { type TrustTier } from '@spm/ui';
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
  trust: TrustTier;
  downloads: string;
  weeklyDownloads: string;
  rating: string;
  reviews: number;
  license: string;
  published: string;
  updated: string;
  size: string;
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
    layers: string[];
  };
  repo: string;
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
  trust: data.author.trust_tier as SkillFull['trust'],
  downloads: formatDownloads(data.downloads ?? 0),
  weeklyDownloads: formatDownloads(data.weekly_downloads ?? 0),
  rating: data.rating_avg != null ? String(data.rating_avg) : '--',
  reviews: data.rating_count ?? 0,
  license: data.license ?? 'Unknown',
  published: data.created_at?.split('T')[0] ?? '',
  updated: data.updated_at?.split('T')[0] ?? '',
  size: '--',
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
    layers:
      data.security?.scan_layers?.map(
        (l) =>
          `Layer ${l.layer}: ${l.status}${l.confidence != null ? ` (${l.confidence})` : ''}${l.detail ? ` - ${l.detail}` : ''}`,
      ) ?? [],
  },
  repo: data.repository ?? '',
});

export const cardStyle: React.CSSProperties = {
  padding: 14,
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 10,
  marginBottom: 14,
};
