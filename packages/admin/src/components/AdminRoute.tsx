import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@spm/web-auth';
import type { ReactNode } from 'react';

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isAdmin, isLoading, signOut } = useAuth();
  const location = useLocation();

  // Skip auth in development for local review (not during tests)
  if (import.meta.env.DEV && !import.meta.env.VITEST) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          color: 'var(--color-text-muted)',
          background: 'var(--color-bg)',
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'var(--font-sans)',
          background: 'var(--color-bg)',
          color: 'var(--color-text-primary)',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}
        >
          &#x1F6AB;
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: 0,
          }}
        >
          Access Denied
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'var(--color-text-muted)',
            margin: 0,
            textAlign: 'center',
            maxWidth: 360,
          }}
        >
          You do not have admin privileges. Contact an administrator if you believe this is an
          error.
        </p>
        <button
          onClick={signOut}
          style={{
            marginTop: 8,
            padding: '10px 24px',
            borderRadius: 8,
            border: '1px solid var(--color-border-default)',
            background: 'var(--color-bg-hover)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
