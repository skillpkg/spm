import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Text } from './Text';

describe('Text', () => {
  it('renders with default variant (body)', () => {
    render(<Text>Hello</Text>);
    const el = screen.getByText('Hello');
    expect(el.tagName).toBe('P');
    expect(el.style.fontSize).toBe('14px');
  });

  it('renders display variant as h1', () => {
    render(<Text variant="display">Title</Text>);
    const el = screen.getByText('Title');
    expect(el.tagName).toBe('H1');
    expect(el.style.fontSize).toBe('42px');
    expect(el.style.fontWeight).toBe('800');
  });

  it('renders h1 variant', () => {
    render(<Text variant="h1">Heading</Text>);
    const el = screen.getByText('Heading');
    expect(el.tagName).toBe('H1');
    expect(el.style.fontSize).toBe('24px');
  });

  it('renders h2 variant', () => {
    render(<Text variant="h2">Sub</Text>);
    const el = screen.getByText('Sub');
    expect(el.tagName).toBe('H2');
    expect(el.style.fontSize).toBe('20px');
  });

  it('renders body-sm variant', () => {
    render(<Text variant="body-sm">Small body</Text>);
    const el = screen.getByText('Small body');
    expect(el.style.fontSize).toBe('13px');
  });

  it('renders caption variant', () => {
    render(<Text variant="caption">Caption</Text>);
    const el = screen.getByText('Caption');
    expect(el.tagName).toBe('SPAN');
    expect(el.style.fontSize).toBe('12px');
  });

  it('renders label variant', () => {
    render(<Text variant="label">Label</Text>);
    const el = screen.getByText('Label');
    expect(el.style.fontSize).toBe('11px');
    expect(el.style.fontWeight).toBe('500');
  });

  it('renders tiny variant', () => {
    render(<Text variant="tiny">Fine print</Text>);
    const el = screen.getByText('Fine print');
    expect(el.style.fontSize).toBe('10px');
  });

  it('applies color prop', () => {
    render(<Text color="accent">Accent</Text>);
    const el = screen.getByText('Accent');
    expect(el.style.color).toBe('var(--color-accent)');
  });

  it('applies mono font', () => {
    render(<Text font="mono">Code</Text>);
    const el = screen.getByText('Code');
    expect(el.style.fontFamily).toBe('var(--font-mono)');
  });

  it('applies sans font', () => {
    render(<Text font="sans">Sans</Text>);
    const el = screen.getByText('Sans');
    expect(el.style.fontFamily).toBe('var(--font-sans)');
  });

  it('overrides tag with as prop', () => {
    render(
      <Text variant="body" as="span">
        Span body
      </Text>,
    );
    const el = screen.getByText('Span body');
    expect(el.tagName).toBe('SPAN');
  });

  it('overrides weight', () => {
    render(<Text weight={700}>Bold</Text>);
    const el = screen.getByText('Bold');
    expect(el.style.fontWeight).toBe('700');
  });

  it('applies truncate styles', () => {
    render(<Text truncate>Long text</Text>);
    const el = screen.getByText('Long text');
    expect(el.style.overflow).toBe('hidden');
    expect(el.style.textOverflow).toBe('ellipsis');
    expect(el.style.whiteSpace).toBe('nowrap');
  });

  it('merges custom style', () => {
    render(<Text style={{ marginTop: 10 }}>Styled</Text>);
    const el = screen.getByText('Styled');
    expect(el.style.marginTop).toBe('10px');
  });

  it('applies text alignment', () => {
    render(<Text align="center">Centered</Text>);
    const el = screen.getByText('Centered');
    expect(el.style.textAlign).toBe('center');
  });
});
