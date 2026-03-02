import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Getting Started',
    items: [
      {
        label: 'What is SPM?',
        desc: 'An overview of the Skills Package Manager and how it works with AI agents.',
      },
      { label: 'Installation', desc: 'Install the CLI globally and configure your environment.' },
      { label: 'Your first skill', desc: 'Create, test, and publish a skill in under 5 minutes.' },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      {
        label: 'Skills',
        desc: "What skills are, how they're structured, and the SKILL.md manifest format.",
      },
      { label: 'Trust tiers', desc: 'How the trust system works — from unverified to official.' },
      {
        label: 'Content security',
        desc: 'The 3-layer scanning pipeline that protects the registry.',
      },
      { label: 'Categories', desc: 'Browse and organize skills by category.' },
    ],
  },
  {
    title: 'Guides',
    items: [
      {
        label: 'Publishing skills',
        desc: 'Step-by-step guide to publishing and versioning your skills.',
      },
      {
        label: 'Installing skills',
        desc: 'Install skills globally or per-project, pin versions, and manage dependencies.',
      },
      {
        label: 'Authoring best practices',
        desc: 'Write skills that are secure, discoverable, and well-documented.',
      },
      { label: 'Agent integration', desc: 'How agents discover and use skills from the registry.' },
    ],
  },
];

export const Docs = () => (
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
      Documentation
    </h1>
    <p
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        color: 'var(--color-text-muted)',
        marginBottom: 32,
        marginTop: 0,
      }}
    >
      Everything you need to know about the Skills Package Manager.
    </p>

    {sections.map((section) => (
      <div key={section.title} style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            marginBottom: 12,
            marginTop: 0,
          }}
        >
          {section.title}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {section.items.map((item) => (
            <div
              key={item.label}
              style={{
                padding: '14px 18px',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  marginBottom: 4,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.5,
                }}
              >
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}

    <div
      style={{
        padding: '20px 18px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          marginBottom: 4,
        }}
      >
        Can&apos;t find what you need?
      </div>
      <div
        style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-muted)' }}
      >
        Check out the{' '}
        <Link to="/cli" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
          CLI reference
        </Link>{' '}
        or open an issue on <span style={{ color: 'var(--color-blue)' }}>GitHub</span>.
      </div>
    </div>
  </div>
);
