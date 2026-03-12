import { Link } from 'react-router-dom';
import { Text } from '@spm/ui';

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
    <Text
      variant="h1"
      font="sans"
      color="primary"
      as="h1"
      style={{ marginBottom: 4, marginTop: 0 }}
    >
      Documentation
    </Text>
    <Text
      variant="body"
      font="sans"
      color="muted"
      as="p"
      style={{ marginBottom: 32, marginTop: 0 }}
    >
      Everything you need to know about the Skills Package Manager.
    </Text>

    {sections.map((section) => (
      <div key={section.title} style={{ marginBottom: 32 }}>
        <Text
          variant="h3"
          font="sans"
          color="secondary"
          as="h2"
          style={{ marginBottom: 12, marginTop: 0 }}
        >
          {section.title}
        </Text>
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
              <Text
                variant="body"
                font="sans"
                color="primary"
                weight={500}
                as="div"
                style={{ marginBottom: 4 }}
              >
                {item.label}
              </Text>
              <Text
                variant="body-sm"
                font="sans"
                color="muted"
                as="div"
                style={{ lineHeight: 1.5 }}
              >
                {item.desc}
              </Text>
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
      <Text
        variant="body"
        font="sans"
        color="primary"
        weight={500}
        as="div"
        style={{ marginBottom: 4 }}
      >
        Can&apos;t find what you need?
      </Text>
      <Text variant="body-sm" font="sans" color="muted" as="div">
        Check out the{' '}
        <Link to="/cli" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
          CLI reference
        </Link>{' '}
        or open an issue on{' '}
        <a
          href="https://github.com/almog27/spm/issues"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
        >
          GitHub
        </a>
        .
      </Text>
    </div>
  </div>
);
