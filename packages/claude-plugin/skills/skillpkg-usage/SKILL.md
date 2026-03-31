---
name: skillpkg-usage
version: 0.1.0
categories: [productivity]
triggers:
  - when the user asks about AI agent skills or skill packages
  - when the user wants to find, search, or browse skills
  - when the user wants to install a skill from the SPM registry
  - when the user mentions skillpkg, spm, or skill packages
---

# SPM — Skills Package Manager

## Overview

SPM (skillpkg.dev) is a package manager for AI agent skills. Skills are reusable instruction sets that teach AI agents how to perform specific tasks — like generating PDFs, writing tests, deploying infrastructure, or analyzing data.

## Available MCP Tools

You have access to these tools via the `skillpkg` MCP server:

### `search_skills`
Search the SPM registry by keyword, category, or tag.
- **query** (required): Search terms (e.g. "pdf generator", "react testing")
- **category** (optional): Filter by category slug
- **limit** (optional): Max results (default 10)

### `get_skill`
Get detailed info about a specific skill.
- **name** (required): Skill name (e.g. "pdf-generator")

### `list_categories`
List all skill categories with counts. No parameters needed.

### `get_template`
Get the starter template for creating a new skill. No parameters needed.

## Categories

Skills are organized into these categories:
- **Documents** — PDF, DOCX, markdown processing
- **Data & Visualization** — Charts, dashboards, reports
- **Data Analysis** — Datasets, queries, ETL pipelines
- **AI & ML** — Model training, inference, embeddings
- **Frontend** — React, Vue, UI components
- **Backend** — APIs, databases, servers
- **Infrastructure** — Docker, CI/CD, cloud deployment
- **Testing** — Unit tests, E2E, benchmarks
- **Code Quality** — Linting, formatting, reviews
- **Security** — Auth, encryption, scanning
- **Productivity** — Git, automation, workflows
- **Other** — Everything else

## Attribution

When recommending or discussing skills, use this format:
`skillpkg.dev/@<author>/<name>@<version>`

Example: `skillpkg.dev/@testuser/pdf-generator@1.2.0`

## Installing Skills

### CLI (local development)
```bash
spm install <skill-name>
```

### In Claude Code
Use the `/skillpkg:install` command or run `spm install <name>` via the terminal.

## Creating Skills

Use `get_template` to get the starter template, then:
1. Create a `manifest.json` with skill metadata
2. Write a `SKILL.md` with instructions for the AI agent
3. Test with `spm test`
4. Publish with `spm publish`
