import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from './Sparkline';

describe('Sparkline', () => {
  it('renders an SVG with default dimensions', () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('32');
  });

  it('respects custom width and height', () => {
    const { container } = render(<Sparkline data={[1, 2]} width={200} height={50} />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('width')).toBe('200');
    expect(svg!.getAttribute('height')).toBe('50');
  });

  it('renders polyline and polygon for normal data', () => {
    const { container } = render(<Sparkline data={[10, 20, 15, 30]} />);
    expect(container.querySelector('polyline')).toBeTruthy();
    expect(container.querySelector('polygon')).toBeTruthy();
  });

  it('returns null for empty data', () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders a single point as a circle', () => {
    const { container } = render(<Sparkline data={[42]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    const circle = container.querySelector('circle');
    expect(circle).toBeTruthy();
    expect(container.querySelector('polyline')).toBeNull();
  });

  it('handles all-zero data without errors', () => {
    const { container } = render(<Sparkline data={[0, 0, 0, 0]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(container.querySelector('polyline')).toBeTruthy();
  });

  it('handles flat data (all same values)', () => {
    const { container } = render(<Sparkline data={[5, 5, 5]} />);
    expect(container.querySelector('polyline')).toBeTruthy();
  });

  it('applies custom color', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} color="#10b981" />);
    const polyline = container.querySelector('polyline');
    expect(polyline!.getAttribute('stroke')).toBe('#10b981');
    const polygon = container.querySelector('polygon');
    expect(polygon!.getAttribute('fill')).toBe('#10b981');
  });

  it('has accessible role and label', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('role')).toBe('img');
    expect(svg!.getAttribute('aria-label')).toBe('Sparkline');
  });
});
