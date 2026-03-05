import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

const renderNav = (props: { query?: string; onQueryChange?: (q: string) => void } = {}) =>
  render(
    <MemoryRouter>
      <Nav {...props} />
    </MemoryRouter>,
  );

const unauthenticatedState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  isAdmin: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

const authenticatedState = {
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
  isAdmin: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

const adminState = {
  ...authenticatedState,
  user: {
    ...authenticatedState.user,
    username: 'adminuser',
    is_admin: true,
  },
  isAdmin: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Nav', () => {
  it('renders spm logo linking to /', () => {
    mockedUseAuth.mockReturnValue(unauthenticatedState);
    renderNav();

    const logoLink = screen.getByText('spm').closest('a');
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('shows search input with placeholder', () => {
    mockedUseAuth.mockReturnValue(unauthenticatedState);
    renderNav();

    const input = screen.getByPlaceholderText('Search skills...');
    expect(input).toBeInTheDocument();
  });

  it('shows Sign in link when not authenticated', () => {
    mockedUseAuth.mockReturnValue(unauthenticatedState);
    renderNav();

    const signInLink = screen.getByText('Sign in');
    expect(signInLink).toBeInTheDocument();
    expect(signInLink.closest('a')).toHaveAttribute('href', '/signin');
  });

  it('shows username and avatar when authenticated', () => {
    mockedUseAuth.mockReturnValue(authenticatedState);
    renderNav();

    expect(screen.getByText('testuser')).toBeInTheDocument();
    const avatar = screen.getByAltText('testuser');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://github.com/testuser.png?size=28');
  });

  it('shows Dashboard link when authenticated', () => {
    mockedUseAuth.mockReturnValue(authenticatedState);
    renderNav();

    const dashboardLink = screen.getByText('Dashboard');
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard');
  });

  it('shows Admin link for admin users', () => {
    mockedUseAuth.mockReturnValue(adminState);
    renderNav();

    const adminLink = screen.getByText('Admin');
    expect(adminLink).toBeInTheDocument();
    expect(adminLink.closest('a')).toHaveAttribute(
      'href',
      'https://admin.skillpkg.dev#token=fake-token',
    );
  });

  it('does not show Admin link for non-admin users', () => {
    mockedUseAuth.mockReturnValue(authenticatedState);
    renderNav();

    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('calls onQueryChange when typing', () => {
    mockedUseAuth.mockReturnValue(unauthenticatedState);
    const onQueryChange = vi.fn();
    renderNav({ query: '', onQueryChange });

    const input = screen.getByPlaceholderText('Search skills...');
    fireEvent.change(input, { target: { value: 'pdf' } });

    expect(onQueryChange).toHaveBeenCalledWith('pdf');
  });
});
