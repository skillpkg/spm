import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQuery } from './helpers';
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
  renderWithQuery(
    <MemoryRouter>
      <AdminPanel />
    </MemoryRouter>,
  );

describe('AdminPanel', () => {
  it('renders Admin Panel in breadcrumb', () => {
    renderPanel();
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('renders all 7 navigation items in sidebar', () => {
    renderPanel();
    expect(screen.getAllByText('Overview').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Review Queue')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Scan Analytics')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
  });

  it('renders ADMIN badge in sidebar', () => {
    renderPanel();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('shows Overview content by default', () => {
    renderPanel();
    expect(screen.getByText('Platform Overview')).toBeInTheDocument();
  });

  it('shows coming soon placeholders on overview', () => {
    renderPanel();
    expect(screen.getAllByText(/Coming Soon/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows username in sidebar footer', () => {
    renderPanel();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('shows skillpkg.dev link in sidebar', () => {
    renderPanel();
    const link = screen.getByText((content) => content.includes('skillpkg.dev'));
    expect(link).toBeInTheDocument();
  });

  it('shows Sign out button in sidebar footer', () => {
    renderPanel();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });
});
