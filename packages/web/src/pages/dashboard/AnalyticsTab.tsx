import { type Author, type Skill, type WeeklyData, type AgentStat } from './types';
import { cardStyle, sectionTitle } from './styles';

export interface AnalyticsTabProps {
  trend: WeeklyData[];
  skills: Skill[];
  author: Author;
  agents: AgentStat[];
}

export const AnalyticsTab = ({
  trend,
  skills: skillsList,
  author: authorData,
  agents,
}: AnalyticsTabProps) => {
  const maxDownloads = Math.max(...trend.map((d) => d.downloads));

  return (
    <div>
      {/* Weekly downloads chart */}
      <div style={{ ...cardStyle, padding: '20px 24px', marginBottom: 20 }}>
        <div style={sectionTitle}>Weekly downloads</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
          {trend.map((w, i) => {
            const barHeight = (w.downloads / maxDownloads) * 100;
            const isLast = i === trend.length - 1;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {(w.downloads / 1000).toFixed(1)}k
                </span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 48,
                    borderRadius: '4px 4px 0 0',
                    height: barHeight,
                    background: isLast
                      ? 'linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-dim) 100%)'
                      : 'rgba(16,185,129,0.19)',
                    transition: 'all 0.3s',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {w.week.split(' ')[1]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-skill breakdown */}
      <div style={{ ...cardStyle, padding: '20px 24px', marginBottom: 20 }}>
        <div style={sectionTitle}>Downloads by skill</div>
        {skillsList.map((skill) => {
          const pct = Math.round((skill.downloads / (authorData.totalDownloads || 1)) * 100);
          return (
            <div key={skill.name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--color-cyan)',
                  }}
                >
                  {skill.name}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {(skill.downloads / 1000).toFixed(1)}k ({pct}%)
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 6,
                  background: 'rgba(16,185,129,0.1)',
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: 'var(--color-accent)',
                    borderRadius: 2,
                    width: `${pct}%`,
                    transition: 'all 0.4s',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent breakdown (bigger version) */}
      <div style={{ ...cardStyle, padding: '20px 24px' }}>
        <div style={sectionTitle}>Installs by agent platform</div>
        {agents.map((a) => (
          <div key={a.agent} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {a.agent}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-text-dim)',
                }}
              >
                {a.pct}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                borderRadius: 2,
                background: `color-mix(in srgb, ${a.color} 12%, transparent)`,
              }}
            >
              <div
                style={{ height: '100%', borderRadius: 2, width: `${a.pct}%`, background: a.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
