import { SCAN_STATS } from '../data/mock';
import { SectionCard, StatBox } from './ui';

export const ScanAnalytics = () => {
  const passRate = ((SCAN_STATS.passed / SCAN_STATS.total) * 100).toFixed(1);
  const blockRate = ((SCAN_STATS.blocked / SCAN_STATS.total) * 100).toFixed(1);
  const holdRate = ((SCAN_STATS.held / SCAN_STATS.total) * 100).toFixed(1);

  const maxPublish = Math.max(...SCAN_STATS.weeklyPublishes);

  return (
    <div>
      {/* Top stats */}
      <div className="flex gap-2.5 mb-5">
        <StatBox label="Total publishes" value={SCAN_STATS.total} />
        <StatBox label="Passed" value={SCAN_STATS.passed} color="accent" />
        <StatBox label="Blocked" value={SCAN_STATS.blocked} color="red" />
        <StatBox label="Held for review" value={SCAN_STATS.held} color="yellow" />
        <StatBox label="False positives" value={SCAN_STATS.falsePositives} color="orange" />
        <StatBox label="Avg scan time" value={SCAN_STATS.avgScanTime} />
      </div>

      {/* Charts row */}
      <div className="flex gap-4">
        {/* Weekly publishes */}
        <SectionCard className="flex-1 p-[18px_22px]">
          <div className="font-sans text-sm font-semibold text-text-primary mb-3.5">
            Weekly publishes
          </div>
          <div className="flex items-end gap-1.5 h-[100px]">
            {SCAN_STATS.weeklyPublishes.map((v, i) => {
              const h = (v / maxPublish) * 80;
              const isLast = i === SCAN_STATS.weeklyPublishes.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="font-mono text-[10px] text-text-muted">{v}</span>
                  <div
                    className={`w-full max-w-[40px] rounded-t-[3px] ${
                      isLast ? 'bg-accent' : 'bg-accent/35'
                    }`}
                    style={{ height: h }}
                  />
                  <span className="font-mono text-[9px] text-text-faint">W{i + 1}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Block rate trend */}
        <SectionCard className="flex-1 p-[18px_22px]">
          <div className="font-sans text-sm font-semibold text-text-primary mb-3.5">
            Block rate (%)
          </div>
          <div className="flex items-end gap-1.5 h-[100px]">
            {SCAN_STATS.blockRate.map((v, i) => {
              const h = (v / 8) * 80;
              const isLast = i === SCAN_STATS.blockRate.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="font-mono text-[10px] text-text-muted">{v}%</span>
                  <div
                    className={`w-full max-w-[40px] rounded-t-[3px] ${
                      isLast ? 'bg-red' : 'bg-red/35'
                    }`}
                    style={{ height: h }}
                  />
                  <span className="font-mono text-[9px] text-text-faint">W{i + 1}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Outcome breakdown */}
      <SectionCard className="mt-4 p-[18px_22px]">
        <div className="font-sans text-sm font-semibold text-text-primary mb-3.5">
          Outcome breakdown
        </div>
        <div className="flex h-6 rounded-md overflow-hidden mb-3.5">
          <div
            className="bg-accent"
            style={{ width: `${passRate}%` }}
            title={`Passed: ${passRate}%`}
          />
          <div
            className="bg-yellow"
            style={{ width: `${holdRate}%` }}
            title={`Held: ${holdRate}%`}
          />
          <div
            className="bg-red"
            style={{ width: `${blockRate}%` }}
            title={`Blocked: ${blockRate}%`}
          />
        </div>
        <div className="flex gap-5">
          {[
            { label: 'Passed', pct: passRate, colorClass: 'bg-accent' },
            { label: 'Held', pct: holdRate, colorClass: 'bg-yellow' },
            { label: 'Blocked', pct: blockRate, colorClass: 'bg-red' },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-sm ${r.colorClass}`} />
              <span className="font-sans text-xs text-text-secondary">{r.label}</span>
              <span className="font-mono text-xs text-text-dim">{r.pct}%</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};
