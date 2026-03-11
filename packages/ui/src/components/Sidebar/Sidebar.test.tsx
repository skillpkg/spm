import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar, type SidebarSection } from './Sidebar';

const sections: SidebarSection[] = [
  {
    title: 'Discover',
    items: [
      { id: 'home', label: 'Home', href: '/' },
      { id: 'search', label: 'Search', href: '/search' },
    ],
  },
  {
    title: 'Account',
    items: [{ id: 'dashboard', label: 'Dashboard', href: '/dashboard' }],
  },
];

const header = <div>Logo</div>;

describe('Sidebar', () => {
  it('renders section titles', () => {
    render(<Sidebar header={header} sections={sections} />);
    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('renders nav items', () => {
    render(<Sidebar header={header} sections={sections} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders header', () => {
    render(<Sidebar header={header} sections={sections} />);
    expect(screen.getByText('Logo')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(<Sidebar header={header} sections={sections} footer={<div>Footer</div>} />);
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('renders items as links when href is provided', () => {
    render(<Sidebar header={header} sections={sections} />);
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders items as buttons when onClick is provided', () => {
    const onClick = vi.fn();
    const clickSections: SidebarSection[] = [
      { items: [{ id: 'btn', label: 'Click Me', onClick }] },
    ];
    render(<Sidebar header={header} sections={clickSections} />);
    fireEvent.click(screen.getByText('Click Me'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows badge when provided', () => {
    const badgeSections: SidebarSection[] = [
      { items: [{ id: 'queue', label: 'Queue', badge: '5', href: '#' }] },
    ];
    render(<Sidebar header={header} sections={badgeSections} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows arrow for external links', () => {
    const extSections: SidebarSection[] = [
      { items: [{ id: 'ext', label: 'External', href: 'https://example.com', external: true }] },
    ];
    render(<Sidebar header={header} sections={extSections} />);
    const link = screen.getByText('External').closest('a');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders mobile overlay when mobileOpen', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Sidebar header={header} sections={sections} mobileOpen onMobileClose={onClose} />,
    );
    const overlay = screen.getByTestId('sidebar-overlay');
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });
});
