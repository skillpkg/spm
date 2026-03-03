import { useCallback } from 'react';
import { useAuth } from '@spm/web-auth';
import { Button, Card, PriorityDot, StatBox, StatusBadge, type Priority } from '@spm/ui';
import { getAdminReports, updateReport } from '../lib/api';
import { useAdminData } from '../lib/useAdminData';
import { LoadingState, ErrorState, EmptyState } from './DataState';

export const ReportsTab = () => {
  const { token } = useAuth();

  const fetchReports = useCallback((t: string) => getAdminReports(t), []);
  const { data, isLoading, error, refetch } = useAdminData(fetchReports);

  const handleStatusChange = async (
    id: string,
    status: string,
    resolution?: string,
    actionTaken?: string,
  ) => {
    if (!token) return;
    await updateReport(token, id, status, resolution, actionTaken);
    refetch();
  };

  if (isLoading) return <LoadingState message="Loading reports..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const reports = data?.results ?? [];
  const openCount = reports.filter((r) => r.status === 'open').length;
  const investigatingCount = reports.filter((r) => r.status === 'investigating').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <StatBox label="Open reports" value={openCount} color="yellow" />
        <StatBox label="Investigating" value={investigatingCount} color="blue" />
        <StatBox label="Resolved" value={resolvedCount} color="accent" />
      </div>

      {/* Report cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reports.map((report) => (
          <Card key={report.id} style={{ padding: '14px 18px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PriorityDot priority={report.priority as Priority} />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    color: 'var(--color-cyan)',
                    fontWeight: 500,
                  }}
                >
                  {report.skill}
                </span>
                <StatusBadge status={report.status} />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                }}
              >
                {report.created_at.slice(0, 10)}
              </span>
            </div>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                marginBottom: 10,
                lineHeight: 1.625,
                marginTop: 0,
              }}
            >
              {report.reason}
            </p>
            {report.resolution && (
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: 'var(--color-text-dim)',
                  marginBottom: 10,
                  marginTop: 0,
                  fontStyle: 'italic',
                }}
              >
                Resolution: {report.resolution}
              </p>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                }}
              >
                Reported by {report.reporter ? `@${report.reporter}` : 'anonymous'}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {report.status === 'open' && (
                  <>
                    <Button
                      label="Investigate"
                      color="blue"
                      small
                      onClick={() => handleStatusChange(report.id, 'investigating')}
                    />
                    <Button
                      label="Dismiss"
                      color="text-dim"
                      small
                      onClick={() =>
                        handleStatusChange(report.id, 'dismissed', 'Dismissed by admin')
                      }
                    />
                  </>
                )}
                {report.status === 'investigating' && (
                  <>
                    <Button
                      label="Resolve"
                      color="accent"
                      small
                      onClick={() => handleStatusChange(report.id, 'resolved', 'Resolved by admin')}
                    />
                    <Button
                      label="Dismiss"
                      color="text-dim"
                      small
                      onClick={() =>
                        handleStatusChange(report.id, 'dismissed', 'Dismissed by admin')
                      }
                    />
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {reports.length === 0 && <EmptyState message="No reports found" />}
    </div>
  );
};
