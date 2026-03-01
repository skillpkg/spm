# SPM — Skills Package Manager for Agent Skills

## A Complete Architecture for Skill Discovery, Distribution, and Trust

---

## 1. Vision & Problem Statement

The Agent Skills ecosystem today is powerful but fragmented. Skills live as local directories, are shared manually as `.skill` files, and have no discovery, versioning, trust, or dependency mechanisms across the 37+ agent platforms that support them. SPM bridges this gap — turning skills from local files into a managed ecosystem.

**Core goals:**

- Any developer can create, publish, and share skills
- Any agent user can discover, install, and update skills with confidence
- Skills are versioned, signed, and scanned for security
- Agents themselves can search and install skills dynamically via MCP
- The ecosystem is open but trust is verifiable

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        SPM Ecosystem                        │
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  CLI      │    │  Registry    │    │  MCP Server      │   │
│  │  spm      │◄──►│  (API +     │◄──►│  (skill-search)  │   │
│  │           │    │   Storage)   │    │                  │   │
│  └─────┬────┘    └──────┬───────┘    └────────┬─────────┘   │
│        │               │                      │             │
│        ▼               ▼                      ▼             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Vercel   │    │  Security    │    │  Agent           │   │
│  │  skills   │    │  Pipeline    │    │  Platforms       │   │
│  │  CLI      │    │  (3-layer)   │    │  (37+ agents)    │   │
│  │  (linking)│    └──────────────┘    └──────────────────┘   │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Map

| Component             | Role                                              | Tech Stack                                          |
| --------------------- | ------------------------------------------------- | --------------------------------------------------- |
| **CLI (`spm`)**       | Install, publish, search, update skills           | TypeScript, Commander.js                            |
| **Registry API**      | Central catalog, storage, auth                    | Hono + Neon Postgres + Cloudflare R2                |
| **MCP Server**        | Lets agents search/install skills in-conversation | MCP protocol over SSE/stdio                         |
| **Security Pipeline** | 3-layer content scanning + code analysis          | Regex patterns, ProtectAI DeBERTa, Lakera Guard API |
| **Package Signing**   | Keyless signing & verification                    | sigstore-js (@sigstore/sign, @sigstore/verify)      |
| **Agent Linking**     | Link skills to 37+ agent platforms                | Vercel `skills` CLI (npx skills add)                |
| **Web UI**            | Browse, rate, review skills                       | Astro or Next.js                                    |
| **Local Store**       | Installed skills on disk                          | `~/.spm/` directory structure                       |
| **Name Protection**   | Anti-squatting detection                          | string-similarity, confusables npm packages         |

---

## 3. The `.skl` Package Format

### 3.1 Why Not `.skill`?

The existing `.skill` format from `package_skill.py` is essentially a renamed tarball with no metadata envelope. `.skl` extends this with a structured manifest, signature block, and integrity checksums.

### 3.2 File Structure

```
my-skill-1.2.0.skl
│
├── manifest.json          # Package metadata (required)
├── SKILL.md               # Core skill instructions (required)
├── provenance.sigstore    # Sigstore bundle (keyless signing via GitHub OIDC)
├── checksums.sha256       # Integrity hashes for all files
│
├── scripts/               # Executable code (optional)
│   ├── main.py
│   └── helpers/
│
├── references/            # Documentation loaded on demand (optional)
│   ├── api-guide.md
│   └── examples.md
│
├── assets/                # Templates, fonts, icons (optional)
│   ├── template.docx
│   └── logo.png
│
├── tests/                 # Test cases for the skill (optional but encouraged)
│   ├── eval.json
│   └── fixtures/
│
└── LICENSE                # License file (recommended)
```

### 3.3 `manifest.json` Schema

```json
{
  "$schema": "https://spm.dev/schemas/manifest-v1.json",
  "name": "data-viz",
  "version": "1.2.0",
  "description": "Create publication-quality charts and dashboards from data files. Triggers on: data visualization, chart creation, dashboard, plot, graph, histogram, scatter plot.",
  "author": {
    "name": "Almog",
    "email": "almog@example.com",
    "url": "https://github.com/almog"
  },
  "license": "MIT",
  "keywords": ["charts", "visualization", "dashboard", "plotly", "d3"],
  "category": "data",
  "agents": {
    "min_context": "standard",
    "requires_tools": ["bash", "file_write", "file_read"],
    "requires_network": false,
    "platforms": ["claude-code", "cursor", "copilot", "codex", "*"]
  },
  "dependencies": {
    "skills": {
      "frontend-design": ">=1.0.0"
    },
    "system": {
      "python": ">=3.10",
      "pip_packages": ["plotly", "pandas", "matplotlib"]
    }
  },
  "files": {
    "entry": "SKILL.md",
    "scripts": ["scripts/main.py", "scripts/helpers/utils.py"],
    "references": ["references/api-guide.md"],
    "assets": ["assets/template.docx"]
  },
  "security": {
    "sandboxed": true,
    "network_access": false,
    "filesystem_scope": ["$WORKDIR", "$OUTPUTS"],
    "no_exec_from_user_input": true
  },
  "repository": "https://github.com/almog/spm-data-viz",
  "publishedAt": "2026-02-27T10:00:00Z",
  "checksum": "sha256:a1b2c3d4..."
}
```

### 3.4 Versioning

SPM uses **Semantic Versioning (semver)**:

- **MAJOR** (2.0.0) — Breaking changes to skill behavior or interface
- **MINOR** (1.3.0) — New capabilities, backward compatible
- **PATCH** (1.2.1) — Bug fixes, prompt improvements, typo corrections

Version resolution rules:

- `"frontend-design": ">=1.0.0"` — Any version 1.0.0 or higher
- `"frontend-design": "~1.2.0"` — Patch-level changes only (1.2.x)
- `"frontend-design": "^1.2.0"` — Minor-level changes (1.x.x)

Lock file (`skills-lock.json`) pins exact versions for reproducibility, lives next to `skills.json` in the project root.

---

## 4. The Registry

### 4.1 Overview

The registry is the central hub — a searchable catalog of published skills with metadata, download counts, ratings, and trust signals.

### 4.2 API Design

Full API specification: **spm-registry-api.md**

Base URL: `https://registry.spm.dev/api/v1`

```
Auth:
  POST /auth/device-code             # Start GitHub OAuth device flow
  POST /auth/token                   # Poll for token
  GET  /auth/whoami                  # Current user
  POST /auth/logout                  # Revoke token

Skills:
  GET    /skills                     # Search/list (public)
  GET    /skills/:name               # Skill metadata (public)
  GET    /skills/:name/:version      # Version metadata (public)
  GET    /skills/:name/:version/download  # Download .skl → R2 redirect
  POST   /skills                     # Publish (auth)
  DELETE /skills/:name/:version      # Yank (auth)
  PATCH  /skills/:name               # Update metadata (auth)

Discovery:
  GET  /categories                   # List categories + counts
  POST /categories/classify          # LLM category suggestion
  GET  /trending                     # Trending skills (cached)
  POST /resolve                      # Batch resolve names → URLs

Reviews:
  GET  /skills/:name/reviews         # List reviews
  POST /skills/:name/reviews         # Submit review (auth)

Authors:
  GET /authors/:username             # Public profile
  GET /authors/:username/stats       # Dashboard stats (auth, own only)

Reports:
  POST /skills/:name/report          # Report a skill

Admin:
  GET   /admin/queue                 # Flagged skills
  POST  /admin/queue/:id/approve     # Approve flagged
  POST  /admin/queue/:id/reject      # Reject flagged
  GET   /admin/skills                # All skills + internal metadata
  POST  /admin/skills/:name/yank     # Admin yank
  GET   /admin/users                 # User list
  PATCH /admin/users/:username/trust # Change trust tier
  GET   /admin/reports               # Report queue
  PATCH /admin/reports/:id           # Update report
  GET   /admin/errors                # Aggregated CLI errors
  PATCH /admin/errors/:id            # Update error status
  GET   /admin/stats                 # Dashboard stats

Health:
  GET /health                        # Internal health check
  GET /status                        # Public status
```

### 4.3 Search & Discovery

```
GET /skills?q=chart+visualization&category=data-viz&sort=downloads&trust=verified

Response:
{
  "results": [
    {
      "name": "data-viz",
      "version": "1.2.3",
      "description": "Charts, dashboards, and visualizations...",
      "author": { "username": "almog", "trust_tier": "verified" },
      "category": "data-viz",
      "tags": ["charts", "plotly", "d3"],
      "downloads": 12400,
      "weekly_downloads": 1200,
      "rating_avg": 4.8,
      "signed": true
    }
  ],
  "total": 47,
  "page": 1,
  "per_page": 20,
  "pages": 3
}
```

Search supports:

- **Full-text** on name, description, tags (Postgres GIN index)
- **Category filtering** — closed list of 10 categories
- **Trust filters** — minimum trust tier
- **Sort** — relevance, downloads, rating, updated, new
- **Platform filters** — `all`, `claude-code`, `cursor`, `codex`, etc.

### 4.4 Storage Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  PostgreSQL   │     │     S3       │     │   Redis      │
│  (Neon)      │     │ (Cloudflare  │     │              │
│              │     │     R2)      │     │  - search    │
│  - skills    │     │              │     │    cache     │
│  - versions  │     │  - .skl      │     │  - download  │
│  - users     │     │    packages  │     │    counts    │
│  - reviews   │     │  - .sigstore │     │  - rate      │
│  - downloads │     │    bundles   │     │    limiting  │
│  - audit_log │     │              │     │              │
│  - scans     │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 4.5 Database Schema (Neon Postgres)

```sql
-- ── Category enum (closed list, LLM-suggested at publish) ──

CREATE TYPE skill_category AS ENUM (
  'documents',      -- PDF, DOCX, PPTX, XLSX, text processing
  'data-viz',       -- Charts, dashboards, CSV/JSON, analytics
  'frontend',       -- UI, React, HTML/CSS, design systems
  'backend',        -- API, GraphQL, REST, database, migrations
  'infra',          -- Docker, CI/CD, deploy, cloud, IaC
  'testing',        -- Test generation, coverage, benchmarks
  'code-quality',   -- Linting, standards, review, refactoring
  'security',       -- Auth, encryption, vulnerability scanning
  'productivity',   -- Git, terminal, workflow automation
  'other'           -- Doesn't fit above categories
);

CREATE TYPE trust_tier AS ENUM (
  'registered',     -- Published, no verification
  'scanned',        -- Passed all security scan layers
  'verified',       -- Scanned + verified author (GitHub linked, 6mo active)
  'official'        -- Anthropic or SPM-maintained skills
);

CREATE TYPE scan_status AS ENUM (
  'pending',        -- Queued for scan
  'passed',         -- All layers passed
  'flagged',        -- Held for manual review
  'blocked',        -- Failed, not published
  'manual_approved' -- Flagged then approved by reviewer
);

-- ── Users ──

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,          -- display name, kebab-case
  github_id     TEXT UNIQUE,                   -- GitHub OAuth subject
  github_login  TEXT,                          -- GitHub username
  email         TEXT,
  trust_tier    trust_tier NOT NULL DEFAULT 'registered',
  role          TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_github ON users(github_id);

-- ── Skills (one row per skill, not per version) ──

CREATE TABLE skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT UNIQUE NOT NULL,          -- kebab-case, globally unique
  owner_id      UUID NOT NULL REFERENCES users(id),
  category      skill_category NOT NULL,
  description   TEXT NOT NULL,                 -- short, from manifest
  repository    TEXT,                          -- GitHub URL
  license       TEXT DEFAULT 'MIT',
  deprecated    BOOLEAN NOT NULL DEFAULT false,
  deprecated_msg TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_owner ON skills(owner_id);

-- Full-text search index on name + description
ALTER TABLE skills ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', name), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;
CREATE INDEX idx_skills_search ON skills USING GIN(search_vector);

-- ── Versions (one row per published version) ──

CREATE TABLE versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id      UUID NOT NULL REFERENCES skills(id),
  version       TEXT NOT NULL,                 -- semver string
  version_major INT NOT NULL,
  version_minor INT NOT NULL,
  version_patch INT NOT NULL,
  manifest      JSONB NOT NULL,                -- full manifest.json snapshot
  readme_md     TEXT,                          -- SKILL.md content for display
  size_bytes    INT,
  checksum_sha256 TEXT NOT NULL,               -- hex-encoded SHA256 of .skl
  skl_storage_key TEXT NOT NULL,               -- R2 object key for .skl file
  sigstore_bundle_key TEXT,                    -- R2 object key for .sigstore
  signer_identity TEXT,                        -- e.g. "almog@github"
  yanked        BOOLEAN NOT NULL DEFAULT false,
  yank_reason   TEXT,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(skill_id, version)
);

CREATE INDEX idx_versions_skill ON versions(skill_id);
CREATE INDEX idx_versions_published ON versions(published_at DESC);

-- ── Tags (free-form, author-defined) ──

CREATE TABLE skill_tags (
  skill_id      UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  tag           TEXT NOT NULL,                 -- lowercase, no spaces
  PRIMARY KEY (skill_id, tag)
);

CREATE INDEX idx_tags_tag ON skill_tags(tag);

-- ── Platform support ──

CREATE TABLE skill_platforms (
  skill_id      UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,                 -- 'all', 'claude-code', 'cursor', etc.
  PRIMARY KEY (skill_id, platform)
);

-- ── Security scans (one per version per layer) ──

CREATE TABLE scans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id    UUID NOT NULL REFERENCES versions(id),
  layer         INT NOT NULL,                  -- 1=pattern, 2=ML, 3=Lakera
  status        scan_status NOT NULL,
  confidence    REAL,                          -- ML confidence score (0.0-1.0)
  details       JSONB,                         -- matched patterns, flagged sections
  scanned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(version_id, layer)
);

-- ── Download tracking ──

CREATE TABLE downloads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id    UUID NOT NULL REFERENCES versions(id),
  user_id       UUID REFERENCES users(id),     -- null for anonymous
  ip_hash       TEXT,                          -- hashed IP for dedup, not stored raw
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_downloads_version ON downloads(version_id);
CREATE INDEX idx_downloads_time ON downloads(downloaded_at DESC);

-- Materialized view for download counts (refreshed periodically)
CREATE MATERIALIZED VIEW download_counts AS
  SELECT
    v.skill_id,
    v.id AS version_id,
    COUNT(*) AS total_downloads,
    COUNT(*) FILTER (WHERE d.downloaded_at > now() - interval '7 days') AS weekly_downloads
  FROM downloads d
  JOIN versions v ON v.id = d.version_id
  GROUP BY v.skill_id, v.id;

-- ── Reviews / ratings ──

CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id      UUID NOT NULL REFERENCES skills(id),
  user_id       UUID NOT NULL REFERENCES users(id),
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(skill_id, user_id)  -- one review per user per skill
);

-- Aggregate rating on skills table for fast reads
ALTER TABLE skills ADD COLUMN rating_avg   REAL DEFAULT 0;
ALTER TABLE skills ADD COLUMN rating_count INT DEFAULT 0;

-- ── Audit log (immutable) ──

CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID REFERENCES users(id),     -- null for system actions
  action        TEXT NOT NULL,                 -- 'publish', 'yank', 'deprecate', 'scan_flag', etc.
  skill_id      UUID REFERENCES skills(id),
  version_id    UUID REFERENCES versions(id),
  details       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_skill ON audit_log(skill_id);
CREATE INDEX idx_audit_time ON audit_log(created_at DESC);

-- ── Publish attempts (for tracking blocked/failed publishes) ──

CREATE TABLE publish_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  skill_name    TEXT NOT NULL,
  version       TEXT NOT NULL,
  status        TEXT NOT NULL,                 -- 'success', 'blocked', 'held'
  block_reasons JSONB,                         -- array of scan findings
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_publish_user ON publish_attempts(user_id);

-- ── Bridge tracking (imported skills from GitHub/skills.sh) ──

CREATE TABLE bridge_skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id      UUID NOT NULL REFERENCES skills(id),
  source        TEXT NOT NULL,               -- 'github', 'npm', 'skillssh'
  source_repo   TEXT NOT NULL,               -- 'vercel-labs/agent-skills'
  source_path   TEXT,                        -- 'skills/web-design-guidelines'
  source_commit TEXT,                        -- latest synced commit SHA
  source_branch TEXT DEFAULT 'main',
  last_synced   TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_status   TEXT DEFAULT 'active',       -- 'active', 'stale', 'gone'
  claimed       BOOLEAN NOT NULL DEFAULT false,
  claimed_by    UUID REFERENCES users(id),
  claimed_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bridge_source ON bridge_skills(source_repo);
CREATE INDEX idx_bridge_skill ON bridge_skills(skill_id);
```

### 4.6 Categories (Closed List)

Categories are a **controlled vocabulary** — 10 values, managed as a Postgres enum. New categories require a schema migration.

Authors choose a category at `spm init`, then LLM verifies/suggests at `spm publish` (hybrid approach — see Authoring Flow doc for details). Tags remain free-form for search.

| Category       | Display Name         | What it covers                           |
| -------------- | -------------------- | ---------------------------------------- |
| `documents`    | Documents            | PDF, DOCX, PPTX, XLSX, text processing   |
| `data-viz`     | Data & Visualization | Charts, dashboards, CSV/JSON, analytics  |
| `frontend`     | Frontend             | UI, React, HTML/CSS, design systems      |
| `backend`      | Backend              | API, GraphQL, REST, database, migrations |
| `infra`        | Infrastructure       | Docker, CI/CD, deploy, cloud, IaC        |
| `testing`      | Testing              | Test generation, coverage, benchmarks    |
| `code-quality` | Code Quality         | Linting, standards, review, refactoring  |
| `security`     | Security             | Auth, encryption, vulnerability scanning |
| `productivity` | Productivity         | Git, terminal, workflow automation       |
| `other`        | Other                | Doesn't fit above categories             |

---

## 5. The CLI (`spm`)

### 5.1 Core Commands

```bash
# Discovery
spm search "data visualization"
spm info data-viz
spm list                            # List installed skills
spm list --outdated                 # Show skills with updates

# Installation
spm install data-viz                # Latest version
spm install data-viz@1.2.0          # Specific version
spm install data-viz --global       # System-wide
spm install ./my-skill.skl          # From local file
spm install github:almog/data-viz   # From GitHub

# Management
spm update data-viz                 # Update to latest compatible
spm update --all                    # Update everything
spm uninstall data-viz
spm lock                            # Generate spm.lock

# Publishing
spm init                            # Scaffold a new skill
spm validate                        # Check manifest + structure
spm pack                            # Build .skl without publishing
spm publish                         # Publish to registry
spm publish --dry-run               # Validate without publishing

# Security
spm audit                           # Scan installed skills
spm verify data-viz                 # Verify signature
spm sign                            # Sign with your key

# Account
spm login
spm logout
spm whoami
spm token create
```

### 5.2 Local File System

```
~/.spm/
├── config.json                     # CLI configuration
├── credentials.json                # Auth tokens (encrypted)
├── cache/                          # Downloaded .skl cache
│   └── data-viz-1.2.0.skl
├── skills/                         # Installed skills
│   ├── data-viz/
│   │   ├── 1.2.0/
│   │   │   ├── manifest.json
│   │   │   ├── SKILL.md
│   │   │   ├── scripts/
│   │   │   └── ...
│   │   └── current -> 1.2.0       # Symlink to active version
│   └── frontend-design/
│       └── ...
├── spm.lock                        # Locked dependency versions
└── keys/                           # Trusted public keys
    └── trusted-publishers.gpg
```

### 5.3 Integration with Agent Skill Loading

When a skill is installed via SPM, it needs to be available to the user's agents. This is handled by Vercel's open-source skills CLI, which supports 37+ agent platforms:

```bash
# SPM downloads + scans, then delegates linking to Vercel's CLI
spm install data-viz
# Internally runs: npx skills add ~/.spm/skills/data-viz/current/ -a '*' -y
# Creates symlinks in:
#   ~/.claude/skills/data-viz/    (Claude Code)
#   ~/.cursor/skills/data-viz/    (Cursor)
#   ~/.agents/skills/data-viz/    (canonical location)
```

SPM does not maintain its own agent detection logic — Vercel's CLI handles all platform-specific directory conventions, symlinks, and edge cases.

---

## 6. MCP Server for Skill Search

### 6.1 Purpose

This is where it gets exciting. An MCP server lets **agents themselves** search for and recommend skills mid-conversation. When a user asks their agent to do something and no installed skill matches, the agent can query the SPM registry through MCP.

### 6.2 MCP Server Spec

```typescript
// MCP Server: spm-registry
// Transport: SSE or stdio

// Tools exposed to agents:
{
  tools: [
    {
      name: 'spm_search',
      description: 'Search the SPM registry for skills that match a task',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language or keywords' },
          category: { type: 'string', enum: [...categories] },
          verified_only: { type: 'boolean', default: true },
          limit: { type: 'number', default: 5 },
        },
        required: ['query'],
      },
    },
    {
      name: 'spm_info',
      description: 'Get detailed info about a specific skill package',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
        },
        required: ['name'],
      },
    },
    {
      name: 'spm_install',
      description: 'Install a skill from the registry (requires user confirmation)',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
        },
        required: ['name'],
      },
    },
    {
      name: 'spm_installed',
      description: 'List currently installed skills',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}
```

### 6.3 Agent Workflow with MCP

```
User: "Can you create an advanced Gantt chart from my project CSV?"

Agent's thinking:
  1. No installed skill matches "Gantt chart" specifically
  2. → Call spm_search({ query: "gantt chart project management" })
  3. ← Results: "project-gantt v2.1.0" (verified, 4.8★, 3.2k downloads)
  4. → Suggest to user: "I found a skill called project-gantt that
       specializes in this. Want me to install it?"
  5. User: "Yes"
  6. → Call spm_install({ name: "project-gantt" })
  7. → Read the installed SKILL.md
  8. → Execute using the skill's instructions
```

### 6.4 MCP Server Implementation

```python
# spm_mcp_server.py (simplified)
from mcp.server import Server
from mcp.types import Tool, TextContent
import httpx

app = Server("spm-registry")
REGISTRY_URL = "https://registry.spm.dev/api/v1"

@app.tool()
async def spm_search(query: str, category: str = None,
                     verified_only: bool = True, limit: int = 5):
    """Search the SPM registry for skills"""
    params = {"q": query, "limit": limit, "verified": verified_only}
    if category:
        params["category"] = category

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{REGISTRY_URL}/skills", params=params)
        results = resp.json()["results"]

    formatted = []
    for skill in results:
        trust = []
        if skill["verified"]: trust.append("✓ verified")
        if skill["signed"]: trust.append("✓ signed")

        formatted.append(
            f"**{skill['name']}** v{skill['version']} "
            f"({skill['rating']}★, {skill['downloads']} downloads)\n"
            f"  {skill['description']}\n"
            f"  Trust: {', '.join(trust)}\n"
            f"  Author: {skill['author']}"
        )

    return TextContent(text="\n\n".join(formatted) if formatted
                       else "No skills found matching your query.")

@app.tool()
async def spm_install(name: str, version: str = "latest"):
    """Install a skill — requires user confirmation in the agent's flow"""
    # Download, verify signature, scan, extract to skill path
    # Returns installation result
    ...
```

---

## 7. Web UI — Skill Marketplace

### 7.1 Core Pages

| Page               | Purpose                                                            |
| ------------------ | ------------------------------------------------------------------ |
| **Home / Explore** | Featured skills, trending, categories, curated collections         |
| **Search Results** | Filtered, sorted list with trust badges                            |
| **Skill Detail**   | README, version history, reviews, install instructions, trust info |
| **Author Profile** | Published skills, verification status, contributor stats           |
| **Dashboard**      | (For publishers) Analytics, downloads, reviews, manage versions    |
| **Admin**          | (For SPM team) Moderation, flagged skills, security alerts         |

**Admin panel access model:**

- Runs on **separate domain**: `admin.spm.dev` (independent Cloudflare Pages deploy)
- Public site shows "Admin" nav link only when `GET /auth/whoami` returns `role: "admin"`
- Link opens `admin.spm.dev` in same tab — shared auth (same JWT works on both origins)
- First admin set manually in DB (`UPDATE users SET role = 'admin' WHERE username = '...'`)
- Subsequent admins promoted via admin panel or `PATCH /admin/users/:username/role`
- Admin routes enforce: JWT validity → JWT admin claim → DB role verification (defense-in-depth)
- All admin actions logged to immutable `audit_log` table

### 7.2 Skill Detail Page — Key Sections

```
┌─────────────────────────────────────────────────────┐
│  📦 data-viz v1.2.0                    [Install]    │
│  by @almog ✓ Verified Author                        │
│  ★★★★★ 4.7 (234 reviews)  |  12.4k downloads       │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ Badges:                                     │    │
│  │ [✓ Signed] [✓ Scanned] [✓ Verified Author] │    │
│  │ [Claude Code] [Cursor] [Copilot] [37+ agents] │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Tabs: [Overview] [Versions] [Dependencies]         │
│        [Reviews] [Security] [Changelog]             │
│                                                     │
│  Install:                                           │
│  ┌─────────────────────────────────────────────┐    │
│  │ $ spm install data-viz                      │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Overview:                                          │
│  Create publication-quality charts and dashboards   │
│  from CSV, JSON, and Excel data files...            │
│                                                     │
│  Dependencies:                                      │
│  ├── frontend-design >=1.0.0                        │
│  └── (system) python >=3.10, plotly, pandas         │
│                                                     │
│  Security Report:                                   │
│  Last scan: 2026-02-25 — No issues found            │
│  Permissions: filesystem (scoped), no network       │
│                                                     │
│  Weekly Downloads Chart:                            │
│  ▁▂▃▅▆▇█████▇▆▇████                                │
└─────────────────────────────────────────────────────┘
```

### 7.3 UI Components for Agent Platform Integration

The UI could also surface inside agent platforms themselves:

- **Skill suggestion cards** — When an agent finds a relevant skill via MCP, it renders a card in-chat with name, rating, trust badges, and an "Install" button
- **Installed skills panel** — A sidebar or settings section showing active skills
- **Skill marketplace tab** — Browse/search directly within the agent platform

---

## 8. How Agents Use Skills (Integration Deep Dive)

### 8.1 Current Behavior

Agent Skills follow the open standard (agentskills.io). Each agent platform loads skills slightly differently, but the core flow is the same:

1. All skill names + descriptions are available in the agent's context
2. When a user message matches a skill's description, the agent reads the `SKILL.md`
3. The agent follows the instructions in the SKILL.md to complete the task

Vercel's `skills` CLI links skills into each agent's expected directory. SPM calls it as a subprocess after downloading and scanning packages.

### 8.2 Enhanced Behavior with SPM

```
Message arrives from user
         │
         ▼
┌─────────────────────┐
│ Check installed      │
│ skills descriptions  │───── Match found ──────► Read SKILL.md
│ (linked to agent)    │                          and execute
└─────────┬───────────┘
          │
          │ No match
          ▼
┌─────────────────────┐
│ Call spm_search      │
│ via MCP              │───── Results found ────► Suggest to user
└─────────┬───────────┘                          "I found a skill
          │                                       that can help..."
          │ No results                                    │
          ▼                                               ▼
┌─────────────────────┐                          User approves
│ Handle with          │                                  │
│ built-in knowledge   │                                  ▼
│ (no skill needed)    │                          Install + execute
└─────────────────────┘
```

### 8.3 Skill Loading Optimization

With a growing ecosystem, you can't put all skill descriptions in the system prompt. SPM enables tiered loading:

- **Tier 1 — Always loaded**: User's installed skills (descriptions in system prompt)
- **Tier 2 — On-demand search**: Registry search via MCP when no installed skill matches
- **Tier 3 — Lazy load**: Skill body (SKILL.md) only read when actually triggered

### 8.4 Skill Execution Sandboxing

When an agent executes a skill's scripts:

```
Skill script execution:
  ├── Runs in the agent's existing environment
  ├── Filesystem access limited to manifest's declared scope
  ├── Network access: only if manifest declares it + user approves
  ├── No access to user data directories unless explicitly granted
  └── Execution timeout enforced
```

---

## 9. Security: Scanning & Trust

### 9.1 The Threat Model

Skills contain instructions and code that agents will execute. This creates attack vectors:

| Threat                   | Example                                           | Mitigation                                           |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------- |
| **Prompt injection**     | SKILL.md contains "ignore previous instructions"  | 3-layer detection: regex + ProtectAI ML + Lakera API |
| **Malicious code**       | Script exfiltrates data via `curl`                | Static analysis + network policy                     |
| **Supply chain**         | Popular skill gets compromised in update          | Sigstore signing + diff review                       |
| **Data exfiltration**    | Skill reads sensitive files and encodes in output | Filesystem scope enforcement                         |
| **Dependency confusion** | Skill claims false dependency to inject code      | Dependency resolution with checksums                 |
| **Name squatting**       | Typosquat or homoglyph of popular skill           | string-similarity + confusables detection            |
| **Social engineering**   | Skill description is benign, code is malicious    | Automated + manual review pipeline                   |

### 9.2 Security Scanning Pipeline

Every skill goes through this pipeline before appearing in the registry. SPM borrows proven tools for the heavy lifting:

```
Publish request
      │
      ▼
┌──────────────┐
│ 1. Structure │ Validate manifest.json, required files,
│    Validation │ file size limits, no suspicious paths
│              │ (Zod schemas, spm-shared)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 2. Content   │ 3-LAYER CONTENT SECURITY:
│    Security  │
│              │ Layer 1: Regex patterns (instant, local + server)
│              │   Custom JSON pattern file for known injections
│              │
│              │ Layer 2: ML classification (server-side)
│              │   ProtectAI/deberta-v3-base-prompt-injection-v2
│              │   Fine-tuned DeBERTa model, Apache 2.0
│              │   Runs via ONNX runtime, $0/month
│              │
│              │ Layer 3: Lakera Guard API (Phase 2+)
│              │   100+ languages, jailbreaks, PII detection
│              │   10k free requests/month
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 3. Static    │ AST analysis of all scripts:
│    Analysis  │ - Flag network calls (requests, curl, fetch)
│              │ - Flag filesystem access outside declared scope
│              │ - Flag eval(), exec(), subprocess with user input
│              │ - Flag obfuscated code patterns
│              │ - Flag encoded/encrypted payloads
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 4. Name      │ Anti-squatting checks:
│    Validation│ - string-similarity (Dice coefficient)
│              │ - fastest-levenshtein (edit distance)
│              │ - confusables (Unicode homoglyph detection)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 5. Signing   │ Sigstore keyless signing:
│   (sigstore- │ - @sigstore/sign for publish
│    js)       │ - @sigstore/verify for install
│              │ - Rekor transparency log
│              │ - Same infra npm uses for provenance
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 6. Diff      │ For updates to existing skills:
│    Review    │ - Highlight all changes from previous version
│              │ - Flag new permissions requested
│              │ - Flag new dependencies added
│              │ - Flag new network/filesystem access
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 6. Human     │ For first publish or flagged updates:
│    Review    │ - Manual review by SPM team
│   (if needed)│ - Required for "verified" badge
└──────┬───────┘
       │
       ▼
  Published ✓
```

### 9.3 Trust Tiers

```
┌─────────────────────────────────────────────────────────┐
│                     Trust Levels                         │
│                                                         │
│  🥇 Official          Maintained by Anthropic/SPM team  │
│     - Pre-installed, always trusted                     │
│     - Full manual review                                │
│                                                         │
│  🥈 Verified Author   Publisher identity confirmed       │
│     - GitHub/email verification                         │
│     - Track record of safe packages                     │
│     - Signed with registered key                        │
│                                                         │
│  🥉 Scanned           Passed automated pipeline          │
│     - No flagged issues                                 │
│     - Signed by author (any key)                        │
│                                                         │
│  ⚠️  Unverified        Published but not fully vetted     │
│     - User installs at own risk                         │
│     - Warning shown before install                      │
└─────────────────────────────────────────────────────────┘
```

### 9.4 Runtime Security Policies

Even after installation, skills operate under constraints:

```json
// Runtime policy (enforced by the agent's execution environment)
{
  "filesystem": {
    "read": ["$WORKDIR", "$SKILL_DIR"],
    "write": ["$WORKDIR", "$OUTPUTS"],
    "deny": ["$UPLOADS"] // unless user grants
  },
  "network": {
    "allowed": false, // default deny
    "exceptions": [] // declared in manifest, user-approved
  },
  "execution": {
    "timeout_seconds": 300,
    "max_memory_mb": 512,
    "no_background_processes": true
  }
}
```

---

## 10. Signed Skills — Authorized Contributors

### 10.1 Why Signing?

Signing ensures:

- **Integrity** — The package hasn't been tampered with since the author published it
- **Attribution** — You know who created it
- **Non-repudiation** — The author can't deny they published it
- **Supply chain security** — Compromised registry can't serve modified packages

### 10.2 Signing Flow (Sigstore — Keyless)

```
Author                          Sigstore/Fulcio            Registry            User
  │                                │                          │                  │
  │  1. spm publish               │                          │                  │
  │     (auto-signs)              │                          │                  │
  │     ─────────────────────────►│                          │                  │
  │     OIDC token (GitHub/Google)│                          │                  │
  │                                │                          │                  │
  │  2. Fulcio issues ephemeral  │                          │                  │
  │     signing certificate       │                          │                  │
  │     ◄─────────────────────────│                          │                  │
  │                                │                          │                  │
  │  3. Sign .skl with ephemeral │                          │                  │
  │     key, record in Rekor     │──► Rekor log entry       │                  │
  │     ──────────────────────────────────────────────────►  │                  │
  │     .skl + sigstore bundle    │  4. Verify signature     │                  │
  │                                │     via @sigstore/verify │                  │
  │                                │                          │                  │
  │                                │  5. Store .skl + bundle  │                  │
  │                                │                          │  spm install ◄───│
  │                                │                          │─────────────────►│
  │                                │                          │  6. Send .skl +  │
  │                                │                          │     bundle       │
  │                                │                          │                  │
  │                                │                          │  7. User's spm   │
  │                                │                          │     verifies via │
  │                                │                          │     Rekor log ◄──│
  │                                │                          │                  │
  │                                │                          │  ✓ Valid ────────│
```

No key management required — authors authenticate via GitHub/Google OIDC. Signing keys are ephemeral (created per-publish, discarded after). Verification uses the Rekor transparency log.

### 10.3 Implementation: sigstore-js

SPM uses `@sigstore/sign` and `@sigstore/verify` — the same libraries npm uses for package provenance.

| Component          | Package                 | Purpose                                  |
| ------------------ | ----------------------- | ---------------------------------------- |
| `@sigstore/sign`   | Sign .skl packages      | Keyless signing via OIDC identity        |
| `@sigstore/bundle` | Create sigstore bundles | Bundle cert + signature + Rekor entry    |
| `@sigstore/verify` | Verify on install       | Check signature + Rekor log + cert chain |

**Why Sigstore over alternatives:**

| Approach                                 | Pros                                     | Cons                                           |
| ---------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| **GPG signatures**                       | Well-established                         | Complex key management, users forget passwords |
| **~~Sigstore / Cosign~~** → **Sigstore** | Keyless, OIDC identity, transparency log | ~~Newer~~ Now used by npm + PyPI               |
| **TUF**                                  | Designed for package managers            | Complex to implement, overkill for Phase 1     |

### 10.4 Signature Verification

```bash
# During spm install:
$ spm install data-viz

Downloading data-viz@1.2.0...
Verifying signature...
  ✓ Signed by: almog@example.com
  ✓ Identity: github.com/almog (via Sigstore OIDC)
  ✓ Logged in Rekor transparency log
  ✓ Checksum matches: sha256:a1b2c3d4...
Installing to ~/.spm/skills/data-viz/1.2.0/

# Manual verification:
$ spm verify data-viz
Package: data-viz@1.2.0
Signed: 2026-02-27T10:00:00Z
Signer: almog@example.com (GitHub OIDC)
Rekor entry: https://rekor.sigstore.dev/api/v1/log/entries/...
Checksum: sha256:a1b2c3d4... ✓ matches
Status: ✓ VALID
```

---

## 11. Open Issues & Challenges

### 11.1 Technical Challenges

| Issue                     | Details                                                              | Possible Approach                                                               |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **System prompt bloat**   | Hundreds of installed skills = enormous `<available_skills>` section | Tiered loading: only top-N by usage, MCP search for the rest                    |
| **Skill conflicts**       | Two skills trigger on the same description keywords                  | Priority system, user-configurable ordering, conflict detection at install      |
| **Dependency hell**       | Skill A needs frontend-design@1.x, skill B needs @2.x                | Allow multiple versions, isolated install like pnpm                             |
| **Cross-platform parity** | Skills behave differently across agent platforms                     | Platform compatibility matrix in manifest, conditional instructions in SKILL.md |
| **Offline usage**         | Registry not available, or air-gapped environments                   | Local-only mode, skill bundles, cached registry snapshots                       |
| **Skill update trust**    | A verified skill publishes a malicious update                        | Mandatory diff review for permission escalation, staged rollouts                |

### 11.2 Ecosystem Challenges

| Issue                          | Details                                     | Possible Approach                                                       |
| ------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------- |
| **Quality control**            | Low-quality skills flood the registry       | Minimum requirements (tests, docs), community ratings, curation         |
| **Discoverability**            | Users can't find the right skill            | Semantic search, agent-powered recommendations, curated collections     |
| **Monetization**               | How do skill authors get rewarded?          | Free tier + premium skills, tips/sponsorship, usage-based revenue share |
| **Governance**                 | Who decides what's allowed?                 | Open governance model, published policies, appeal process               |
| **Fragmentation**              | Multiple registries emerge                  | Default registry + ability to add custom registries (like npm scopes)   |
| **Prompt injection arms race** | Attackers find new ways to embed injections | Continuous scanning updates, bug bounty program, community reporting    |

### 11.3 Design Decisions (Resolved)

All previously open questions have been resolved. See `spm-open-questions-resolved.md` for full reasoning.

| Question                          | Decision                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| **Scope: global or per-project?** | Both. Global default, per-project with `skills.json` (npm model)                   |
| **Who can publish?**              | Open registration + security scan gate (npm model, not App Store)                  |
| **Skill forking**                 | Allow forks, namespaces (`@user/name`), optional `forked_from` attribution         |
| **Skill composition**             | Dependencies only, no "extends." Agents compose by reading multiple SKILL.md files |
| **Telemetry**                     | Anonymous install counts (automatic), trigger analytics (opt-in via MCP)           |
| **Pricing model**                 | Free for Phase 1-2. Explore premium tiers Phase 3+                                 |
| **Registry federation**           | Private registries Phase 1, federation protocol Phase 3                            |
| **ONNX vs HF API**                | ONNX runtime on server (zero external dependency, ~50-100ms per scan)              |
| **Fork Vercel CLI?**              | No. Subprocess call, pinned version                                                |
| **Index skills.sh Day 1?**        | All 200+ pre-launch (scanner tuning exercise)                                      |
| **Lock file coexistence**         | Project-local `skills-lock.json` next to `skills.json` (like package-lock.json)    |

---

## 12. Implementation Roadmap

With borrowed tools (Vercel skills CLI, ProtectAI DeBERTa, sigstore-js, etc.), the timeline compresses significantly.

### Phase 1 — MVP (Weeks 1-4)

- Define `.skl` format specification
- Build CLI core: `init`, `pack`, `install`, `list`, `validate`, `publish`
- Set up registry API (Hono + Neon + R2)
- 3-layer content security (regex patterns + ProtectAI DeBERTa)
- Package signing with sigstore-js (keyless, same as npm uses)
- Agent linking via Vercel `skills` CLI (37+ agents)
- npm bridge (import 90+ existing agent-skill packages)
- Name squatting protection (string-similarity + confusables)
- Postgres full-text search

### Phase 2 — Growth (Months 2-3)

- Reviews and ratings system
- Author analytics dashboard (trigger analytics = the moat)
- MCP server for agent-native skill discovery
- Lakera Guard Layer 3 integration (free tier)
- spm-onboard bulk import tool
- GitHub Actions for CI/CD publish
- skills.sh indexing (import 200+ skills with security scanning)

### Phase 3 — Ecosystem (Months 4-6)

- Web UI / marketplace (Astro or Next.js)
- Advanced search (Meilisearch if Postgres FTS isn't enough)
- Federation API for private registries
- 2FA for publishing (otpauth library)
- Pro tier analytics
- Curated collections and recommendations

### Phase 4 — Scale (Months 7+)

- Enterprise features (SSO, teams, audit logs)
- Regional mirrors
- Premium skills / monetization
- Advanced trigger analytics
- Custom-trained ML model (fine-tuned on SPM-specific data)

---

## 13. Example End-to-End Flow

```
=== Author: Creating and publishing a skill ===

$ mkdir gantt-chart && cd gantt-chart
$ spm init
  ✓ Created manifest.json
  ✓ Created SKILL.md (template)
  ✓ Created tests/eval.json

# ... author develops the skill ...

$ spm validate
  ✓ manifest.json valid
  ✓ SKILL.md present (247 lines)
  ✓ All declared files exist
  ✓ Dependencies resolvable
  ⚠ No LICENSE file (recommended)

$ spm publish
  Packing gantt-chart@1.0.0...
  Signing with sigstore (GitHub: almog)...
  Uploading to registry.spm.dev...
  Running security scan...
  ✓ Static analysis passed
  ✓ Prompt injection scan passed
  ✓ Published! https://spm.dev/skills/gantt-chart

=== User: Finding and using the skill ===

User (in agent): "Create a Gantt chart from my project timeline CSV"

Agent: [No installed skill matches]
Agent: [Calls spm_search via MCP: "gantt chart project timeline"]
Agent: "I found a skill called gantt-chart (4.8★, verified author)
         that specializes in creating Gantt charts from project data.
         Want me to install it?"

User: "Yes, go for it"

Agent: [Calls spm_install via MCP: "gantt-chart"]
Agent: [Reads newly installed SKILL.md]
Agent: [Follows skill instructions to process the CSV]
Agent: "Here's your Gantt chart! [renders output]"
```

---

## Appendix A: Prior Art & Inspiration

| System                 | What SPM borrows                                                    |
| ---------------------- | ------------------------------------------------------------------- |
| **npm**                | CLI UX, semver, package.json, registry API patterns                 |
| **PyPI/pip**           | Simple install flow, requirements/lock files                        |
| **Homebrew**           | Cask-like "tap" system for custom registries                        |
| **Docker Hub**         | Trust/verified publisher model, layer caching concept               |
| **VS Code Extensions** | Marketplace UI, ratings, categories, compatibility matrix           |
| **Sigstore**           | Keyless signing, transparency log                                   |
| **OpenAI GPTs Store**  | AI-tool marketplace concept, but SPM is code-first not config-first |

## Appendix B: Glossary

| Term                | Definition                                                                             |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Skill**           | A set of instructions + code that enhances an agent's capabilities for a specific task |
| **SKILL.md**        | The core instruction file agents read to understand how to use a skill                 |
| **`.skl`**          | The packaged, distributable format for a skill                                         |
| **SPM**             | Skills Package Manager — the CLI, registry, and ecosystem                              |
| **Manifest**        | `manifest.json` — metadata about a skill package                                       |
| **Verified Author** | A publisher whose identity has been confirmed                                          |
| **Signed**          | A package with a cryptographic signature proving authenticity (via Sigstore)           |
| **MCP**             | Model Context Protocol — how agents communicate with external tools                    |
