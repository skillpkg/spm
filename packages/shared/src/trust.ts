export const TRUST_TIERS = ['registered', 'scanned', 'verified', 'official'] as const;

export type TrustTier = (typeof TRUST_TIERS)[number];

export const TRUST_TIER_INFO: Record<
  TrustTier,
  { display: string; badge: string; description: string }
> = {
  registered: { display: 'Registered', badge: '○', description: 'Published, no verification' },
  scanned: { display: 'Scanned', badge: '✓', description: 'Passed all security scan layers' },
  verified: { display: 'Verified', badge: '✓✓', description: 'Scanned + verified author' },
  official: { display: 'Official', badge: '✓✓✓', description: 'SPM-maintained skill' },
};
