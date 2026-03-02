import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { mockUser } from './helpers';
import type { ReactNode } from 'react';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../lib/api', () => ({
  whoami: vi.fn(),
  logout: vi.fn(),
}));

import { whoami, logout } from '../lib/api';

const mockedWhoami = vi.mocked(whoami);
const mockedLogout = vi.mocked(logout);

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <AuthProvider>{children}</AuthProvider>
  </MemoryRouter>
);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockedLogout.mockResolvedValue(undefined);
});

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    // Suppress console.error for the expected React error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>,
      });
    }).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });
});

describe('AuthProvider', () => {
  it('starts with isLoading true and user null', () => {
    mockedWhoami.mockReturnValue(new Promise(() => {})); // never resolves
    localStorage.setItem('spm_token', 'tok');

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('sets isLoading false and user null when no saved token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('restores user from saved token when whoami succeeds', async () => {
    localStorage.setItem('spm_token', 'saved_jwt');
    mockedWhoami.mockResolvedValueOnce({ user: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('saved_jwt');
    expect(result.current.isAuthenticated).toBe(true);
    expect(mockedWhoami).toHaveBeenCalledWith('saved_jwt');
  });

  it('clears token from localStorage when whoami fails', async () => {
    localStorage.setItem('spm_token', 'bad_jwt');
    mockedWhoami.mockRejectedValueOnce(new Error('401'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('spm_token')).toBeNull();
  });

  it('signIn stores token and sets user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.signIn('new_jwt', mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('new_jwt');
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('spm_token')).toBe('new_jwt');
  });

  it('signOut clears state, removes localStorage, and navigates to /', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.signIn('jwt_abc', mockUser);
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('spm_token')).toBeNull();
    expect(mockedLogout).toHaveBeenCalledWith('jwt_abc');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('signOut handles case where token is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.signOut();
    });

    expect(mockedLogout).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
