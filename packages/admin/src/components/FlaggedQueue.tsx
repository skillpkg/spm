import { useState, useCallback } from 'react';
import { useAuth } from '@spm/web-auth';
import { Badge, Button, Card, StatBox, TrustBadge } from '@spm/ui';
import {
  getQueue,
  approveQueueItem,
  rejectQueueItem,
  getAdminStats,
  type QueueItem,
} from '../lib/api';
import { useAdminData } from '../lib/useAdminData';
import { LoadingState, ErrorState, EmptyState } from './DataState';
import type { TrustTier } from '@spm/ui';

export const FlaggedQueue = () => {
  const { token } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchQueue = useCallback((t: string) => getQueue(t), []);
  const fetchStats = useCallback((t: string) => getAdminStats(t), []);

  const { data: queueData, isLoading, error, refetch } = useAdminData(fetchQueue);
  const { data: stats } = useAdminData(fetchStats);

  const handleApprove = async (item: QueueItem) => {
    if (!token) return;
    await approveQueueItem(token, item.id, 'Approved via admin panel');
    refetch();
  };

  const handleReject = async (item: QueueItem) => {
    if (!token) return;
    await rejectQueueItem(token, item.id, 'Rejected via admin panel');
    refetch();
  };

  if (isLoading) return <LoadingState message="Loading review queue..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const queue = queueData?.queue ?? [];

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <StatBox label="In queue" value={stats?.queue_depth ?? queue.length} color="yellow" />
        <StatBox label="Open reports" value={stats?.open_reports ?? 0} />
        <StatBox label="Total scans blocked" value={stats?.scans.blocked ?? 0} color="red" />
      </div>

      {/* Queue items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {queue.map((item) => {
          const trustTier = (item.author.trust_tier || 'registered') as TrustTier;

          return (
            <Card key={item.id}>
              {/* Header */}
              <div
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 15,
                      color: 'var(--color-cyan)',
                      fontWeight: 600,
                    }}
                  >
                    {item.skill}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-faint)',
                    }}
                  >
                    {item.version}
                  </span>
                  <Badge label={`@${item.author.username}`} color="text-secondary" />
                  <TrustBadge tier={trustTier} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {new Date(item.submitted_at).toLocaleDateString()}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--color-text-faint)',
                    }}
                  >
                    {expanded === item.id ? '\u25B2' : '\u25BC'}
                  </span>
                </div>
              </div>

              {/* Flags summary */}
              <div style={{ display: 'flex', gap: 8, padding: '0 18px 12px', flexWrap: 'wrap' }}>
                {item.flags.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      padding: '2px 10px',
                      borderRadius: 4,
                      backgroundColor:
                        (f.confidence ?? 0) > 0.8 ? 'rgba(239,68,68,0.1)' : 'rgba(251,191,36,0.1)',
                      color: (f.confidence ?? 0) > 0.8 ? 'var(--color-red)' : 'var(--color-yellow)',
                    }}
                  >
                    L{f.layer}: {f.type} ({((f.confidence ?? 0) * 100).toFixed(0)}%)
                  </span>
                ))}
              </div>

              {/* Expanded detail */}
              {expanded === item.id && (
                <div
                  style={{
                    borderTop: '1px solid var(--color-border-default)',
                    padding: '16px 18px',
                  }}
                >
                  {/* Metadata */}
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--color-text-muted)',
                      marginBottom: 16,
                    }}
                  >
                    {item.size_bytes != null && (
                      <>Size: {(item.size_bytes / 1024).toFixed(0)} KB &middot; </>
                    )}
                    Submitted: {item.submitted_at}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button label="Approve" color="accent" onClick={() => handleApprove(item)} />
                    <Button label="Reject" color="red" onClick={() => handleReject(item)} />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {queue.length === 0 && <EmptyState message="Queue empty -- all skills reviewed" />}
    </div>
  );
};
