import { screen, waitFor } from '@testing-library/react';
import { Home } from '../pages/home';
import { getTrending, getCategories } from '../lib/api';
import { renderWithProviders } from './helpers';

vi.mock('@spm/ui', () => ({
  TrustBadge: ({ tier }: { tier: string; showLabel?: boolean }) => (
    <span data-testid="trust-badge">{tier}</span>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Text: ({ children, as: Tag = 'span', style, ...rest }: any) => {
    const El = Tag || 'span';
    return (
      <El style={style} {...rest}>
        {children}
      </El>
    );
  },
}));

vi.mock('../lib/api', () => ({
  getTrending: vi.fn(),
  getCategories: vi.fn(),
}));

const mockedGetTrending = vi.mocked(getTrending);
const mockedGetCategories = vi.mocked(getCategories);

const trendingSkills = [
  {
    name: 'pdf',
    version: '2.0.3',
    description: 'Read, create, merge, split, and fill PDF documents',
    author: { username: 'anthropic', trust_tier: 'official' },
    categories: ['documents'],
    downloads: 45100,
    weekly_downloads: 3200,
    weekly_growth_pct: 12,
    rating_avg: 4.9,
  },
  {
    name: 'frontend-design',
    version: '1.4.1',
    description: 'Create distinctive, production-grade frontend interfaces',
    author: { username: 'anthropic', trust_tier: 'official' },
    categories: ['frontend'],
    downloads: 38200,
    weekly_downloads: 2800,
    weekly_growth_pct: 18,
    rating_avg: 4.8,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetTrending.mockResolvedValue({ tab: 'featured', skills: trendingSkills });
  mockedGetCategories.mockResolvedValue({
    categories: [
      { slug: 'documents', display: 'Documents', count: 5, icon: '📄' },
      { slug: 'frontend', display: 'Frontend', count: 3, icon: '🎨' },
    ],
    total_skills: 7,
  });
});

const renderHome = () => renderWithProviders(<Home />);

describe('Home', () => {
  it('renders hero heading', () => {
    renderHome();

    expect(screen.getByText('Find skills for your agents')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderHome();

    const input = screen.getByPlaceholderText(
      'Search skills... (author:name, category:slug, tag:keyword)',
    );
    expect(input).toBeInTheDocument();
  });

  it('renders all 4 trending tabs', () => {
    renderHome();

    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('Rising')).toBeInTheDocument();
    expect(screen.getByText('Most installed')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders Featured tab with API skills', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getAllByText('pdf').length).toBeGreaterThan(0);
      expect(screen.getAllByText('frontend-design').length).toBeGreaterThan(0);
    });
  });

  it('renders "Browse by category" section', () => {
    renderHome();

    expect(screen.getByText('Browse by category')).toBeInTheDocument();
  });

  it('renders category items', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Frontend')).toBeInTheDocument();
    });
  });
});
