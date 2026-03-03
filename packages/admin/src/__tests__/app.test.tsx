import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminPanel } from '../pages/AdminPanel';

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
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignIn: () => <div>Sign In</div>,
}));

vi.mock('../lib/api', () => ({
  getQueue: vi.fn().mockResolvedValue({ queue: [], total: 0 }),
  getAdminStats: vi.fn().mockResolvedValue({
    publishes: { total: 0, published: 0, blocked: 0, rejected: 0 },
    scans: { passed: 0, flagged: 0, blocked: 0, manual_approved: 0 },
    queue_depth: 0,
    open_reports: 0,
    open_errors: 0,
    users_by_trust: {},
    total_skills: 0,
    total_users: 0,
    total_downloads: 0,
  }),
  approveQueueItem: vi.fn(),
  rejectQueueItem: vi.fn(),
}));

const renderPanel = () =>
  render(
    <MemoryRouter>
      <AdminPanel />
    </MemoryRouter>,
  );

describe('AdminPanel', () => {
  it('renders Admin Panel heading', () => {
    renderPanel();
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('renders all 6 tab labels', () => {
    renderPanel();
    expect(screen.getByText('Review Queue')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Scan Analytics')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
  });

  it('renders ADMIN badge in nav', () => {
    renderPanel();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('shows FlaggedQueue loading state by default', () => {
    renderPanel();
    expect(screen.getByText('Loading review queue...')).toBeInTheDocument();
  });

  it('shows FlaggedQueue content after loading', async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('In queue')).toBeInTheDocument();
    });
  });

  it('shows username in nav', () => {
    renderPanel();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('shows Back to registry link', () => {
    renderPanel();
    const link = screen.getByText((content) => content.includes('Back to registry'));
    expect(link).toBeInTheDocument();
  });

  it('shows Sign out button', () => {
    renderPanel();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });
});
