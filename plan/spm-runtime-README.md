# spm-runtime

> The meta-skill that connects agents to the SPM ecosystem.

## What is this?

`spm-runtime` is a SKILL.md file that gets auto-installed into every agent's skill directory when SPM is set up. It teaches agents how to:

- **Search the registry** when no installed skill matches a user's request
- **Install skills mid-conversation** via MCP tools (with user confirmation)
- **Explain resolution** — why a specific version of a skill is loaded
- **Manage skills** — help users install, update, remove, and pin versions

Without spm-runtime, agents see skills in their `<available_skills>` list but have no way to discover new ones or understand the SPM ecosystem.

## How it gets installed

```
User installs SPM (brew install spm / npm i -g spm-cli / etc.)
  └── Post-install hook runs: spm bootstrap --silent
       └── Creates ~/.spm/ directory
       └── Writes spm-runtime SKILL.md to ~/.spm/skills/spm-runtime/current/
       └── Runs: npx skills add ~/.spm/skills/spm-runtime/current/ -a '*' -y
            └── Vercel's CLI symlinks into all detected agent directories:
                 ~/.claude/skills/spm-runtime/  (Claude Code)
                 ~/.cursor/skills/spm-runtime/  (Cursor)
                 ~/.agents/skills/spm-runtime/  (canonical)
```

The SKILL.md file ships **bundled with the CLI binary** at `assets/spm-runtime-SKILL.md`. It is never published to or downloaded from the registry.

## When agents read it

Agents only read spm-runtime when:

1. The user asks about installed skills, the skill registry, or SPM
2. The user wants to search for, install, update, or remove skills
3. The agent can't find an installed skill matching the user's request
4. The user mentions "spm", "skill package", or "skill registry"

It is NOT read for normal task execution — the trigger description explicitly says so.

## Files

| File            | Purpose                                               | Audience    |
| --------------- | ----------------------------------------------------- | ----------- |
| `SKILL.md`      | Instructions for agents about SPM ecosystem           | Agents      |
| `manifest.json` | Package metadata (category: system, type: meta-skill) | SPM tooling |
| `README.md`     | This file — developer documentation                   | Humans      |

## Key design decisions

**Why a skill and not just MCP tools?**
MCP tools let agents call `spm_search` and `spm_install`, but they don't explain _when_ to use them, _how_ to present results, or _what trust tiers mean_. The SKILL.md provides behavioral guidance that MCP tool descriptions can't.

**Why bundled with the CLI, not in the registry?**
Chicken-and-egg: the user needs spm-runtime to discover registry skills, but they can't download spm-runtime from the registry without having SPM set up. Bundling solves this.

**Why auto-installed?**
Zero-setup philosophy. If the user has to manually install spm-runtime, most won't, and SPM's discovery features won't work. Auto-install via post-install hooks means it "just works."

**Why the negative trigger ("Do NOT read for normal tasks")?**
Skills compete for context window space. If spm-runtime triggered on every request, it would waste ~1000 tokens on skill management instructions when the user just wants to make a chart. The negative instruction keeps it out of the way.

## Security considerations

spm-runtime itself is safe:

- Does not execute code
- Does not access the network
- Does not modify files
- Does not read user data
- Only provides instructions about how to interact with SPM

The rules section (Section 7) explicitly instructs agents to:

- Never install skills without user confirmation
- Warn about unverified/low-trust skills
- Never recommend bypassing security warnings
- Report suspicious skills to the registry

## Updating spm-runtime

When the SPM CLI is updated (`brew upgrade spm`, `npm update -g spm-cli`), the post-install hook re-runs `spm bootstrap`, which overwrites the SKILL.md with the new version. This means:

- New resolution strategies are immediately reflected
- New MCP tools are documented for agents
- Updated security rules take effect
- No manual intervention needed

The version is tracked in `~/.spm/spm-runtime.meta.json`.
