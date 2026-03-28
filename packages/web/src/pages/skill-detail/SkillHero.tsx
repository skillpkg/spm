import { Link } from 'react-router-dom';
import { CopyButton, TrustBadge, Text } from '@spm/ui';
import { LegacyBadge as Badge } from '@spm/ui/shadcn';
import { type SkillFull } from './types';

export const SkillHero = ({ skill }: { skill: SkillFull }) => (
  <div
    className="spm-skill-hero"
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
    <div style={{ flex: 1, minWidth: 0 }}>
      <Text
        variant="h1"
        font="mono"
        as="h1"
        style={{
          fontSize: 26,
          color: 'var(--color-cyan)',
          margin: 0,
          marginBottom: 4,
          wordBreak: 'break-word',
        }}
      >
        {skill.name}
      </Text>
      <Text variant="body-sm" color="primary" as="div" style={{ marginBottom: 8 }}>
        <span style={{ color: 'var(--color-text-faint)' }}>by </span>
        {skill.authors.map((a, i) => (
          <span key={a.username}>
            {i > 0 && ', '}
            <Link
              to={`/authors/${a.username}`}
              style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}
            >
              @{a.username}
            </Link>
          </span>
        ))}
      </Text>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <Text variant="h4" font="mono" color="accent" as="span">
          v{skill.version}
        </Text>
        <TrustBadge tier={skill.trust} size="lg" />
        {skill.importedFrom && (
          <a
            href={skill.importedFrom}
            target="_blank"
            rel="noopener noreferrer"
            title={`Imported from ${skill.importedFrom}`}
            style={{ textDecoration: 'none' }}
          >
            <Badge label="Imported ↗" color="#818cf8" />
          </a>
        )}
      </div>
      <Text
        variant="h4"
        font="sans"
        color="secondary"
        as="p"
        style={{ marginBottom: 16, lineHeight: 1.6, maxWidth: 520, marginTop: 0 }}
      >
        {skill.desc}
      </Text>
      {skill.categories.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {skill.categories.map((cat) => (
            <Link
              key={cat}
              to={`/search?category=${encodeURIComponent(cat)}`}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 4,
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              {cat}
            </Link>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {skill.tags?.map((t) => (
          <Text
            key={t}
            variant="label"
            font="mono"
            color="dim"
            as="span"
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              background: '#111318',
              border: '1px solid var(--color-border-default)',
            }}
          >
            {t}
          </Text>
        ))}
      </div>
      {/* Requires section — show dependency badges from manifest */}
      {(skill.dependencies.pip.length > 0 ||
        skill.dependencies.system.length > 0 ||
        skill.dependencies.skills.length > 0) && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text variant="caption" font="sans" color="dim" as="span" style={{ marginRight: 2 }}>
            Requires:
          </Text>
          {skill.dependencies.pip.map((dep) => (
            <Text
              key={`pip-${dep}`}
              variant="label"
              font="mono"
              as="span"
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: '#60a5fa',
                fontSize: 11,
              }}
            >
              {dep}
            </Text>
          ))}
          {skill.dependencies.system.map((dep) => (
            <Text
              key={`sys-${dep}`}
              variant="label"
              font="mono"
              as="span"
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                color: '#a78bfa',
                fontSize: 11,
              }}
            >
              {dep}
            </Text>
          ))}
          {skill.dependencies.skills.map((dep) => (
            <Link
              key={`skill-${dep}`}
              to={`/skills/${dep}`}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                textDecoration: 'none',
              }}
            >
              {dep}
            </Link>
          ))}
        </div>
      )}
    </div>

    {/* Install box */}
    <div
      className="spm-skill-hero-install"
      style={{
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 10,
        padding: 16,
        minWidth: 280,
        marginLeft: 24,
      }}
    >
      <Text variant="caption" font="sans" color="dim" as="div" style={{ marginBottom: 8 }}>
        Install
      </Text>
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
