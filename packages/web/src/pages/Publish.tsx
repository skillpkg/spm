import { Text } from '@spm/ui';

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
    <Text
      variant="h1"
      font="sans"
      color="primary"
      as="h1"
      style={{ marginBottom: 4, marginTop: 0 }}
    >
      Publish a Skill
    </Text>
    <Text
      variant="body"
      font="sans"
      color="muted"
      as="p"
      style={{ marginBottom: 32, marginTop: 0 }}
    >
      Share your skill with the community in 5 steps.
    </Text>

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
            <Text
              variant="caption"
              font="mono"
              color="accent"
              weight={700}
              as="div"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {s.step}
            </Text>
            <Text variant="h4" font="sans" color="primary" as="span">
              {s.title}
            </Text>
          </div>
          <Text
            variant="body-sm"
            font="sans"
            color="muted"
            as="div"
            style={{ marginBottom: 12, lineHeight: 1.5 }}
          >
            {s.content}
          </Text>
          <Text
            variant="body-sm"
            font="mono"
            color="secondary"
            as="pre"
            style={{
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
          </Text>
        </div>
      ))}
    </div>

    {/* Guidelines */}
    <Text
      variant="h3"
      font="sans"
      color="secondary"
      as="h2"
      style={{ marginBottom: 12, marginTop: 0 }}
    >
      Publishing guidelines
    </Text>
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
          <Text variant="caption" font="mono" color="accent" as="span">
            &#x2713;
          </Text>
          <Text
            variant="body-sm"
            font="sans"
            color="secondary"
            as="span"
            style={{ lineHeight: 1.5 }}
          >
            {g}
          </Text>
        </div>
      ))}
    </div>
  </div>
);
