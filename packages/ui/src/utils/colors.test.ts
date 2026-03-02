import { describe, it, expect } from 'vitest';
import { COLOR_VALUES, resolveColor, withAlpha } from './colors';

describe('COLOR_VALUES', () => {
  it('maps semantic names to CSS variables', () => {
    expect(COLOR_VALUES['accent']).toBe('var(--color-accent)');
    expect(COLOR_VALUES['red']).toBe('var(--color-red)');
    expect(COLOR_VALUES['text-primary']).toBe('var(--color-text-primary)');
  });
});

describe('resolveColor', () => {
  it('resolves a known semantic name', () => {
    expect(resolveColor('accent')).toBe('var(--color-accent)');
  });

  it('returns raw value for unknown names', () => {
    expect(resolveColor('#ff0000')).toBe('#ff0000');
    expect(resolveColor('rgb(0,0,0)')).toBe('rgb(0,0,0)');
  });
});

describe('withAlpha', () => {
  it('returns color-mix for CSS variable colors', () => {
    const result = withAlpha('accent', 0.1);
    expect(result).toBe('color-mix(in srgb, var(--color-accent) 10%, transparent)');
  });

  it('rounds alpha to integer percent', () => {
    const result = withAlpha('red', 0.15);
    expect(result).toBe('color-mix(in srgb, var(--color-red) 15%, transparent)');
  });

  it('returns raw value for non-variable colors', () => {
    expect(withAlpha('#ff0000', 0.5)).toBe('#ff0000');
  });
});
