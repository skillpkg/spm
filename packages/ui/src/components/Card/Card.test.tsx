import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello Card</Card>);
    expect(screen.getByText('Hello Card')).toBeInTheDocument();
  });

  it('applies default card styles', () => {
    const { container } = render(<Card>Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderRadius).toBe('10px');
    expect(el.style.overflow).toBe('hidden');
  });

  it('merges custom styles', () => {
    const { container } = render(<Card style={{ padding: 20 }}>Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.padding).toBe('20px');
  });

  it('passes className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('custom-class');
  });
});
