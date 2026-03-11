import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb', () => {
  it('renders breadcrumb items', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Skills' }]} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
  });

  it('renders separators between items', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Search', href: '/search' },
          { label: 'pdf' },
        ]}
      />,
    );
    const separators = screen.getAllByText('/');
    expect(separators).toHaveLength(2);
  });

  it('renders first items as links', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Current' }]} />);
    const link = screen.getByText('Home').closest('a');
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders last item as plain text', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Current' }]} />);
    const lastItem = screen.getByText('Current');
    expect(lastItem.closest('a')).toBeNull();
  });

  it('renders nothing when items is empty', () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
