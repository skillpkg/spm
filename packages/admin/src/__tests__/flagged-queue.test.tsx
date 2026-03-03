import { render, screen, waitFor } from '@testing-library/react';
import { FlaggedQueue } from '../components/FlaggedQueue';

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
  getQueue: vi.fn().mockResolvedValue({
    queue: [
      {
        id: 'f1',
        skill: 'auto-deploy',
        version: '0.3.0',
        author: { username: 'devops-guy', trust_tier: 'registered' },
        flags: [{ layer: 2, type: 'ml_classification', confidence: 0.78 }],
        submitted_at: '2026-02-27T14:30:00Z',
        size_bytes: 18432,
      },
      {
        id: 'f2',
        skill: 'env-manager',
        version: '1.0.0',
        author: { username: 'sec-tools', trust_tier: 'verified' },
        flags: [{ layer: 2, type: 'ml_classification', confidence: 0.65 }],
        submitted_at: '2026-02-27T09:15:00Z',
        size_bytes: 12288,
      },
    ],
    total: 2,
  }),
  getAdminStats: vi.fn().mockResolvedValue({
    queue_depth: 2,
    open_reports: 1,
    scans: { passed: 100, flagged: 2, blocked: 5, manual_approved: 1 },
    publishes: { total: 50, published: 45, blocked: 3, rejected: 2 },
    total_skills: 10,
    total_users: 5,
    total_downloads: 200,
    users_by_trust: {},
    open_errors: 0,
  }),
  approveQueueItem: vi.fn().mockResolvedValue({ id: 'f1', status: 'approved' }),
  rejectQueueItem: vi.fn().mockResolvedValue({ id: 'f1', status: 'rejected' }),
}));

describe('FlaggedQueue', () => {
  it('renders "In queue" stat after loading', async () => {
    render(<FlaggedQueue />);
    await waitFor(() => {
      expect(screen.getByText('In queue')).toBeInTheDocument();
    });
  });

  it('renders flagged skill names', async () => {
    render(<FlaggedQueue />);
    await waitFor(() => {
      expect(screen.getByText('auto-deploy')).toBeInTheDocument();
      expect(screen.getByText('env-manager')).toBeInTheDocument();
    });
  });

  it('shows flag type and confidence', async () => {
    render(<FlaggedQueue />);
    await waitFor(() => {
      expect(screen.getByText('L2: ml_classification (78%)')).toBeInTheDocument();
      expect(screen.getByText('L2: ml_classification (65%)')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<FlaggedQueue />);
    expect(screen.getByText('Loading review queue...')).toBeInTheDocument();
  });

  it('renders queue depth from stats', async () => {
    render(<FlaggedQueue />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});
