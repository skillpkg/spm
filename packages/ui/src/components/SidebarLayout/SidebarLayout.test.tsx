import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarLayout } from './SidebarLayout';

describe('SidebarLayout', () => {
  it('renders sidebar and children', () => {
    render(
      <SidebarLayout sidebar={<div>Sidebar</div>}>
        <div>Main Content</div>
      </SidebarLayout>,
    );
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('renders top bar when provided', () => {
    render(
      <SidebarLayout sidebar={<div>Side</div>} topBar={<div>Top Bar</div>}>
        <div>Content</div>
      </SidebarLayout>,
    );
    expect(screen.getByText('Top Bar')).toBeInTheDocument();
  });

  it('applies sidebar width as margin', () => {
    const { container } = render(
      <SidebarLayout sidebar={<div>Side</div>} sidebarWidth={280}>
        <div>Content</div>
      </SidebarLayout>,
    );
    const mainArea = container.firstChild?.childNodes[1] as HTMLElement;
    expect(mainArea.style.marginLeft).toBe('280px');
  });
});
