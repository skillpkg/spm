import { screen, waitFor } from '@testing-library/react';
import { renderWithQuery } from './helpers';
import { ScanAnalytics } from '../components/ScanAnalytics';

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

vi.mock('../lib/api', () => ({
  getAdminStats: vi.fn().mockResolvedValue({
    publishes: { total: 847, published: 791, blocked: 38, rejected: 18 },
    scans: { passed: 791, flagged: 18, blocked: 38, manual_approved: 6 },
    queue_depth: 3,
    open_reports: 2,
    open_errors: 2,
    users_by_trust: { official: 1, verified: 12, scanned: 45, registered: 180 },
    total_skills: 156,
    total_users: 238,
    total_downloads: 85000,
  }),
}));

describe('ScanAnalytics', () => {
  it('renders "Total publishes" stat', async () => {
    renderWithQuery(<ScanAnalytics />);
    await waitFor(() => {
      expect(screen.getByText('Total publishes')).toBeInTheDocument();
      expect(screen.getByText('847')).toBeInTheDocument();
    });
  });

  it('renders "Published" stat', async () => {
    renderWithQuery(<ScanAnalytics />);
    await waitFor(() => {
      const publishedElements = screen.getAllByText('Published');
      expect(publishedElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('791').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders "Blocked" stat', async () => {
    renderWithQuery(<ScanAnalytics />);
    await waitFor(() => {
      const blockedElements = screen.getAllByText('Blocked');
      expect(blockedElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('38').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders registry totals', async () => {
    renderWithQuery(<ScanAnalytics />);
    await waitFor(() => {
      expect(screen.getByText('Registry totals')).toBeInTheDocument();
      expect(screen.getByText('156')).toBeInTheDocument();
      expect(screen.getByText('238')).toBeInTheDocument();
    });
  });

  it('renders per-layer stat boxes with placeholder values when no layer data', async () => {
    renderWithQuery(<ScanAnalytics />);
    await waitFor(() => {
      expect(screen.getByText('L1 pass rate')).toBeInTheDocument();
      expect(screen.getByText('L2 flag rate')).toBeInTheDocument();
      expect(screen.getByText('L3 flag rate')).toBeInTheDocument();
      expect(screen.getByText('Partial scans')).toBeInTheDocument();
      // Without scans_by_layer data, values should be "--"
      const dashes = screen.getAllByText('--');
      expect(dashes.length).toBe(4);
    });
  });
});

describe('ScanAnalytics with per-layer data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders computed per-layer rates when scans_by_layer is provided', async () => {
    const { getAdminStats } = await import('../lib/api');
    vi.mocked(getAdminStats).mockResolvedValueOnce({
      publishes: { total: 100, published: 90, blocked: 5, rejected: 5 },
      scans: { passed: 90, flagged: 5, blocked: 5, manual_approved: 0 },
      scans_by_layer: {
        l1: { passed: 95, flagged: 0, blocked: 5 },
        l2: { passed: 85, flagged: 10, blocked: 0 },
        l3: { passed: 90, flagged: 5, blocked: 0 },
        partial: 8,
      },
      queue_depth: 2,
      open_reports: 1,
      open_errors: 0,
      users_by_trust: { registered: 50 },
      total_skills: 100,
      total_users: 50,
      total_downloads: 5000,
    });

    renderWithQuery(<ScanAnalytics />);
    await waitFor(() => {
      expect(screen.getByText('L1 pass rate')).toBeInTheDocument();
      expect(screen.getByText('95.0%')).toBeInTheDocument();
      expect(screen.getByText('L2 flag rate')).toBeInTheDocument();
      expect(screen.getByText('10.5%')).toBeInTheDocument();
      expect(screen.getByText('L3 flag rate')).toBeInTheDocument();
      expect(screen.getByText('5.3%')).toBeInTheDocument();
      expect(screen.getByText('Partial scans')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });
});
