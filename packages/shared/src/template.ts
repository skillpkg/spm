import type { ManifestInput } from './schemas.js';

export interface SkillTemplate {
  manifest: ManifestInput;
  skill_md: string;
}

export const SKILL_TEMPLATE: SkillTemplate = {
  manifest: {
    name: 'my-skill',
    version: '0.1.0',
    description:
      'A brief description of what this skill does and when an AI agent should use it. Should be 30-1024 characters.',
    categories: ['other'],
    keywords: ['example', 'template'],
    license: 'MIT',
    authors: [{ name: 'Your Name', email: 'you@example.com' }],
    urls: {
      repository: 'https://github.com/your-username/my-skill',
    },
    agents: {
      platforms: ['*'],
      requires_tools: [],
      min_context: 'standard',
      requires_network: false,
      requires_mcp: [],
    },
    dependencies: {
      skills: {},
      pip: [],
      npm: [],
      system: [],
    },
    security: {
      sandboxed: true,
      network_access: false,
      filesystem_scope: ['$WORKDIR'],
    },
    files: {
      include: ['**/*'],
      exclude: ['node_modules/**', '.git/**'],
    },
    spm: {
      manifest_version: 1,
    },
  },
  skill_md: `---
name: my-skill
version: 0.1.0
categories: [other]
triggers:
  - when the user asks to do X
  - when X needs to happen
---

# My Skill

## Overview

Describe what this skill does and when it should be triggered.

## Quick Reference

| Task          | Command / Action         |
| ------------- | ------------------------ |
| Example task  | How to accomplish it     |

## Instructions

1. First, understand what the user needs
2. Then, perform the necessary steps
3. Finally, present the result

## Scripts

List any included scripts and their purpose:

- \`scripts/example.sh\` — Does X

## Examples

### Good Example

User: "Do X for me"
→ The skill activates and performs X correctly.

### Bad Example (Do Not Trigger)

User: "Tell me about X"
→ This is an informational question, not an action request. Do not trigger.

## Edge Cases

- If X fails, retry with Y
- If the user provides incomplete input, ask for clarification
`,
};
