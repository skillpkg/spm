# SPM — Mandatory Scoped Skill Names

## Overview

Migrate SPM from a flat namespace (`skill-name`) to mandatory scoped names (`@scope/skill-name`), following npm's scoped packages model. Every skill must belong to a scope — either a user (`@alice/my-skill`) or an organization (`@mycompany/my-skill`).

**Why:**

- Flat names can't scale — two people can't publish a skill with the same bare name
- Orgs need private namespaces for internal skills
- Author attribution is built into the name, not just metadata
- Eliminates name-squatting ambiguity

**Decision:** No unscoped names going forward. All existing skills will be migrated to `@username/skill-name`.

---

## 1. Naming Model

### Format

```
@scope/skill-name
```

- **Scope**: `@[a-z0-9-]+` — user's username or org slug
- **Name**: `[a-z][a-z0-9-]*` — kebab-case, starts with letter, 2-64 chars
- **Full regex**: `^@[a-z0-9-]+\/[a-z][a-z0-9-]*$` (scope is now mandatory)

### Scope ownership

- Every user automatically gets `@username` scope on account creation
- Orgs get `@orgname` scope when created via `spm org create`
- Only scope owners/members can publish to `@scope/*`

### Examples

```
@alice/pdf-generator        # personal skill
@mycompany/data-viz         # org skill
@claude-community/code-review  # community org
```

---

## 2. Database Changes

### 2.1 New migration: organizations + org_members

```sql
-- organizations table
CREATE TABLE organizations (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT UNIQUE NOT NULL,          -- slug: "mycompany"
  display_name  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_org_name ON organizations(name);

-- org_members table
CREATE TABLE org_members (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',   -- owner, admin, member
  joined_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, user_id)
);
```

### 2.2 Skill name migration

```sql
-- Rename existing skills: "code-review" → "@username/code-review"
UPDATE skills s
SET name = '@' || u.username || '/' || s.name
FROM users u
WHERE u.id = s.owner_id
AND s.name NOT LIKE '@%';

-- Update publish_attempts history
UPDATE publish_attempts pa
SET skill_name = '@' || u.username || '/' || pa.skill_name
FROM skills s
JOIN users u ON u.id = s.owner_id
WHERE pa.skill_name = s.name  -- old name (before skills update)
AND pa.skill_name NOT LIKE '@%';
```

**Note:** The UNIQUE constraint on `skills.name` stays — the full `@scope/name` string is globally unique.

### 2.3 R2 storage key migration

Existing R2 keys:

```
packages/code-review/1.0.0.skl
bundles/code-review/1.0.0.sigstore
```

Need to become:

```
packages/@alice/code-review/1.0.0.skl
bundles/@alice/code-review/1.0.0.sigstore
```

**Approach:** Copy objects to new keys, then delete old keys. R2 supports `/` in keys natively.

Also update the stored `skl_storage_key` and `sigstore_bundle_key` columns in the `versions` table.

### 2.4 Search vector refresh

After renaming skills, refresh the `search_vector` tsvector column so full-text search indexes the new scoped names:

```sql
UPDATE skills SET search_vector =
  setweight(to_tsvector('english', name), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B');
```

---

## 3. API Route Changes

### 3.1 The routing problem

Current routes use `:name` as a single path segment:

```
GET /skills/:name
GET /skills/:name/:version
```

A request to `/skills/@alice/my-skill/1.0.0` breaks — Hono captures `:name` = `@alice`, `:version` = `my-skill`.

### 3.2 Solution: npm-style split routes

Add parallel scoped routes. Both patterns coexist:

```
# Scoped (new)
GET    /skills/@:scope/:name
GET    /skills/@:scope/:name/:version
GET    /skills/@:scope/:name/:version/download
DELETE /skills/@:scope/:name/:version
PATCH  /skills/@:scope/:name
POST   /skills/@:scope/:name/sign
POST   /skills/@:scope/:name/rescan
POST   /skills/@:scope/:name/report
GET    /skills/@:scope/:name/reviews
POST   /skills/@:scope/:name/reviews
GET    /skills/@:scope/:name/collaborators
POST   /skills/@:scope/:name/collaborators
DELETE /skills/@:scope/:name/collaborators/:username
GET    /skills/@:scope/:name/downloads

# Admin scoped
GET    /admin/skills/@:scope/:name/versions/:version
POST   /admin/skills/@:scope/:name/yank
POST   /admin/skills/@:scope/:name/block
POST   /admin/skills/@:scope/:name/unblock
POST   /admin/skills/@:scope/:name/rescan
POST   /admin/skills/@:scope/:name/approve
```

### 3.3 Implementation approach

Create a helper that extracts the full skill name from route params:

```typescript
// Helper: extract full skill name from route params
function extractSkillName(c: Context): string {
  const scope = c.req.param('scope');
  const name = c.req.param('name');
  if (scope) {
    return `@${scope}/${name}`;
  }
  return name;
}
```

To avoid duplicating all route handlers, use a route-registration helper:

```typescript
// Register both scoped and unscoped routes with the same handler
function skillRoute(method, pathSuffix, ...handlers) {
  router[method](`/skills/@:scope/:name${pathSuffix}`, ...handlers);
  router[method](`/skills/:name${pathSuffix}`, ...handlers);
}

// Usage:
skillRoute('get', '', authed, getSkillHandler);
skillRoute('get', '/:version', authed, getVersionHandler);
```

**Important:** Register scoped routes BEFORE unscoped routes so `@scope` doesn't get captured as a bare name.

### 3.4 Publish endpoint

`POST /skills` doesn't use `:name` in the route — the name comes from the manifest body. Changes needed:

- Validate that name starts with `@` (reject unscoped names)
- Validate that the authenticated user owns the scope (is the user, or is a member of the org)
- Scope validation logic:

```typescript
const scopeMatch = name.match(/^@([a-z0-9-]+)\//);
if (!scopeMatch) {
  return error('VALIDATION_ERROR', 'Skill name must be scoped: @scope/name');
}
const scope = scopeMatch[1];

// Check if scope is user's own username
const user = await getUser(userId);
if (user.username === scope) {
  // OK — publishing to own scope
} else {
  // Check org membership
  const org = await getOrg(scope);
  if (!org) return error('FORBIDDEN', `Scope @${scope} does not exist`);
  const membership = await getOrgMember(org.id, userId);
  if (!membership || membership.role === 'read-only') {
    return error('FORBIDDEN', `You are not authorized to publish to @${scope}`);
  }
}
```

### 3.5 Resolve endpoint

`POST /resolve` takes skill names in the request body. No route change needed — just ensure the names in the request are full scoped names. The lookup `WHERE name = ${skillName}` works as-is.

Update generated URLs in resolve response:

```typescript
// Current (broken for scoped names):
download_url: `/api/v1/skills/${name}/${version}/download`;

// Fixed:
download_url: `/api/v1/skills/${encodeURIComponent(name)}/${version}/download`;
// OR split: `/api/v1/skills/@${scope}/${bareName}/${version}/download`
```

---

## 4. Shared Schema Changes

### File: `packages/shared/src/schemas.ts`

```typescript
// Before (scope optional):
export const SkillNameSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^(@[a-z0-9-]+\/)?[a-z][a-z0-9-]*$/, '...');

// After (scope mandatory):
export const SkillNameSchema = z
  .string()
  .min(4)
  .max(64) // min 4: "@a/b" is shortest valid name
  .regex(/^@[a-z0-9-]+\/[a-z][a-z0-9-]*$/, 'Must be scoped: @scope/skill-name (kebab-case)');
```

---

## 5. Go CLI Changes

### 5.1 Manifest validation

**File:** `cli-go/internal/manifest/validate.go`

Update name regex to require scope:

```go
// Before:
var nameRe = regexp.MustCompile(`^(@[a-z0-9-]+/)?[a-z][a-z0-9-]*$`)

// After:
var nameRe = regexp.MustCompile(`^@[a-z0-9-]+/[a-z][a-z0-9-]*$`)
```

Update error message accordingly.

### 5.2 API client URL construction

**File:** `cli-go/internal/api/client.go`

All methods already use `url.PathEscape(name)` which encodes `@org/skill` to `%40org%2Fskill`.

**Decision needed:** If API routes use npm-style split (`/@:scope/:name`), the client needs to split the name and construct the path differently:

```go
// Helper to build skill path
func skillPath(name string) string {
    // "@scope/skill" → "/@scope/skill" (no encoding needed, scope is a path segment)
    if strings.HasPrefix(name, "@") {
        return "/" + name  // results in /@scope/skill
    }
    return "/" + url.PathEscape(name)
}

// Usage:
// Info: /skills/@alice/my-skill
func (c *Client) Info(name string) (*SkillInfo, error) {
    path := "/skills" + skillPath(name)
    // ...
}

// GetVersion: /skills/@alice/my-skill/1.0.0
func (c *Client) GetVersion(name, version string) (*VersionInfo, error) {
    path := fmt.Sprintf("/skills%s/%s", skillPath(name), url.PathEscape(version))
    // ...
}
```

Affected methods (all in `client.go`):

- `Info()`, `GetVersion()`, `DownloadURL()`, `Download()`
- `Yank()`, `Deprecate()`, `Report()`
- `GetCollaborators()`, `AddCollaborator()`, `RemoveCollaborator()`
- `VerifySignature()`, `AttachSignature()`, `Rescan()`

### 5.3 Name parsing bug fix

**File:** `cli-go/cmd/info.go` — `splitNameVersion()` uses `strings.Index("@")` which finds the scope `@` instead of the version `@`. Must change to `strings.LastIndex`.

**File:** `cli-go/cmd/yank.go` — `parseNameVersion()` already uses `LastIndex`. No change needed.

### 5.4 File system paths

**File:** `cli-go/cmd/install.go`

Skills are stored on disk at `~/.spm/skills/{name}/{version}/`. Scoped names with `@` and `/` need sanitization for the filesystem:

```go
// @alice/my-skill → @alice/my-skill (use nested dirs)
// Store as: ~/.spm/skills/@alice/my-skill/1.0.0/
skillDir := filepath.Join(spmHome, "skills", skill.Name, skill.Version)
```

This actually works on Linux/macOS — `@` is valid in directory names, and `/` creates a subdirectory naturally. On Windows, this also works.

The structure becomes:

```
~/.spm/skills/
  @alice/
    my-skill/
      1.0.0/
        SKILL.md
        manifest.json
  @bob/
    ship/
      2.0.0/
        ...
```

This is clean and mirrors npm's `node_modules/@scope/package/` structure.

**File:** `cli-go/internal/linker/linker.go` — Same approach. `filepath.Join(agentDir, skillName)` where `skillName` = `@alice/my-skill` creates nested dirs naturally.

**File:** `cli-go/cmd/uninstall.go` — Same pattern for deletion paths.

### 5.5 Resolver

**File:** `cli-go/internal/resolver/resolver.go` — Already fully supports scoped names. `Parse()` handles `@scope/name@version` correctly. No changes needed.

### 5.6 Lock file (skills.json)

**File:** `cli-go/internal/skillsjson/skillsjson.go`

Lock file uses skill name as JSON key. Scoped names work as JSON keys:

```json
{
  "skills": {
    "@alice/code-review": "^1.0.0"
  },
  "lock": {
    "@alice/code-review": {
      "version": "1.0.0",
      "checksum_sha256": "abc123",
      "download_url": "..."
    }
  }
}
```

No structural change needed — just data changes when users re-install.

### 5.7 Publish output URL

**File:** `cli-go/cmd/publish.go` — `buildSkillPageURL()` constructs `https://skillpkg.dev/skills/{name}`. With scoped names, this becomes `https://skillpkg.dev/skills/@alice/my-skill`. Works if web routing is also updated (see section 6).

---

## 6. Web App Changes

### 6.1 React Router

**File:** `packages/web/src/App.tsx`

```tsx
// Before:
<Route path="/skills/:name" element={<SkillDetail />} />

// After (support scoped names):
<Route path="/skills/@:scope/:name" element={<SkillDetail />} />
<Route path="/skills/:name" element={<SkillDetail />} />  // keep for backwards compat redirects
```

**File:** `packages/web/src/pages/skill-detail/index.tsx`

```tsx
// Before:
const { name } = useParams<{ name: string }>();

// After:
const { scope, name } = useParams<{ scope?: string; name: string }>();
const fullName = scope ? `@${scope}/${name}` : name!;
```

### 6.2 Links throughout the app

All skill links need to split the scoped name into path segments. Create a helper:

```typescript
// lib/urls.ts
export function skillPagePath(name: string): string {
  // "@alice/my-skill" → "/skills/@alice/my-skill"
  return `/skills/${name}`;
}
```

Files to update (replace `` `/skills/${skill.name}` `` with `skillPagePath(skill.name)`):

| File                               | Line |
| ---------------------------------- | ---- |
| `components/SkillCard.tsx`         | 14   |
| `components/SkillRow.tsx`          | 19   |
| `pages/Search.tsx`                 | 56   |
| `pages/AuthorProfile.tsx`          | 140  |
| `pages/home/TrendingTabs.tsx`      | 155  |
| `pages/home/HeroSearch.tsx`        | 275  |
| `pages/skill-detail/SkillHero.tsx` | 171  |

### 6.3 API calls (no changes needed)

**File:** `packages/web/src/lib/api.ts` — Already uses `encodeURIComponent(name)` for API calls. Works correctly with scoped names.

---

## 7. MCP / Plugin Compatibility

### 7.1 Search

Search works transparently. Searching "ship" returns all skills with "ship" in the name regardless of scope. Results include the full scoped name:

```
1. @alice/ship v1.0.0 by alice ⭐ 4.5 (12 reviews) ↓ 340
2. @bob/ship-it v2.1.0 by bob ✓ ⭐ 4.8 (5 reviews) ↓ 120
```

Ordering uses `ts_rank` (relevance) by default with a name-match boost. Scoped names don't affect ranking — Postgres tsvector tokenizes `@alice/ship` and extracts "ship" as a searchable term.

### 7.2 get_skill tool

MCP clients pass full scoped name: `get_skill({ name: "@alice/ship" })`. The lookup is `WHERE name = $name` — exact match on full scoped name. Works.

### 7.3 Install command in output

**File:** `packages/api/src/mcp/format.ts`

The formatted output shows `Install: spm install ${skill.name}`. With scoped names this becomes `Install: spm install @alice/ship`. Correct — no change needed.

### 7.4 Tool description update

Update example in `mcp/tools.ts:37`:

```typescript
// Before:
description: 'e.g. "pdf-generator"';
// After:
description: 'e.g. "@alice/pdf-generator"';
```

---

## 8. Migration Execution Order

### Phase 1: Schema + API (can deploy independently)

1. **Add org tables migration** — new tables only, no breaking changes
2. **Add scoped route handlers** — register `/@:scope/:name` routes alongside existing `:name` routes
3. **Add scope validation to publish** — require `@scope/name` format for new publishes
4. **Add scope authorization** — verify user owns the scope (username match or org membership)

### Phase 2: Data migration (coordinate deploy)

5. **Rename existing skills in DB** — `UPDATE skills SET name = '@' || username || '/' || name`
6. **Copy R2 objects to new keys** — `packages/skill → packages/@user/skill`
7. **Update versions table** — fix `skl_storage_key` and `sigstore_bundle_key` columns
8. **Refresh search vectors** — re-index with new scoped names

### Phase 3: Client updates

9. **Update shared schema** — make scope mandatory in `SkillNameSchema`
10. **Update Go CLI** — API client URL construction, `info.go` parser fix
11. **Update web app** — React Router, link helpers
12. **Update MCP tool descriptions** — example text

### Phase 4: Cleanup

13. **Remove unscoped route handlers** (or keep as redirects)
14. **Delete old R2 keys**
15. **Update documentation and plan docs**
16. **Users delete and re-install lock files**
17. **Remove interim scope-stripping workarounds** (see Appendix A)

---

## 9. Breaking Changes Summary

| What                  | Who's affected             | Mitigation                                                                 |
| --------------------- | -------------------------- | -------------------------------------------------------------------------- |
| Skill names change    | Lock files (`skills.json`) | Delete and re-install. Only current user affected.                         |
| Manifest `name` field | Skill authors              | Must update `manifest.json` to `@scope/name` before next publish           |
| API URLs              | API consumers, MCP clients | Scoped routes coexist with unscoped during transition                      |
| Web URLs              | Bookmarks, shared links    | Old `/skills/code-review` can 301 redirect to `/skills/@alice/code-review` |
| `spm install skill`   | CLI users                  | Must use `spm install @scope/skill`                                        |

---

## 10. Testing Checklist

- [ ] Publish with scoped name succeeds
- [ ] Publish without scope is rejected with clear error
- [ ] Publish to someone else's scope is rejected
- [ ] Publish to own org scope succeeds (if member with write role)
- [ ] Search returns scoped names correctly
- [ ] Search by bare name (no scope) still finds matching skills
- [ ] MCP search_skills returns scoped names
- [ ] MCP get_skill with scoped name works
- [ ] Install scoped skill creates correct directory structure
- [ ] Uninstall scoped skill cleans up correctly
- [ ] Lock file uses full scoped name as key
- [ ] Web app displays scoped names correctly
- [ ] Web app routes work: `/skills/@alice/my-skill`
- [ ] API routes work: `GET /skills/@alice/my-skill`
- [ ] API routes work: `GET /skills/@alice/my-skill/1.0.0`
- [ ] Download URL in resolve response works with scoped names
- [ ] Sign command works with scoped names
- [ ] Yank command works with scoped names
- [ ] R2 storage keys work with scoped names
- [ ] Old unscoped URLs redirect to scoped versions
- [ ] Org create/list/members CLI commands work
- [ ] Org member can publish to org scope
- [ ] Non-member cannot publish to org scope

---

## Appendix A: Interim Workarounds (to remove in Phase 4)

The following temporary fixes were added to handle `org/name` input (e.g., `skillpkg/ship`) before scoped names are fully implemented. They work around the flat-namespace DB by stripping scope prefixes. **All must be removed or replaced** once the migration to mandatory scoped names is complete.

### 1. CLI resolver: `org/name` → scope parsing (v1.1.1)

**File:** `cli-go/internal/resolver/resolver.go`

The `Parse()` function was updated to treat unscoped `org/name` (without `@`) as a scoped specifier — e.g., `skillpkg/ship` parses as `scope=skillpkg, name=ship`, and `FullName()` returns `@skillpkg/ship`.

**Remove when:** Scoped names are mandatory. The `@scope/name` path already worked; the `org/name` shorthand won't be needed once all names are scoped.

### 2. API resolve: scope-stripping fallback (v1.1.1)

**File:** `packages/api/src/routes/resolve.ts`

The resolve endpoint tries an exact DB match first, then strips the scope prefix and retries:

```typescript
if (!skill && name.includes('/')) {
  const bareName = name.split('/').pop()!;
  [skill] = await db.select().from(skills).where(eq(skills.name, bareName)).limit(1);
}
```

It also uses `canonicalName = skill.name` (the DB name) instead of the input name for download URLs, and compares bare names for did-you-mean suggestions.

**Remove when:** DB stores scoped names. The exact match (`WHERE name = '@scope/skill'`) will work directly and no fallback is needed.

### 3. CLI config: `/api/v1` suffix stripping (v1.1.2)

**File:** `cli-go/internal/config/config.go`

`RegistryURL()` strips trailing `/api/v1` from the config value to prevent double-pathing (`/api/v1/api/v1/...`). This was caused by some configs saving the full API URL instead of just the base URL.

**Keep:** This is a defensive fix unrelated to scoped names — it should stay permanently.

### 4. CLI download: direct-serve handler (v1.1.3)

**File:** `cli-go/internal/api/client.go`

Added `Download()` method that handles direct 200 responses (not just 302 redirects) from the download endpoint.

**Keep:** This is a protocol fix unrelated to scoped names — it should stay permanently.
