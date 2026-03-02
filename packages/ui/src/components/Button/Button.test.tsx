import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders label text', () => {
    render(<Button label="Approve" color="accent" />);
    expect(screen.getByText('Approve')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button label="Click me" color="accent" onClick={onClick} />);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders small variant with smaller font', () => {
    const { container } = render(<Button label="Small" color="blue" small />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.fontSize).toBe('11px');
  });

  it('renders normal size by default', () => {
    const { container } = render(<Button label="Normal" color="blue" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.fontSize).toBe('12px');
  });
});
