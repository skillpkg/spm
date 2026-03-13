import { useAuth } from '@spm/web-auth';
import { useQuery } from '@tanstack/react-query';
import { PriorityDot, StatBox, StatusBadge, Text, type Priority } from '@spm/ui';
import { LegacyButton as Button, LegacyCard as Card } from '@spm/ui/shadcn';
import { updateReport } from '../lib/api';
import { reportsQuery } from './ReportsTab.queries';
import { LoadingState, ErrorState, EmptyState } from './DataState';

export const ReportsTab = () => {
  const { token } = useAuth();

  const { data, isLoading, error, refetch } = useQuery(reportsQuery(token ?? ''));

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
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

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
                <Text
                  variant="body"
                  font="mono"
                  weight={500}
                  style={{ color: 'var(--color-cyan)' }}
                >
                  {report.skill}
                </Text>
                <StatusBadge status={report.status} />
              </div>
              <Text variant="label" font="mono" color="muted">
                {report.created_at.slice(0, 10)}
              </Text>
            </div>
            <Text
              variant="body-sm"
              as="p"
              color="secondary"
              style={{ marginBottom: 10, lineHeight: 1.625, marginTop: 0 }}
            >
              {report.reason}
            </Text>
            {report.resolution && (
              <Text
                variant="caption"
                as="p"
                color="dim"
                style={{ marginBottom: 10, marginTop: 0, fontStyle: 'italic' }}
              >
                Resolution: {report.resolution}
              </Text>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text variant="caption" color="muted">
                Reported by {report.reporter ? `@${report.reporter}` : 'anonymous'}
              </Text>
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
