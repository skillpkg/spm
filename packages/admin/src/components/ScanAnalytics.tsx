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
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <StatBox label="Total publishes" value={SCAN_STATS.total} />
        <StatBox label="Passed" value={SCAN_STATS.passed} color="accent" />
        <StatBox label="Blocked" value={SCAN_STATS.blocked} color="red" />
        <StatBox label="Held for review" value={SCAN_STATS.held} color="yellow" />
        <StatBox label="False positives" value={SCAN_STATS.falsePositives} color="orange" />
        <StatBox label="Avg scan time" value={SCAN_STATS.avgScanTime} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Weekly publishes */}
        <SectionCard style={{ flex: 1, padding: '18px 22px' }}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 14,
            }}
          >
            Weekly publishes
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
            {SCAN_STATS.weeklyPublishes.map((v, i) => {
              const h = (v / maxPublish) * 80;
              const isLast = i === SCAN_STATS.weeklyPublishes.length - 1;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {v}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 40,
                      borderRadius: '3px 3px 0 0',
                      height: h,
                      background: isLast ? 'var(--color-accent)' : 'rgba(16,185,129,0.35)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--color-text-faint)',
                    }}
                  >
                    W{i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Block rate trend */}
        <SectionCard style={{ flex: 1, padding: '18px 22px' }}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 14,
            }}
          >
            Block rate (%)
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
            {SCAN_STATS.blockRate.map((v, i) => {
              const h = (v / 8) * 80;
              const isLast = i === SCAN_STATS.blockRate.length - 1;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {v}%
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 40,
                      borderRadius: '3px 3px 0 0',
                      height: h,
                      background: isLast ? 'var(--color-red)' : 'rgba(239,68,68,0.35)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--color-text-faint)',
                    }}
                  >
                    W{i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Outcome breakdown */}
      <SectionCard style={{ marginTop: 16, padding: '18px 22px' }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 14,
          }}
        >
          Outcome breakdown
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
            title={`Held: ${holdRate}%`}
          />
          <div
            style={{ width: `${blockRate}%`, background: 'var(--color-red)' }}
            title={`Blocked: ${blockRate}%`}
          />
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Passed', pct: passRate, color: 'var(--color-accent)' },
            { label: 'Held', pct: holdRate, color: 'var(--color-yellow)' },
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
      </SectionCard>
    </div>
  );
};
