import { useState } from 'react';
import { FLAGGED_QUEUE, SCAN_STATS, TRUST_CONFIG } from '../data/mock';
import { ActionButton, Badge, SectionCard, StatBox, TrustBadge } from './ui';

export const FlaggedQueue = () => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const fpRate =
    SCAN_STATS.held > 0 ? ((SCAN_STATS.falsePositives / SCAN_STATS.held) * 100).toFixed(0) : '0';

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <StatBox label="In queue" value={FLAGGED_QUEUE.length} color="yellow" />
        <StatBox label="Avg review time" value="4.2h" />
        <StatBox label="False positive rate" value={`${fpRate}%`} />
      </div>

      {/* Queue items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {FLAGGED_QUEUE.map((item) => (
          <SectionCard key={item.id}>
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
                <Badge label={`@${item.author}`} color="text-secondary" />
                <TrustBadge tier={item.authorTrust} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {item.age} ago
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
                      f.confidence > 0.8 ? 'rgba(239,68,68,0.1)' : 'rgba(251,191,36,0.1)',
                    color: f.confidence > 0.8 ? 'var(--color-red)' : 'var(--color-yellow)',
                  }}
                >
                  L{f.layer}: {f.type} ({(f.confidence * 100).toFixed(0)}%)
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
                {/* Flagged excerpt */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    Flagged content ({item.lineRef})
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      lineHeight: 1.6,
                      padding: '12px 14px',
                      background: 'var(--color-bg)',
                      border: '1px solid rgba(239,68,68,0.1)',
                      borderLeft: '3px solid var(--color-red)',
                      borderRadius: '0 6px 6px 0',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {item.excerpt}
                  </div>
                </div>

                {/* Flag details */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    Scan details
                  </div>
                  {item.flags.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                        padding: '6px 0',
                        borderBottom:
                          i < item.flags.length - 1 ? '1px solid rgba(26,29,39,0.25)' : 'none',
                      }}
                    >
                      <span style={{ color: 'var(--color-yellow)' }}>Layer {f.layer}</span> &middot;{' '}
                      {f.detail}
                    </div>
                  ))}
                </div>

                {/* Metadata */}
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    marginBottom: 16,
                  }}
                >
                  Size: {item.size} &middot; Files: {item.files} &middot; Submitted:{' '}
                  {item.submitted}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <ActionButton
                    label={`${TRUST_CONFIG.official.checks.charAt(0)} Approve`}
                    color="accent"
                  />
                  <ActionButton label={'\u2717 Reject'} color="red" />
                  <ActionButton label="View full SKILL.md" color="blue" />
                  <ActionButton label="Contact author" color="text-dim" />
                </div>
              </div>
            )}
          </SectionCard>
        ))}
      </div>

      {FLAGGED_QUEUE.length === 0 && (
        <div
          style={{
            padding: '48px 0',
            textAlign: 'center',
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            color: 'var(--color-text-dim)',
          }}
        >
          Queue empty — all skills reviewed
        </div>
      )}
    </div>
  );
};
