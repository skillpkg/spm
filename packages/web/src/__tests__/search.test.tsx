import { screen, waitFor } from '@testing-library/react';
import { Search } from '../pages/Search';
import { searchSkills } from '../lib/api';
import { renderWithProviders } from './helpers';

vi.mock('../lib/api', () => ({
  searchSkills: vi.fn(),
}));

const mockedSearchSkills = vi.mocked(searchSkills);

const searchResults = [
  {
    name: 'pdf',
    version: '2.0.3',
    description: 'Read, create, merge, split, and fill PDF documents',
    author: { username: 'anthropic', trust_tier: 'official' },
    categories: ['documents'],
    tags: ['documents', 'forms', 'ocr'],
    downloads: 45100,
    weekly_downloads: 3200,
    rating_avg: 4.9,
    rating_count: 342,
    signed: true,
    scan_security_level: 'full',
    published_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-02-20T00:00:00Z',
  },
  {
    name: 'data-viz',
    version: '1.2.3',
    description: 'Charts, dashboards, and visualizations',
    author: { username: 'almog', trust_tier: 'verified' },
    categories: ['data-viz'],
    tags: ['charts', 'plotly'],
    downloads: 12400,
    weekly_downloads: 1200,
    rating_avg: 4.8,
    rating_count: 142,
    signed: true,
    scan_security_level: 'partial',
    published_at: '2025-11-01T00:00:00Z',
    updated_at: '2026-02-15T00:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockedSearchSkills.mockResolvedValue({
    results: searchResults,
    total: searchResults.length,
    page: 1,
    per_page: 50,
    pages: 1,
  });
});

const renderSearch = (initialEntries: string[] = ['/search']) =>
  renderWithProviders(<Search />, { routerProps: { initialEntries } });

describe('Search', () => {
  it('renders results count from API', async () => {
    renderSearch();

    await waitFor(() => {
      expect(screen.getByText(`${searchResults.length} results`)).toBeInTheDocument();
    });
  });

  it('renders skill names from API data', async () => {
    renderSearch();

    await waitFor(() => {
      expect(screen.getByText('pdf')).toBeInTheDocument();
      expect(screen.getByText('data-viz')).toBeInTheDocument();
    });
  });

  it('shows Category filter section', () => {
    renderSearch();

    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  it('shows Trust tier filter section', () => {
    renderSearch();

    expect(screen.getByText('Trust tier')).toBeInTheDocument();
    expect(screen.getByText('Official')).toBeInTheDocument();
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Scanned')).toBeInTheDocument();
  });

  it('shows sort dropdown with options', () => {
    renderSearch();

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    const labels = options.map((o) => o.textContent);
    expect(labels).toContain('Relevance');
    expect(labels).toContain('Most downloads');
    expect(labels).toContain('Highest rated');
    expect(labels).toContain('Recently updated');
    expect(labels).toContain('Newest');
  });

  it('shows Security filter section with options', () => {
    renderSearch();

    const headings = screen.getAllByText('Security');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Partial').length).toBeGreaterThanOrEqual(1);
  });
});
