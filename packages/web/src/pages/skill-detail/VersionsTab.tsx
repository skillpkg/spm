import { Text } from '@spm/ui';
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
        <Text
          variant="body"
          font="mono"
          weight={600}
          as="span"
          style={{ minWidth: 60, color: i === 0 ? '#10b981' : '#64748b' }}
        >
          {v.v}
        </Text>
        <div>
          <Text variant="body-sm" font="sans" color="secondary" as="div">
            {v.changes}
          </Text>
          <Text variant="label" font="mono" color="muted" as="div" style={{ marginTop: 4 }}>
            {v.date}
          </Text>
        </div>
        {i === 0 && (
          <Text
            variant="tiny"
            font="mono"
            color="accent"
            as="span"
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(16,185,129,0.08)',
              marginLeft: 'auto',
            }}
          >
            latest
          </Text>
        )}
      </div>
    ))}
  </div>
);
