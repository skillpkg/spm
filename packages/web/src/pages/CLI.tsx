import { Text } from '@spm/ui';

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
    <Text
      variant="h1"
      font="sans"
      color="primary"
      as="h1"
      style={{ marginBottom: 4, marginTop: 0 }}
    >
      CLI Reference
    </Text>
    <Text
      variant="body"
      font="sans"
      color="muted"
      as="p"
      style={{ marginBottom: 24, marginTop: 0 }}
    >
      Complete reference for the{' '}
      <Text
        variant="body-sm"
        font="mono"
        color="accent"
        as="code"
        style={{
          background: 'rgba(16,185,129,0.08)',
          padding: '2px 6px',
          borderRadius: 4,
        }}
      >
        spm
      </Text>{' '}
      command-line tool.
    </Text>

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
      <Text variant="body-sm" font="sans" color="muted" as="div" style={{ marginBottom: 8 }}>
        Install
      </Text>
      <Text
        variant="body"
        font="mono"
        color="primary"
        as="div"
        style={{
          padding: '10px 14px',
          background: 'var(--color-bg)',
          borderRadius: 6,
          border: '1px solid var(--color-border-default)',
        }}
      >
        <span style={{ color: 'var(--color-text-muted)' }}>$ </span>npm install -g @skillpkg/cli
      </Text>
    </div>

    {/* Commands */}
    <Text
      variant="h3"
      font="sans"
      color="secondary"
      as="h2"
      style={{ marginBottom: 14, marginTop: 0 }}
    >
      Commands
    </Text>
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
            <Text
              variant="body"
              font="mono"
              weight={600}
              as="code"
              style={{ color: 'var(--color-cyan)' }}
            >
              {cmd.name}
            </Text>
            {cmd.alias && (
              <Text
                variant="label"
                font="mono"
                color="faint"
                as="span"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                alias: {cmd.alias}
              </Text>
            )}
          </div>
          <Text
            variant="body-sm"
            font="sans"
            color="muted"
            as="div"
            style={{ marginBottom: cmd.flags.length ? 10 : 0 }}
          >
            {cmd.desc}
          </Text>
          {cmd.flags.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cmd.flags.map((f) => (
                <div key={f.flag} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <Text
                    variant="caption"
                    font="mono"
                    as="code"
                    style={{ color: 'var(--color-yellow)', minWidth: 180, flexShrink: 0 }}
                  >
                    {f.flag}
                  </Text>
                  <Text variant="caption" font="sans" color="dim" as="span">
                    {f.desc}
                  </Text>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);
