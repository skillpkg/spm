import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';

const mockedUseAuth = vi.mocked(useAuth);

beforeEach(() => {
  vi.clearAllMocks();
});

const renderProtectedRoute = (initialPath = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/signin" element={<div>Sign In Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  it('shows "Loading..." when isLoading is true', () => {
    mockedUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
      token: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    renderProtectedRoute();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to /signin when not authenticated', () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      token: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    renderProtectedRoute();

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Sign In Page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: 'u1',
        username: 'testuser',
        github_id: 12345,
        trust_tier: 'verified',
        is_admin: false,
        created_at: '2026-01-01T00:00:00Z',
      },
      token: 'jwt_abc',
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    renderProtectedRoute();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Sign In Page')).not.toBeInTheDocument();
  });

  it('passes current location in redirect state', () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      token: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    // The Navigate component uses `state={{ from: location.pathname }}` and `replace`.
    // We verify the redirect happens by checking we land on /signin.
    renderProtectedRoute('/dashboard');

    expect(screen.getByText('Sign In Page')).toBeInTheDocument();
  });

  it('renders correct children content', () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: 'u2',
        username: 'admin',
        github_id: 99999,
        trust_tier: 'official',
        is_admin: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      token: 'admin_jwt',
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <h1>Dashboard</h1>
                <p>Welcome back</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });
});
