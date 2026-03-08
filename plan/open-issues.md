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

Decision documented: Placeholder users approach. One user per org, `is_placeholder` + `imported_from` columns.

---

## 3. Publish CLI to npm

**Priority:** High

Publish the `spm` CLI package to npm so users can install it globally.

### TODO:

- Finalize package name — check if `spm` is available on npm, fallback to `@spm/cli` or `skillpkg`
- Set up `package.json` for publishing (name, version, bin, files, repository, license)
- Ensure `tsup` build output is correct for CLI execution (shebang, permissions)
- Add prepublish script (`pnpm build`)
- Publish workflow: manual or CI-triggered npm publish
- Test install flow: `npm install -g spm && spm --help`

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
- Publish to npm as `@spm/mcp`

---

## 5. Import Skills from External Sources

**Priority:** High
**Depends on:** Issue #2 (Author handling — DONE)

Import existing skills from Vercel, Anthropic, and community sources to bootstrap the registry.

### Pipeline design:

- Script/CLI command: `spm admin import --source github --repo org/repo`
- Parse source format into SPM manifest, create `.skl`, publish under source org's author
- Run through security scanner (Layer 1 minimum)

### Considerations:

- License compliance (MIT, Apache-2.0 only)
- Attribution — preserve original author, link to source repo
- Deduplication — avoid importing same skill from different forks

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

## 8. Admin Block/Unblock Skills

**Priority:** Medium

DB `status` column exists but endpoints and UI are missing.

### TODO:

- `POST /admin/skills/:name/block` endpoint
- `POST /admin/skills/:name/unblock` endpoint
- Admin UI buttons with confirmation modals
- Audit log for block/unblock actions

---

## 9. Admin User Role Management

**Priority:** Medium

JWT includes `role` claim and `adminGuard` middleware works. Missing management endpoints.

### TODO:

- `PATCH /admin/users/:username/role` endpoint
- Admin UI for promoting/revoking admin access
- Audit log for role changes

---

## 10. Multi-Author Support

**Priority:** Medium

DB migration (004) and `skillCollaborators` Drizzle schema exist. API/UI not wired up.

### TODO:

- `GET /skills/:name` response includes `authors[]` field
- Web UI shows multiple authors with roles on skill detail page
- Admin UI shows author list with roles

---

## 11. Downloads Sparkline API & UI

**Priority:** Medium

### TODO:

- `GET /skills/:name/downloads` endpoint (30-day daily buckets)
- `Sparkline` component in `packages/ui/`
- Web skill detail sidebar integration
- Admin detail pane integration

---

## 12. Security Enhancements

**Priority:** Medium

### TODO:

- `SecurityBadge` shared component (green/yellow/red/gray shields)
- `spm publish --no-security` flag (skip Layer 2/3, Layer 1 always runs)
- `spm search --security=full|partial|any` filter
- Web search sidebar: security level filter
- Version-specific admin endpoint: `GET /admin/skills/:name/versions/:version`

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
