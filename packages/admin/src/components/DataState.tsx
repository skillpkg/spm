export const LoadingState = ({ message = 'Loading...' }: { message?: string }) => (
  <div
    style={{
      padding: '48px 0',
      textAlign: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      color: 'var(--color-text-muted)',
    }}
  >
    {message}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div
    style={{
      padding: '48px 0',
      textAlign: 'center',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--color-red)',
    }}
  >
    <div style={{ marginBottom: 12 }}>Failed to load: {message}</div>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          padding: '6px 16px',
          borderRadius: 6,
          border: '1px solid var(--color-border-default)',
          background: 'var(--color-bg-hover)',
          color: 'var(--color-text-primary)',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    )}
  </div>
);

export const EmptyState = ({ message }: { message: string }) => (
  <div
    style={{
      padding: '48px 0',
      textAlign: 'center',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      color: 'var(--color-text-dim)',
    }}
  >
    {message}
  </div>
);
