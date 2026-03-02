import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { useAuth } from '../context/AuthContext';
import { MY_SKILLS } from '../pages/dashboard/mock-data';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

const authState = (overrides: Partial<ReturnType<typeof useAuth>> = {}) => ({
  user: {
    id: 'u1',
    username: 'testuser',
    github_id: 12345,
    trust_tier: 'verified',
    is_admin: false,
    created_at: '2026-01-01T00:00:00Z',
  },
  token: 'fake-token',
  isLoading: false,
  isAuthenticated: true,
  signIn: vi.fn(),
  signOut: vi.fn(),
  ...overrides,
});

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dashboard', () => {
  it('renders username from auth context', () => {
    mockedUseAuth.mockReturnValue(authState());
    renderDashboard();

    expect(screen.getByText('@testuser')).toBeInTheDocument();
  });

  it('renders "Total downloads" stat', () => {
    mockedUseAuth.mockReturnValue(authState());
    renderDashboard();

    expect(screen.getByText('Total downloads')).toBeInTheDocument();
  });

  it('renders "Skills published" stat', () => {
    mockedUseAuth.mockReturnValue(authState());
    renderDashboard();

    expect(screen.getByText('Skills published')).toBeInTheDocument();
  });

  it('renders "Avg rating" stat', () => {
    mockedUseAuth.mockReturnValue(authState());
    renderDashboard();

    expect(screen.getByText('Avg rating')).toBeInTheDocument();
  });

  it('renders 4 tab labels', () => {
    mockedUseAuth.mockReturnValue(authState());
    renderDashboard();

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText(`Skills (${MY_SKILLS.length})`)).toBeInTheDocument();
    expect(screen.getByText('Publish history')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('shows Overview tab by default', () => {
    mockedUseAuth.mockReturnValue(authState());
    renderDashboard();

    // The Overview tab button should be present and its content visible
    expect(screen.getByText('Your skills')).toBeInTheDocument();
  });

  it('shows "Your skills" in overview tab', () => {
    mockedUseAuth.mockReturnValue(authState());
    renderDashboard();

    expect(screen.getByText('Your skills')).toBeInTheDocument();
  });

  it('shows "Recent activity" in overview tab', () => {
    mockedUseAuth.mockReturnValue(authState());
    renderDashboard();

    expect(screen.getByText('Recent activity')).toBeInTheDocument();
  });
});
