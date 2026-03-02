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
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {USER_ERRORS.map((err) => {
          const typeColor = TYPE_COLORS[err.type] ?? 'text-dim';

          return (
            <SectionCard key={err.id} style={{ padding: '14px 18px' }}>
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
                  {err.lastSeen.includes('T') ? err.lastSeen.slice(11, 16) : err.lastSeen}
                </span>
              </div>

              {/* Error message */}
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '8px 12px',
                  background: 'var(--color-bg)',
                  border: `1px solid color-mix(in srgb, var(--color-${typeColor}) 10%, transparent)`,
                  borderLeft: `3px solid var(--color-${typeColor})`,
                  borderRadius: '0 6px 6px 0',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 10,
                  overflowX: 'auto',
                }}
              >
                {err.error}
              </div>

              {/* Context */}
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
                  {err.user && <span>User: @{err.user}</span>}
                  {err.skill && <span>Skill: {err.skill}</span>}
                  <span>
                    First:{' '}
                    {err.firstSeen.includes('T') ? err.firstSeen.slice(0, 10) : err.firstSeen}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {err.status === 'resolved' || err.status === 'wontfix' ? (
                    <span
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 12,
                        color: 'var(--color-text-dim)',
                      }}
                    >
                      {err.resolution}
                    </span>
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
