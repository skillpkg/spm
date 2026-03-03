# SPM Implementation Plan

Solo founder build. 12 weeks from empty repo to public beta.

**Stack:** Hono (Cloudflare Workers) · Neon Postgres · Cloudflare R2 · TypeScript · React (Vite)

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                         Milestones                                │
│                                                                   │
│  Wk 1-2      Wk 3-4        Wk 5-6       Wk 7-8       Wk 9-10   │
│  Foundation   Core API      CLI          Web UI        Security   │
│                                                                   │
│  Wk 11-12                                                         │
│  Polish + Launch                                                  │
└────────────────────────────────────────────────────────────────────┘
```

---

## Week 1 — Monorepo Scaffold + Database

**Goal:** Empty repo → project structure, DB schema deployed, shared types working.

```
spm/
├── packages/
│   ├── shared/            # Zod schemas, types, constants
│   │   ├── src/
│   │   │   ├── schemas.ts       # Manifest, SearchParams, Publish, etc.
│   │   │   ├── categories.ts    # Canonical category list + display names
│   │   │   ├── trust.ts         # Trust tier enum + badge config
│   │   │   └── errors.ts        # Error codes + messages
│   │   └── package.json
│   ├── api/               # Hono registry API
│   ├── cli/               # spm CLI
│   └── web/               # skillpkg.dev React app
├── migrations/            # Neon SQL migrations
├── turbo.json
├── package.json
└── .github/workflows/
```

**Tasks:**

- [ ] Init monorepo (pnpm workspaces + Turborepo)
- [ ] Set up `packages/shared` — Zod schemas for Manifest, SearchParams, PublishRequest, Category enum, TrustTier enum, error codes
- [ ] Provision Neon Postgres database
- [ ] Write migration 001: all tables from DB schema (users, skills, versions, tags, platforms, scans, downloads, reviews, audit_log, publish_attempts)
- [ ] Run migration, verify schema
- [ ] Set up Cloudflare R2 bucket for package storage
- [ ] Create GitHub OAuth App (for device flow)
- [ ] Set up CI: typecheck + lint on PR

**Deliverable:** `pnpm build` succeeds, DB schema deployed, shared package importable.

---

## Week 2 — Auth + Skill CRUD API

**Goal:** Register, login, publish a skill, read it back. No security scanning yet.

**Tasks:**

- [ ] Init `packages/api` — Hono app, Cloudflare Workers config (wrangler.toml)
- [ ] DB client setup (Neon serverless driver + Drizzle ORM)
- [ ] Auth routes:
  - `POST /auth/device-code` — proxy GitHub device flow
  - `POST /auth/token` — poll + exchange for JWT
  - `GET /auth/whoami` — decode JWT, return user
  - `POST /auth/logout` — token revocation
- [ ] JWT middleware (authed guard) + admin sub-app isolation (adminGuard on `use('*')` — DB role verification, not just JWT claim)
- [ ] Add `role` column to users table (`'user'` | `'admin'`)
- [ ] Skill routes:
  - `POST /skills` — accept multipart upload (.skl + manifest), store in R2, insert into DB (no scanning yet — auto-pass)
  - `GET /skills/:name` — return skill metadata + versions
  - `GET /skills/:name/:version` — version detail
  - `GET /skills/:name/:version/download` — R2 presigned redirect
  - `DELETE /skills/:name/:version` — yank
  - `PATCH /skills/:name` — update metadata / deprecate
- [ ] Name validation — kebab-case, 2-50 chars, reserved names list, anti-squat similarity check
- [ ] Version immutability enforcement
- [ ] Deploy to Cloudflare Workers (staging)
- [ ] Seed first admin: login via GitHub, then `UPDATE users SET role = 'admin'` in Neon console
- [ ] Manual testing: publish a test skill via curl, download it

**Deliverable:** Can authenticate via GitHub and publish/download a .skl package through the API.

---

## Week 3 — Search, Categories, Trending, MCP

**Goal:** Full search & discovery API working. MCP server for agent discovery. Homepage data ready.

**Tasks:**

- [ ] `GET /skills` — full-text search with Postgres GIN index, category/trust/platform filters, sort options, pagination
- [ ] `GET /categories` — list with counts (query from skills table)
- [ ] `GET /trending` — 4 tabs:
  - `featured` — manually curated (seed with official skills)
  - `rising` — highest % weekly download growth
  - `most_installed` — all-time download count
  - `new` — published_at DESC
- [ ] `POST /resolve` — batch resolution endpoint
- [ ] Download tracking — record events, dedupe per user/IP/version/hour
- [ ] Create materialized view `download_counts`, set up refresh cron (every 5 min via Cloudflare Cron Trigger)
- [ ] Edge caching — Cloudflare Cache API for search (30s), categories (5min), trending (5min)
- [ ] Rate limiting middleware (Cloudflare Workers KV)
- [ ] Reviews routes:
  - `GET /skills/:name/reviews`
  - `POST /skills/:name/reviews`
- [ ] Author routes:
  - `GET /authors/:username`
  - `GET /authors/:username/stats` (auth)
- [ ] `POST /skills/:name/report`
- [ ] Health + status endpoints
- [ ] MCP server (packages/mcp/):
  - `spm_search` tool — wraps `GET /skills?q=...`, returns top results with install commands
  - `spm_info` tool — wraps `GET /skills/:name`, returns full metadata
  - `spm_categories` tool — wraps `GET /categories`
  - SSE + stdio transport
  - This is the killer feature: agents can discover skills mid-conversation

**Deliverable:** Full read API working. MCP server lets agents search the registry. Edge-cached.

---

## Week 4 — CLI Foundation

**Goal:** `npm i -g spm` installs a working CLI. Login, search, info work.

**Tasks:**

- [ ] Init `packages/cli` — TypeScript + tsup for bundling
- [ ] CLI framework: commander.js, chalk, ora, inquirer, cli-table3
- [ ] Config management:
  - `~/.spm/config.toml` — registry URL, token, preferences
  - First-run initialization
- [ ] `spm login` — GitHub device flow, browser auto-open, fallback manual code, save token
- [ ] `spm logout` — remove token
- [ ] `spm whoami` — show user info
- [ ] `spm search <query>` — call API, render results table with trust badges
- [ ] `spm info <name>` — full skill detail view
- [ ] Verbosity modes: default, `--verbose`, `--silent`, `--json`
- [ ] Error formatting with hints
- [ ] `NO_COLOR` and CI environment detection
- [ ] Publish to npm as `@spm/cli` (or `spm` if available)

**Deliverable:** `npm i -g spm && spm login && spm search pdf` works end-to-end.

---

## Week 5 — CLI Install + Agent Linking

**Goal:** `spm install data-viz` downloads, verifies, links to agents. The core loop.

**Tasks:**

- [ ] `spm install <name>` — resolve, download .skl, extract to `~/.spm/skills/<name>/<version>/`
- [ ] `spm install -g <name>` — global install
- [ ] Local `skills.json` management — add to project dependencies
- [ ] Global `skills.json` at `~/.spm/skills.json`
- [ ] Lock file generation (`skills-lock.json`)
- [ ] Bootstrap / agent linking:
  1. Try Vercel `skills` CLI (npx @anthropic-ai/skills)
  2. Try symlink to agent directories
  3. Fall back to file copy
  - Track `is_copy` metadata for preflight staleness check
- [ ] `spm uninstall <name>` — remove skill, clean symlinks, update skills.json
- [ ] `spm list` — show project + global skills
- [ ] `spm update [name]` — check for newer versions, re-install
- [ ] `spm agents` — detect installed agents, show linked skill counts
- [ ] Preflight self-healing:
  - Run on every `spm install/update`
  - Detect broken symlinks, stale copies, orphaned entries
  - Auto-repair with colored output

**Deliverable:** Full install → link → use cycle works. Install a skill, open Claude Code, agent uses it.

---

## Week 6 — CLI Authoring + Publish

**Goal:** `spm init` → `spm test` → `spm publish` works. No security scanning yet (still auto-pass).

**Tasks:**

- [ ] `spm init` — interactive scaffold:
  - Name, description, category (from list), language, license
  - Generate manifest.json + SKILL.md template + scripts/ dir
  - `--yes` flag for defaults
- [ ] `spm test` — run eval.json test cases against local skill
- [ ] `spm test --security` — local Layer 1 regex scan (client-side, fast)
- [ ] `spm pack` — create .skl archive (tar.gz with manifest + SKILL.md + scripts/)
- [ ] `spm publish` — pre-flight checks, pack, upload via `POST /skills`, show results
  - Category check: call `POST /categories/classify`, show match/mismatch/confirm
  - Version validation
  - Uncommitted changes check (git status)
- [ ] `spm version patch|minor|major` — bump version in manifest.json
- [ ] `spm yank <name>@<version>` — call DELETE endpoint
- [ ] `spm deprecate <name>` — call PATCH endpoint
- [ ] `spm report <name>` — submit report

**Deliverable:** Full author lifecycle works: init → develop → test → publish → update → yank.

---

## Week 7 — Security Scanning Pipeline

**Goal:** Layer 1 running server-side on publish. Flagged queue works. Layers 2-3 deferred to post-launch.

**Tasks:**

- [ ] Layer 1 — Regex pattern scanner:
  - Port pattern list from spm-content-security.md
  - Run on .skl contents server-side
  - Return matched patterns with file/line references
  - Fix suggestion engine (bad → good patterns)
- [ ] Scanner interface designed for future layers:
  - `scanner.ts` orchestrator accepts pluggable layers
  - Layer 2 (ProtectAI DeBERTa) and Layer 3 (Lakera Guard) slots are stubbed but not implemented
  - Post-launch: add Layers 2-3 behind the same interface with no publish flow changes
- [ ] Update `POST /skills` publish flow:
  - Run Layer 1
  - Block if Layer 1 finds blocking patterns
  - Auto-pass if clean
  - (Post-launch: hold for review if ML/Lakera confidence is borderline)
- [ ] Flagged queue:
  - Store flagged versions in DB with scan details
  - `GET /admin/queue` returns pending items
  - `POST /admin/queue/:id/approve|reject` resolves
- [ ] Update CLI publish output to show per-layer results
- [ ] Track publish attempts (success/blocked/held) in `publish_attempts` table

**Deliverable:** Publishing a skill with "ignore all previous instructions" gets blocked by Layer 1. Clean skills pass immediately.

---

## Week 8 — Sigstore Signing

**Goal:** Skills are cryptographically signed. `spm install` verifies signatures.

**Tasks:**

- [ ] `spm publish` signing:
  - Integrate `@sigstore/sign` for keyless signing
  - Ephemeral key from Fulcio CA (GitHub OIDC identity)
  - Sign package hash
  - Record on Rekor transparency log
  - Upload .sigstore bundle to R2 alongside .skl
- [ ] `spm install` verification:
  - Download .sigstore bundle
  - Verify signature chain (Fulcio → Rekor)
  - Verify package hash matches
  - Display signer identity
- [ ] Trust tier display:
  - Show ✓ signed / ⚠ unsigned in install output
  - Interactive confirmation for unsigned installs from `registered` tier
- [ ] Trust tier auto-promotion:
  - `registered` → `scanned` when all versions pass scan
  - `scanned` → `verified` when GitHub linked + 6 months active + clean history
  - `official` manual only (admin)
- [ ] `spm verify <name>` — standalone signature verification command

**Deliverable:** `spm install data-viz` shows "✓ Signed by almog@github (Sigstore)". Unsigned installs prompt for confirmation.

---

## Week 9 — Web UI: Public Pages

**Goal:** skillpkg.dev is live. Homepage, search, skill detail, author profile.

**Tasks:**

- [ ] Init `packages/web` — Vite + React + Tailwind
- [ ] Deploy to Cloudflare Pages
- [ ] Homepage (registry-first):
  - Search bar with `/` shortcut, suggestion dropdown
  - Trending tabs (featured, rising, most installed, new)
  - Category chips
- [ ] Search results page:
  - Sidebar filters (category, trust, platform)
  - Sort dropdown
  - Pagination
  - Active filter pills
- [ ] Skill detail page:
  - Hero with install command (click to copy)
  - README tab (render SKILL.md markdown)
  - Versions tab with changelog
  - Security tab (signature + scan results)
  - Sidebar: stats, author card, dependencies, links
- [ ] Author profile page:
  - Public skills list, total downloads
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] SEO: meta tags, og:image, structured data for skills

**Deliverable:** skillpkg.dev is live and browseable. All data comes from the API.

---

## Week 10 — Web UI: Dashboard + Admin

**Goal:** Authors can see their stats. Admin can moderate.

**Tasks:**

- [ ] Author dashboard (auth required):
  - Overview: stat cards, skills table, activity feed, trust progress
  - Skills tab: full table with metrics
  - Publish history: all attempts with status
  - Analytics: weekly downloads chart, per-skill breakdown, agent breakdown
- [ ] Admin panel — **separate deploy to `admin.skillpkg.dev`** (Cloudflare Pages):
  - Shared JWT auth (same token works on both skillpkg.dev and admin.skillpkg.dev)
  - Public site nav shows "Admin" link when `whoami.role === 'admin'`
  - First admin: manual `UPDATE users SET role = 'admin'` after your first login
  - `PATCH /admin/users/:username/role` for subsequent admin promotion/revocation
  - Review queue: expandable cards, approve/reject, scan details
  - Skill moderation: search, filter, yank
  - Scan analytics: publish stats, block rate trend, outcome breakdown
  - Trust management: user table, promote/demote
  - Reports: priority-sorted, status tracking
  - Errors: aggregated CLI errors, resolution tracking
- [ ] Email notifications (via Resend):
  - Publish success/held/blocked
  - Review queue item assigned
  - Trust tier promotion

**Deliverable:** Authors see their dashboard. Admin can approve/reject flagged skills from the UI.

---

## Week 11 — Testing & Validation

**Goal:** Comprehensive test suite across all layers. Production-ready confidence.

**Test strategy:**

| Layer       | Tool             | Coverage                                                         |
| ----------- | ---------------- | ---------------------------------------------------------------- |
| Unit        | vitest           | Services, Zod schemas, utilities, pattern matching               |
| Component   | vitest + msw     | CLI commands with mocked API, React components in isolation      |
| Integration | vitest + test DB | API route handlers with real Neon branch, full request lifecycle |
| Browser E2E | Playwright       | Web UI and admin panel user flows, responsive, accessibility     |
| CLI E2E     | vitest + staging | Full `spm` workflow against live staging registry                |

**Tasks:**

- [ ] API tests (packages/api/src/**tests**/):
  - Unit: auth JWT/guard logic, name validation, search query builder, Layer 1 patterns
  - Integration: full publish flow (upload → scan → store → search → download)
  - Integration: auth lifecycle (device-code → poll → JWT → whoami → revoke)
  - Integration: review queue (flag → admin approve/reject)
  - Seed data: "first 10 skills" fixtures (manifest + SKILL.md each)
- [ ] CLI tests (packages/cli/src/**tests**/):
  - Unit: resolver, config.toml parser, skills.json/lock file generation
  - Component: each command with mocked API via msw (Mock Service Worker)
  - Linker: test all 3 fallback modes (Vercel CLI → symlink → copy)
  - Output: verify formatting matches docs/spm-cli-output-design.md
  - Resolution: global vs local precedence (local wins rule)
- [ ] Web + admin E2E tests (packages/e2e/):
  - Playwright setup with test fixtures
  - Web: homepage render, search + filters, skill detail, auth flow
  - Admin: review queue, user management (dropdowns, pills, confirm banners)
  - Responsive: test at mobile, tablet, desktop breakpoints
  - Accessibility: axe-core integration for a11y violations
- [ ] CLI E2E tests (packages/e2e/tests/cli/):
  - Full workflow: spm init → pack → publish → search → install → verify
  - Against staging API with test auth token
  - Error scenarios: network timeout, invalid manifest, blocked skill
- [ ] Polish:
  - Spinner timing (only show for >500ms operations)
  - Terminal width handling, Ctrl+C graceful shutdown
  - Windows testing (copy fallback, path handling)
- [ ] Performance validation:
  - API: search <200ms, download redirect <50ms
  - CLI: install cold start <3s, search response <1s
- [ ] Documentation:
  - CLI `--help` for all commands
  - skillpkg.dev/docs (getting started, publishing guide, security model)
  - API reference (auto-generated from Zod schemas)
- [ ] Seed registry with first 10 official skills

**Deliverable:** All test suites green. CI runs unit + component + integration. E2E runs nightly against staging.

---

## Week 12 — Launch

**Goal:** Public beta. Announce, onboard first external authors.

**Tasks:**

- [ ] Production deployment checklist:
  - [ ] Cloudflare Workers production env
  - [ ] Neon production database (separate from staging)
  - [ ] First admin bootstrap: `spm login` → `UPDATE users SET role = 'admin' WHERE username = 'almog'`
  - [ ] R2 production bucket
  - [ ] Custom domain: registry.skillpkg.dev, skillpkg.dev, admin.skillpkg.dev
  - [ ] SSL certificates
  - [ ] Monitoring: uptime (Checkly), error tracking (Sentry), logs (Logflare)
  - [ ] Backup strategy: Neon point-in-time recovery, R2 versioning
- [ ] Security audit:
  - [ ] JWT secret rotation strategy
  - [ ] Rate limiting verified under load
  - [ ] SQL injection prevention (parameterized queries via Drizzle)
  - [ ] R2 presigned URL expiration
  - [ ] CORS policy verified
- [ ] Launch materials:
  - Blog post: what SPM is, why it exists, how it works
  - GitHub repo public (CLI + shared packages)
  - npm package published: `npm i -g spm`
  - `spm install github:<owner>/<repo>` proxy install working (bridge Phase 1)
  - Demo video: 2-min screencast of full workflow
- [ ] Onboarding:
  - Invite 5-10 skill authors from community
  - Create `spm init` templates for common categories
  - Set up Discord community

**Deliverable:** `npm i -g spm && spm install pdf` works for anyone in the world.

---

## Post-Launch Backlog

Items deprioritized from the 12-week plan:

| Item                   | Priority | Notes                                                                                                               |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| npm bridge             | High     | See spm-npm-bridge.md — Wk 12: proxy install (`github:`), Wk 13: bulk import top 100, Wk 14: claim flow + sync cron |
| CI/CD GitHub Action    | High     | `spm install` in CI, `spm publish` on release                                                                       |
| Skill dependencies     | Medium   | Skills that depend on other skills                                                                                  |
| MCP bridge skills      | Medium   | Skills that wrap MCP servers                                                                                        |
| Private registries     | Medium   | Enterprise self-hosted registries                                                                                   |
| Skill analytics API    | Low      | Detailed usage telemetry for authors                                                                                |
| Web-based skill editor | Low      | Edit SKILL.md in browser, publish from web                                                                          |
| Skill versioning UI    | Low      | Visual diff between versions                                                                                        |
| Community features     | Low      | Comments, discussions, collections                                                                                  |

---

## Risk Register

| Risk                             | Mitigation                                            |
| -------------------------------- | ----------------------------------------------------- |
| Vercel skills CLI changes/breaks | Symlink + copy fallback chain; monitor releases       |
| Neon cold start latency          | Connection pooling, edge caching, materialized views  |
| Sigstore availability            | Graceful degradation — allow unsigned with warning    |
| ML model false positives         | Conservative thresholds, fast admin review queue      |
| Name squatting at launch         | Anti-squat detection + reserved names list pre-launch |
| Low initial skill count          | Seed with 10+ official skills, write migration guides |
| Agent ecosystem fragmentation    | Support "all" platform target, monitor new agents     |

---

## Key Decisions Log

| Decision                   | Chosen                    | Rationale                                               |
| -------------------------- | ------------------------- | ------------------------------------------------------- |
| Monorepo vs separate repos | Monorepo                  | Shared types, atomic deploys, one CI                    |
| ORM                        | Drizzle                   | Type-safe, serverless-friendly, good Neon support       |
| Edge runtime               | Cloudflare Workers        | Global edge, R2 integration, Workers KV for rate limits |
| CLI bundler                | tsup                      | Fast, simple, ESM + CJS output                          |
| Web framework              | Vite + React              | Fast dev, Cloudflare Pages deploy                       |
| Package format             | .skl (tar.gz)             | Simple, inspectable, standard tooling                   |
| Auth                       | GitHub OAuth device flow  | No browser redirect needed, works in terminal           |
| Signing                    | Sigstore keyless          | No key management, tied to GitHub identity              |
| Categories                 | Postgres enum (10 values) | Controlled vocabulary, enforced at DB level             |
| Category assignment        | Hybrid LLM + author       | LLM suggests, author confirms/changes                   |
