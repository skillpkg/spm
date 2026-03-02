import { USER_ERRORS } from '../data/mock';
import { ActionButton, Badge, SectionCard, StatBox, StatusBadge } from './ui';

const TYPE_COLORS: Record<string, string> = {
  install_fail: 'red',
  publish_fail: 'orange',
  bootstrap_fail: 'yellow',
  search_fail: 'purple',
  link_fail: 'blue',
};

export const ErrorsTab = () => {
  const openErrors = USER_ERRORS.filter((e) => e.status === 'open');
  const uniqueTypes = [...new Set(USER_ERRORS.map((e) => e.type))];

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-2.5 mb-4">
        <StatBox label="Open errors" value={openErrors.length} color="red" />
        <StatBox
          label="Investigating"
          value={USER_ERRORS.filter((e) => e.status === 'investigating').length}
          color="blue"
        />
        <StatBox
          label="Total occurrences"
          value={USER_ERRORS.reduce((sum, e) => sum + e.count, 0)}
          color="yellow"
        />
        <StatBox label="Error types" value={uniqueTypes.length} />
      </div>

      {/* Error cards */}
      <div className="flex flex-col gap-2.5">
        {USER_ERRORS.map((err) => {
          const typeColor = TYPE_COLORS[err.type] ?? 'text-dim';

          return (
            <SectionCard key={err.id} className="p-[14px_18px]">
              {/* Header */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Badge label={err.type.replace('_', ' ')} color={typeColor} />
                  <StatusBadge status={err.status} />
                  <span className="font-mono text-xs text-text-muted">
                    &times;{err.count} occurrence
                    {err.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-text-muted whitespace-nowrap">
                  {err.lastSeen.includes('T') ? err.lastSeen.slice(11, 16) : err.lastSeen}
                </span>
              </div>

              {/* Error message */}
              <div
                className={`font-mono text-xs px-3 py-2 bg-bg border border-${typeColor}/10 border-l-[3px] border-l-${typeColor} rounded-r-md text-text-secondary mb-2.5 overflow-x-auto`}
              >
                {err.error}
              </div>

              {/* Context */}
              <div className="flex justify-between items-center">
                <div className="font-mono text-[11px] text-text-muted flex gap-3">
                  {err.user && <span>User: @{err.user}</span>}
                  {err.skill && <span>Skill: {err.skill}</span>}
                  <span>
                    First:{' '}
                    {err.firstSeen.includes('T') ? err.firstSeen.slice(0, 10) : err.firstSeen}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {err.status === 'resolved' || err.status === 'wontfix' ? (
                    <span className="font-sans text-xs text-text-dim">{err.resolution}</span>
                  ) : (
                    <>
                      <ActionButton label="Investigate" color="blue" small />
                      <ActionButton label="Resolve" color="accent" small />
                      <ActionButton label="Won't fix" color="text-dim" small />
                    </>
                  )}
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
};
