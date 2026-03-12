import { Text } from '@spm/ui';

export const LoadingState = ({ message = 'Loading...' }: { message?: string }) => (
  <div
    style={{
      padding: '48px 0',
      textAlign: 'center',
    }}
  >
    <Text variant="body" font="mono" color="muted">
      {message}
    </Text>
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div
    style={{
      padding: '48px 0',
      textAlign: 'center',
    }}
  >
    <Text variant="body" as="div" style={{ color: 'var(--color-red)', marginBottom: 12 }}>
      Failed to load: {message}
    </Text>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          padding: '6px 16px',
          borderRadius: 6,
          border: '1px solid var(--color-border-default)',
          background: 'var(--color-bg-hover)',
          cursor: 'pointer',
        }}
      >
        <Text variant="body-sm" color="primary">
          Retry
        </Text>
      </button>
    )}
  </div>
);

export const EmptyState = ({ message }: { message: string }) => (
  <div
    style={{
      padding: '48px 0',
      textAlign: 'center',
    }}
  >
    <Text variant="h4" as="div" color="dim" style={{ fontWeight: 400 }}>
      {message}
    </Text>
  </div>
);
