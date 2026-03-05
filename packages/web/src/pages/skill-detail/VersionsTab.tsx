import { type SkillFull } from './types';

export const VersionsTab = ({ skill }: { skill: SkillFull }) => (
  <div>
    {skill.versions?.map((v, i) => (
      <div
        key={v.v}
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          padding: '14px 0',
          borderBottom: i < (skill.versions?.length ?? 0) - 1 ? '1px solid #1a1d2744' : 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: 600,
            minWidth: 60,
            color: i === 0 ? '#10b981' : '#64748b',
          }}
        >
          {v.v}
        </span>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
            }}
          >
            {v.changes}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              marginTop: 4,
            }}
          >
            {v.date}
          </div>
        </div>
        {i === 0 && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(16,185,129,0.08)',
              color: 'var(--color-accent)',
              marginLeft: 'auto',
            }}
          >
            latest
          </span>
        )}
      </div>
    ))}
  </div>
);
