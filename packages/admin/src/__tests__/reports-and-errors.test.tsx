import { render, screen, waitFor } from '@testing-library/react';
import { ReportsTab } from '../components/ReportsTab';
import { ErrorsTab } from '../components/ErrorsTab';

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
  getAdminReports: vi.fn().mockResolvedValue({
    results: [
      {
        id: 'r1',
        skill: 'clipboard-helper',
        reporter: 'sarah',
        reason: 'Reads clipboard without consent',
        priority: 'high',
        status: 'open',
        resolution: null,
        action_taken: null,
        created_at: '2026-02-27T00:00:00Z',
        updated_at: '2026-02-27T00:00:00Z',
      },
      {
        id: 'r2',
        skill: 'git-autocommit',
        reporter: 'chen',
        reason: 'Pushes without confirmation',
        priority: 'medium',
        status: 'open',
        resolution: null,
        action_taken: null,
        created_at: '2026-02-26T00:00:00Z',
        updated_at: '2026-02-26T00:00:00Z',
      },
    ],
    total: 2,
    page: 1,
    per_page: 20,
    pages: 1,
  }),
  updateReport: vi.fn().mockResolvedValue({ id: 'r1', status: 'resolved' }),
  getAdminErrors: vi.fn().mockResolvedValue({
    errors: [],
    total: 0,
  }),
  updateError: vi.fn().mockResolvedValue({ id: 'e1', status: 'resolved' }),
}));

describe('ReportsTab', () => {
  it('renders "Open reports" stat', async () => {
    render(<ReportsTab />);
    await waitFor(() => {
      expect(screen.getByText('Open reports')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('renders report skill names', async () => {
    render(<ReportsTab />);
    await waitFor(() => {
      expect(screen.getByText('clipboard-helper')).toBeInTheDocument();
      expect(screen.getByText('git-autocommit')).toBeInTheDocument();
    });
  });

  it('shows reporter names', async () => {
    render(<ReportsTab />);
    await waitFor(() => {
      expect(screen.getByText('Reported by @sarah')).toBeInTheDocument();
      expect(screen.getByText('Reported by @chen')).toBeInTheDocument();
    });
  });
});

describe('ErrorsTab', () => {
  it('renders "Open errors" stat with zero', async () => {
    render(<ErrorsTab />);
    await waitFor(() => {
      expect(screen.getByText('Open errors')).toBeInTheDocument();
      // Multiple stat boxes show "0" - just verify at least one exists
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows empty state message when no errors', async () => {
    render(<ErrorsTab />);
    await waitFor(() => {
      expect(screen.getByText(/No errors reported yet/)).toBeInTheDocument();
    });
  });
});
