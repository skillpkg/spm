import { Text } from '@spm/ui';

export const Privacy = () => {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px 60px' }}>
      <Text
        variant="h1"
        font="sans"
        color="primary"
        as="h1"
        style={{ marginBottom: 24, marginTop: 0 }}
      >
        Privacy Policy
      </Text>
      <Text
        variant="body-sm"
        font="sans"
        color="muted"
        as="p"
        style={{ marginBottom: 28, marginTop: 0 }}
      >
        Last updated: April 2, 2026
      </Text>

      <H2>Overview</H2>
      <P>
        SPM (Skills Package Manager) is an open-source project that provides a registry for AI agent
        skills. This policy explains what data we collect, how we use it, and your rights.
      </P>

      <H2>What we collect</H2>
      <P>We collect the minimum data necessary to operate the registry:</P>
      <UL>
        <li>
          <strong>GitHub account info</strong> — When you log in via GitHub OAuth, we receive your
          username, email, and avatar URL. We use this to identify you as a publisher and display
          attribution on your skills.
        </li>
        <li>
          <strong>Published skills</strong> — Skill packages you publish, including metadata (name,
          version, description, categories, tags) and the package contents.
        </li>
        <li>
          <strong>Download counts</strong> — We track aggregate download counts per skill for
          trending and analytics. Downloads are deduplicated but not linked to individual users.
        </li>
        <li>
          <strong>Reviews and ratings</strong> — If you leave a review, we store the rating,
          comment, and your username.
        </li>
      </UL>

      <H2>MCP server</H2>
      <P>
        The SPM MCP server (<code style={codeStyle}>@skillpkg/mcp</code>) runs locally on your
        machine and communicates with the SPM registry API. It sends search queries and skill name
        lookups to <code style={codeStyle}>registry.skillpkg.dev</code>. No personal data, file
        contents, or conversation context is sent to the registry — only the specific search or info
        request you make.
      </P>

      <H2>What we don't collect</H2>
      <UL>
        <li>We do not track your browsing activity on skillpkg.dev</li>
        <li>We do not use third-party analytics or advertising trackers</li>
        <li>We do not sell or share your data with third parties</li>
        <li>We do not access your GitHub repositories — only public profile info via OAuth</li>
      </UL>

      <H2>Data storage</H2>
      <P>
        Data is stored on Cloudflare infrastructure (Workers, R2, KV) and Neon Postgres. All
        connections use TLS encryption. Authentication tokens are JWTs stored locally on your
        machine and are never shared.
      </P>

      <H2>Your rights</H2>
      <UL>
        <li>
          <strong>Delete your account</strong> — Contact us to remove your account and associated
          data.
        </li>
        <li>
          <strong>Yank your skills</strong> — You can yank published versions at any time using{' '}
          <code style={codeStyle}>spm yank</code>, which removes them from the registry.
        </li>
        <li>
          <strong>Export your data</strong> — Contact us for a copy of the data we hold about you.
        </li>
      </UL>

      <H2>Open source</H2>
      <P>
        SPM is open source. You can audit exactly what data the CLI and MCP server send by reviewing
        the source code at{' '}
        <a
          href="https://github.com/skillpkg/spm"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-accent)' }}
        >
          github.com/skillpkg/spm
        </a>
        .
      </P>

      <H2>Contact</H2>
      <P>
        For privacy questions or data requests, email{' '}
        <a href="mailto:support@skillpkg.dev" style={{ color: 'var(--color-accent)' }}>
          support@skillpkg.dev
        </a>
        .
      </P>
    </div>
  );
};

// ── Shared mini-components ──

const codeStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  padding: '2px 6px',
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 4,
};

const H2 = ({ children }: { children: React.ReactNode }) => (
  <Text
    variant="h3"
    font="sans"
    color="primary"
    as="h2"
    style={{ marginTop: 28, marginBottom: 10 }}
  >
    {children}
  </Text>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <Text
    variant="body"
    font="sans"
    color="secondary"
    as="p"
    style={{ lineHeight: 1.7, marginBottom: 14, marginTop: 0 }}
  >
    {children}
  </Text>
);

const UL = ({ children }: { children: React.ReactNode }) => (
  <ul
    style={{
      paddingLeft: 20,
      marginBottom: 16,
      color: 'var(--color-text-secondary)',
      lineHeight: 1.8,
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
    }}
  >
    {children}
  </ul>
);
