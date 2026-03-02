export type TrustTier = 'official' | 'verified' | 'scanned' | 'registered';

export interface TrustTierConfig {
  label: string;
  color: string;
  checks: string;
  bg: string;
}

export const TRUST_CONFIG: Record<TrustTier, TrustTierConfig> = {
  official: {
    label: 'Official',
    color: '#10b981',
    checks: '\u2713\u2713\u2713',
    bg: 'rgba(16,185,129,0.08)',
  },
  verified: {
    label: 'Verified',
    color: '#10b981',
    checks: '\u2713\u2713',
    bg: 'rgba(16,185,129,0.06)',
  },
  scanned: {
    label: 'Scanned',
    color: '#3b82f6',
    checks: '\u2713',
    bg: 'rgba(59,130,246,0.06)',
  },
  registered: {
    label: 'Registered',
    color: '#64748b',
    checks: '\u25CB',
    bg: 'rgba(148,163,184,0.05)',
  },
};
