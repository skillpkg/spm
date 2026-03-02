import { REPORTS } from '../data/mock';
import { ActionButton, PriorityDot, SectionCard, StatBox, StatusBadge } from './ui';

export const ReportsTab = () => {
  const openCount = REPORTS.filter((r) => r.status === 'open').length;

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-2.5 mb-4">
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
      <div className="flex flex-col gap-2.5">
        {REPORTS.map((report) => (
          <SectionCard key={report.id} className="p-[14px_18px]">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2.5">
                <PriorityDot priority={report.priority} />
                <span className="font-mono text-sm text-cyan font-medium">{report.skill}</span>
                <StatusBadge status={report.status} />
              </div>
              <span className="font-mono text-[11px] text-text-muted">{report.date}</span>
            </div>
            <p className="font-sans text-[13px] text-text-secondary mb-2.5 leading-relaxed">
              {report.reason}
            </p>
            <div className="flex justify-between items-center">
              <span className="font-sans text-xs text-text-muted">
                Reported by @{report.reporter}
              </span>
              <div className="flex gap-1.5">
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
