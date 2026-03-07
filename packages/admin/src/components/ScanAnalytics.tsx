import { useAuth } from '@spm/web-auth';
import { useQuery } from '@tanstack/react-query';
import { Card, StatBox } from '@spm/ui';
import { adminStatsQuery } from './FlaggedQueue.queries';
import { LoadingState, ErrorState } from './DataState';

export const ScanAnalytics = () => {
  const { token } = useAuth();
  const { data: stats, isLoading, error, refetch } = useQuery(adminStatsQuery(token ?? ''));

  if (isLoading) return <LoadingState message="Loading scan analytics..." />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!stats) return <LoadingState />;

  const totalScans =
    stats.scans.passed + stats.scans.flagged + stats.scans.blocked + stats.scans.manual_approved;
  const passRate = totalScans > 0 ? ((stats.scans.passed / totalScans) * 100).toFixed(1) : '0.0';
  const blockRate = totalScans > 0 ? ((stats.scans.blocked / totalScans) * 100).toFixed(1) : '0.0';
  const holdRate = totalScans > 0 ? ((stats.scans.flagged / totalScans) * 100).toFixed(1) : '0.0';

  const byLayer = stats.scans_by_layer;
  const l1Total = byLayer ? byLayer.l1.passed + byLayer.l1.flagged + byLayer.l1.blocked : 0;
  const l1PassRate =
    byLayer && l1Total > 0 ? `${((byLayer.l1.passed / l1Total) * 100).toFixed(1)}%` : '--';
  const l2Total = byLayer ? byLayer.l2.passed + byLayer.l2.flagged + byLayer.l2.blocked : 0;
  const l2FlagRate =
    byLayer && l2Total > 0 ? `${((byLayer.l2.flagged / l2Total) * 100).toFixed(1)}%` : '--';
  const l3Total = byLayer ? byLayer.l3.passed + byLayer.l3.flagged + byLayer.l3.blocked : 0;
  const l3FlagRate =
    byLayer && l3Total > 0 ? `${((byLayer.l3.flagged / l3Total) * 100).toFixed(1)}%` : '--';
  const partialScans = byLayer ? String(byLayer.partial) : '--';

  return (
    <div>
      {/* Top stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatBox label="Total publishes" value={stats.publishes.total} />
        <StatBox label="Published" value={stats.publishes.published} color="accent" />
        <StatBox label="Blocked" value={stats.publishes.blocked} color="red" />
        <StatBox label="Rejected" value={stats.publishes.rejected} color="yellow" />
        <StatBox label="Scans passed" value={stats.scans.passed} color="accent" />
        <StatBox label="Queue depth" value={stats.queue_depth} color="orange" />
      </div>

      {/* Per-layer stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatBox label="L1 pass rate" value={l1PassRate} color="accent" />
        <StatBox label="L2 flag rate" value={l2FlagRate} color="yellow" />
        <StatBox label="L3 flag rate" value={l3FlagRate} color="yellow" />
        <StatBox label="Partial scans" value={partialScans} color="orange" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Users by trust */}
        <Card style={{ flex: 1, padding: '18px 22px' }}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 14,
            }}
          >
            Users by trust tier
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(stats.users_by_trust).map(([tier, count]) => (
              <div
                key={tier}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                    textTransform: 'capitalize',
                  }}
                >
                  {tier}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--color-text-primary)',
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Totals */}
        <Card style={{ flex: 1, padding: '18px 22px' }}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 14,
            }}
          >
            Registry totals
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                }}
              >
                Total skills
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                }}
              >
                {stats.total_skills}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                }}
              >
                Total users
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  color: 'var(--color-cyan)',
                  fontWeight: 600,
                }}
              >
                {stats.total_users}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                }}
              >
                Total downloads
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  color: 'var(--color-text-primary)',
                  fontWeight: 600,
                }}
              >
                {stats.total_downloads}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                }}
              >
                Open reports
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  color: 'var(--color-yellow)',
                  fontWeight: 600,
                }}
              >
                {stats.open_reports}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Outcome breakdown */}
      {totalScans > 0 && (
        <Card style={{ marginTop: 16, padding: '18px 22px' }}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 14,
            }}
          >
            Scan outcome breakdown
          </div>
          <div
            style={{
              display: 'flex',
              height: 24,
              borderRadius: 6,
              overflow: 'hidden',
              marginBottom: 14,
            }}
          >
            <div
              style={{ width: `${passRate}%`, background: 'var(--color-accent)' }}
              title={`Passed: ${passRate}%`}
            />
            <div
              style={{ width: `${holdRate}%`, background: 'var(--color-yellow)' }}
              title={`Flagged: ${holdRate}%`}
            />
            <div
              style={{ width: `${blockRate}%`, background: 'var(--color-red)' }}
              title={`Blocked: ${blockRate}%`}
            />
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: 'Passed', pct: passRate, color: 'var(--color-accent)' },
              { label: 'Flagged', pct: holdRate, color: 'var(--color-yellow)' },
              { label: 'Blocked', pct: blockRate, color: 'var(--color-red)' },
            ].map((r) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: r.color,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {r.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--color-text-dim)',
                  }}
                >
                  {r.pct}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
