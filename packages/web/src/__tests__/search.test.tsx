import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Search } from '../pages/Search';
import { SKILLS_DB } from '../data/mock';

const renderSearch = (initialEntries: string[] = ['/search']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Search />
    </MemoryRouter>,
  );

describe('Search', () => {
  it('renders results count matching SKILLS_DB length', () => {
    renderSearch();

    expect(screen.getByText(`${SKILLS_DB.length} results`)).toBeInTheDocument();
  });

  it('renders skill names from mock data', () => {
    renderSearch();

    for (const skill of SKILLS_DB) {
      expect(screen.getByText(skill.name)).toBeInTheDocument();
    }
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
    expect(screen.getByText('Verified')).toBeInTheDocument();
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
});
