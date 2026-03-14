import { Link } from 'react-router-dom';
import { Text } from '@spm/ui';
import { docSections } from '../data/docSections';

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

    {docSections.map((section) => (
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
            <Link
              key={item.label}
              to={`/docs/${item.slug}`}
              style={{
                padding: '14px 18px',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 10,
                textDecoration: 'none',
                display: 'block',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'var(--color-border-hover)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'var(--color-border-default)')
              }
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
            </Link>
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
          href="https://github.com/skillpkg/spm/issues"
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
