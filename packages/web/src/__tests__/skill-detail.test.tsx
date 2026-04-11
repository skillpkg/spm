import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { SkillDetail } from '../pages/skill-detail';
import { getSkill, getSkillDownloads } from '../lib/api';
import { renderWithProviders } from './helpers';

vi.mock('../lib/api', () => ({
  getSkill: vi.fn(),
  getSkillDownloads: vi.fn(),
}));

const mockedGetSkill = vi.mocked(getSkill);
const mockedGetSkillDownloads = vi.mocked(getSkillDownloads);

const mockPdfSkill = {
  name: 'pdf',
  description: 'Read, create, merge, split, and fill PDF documents',
  author: { username: 'anthropic', github_login: 'anthropic', trust_tier: 'official' },
  authors: [
    { username: 'anthropic', github_login: 'anthropic', trust_tier: 'official', role: 'owner' },
    { username: 'bob', github_login: 'bob', trust_tier: 'registered', role: 'collaborator' },
  ],
  categories: ['documents'],
  tags: ['documents', 'forms', 'ocr'],
  platforms: ['all'],
  license: 'MIT',
  repository: 'https://github.com/anthropic/spm-pdf',
  deprecated: false,
  readme_md: null,
  latest_version: '2.0.3',
  downloads: 45100,
  weekly_downloads: 3200,
  rating_avg: 4.9,
  rating_count: 342,
  security: {
    signed: true,
    signer_identity: 'anthropic@github',
    scan_status: 'passed',
    scan_security_level: 'full',
    scan_layers: [
      { layer: 1, name: 'Static Analysis', status: 'passed', confidence: null },
      { layer: 2, name: 'ML Classification', status: 'passed', confidence: 0.02 },
      { layer: 3, name: 'Lakera Guard', status: 'passed', confidence: null },
    ],
  },
  versions: [
    { version: '2.0.3', published_at: '2026-02-20T00:00:00Z' },
    { version: '2.0.2', published_at: '2026-02-01T00:00:00Z' },
  ],
  dependencies: { skills: [], system: ['python >=3.10'], packages: ['pdf-lib'] },
  created_at: '2026-01-10T00:00:00Z',
  updated_at: '2026-02-20T00:00:00Z',
};

const renderSkillDetail = (name: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/skills/*" element={<SkillDetail />} />
    </Routes>,
    { routerProps: { initialEntries: [`/skills/${name}`] } },
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetSkillDownloads.mockResolvedValue({ name: 'pdf', days: [] });
});

describe('SkillDetail', () => {
  it('renders skill name and version', async () => {
    mockedGetSkill.mockResolvedValue(mockPdfSkill);
    renderSkillDetail('pdf');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pdf' })).toBeInTheDocument();
      expect(screen.getByText('v2.0.3')).toBeInTheDocument();
    });
  });

  it('shows install command with skill name', async () => {
    mockedGetSkill.mockResolvedValue(mockPdfSkill);
    renderSkillDetail('pdf');

    await waitFor(() => {
      expect(screen.getByText('spm install pdf')).toBeInTheDocument();
    });
  });

  it('renders README/Versions/Security tabs', async () => {
    mockedGetSkill.mockResolvedValue(mockPdfSkill);
    renderSkillDetail('pdf');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Versions (2)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Security' })).toBeInTheDocument();
    });
  });

  it('shows "Skill not found" for unknown skill name', async () => {
    mockedGetSkill.mockRejectedValue(new Error('API 404: Not Found'));
    renderSkillDetail('nonexistent-skill-xyz');

    await waitFor(() => {
      expect(screen.getByText('Skill not found')).toBeInTheDocument();
    });
  });

  it('renders multiple author links', async () => {
    mockedGetSkill.mockResolvedValue(mockPdfSkill);
    renderSkillDetail('pdf');

    await waitFor(() => {
      const authorLinks = screen.getAllByText(/@anthropic/);
      expect(authorLinks.length).toBeGreaterThan(0);
      const bobLinks = screen.getAllByText(/@bob/);
      expect(bobLinks.length).toBeGreaterThan(0);
    });
  });

  it('renders category badges', async () => {
    mockedGetSkill.mockResolvedValue(mockPdfSkill);
    renderSkillDetail('pdf');

    await waitFor(() => {
      const matches = screen.getAllByText('documents');
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it('displays skill description', async () => {
    mockedGetSkill.mockResolvedValue(mockPdfSkill);
    renderSkillDetail('pdf');

    await waitFor(() => {
      const matches = screen.getAllByText('Read, create, merge, split, and fill PDF documents');
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
