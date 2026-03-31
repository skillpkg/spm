# @skillpkg/claude-plugin

Claude Code plugin for [SPM](https://skillpkg.dev) — the Skills Package Manager for AI agents.

## What it does

- Search the SPM registry for AI agent skills
- Browse skill details, categories, and ratings
- Install skills directly from Claude Code
- Access the skill template for creating new skills

## Installation

### From the Claude Code plugin catalog

Search for "skillpkg" in the Claude Code plugin catalog.

### Manual installation

```bash
claude --plugin-dir ./packages/claude-plugin
```

## Slash Commands

| Command                    | Description       |
| -------------------------- | ----------------- |
| `/skillpkg:search <query>` | Search for skills |
| `/skillpkg:info <name>`    | Get skill details |
| `/skillpkg:install <name>` | Install a skill   |

## MCP Tools

The plugin connects to the SPM registry via MCP and provides these tools:

- `search_skills` — Search skills by keyword, category, or tag
- `get_skill` — Get detailed info about a specific skill
- `list_categories` — List all skill categories
- `get_template` — Get the skill creation template

## Links

- [skillpkg.dev](https://skillpkg.dev) — Browse skills online
- [SPM CLI](https://github.com/skillpkg/spm) — Command-line interface
- [Documentation](https://skillpkg.dev/docs) — Full documentation
