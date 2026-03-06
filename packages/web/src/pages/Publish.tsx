const steps = [
  {
    step: '1',
    title: 'Create your skill',
    content:
      'Initialize a new skill with spm init, which scaffolds a SKILL.md manifest and directory structure.',
    code: '$ spm init my-skill\n$ cd my-skill',
  },
  {
    step: '2',
    title: 'Write SKILL.md',
    content:
      "Define your skill's metadata, instructions, and configuration in the SKILL.md manifest file.",
    code: `---
name: my-skill
version: 1.0.0
description: A brief description
author: your-username
categories: [code-quality, testing]
tags: [typescript, testing]
---

# My Skill

Instructions for the agent go here...`,
  },
  {
    step: '3',
    title: 'Test locally',
    content: 'Validate your skill passes all checks before publishing.',
    code: '$ spm publish --dry-run',
  },
  {
    step: '4',
    title: 'Authenticate',
    content: 'Log in with your GitHub account using the device flow.',
    code: '$ spm login',
  },
  {
    step: '5',
    title: 'Publish',
    content:
      'Push your skill to the registry. It will be security-scanned and signed with Sigstore automatically.',
    code: '$ spm publish',
  },
];

const guidelines = [
  'Keep skills focused — one skill, one purpose',
  'Write clear, specific instructions in SKILL.md',
  'Include examples of expected input/output',
  'Tag your skill accurately for discoverability',
  'Use semantic versioning (major.minor.patch)',
  "Don't include secrets, API keys, or credentials",
  'Test with multiple agent platforms if possible',
];

export const Publish = () => (
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
      Publish a Skill
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
      Share your skill with the community in 5 steps.
    </p>

    {/* Steps */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
      {steps.map((s) => (
        <div
          key={s.step}
          style={{
            padding: '18px 20px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {s.step}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              {s.title}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-text-muted)',
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            {s.content}
          </div>
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              padding: '12px 14px',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 6,
              margin: 0,
              overflow: 'auto',
              lineHeight: 1.6,
            }}
          >
            {s.code}
          </pre>
        </div>
      ))}
    </div>

    {/* Guidelines */}
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
      Publishing guidelines
    </h2>
    <div
      style={{
        padding: '16px 20px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 10,
      }}
    >
      {guidelines.map((g, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 10,
            padding: '8px 0',
            borderBottom: i < guidelines.length - 1 ? '1px solid #1a1d2733' : 'none',
          }}
        >
          <span
            style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
          >
            &#x2713;
          </span>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            {g}
          </span>
        </div>
      ))}
    </div>
  </div>
);
