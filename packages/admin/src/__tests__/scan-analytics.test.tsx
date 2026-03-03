import { render, screen, waitFor } from '@testing-library/react';
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
    render(<ScanAnalytics />);
    await waitFor(() => {
      expect(screen.getByText('Total publishes')).toBeInTheDocument();
      expect(screen.getByText('847')).toBeInTheDocument();
    });
  });

  it('renders "Published" stat', async () => {
    render(<ScanAnalytics />);
    await waitFor(() => {
      const publishedElements = screen.getAllByText('Published');
      expect(publishedElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('791').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders "Blocked" stat', async () => {
    render(<ScanAnalytics />);
    await waitFor(() => {
      const blockedElements = screen.getAllByText('Blocked');
      expect(blockedElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('38').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders registry totals', async () => {
    render(<ScanAnalytics />);
    await waitFor(() => {
      expect(screen.getByText('Registry totals')).toBeInTheDocument();
      expect(screen.getByText('156')).toBeInTheDocument();
      expect(screen.getByText('238')).toBeInTheDocument();
    });
  });
});
