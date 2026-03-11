import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('renders left content', () => {
    render(<TopBar left={<span>Breadcrumb</span>} />);
    expect(screen.getByText('Breadcrumb')).toBeInTheDocument();
  });

  it('renders center content', () => {
    render(<TopBar center={<input placeholder="Search..." />} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders right content', () => {
    render(<TopBar right={<button>Sign out</button>} />);
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('renders all three slots', () => {
    render(
      <TopBar left={<span>Left</span>} center={<span>Center</span>} right={<span>Right</span>} />,
    );
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Center')).toBeInTheDocument();
    expect(screen.getByText('Right')).toBeInTheDocument();
  });

  it('renders menu button when onMenuClick is provided', () => {
    const onClick = vi.fn();
    const { container } = render(<TopBar onMenuClick={onClick} />);
    // Menu button exists (even if hidden by CSS)
    const menuBtn = container.querySelector('.topbar-menu-btn');
    expect(menuBtn).toBeInTheDocument();
  });
});
