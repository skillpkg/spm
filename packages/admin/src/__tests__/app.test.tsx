import { render, screen } from '@testing-library/react';
import { App } from '../App';
import { FLAGGED_QUEUE, REPORTS } from '../data/mock';

describe('App', () => {
  it('renders Admin Panel heading', () => {
    render(<App />);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('renders all 6 tab labels', () => {
    render(<App />);
    expect(screen.getByText('Review Queue')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Scan Analytics')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
  });

  it('renders ADMIN badge in nav', () => {
    render(<App />);
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('shows FlaggedQueue content by default', () => {
    render(<App />);
    expect(screen.getByText('In queue')).toBeInTheDocument();
    expect(screen.getByText('Avg review time')).toBeInTheDocument();
  });

  it('shows admin@skillpkg.dev email', () => {
    render(<App />);
    expect(screen.getByText('admin@skillpkg.dev')).toBeInTheDocument();
  });

  it('shows Back to registry link', () => {
    render(<App />);
    // The HTML entity &larr; renders as the left arrow character
    const link = screen.getByText((content) => content.includes('Back to registry'));
    expect(link).toBeInTheDocument();
  });

  it('renders Review Queue tab with count badge', () => {
    render(<App />);
    const expectedCount = FLAGGED_QUEUE.length;
    // The count badge is a span inside the tab button
    const tabButton = screen.getByText('Review Queue').closest('button');
    expect(tabButton).toBeInTheDocument();
    expect(tabButton!.textContent).toContain(String(expectedCount));
  });

  it('renders Reports tab with count badge', () => {
    render(<App />);
    const expectedCount = REPORTS.filter((r) => r.status === 'open').length;
    const tabButton = screen.getByText('Reports').closest('button');
    expect(tabButton).toBeInTheDocument();
    expect(tabButton!.textContent).toContain(String(expectedCount));
  });
});
