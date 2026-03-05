import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { whoami, logout as apiLogout, type AuthUser } from './api';

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const DEFAULT_TOKEN_KEY = 'spm_token';

export interface AuthProviderProps {
  children: ReactNode;
  storageKey?: string;
}

export const AuthProvider = ({ children, storageKey = DEFAULT_TOKEN_KEY }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for token passed via URL hash (cross-subdomain auth)
    const hash = window.location.hash;
    if (hash.startsWith('#token=')) {
      const hashToken = hash.slice(7);
      localStorage.setItem(storageKey, hashToken);
      window.history.replaceState(null, '', window.location.pathname);
    }

    const savedToken = localStorage.getItem(storageKey);
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    whoami(savedToken)
      .then((profile) => {
        // Use refreshed token from whoami if available (keeps claims in sync with DB)
        const activeToken = profile.token ?? savedToken;
        if (profile.token) {
          localStorage.setItem(storageKey, activeToken);
        }
        setToken(activeToken);
        setUser(profile.user);
      })
      .catch(() => {
        localStorage.removeItem(storageKey);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [storageKey]);

  const signIn = useCallback(
    (newToken: string, newUser: AuthUser) => {
      localStorage.setItem(storageKey, newToken);
      setToken(newToken);
      setUser(newUser);
    },
    [storageKey],
  );

  const signOut = useCallback(() => {
    if (token) {
      apiLogout(token).catch(() => {});
    }
    localStorage.removeItem(storageKey);
    setToken(null);
    setUser(null);
    navigate('/');
  }, [token, navigate, storageKey]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        isAdmin: !!user?.is_admin,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
