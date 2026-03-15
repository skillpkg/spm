import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppSidebar } from '../components/AppSidebar';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <AppSidebar />
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

describe('AppSidebar', () => {
  it('renders spm logo', () => {
    mockedUseAuth.mockReturnValue(unauthenticatedState);
    renderSidebar();

    expect(screen.getByText('spm')).toBeInTheDocument();
  });

  it('renders Discover section with Home and Search', () => {
    mockedUseAuth.mockReturnValue(unauthenticatedState);
    renderSidebar();

    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('renders Docs section with Getting Started, Core Concepts, CLI Reference, Publishing', () => {
    mockedUseAuth.mockReturnValue(unauthenticatedState);
    renderSidebar();

    expect(screen.getByText('Docs')).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Core Concepts')).toBeInTheDocument();
    expect(screen.getByText('CLI Reference')).toBeInTheDocument();
    expect(screen.getByText('Publishing')).toBeInTheDocument();
  });

  it('shows Sign in button when not authenticated', () => {
    mockedUseAuth.mockReturnValue(unauthenticatedState);
    renderSidebar();

    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('shows username and avatar when authenticated', () => {
    mockedUseAuth.mockReturnValue(authenticatedState);
    renderSidebar();

    expect(screen.getByText('testuser')).toBeInTheDocument();
    const avatar = screen.getByAltText('testuser');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://github.com/testuser.png?size=28');
  });

  it('shows Dashboard link when authenticated', () => {
    mockedUseAuth.mockReturnValue(authenticatedState);
    renderSidebar();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows My Account section when authenticated', () => {
    mockedUseAuth.mockReturnValue(authenticatedState);
    renderSidebar();

    expect(screen.getByText('My Account')).toBeInTheDocument();
  });

  it('shows Admin Panel link for admin users', () => {
    mockedUseAuth.mockReturnValue(adminState);
    renderSidebar();

    const adminLink = screen.getByText('Admin Panel');
    expect(adminLink).toBeInTheDocument();
    expect(adminLink.closest('a')).toHaveAttribute(
      'href',
      'https://admin.skillpkg.dev#token=fake-token',
    );
  });

  it('does not show Admin Panel link for non-admin users', () => {
    mockedUseAuth.mockReturnValue(authenticatedState);
    renderSidebar();

    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('does not show My Account section when not authenticated', () => {
    mockedUseAuth.mockReturnValue(unauthenticatedState);
    renderSidebar();

    expect(screen.queryByText('My Account')).not.toBeInTheDocument();
  });

  it('shows Sign out button when authenticated', () => {
    mockedUseAuth.mockReturnValue(authenticatedState);
    renderSidebar();

    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });
});
