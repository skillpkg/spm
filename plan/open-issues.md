# SPM — Open Issues

Tracked issues and planned work that isn't yet implemented.

---

## ~~1. Logo~~ DONE

Logo added to web nav, admin nav, hero section, favicons, CLI banner, and repo assets.

### Remaining: GitHub Social Preview (manual)

1. Go to **github.com/almog27/spm** > **Settings** (top nav)
2. Scroll to **Social preview** section
3. Click **Edit** > **Upload an image**
4. Upload `assets/logo-dark.png` (dark background version — works best on social cards)
5. Click **Save**

**Optional:** Create a 1280x640px banner with logo + "SPM — Skills Package Manager for AI Agents" + skillpkg.dev

---

## ~~2. Imported / Community Skills — Author Handling~~ DONE

### Schema changes needed:

- `users` table: add `is_placeholder boolean NOT NULL DEFAULT false`
- `skills` table: add `imported_from text` (nullable) — source URL for imported skills

### Migration:

```sql
ALTER TABLE users ADD COLUMN is_placeholder boolean NOT NULL DEFAULT false;
ALTER TABLE skills ADD COLUMN imported_from text;
```

### Trust & Attribution (Decision: Option A+B)

Two-layer approach — trust tiers + transparent provenance:

- **Trust tier**: imported skills from known orgs (anthropic, vercel) get `verified` — the code is genuinely theirs
- **Provenance**: `imported_from` URL is always shown in UI ("Imported from github.com/anthropics/...")
- **Distinction**: "Verified" + "Imported" tag makes it clear: trustworthy code, but we imported it — the org didn't publish it themselves
- **Claim flow**: if the real org joins SPM, they claim the placeholder account → "Imported" tag disappears, becomes a normal `verified` publisher

All implemented: schema, placeholder users, X-Publish-As, UI badges, read-only constraints. 22 skills imported.

### Remaining (future): Claim Flow

- Real user proves org ownership → placeholder merged into their account

---

## ~~3. Publish CLI to npm~~ DONE

Published as `@skillpkg/cli` v0.1.0. Binary: `spm`. Install: `npm install -g @skillpkg/cli`.

`@spm/shared` bundled via tsup `noExternal` so the CLI is self-contained.

CI publish workflow: `.github/workflows/publish-cli.yml` (manual trigger, inlined quality gate, publishes to npm with automation token).

---

## ~~4. MCP Server — Verify & Document~~ DONE

Published as `@skillpkg/mcp` v0.1.1. Tested with Claude Desktop and Claude Code against live API.
README with setup docs for Claude Code, Claude Desktop, and Cursor.

---

## 5. Import Skills from External Sources

**Priority:** High
**Depends on:** Issue #2 (Author handling — DONE)
**Status:** Phase 1 DONE — 23 skills imported to production

### Phase 1 (DONE): First-party imports

Script: `scripts/import-skills.ts`

```bash
# Dry run (no API needed):
pnpm exec tsx scripts/import-skills.ts --dry-run

# Real import (requires admin JWT + running API):
pnpm exec tsx scripts/import-skills.ts --api-url https://registry.skillpkg.dev --token <admin-jwt>
```

**Sources:**

- `anthropics/skills` — 17 skills (documents, frontend, productivity, testing, backend)
- `vercel-labs/agent-skills` — 5 skills (frontend, infra)

**Format:** SKILL.md with YAML frontmatter → parsed → manifest.json → .skl → published via API

**API support:** Admin users can set `X-Imported-From` header on publish to mark skills as imported.

### ~~Phase 1.5: HuggingFace import~~ DONE

10 HuggingFace skills imported. Total: 33 skills in registry.

### Phase 2 (TODO): Curated community import from skills.sh — **Estimate: 1-2 sessions**

**Approach:** Quality-gated import, NOT bulk scraping.

**Steps:**

1. Scrape skills.sh ranked list → extract repo URLs
2. For each repo, check GitHub stars via API
3. Filter: stars > 50, has valid SKILL.md, permissive license (MIT/Apache-2.0)
4. **Show count + list** → "Found X skills matching criteria" — review before importing
5. Import with `scanned` trust tier (community source, not known orgs)
6. Deduplicate against existing skills (skip if name already exists)

**Skip:** skillsmp.com — 400K+ entries, mostly GitHub scraping noise. Not worth the scan resources.

**Note:** skills.sh "install" numbers are unreliable (468K for a week-old skill?). Use GitHub stars as quality proxy instead.

### Considerations:

- License compliance (MIT, Apache-2.0 only)
- Attribution — preserve original author, link to source repo
- Deduplication — avoid importing same skill from different forks

---

## 14. Security Scanning — Competitive Research & Improvements

**Priority:** Medium | **Estimate: 3-4 sessions**
**Context:** Research from skills.sh security approach (March 2025)

### skills.sh uses 3 external scanners:

| Scanner                 | What it checks                                                      |
| ----------------------- | ------------------------------------------------------------------- |
| **Socket**              | Supply chain: license, dependencies, code quality, maintenance      |
| **Snyk**                | Prompt injection, command injection, data exfiltration, credentials |
| **Gen Agent Trust Hub** | URL scanning, antivirus, AI analysis (Gemini-powered)               |

Each scanner shows PASS/WARN/FAIL badge on skill detail page, linking to a detailed findings page.

### Key stat: Snyk found 13.4% of skills (534/3984) had critical security issues

### Open-source tools to evaluate:

- `github.com/snyk/agent-scan` — Snyk's open-source skill scanner
- `github.com/cisco-ai-defense/skill-scanner` — Cisco AI Defense scanner

### What SPM could adopt:

- **Per-scanner detail pages** — drill into Layer 1/2/3 results individually instead of inline
- **Third-party scanner integration** — run Snyk agent-scan or Cisco scanner as Layer 2/3 alongside our regex + ML pipeline
- **"Installed On" metric** — skills.sh shows which AI agents use each skill (codex, cline, copilot, etc.) — novel concept for adoption tracking

### UI ideas from skills.sh skill detail page:

- Security scanners as sidebar cards with color-coded PASS/WARN/FAIL badges
- Relative timestamps ("4 days ago" vs absolute dates)
- "Installed On" section showing agent adoption counts

---

## ~~6. robots.txt and AI Agent Discoverability~~ DONE

- Web: `robots.txt` (blocks AI crawlers, points to MCP), `llms.txt` (MCP-first), favicon
- Admin: `robots.txt` (blocks all)
- API: `/robots.txt` route (blocks AI crawlers), `/sitemap.xml` dynamic route from DB

---

## ~~7. Re-run Security Scan~~ DONE

API endpoint (`POST /skills/:name/rescan`) with owner-or-admin auth, CLI commands (`spm rescan` single + `spm rescan --all` batch with admin-aware mode). Downloads .skl from R2, runs Layer 1/2/3, updates scan records.

### ~~Admin UI integration~~ DONE

- ~~"Re-scan" button in admin UI skill detail + list actions~~
- ~~"Scanning..." status indicator in UI~~
- Audit log: who triggered re-scan and result (future)

---

## ~~8. Admin Block/Unblock Skills~~ DONE

Endpoints (`POST /admin/skills/:name/block` and `/unblock`) and admin UI with confirmation all implemented.

---

## ~~9. Admin User Role Management~~ DONE

`PATCH /admin/users/:username/role` endpoint and UsersTab UI with promote/revoke flow implemented.

---

## ~~10. Multi-Author Display~~ DONE

DB schema, API response (`authors[]` on `GET /skills/:name`), web sidebar, and admin detail pane all implemented.

### ~~Collaborator Management~~ DONE

- ~~`POST/DELETE /skills/:name/collaborators` API endpoints~~
- ~~CLI: `spm collaborators add/remove/list`~~
- ~~Collaborators can publish new versions (ownership check updated)~~
- Dashboard UI for managing collaborators (future — dashboard uses mock data)
- `/authors/:username` should include collaborated skills, not just owned (future)

---

## ~~11. Downloads Sparkline API & UI~~ DONE

API endpoint, `Sparkline` component in `@spm/ui`, web sidebar and admin detail pane all implemented.

---

## ~~12. Security Enhancements~~ DONE

`SecurityBadge` component in `@spm/ui`, `GET /admin/skills/:name/versions/:version` endpoint implemented.

All published skills are fully scanned (Layer 1/2/3). No opt-out — simpler and safer.
Dropped `--no-security` flag and security filter (no partial scans = nothing to filter).

---

## 15. Admin Overview — Live Stats

**Priority:** Medium | **Estimate: 1 session**
**Status:** Placeholder UI created

### TODO:

- Connect `OverviewTab` to `getAdminStats` API (endpoint exists, response shape defined)
- Display real data: total skills, total users, total downloads, queue depth
- "Requires Attention" section: live queue depth, open reports, open errors, blocked skills
- Publishing breakdown card with segmented bar (published / blocked / rejected)
- Security scanning card with pass/block/flag rates
- Users by trust tier distribution with segmented bar

### Depends on:

- Admin stats API returning real data from production DB

---

## 16. Admin Analytics Dashboard

**Priority:** Medium | **Estimate: 2-3 sessions**
**Status:** Not started

### TODO:

- Time-series charts: publishes per day/week, downloads over time, new users
- Scan trends: pass/fail rates over time, L1/L2/L3 breakdown trends
- Top skills by downloads, most flagged skills, most reported skills
- User growth chart, trust tier transitions over time
- Exportable reports (CSV download)
- Date range picker for all charts

### Depends on:

- New API endpoints for time-series data (`GET /admin/analytics/publishes?period=7d`)
- Charting library (recharts or similar)

---

## ~~17. Richer Search — Author Search, Filters & Facets~~ DONE

GitHub-style query syntax in web search bar: `author:anthropics category:frontend tag:imported signed:true platform:claude-code`. Parser extracts prefixed terms into API params, free text becomes `q`. Sidebar filters sync bidirectionally with query bar. CLI `--author` flag added. API `tag` and `signed` query params added.

### Remaining (future):

- **Author autocomplete**: suggest authors as user types `@...` in web search
- **`GET /authors` endpoint**: list authors with skill counts, searchable

---

## ~~18. Mobile-Responsive Web UI~~ DONE

CSS media queries added for responsive layouts across web pages. Sidebar collapses, search stacks, skill detail reflows on small screens.

### Remaining (future):

- Admin panel responsive tables
- Cross-browser testing: iOS Safari, Android Chrome, tablet landscape/portrait

---

## ~~19. Docs Pages — Buttons Non-Functional~~ DONE

**Priority:** High | **Estimate:** 1 session
**Status:** Done — DocDetail page with slug-based routing, all doc buttons wired up.

Buttons on the docs/landing pages (e.g. "Get Started", "View Docs", CTAs) are not wired up — they render but do nothing on click. Need to add proper `onClick` handlers or `<Link>` navigation to the correct routes.

---

## 20. Auto-Skill

**Priority:** TBD | **Estimate:** TBD
**Status:** Not started

Details to be defined — placeholder for auto-skill support.

---

## 21. Private Registries

**Priority:** High | **Estimate:** 8-12 sessions total (phased)
**Status:** Not started

### Why

Companies want to use SPM for internal skills without publishing to the public registry. This is the path to enterprise adoption and revenue.

### Phase 1: Organizations & User Management — **Estimate: 3-4 sessions**

Current SPM has flat users with `user`/`admin` roles. Private registries need org-level access control.

**DB schema changes:**
- `organizations` table: id, name (slug), display_name, created_at
- `org_members` table: org_id, user_id, role (owner/admin/member/read-only), invited_at, joined_at
- `org_invites` table: org_id, email, role, token, expires_at
- Add `org_id` (nullable) to `skills` table — null = public, set = org-private

**API endpoints:**
- `POST /orgs` — create org
- `GET /orgs/:name` — org profile
- `POST /orgs/:name/members` — invite member
- `PATCH /orgs/:name/members/:username` — change role
- `DELETE /orgs/:name/members/:username` — remove member

**Auth changes:**
- Org membership check middleware
- Read auth on private skills (currently downloads are unauthenticated)
- Scoped publish: only org members can publish to `@org/*`

**CLI changes:**
- `spm org create/list/members` commands
- `spm login` stores token per registry

### Phase 2: Private Skill Visibility & Access Control — **Estimate: 2-3 sessions**

- Visibility field on skills: `public` | `private` | `org-only`
- Private skills excluded from public search/browse
- Download requires auth + org membership for private skills
- Org-scoped search: `spm search --org mycompany`
- Web UI: org dashboard with member management, private skill listing

### Phase 3: Multi-Registry CLI Support — **Estimate: 1-2 sessions**

- Scoped registries in `skills.json`: `@company/*` → `https://spm.company.com`, rest → public
- Per-registry token storage in CLI config
- `spm login --registry <url>` — authenticate against specific registry
- Transparent resolution: install from correct registry based on scope

### Phase 4: Hosted Multi-Tenant (SaaS) — **Estimate: 2-3 sessions**

- Org isolation on shared infrastructure (same DB, R2 prefixed per org)
- Billing/plan model (free tier, team, enterprise)
- Org-level settings: allowed categories, security scan requirements, approval workflows
- Audit log: who published/installed/changed what

### Future: Self-Hosted (on-prem)

- Abstract storage backend (S3-compatible, not just R2)
- Abstract DB (any Postgres, not just Neon)
- Abstract auth (SSO/SAML, not just GitHub OAuth)
- Docker image / Helm chart
- Remove Cloudflare-specific dependencies (KV → Redis, Workers → Node)
- Air-gap support: proxy/mirror public registry, allowlist approved public skills

### Auth Flexibility (spans all phases)

- API tokens for CI/CD (long-lived, scoped to org + permissions)
- Service accounts for automation pipelines
- SSO/SAML integration (Phase 4+)

---

## 13. Post-Launch / Low Priority

### Email Notifications

- Resend integration for: publish success/held/blocked, review queue, trust tier promotions

### Distribution

- Homebrew formula (`spm.rb` with auto-bootstrap)
- Shell completions (bash, zsh, fish)

### GitHub Proxy Installs

- `spm install github:owner/repo/skill-name` syntax
- Install skills directly from GitHub without registry entry

### ~~Documentation~~ DONE

- ~~Improve root `README.md` (getting started, feature highlights)~~
- ~~Add package-level READMEs (`packages/admin/`, `packages/ui/`, `packages/web-auth/`)~~
- All 8 packages now have READMEs. Root README expanded with quick start, create/publish, MCP setup, full project structure, and dev commands.

### Enforce Admin Branch Protection

- Enable `enforce_admins` on `main` branch so admins also require PRs + CI + approvals
- Run: `gh api repos/skillpkg/spm/branches/main/protection/enforce_admins -X POST`
- Do this after core development stabilizes and team grows
