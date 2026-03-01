# manifest.json — Redesigned Field Specification

## Cross-Ecosystem Comparison

What other package managers require vs recommend:

```
                    npm (package.json)    PyPI (pyproject.toml)    SPM (manifest.json)
                    ──────────────────    ─────────────────────    ───────────────────
REQUIRED:
  name              ✓ required            ✓ required               ✓ required
  version           ✓ required            ✓ required               ✓ required
  description       ✗ optional            ✗ optional               ✓ required

RECOMMENDED:
  author(s)         ✗ optional            ✗ optional               ✗ optional
  license           ✗ optional            ✗ optional               ✗ optional
  keywords          ✗ optional            ✗ optional               ✗ optional
  repository        ✗ optional            ✗ optional (urls)        ✗ optional

ECOSYSTEM-SPECIFIC:
  main/entry        ✓ (npm)               ✗                        ✗ (always SKILL.md)
  engines           ✓ (npm)               ✓ requires-python        ✗ (use agents.platforms)
  os/cpu            ✓ (npm)               ✗                        ✗ (not relevant)
  classifiers       ✗                     ✓ (PyPI trove)           ✗ (category instead)
  private           ✓ (npm)               ✗                        ✓ (useful!)
  funding           ✓ (npm)               ✗                        ✓ (good for tips)
  maintainers       ✗ (via contributors)  ✓ (separate from author) ✓ (good idea)
  homepage          ✓ (npm)               ✓ (urls.homepage)        ✓ (urls)
  bugs/issues       ✓ (npm)               ✓ (urls.tracker)         ✓ (urls)
  contributors      ✓ (npm, array)        ✗                        → merged into authors
  deprecated        ✓ (npm, via cli)      ✗                        ✓ (in registry, not manifest)
```

Fields from other ecosystems worth adding to SPM:

- `repository` (npm) → where's the source code
- `funding` (npm) → sponsorship link
- `private` (npm) → prevent accidental publish
- `urls` (PyPI) → homepage, docs, issues, changelog
- `maintainers` (PyPI) → separate from original authors
- `contributors` (npm) → additional credit

---

## Redesigned manifest.json

### Required Fields (3 fields — minimum viable manifest)

```jsonc
{
  // ── REQUIRED ─────────────────────────────────────────
  // These 3 fields are the ONLY ones needed to publish.
  // Everything else is optional.

  "name": "data-viz",
  // Rules: kebab-case, 2-64 chars, starts with letter
  // Scoped: "@org/skill-name" allowed

  "version": "1.2.0",
  // Semver. "0.0.0" for migrated skills without versions.

  "description": "Create charts, dashboards, and data visualizations from CSV, JSON, or database output. Use when the user asks to plot, chart, graph, or visualize data.",
  // 30-1024 chars. This is what agents match against user prompts.
  // The MOST important field for discoverability — make it "pushy".
}
```

Why only 3 required? Because the goal is to make publishing as frictionless as possible. npm requires only `name` + `version`. We add `description` because it's how agents discover skills — without it, the skill is invisible to the 26+ platforms that support Agent Skills. Everything else can be filled in later.

### Optional Fields (everything else)

```jsonc
{
  // ── REQUIRED (from above) ────────────────────────────
  "name": "data-viz",
  "version": "1.2.0",
  "description": "Create charts and dashboards from data...",

  // ── PEOPLE ───────────────────────────────────────────

  "authors": [
    // Array of people. All sub-fields optional except at least
    // one of name or email per entry.
    { "name": "Almog",     "email": "almog@example.com" },
    { "name": "Dana",      "email": "dana@example.com", "url": "https://dana.dev" },
    { "name": "CompanyBot", "email": "bot@acme.com" }
  ],
  // npm uses singular "author" + "contributors" array
  // PyPI uses "authors" + "maintainers" arrays
  // SPM: single "authors" array. First entry = primary author.
  //       Simpler than having two separate fields.

  "maintainers": [
    // People currently maintaining the skill (may differ from original authors).
    // Same format as authors. Optional.
    { "name": "Charlie", "email": "charlie@example.com" }
  ],

  // ── DISCOVERY ────────────────────────────────────────

  "keywords": ["chart", "visualization", "dashboard", "plotly", "csv"],
  // Array of strings. Max 20 keywords, each ≤ 50 chars.
  // Used for registry search ranking.

  "category": "data",
  // Single primary category. Predefined list:
  // "data", "code", "writing", "design", "devops",
  // "productivity", "education", "finance", "other"
  // Default: "other"

  // ── LEGAL ────────────────────────────────────────────

  "license": "MIT",
  // SPDX identifier string: "MIT", "Apache-2.0", "GPL-3.0-only",
  // "Proprietary", "UNLICENSED"
  // Default: unspecified (shown as "No license specified" on registry)

  "private": false,
  // If true, `spm publish` will REFUSE to publish.
  // Prevents accidental publication of internal skills.
  // Borrowed from npm. Very useful for companies.
  // Default: false

  // ── LINKS ────────────────────────────────────────────

  "urls": {
    "homepage":      "https://data-viz.example.com",
    "repository":    "https://github.com/almog/data-viz",
    "issues":        "https://github.com/almog/data-viz/issues",
    "documentation": "https://data-viz.example.com/docs",
    "changelog":     "https://github.com/almog/data-viz/blob/main/CHANGELOG.md",
    "funding":       "https://github.com/sponsors/almog"
  },
  // All optional. Borrowed from PyPI's urls + npm's homepage/bugs/funding.
  // "funding" links to sponsorship page (npm added this and it's popular).

  // ── PROVENANCE ─────────────────────────────────────

  "forked_from": "data-viz",
  // Optional. If this skill was forked from another, name the original.
  // Displayed in search results as "forked from data-viz" badge.
  // Helps users find the original and understand lineage.

  // ── PLATFORM ─────────────────────────────────────────

  "agents": {
    "platforms": ["claude-code", "cursor", "copilot", "codex"],
    // Which agent platforms this skill supports. Default: all.
    // Most skills work everywhere (they're just SKILL.md files).
    // Some skills need platform-specific features:
    //   "claude-code"  — needs filesystem, bash
    //   "cursor"       — needs Cursor IDE features
    //   "copilot"      — needs VS Code/GitHub Copilot
    //   "codex"        — needs OpenAI Codex environment
    //   "*"            — works on any Agent Skills platform (default)

    "requires_tools": ["bash", "file_read", "file_write"],
    // Which tool capabilities the skill needs.
    // Expressed as generic capabilities, not platform-specific names.
    // Agents map these to their own tool names.

    "min_context": "standard",
    // "standard" or "large". Does this skill need a big context window?
    // Default: "standard"

    "requires_network": false,
    // Does the agent need network access for this skill?
    // Default: false

    "requires_mcp": ["@anthropic/mcp-server-filesystem"]
    // MCP servers this skill needs. Auto-configured on install.
    // Optional. Default: []
  },

  // ── DEPENDENCIES ─────────────────────────────────────

  "dependencies": {
    "skills": {
      // Other SPM skills this skill depends on. Semver ranges.
      "frontend-design": "^1.0.0",
      "@acme/branding":  ">=2.0.0"
    },

    "pip": ["plotly>=5.0", "pandas>=2.0"],
    // pip packages auto-installed when the skill is installed.
    // Same format as pyproject.toml dependencies.

    "npm": ["d3@^7.0.0"],
    // npm packages auto-installed.

    "system": ["ffmpeg", "imagemagick"]
    // System-level binaries the skill needs.
    // NOT auto-installed — just documented + checked at install time.
    // If missing, spm install warns but doesn't block.
  },

  // ── SECURITY ─────────────────────────────────────────

  "security": {
    "sandboxed": true,
    // Does the skill stay within the agent's sandbox?
    // Default: true

    "network_access": false,
    // Does any script make outbound HTTP calls?
    // Default: false

    "filesystem_scope": ["$WORKDIR", "$OUTPUTS"]
    // Where does the skill read/write?
    // Uses platform-agnostic variables:
    //   $WORKDIR  → agent's working directory (e.g. /home/claude, project root)
    //   $OUTPUTS  → agent's output directory (e.g. /mnt/user-data/outputs)
    // Default: ["$WORKDIR", "$OUTPUTS"]
  },

  // ── FILES ────────────────────────────────────────────

  "files": {
    "include": ["SKILL.md", "scripts/", "references/", "assets/", "LICENSE*"],
    // Explicit include list. If omitted, everything is included
    // (minus .spmignore patterns).

    "exclude": ["tests/", "evals/", "*.pyc"]
    // Explicit exclude list. Merged with .spmignore.
  }

  // ── SPM METADATA ─────────────────────────────────────
  // These fields are MANAGED by spm tooling, not manually edited.

  "$schema": "https://spm.dev/schemas/manifest-v1.json",
  // JSON schema for editor autocompletion + validation.

  "spm": {
    "manifest_version": 1
    // Manifest format version. For future-proofing.
    // If we ever need to change the manifest structure,
    // tools check this to know how to parse.
  }
}
```

---

## Field Summary Table

```
Field                  Required?   Default          Auto-detected?   Notes
─────────────────────────────────────────────────────────────────────────────
name                   ✓ YES       —                from frontmatter
version                ✓ YES       "0.0.0"          from git tags    "0.0.0" for migrated
description            ✓ YES       —                from frontmatter

authors                optional    []               from git config  Array, multiple people
maintainers            optional    []               —                Separate from authors
keywords               optional    []               from description Auto-extracted on migrate
category               optional    "other"          from description Guessed on migrate
license                optional    unspecified       from frontmatter SPDX string
private                optional    false            —                Blocks spm publish
urls                   optional    {}               from git remote  Auto-detect repo URL
urls.homepage          optional    —                —
urls.repository        optional    —                from git remote
urls.issues            optional    —                from git remote
urls.documentation     optional    —                —
urls.changelog         optional    —                —
urls.funding           optional    —                —

forked_from            optional    —                —                Name of original skill

agents.platforms       optional    [all]            —                ["*"] = all platforms
agents.requires_tools  optional    []               from SKILL.md    Generic tool capabilities
agents.min_context     optional    "standard"       —
agents.requires_network optional   false            from scripts     Scan for HTTP calls
agents.requires_mcp    optional    []               from SKILL.md    MCP server dependencies

dependencies.skills    optional    {}               —
dependencies.pip       optional    []               from imports     Scan Python imports
dependencies.npm       optional    []               from requires    Scan JS requires
dependencies.system    optional    []               —                Manual only

security.sandboxed     optional    true             —
security.network_access optional   false            from scripts
security.filesystem_scope optional ["$WORKDIR","$OUTPUTS"] —

files.include          optional    [all]            —
files.exclude          optional    []               from .spmignore

$schema                optional    —                by spm init
spm.manifest_version   optional    1                by spm init
```

---

## Minimum Viable Manifests

### Bare minimum (just enough to publish):

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "Does something useful when the user asks for X."
}
```

That's it. 3 lines. Everything else defaults.

### Typical community skill:

```json
{
  "name": "csv-analyzer",
  "version": "1.0.0",
  "description": "Analyze CSV files: generate summaries, find outliers, create pivot tables, and suggest visualizations. Trigger when user uploads a CSV or asks to analyze tabular data.",
  "authors": [{ "name": "Almog", "email": "almog@example.com" }],
  "license": "MIT",
  "keywords": ["csv", "data", "analysis", "statistics"],
  "category": "data",
  "urls": {
    "repository": "https://github.com/almog/csv-analyzer"
  },
  "dependencies": {
    "pip": ["pandas>=2.0", "matplotlib>=3.7"]
  }
}
```

### Company skill (private, multiple authors):

```json
{
  "name": "@acme/quarterly-report",
  "version": "3.1.0",
  "description": "Generate quarterly business reports in ACME brand format with financial charts and executive summary.",
  "private": false,
  "authors": [
    { "name": "Data Team", "email": "data@acme.com" },
    { "name": "Alice Chen", "email": "alice@acme.com" },
    { "name": "Bob Rodriguez", "email": "bob@acme.com" }
  ],
  "maintainers": [{ "name": "Charlie Kim", "email": "charlie@acme.com" }],
  "license": "Proprietary",
  "category": "writing",
  "agents": {
    "platforms": ["claude-code", "cursor", "copilot", "*"],
    "requires_tools": ["bash", "file_read", "file_write"]
  },
  "dependencies": {
    "skills": {
      "@acme/branding": "^2.0.0",
      "pdf": "^1.0.0"
    },
    "pip": ["plotly>=5.0", "python-docx>=1.0"]
  }
}
```

### Complex skill (all fields):

```json
{
  "name": "full-stack-scaffold",
  "version": "2.0.0",
  "description": "Scaffold a full-stack web application with React frontend, FastAPI backend, PostgreSQL database, and Docker deployment. Use when the user says 'create an app', 'scaffold a project', 'new web app', or 'full stack'.",
  "authors": [
    { "name": "Almog", "email": "almog@example.com", "url": "https://almog.dev" },
    { "name": "Dana", "email": "dana@example.com" }
  ],
  "maintainers": [{ "name": "Almog", "email": "almog@example.com" }],
  "license": "Apache-2.0",
  "keywords": ["scaffold", "react", "fastapi", "docker", "fullstack", "webapp", "template"],
  "category": "code",
  "private": false,
  "urls": {
    "homepage": "https://fullstack-scaffold.dev",
    "repository": "https://github.com/almog/full-stack-scaffold",
    "issues": "https://github.com/almog/full-stack-scaffold/issues",
    "documentation": "https://fullstack-scaffold.dev/docs",
    "changelog": "https://github.com/almog/full-stack-scaffold/blob/main/CHANGELOG.md",
    "funding": "https://github.com/sponsors/almog"
  },
  "agents": {
    "platforms": ["claude-code", "cursor", "codex"],
    "requires_tools": ["bash", "file_read", "file_write", "file_edit"],
    "min_context": "standard",
    "requires_network": true,
    "requires_mcp": []
  },
  "dependencies": {
    "skills": {
      "frontend-design": "^1.0.0"
    },
    "pip": ["fastapi>=0.100", "uvicorn>=0.20", "sqlalchemy>=2.0"],
    "npm": ["react@^18", "vite@^5"],
    "system": ["docker", "docker-compose"]
  },
  "security": {
    "sandboxed": true,
    "network_access": true,
    "filesystem_scope": ["$WORKDIR", "$OUTPUTS"]
  },
  "files": {
    "include": ["SKILL.md", "scripts/", "templates/", "references/"],
    "exclude": ["tests/", "evals/", "*.pyc", "__pycache__/"]
  },
  "$schema": "https://spm.dev/schemas/manifest-v1.json",
  "spm": {
    "manifest_version": 1
  }
}
```

---

## Key Design Decisions

### Why only 3 required fields?

npm requires 2 (name, version). PyPI requires 2 (name, version). We add description because it's the trigger mechanism — without it, agents can't find your skill. But we don't force author, license, keywords, etc. because:

- Many authors just want to share a quick skill
- Company skills don't need public author info
- License can be "unspecified" — it's the author's choice
- Keywords help but aren't critical for basic functionality

### Why `authors` as an array (not singular `author`)?

npm has `author` (string or object) + `contributors` (array) — confusing.
PyPI has `authors` (array) + `maintainers` (array) — cleaner.
SPM uses `authors` (array) because:

- Skills are often built by teams
- First entry is primary author (display order matters)
- No need for a separate `contributors` field — just add them to `authors`
- `maintainers` is a separate optional field for when the current maintainer differs from the original author

### Why `private` field?

Borrowed from npm. Companies create skills for internal use. Without `private: true`, someone might accidentally run `spm publish` and push an internal skill to the public registry. This is a safety net.

### Why `urls` instead of separate `homepage`/`repository`/`bugs`?

PyPI uses `urls` as a flexible object. npm has separate `homepage`, `repository`, `bugs` fields. The `urls` approach is cleaner — one place for all links, easy to extend without changing the schema.

### Why `funding` in urls?

npm added `funding` and it's been well-received. For SPM where we want to support the tip/sponsor ecosystem, making the funding link easy to set drives the sponsorship feature.

### Why `agents` namespace instead of flat fields?

Groups agent-platform-specific fields together. This cleanly separates distribution metadata (name, version, description) from agent-runtime metadata (platforms, tools, context size). As more platforms adopt the Agent Skills standard, having a dedicated namespace keeps the manifest organized.

### Why `files.include/exclude` instead of just `.spmignore`?

Both work. The manifest approach is explicit and visible. `.spmignore` is implicit. Having both gives authors flexibility — use whichever is more convenient. When both exist, they're merged (manifest include + spmignore exclude).

### Circular Dependencies

Skills don't call each other at runtime — agents read them all independently. So circular deps wouldn't break the agent, but they would break the installer (infinite resolution loop). SPM handles this simply: `spm validate` and `spm publish` run a DFS cycle check on the dependency graph. If A depends on B and B depends on A, publish is blocked with a clear message. No special handling needed beyond detection.
