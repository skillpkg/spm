import { describe, it, expect } from 'vitest';
import { TRUST_CONFIG } from './trust-config';

describe('TRUST_CONFIG', () => {
  it('has all four tiers', () => {
    expect(Object.keys(TRUST_CONFIG)).toEqual(['official', 'verified', 'scanned', 'registered']);
  });

  it('official has triple check', () => {
    expect(TRUST_CONFIG.official.checks).toBe('\u2713\u2713\u2713');
    expect(TRUST_CONFIG.official.label).toBe('Official');
  });

  it('verified has double check', () => {
    expect(TRUST_CONFIG.verified.checks).toBe('\u2713\u2713');
  });

  it('scanned has single check', () => {
    expect(TRUST_CONFIG.scanned.checks).toBe('\u2713');
  });

  it('registered has open circle', () => {
    expect(TRUST_CONFIG.registered.checks).toBe('\u25CB');
  });

  it('each tier has bg field', () => {
    for (const tier of Object.values(TRUST_CONFIG)) {
      expect(tier.bg).toBeDefined();
      expect(tier.bg).toContain('rgba');
    }
  });
});
