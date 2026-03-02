import { REPORTS } from '../data/mock';
import { ActionButton, PriorityDot, SectionCard, StatBox, StatusBadge } from './ui';

export const ReportsTab = () => {
  const openCount = REPORTS.filter((r) => r.status === 'open').length;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <StatBox label="Open reports" value={openCount} color="yellow" />
        <StatBox
          label="Investigating"
          value={REPORTS.filter((r) => r.status === 'investigating').length}
          color="blue"
        />
        <StatBox
          label="Resolved this week"
          value={REPORTS.filter((r) => r.status === 'resolved').length}
          color="accent"
        />
      </div>

      {/* Report cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {REPORTS.map((report) => (
          <SectionCard key={report.id} style={{ padding: '14px 18px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PriorityDot priority={report.priority} />
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
                {report.date}
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
                Reported by @{report.reporter}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <ActionButton label="Investigate" color="blue" small />
                <ActionButton label="Dismiss" color="text-dim" small />
                <ActionButton label="Yank skill" color="red" small />
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
};
