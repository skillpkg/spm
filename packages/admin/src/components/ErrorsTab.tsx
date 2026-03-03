import { useCallback } from 'react';
import { useAuth } from '@spm/web-auth';
import { Badge, Button, Card, StatBox, StatusBadge } from '@spm/ui';
import { getAdminErrors, updateError } from '../lib/api';
import { useAdminData } from '../lib/useAdminData';
import { LoadingState, ErrorState, EmptyState } from './DataState';

const TYPE_COLORS: Record<string, string> = {
  install_fail: 'red',
  publish_fail: 'orange',
  bootstrap_fail: 'yellow',
  search_fail: 'purple',
  link_fail: 'blue',
};

export const ErrorsTab = () => {
  const { token } = useAuth();

  const fetchErrors = useCallback((t: string) => getAdminErrors(t), []);
  const { data, isLoading, error, refetch } = useAdminData(fetchErrors);

  const handleStatusChange = async (id: string, status: string, resolution?: string) => {
    if (!token) return;
    await updateError(token, id, status, resolution);
    refetch();
  };

  if (isLoading) return <LoadingState message="Loading errors..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const errors = data?.errors ?? [];
  const openErrors = errors.filter((e) => e.status === 'open');
  const investigatingCount = errors.filter((e) => e.status === 'investigating').length;
  const totalOccurrences = errors.reduce((sum, e) => sum + e.count, 0);
  const uniqueTypes = [...new Set(errors.map((e) => e.type))];

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <StatBox label="Open errors" value={openErrors.length} color="red" />
        <StatBox label="Investigating" value={investigatingCount} color="blue" />
        <StatBox label="Total occurrences" value={totalOccurrences} color="yellow" />
        <StatBox label="Error types" value={uniqueTypes.length} />
      </div>

      {errors.length === 0 && (
        <EmptyState message="No errors reported yet. Error telemetry will appear here when the CLI sends error reports." />
      )}

      {/* Error cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {errors.map((err) => {
          const typeColor = TYPE_COLORS[err.type] ?? 'text-dim';

          return (
            <Card key={err.id} style={{ padding: '14px 18px' }}>
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <Badge label={err.type.replace('_', ' ')} color={typeColor} />
                  <StatusBadge status={err.status} />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    &times;{err.count} occurrence
                    {err.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {err.last_seen.includes('T') ? err.last_seen.slice(11, 16) : err.last_seen}
                </span>
              </div>

              {/* Error message */}
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '8px 12px',
                  background: 'var(--color-bg)',
                  borderLeft: `3px solid var(--color-${typeColor})`,
                  borderRadius: '0 6px 6px 0',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 10,
                  overflowX: 'auto',
                }}
              >
                {err.message}
              </div>

              {/* Context + actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    gap: 12,
                  }}
                >
                  {err.affected_skill && <span>Skill: {err.affected_skill}</span>}
                  <span>
                    First:{' '}
                    {err.first_seen.includes('T') ? err.first_seen.slice(0, 10) : err.first_seen}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {err.status === 'open' && (
                    <>
                      <Button
                        label="Investigate"
                        color="blue"
                        small
                        onClick={() => handleStatusChange(err.id, 'investigating')}
                      />
                      <Button
                        label="Resolve"
                        color="accent"
                        small
                        onClick={() => handleStatusChange(err.id, 'resolved', 'Resolved')}
                      />
                    </>
                  )}
                  {err.status === 'investigating' && (
                    <>
                      <Button
                        label="Resolve"
                        color="accent"
                        small
                        onClick={() => handleStatusChange(err.id, 'resolved', 'Resolved')}
                      />
                      <Button
                        label="Won't fix"
                        color="text-dim"
                        small
                        onClick={() => handleStatusChange(err.id, 'wontfix', 'Will not fix')}
                      />
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
