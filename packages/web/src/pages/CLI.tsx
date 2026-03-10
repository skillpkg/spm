const commands = [
  {
    name: 'spm install <skill>',
    alias: 'spm i',
    desc: 'Install a skill into the current project.',
    flags: [
      { flag: '-g, --global', desc: 'Install globally for all agents' },
      { flag: '--save-dev', desc: 'Save as a development dependency' },
      { flag: '--exact', desc: 'Pin to the exact version' },
    ],
  },
  {
    name: 'spm publish',
    desc: 'Publish the current directory as a skill to the registry.',
    flags: [
      { flag: '--dry-run', desc: 'Validate without publishing' },
      { flag: '--tag <tag>', desc: 'Publish with a dist-tag (e.g., beta)' },
      { flag: '--access public', desc: 'Set package access level' },
    ],
  },
  {
    name: 'spm search <query>',
    alias: 'spm s',
    desc: 'Search the registry for skills matching a query.',
    flags: [
      { flag: '--category <cat>', desc: 'Filter by category' },
      { flag: '--trust <tier>', desc: 'Filter by minimum trust tier' },
      { flag: '--limit <n>', desc: 'Max results (default: 20)' },
    ],
  },
  {
    name: 'spm info <skill>',
    desc: 'Show detailed information about a skill.',
    flags: [
      { flag: '--json', desc: 'Output as JSON' },
      { flag: '--versions', desc: 'List all published versions' },
    ],
  },
  {
    name: 'spm init',
    desc: 'Create a new SKILL.md manifest in the current directory.',
    flags: [
      { flag: '--template <name>', desc: 'Use a starter template' },
      { flag: '-y, --yes', desc: 'Accept all defaults' },
    ],
  },
  {
    name: 'spm login',
    desc: 'Authenticate with the registry via GitHub OAuth device flow.',
    flags: [],
  },
  {
    name: 'spm whoami',
    desc: 'Show the currently authenticated user.',
    flags: [],
  },
  {
    name: 'spm list',
    alias: 'spm ls',
    desc: 'List installed skills in the current project.',
    flags: [
      { flag: '-g, --global', desc: 'List globally installed skills' },
      { flag: '--json', desc: 'Output as JSON' },
    ],
  },
  {
    name: 'spm yank <skill@version>',
    desc: 'Yank a specific version from the registry (prevents new installs).',
    flags: [],
  },
];

export const CLI = () => (
  <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px 60px' }}>
    <h1
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 24,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: 4,
        marginTop: 0,
      }}
    >
      CLI Reference
    </h1>
    <p
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        color: 'var(--color-text-muted)',
        marginBottom: 24,
        marginTop: 0,
      }}
    >
      Complete reference for the{' '}
      <code
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: 'var(--color-accent)',
          background: 'rgba(16,185,129,0.08)',
          padding: '2px 6px',
          borderRadius: 4,
        }}
      >
        spm
      </code>{' '}
      command-line tool.
    </p>

    {/* Install */}
    <div
      style={{
        padding: '16px 18px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 10,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--color-text-muted)',
          marginBottom: 8,
        }}
      >
        Install
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          color: 'var(--color-text-primary)',
          padding: '10px 14px',
          background: 'var(--color-bg)',
          borderRadius: 6,
          border: '1px solid var(--color-border-default)',
        }}
      >
        <span style={{ color: 'var(--color-text-muted)' }}>$ </span>npm install -g @skillpkg/cli
      </div>
    </div>

    {/* Commands */}
    <h2
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
        marginBottom: 14,
        marginTop: 0,
      }}
    >
      Commands
    </h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {commands.map((cmd) => (
        <div
          key={cmd.name}
          style={{
            padding: '16px 18px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <code
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-cyan)',
              }}
            >
              {cmd.name}
            </code>
            {cmd.alias && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-text-faint)',
                  background: 'rgba(255,255,255,0.04)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                alias: {cmd.alias}
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-text-muted)',
              marginBottom: cmd.flags.length ? 10 : 0,
            }}
          >
            {cmd.desc}
          </div>
          {cmd.flags.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cmd.flags.map((f) => (
                <div key={f.flag} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <code
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-yellow)',
                      minWidth: 180,
                      flexShrink: 0,
                    }}
                  >
                    {f.flag}
                  </code>
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      color: 'var(--color-text-dim)',
                    }}
                  >
                    {f.desc}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);
