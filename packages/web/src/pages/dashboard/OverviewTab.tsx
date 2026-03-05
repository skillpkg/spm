import { ActivityItem, BarSegment } from '@spm/ui';
import { type Skill, type ActivityEvent, type AgentStat, type TrustTier } from './types';
import { SkillRow } from './SkillRow';
import { SkillsTableHeader } from './SkillsTableHeader';
import { TrustProgress } from './TrustProgress';
import { cardStyle } from './styles';

export interface OverviewTabProps {
  onViewAllSkills: () => void;
  skills: Skill[];
  activity: ActivityEvent[];
  trustTier: TrustTier;
  agents: AgentStat[];
}

export const OverviewTab = ({
  onViewAllSkills,
  skills: skillsList,
  activity,
  trustTier: tier,
  agents,
}: OverviewTabProps) => (
  <div style={{ display: 'flex', gap: 20 }}>
    {/* Main column */}
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Skills */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              margin: 0,
            }}
          >
            Your skills
          </h2>
          <span
            onClick={onViewAllSkills}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--color-accent)',
              cursor: 'pointer',
            }}
          >
            View all &rarr;
          </span>
        </div>
        <div style={cardStyle}>
          <SkillsTableHeader />
          {skillsList.map((s) => (
            <SkillRow key={s.name} skill={s} />
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            marginBottom: 10,
            marginTop: 0,
          }}
        >
          Recent activity
        </h2>
        <div style={{ ...cardStyle, padding: '6px 18px' }}>
          {activity.map((item, i) => (
            <ActivityItem key={i} item={item} />
          ))}
        </div>
      </div>
    </div>

    {/* Sidebar */}
    <aside style={{ width: 240, flexShrink: 0 }}>
      <TrustProgress currentTier={tier} />

      {/* Agent breakdown */}
      <div style={{ ...cardStyle, padding: '18px 20px', marginTop: 14 }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 14,
          }}
        >
          Installs by agent
        </div>
        {/* Stacked bar */}
        <div
          style={{
            display: 'flex',
            height: 28,
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: 14,
          }}
        >
          {agents.map((a) => (
            <BarSegment key={a.agent} pct={a.pct} color={a.color} label={a.agent} />
          ))}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {agents.map((a) => (
            <div
              key={a.agent}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color }} />
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {a.agent}
                </span>
              </div>
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
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ ...cardStyle, padding: '16px 20px', marginTop: 14 }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 10,
          }}
        >
          Quick links
        </div>
        {['Public profile', 'Account settings', 'API tokens', 'Publish guide'].map((label) => (
          <a
            key={label}
            href="#"
            style={{
              display: 'block',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-blue)',
              textDecoration: 'none',
              padding: '4px 0',
            }}
          >
            {label}
          </a>
        ))}
      </div>
    </aside>
  </div>
);
