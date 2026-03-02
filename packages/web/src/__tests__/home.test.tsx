import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../pages/Home';
import { FEATURED, CATEGORIES } from '../data/mock';

vi.mock('@spm/ui', () => ({
  TrustBadge: ({ tier }: { tier: string; showLabel?: boolean }) => (
    <span data-testid="trust-badge">{tier}</span>
  ),
}));

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

describe('Home', () => {
  it('renders hero heading', () => {
    renderHome();

    expect(screen.getByText('Find skills for your agents')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderHome();

    const input = screen.getByPlaceholderText('Search skills...');
    expect(input).toBeInTheDocument();
  });

  it('renders all 4 trending tabs', () => {
    renderHome();

    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('Rising')).toBeInTheDocument();
    expect(screen.getByText('Most installed')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders Featured tab by default with skill cards', () => {
    renderHome();

    for (const skill of FEATURED) {
      expect(screen.getByText(skill.name)).toBeInTheDocument();
    }
  });

  it('renders "Browse by category" section', () => {
    renderHome();

    expect(screen.getByText('Browse by category')).toBeInTheDocument();
  });

  it('renders category items', () => {
    renderHome();

    for (const cat of CATEGORIES) {
      expect(screen.getByText(cat.name)).toBeInTheDocument();
    }
  });
});
