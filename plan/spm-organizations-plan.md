# SPM — Organizations & Private Skills Implementation Plan

## Overview

Add organization support to SPM so teams can share a namespace (`@mycompany/*`), publish private skills visible only to org members, and optionally route scopes to custom registries.

**Four phases, each independently shippable:**

| Phase | Feature | Value |
|-------|---------|-------|
| 1 | Organizations | Teams share a `@org` scope for publishing |
| 2 | Private Skills | Org-only visibility, gated downloads |
| 3 | Scoped Registries | Route `@org` to a custom registry URL |
| 4 | Federation | Sync, mirrors, proxy mode |

---

## Phase 1: Organizations

### What it enables

- Create an org: `spm org create mycompany`
- Invite members: `spm org invite mycompany alice --role=admin`
- Any member with `admin` or `owner` role can publish to `@mycompany/*`
- Org profile page on skillpkg.dev showing all org skills

### 1.1 Database Migration

```sql
-- 003_organizations.sql

CREATE TABLE organizations (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT UNIQUE NOT NULL,       -- slug: "mycompany" (same rules as username)
  display_name TEXT,                       -- "My Company Inc."
  description  TEXT,
  avatar_url   TEXT,
  website      TEXT,
  created_by   TEXT NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_org_name ON organizations(name);

CREATE TABLE org_members (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id    TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);
```

**Roles:**

| Role | Publish | Invite/Remove | Settings | Delete Org |
|------|---------|---------------|----------|------------|
| owner | yes | yes | yes | yes |
| admin | yes | yes | yes | no |
| member | yes | no | no | no |

The creator automatically gets `owner` role.

### 1.2 Drizzle Schema

```typescript
// packages/api/src/db/schema.ts

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').unique().notNull(),
  displayName: text('display_name'),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  website: text('website'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const orgMembers = pgTable('org_members', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  unique: unique().on(t.orgId, t.userId),
}));
```

### 1.3 API Endpoints

All under `/api/v1/orgs`:

```
POST   /orgs                        — Create org (authed)
GET    /orgs/:name                   — Get org info (public)
PATCH  /orgs/:name                   — Update org (owner/admin)
DELETE /orgs/:name                   — Delete org (owner only)
GET    /orgs/:name/members           — List members (public)
POST   /orgs/:name/members           — Add member (owner/admin)
PATCH  /orgs/:name/members/:username — Change role (owner/admin)
DELETE /orgs/:name/members/:username — Remove member (owner/admin, or self-leave)
GET    /orgs/:name/skills            — List org skills (public)
GET    /users/:username/orgs         — List user's orgs (public)
```

**Create org request:**

```json
POST /orgs
{
  "name": "mycompany",
  "display_name": "My Company Inc.",
  "description": "Internal AI skills for our team"
}
```

**Create org response:**

```json
{
  "id": "uuid",
  "name": "mycompany",
  "display_name": "My Company Inc.",
  "description": "Internal AI skills for our team",
  "members": [
    { "username": "almog27", "role": "owner", "joined_at": "..." }
  ],
  "created_at": "..."
}
```

**Org name validation:**
- Same rules as usernames: `^[a-z0-9][a-z0-9-]*$`, 2-39 chars
- Cannot conflict with existing usernames (scopes must be globally unique)
- Reserved names: `admin`, `api`, `www`, `staging`, `registry`, `spm`, etc.

### 1.4 Publish Authorization Changes

When publishing `@scope/skill-name`, the API checks:

```typescript
// In POST /skills publish handler
const scopeMatch = manifest.name.match(/^@([a-z0-9-]+)\//);
if (!scopeMatch) {
  return error(422, 'Skill name must be scoped: @scope/skill-name');
}

const scope = scopeMatch[1];

// Check 1: Is it the user's own scope?
if (user.username === scope) {
  // OK — publishing to personal scope
}
// Check 2: Is it an org scope?
else {
  const org = await db.select().from(organizations)
    .where(eq(organizations.name, scope)).limit(1);

  if (!org[0]) {
    return error(403, `Scope @${scope} does not exist. Create it with: spm org create ${scope}`);
  }

  const membership = await db.select().from(orgMembers)
    .where(and(
      eq(orgMembers.orgId, org[0].id),
      eq(orgMembers.userId, user.id)
    )).limit(1);

  if (!membership[0]) {
    return error(403, `You are not a member of @${scope}`);
  }
  // All roles (owner, admin, member) can publish
}
```

### 1.5 CLI Commands

```bash
# Create an organization
$ spm org create mycompany
  Created organization @mycompany
  You are the owner.

$ spm org create mycompany --display-name "My Company Inc."

# List your orgs
$ spm org list
  @mycompany    owner    My Company Inc.
  @oss-team     member   Open Source Team

# View org info
$ spm org info mycompany
  @mycompany — My Company Inc.
  Members: 3 (1 owner, 1 admin, 1 member)
  Skills:  5 published

# Manage members
$ spm org invite mycompany alice
  Invited @alice to @mycompany as member

$ spm org invite mycompany bob --role=admin
  Invited @bob to @mycompany as admin

$ spm org members mycompany
  @almog27   owner    joined 2026-01-15
  @bob       admin    joined 2026-02-01
  @alice     member   joined 2026-03-10

$ spm org role mycompany alice admin
  Changed @alice role to admin in @mycompany

$ spm org remove mycompany alice
  Removed @alice from @mycompany

# Leave an org (self)
$ spm org leave mycompany
  Left @mycompany
```

### 1.6 Publishing to an Org

**manifest.json** — the `name` field uses the org scope:

```json
{
  "name": "@mycompany/internal-report",
  "version": "1.0.0",
  "description": "Generate quarterly reports from our data warehouse",
  "categories": ["data"],
  "authors": [{ "name": "Alice", "username": "alice" }]
}
```

**Publishing flow — identical to personal skills:**

```bash
$ cd my-skill/
$ spm publish

  Publishing @mycompany/internal-report@1.0.0...

  Packing...         3 files, 2.1 KB
  Signing...          Sigstore keyless (almog27@gmail.com)
  Scanning...         Layer 1: passed, Layer 2: passed, Layer 3: passed
  Uploading...        registry.skillpkg.dev

  Published @mycompany/internal-report@1.0.0
  https://skillpkg.dev/skills/@mycompany/internal-report
```

The API verifies that the authenticated user (almog27) is a member of `@mycompany`. If not, publish is rejected.

### 1.7 skills.json / skills-lock.json

No structural changes. Org skills look the same as personal skills:

**skills.json:**

```json
{
  "skills": {
    "@mycompany/internal-report": "^1.0.0",
    "@almog27/ship": "^2.0.0",
    "@github/code-review": "^1.0.0"
  }
}
```

**skills-lock.json:**

```json
{
  "lockfileVersion": 1,
  "generated_at": "2026-04-11T10:00:00Z",
  "generated_by": "spm@1.3.0",
  "skills": {
    "@mycompany/internal-report": {
      "version": "1.0.0",
      "resolved": "https://registry.skillpkg.dev/api/v1/skills/@mycompany/internal-report/1.0.0/download",
      "checksum": "sha256:abc123...",
      "source": "registry",
      "signer": "alice@mycompany.com"
    },
    "@almog27/ship": {
      "version": "2.1.0",
      "resolved": "https://registry.skillpkg.dev/api/v1/skills/@almog27/ship/2.1.0/download",
      "checksum": "sha256:def456...",
      "source": "registry",
      "signer": "almog27@gmail.com"
    }
  }
}
```

### 1.8 Web App

**Org profile page** (`/orgs/:name`):
- Org name, display name, description, avatar, website
- Member count, skill count
- List of published skills (reuse SkillRow component)
- Members list (avatar, username, role)

**Links:**
- "by @mycompany" in SkillCard/SkillRow links to `/orgs/mycompany`
- Author vs org detection: check if scope is an org or a user

### 1.9 Shared Schema Changes

```typescript
// packages/shared/src/schemas.ts

// New schemas
export const OrgNameSchema = z.string()
  .min(2).max(39)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Org name must be lowercase alphanumeric with hyphens');

export const OrgRoleSchema = z.enum(['owner', 'admin', 'member']);

export const CreateOrgSchema = z.object({
  name: OrgNameSchema,
  display_name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export const AddMemberSchema = z.object({
  username: z.string(),
  role: OrgRoleSchema.default('member'),
});
```

### 1.10 Go CLI Implementation

New file: `cli-go/cmd/org.go` with subcommands:

```go
var orgCmd = &cobra.Command{
  Use:   "org",
  Short: "Manage organizations",
}

var orgCreateCmd = &cobra.Command{
  Use:   "create <name>",
  Short: "Create a new organization",
}

var orgListCmd = &cobra.Command{
  Use:   "list",
  Short: "List your organizations",
}

var orgInfoCmd = &cobra.Command{
  Use:   "info <name>",
  Short: "Show organization details",
}

var orgInviteCmd = &cobra.Command{
  Use:   "invite <org> <username>",
  Short: "Add a member to an organization",
}

var orgMembersCmd = &cobra.Command{
  Use:   "members <name>",
  Short: "List organization members",
}

var orgRemoveCmd = &cobra.Command{
  Use:   "remove <org> <username>",
  Short: "Remove a member from an organization",
}

var orgRoleCmd = &cobra.Command{
  Use:   "role <org> <username> <role>",
  Short: "Change a member's role",
}

var orgLeaveCmd = &cobra.Command{
  Use:   "leave <name>",
  Short: "Leave an organization",
}
```

API client additions in `cli-go/internal/api/client.go`:

```go
func (c *Client) CreateOrg(name, displayName, description string) (*OrgInfo, error)
func (c *Client) GetOrg(name string) (*OrgInfo, error)
func (c *Client) ListMyOrgs() ([]OrgSummary, error)
func (c *Client) AddOrgMember(org, username, role string) error
func (c *Client) RemoveOrgMember(org, username string) error
func (c *Client) ChangeOrgRole(org, username, role string) error
func (c *Client) ListOrgMembers(org string) ([]OrgMember, error)
```

---

## Phase 2: Private Skills

### What it enables

- Mark a skill as private: `"private": true` in manifest.json
- Only org members can see, search, or install private skills
- Public registry stores private skills (encrypted at rest in R2)

### 2.1 Database Changes

```sql
-- Add visibility to skills table
ALTER TABLE skills ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';
-- Values: 'public', 'private'

CREATE INDEX idx_skills_visibility ON skills(visibility);
```

### 2.2 Manifest Changes

The `private` field already exists in ManifestSchema (defaults to `false`). When `private: true`:

```json
{
  "name": "@mycompany/internal-report",
  "version": "1.0.0",
  "private": true,
  "description": "Internal quarterly report generator",
  "categories": ["data"]
}
```

### 2.3 API Changes

**Publish:** When `manifest.private === true`:
- Require that the scope is an org (not a personal scope — personal private skills are not supported initially)
- Set `skills.visibility = 'private'`

**Search / List:** Filter out private skills unless the requesting user is a member of the owning org:

```typescript
// In search query
const visibilityFilter = user
  ? or(
      eq(skills.visibility, 'public'),
      and(
        eq(skills.visibility, 'private'),
        inArray(skills.ownerId, userOrgSkillOwnerIds) // user's org skills
      )
    )
  : eq(skills.visibility, 'public');
```

**GET /skills/:name:** Return 404 for private skills if user is not an org member.

**Download:** Return 403 for private skills if user is not an org member. Require auth token.

### 2.4 CLI Changes

**Install private skills:**

```bash
$ spm install @mycompany/internal-report
  Resolving @mycompany/internal-report...
  Downloading @mycompany/internal-report@1.0.0...
  Installed @mycompany/internal-report@1.0.0

# If not a member:
$ spm install @mycompany/internal-report
  Error: You don't have access to @mycompany/internal-report
  This is a private skill. Ask an admin of @mycompany for access.
```

**Search:** Private skills appear in search results only for org members:

```bash
$ spm search report
  @mycompany/internal-report v1.0.0  (private)  Internal quarterly report
  @alice/pdf-report          v2.0.0             Generate PDF reports
```

### 2.5 Web App Changes

- Private skills show a lock icon / "Private" badge
- Private skill detail pages return 404 for non-members
- Dashboard shows private skills with a badge
- Search results show private skills only for members

### 2.6 skills.json / skills-lock.json

No structural changes. Private skills are listed the same way. The lock file stores the download URL which requires auth:

```json
{
  "skills": {
    "@mycompany/internal-report": "^1.0.0"
  }
}
```

The CLI sends the auth token when downloading. If the token is missing or the user isn't an org member, the download fails with 403.

---

## Phase 3: Scoped Registries

### What it enables

- Route `@mycompany` to a self-hosted registry
- CLI resolves registry URL from scope config
- Mix public and private registries in the same project

### 3.1 CLI Config

```json
// ~/.spm/config.json
{
  "registries": {
    "default": "https://registry.skillpkg.dev/api/v1",
    "@mycompany": "https://spm.mycompany.com/api/v1"
  },
  "credentials": {
    "@mycompany": {
      "type": "api_token",
      "token": "encrypted_..."
    }
  }
}
```

### 3.2 CLI Commands

```bash
# Add a custom registry for a scope
$ spm registry add @mycompany https://spm.mycompany.com
  Added registry for @mycompany: https://spm.mycompany.com/api/v1

# Login to a custom registry
$ spm registry login @mycompany
  Authenticating with https://spm.mycompany.com...
  Token saved.

# List configured registries
$ spm registry list
  default      https://registry.skillpkg.dev/api/v1
  @mycompany   https://spm.mycompany.com/api/v1  (authenticated)

# Remove
$ spm registry remove @mycompany
```

### 3.3 Resolution Logic

```go
// cli-go/internal/config/registry.go

func RegistryForScope(name string) string {
  config := LoadConfig()

  if strings.HasPrefix(name, "@") {
    scope := name[:strings.Index(name, "/")]  // "@mycompany"
    if url, ok := config.Registries[scope]; ok {
      return url
    }
  }

  return config.Registries["default"]
}
```

### 3.4 skills.json with Mixed Registries

```json
{
  "skills": {
    "@mycompany/internal-report": "^1.0.0",
    "@almog27/ship": "^2.0.0"
  }
}
```

The CLI resolves each skill to its registry independently:
- `@mycompany/internal-report` → `spm.mycompany.com`
- `@almog27/ship` → `registry.skillpkg.dev`

### 3.5 Cross-Registry Dependencies

A skill on one registry can depend on skills from other registries:

```json
// @mycompany/internal-report manifest.json
{
  "name": "@mycompany/internal-report",
  "dependencies": {
    "skills": {
      "@almog27/pdf-generator": "^1.0.0"
    }
  }
}
```

Install resolves each dependency to its own registry based on scope.

---

## Phase 4: Federation

### What it enables

- Companies mirror public skills locally
- Proxy mode: thin gateway that adds private skills to public namespace
- Regional mirrors for performance

This phase is documented in detail in `plan/spm-federation.md`. Key additions:

### 4.1 Self-Hosted Registry Template

Provide a Docker image / template that companies can deploy:

```bash
$ docker run -d \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=... \
  -p 3000:3000 \
  skillpkg/registry:latest
```

### 4.2 Federation API Endpoints

```
GET /api/v1/federation/catalog     — All skills with metadata (paginated)
GET /api/v1/federation/changes     — Incremental changes since sync_token
GET /api/v1/federation/health      — Registry health + role info
```

### 4.3 Sync Configuration

```yaml
# federation.yml on private registry
federation:
  upstream: https://registry.skillpkg.dev/api/v1
  sync:
    mode: selective
    schedule: "0 */6 * * *"
    allowlist:
      categories: ["data", "code"]
      trust_levels: ["verified", "official"]
```

---

## Implementation Order

### Phase 1: Organizations (estimated scope)

**Migration:**
1. Write `migrations/003_organizations.sql`
2. Add Drizzle schema for `organizations` + `orgMembers`

**Shared:**
3. Add `OrgNameSchema`, `OrgRoleSchema`, `CreateOrgSchema`, `AddMemberSchema` to shared schemas
4. Add org-related error codes

**API:**
5. Create `packages/api/src/routes/orgs.ts` with all CRUD endpoints
6. Update publish handler in `skills.ts` to check org membership
7. Add scope uniqueness validation (org name can't match existing username)

**CLI:**
8. Create `cli-go/cmd/org.go` with all subcommands
9. Add org API client methods to `cli-go/internal/api/client.go`
10. Add org types to `cli-go/internal/api/types.go`

**Web:**
11. Create org profile page (`/orgs/:name`)
12. Update "by @scope" links to route to org page when scope is an org
13. Add org creation/management UI in dashboard

**Tests:**
14. API tests for org CRUD, membership, publish authorization
15. CLI tests for org commands
16. Web tests for org profile page

### Phase 2: Private Skills (estimated scope)

1. Migration: add `visibility` column
2. Update publish handler to set visibility
3. Update search/list/get/download to filter by visibility + membership
4. CLI: show private badge, handle 403 on install
5. Web: private badge, filtered search results
6. Tests

### Phase 3: Scoped Registries (estimated scope)

1. CLI config: `~/.spm/config.json` with registries map
2. CLI commands: `spm registry add/remove/list/login`
3. Resolution logic: scope → registry URL mapping
4. Auth: per-registry credential storage
5. Cross-registry dependency resolution
6. Tests

### Phase 4: Federation (estimated scope)

1. Federation API endpoints
2. Self-hosted registry Docker template
3. Sync service
4. Proxy mode
5. Documentation

---

## Key Design Decisions

1. **Org names share namespace with usernames** — `@almog27` and `@mycompany` are in the same namespace. Creating org `mycompany` blocks anyone from registering username `mycompany`. This prevents scope confusion.

2. **All roles can publish** — Unlike GitHub where only maintainers can push, all org members can publish skills. This reduces friction. Orgs that want stricter control can use admin-only publishing (future enhancement).

3. **Private skills require org scope** — Personal private skills (`@alice/secret-tool`) are not supported initially. Private = org feature. This simplifies access control.

4. **No skill transfer between scopes** — Once published as `@mycompany/tool`, it stays there. No renaming to `@alice/tool`. Users can deprecate and re-publish under a new name.

5. **Public registry stores private skills** — Private skills are stored in the same R2 bucket but access-controlled at the API level. This is simpler than running separate infrastructure. Companies wanting full data sovereignty should use scoped registries (Phase 3).
