# SPM Way of Working

How we build SPM with Claude Code agent teams.

This file lives in the repo root. Claude reads it before every session.

---

## Repo Infrastructure

### 0.1 Pre-requisites (manual, one-time)

```bash
# 1. Create GitHub repo
gh repo create spm --public --clone
cd spm

# 2. Copy this plan + all spec docs into plans/
mkdir -p plan
# Copy all spm-*.md and spm-*.jsx files into plans/
```

### 0.2 Git Init + Config

```
spm/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .claude/
│   ├── skills/
│   │   └── spm-context/
│   │       └── SKILL.md
│   └── settings.json
├── packages/
│   ├── shared/
│   ├── api/
│   ├── cli/
│   └── web/
├── migrations/
├── docs/                    # All spec docs live here
│   ├── spm-architecture.md
│   ├── spm-registry-api.md
│   ├── spm-implementation-plan.md
│   └── ...                  # All 34 spec docs
├── CLAUDE.md
├── .gitignore
├── .prettierrc
├── .eslintrc.cjs
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### 0.3 .gitignore

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build output
dist/
.turbo/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local
.dev.vars

# Cloudflare
.wrangler/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
!.vscode/settings.json
.idea/

# Testing
coverage/

# Logs
*.log
```

### 0.4 CLAUDE.md

```markdown
# SPM — Skills Package Manager

A package manager for AI agent skills. Monorepo with four packages.

## Project Structure

- `packages/shared/` — Zod schemas, types, constants (imported by all other packages)
- `packages/api/` — Hono registry API (deploys to Cloudflare Workers)
- `packages/cli/` — `spm` CLI (publishes to npm)
- `packages/web/` — spm.dev React app (deploys to Cloudflare Pages)
- `migrations/` — Neon Postgres SQL migrations
- `docs/` — Full spec docs. READ THESE before implementing a feature.

## Stack

- Language: TypeScript everywhere
- Monorepo: pnpm workspaces + Turborepo
- API: Hono (Cloudflare Workers runtime)
- DB: Neon Postgres + Drizzle ORM
- Storage: Cloudflare R2
- CLI: commander.js + chalk + ora + tsup
- Web: React + Vite + Tailwind
- Validation: Zod (shared schemas)
- Auth: GitHub OAuth device flow → JWT
- Signing: Sigstore keyless (@sigstore/sign)

## Commands

- `pnpm install` — install all dependencies
- `pnpm build` — build all packages (turbo)
- `pnpm lint` — eslint across all packages
- `pnpm format` — prettier --write
- `pnpm typecheck` — tsc --noEmit across all packages
- `pnpm test` — vitest across all packages
- `pnpm test:watch` — vitest in watch mode

## Workflow

- Use conventional commits: `type(scope): description`
- Types: feat, fix, refactor, docs, test, chore, ci
- Scopes: shared, api, cli, web, migrations, docs
- Run `/ship` when done — it lints, formats, tests, commits, and pushes

## Code Style

- Strict TypeScript (no `any`, no `as` casts unless justified)
- Named exports, not default exports (except React components)
- Prefer `const` arrow functions
- Error handling: never swallow errors silently
- Imports: use `@spm/shared` workspace alias for shared package

## Architecture Rules

- All request/response types defined in `packages/shared/src/schemas.ts`
- API routes validate with Zod schemas from shared
- CLI imports validation schemas from shared
- DB schema lives in `packages/api/src/db/schema.ts` (Drizzle)
- SQL migrations in `migrations/` — never edit DB manually
- Categories, trust tiers, error codes are enums in shared

## Key Docs (read before implementing)

- `docs/spm-architecture.md` — system overview, DB schema
- `docs/spm-registry-api.md` — all API routes + request/response shapes
- `docs/spm-implementation-plan.md` — phase-by-phase build order
- `docs/spm-content-security.md` — 3-layer scanning pipeline
- `docs/spm-cli-output-design.md` — CLI output formatting
```

### 0.5 Claude Code Settings

`.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "permissions": {
    "allow": [
      "Bash(pnpm:*)",
      "Bash(turbo:*)",
      "Bash(npm:*)",
      "Bash(npx:*)",
      "Bash(git:*)",
      "Bash(mkdir:*)",
      "Bash(cat:*)",
      "Bash(ls:*)",
      "Bash(find:*)",
      "Bash(grep:*)",
      "Bash(wrangler:*)",
      "Bash(vitest:*)",
      "Bash(tsc:*)",
      "Bash(eslint:*)",
      "Bash(prettier:*)"
    ]
  }
}
```

### 0.6 Slash Commands

`/ship` is available globally — no repo-level copy needed. All teammates use `/ship` when their task is complete (lint → format → test → commit → push).

### 0.7 SPM Context Skill

`.claude/skills/spm-context/SKILL.md`:

```markdown
---
name: spm-context
description: Load SPM project context when working on any SPM feature. Use when implementing features, fixing bugs, or adding new functionality to the SPM monorepo.
---

Before implementing anything, check the relevant spec docs in `docs/`:

- For API routes: read `docs/spm-registry-api.md`
- For DB changes: read `docs/spm-architecture.md` (section 4.5)
- For CLI commands: read `docs/spm-cli-output-design.md`
- For security: read `docs/spm-content-security.md`
- For categories/enums: read `docs/spm-authoring-flow.md`

Always import types from `@spm/shared`. Never duplicate type definitions.
Run `pnpm typecheck` after making changes to shared schemas.
```

---

## Build Phases

### How it works

**Phases are sequential** — each phase depends on the previous phase's output. **Teammates within each phase are parallel** — that's the agent teams value.

```
Phase 1: shared ─┐
         infra ──┼── all 3 in parallel
       database ─┘
              ↓ depends on (schemas, DB, monorepo config)
Phase 2:   auth ─┐
     skills-crud ┼── all 3 in parallel
    api-scaffold ┘
              ↓ depends on (API routes exist)
Phase 3: search ────┐
     discovery ─────┼── all 4 in parallel
     analytics ─────┤
     mcp-server ────┘
              ↓ depends on (API is complete)
Phase 4: cli-core ──┐
          cli-read ──┼── all 3 in parallel
       cli-install ──┘
              ↓
Phase 5: cli-author ─┐
        cli-publish ──┘ 2 in parallel
              ↓
Phase 6: scan-layer1 ─┐
              signing ─┘ 2 in parallel (Layer 1 only — Layers 2-3 post-launch)
              ↓
Phase 7: web-public ──┐
      web-dashboard ──┼── 3 in parallel
         web-admin ───┘
              ↓
Phase 8: test-api ──┐
        test-cli ───┼── 3 in parallel
        test-e2e ───┘
```

Each phase = one agent team session. You start it, teammates work in parallel, `/ship` when done, merge to main, move to next phase.

### Phase 1 — Foundation

**Prompt to Claude Code:**

```
Create an agent team to set up the SPM monorepo foundation.

Read docs/spm-implementation-plan.md (Phase 1) and docs/spm-architecture.md
for full context.

Spawn 3 teammates:

1. "shared" — Set up packages/shared/:
   - package.json with @spm/shared name
   - src/schemas.ts: Zod schemas for Manifest, SearchParams, PublishRequest, ReviewRequest
   - src/categories.ts: canonical 10 categories with slugs, display names, icons
   - src/trust.ts: TrustTier enum, badge config
   - src/errors.ts: error codes + messages
   - src/index.ts: barrel export
   - tsconfig.json
   - vitest.config.ts + basic tests for schemas
   - src/fixtures/: first 10 seed skills as test data (manifest.json + SKILL.md each):
     code-review, test-gen, data-viz, api-design, git-workflow,
     docs-writer, security-audit, perf-optimize, db-migration, deploy-checklist
     These set quality expectations and serve as test fixtures for all later phases.

2. "infra" — Set up monorepo infrastructure:
   - Root package.json with pnpm workspaces
   - pnpm-workspace.yaml
   - turbo.json with pipeline (build, lint, test, typecheck)
   - Root tsconfig.json (base config)
   - .eslintrc.cjs (shared config)
   - .prettierrc
   - .github/workflows/ci.yml (lint + typecheck + test on PR)
   - Stub package.json in packages/api, packages/cli, packages/web

3. "database" — Set up database schema:
   - migrations/001_initial.sql with all tables from docs/spm-architecture.md section 4.5
   - packages/api/src/db/schema.ts (Drizzle schema matching SQL)
   - packages/api/src/db/index.ts (Neon serverless client setup)
   - packages/api/drizzle.config.ts

File ownership:
- "shared" owns packages/shared/**
- "infra" owns root configs, .github/**, turbo.json, pnpm-workspace.yaml, stub package.jsons
- "database" owns migrations/**, packages/api/src/db/**
```

### Phase 2 — Auth + CRUD API

```
Create an agent team to build the core API.

Read docs/spm-registry-api.md for all route specs.
Read docs/spm-architecture.md section 4.5 for DB schema.

Spawn 3 teammates:

1. "auth" — Build auth routes:
   - packages/api/src/routes/auth.ts: device-code, token, whoami, logout
   - packages/api/src/middleware/auth.ts: JWT authed + adminGuard
   - packages/api/src/middleware/cors.ts
   - Tests for auth flow
   File ownership: packages/api/src/routes/auth.ts, packages/api/src/middleware/**

2. "skills-crud" — Build skill routes:
   - packages/api/src/routes/skills.ts: POST /skills, GET /skills/:name, GET /:name/:version, DELETE /:name/:version, PATCH /:name
   - packages/api/src/routes/download.ts: GET /:name/:version/download (R2 presigned URL)
   - packages/api/src/services/r2.ts: R2 upload/download helpers
   - packages/api/src/services/names.ts: name validation, anti-squat
   - Tests for CRUD operations
   File ownership: packages/api/src/routes/skills.ts, packages/api/src/routes/download.ts, packages/api/src/services/**

3. "api-scaffold" — Build API framework:
   - packages/api/src/index.ts: Hono app, route mounting
   - packages/api/src/routes/index.ts: route aggregation
   - packages/api/wrangler.toml
   - packages/api/package.json with deps (hono, drizzle-orm, @neondatabase/serverless)
   - packages/api/tsconfig.json
   - Rate limiting middleware
   - Error handling middleware
   - Health endpoint
   File ownership: packages/api/src/index.ts, packages/api/src/routes/index.ts, packages/api/wrangler.toml, packages/api/package.json
```

### Phase 3 — Search + Discovery + MCP

```
Spawn 4 teammates:

1. "search" — Full-text search + categories:
   - Update packages/api/src/routes/skills.ts: add search query params, GIN index usage
   - packages/api/src/routes/categories.ts: GET /categories, POST /categories/classify
   - packages/api/src/services/search.ts: full-text search query builder
   File ownership: packages/api/src/routes/categories.ts, packages/api/src/services/search.ts

2. "discovery" — Trending + resolve + reviews:
   - packages/api/src/routes/trending.ts
   - packages/api/src/routes/resolve.ts
   - packages/api/src/routes/reviews.ts
   - packages/api/src/routes/authors.ts
   - packages/api/src/routes/reports.ts
   File ownership: packages/api/src/routes/trending.ts, resolve.ts, reviews.ts, authors.ts, reports.ts

3. "analytics" — Download tracking + caching:
   - packages/api/src/services/downloads.ts: event recording, dedup logic
   - packages/api/src/services/cache.ts: Cloudflare Cache API helpers
   - migrations/002_download_counts_view.sql: materialized view + refresh
   File ownership: packages/api/src/services/downloads.ts, packages/api/src/services/cache.ts, migrations/002*

4. "mcp-server" — MCP server for agent discovery:
   - packages/mcp/src/index.ts: MCP server (SSE + stdio transport)
   - packages/mcp/src/tools/search.ts: spm_search tool (wraps GET /skills?q=...)
   - packages/mcp/src/tools/info.ts: spm_info tool (wraps GET /skills/:name)
   - packages/mcp/src/tools/categories.ts: spm_categories tool
   - packages/mcp/package.json, tsconfig.json
   Read docs/spm-architecture.md section 6 for MCP server spec.
   File ownership: packages/mcp/**
```

### Phase 4 — CLI

```
Spawn 3 teammates:

1. "cli-core" — CLI framework + auth:
   - packages/cli/src/index.ts: commander.js setup, all subcommands registered
   - packages/cli/src/commands/login.ts, logout.ts, whoami.ts
   - packages/cli/src/config.ts: ~/.spm/config.toml management
   - packages/cli/src/api-client.ts: typed HTTP client using @spm/shared schemas
   - packages/cli/src/output.ts: chalk helpers, spinners, tables, verbosity modes
   - packages/cli/package.json, tsconfig.json, tsup.config.ts
   File ownership: packages/cli/src/index.ts, commands/login.ts, logout.ts, whoami.ts, config.ts, api-client.ts, output.ts, package.json

2. "cli-read" — Search, info, list:
   - packages/cli/src/commands/search.ts
   - packages/cli/src/commands/info.ts
   - packages/cli/src/commands/list.ts
   - packages/cli/src/commands/agents.ts
   File ownership: packages/cli/src/commands/search.ts, info.ts, list.ts, agents.ts

3. "cli-install" — Install, uninstall, update:
   - packages/cli/src/commands/install.ts
   - packages/cli/src/commands/uninstall.ts
   - packages/cli/src/commands/update.ts
   - packages/cli/src/services/resolver.ts: version resolution
   - packages/cli/src/services/linker.ts: agent linking with full fallback chain:
     1. Vercel skills CLI (npx skills add)
     2. Direct symlink to agent skill dirs
     3. File copy as last resort
     Must test all 3 modes — if Vercel CLI is unavailable, fallback must work silently.
   - packages/cli/src/services/preflight.ts: self-healing checks
   - packages/cli/src/services/skills-json.ts: skills.json + lock file management
   File ownership: packages/cli/src/commands/install.ts, uninstall.ts, update.ts, packages/cli/src/services/**
```

### Phase 5 — Authoring + Publish

```
Spawn 2 teammates:

1. "cli-author" — Init, test, pack, version:
   - packages/cli/src/commands/init.ts: interactive scaffold
   - packages/cli/src/commands/test.ts: eval.json runner + local security scan
   - packages/cli/src/commands/pack.ts: .skl archive creation
   - packages/cli/src/commands/version.ts: semver bump
   File ownership: packages/cli/src/commands/init.ts, test.ts, pack.ts, version.ts

2. "cli-publish" — Publish, yank, deprecate, report:
   - packages/cli/src/commands/publish.ts: pre-flight + upload + result display
   - packages/cli/src/commands/yank.ts
   - packages/cli/src/commands/deprecate.ts
   - packages/cli/src/commands/report.ts
   File ownership: packages/cli/src/commands/publish.ts, yank.ts, deprecate.ts, report.ts
```

### Phase 6 — Security + Signing (Layer 1 only)

Layers 2-3 (ML classification + Lakera Guard) are post-launch. Launch ships with Layer 1 regex patterns — they catch 80% of issues and require no external services.

```
Spawn 2 teammates:

1. "scan-layer1" — Pattern scanner:
   - packages/api/src/security/layer1.ts: regex pattern engine
   - packages/api/src/security/patterns.ts: pattern library from docs/spm-content-security.md
   - packages/api/src/security/suggestions.ts: fix suggestion engine
   - packages/api/src/services/scanner.ts: orchestrate Layer 1, with interface for future layers
   - Update packages/api/src/routes/skills.ts: integrate scanning into POST /skills
   - Tests for pattern matching (true positives + false positive resistance)
   File ownership: packages/api/src/security/**, packages/api/src/services/scanner.ts

2. "signing" — Sigstore integration:
   - packages/cli/src/services/signer.ts: @sigstore/sign integration
   - packages/cli/src/services/verifier.ts: @sigstore/verify integration
   - packages/cli/src/commands/verify.ts: standalone verify command
   - Update publish.ts to sign before upload
   - Update install.ts to verify after download
   File ownership: packages/cli/src/services/signer.ts, verifier.ts, packages/cli/src/commands/verify.ts
```

### Phase 7 — Web UI

```
Spawn 3 teammates:

1. "web-public" — Homepage, search, skill detail:
   - packages/web/ full Vite + React + Tailwind setup
   - packages/web/src/pages/Home.tsx
   - packages/web/src/pages/Search.tsx
   - packages/web/src/pages/SkillDetail.tsx
   - packages/web/src/pages/AuthorProfile.tsx
   - Adapt designs from docs/spm-homepage-registry.jsx and docs/spm-search-and-detail.jsx
   File ownership: packages/web/**

2. "web-dashboard" — Author dashboard:
   - packages/web/src/pages/Dashboard.tsx
   - Adapt from docs/spm-author-dashboard.jsx
   File ownership: packages/web/src/pages/Dashboard.tsx

3. "web-admin" — Admin panel (separate deploy):
   - packages/admin/ full setup (separate Vite app)
   - Adapt from docs/spm-admin-panel.jsx
   - All 6 tabs: review queue, skills, scan analytics, users, reports, errors
   File ownership: packages/admin/**
```

### Phase 8 — Testing & Validation

Comprehensive test suite across all layers. Each teammate writes tests for a different part of the system using the appropriate testing strategy.

```
Spawn 3 teammates:

1. "test-api" — API + integration tests:
   - packages/api/src/__tests__/auth.test.ts: device flow, JWT, admin guard, token revocation
   - packages/api/src/__tests__/skills.test.ts: CRUD, publish, yank, version immutability
   - packages/api/src/__tests__/search.test.ts: full-text search, filters, pagination
   - packages/api/src/__tests__/security.test.ts: Layer 1 pattern detection, false positive resistance
   - packages/api/src/__tests__/integration/: full request lifecycle tests (publish → search → install → review)
   - Test infra: vitest, test DB setup/teardown, seed data fixtures
   - Include the "first 10 skills" as test fixtures (manifest + SKILL.md for each)
   Test types: unit tests for services, integration tests for route handlers with real DB
   File ownership: packages/api/src/__tests__/**

2. "test-cli" — CLI unit + component tests:
   - packages/cli/src/__tests__/commands/: test each command (init, install, publish, search, etc.)
   - packages/cli/src/__tests__/services/: resolver, linker (all 3 fallback modes), preflight, signer
   - packages/cli/src/__tests__/output.ts: verify CLI output formatting matches docs/spm-cli-output-design.md
   - Mock API responses using msw (Mock Service Worker)
   - Test config.toml read/write, skills.json + lock file generation
   - Test global vs local skill resolution (local wins rule)
   Test types: unit tests for services, component tests for commands with mocked API
   File ownership: packages/cli/src/__tests__/**

3. "test-e2e" — End-to-end + browser tests:
   - packages/e2e/playwright.config.ts: Playwright setup
   - packages/e2e/tests/web/:
     - homepage.spec.ts: trending tabs render, search works, category links navigate
     - search.spec.ts: filters apply, results paginate, skill detail opens
     - skill-detail.spec.ts: README renders, versions tab, install command copy
     - auth-flow.spec.ts: login redirect, dashboard access, admin nav link (admin only)
   - packages/e2e/tests/admin/:
     - review-queue.spec.ts: approve/reject flow
     - users.spec.ts: filter dropdowns, role management, confirmation banners
   - packages/e2e/tests/cli/:
     - full-workflow.spec.ts: spm init → pack → publish → search → install → verify (against staging API)
   - Seed script for test data
   Test types: Playwright browser E2E for web/admin, CLI integration tests against live staging
   File ownership: packages/e2e/**
```

**Test tooling summary:**

| Layer       | Tool                 | What it tests                                              |
| ----------- | -------------------- | ---------------------------------------------------------- |
| Unit        | vitest               | Individual functions, Zod schemas, services                |
| Component   | vitest + msw         | CLI commands with mocked API, React components             |
| Integration | vitest + test DB     | API routes with real Neon (branch), full request lifecycle |
| Browser E2E | Playwright           | Web UI, admin panel — user flows, responsive, a11y         |
| CLI E2E     | vitest + staging API | Full spm workflow end-to-end against live registry         |

---

## Team Coordination Rules

### File Ownership

The most important rule for agent teams: **no two teammates edit the same file**. The task breakdown above is designed so each teammate owns a clear set of files. If coordination is needed (e.g., cli-install needs a new schema from shared), the lead handles the handoff.

### Communication Patterns

```
Lead: "shared teammate — cli-install needs a SkillsJson schema. Can you add it to src/schemas.ts?"
Shared: "Done. Exported SkillsJsonSchema and SkillsLockSchema from @spm/shared"
Lead: "cli-install — shared just exported SkillsJsonSchema. Import it from @spm/shared and proceed."
```

### Commit Convention

Every teammate follows conventional commits:

```
feat(shared): add Manifest and SearchParams schemas
feat(api): implement POST /skills publish endpoint
fix(cli): handle broken symlinks in preflight check
test(api): add auth flow integration tests
chore(repo): configure turbo pipeline
docs(api): update wrangler.toml comments
ci: add lint + typecheck to PR workflow
```

### Definition of Done

A task is done when:

1. `/ship` passes — lint, format, test, commit, push all succeed
2. No type errors when imported by other packages
3. Conventional commit message with correct scope

### Branch Strategy

```
main                         ← always deployable
├── feat/phase-1-foundation   ← lead creates, teammates work here
├── feat/phase-2-api          ← one branch per phase
└── feat/phase-3-search
```

Each agent team works on a single feature branch. The lead creates the branch, teammates use `/ship` to lint, test, commit, and push. Lead merges to main when all tasks are complete.

---

## Session Templates

### Starting a New Phase

```
Read docs/spm-implementation-plan.md and find the tasks for Phase N.
Read the relevant spec docs listed in each task.
Create branch feat/phase-N-<name>.
Create an agent team with the teammates defined in this file for Phase N.
Each teammate should read their relevant docs before starting.
Coordinate and report back when all tasks are done.
When all tasks pass /ship, merge to main and start next phase.
```

### Resuming Work

```
We're working on Phase N. Check git log and git status.
Read this file (docs/spm-way-of-working.md) for task breakdown.
Continue where we left off. Spawn new teammates if the previous ones are gone.
```

### Code Review

```
Review the changes on the current branch.
Read the spec docs for context.
Check: types match shared schemas, API responses match docs/spm-registry-api.md,
CLI output matches docs/spm-cli-output-design.md.
Run pnpm lint && pnpm typecheck && pnpm test and report any issues.
```
