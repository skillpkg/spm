import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@spm/web-auth';
import { Text } from '@spm/ui';
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
          background: 'var(--color-bg)',
        }}
      >
        <Text variant="body" font="mono" color="muted">
          Loading...
        </Text>
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
          background: 'var(--color-bg)',
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
        <Text variant="h2" as="h1" style={{ fontSize: 22, margin: 0 }}>
          Access Denied
        </Text>
        <Text
          variant="body"
          as="p"
          color="muted"
          style={{ margin: 0, textAlign: 'center', maxWidth: 360 }}
        >
          You do not have admin privileges. Contact an administrator if you believe this is an
          error.
        </Text>
        <button
          onClick={signOut}
          style={{
            marginTop: 8,
            padding: '10px 24px',
            borderRadius: 8,
            border: '1px solid var(--color-border-default)',
            background: 'var(--color-bg-hover)',
            cursor: 'pointer',
          }}
        >
          <Text variant="body" color="primary" weight={500}>
            Sign out
          </Text>
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
