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

### Remaining (future): CI-triggered npm publish workflow

---

## 4. MCP Server — Verify & Document

**Priority:** Medium
**Package:** `packages/mcp/`

### Verify:

- Confirm `spm_search`, `spm_info`, `spm_categories` tools work via stdio transport
- Test with a real MCP client (Claude Desktop, claude CLI)
- Ensure it connects to the live API (not mock data)

### Documentation needed:

- README in `packages/mcp/` with config snippets for Claude Desktop and claude CLI
- Publish to npm as `@skillpkg/mcp`

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

### Phase 1.5 (TODO): HuggingFace import

Same script, new source. 10 skills focused on AI/ML (datasets, model training, evaluation, Gradio, jobs, etc.).

- Add `huggingface/skills` source to `scripts/import-skills.ts`
- Placeholder user: `huggingface` with `verified` trust tier (known org)
- Maps to `ai_ml` and `data_analysis` categories
- Brings total to ~33 skills, fills a category we currently have zero coverage in

**Skills:** hugging-face-datasets, hugging-face-dataset-viewer, hugging-face-model-trainer, hugging-face-evaluation, hugging-face-jobs, hugging-face-trackio, huggingface-gradio, hf-cli, hugging-face-paper-publisher, hugging-face-tool-builder

### Phase 2 (TODO): Curated community import from skills.sh

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

**Priority:** Medium
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

## 7. Re-run Security Scan via Admin Panel

**Priority:** Medium

### TODO:

- `POST /admin/skills/:name/rescan` endpoint
- "Re-scan" button in admin UI skill detail + list actions
- Fetch `.skl` from R2, run through Layer 1/2/3, update `scan_status`
- Audit log: who triggered re-scan and result
- Bulk re-scan option (all skills matching a filter)
- "Scanning..." status indicator in UI

---

## ~~8. Admin Block/Unblock Skills~~ DONE

Endpoints (`POST /admin/skills/:name/block` and `/unblock`) and admin UI with confirmation all implemented.

---

## ~~9. Admin User Role Management~~ DONE

`PATCH /admin/users/:username/role` endpoint and UsersTab UI with promote/revoke flow implemented.

---

## ~~10. Multi-Author Display~~ DONE

DB schema, API response (`authors[]` on `GET /skills/:name`), web sidebar, and admin detail pane all implemented.

### Remaining (future): Collaborator Management

- `POST/DELETE /skills/:name/collaborators` API endpoints
- Dashboard UI for managing collaborators
- CLI: `spm collaborators add/remove/list`
- `/authors/:username` should include collaborated skills, not just owned

---

## ~~11. Downloads Sparkline API & UI~~ DONE

API endpoint, `Sparkline` component in `@spm/ui`, web sidebar and admin detail pane all implemented.

---

## ~~12. Security Enhancements~~ DONE

`SecurityBadge` component in `@spm/ui`, `GET /admin/skills/:name/versions/:version` endpoint implemented.

All published skills are fully scanned (Layer 1/2/3). No opt-out — simpler and safer.
Dropped `--no-security` flag and security filter (no partial scans = nothing to filter).

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

### Documentation

- Improve root `README.md` (getting started, feature highlights)
- Add package-level READMEs (`packages/admin/`, `packages/ui/`, `packages/web-auth/`)
