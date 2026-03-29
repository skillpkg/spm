import { useState } from 'react';
import { CopyButton } from '@spm/ui';

type InstallMethod = 'brew' | 'curl' | 'npm';

const installCommands: Record<InstallMethod, string> = {
  brew: 'brew install skillpkg/tap/spm',
  curl: 'curl -fsSL https://skillpkg.dev/install.sh | sh',
  npm: 'npm i -g @skillpkg/cli',
};

interface InstallTabsProps {
  /** Compact mode hides the copy button and uses smaller text (for footer) */
  compact?: boolean;
}

export const InstallTabs = ({ compact = false }: InstallTabsProps) => {
  const [method, setMethod] = useState<InstallMethod>('brew');

  const tabs: InstallMethod[] = ['brew', 'curl', 'npm'];

  return (
    <div>
      {/* Tab buttons */}
      <div style={{ display: 'flex', gap: 0, marginBottom: compact ? 6 : 8 }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setMethod(tab)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: compact ? 11 : 12,
              padding: compact ? '3px 10px' : '4px 12px',
              background: method === tab ? 'var(--color-accent)' : 'transparent',
              color: method === tab ? 'var(--color-bg)' : 'var(--color-text-muted)',
              border: `1px solid ${method === tab ? 'var(--color-accent)' : 'var(--color-border-default)'}`,
              borderRadius: 0,
              cursor: 'pointer',
              fontWeight: method === tab ? 600 : 400,
              transition: 'all 0.15s',
              ...(tab === 'brew' ? { borderRadius: '4px 0 0 4px' } : {}),
              ...(tab === 'npm' ? { borderRadius: '0 4px 4px 0' } : {}),
              ...(tab !== 'brew' ? { borderLeft: 'none' } : {}),
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Command display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: compact ? 12 : 13,
          padding: compact ? '6px 10px' : '10px 12px',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 6,
          gap: 8,
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>$ </span>
          <span style={{ color: 'var(--color-text-primary)' }}>{installCommands[method]}</span>
        </span>
        {!compact && <CopyButton text={installCommands[method]} />}
      </div>
    </div>
  );
};
