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
      <div className="flex gap-2.5 mb-4">
        <StatBox label="In queue" value={FLAGGED_QUEUE.length} color="yellow" />
        <StatBox label="Avg review time" value="4.2h" />
        <StatBox label="False positive rate" value={`${fpRate}%`} />
      </div>

      {/* Queue items */}
      <div className="flex flex-col gap-3">
        {FLAGGED_QUEUE.map((item) => (
          <SectionCard key={item.id}>
            {/* Header */}
            <div
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              className="flex justify-between items-center px-[18px] py-3.5 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[15px] text-cyan font-semibold">{item.skill}</span>
                <span className="font-mono text-xs text-text-faint">{item.version}</span>
                <Badge label={`@${item.author}`} color="text-secondary" />
                <TrustBadge tier={item.authorTrust} />
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-text-muted">{item.age} ago</span>
                <span className="font-mono text-[11px] text-text-faint">
                  {expanded === item.id ? '\u25B2' : '\u25BC'}
                </span>
              </div>
            </div>

            {/* Flags summary */}
            <div className="flex gap-2 px-[18px] pb-3 flex-wrap">
              {item.flags.map((f, i) => (
                <span
                  key={i}
                  className={`font-mono text-[11px] px-2.5 py-0.5 rounded ${
                    f.confidence > 0.8 ? 'bg-red/10 text-red' : 'bg-yellow/10 text-yellow'
                  }`}
                >
                  L{f.layer}: {f.type} ({(f.confidence * 100).toFixed(0)}%)
                </span>
              ))}
            </div>

            {/* Expanded detail */}
            {expanded === item.id && (
              <div className="border-t border-border-default px-[18px] py-4">
                {/* Flagged excerpt */}
                <div className="mb-4">
                  <div className="font-sans text-xs text-text-muted mb-1.5">
                    Flagged content ({item.lineRef})
                  </div>
                  <div className="font-mono text-xs leading-relaxed px-3.5 py-3 bg-bg border border-red/10 border-l-[3px] border-l-red rounded-r-md text-text-secondary">
                    {item.excerpt}
                  </div>
                </div>

                {/* Flag details */}
                <div className="mb-4">
                  <div className="font-sans text-xs text-text-muted mb-1.5">Scan details</div>
                  {item.flags.map((f, i) => (
                    <div
                      key={i}
                      className={`font-mono text-xs text-text-secondary py-1.5 ${
                        i < item.flags.length - 1 ? 'border-b border-border-default/25' : ''
                      }`}
                    >
                      <span className="text-yellow">Layer {f.layer}</span> &middot; {f.detail}
                    </div>
                  ))}
                </div>

                {/* Metadata */}
                <div className="font-mono text-[11px] text-text-muted mb-4">
                  Size: {item.size} &middot; Files: {item.files} &middot; Submitted:{' '}
                  {item.submitted}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
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
        <div className="py-12 text-center font-sans text-[15px] text-text-dim">
          Queue empty — all skills reviewed
        </div>
      )}
    </div>
  );
};
