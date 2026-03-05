import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Home } from '../pages/home';
import { Search } from '../pages/Search';
import { SkillDetail } from '../pages/skill-detail';
import { AuthorProfile } from '../pages/AuthorProfile';
import { Dashboard } from '../pages/Dashboard';
import { SignIn } from '../pages/SignIn';
import { Docs } from '../pages/Docs';
import { CLI } from '../pages/CLI';
import { Publish } from '../pages/Publish';

vi.mock('../../../web-auth/src/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock page components to avoid rendering full trees with further dependencies
vi.mock('../pages/Home', () => ({
  Home: () => <div data-testid="page-home">Home Page</div>,
}));
vi.mock('../pages/Search', () => ({
  Search: () => <div data-testid="page-search">Search Page</div>,
}));
vi.mock('../pages/skill-detail', () => ({
  SkillDetail: () => <div data-testid="page-skill-detail">SkillDetail Page</div>,
}));
vi.mock('../pages/SignIn', () => ({
  SignIn: () => <div data-testid="page-signin">SignIn Page</div>,
}));
vi.mock('../pages/Dashboard', () => ({
  Dashboard: () => <div data-testid="page-dashboard">Dashboard Page</div>,
}));
vi.mock('../pages/Docs', () => ({
  Docs: () => <div data-testid="page-docs">Docs Page</div>,
}));
vi.mock('../pages/AuthorProfile', () => ({
  AuthorProfile: () => <div data-testid="page-author">AuthorProfile Page</div>,
}));
vi.mock('../pages/CLI', () => ({
  CLI: () => <div data-testid="page-cli">CLI Page</div>,
}));
vi.mock('../pages/Publish', () => ({
  Publish: () => <div data-testid="page-publish">Publish Page</div>,
}));

const mockedUseAuth = vi.mocked(useAuth);

const unauthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  isAdmin: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

// Re-create the app route structure using MemoryRouter so we can set initialEntries
const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/search" element={<Search />} />
    <Route path="/skills/:name" element={<SkillDetail />} />
    <Route path="/authors/:username" element={<AuthorProfile />} />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      }
    />
    <Route path="/signin" element={<SignIn />} />
    <Route path="/docs" element={<Docs />} />
    <Route path="/cli" element={<CLI />} />
    <Route path="/publish" element={<Publish />} />
  </Routes>
);

const renderRoute = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Routing', () => {
  it('"/" renders Home page', () => {
    mockedUseAuth.mockReturnValue(unauthState);
    renderRoute('/');

    expect(screen.getByTestId('page-home')).toBeInTheDocument();
  });

  it('"/search" renders Search page', () => {
    mockedUseAuth.mockReturnValue(unauthState);
    renderRoute('/search');

    expect(screen.getByTestId('page-search')).toBeInTheDocument();
  });

  it('"/skills/pdf" renders SkillDetail page', () => {
    mockedUseAuth.mockReturnValue(unauthState);
    renderRoute('/skills/pdf');

    expect(screen.getByTestId('page-skill-detail')).toBeInTheDocument();
  });

  it('"/signin" renders SignIn page', () => {
    mockedUseAuth.mockReturnValue(unauthState);
    renderRoute('/signin');

    expect(screen.getByTestId('page-signin')).toBeInTheDocument();
  });

  it('"/dashboard" redirects to /signin when not authenticated', async () => {
    mockedUseAuth.mockReturnValue(unauthState);
    renderRoute('/dashboard');

    await waitFor(() => {
      expect(screen.getByTestId('page-signin')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('page-dashboard')).not.toBeInTheDocument();
  });

  it('"/docs" renders Docs page', () => {
    mockedUseAuth.mockReturnValue(unauthState);
    renderRoute('/docs');

    expect(screen.getByTestId('page-docs')).toBeInTheDocument();
  });
});
