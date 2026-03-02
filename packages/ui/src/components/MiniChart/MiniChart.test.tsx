import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MiniChart } from './MiniChart';

const sampleData = [{ value: 100 }, { value: 200 }, { value: 150 }, { value: 300 }];

describe('MiniChart', () => {
  it('renders an SVG with correct dimensions', () => {
    const { container } = render(<MiniChart data={sampleData} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute('width')).toBe('220');
    expect(svg!.getAttribute('height')).toBe('48');
  });

  it('respects custom width and height', () => {
    const { container } = render(<MiniChart data={sampleData} width={300} height={80} />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('width')).toBe('300');
    expect(svg!.getAttribute('height')).toBe('80');
  });

  it('renders a polyline and polygon for the chart', () => {
    const { container } = render(<MiniChart data={sampleData} />);
    expect(container.querySelector('polyline')).toBeTruthy();
    expect(container.querySelector('polygon')).toBeTruthy();
  });

  it('renders an endpoint circle', () => {
    const { container } = render(<MiniChart data={sampleData} />);
    const circle = container.querySelector('circle');
    expect(circle).toBeTruthy();
    expect(circle!.getAttribute('r')).toBe('3');
  });

  it('returns null when data has fewer than 2 points', () => {
    const { container } = render(<MiniChart data={[{ value: 10 }]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('applies custom color to stroke and fill', () => {
    const { container } = render(<MiniChart data={sampleData} color="#3b82f6" />);
    const polyline = container.querySelector('polyline');
    expect(polyline!.getAttribute('stroke')).toBe('#3b82f6');
    const polygon = container.querySelector('polygon');
    expect(polygon!.getAttribute('fill')).toBe('#3b82f6');
  });

  it('handles flat data (all same values)', () => {
    const flat = [{ value: 50 }, { value: 50 }, { value: 50 }];
    const { container } = render(<MiniChart data={flat} />);
    expect(container.querySelector('polyline')).toBeTruthy();
  });
});
