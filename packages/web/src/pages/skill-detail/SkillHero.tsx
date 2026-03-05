import { CopyButton, TrustBadge } from '@spm/ui';
import { type SkillFull } from './types';

export const SkillHero = ({ skill }: { skill: SkillFull }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 24,
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 12,
      marginBottom: 24,
    }}
  >
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h1
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--color-cyan)',
            margin: 0,
          }}
        >
          {skill.name}
        </h1>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 15,
            color: 'var(--color-text-faint)',
          }}
        >
          {skill.version}
        </span>
        <TrustBadge tier={skill.trust} size="lg" />
      </div>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          color: 'var(--color-text-secondary)',
          marginBottom: 16,
          lineHeight: 1.6,
          maxWidth: 520,
          marginTop: 0,
        }}
      >
        {skill.desc}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {skill.tags?.map((t) => (
          <span
            key={t}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              padding: '3px 8px',
              borderRadius: 4,
              background: '#111318',
              color: 'var(--color-text-dim)',
              border: '1px solid var(--color-border-default)',
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>

    {/* Install box */}
    <div
      style={{
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 10,
        padding: 16,
        minWidth: 280,
        marginLeft: 24,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          color: 'var(--color-text-dim)',
          marginBottom: 8,
        }}
      >
        Install
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          padding: '10px 12px',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 6,
          marginBottom: 12,
        }}
      >
        <span>
          <span style={{ color: 'var(--color-text-muted)' }}>$ </span>
          <span style={{ color: 'var(--color-text-primary)' }}>spm install {skill.name}</span>
        </span>
        <CopyButton text={`spm install ${skill.name}`} />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          padding: '10px 12px',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 6,
        }}
      >
        <span>
          <span style={{ color: 'var(--color-text-muted)' }}>$ </span>
          <span style={{ color: 'var(--color-text-primary)' }}>spm install -g {skill.name}</span>
        </span>
        <CopyButton text={`spm install -g ${skill.name}`} />
      </div>
    </div>
  </div>
);
