import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Text, CopyButton } from '@spm/ui';

type InstallMethod = 'brew' | 'curl' | 'npm';

const installMethods: { key: InstallMethod; label: string; command: string; note: string }[] = [
  {
    key: 'brew',
    label: 'Homebrew',
    command: 'brew install skillpkg/tap/spm',
    note: 'macOS / Linux',
  },
  {
    key: 'curl',
    label: 'Shell script',
    command: 'curl -fsSL https://skillpkg.dev/install.sh | sh',
    note: 'macOS / Linux',
  },
  { key: 'npm', label: 'npm', command: 'npm i -g @skillpkg/cli', note: 'Requires Node.js' },
];

const InstallMethodPicker = () => {
  const [active, setActive] = useState<InstallMethod>('brew');
  const current = installMethods.find((m) => m.key === active)!;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 0, marginBottom: 10 }}>
        {installMethods.map((m) => (
          <button
            key={m.key}
            onClick={() => setActive(m.key)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              padding: '6px 16px',
              background: active === m.key ? 'var(--color-accent)' : 'transparent',
              color: active === m.key ? 'var(--color-bg)' : 'var(--color-text-muted)',
              border: `1px solid ${active === m.key ? 'var(--color-accent)' : 'var(--color-border-default)'}`,
              borderRadius: 0,
              cursor: 'pointer',
              fontWeight: active === m.key ? 600 : 400,
              transition: 'all 0.15s',
              ...(m.key === 'brew' ? { borderRadius: '6px 0 0 6px' } : {}),
              ...(m.key === 'npm' ? { borderRadius: '0 6px 6px 0' } : {}),
              ...(m.key !== 'brew' ? { borderLeft: 'none' } : {}),
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          padding: '12px 16px',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 8,
          gap: 12,
        }}
      >
        <span>
          <span style={{ color: 'var(--color-text-muted)' }}>$ </span>
          <span style={{ color: 'var(--color-text-primary)' }}>{current.command}</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--color-text-dim)' }}
          >
            {current.note}
          </span>
          <CopyButton text={current.command} />
        </div>
      </div>
    </div>
  );
};

const docs: Record<string, { title: string; content: () => React.ReactNode }> = {
  'what-is-spm': {
    title: 'What is SPM?',
    content: () => (
      <>
        <P>
          <strong>SPM (Skills Package Manager)</strong> is a package manager purpose-built for AI
          agent skills. Think of it as npm for AI agents — a central registry where developers
          publish, discover, and install reusable skill packages that extend what agents can do.
        </P>

        <H2>The problem</H2>
        <P>
          AI agents are powerful, but their capabilities are limited to what's built in. Every team
          ends up writing the same integrations — Slack bots, database connectors, file processors —
          from scratch. There's no standard way to share, version, or trust these capabilities
          across projects or organizations.
        </P>

        <H2>How SPM solves it</H2>
        <P>SPM provides a complete ecosystem for agent skills:</P>
        <UL>
          <li>
            <strong>Registry</strong> — A central repository at <Code>registry.skillpkg.dev</Code>{' '}
            where skills are published and discovered
          </li>
          <li>
            <strong>CLI</strong> — The <Code>spm</Code> command-line tool for installing,
            publishing, and managing skills
          </li>
          <li>
            <strong>Security</strong> — A 3-layer scanning pipeline that analyzes every published
            skill for malicious content
          </li>
          <li>
            <strong>Trust</strong> — A tiered trust system so you know who published what and how
            much to trust it
          </li>
          <li>
            <strong>Signing</strong> — Sigstore keyless signing so every package is
            cryptographically verifiable
          </li>
        </UL>

        <H2>How it works</H2>
        <P>
          A skill is a directory containing a <Code>SKILL.md</Code> manifest and supporting files.
          When you run <Code>spm publish</Code>, the CLI packs your skill into a <Code>.skl</Code>{' '}
          archive, signs it with Sigstore, and uploads it to the registry. The registry runs
          security scans and makes it available for others to install.
        </P>
        <CodeBlock>{`# Install a skill
spm install summarize-text

# Use it in your agent
spm list`}</CodeBlock>

        <H2>Key concepts</H2>
        <UL>
          <li>
            <strong>Skills</strong> — Reusable packages of agent capabilities (prompts, tools,
            workflows)
          </li>
          <li>
            <strong>Versions</strong> — Semver-versioned releases with full history
          </li>
          <li>
            <strong>Trust tiers</strong> — From unverified to official, reflecting publisher
            credibility
          </li>
          <li>
            <strong>Categories</strong> — Organize skills by function (frontend, backend, testing,
            etc.)
          </li>
          <li>
            <strong>Security levels</strong> — Full, basic, or none based on scan results
          </li>
        </UL>
      </>
    ),
  },

  installation: {
    title: 'Installation',
    content: () => (
      <>
        <H2>Install SPM</H2>
        <P>
          SPM is a single binary with no runtime dependencies. Choose your preferred install method:
        </P>
        <InstallMethodPicker />

        <H2>Prerequisites</H2>
        <UL>
          <li>A GitHub account (for publishing)</li>
        </UL>

        <H2>Verify installation</H2>
        <CodeBlock>{`spm --version
# 0.2.3`}</CodeBlock>

        <H2>Authenticate</H2>
        <P>
          Log in with your GitHub account using the device flow. No passwords or tokens to manage —
          SPM opens your browser and handles the rest.
        </P>
        <CodeBlock>{`spm login

# ✓ Device code: ABCD-1234
# ✓ Opening browser for GitHub authorization...
# ✓ Logged in as @yourname (verified)`}</CodeBlock>

        <H2>Check your identity</H2>
        <CodeBlock>{`spm whoami

# @yourname
# Trust: verified
# Skills: 3 published`}</CodeBlock>

        <H2>Configuration</H2>
        <P>
          SPM stores configuration in <Code>~/.config/spm/</Code>. The auth token is stored securely
          and refreshed automatically. You can configure the registry URL for private registries:
        </P>
        <CodeBlock>{`# Default registry
spm config set registry https://registry.skillpkg.dev

# Check current config
spm config list`}</CodeBlock>

        <H2>Uninstall</H2>
        <CodeBlock>{`# If installed via brew
brew uninstall spm

# If installed via npm
npm uninstall -g @skillpkg/cli`}</CodeBlock>
      </>
    ),
  },

  'your-first-skill': {
    title: 'Your first skill',
    content: () => (
      <>
        <P>
          This guide walks you through creating, testing, and publishing your first SPM skill in
          under 5 minutes.
        </P>

        <H2>1. Scaffold a new skill</H2>
        <P>
          The <Code>spm init</Code> command creates a new skill directory with all the required
          files:
        </P>
        <CodeBlock>{`spm init my-first-skill

# ✓ Created my-first-skill/
# ✓ Created SKILL.md
# ✓ Created README.md
# ✓ Created eval.json`}</CodeBlock>

        <H2>2. Edit SKILL.md</H2>
        <P>The manifest file defines your skill's metadata, instructions, and capabilities:</P>
        <CodeBlock>{`---
name: my-first-skill
version: 0.1.0
description: A helpful skill that summarizes text
authors:
  - yourname
categories:
  - documents
tags:
  - summarize
  - nlp
---

# My First Skill

You are a text summarization assistant. When given text,
provide a concise summary that captures the key points.

## Guidelines
- Keep summaries under 3 sentences
- Preserve the original tone
- Highlight any action items`}</CodeBlock>

        <H2>3. Test locally</H2>
        <P>Run the built-in test suite against your eval cases:</P>
        <CodeBlock>{`spm test

# Running eval cases...
# ✓ 3/3 eval cases passed
# ✓ Security scan: passed (no issues found)`}</CodeBlock>

        <H2>4. Pack and inspect</H2>
        <P>See what will be included in your package:</P>
        <CodeBlock>{`spm pack

# ✓ Packed my-first-skill-0.1.0.skl (2.1 KB)
# Files:
#   SKILL.md (1.2 KB)
#   README.md (0.6 KB)
#   eval.json (0.3 KB)`}</CodeBlock>

        <H2>5. Publish</H2>
        <P>Push your skill to the registry. SPM automatically signs it with Sigstore:</P>
        <CodeBlock>{`spm publish

# ✓ Packed my-first-skill-0.1.0.skl
# ✓ Signed with Sigstore (keyless)
# ✓ Security scan: passed
# ✓ Published my-first-skill@0.1.0
# ✓ https://skillpkg.dev/skills/my-first-skill`}</CodeBlock>

        <H2>6. Install it elsewhere</H2>
        <CodeBlock>{`spm install my-first-skill
# ✓ Installed my-first-skill@0.1.0`}</CodeBlock>

        <P>That's it! Your skill is now available for any agent to discover and use.</P>
      </>
    ),
  },

  skills: {
    title: 'Skills',
    content: () => (
      <>
        <P>
          A <strong>skill</strong> is a self-contained package of agent capabilities. It includes
          instructions, prompts, tool definitions, and metadata — everything an AI agent needs to
          perform a specific task.
        </P>

        <H2>Anatomy of a skill</H2>
        <P>At minimum, a skill contains:</P>
        <CodeBlock>{`my-skill/
├── SKILL.md      # Manifest + instructions (required)
├── README.md     # Human-readable documentation
└── eval.json     # Test/evaluation cases`}</CodeBlock>

        <H2>The SKILL.md manifest</H2>
        <P>
          Every skill must have a <Code>SKILL.md</Code> file. The YAML frontmatter contains
          metadata, and the markdown body contains the actual instructions for the agent:
        </P>
        <CodeBlock>{`---
name: code-reviewer
version: 1.2.0
description: Reviews code for bugs, style issues, and security vulnerabilities
authors:
  - alice
  - bob
categories:
  - code-quality
tags:
  - review
  - security
  - linting
license: MIT
private: false
---

# Code Reviewer

You are an expert code reviewer. When presented with code...`}</CodeBlock>

        <H2>Manifest fields</H2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr>
              <Th>Field</Th>
              <Th>Required</Th>
              <Th>Description</Th>
            </tr>
          </thead>
          <tbody>
            <Tr>
              <Td>
                <Code>name</Code>
              </Td>
              <Td>Yes</Td>
              <Td>Unique package name (lowercase, hyphens allowed)</Td>
            </Tr>
            <Tr>
              <Td>
                <Code>version</Code>
              </Td>
              <Td>Yes</Td>
              <Td>Semver version string</Td>
            </Tr>
            <Tr>
              <Td>
                <Code>description</Code>
              </Td>
              <Td>Yes</Td>
              <Td>One-line description (max 200 chars)</Td>
            </Tr>
            <Tr>
              <Td>
                <Code>authors</Code>
              </Td>
              <Td>Yes</Td>
              <Td>Array of GitHub usernames</Td>
            </Tr>
            <Tr>
              <Td>
                <Code>categories</Code>
              </Td>
              <Td>No</Td>
              <Td>Array from the fixed category list</Td>
            </Tr>
            <Tr>
              <Td>
                <Code>tags</Code>
              </Td>
              <Td>No</Td>
              <Td>Free-form tags for discovery</Td>
            </Tr>
            <Tr>
              <Td>
                <Code>license</Code>
              </Td>
              <Td>No</Td>
              <Td>SPDX license identifier</Td>
            </Tr>
            <Tr>
              <Td>
                <Code>private</Code>
              </Td>
              <Td>No</Td>
              <Td>If true, won't be listed in search</Td>
            </Tr>
          </tbody>
        </table>

        <H2>The .skl package format</H2>
        <P>
          When published, skills are packed into <Code>.skl</Code> files — gzipped tar archives
          containing all skill files. The registry stores these in Cloudflare R2 and serves them on{' '}
          <Code>spm install</Code>.
        </P>

        <H2>Versioning</H2>
        <P>
          Skills follow{' '}
          <a
            href="https://semver.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-accent)' }}
          >
            semantic versioning
          </a>
          . Use <Code>spm version patch|minor|major</Code> to bump versions:
        </P>
        <CodeBlock>{`spm version patch  # 1.2.0 → 1.2.1
spm version minor  # 1.2.0 → 1.3.0
spm version major  # 1.2.0 → 2.0.0`}</CodeBlock>
      </>
    ),
  },

  'trust-tiers': {
    title: 'Trust tiers',
    content: () => (
      <>
        <P>
          SPM uses a tiered trust system to help users assess the credibility of skill publishers.
          Trust is assigned at the <strong>user level</strong> — all skills from a trusted publisher
          inherit that trust.
        </P>

        <H2>The tiers</H2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <TierCard
            color="#ef4444"
            name="Unverified"
            desc="New accounts that haven't completed GitHub verification. Skills from unverified publishers receive additional security scrutiny."
          />
          <TierCard
            color="#94a3b8"
            name="Registered"
            desc="Default tier after GitHub OAuth. The publisher has a valid GitHub account linked to their SPM identity."
          />
          <TierCard
            color="#3b82f6"
            name="Verified"
            desc="Publishers who have demonstrated consistent, quality contributions. Verified accounts get a blue badge on their skills."
          />
          <TierCard
            color="#10b981"
            name="Trusted"
            desc="Established publishers with a strong track record. Trusted skills may receive expedited security reviews."
          />
          <TierCard
            color="#fbbf24"
            name="Official"
            desc="Skills published by the SPM team or verified partners. These are the highest-trust packages in the registry."
          />
        </div>

        <H2>How trust affects security</H2>
        <P>Trust tier influences the security pipeline behavior:</P>
        <UL>
          <li>
            <strong>Unverified</strong> — All 3 security layers run; flagged content is held for
            manual review
          </li>
          <li>
            <strong>Registered</strong> — All 3 layers run; only high-confidence flags trigger
            manual review
          </li>
          <li>
            <strong>Verified+</strong> — Layer 1 (regex) always runs; Layers 2-3 run but with higher
            thresholds
          </li>
          <li>
            <strong>Official</strong> — Layer 1 scan only; auto-approved unless critical issues
            found
          </li>
        </UL>

        <H2>Earning trust</H2>
        <P>Trust is upgraded by SPM administrators based on:</P>
        <UL>
          <li>Number of published skills and their quality</li>
          <li>Download counts and community ratings</li>
          <li>Clean security history (no flagged or blocked packages)</li>
          <li>Active maintenance and responsiveness to issues</li>
        </UL>

        <H2>Trust badges in the CLI</H2>
        <CodeBlock>{`spm info code-reviewer

# code-reviewer v1.2.0
# by @alice (verified ✓)
# Trust: verified
# Security: full (3/3 layers passed)`}</CodeBlock>
      </>
    ),
  },

  'content-security': {
    title: 'Content security',
    content: () => (
      <>
        <P>
          Every skill published to SPM goes through a <strong>3-layer security pipeline</strong>{' '}
          that scans for malicious content, prompt injection, and unsafe patterns before it reaches
          users.
        </P>

        <H2>Layer 1: Static analysis (regex)</H2>
        <P>
          The first layer runs immediately on publish. It scans all text files in the package
          against 25 regex patterns across 5 categories:
        </P>
        <UL>
          <li>
            <strong>Data exfiltration</strong> — Detects attempts to send data to external URLs,
            encode secrets, or access environment variables
          </li>
          <li>
            <strong>Prompt injection</strong> — Catches role-override attempts, system prompt
            manipulation, and instruction hijacking
          </li>
          <li>
            <strong>Obfuscation</strong> — Flags base64-encoded blocks, hex-encoded strings, and
            character-code construction
          </li>
          <li>
            <strong>Privilege escalation</strong> — Identifies sudo/admin elevation, file system
            access beyond scope
          </li>
          <li>
            <strong>Social engineering</strong> — Detects urgency manipulation, authority
            impersonation, credential requests
          </li>
        </UL>
        <P>
          Layer 1 is fast ({'<'}100ms) and blocks immediately if high-confidence patterns match.
          Lower-confidence matches generate warnings that are reviewed by later layers.
        </P>

        <H2>Layer 2: ML classification</H2>
        <P>
          Skills that pass Layer 1 are sent to a machine learning classifier that analyzes the
          semantic intent of instructions. This catches sophisticated attacks that don't match
          simple patterns — like prompt injection disguised as legitimate instructions.
        </P>

        <H2>Layer 3: LLM review</H2>
        <P>
          For flagged content or publishers with lower trust, a language model performs a deep
          review of the skill's instructions, looking for:
        </P>
        <UL>
          <li>Hidden instructions or steganographic content</li>
          <li>Instructions that contradict the stated purpose</li>
          <li>Attempts to bypass the host agent's safety guidelines</li>
          <li>Misleading descriptions that don't match actual behavior</li>
        </UL>

        <H2>Security levels</H2>
        <P>After scanning, each skill receives a security level:</P>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <SecurityLevel color="#10b981" name="Full" desc="Passed all 3 layers with no warnings" />
          <SecurityLevel
            color="#fbbf24"
            name="Basic"
            desc="Passed with warnings; manually reviewed and approved"
          />
          <SecurityLevel
            color="#64748b"
            name="None"
            desc="Not yet scanned or scan results pending"
          />
        </div>

        <H2>What happens when a skill is flagged?</H2>
        <P>
          Flagged skills are held in a review queue visible to registry administrators. They are not
          available for installation until an admin approves or rejects them. The publisher receives
          a notification with details about what triggered the flag.
        </P>

        <H2>Verification on install</H2>
        <P>
          When you run <Code>spm install</Code>, the CLI also verifies the Sigstore signature to
          confirm the package hasn't been tampered with since it was published:
        </P>
        <CodeBlock>{`spm install code-reviewer

# ✓ Verified signature (Sigstore)
# ✓ Security: full
# ✓ Installed code-reviewer@1.2.0`}</CodeBlock>
      </>
    ),
  },

  categories: {
    title: 'Categories',
    content: () => (
      <>
        <P>
          Categories organize skills by function, making it easy to browse and discover relevant
          packages. Each skill can belong to one or more categories.
        </P>

        <H2>Available categories</H2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {[
            ['documents', 'PDF, DOCX, PPTX, XLSX, text processing'],
            ['data-viz', 'Charts, dashboards, CSV/JSON, visualization'],
            ['data-analysis', 'Datasets, querying, transformation, analytics'],
            ['ai-ml', 'Model training, evaluation, ML pipelines, LLMs'],
            ['frontend', 'UI, React, HTML/CSS, design systems'],
            ['backend', 'API, GraphQL, REST, database, migrations'],
            ['infra', 'Docker, CI/CD, deploy, cloud, IaC'],
            ['testing', 'Test generation, coverage, benchmarks'],
            ['code-quality', 'Linting, standards, review, refactoring'],
            ['security', 'Auth, encryption, vulnerability scanning'],
            ['productivity', 'Git, terminal, workflow automation'],
            ['other', "Doesn't fit above categories"],
          ].map(([cat, desc]) => (
            <div
              key={cat}
              style={{
                padding: '10px 14px',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 8,
              }}
            >
              <Text
                variant="body-sm"
                font="mono"
                color="accent"
                as="div"
                style={{ marginBottom: 4 }}
              >
                {cat}
              </Text>
              <Text variant="caption" font="sans" color="muted" as="div">
                {desc}
              </Text>
            </div>
          ))}
        </div>

        <H2>Auto-classification</H2>
        <P>
          If you don't specify categories in your <Code>SKILL.md</Code>, SPM's heuristic classifier
          will suggest categories based on your skill's name, description, and content. You'll see
          the suggestions during <Code>spm publish</Code> and can accept or override them.
        </P>
        <CodeBlock>{`spm publish

# ✓ Auto-classified: code-quality, testing
# Accept suggested categories? (Y/n)`}</CodeBlock>

        <H2>Browsing by category</H2>
        <CodeBlock>{`# CLI
spm search --category frontend

# Web
# Visit skillpkg.dev/search?category=frontend`}</CodeBlock>

        <H2>Multiple categories</H2>
        <P>
          Skills can belong to multiple categories. For example, a skill that generates test code
          might be in both <Code>code-quality</Code> and <Code>testing</Code>:
        </P>
        <CodeBlock>{`---
name: test-generator
categories:
  - code-quality
  - testing
---`}</CodeBlock>
      </>
    ),
  },

  'managing-skills': {
    title: 'Managing skills',
    content: () => (
      <>
        <P>
          SPM supports two installation modes: <strong>global</strong> (available everywhere) and
          <strong> project-local</strong> (scoped to a directory).
        </P>

        <H2>Basic install</H2>
        <CodeBlock>{`# Install to current project
spm install code-reviewer

# Install globally
spm install -g code-reviewer`}</CodeBlock>

        <H2>Version pinning</H2>
        <CodeBlock>{`# Install exact version
spm install code-reviewer@1.2.0

# Install latest compatible (semver range)
spm install code-reviewer@^1.0.0`}</CodeBlock>

        <H2>Where skills are installed</H2>
        <P>
          <strong>Project-local:</strong> Skills are stored in <Code>.spm/skills/</Code> in your
          project root. A <Code>skills.json</Code> file tracks installed skills (like{' '}
          <Code>package.json</Code>):
        </P>
        <CodeBlock>{`{
  "skills": {
    "code-reviewer": "^1.2.0",
    "test-generator": "0.5.3"
  }
}`}</CodeBlock>
        <P>
          <strong>Global:</strong> Skills are linked into <Code>~/.config/spm/skills/</Code> and
          available to any agent.
        </P>

        <H2>Lock file</H2>
        <P>
          SPM generates a <Code>skills-lock.json</Code> that pins exact versions, ensuring
          reproducible installs across machines:
        </P>
        <CodeBlock>{`spm install   # Reads skills.json, writes skills-lock.json`}</CodeBlock>

        <H2>Listing installed skills</H2>
        <CodeBlock>{`# List project skills
spm list

# List global skills
spm list -g

# JSON output
spm list --json`}</CodeBlock>

        <H2>Updating skills</H2>
        <CodeBlock>{`# Update all skills to latest compatible
spm update

# Update a specific skill
spm update code-reviewer`}</CodeBlock>

        <H2>Uninstalling</H2>
        <CodeBlock>{`spm uninstall code-reviewer
spm uninstall -g code-reviewer`}</CodeBlock>

        <H2>Signature verification</H2>
        <P>
          On install, SPM automatically verifies the Sigstore signature to ensure the package hasn't
          been tampered with:
        </P>
        <CodeBlock>{`spm install code-reviewer

# ✓ Verified signature (Sigstore)
# ✓ Publisher: @alice (verified)
# ✓ Installed code-reviewer@1.2.0`}</CodeBlock>
        <P>To explicitly verify a skill:</P>
        <CodeBlock>{`spm verify code-reviewer`}</CodeBlock>
      </>
    ),
  },

  'authoring-best-practices': {
    title: 'Authoring best practices',
    content: () => (
      <>
        <P>Follow these guidelines to create skills that are secure, discoverable, and useful.</P>

        <H2>Write clear instructions</H2>
        <UL>
          <li>Start with a one-line summary of what the skill does</li>
          <li>Use structured sections (Guidelines, Examples, Constraints)</li>
          <li>Be specific about expected inputs and outputs</li>
          <li>Include edge cases the agent should handle</li>
        </UL>
        <CodeBlock>{`# Code Reviewer

You review code for bugs, security issues, and style.

## Guidelines
- Focus on correctness over style
- Flag security issues as HIGH priority
- Suggest specific fixes, not just problems

## Output Format
Return a markdown list of findings with severity levels.`}</CodeBlock>

        <H2>Write good eval cases</H2>
        <P>
          The <Code>eval.json</Code> file defines test cases that validate your skill works
          correctly:
        </P>
        <CodeBlock>{`[
  {
    "input": "Review this function: function add(a,b){return a+b}",
    "expected_contains": ["no issues", "simple"],
    "expected_not_contains": ["security", "vulnerability"]
  },
  {
    "input": "Review: eval(userInput)",
    "expected_contains": ["security", "injection"]
  }
]`}</CodeBlock>

        <H2>Avoid security flags</H2>
        <P>The security scanner flags certain patterns. Avoid these in your instructions:</P>
        <UL>
          <li>Don't reference environment variables or file system paths unless necessary</li>
          <li>Don't include URLs to external services in instructions</li>
          <li>Don't use phrases like "ignore previous instructions" even in examples</li>
          <li>Don't include base64-encoded content</li>
        </UL>

        <H2>Optimize for discovery</H2>
        <UL>
          <li>
            Choose a descriptive, unique name (check availability with <Code>spm search</Code>)
          </li>
          <li>Write a compelling one-line description</li>
          <li>Add relevant categories and tags</li>
          <li>
            Include a thorough <Code>README.md</Code> with usage examples
          </li>
        </UL>

        <H2>Version thoughtfully</H2>
        <UL>
          <li>
            <strong>Patch</strong> (0.0.x) — Fix typos, clarify wording, minor prompt tweaks
          </li>
          <li>
            <strong>Minor</strong> (0.x.0) — Add new capabilities, expand instructions
          </li>
          <li>
            <strong>Major</strong> (x.0.0) — Change the skill's core behavior or output format
          </li>
        </UL>

        <H2>Document thoroughly</H2>
        <P>
          A good <Code>README.md</Code> should include:
        </P>
        <UL>
          <li>What the skill does and when to use it</li>
          <li>Example inputs and expected outputs</li>
          <li>Configuration options (if any)</li>
          <li>Known limitations</li>
          <li>Changelog for recent versions</li>
        </UL>
      </>
    ),
  },

  'agent-integration': {
    title: 'Agent integration',
    content: () => (
      <>
        <P>
          SPM is designed to work with any AI agent framework. This guide covers how agents
          discover, load, and use skills from the registry.
        </P>

        <H2>MCP integration</H2>
        <P>
          SPM provides a <strong>Model Context Protocol (MCP)</strong> server that agents can
          connect to for real-time skill discovery:
        </P>
        <CodeBlock>{`{
  "mcpServers": {
    "spm": {
      "command": "npx",
      "args": ["-y", "@aspect/spm-mcp"]
    }
  }
}`}</CodeBlock>
        <P>The MCP server exposes four tools:</P>
        <UL>
          <li>
            <Code>spm_search</Code> — Search the registry by query, category, or tag
          </li>
          <li>
            <Code>spm_info</Code> — Get full details about a specific skill
          </li>
          <li>
            <Code>spm_categories</Code> — List all available categories with counts
          </li>
          <li>
            <Code>spm_template</Code> — Get the skill template (manifest + SKILL.md) as a starting
            point for creating a new skill
          </li>
        </UL>

        <H2>How agents use skills</H2>
        <P>When an agent needs a capability it doesn't have, the typical flow is:</P>
        <OL>
          <li>Agent recognizes it needs a skill (e.g., "I need to review code")</li>
          <li>
            Agent calls <Code>spm_search</Code> to find relevant skills
          </li>
          <li>
            Agent calls <Code>spm_info</Code> to read the skill's instructions
          </li>
          <li>Agent incorporates the skill's instructions into its context</li>
          <li>Agent performs the task using the skill's guidelines</li>
        </OL>

        <H2>Local skill loading</H2>
        <P>For agents running locally, installed skills can be loaded directly from disk:</P>
        <CodeBlock>{`# Project skills are in .spm/skills/
ls .spm/skills/code-reviewer/SKILL.md

# Global skills
ls ~/.config/spm/skills/code-reviewer/SKILL.md`}</CodeBlock>

        <H2>Programmatic API</H2>
        <P>The registry exposes a REST API that any agent framework can call:</P>
        <CodeBlock>{`# Search for skills
GET /api/skills/search?q=code+review&category=code-quality

# Get skill details
GET /api/skills/code-reviewer

# Get specific version
GET /api/skills/code-reviewer/versions/1.2.0

# Download package
GET /api/skills/code-reviewer/download?version=1.2.0

# Get skill template (manifest.json + SKILL.md)
GET /api/v1/template`}</CodeBlock>

        <H2>Agent frameworks</H2>
        <P>
          SPM works with any agent framework that can read text files or make HTTP requests. Example
          integrations:
        </P>
        <UL>
          <li>
            <strong>Claude Code</strong> — Add MCP config to your project's <Code>.mcp.json</Code>
          </li>
          <li>
            <strong>LangChain</strong> — Load skills as prompt templates from the API
          </li>
          <li>
            <strong>AutoGPT</strong> — Register SPM skills as available commands
          </li>
          <li>
            <strong>Custom agents</strong> — Use the REST API or MCP server
          </li>
        </UL>

        <H2>Best practices for agent developers</H2>
        <UL>
          <li>Cache skill instructions locally to reduce API calls</li>
          <li>Check the trust tier and security level before using a skill</li>
          <li>Pin skill versions in production to avoid unexpected changes</li>
          <li>
            Use the <Code>spm verify</Code> command to confirm package integrity
          </li>
        </UL>
      </>
    ),
  },
};

// ── Shared mini-components for doc content ──

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

const OL = ({ children }: { children: React.ReactNode }) => (
  <ol
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
  </ol>
);

const Code = ({ children }: { children: React.ReactNode }) => (
  <code
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      padding: '2px 6px',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 4,
    }}
  >
    {children}
  </code>
);

const CodeBlock = ({ children }: { children: React.ReactNode }) => (
  <pre
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      lineHeight: 1.6,
      padding: 16,
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 8,
      overflowX: 'auto',
      marginBottom: 16,
    }}
  >
    <code>{children}</code>
  </pre>
);

const Th = ({ children }: { children: React.ReactNode }) => (
  <th
    style={{
      textAlign: 'left',
      padding: '8px 12px',
      borderBottom: '1px solid var(--color-border-default)',
      color: 'var(--color-text-dim)',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 500,
    }}
  >
    {children}
  </th>
);

const Td = ({ children }: { children: React.ReactNode }) => (
  <td
    style={{
      padding: '8px 12px',
      borderBottom: '1px solid var(--color-border-default)',
      color: 'var(--color-text-secondary)',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
    }}
  >
    {children}
  </td>
);

const Tr = ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>;

const TierCard = ({ color, name, desc }: { color: string; name: string; desc: string }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 16px',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 8,
    }}
  >
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        marginTop: 5,
        flexShrink: 0,
      }}
    />
    <div>
      <Text variant="body" font="sans" color="primary" weight={500} as="div">
        {name}
      </Text>
      <Text
        variant="body-sm"
        font="sans"
        color="muted"
        as="div"
        style={{ lineHeight: 1.5, marginTop: 2 }}
      >
        {desc}
      </Text>
    </div>
  </div>
);

const SecurityLevel = ({ color, name, desc }: { color: string; name: string; desc: string }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 14px',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 8,
    }}
  >
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
    <Text variant="body-sm" font="sans" as="span">
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{name}</span>{' '}
      <span style={{ color: 'var(--color-text-muted)' }}>— {desc}</span>
    </Text>
  </div>
);

// ── Main component ──

export const DocDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const doc = slug ? docs[slug] : undefined;

  if (!doc) {
    return (
      <div
        style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px 60px', textAlign: 'center' }}
      >
        <Text variant="h2" font="sans" color="primary" as="h1" style={{ marginBottom: 12 }}>
          Page not found
        </Text>
        <Text variant="body" font="sans" color="muted" as="p">
          This documentation page doesn't exist.{' '}
          <Link to="/docs" style={{ color: 'var(--color-accent)' }}>
            Back to docs
          </Link>
        </Text>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px 60px' }}>
      <Text
        variant="h1"
        font="sans"
        color="primary"
        as="h1"
        style={{ marginBottom: 24, marginTop: 0 }}
      >
        {doc.title}
      </Text>
      {doc.content()}
    </div>
  );
};
