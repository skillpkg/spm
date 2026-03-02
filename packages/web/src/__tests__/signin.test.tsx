import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SignIn } from '../pages/SignIn';
import { useAuth } from '../context/AuthContext';
import { requestDeviceCode } from '../lib/api';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  requestDeviceCode: vi.fn(),
  pollToken: vi.fn(),
  AuthPendingError: class AuthPendingError extends Error {
    constructor() {
      super('Authorization pending');
      this.name = 'AuthPendingError';
    }
  },
  AuthExpiredError: class AuthExpiredError extends Error {
    constructor() {
      super('Device code expired');
      this.name = 'AuthExpiredError';
    }
  },
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedRequestDeviceCode = vi.mocked(requestDeviceCode);

const unauthenticatedState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
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
  signIn: vi.fn(),
  signOut: vi.fn(),
};

const renderSignIn = () =>
  render(
    <MemoryRouter initialEntries={['/signin']}>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseAuth.mockReturnValue(unauthenticatedState);
});

describe('SignIn', () => {
  it('renders sign in heading and GitHub button in idle state', () => {
    renderSignIn();

    expect(screen.getByText('Sign in to SPM')).toBeInTheDocument();
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
  });

  it('calls requestDeviceCode when clicking the GitHub button', async () => {
    mockedRequestDeviceCode.mockResolvedValue({
      device_code: 'dc-123',
      user_code: 'ABCD-1234',
      verification_uri: 'https://github.com/login/device',
      expires_in: 900,
      interval: 5,
    });

    renderSignIn();

    fireEvent.click(screen.getByText('Continue with GitHub'));

    await waitFor(() => {
      expect(mockedRequestDeviceCode).toHaveBeenCalledTimes(1);
    });
  });

  it('shows user code in waiting state', async () => {
    mockedRequestDeviceCode.mockResolvedValue({
      device_code: 'dc-123',
      user_code: 'ABCD-1234',
      verification_uri: 'https://github.com/login/device',
      expires_in: 900,
      interval: 5,
    });

    renderSignIn();

    fireEvent.click(screen.getByText('Continue with GitHub'));

    await waitFor(() => {
      expect(screen.getByText('ABCD-1234')).toBeInTheDocument();
    });
  });

  it('shows "Enter this code on GitHub" in waiting state', async () => {
    mockedRequestDeviceCode.mockResolvedValue({
      device_code: 'dc-123',
      user_code: 'ABCD-1234',
      verification_uri: 'https://github.com/login/device',
      expires_in: 900,
      interval: 5,
    });

    renderSignIn();

    fireEvent.click(screen.getByText('Continue with GitHub'));

    await waitFor(() => {
      expect(screen.getByText('Enter this code on GitHub')).toBeInTheDocument();
    });
  });

  it('shows "Code expired" when the timer runs out', async () => {
    mockedRequestDeviceCode.mockResolvedValue({
      device_code: 'dc-123',
      user_code: 'ABCD-1234',
      verification_uri: 'https://github.com/login/device',
      expires_in: 1,
      interval: 5,
    });

    renderSignIn();

    fireEvent.click(screen.getByText('Continue with GitHub'));

    await waitFor(
      () => {
        expect(screen.getByText('Code expired')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('shows "Sign in failed" heading on error', async () => {
    mockedRequestDeviceCode.mockRejectedValue(new Error('Network error'));

    renderSignIn();

    fireEvent.click(screen.getByText('Continue with GitHub'));

    await waitFor(() => {
      expect(screen.getByText('Sign in failed')).toBeInTheDocument();
    });
  });

  it('shows error message on error', async () => {
    mockedRequestDeviceCode.mockRejectedValue(new Error('Network error'));

    renderSignIn();

    fireEvent.click(screen.getByText('Continue with GitHub'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('redirects to dashboard when already authenticated', async () => {
    mockedUseAuth.mockReturnValue(authenticatedState);
    renderSignIn();

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
  });
});
