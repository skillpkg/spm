import { screen, waitFor } from '@testing-library/react';
import { renderWithQueryAndRouter } from './helpers';
import { SkillDetailPane } from '../components/SkillDetailPane';
import { type SkillDetailResponse } from '../lib/api';

vi.mock('@spm/web-auth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { username: 'admin', is_admin: true },
    token: 'fake-jwt',
    isLoading: false,
    isAuthenticated: true,
    isAdmin: true,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('../lib/useSearchParamsState', () => ({
  useSearchParamsState: vi.fn().mockReturnValue({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));

const mockGetSkillDetail = vi.fn();
const mockGetSkillVersion = vi.fn();
const mockGetAdminSkillVersion = vi.fn();
const mockGetSkillDownloads = vi.fn();

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual('../lib/api');
  return {
    ...actual,
    getSkillDetail: (...args: unknown[]) => mockGetSkillDetail(...args),
    getSkillVersion: (...args: unknown[]) => mockGetSkillVersion(...args),
    getAdminSkillVersion: (...args: unknown[]) => mockGetAdminSkillVersion(...args),
    getSkillDownloads: (...args: unknown[]) => mockGetSkillDownloads(...args),
    yankSkill: vi.fn(),
    blockSkill: vi.fn(),
    unblockSkill: vi.fn(),
  };
});

const baseDetail: SkillDetailResponse = {
  name: 'test-skill',
  description: 'A test skill',
  categories: ['code-gen'],
  latest_version: '1.0.0',
  author: { username: 'testuser', trust_tier: 'registered' },
  authors: [
    { username: 'testuser', github_login: 'testuser', trust_tier: 'registered', role: 'owner' },
  ],
  status: 'active',
  deprecated: false,
  security: {
    signed: true,
    scan_status: 'passed',
    scan_security_level: 'full',
    scan_layers: [
      { layer: 1, name: 'Static Analysis', status: 'passed', confidence: null },
      { layer: 2, name: 'ML Classification', status: 'passed', confidence: 0.02 },
      { layer: 3, name: 'Lakera Guard', status: 'passed', confidence: null },
    ],
  },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  versions: [
    { version: '1.0.0', published_at: '2025-01-01T00:00:00Z', yanked: false, downloads: 100 },
  ],
  downloads: 100,
};

const baseVersion = {
  name: 'test-skill',
  version: '1.0.0',
  readme_md: '# Test',
  manifest: { name: 'test-skill', version: '1.0.0' },
  published_at: '2025-01-01T00:00:00Z',
  yanked: false,
  signed: true,
};

describe('SkillDetailPane Security Tab', () => {
  beforeEach(() => {
    mockGetSkillDetail.mockResolvedValue(baseDetail);
    mockGetSkillVersion.mockResolvedValue(baseVersion);
    mockGetAdminSkillVersion.mockResolvedValue(baseVersion);
    mockGetSkillDownloads.mockResolvedValue({ name: 'test-skill', days: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders security level when scan_layers are provided', async () => {
    renderWithQueryAndRouter(<SkillDetailPane skillName="test-skill" />);
    await waitFor(() => {
      expect(screen.getByText('test-skill')).toBeInTheDocument();
    });

    screen.getByText('Security').click();

    await waitFor(() => {
      expect(screen.getByText('Security Level')).toBeInTheDocument();
      expect(screen.getByText('full')).toBeInTheDocument();
    });
  });

  it('renders scan layer data with status and confidence', async () => {
    renderWithQueryAndRouter(<SkillDetailPane skillName="test-skill" />);
    await waitFor(() => {
      expect(screen.getByText('test-skill')).toBeInTheDocument();
    });

    screen.getByText('Security').click();

    await waitFor(() => {
      expect(screen.getByText('Security Layers')).toBeInTheDocument();
      expect(screen.getByText('L1: Static Analysis')).toBeInTheDocument();
      expect(screen.getByText('L2: ML Classification')).toBeInTheDocument();
      expect(screen.getByText('L3: Lakera Guard')).toBeInTheDocument();
    });
  });

  it('shows confidence percentage for layers with confidence', async () => {
    renderWithQueryAndRouter(<SkillDetailPane skillName="test-skill" />);
    await waitFor(() => {
      expect(screen.getByText('test-skill')).toBeInTheDocument();
    });

    screen.getByText('Security').click();

    await waitFor(() => {
      expect(screen.getByText('passed (2%)')).toBeInTheDocument();
    });
  });

  it('renders flagged layers with approve/block buttons', async () => {
    mockGetSkillDetail.mockResolvedValue({
      ...baseDetail,
      security: {
        signed: true,
        scan_status: 'flagged',
        scan_security_level: 'flagged',
        scan_layers: [
          { layer: 1, name: 'Static Analysis', status: 'passed', confidence: null },
          { layer: 2, name: 'ML Classification', status: 'flagged', confidence: 0.82 },
          { layer: 3, name: 'Lakera Guard', status: 'passed', confidence: null },
        ],
      },
    });

    renderWithQueryAndRouter(<SkillDetailPane skillName="test-skill" />);
    await waitFor(() => {
      expect(screen.getByText('test-skill')).toBeInTheDocument();
    });

    screen.getByText('Security').click();

    await waitFor(() => {
      expect(screen.getByText('flagged (82%)')).toBeInTheDocument();
      expect(screen.getByText('Approve')).toBeInTheDocument();
      const blockButtons = screen.getAllByText('Block');
      expect(blockButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows default layers when no scan_layers provided', async () => {
    mockGetSkillDetail.mockResolvedValue({
      ...baseDetail,
      security: undefined,
    });

    renderWithQueryAndRouter(<SkillDetailPane skillName="test-skill" />);
    await waitFor(() => {
      expect(screen.getByText('test-skill')).toBeInTheDocument();
    });

    screen.getByText('Security').click();

    await waitFor(() => {
      expect(screen.getByText('L1: Static Analysis')).toBeInTheDocument();
      expect(screen.getByText('L2: ML Classification')).toBeInTheDocument();
      expect(screen.getByText('L3: Lakera Guard')).toBeInTheDocument();
    });
  });
});
