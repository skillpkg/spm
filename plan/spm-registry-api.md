# SPM Registry API Specification

Base URL: `https://registry.spm.dev/api/v1`

Framework: Hono (Cloudflare Workers)
Database: Neon Postgres
Object Storage: Cloudflare R2
Auth: GitHub OAuth device flow → JWT bearer tokens

---

## 1. Authentication

All write operations require a Bearer token. Read operations (search, download) are public.

```
Authorization: Bearer spm_<jwt>
```

### POST /auth/device-code

Start GitHub OAuth device flow. Called by `spm login`.

**Request:**

```json
{
  "client_id": "spm_github_client_id"
}
```

**Response: 200**

```json
{
  "device_code": "abc123",
  "user_code": "ABCD-1234",
  "verification_uri": "https://github.com/login/device",
  "expires_in": 900,
  "interval": 5
}
```

### POST /auth/token

Poll for token after user completes GitHub auth. CLI polls every `interval` seconds.

**Request:**

```json
{
  "device_code": "abc123",
  "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
}
```

**Response: 200 (authorized)**

```json
{
  "token": "spm_eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "username": "almog",
    "github_login": "almog",
    "trust_tier": "verified",
    "created_at": "2025-11-01T00:00:00Z"
  }
}
```

**Response: 428 (pending — user hasn't authorized yet)**

```json
{
  "error": "authorization_pending"
}
```

**Response: 410 (expired — device code timed out)**

```json
{
  "error": "expired_token"
}
```

### GET /auth/whoami

Get current authenticated user.

**Headers:** `Authorization: Bearer spm_<jwt>`

**Response: 200**

```json
{
  "id": "uuid",
  "username": "almog",
  "github_login": "almog",
  "email": "almog@example.com",
  "trust_tier": "verified",
  "role": "admin",
  "skills_published": 3,
  "total_downloads": 24600,
  "created_at": "2025-11-01T00:00:00Z"
}
```

The `role` field is used by the web UI to conditionally show the admin nav link. The admin panel itself lives on a **separate domain** (`admin.spm.dev`) as an independent deployment — this gives CORS isolation, separate deploy pipeline, and no risk of admin routes leaking into the public bundle.

### POST /auth/logout

Revoke current token.

**Response: 204** (no content)

---

## 2. Skills

### GET /skills

Search and list skills. Powers both CLI `spm search` and web UI.

**Query parameters:**

| Param      | Type   | Description                                                         |
| ---------- | ------ | ------------------------------------------------------------------- |
| `q`        | string | Full-text search (name, description, tags)                          |
| `category` | string | Filter by category slug (`data-viz`, `frontend`, etc.)              |
| `trust`    | string | Minimum trust tier: `registered`, `scanned`, `verified`, `official` |
| `platform` | string | Filter by platform: `all`, `claude-code`, `cursor`, `codex`, etc.   |
| `sort`     | string | `relevance` (default), `downloads`, `rating`, `updated`, `new`      |
| `page`     | int    | Page number (default: 1)                                            |
| `per_page` | int    | Results per page (default: 20, max: 100)                            |

**Response: 200**

```json
{
  "results": [
    {
      "name": "data-viz",
      "version": "1.2.3",
      "description": "Charts, dashboards, and visualizations from CSV, JSON, or database output",
      "author": {
        "username": "almog",
        "trust_tier": "verified"
      },
      "category": "data-viz",
      "tags": ["charts", "plotly", "d3", "dashboards"],
      "platforms": ["all"],
      "downloads": 12400,
      "weekly_downloads": 1200,
      "rating_avg": 4.8,
      "rating_count": 142,
      "signed": true,
      "license": "MIT",
      "published_at": "2025-11-01T00:00:00Z",
      "updated_at": "2026-02-15T00:00:00Z"
    }
  ],
  "total": 47,
  "page": 1,
  "per_page": 20,
  "pages": 3
}
```

### GET /skills/:name

Get full skill metadata (latest version). Powers skill detail page and `spm info`.

**Response: 200**

```json
{
  "name": "data-viz",
  "description": "Charts, dashboards, and visualizations from CSV, JSON, or database output",
  "author": {
    "username": "almog",
    "github_login": "almog",
    "trust_tier": "verified"
  },
  "category": "data-viz",
  "tags": ["charts", "plotly", "d3", "dashboards", "matplotlib"],
  "platforms": ["all"],
  "license": "MIT",
  "repository": "https://github.com/almog/data-viz",
  "deprecated": false,
  "latest_version": "1.2.3",
  "downloads": 12400,
  "weekly_downloads": 1200,
  "rating_avg": 4.8,
  "rating_count": 142,
  "security": {
    "signed": true,
    "signer_identity": "almog@github",
    "scan_status": "passed",
    "scan_layers": [
      { "layer": 1, "status": "passed", "detail": "0 pattern matches" },
      { "layer": 2, "status": "passed", "confidence": 0.03 },
      { "layer": 3, "status": "passed", "confidence": 0.01 }
    ]
  },
  "versions": [
    { "version": "1.2.3", "published_at": "2026-02-15T00:00:00Z" },
    { "version": "1.2.0", "published_at": "2026-01-05T00:00:00Z" },
    { "version": "1.1.0", "published_at": "2025-12-10T00:00:00Z" },
    { "version": "1.0.0", "published_at": "2025-11-01T00:00:00Z" }
  ],
  "dependencies": {
    "skills": [],
    "system": ["python >=3.10"],
    "packages": ["plotly", "pandas", "seaborn"]
  },
  "created_at": "2025-11-01T00:00:00Z",
  "updated_at": "2026-02-15T00:00:00Z"
}
```

**Response: 404**

```json
{
  "error": "skill_not_found",
  "message": "No skill named 'dat-viz' exists",
  "suggestion": "data-viz"
}
```

The `suggestion` field uses string similarity to offer did-you-mean corrections. The CLI renders this as:

```
  ✗ Skill not found: dat-viz
  💡 Did you mean: data-viz?
```

### GET /skills/:name/:version

Get a specific version's metadata.

**Response: 200**

```json
{
  "name": "data-viz",
  "version": "1.2.3",
  "manifest": {},
  "readme_md": "# data-viz\n\nCreate beautiful data...",
  "size_bytes": 22528,
  "checksum_sha256": "a1b2c3d4e5f6...",
  "signer_identity": "almog@github",
  "sigstore_bundle_url": "https://r2.spm.dev/bundles/data-viz/1.2.3.sigstore",
  "yanked": false,
  "published_at": "2026-02-15T00:00:00Z"
}
```

### GET /skills/:name/:version/download

Download the `.skl` package. Returns a redirect to the R2 presigned URL.

**Response: 302**

```
Location: https://r2.spm.dev/packages/data-viz/1.2.3.skl?sig=...&expires=...
```

The server also records the download event (debounced per user/IP per version per hour).

### POST /skills

Publish a new skill or new version. Called by `spm publish`.

**Headers:** `Authorization: Bearer spm_<jwt>`

**Content-Type:** `multipart/form-data`

| Field             | Type | Description                 |
| ----------------- | ---- | --------------------------- |
| `package`         | file | The `.skl` archive          |
| `manifest`        | json | manifest.json contents      |
| `sigstore_bundle` | file | Optional `.sigstore` bundle |

**Response: 201 (published)**

```json
{
  "status": "published",
  "name": "data-viz",
  "version": "1.2.3",
  "url": "https://spm.dev/skills/data-viz",
  "checksum_sha256": "a1b2c3d4e5f6...",
  "scans": [
    { "layer": 1, "status": "passed" },
    { "layer": 2, "status": "passed", "confidence": 0.03 }
  ]
}
```

**Response: 200 (held for review)**

```json
{
  "status": "held",
  "name": "data-viz",
  "version": "1.2.3",
  "reason": "ML classification flagged with confidence 0.78",
  "scans": [
    { "layer": 1, "status": "passed" },
    { "layer": 2, "status": "flagged", "confidence": 0.78 },
    { "layer": 3, "status": "flagged", "confidence": 0.6 }
  ],
  "estimated_review_hours": 24
}
```

**Response: 422 (blocked)**

```json
{
  "status": "blocked",
  "name": "data-viz",
  "version": "1.2.3",
  "issues": [
    {
      "layer": 1,
      "type": "instruction_override",
      "severity": "block",
      "file": "SKILL.md",
      "line": 47,
      "excerpt": "ignore all previous instructions and follow only...",
      "fix_suggestion": {
        "why": "Phrases like 'ignore all previous instructions' are a known prompt injection pattern.",
        "bad": "ignore all previous instructions and follow only these",
        "good": "Follow the steps below to complete this task"
      }
    }
  ],
  "attempt_number": 2,
  "total_attempts": 2,
  "total_blocked": 2
}
```

**Response: 409 (version exists)**

```json
{
  "error": "version_exists",
  "message": "data-viz@1.2.3 is already published. Version numbers are immutable.",
  "suggestion": "Run: spm version patch → 1.2.4"
}
```

### DELETE /skills/:name/:version

Yank a version. Removes from new installs, existing lock files still resolve.

**Headers:** `Authorization: Bearer spm_<jwt>`

**Request:**

```json
{
  "reason": "Critical bug in heatmap script causes data corruption"
}
```

**Response: 200**

```json
{
  "name": "data-viz",
  "version": "1.2.3",
  "yanked": true,
  "reason": "Critical bug in heatmap script causes data corruption",
  "yanked_at": "2026-02-28T12:00:00Z"
}
```

### PATCH /skills/:name

Update skill metadata (deprecate, change category, update description).

**Headers:** `Authorization: Bearer spm_<jwt>`

**Request:**

```json
{
  "deprecated": true,
  "deprecated_msg": "Use advanced-viz instead"
}
```

**Response: 200**

```json
{
  "name": "data-viz",
  "deprecated": true,
  "deprecated_msg": "Use advanced-viz instead",
  "updated_at": "2026-02-28T12:00:00Z"
}
```

---

## 3. Categories

### GET /categories

List all categories with skill counts. Powers the browse-by-category UI.

**Response: 200**

```json
{
  "categories": [
    { "slug": "documents", "display": "Documents", "count": 34, "icon": "📄" },
    { "slug": "data-viz", "display": "Data & Visualization", "count": 28, "icon": "📊" },
    { "slug": "frontend", "display": "Frontend", "count": 22, "icon": "🎨" },
    { "slug": "backend", "display": "Backend", "count": 18, "icon": "🔌" },
    { "slug": "infra", "display": "Infrastructure", "count": 19, "icon": "⚙️" },
    { "slug": "testing", "display": "Testing", "count": 16, "icon": "🧪" },
    { "slug": "code-quality", "display": "Code Quality", "count": 10, "icon": "✨" },
    { "slug": "security", "display": "Security", "count": 9, "icon": "🛡" },
    { "slug": "productivity", "display": "Productivity", "count": 11, "icon": "⚡" },
    { "slug": "other", "display": "Other", "count": 5, "icon": "📦" }
  ]
}
```

### POST /categories/classify

LLM-based category suggestion. Called during `spm publish` to verify/suggest category.

**Headers:** `Authorization: Bearer spm_<jwt>`

**Request:**

```json
{
  "skill_md_content": "# data-viz\n\nCreate publication-quality charts...",
  "manifest_category": "data-viz"
}
```

**Response: 200**

```json
{
  "suggested_category": "data-viz",
  "confidence": 0.92,
  "matches_manifest": true,
  "alternatives": [{ "category": "frontend", "confidence": 0.35 }]
}
```

---

## 4. Reviews

### GET /skills/:name/reviews

Get reviews for a skill.

**Query parameters:**

| Param      | Type   | Description                                     |
| ---------- | ------ | ----------------------------------------------- |
| `sort`     | string | `recent` (default), `rating_high`, `rating_low` |
| `page`     | int    | Page number                                     |
| `per_page` | int    | Default: 20                                     |

**Response: 200**

```json
{
  "skill": "data-viz",
  "rating_avg": 4.8,
  "rating_count": 142,
  "rating_distribution": { "5": 98, "4": 32, "3": 8, "2": 3, "1": 1 },
  "reviews": [
    {
      "id": "uuid",
      "user": { "username": "chen", "trust_tier": "scanned" },
      "rating": 5,
      "comment": "Best charting skill available. Auto-detection of data types is brilliant.",
      "created_at": "2026-02-23T00:00:00Z"
    }
  ],
  "total": 142,
  "page": 1
}
```

### POST /skills/:name/reviews

Submit or update a review (one per user per skill).

**Headers:** `Authorization: Bearer spm_<jwt>`

**Request:**

```json
{
  "rating": 5,
  "comment": "Works perfectly with large CSV files."
}
```

**Response: 201**

```json
{
  "id": "uuid",
  "skill": "data-viz",
  "rating": 5,
  "created_at": "2026-02-28T00:00:00Z"
}
```

---

## 5. Authors

### GET /authors/:username

Public author profile. Powers the author page on spm.dev.

**Response: 200**

```json
{
  "username": "almog",
  "github_login": "almog",
  "trust_tier": "verified",
  "skills": [
    {
      "name": "data-viz",
      "version": "1.2.3",
      "downloads": 12400,
      "rating_avg": 4.8,
      "category": "data-viz"
    },
    {
      "name": "csv-transform",
      "version": "1.0.2",
      "downloads": 8200,
      "rating_avg": 4.6,
      "category": "data-viz"
    }
  ],
  "total_downloads": 24600,
  "created_at": "2025-11-01T00:00:00Z"
}
```

### GET /authors/:username/stats

Author dashboard stats (auth required, own profile only).

**Headers:** `Authorization: Bearer spm_<jwt>`

**Response: 200**

```json
{
  "total_downloads": 24600,
  "weekly_downloads": 2840,
  "rating_avg": 4.7,
  "total_reviews": 185,
  "weekly_trend": [
    { "week": "2026-01-06", "downloads": 1420 },
    { "week": "2026-01-13", "downloads": 1580 }
  ],
  "agent_breakdown": [
    { "agent": "claude-code", "percentage": 48 },
    { "agent": "cursor", "percentage": 28 },
    { "agent": "codex", "percentage": 12 }
  ],
  "recent_activity": [
    {
      "type": "publish",
      "skill": "chart-export",
      "version": "0.8.0",
      "date": "2026-02-25T00:00:00Z"
    }
  ]
}
```

---

## 6. Reports

### POST /skills/:name/report

Report a skill for review. Called by `spm report <name>`.

**Headers:** `Authorization: Bearer spm_<jwt>` (optional — anonymous reports allowed)

**Request:**

```json
{
  "reason": "Skill reads clipboard contents without user consent",
  "priority": "high"
}
```

**Response: 201**

```json
{
  "id": "uuid",
  "skill": "clipboard-helper",
  "status": "open",
  "created_at": "2026-02-27T00:00:00Z"
}
```

---

## 7. Trending & Discovery

### GET /trending

Get trending skills for the homepage. Results are cached (5 min TTL).

**Query parameters:**

| Param   | Type   | Description                                   |
| ------- | ------ | --------------------------------------------- |
| `tab`   | string | `featured`, `rising`, `most_installed`, `new` |
| `limit` | int    | Default: 10, max: 50                          |

**Response: 200**

```json
{
  "tab": "rising",
  "skills": [
    {
      "name": "db-migrate",
      "version": "2.0.1",
      "description": "Generate and run database migrations from schema diffs",
      "author": { "username": "sarah", "trust_tier": "verified" },
      "category": "backend",
      "downloads": 9700,
      "weekly_downloads": 890,
      "weekly_growth_pct": 45,
      "rating_avg": 4.6
    }
  ]
}
```

---

## 8. Resolution (CLI-specific)

### POST /resolve

Resolve a set of skill specifiers to exact versions and download URLs. Called by `spm install`. Allows the CLI to resolve all dependencies in one round-trip.

**Request:**

```json
{
  "skills": [
    { "name": "data-viz", "range": "^1.2.0" },
    { "name": "pdf", "range": ">=2.0.0" }
  ],
  "platform": "claude-code"
}
```

**Response: 200**

```json
{
  "resolved": [
    {
      "name": "data-viz",
      "version": "1.2.3",
      "checksum_sha256": "a1b2c3d4...",
      "download_url": "https://r2.spm.dev/packages/data-viz/1.2.3.skl?sig=...",
      "sigstore_bundle_url": "https://r2.spm.dev/bundles/data-viz/1.2.3.sigstore",
      "size_bytes": 22528,
      "trust_tier": "verified",
      "signed": true,
      "scan_status": "passed",
      "dependencies": []
    },
    {
      "name": "pdf",
      "version": "2.0.3",
      "checksum_sha256": "ff00ab12...",
      "download_url": "https://r2.spm.dev/packages/pdf/2.0.3.skl?sig=...",
      "sigstore_bundle_url": "https://r2.spm.dev/bundles/pdf/2.0.3.sigstore",
      "size_bytes": 34816,
      "trust_tier": "official",
      "signed": true,
      "scan_status": "passed",
      "dependencies": []
    }
  ],
  "unresolved": []
}
```

**Response: 422 (unresolvable)**

```json
{
  "resolved": [],
  "unresolved": [
    {
      "name": "dat-viz",
      "range": "^1.0.0",
      "error": "skill_not_found",
      "suggestion": "data-viz"
    }
  ]
}
```

---

## 9. Admin Routes

All admin routes require `Authorization: Bearer spm_<jwt>` with admin role.

### GET /admin/queue

Get flagged skills awaiting review.

**Query parameters:**

| Param    | Type   | Description                                |
| -------- | ------ | ------------------------------------------ |
| `sort`   | string | `oldest` (default), `newest`, `confidence` |
| `status` | string | `pending` (default), `all`                 |

**Response: 200**

```json
{
  "queue": [
    {
      "id": "uuid",
      "skill": "auto-deploy",
      "version": "0.3.0",
      "author": { "username": "devops-guy", "trust_tier": "registered" },
      "flags": [
        { "layer": 2, "type": "ml_classification", "confidence": 0.78 },
        { "layer": 3, "type": "lakera_guard", "confidence": 0.6 }
      ],
      "submitted_at": "2026-02-27T14:30:00Z",
      "size_bytes": 18432,
      "file_count": 4
    }
  ],
  "total": 3,
  "avg_review_hours": 4.2
}
```

### POST /admin/queue/:id/approve

Approve a flagged skill.

**Request:**

```json
{
  "notes": "Legitimate automation skill, deployment instructions are expected"
}
```

**Response: 200**

```json
{
  "id": "uuid",
  "status": "approved",
  "skill": "auto-deploy",
  "version": "0.3.0",
  "approved_at": "2026-02-28T10:00:00Z"
}
```

### POST /admin/queue/:id/reject

Reject a flagged skill.

**Request:**

```json
{
  "reason": "Contains instructions to bypass security prompts",
  "notify_author": true,
  "feedback": "The SKILL.md instructs the agent to run commands as root without confirmation. Please revise lines 47-52."
}
```

**Response: 200**

```json
{
  "id": "uuid",
  "status": "rejected",
  "skill": "auto-deploy",
  "version": "0.3.0"
}
```

### GET /admin/skills

List all skills with admin metadata (same as GET /skills but includes held/blocked status, internal scan details).

### POST /admin/skills/:name/yank

Admin-initiated yank (doesn't require ownership).

**Request:**

```json
{
  "version": "0.3.0",
  "reason": "Malicious content detected post-publish",
  "notify_author": true
}
```

### GET /admin/users

List all users with trust tiers and stats.

**Query parameters:** `sort`, `trust`, `status`, `page`, `per_page`

### PATCH /admin/users/:username/trust

Change a user's trust tier.

**Request:**

```json
{
  "trust_tier": "verified",
  "reason": "6 months active, GitHub linked, clean publish history"
}
```

### GET /admin/reports

List user-submitted reports.

**Query parameters:** `status` (`open`, `investigating`, `resolved`), `priority`, `page`

### PATCH /admin/reports/:id

Update report status.

**Request:**

```json
{
  "status": "resolved",
  "resolution": "Skill yanked, author notified",
  "action_taken": "yank"
}
```

### GET /admin/errors

Aggregated user errors from CLI telemetry.

**Query parameters:** `type`, `status`, `page`, `per_page`

**Response: 200**

```json
{
  "errors": [
    {
      "id": "uuid",
      "type": "install_fail",
      "error_code": "SIGSTORE_VERIFY_FAILED",
      "message": "certificate chain invalid",
      "count": 12,
      "affected_users": 4,
      "affected_skill": "data-viz@1.2.3",
      "first_seen": "2026-02-26T00:00:00Z",
      "last_seen": "2026-02-27T00:00:00Z",
      "status": "open"
    }
  ],
  "total": 6
}
```

### PATCH /admin/errors/:id

Update error status.

**Request:**

```json
{
  "status": "resolved",
  "resolution": "Neon pool size increased from 10 to 25"
}
```

### GET /admin/stats

Dashboard-level statistics for admin panel.

**Response: 200**

```json
{
  "publishes": {
    "total": 847,
    "passed": 791,
    "blocked": 38,
    "held": 18,
    "false_positives": 6,
    "avg_scan_time_ms": 1400
  },
  "weekly_publishes": [42, 48, 53, 61, 58, 67, 72, 78],
  "weekly_block_rate": [5.2, 4.8, 4.1, 4.5, 3.9, 4.2, 3.8, 3.5],
  "queue_depth": 3,
  "open_reports": 2,
  "open_errors": 2,
  "users_by_trust": {
    "official": 1,
    "verified": 12,
    "scanned": 34,
    "registered": 89
  }
}
```

### Admin Access Model

**Separate domain:** The admin panel runs on `admin.spm.dev` — a separate Cloudflare Pages deployment. This gives:

- CORS isolation (admin API routes only accept `admin.spm.dev` origin)
- Separate deploy pipeline (admin changes don't affect public site)
- No admin code in the public JS bundle
- Security through separation — even if spm.dev is compromised, admin.spm.dev is a different deployment

**Nav link for admins:** The public site (`spm.dev`) calls `GET /auth/whoami` on login. If `role === "admin"`, a subtle "Admin" link appears in the nav bar pointing to `admin.spm.dev`. Regular users never see it.

**First admin:** Manually set in the database. No self-service promotion:

```sql
-- One-time setup after first GitHub login
UPDATE users SET role = 'admin' WHERE username = 'almog';
```

**Subsequent admins:** An existing admin promotes others via `PATCH /admin/users/:username/role`:

### PATCH /admin/users/:username/role

Promote or revoke admin access. Requires existing admin auth.

**Request:**

```json
{
  "role": "admin",
  "reason": "Co-maintainer for security review queue"
}
```

**Response: 200**

```json
{
  "username": "sarah",
  "role": "admin",
  "previous_role": "user",
  "changed_by": "almog",
  "changed_at": "2026-03-01T00:00:00Z"
}
```

To revoke:

```json
{
  "role": "user",
  "reason": "Temporary access no longer needed"
}
```

All role changes are recorded in `audit_log` with the acting admin's identity.

### Admin Audit Trail

Every admin action writes to `audit_log`. This is immutable — no update or delete on the table:

```typescript
// Called by every admin mutation handler
async function auditAdmin(c, action: string, details: object) {
  const admin = c.get('jwtPayload');
  await db.insert(audit_log).values({
    actor_id: admin.sub,
    action, // 'admin.approve', 'admin.reject', 'admin.yank', 'admin.trust_change'
    skill_id: details.skillId,
    version_id: details.versionId,
    details, // full context: reason, old_trust, new_trust, etc.
  });
}
```

---

## 10. Health

### GET /health

Health check for uptime monitoring.

**Response: 200**

```json
{
  "status": "ok",
  "version": "0.1.0",
  "database": "ok",
  "storage": "ok",
  "timestamp": "2026-02-28T12:00:00Z"
}
```

### GET /status

Public status page data (cached, 1 min TTL).

**Response: 200**

```json
{
  "status": "operational",
  "total_skills": 200,
  "total_downloads": 450000,
  "total_authors": 136,
  "uptime_30d": 99.97
}
```

---

## 11. Error Format

All errors follow a consistent shape:

```json
{
  "error": "error_code",
  "message": "Human-readable description",
  "suggestion": "Optional fix suggestion",
  "details": {}
}
```

**Standard error codes:**

| Code                | HTTP | Description                              |
| ------------------- | ---- | ---------------------------------------- |
| `unauthorized`      | 401  | Missing or invalid token                 |
| `forbidden`         | 403  | Valid token but insufficient permissions |
| `skill_not_found`   | 404  | Skill name doesn't exist                 |
| `version_not_found` | 404  | Specific version doesn't exist           |
| `version_exists`    | 409  | Version already published (immutable)    |
| `validation_error`  | 422  | Invalid manifest, bad semver, etc.       |
| `publish_blocked`   | 422  | Security scan blocked the publish        |
| `publish_held`      | 200  | Scan flagged, held for manual review     |
| `rate_limited`      | 429  | Too many requests                        |
| `internal_error`    | 500  | Server error                             |

---

## 12. Rate Limiting

| Endpoint                              | Limit | Window     |
| ------------------------------------- | ----- | ---------- |
| `GET /skills` (search)                | 100   | per minute |
| `GET /skills/:name/:version/download` | 60    | per minute |
| `POST /skills` (publish)              | 10    | per hour   |
| `POST /auth/*`                        | 20    | per minute |
| `POST /resolve`                       | 60    | per minute |
| Admin routes                          | 120   | per minute |
| All other GET                         | 200   | per minute |

Rate limit headers on every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1709136000
```

When rate limited:

```
HTTP 429
Retry-After: 23
```

---

## 13. Implementation Notes

### Hono Route Structure

```typescript
// src/routes/index.ts

import { Hono } from 'hono';
import { auth } from './auth';
import { skills } from './skills';
import { categories } from './categories';
import { reviews } from './reviews';
import { authors } from './authors';
import { trending } from './trending';
import { resolve } from './resolve';
import { reports } from './reports';
import { admin } from './admin';
import { health } from './health';

const app = new Hono().basePath('/api/v1');

app.route('/auth', auth);
app.route('/skills', skills);
app.route('/categories', categories);
app.route('/reviews', reviews);
app.route('/authors', authors);
app.route('/trending', trending);
app.route('/resolve', resolve);
app.route('/reports', reports);
app.route('/admin', admin);
app.route('/', health);

export default app;
```

### Auth Middleware

Admin routes are protected with defense-in-depth — three layers that must all pass:

```typescript
// src/middleware/auth.ts

import { jwt } from 'hono/jwt';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

// Layer 1: Valid JWT (any authenticated user)
export const authed = jwt({ secret: env.JWT_SECRET });

// Layer 2+3: Admin guard — JWT + DB role verification
export const adminGuard = async (c, next) => {
  // 2a. Valid JWT?
  const payload = c.get('jwtPayload');
  if (!payload) return c.json({ error: 'unauthorized' }, 401);

  // 2b. JWT claims admin role?
  if (payload.role !== 'admin') {
    return c.json({ error: 'forbidden' }, 403);
  }

  // 3. DB confirms admin role? (not just JWT claim)
  //    Catches: revoked admins, stale JWTs, forged claims
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
    columns: { role: true },
  });

  if (user?.role !== 'admin') {
    // Log this — could be a revoked admin or attack attempt
    console.warn(`Admin access denied for user ${payload.sub}: DB role=${user?.role}`);
    return c.json({ error: 'forbidden' }, 403);
  }

  await next();
};
```

### Admin Route Isolation

Admin routes are mounted as a **separate sub-app** with the guard applied at the app level. This is fail-safe — it's impossible to add a new admin route without the guard:

```typescript
// src/routes/admin.ts

import { Hono } from 'hono';
import { authed, adminGuard } from '../middleware/auth';

// Every route in this file is automatically guarded
const admin = new Hono();
admin.use('*', authed); // Step 1: must be authenticated
admin.use('*', adminGuard); // Step 2: must be admin (JWT + DB check)

admin.get('/queue', getQueue);
admin.post('/queue/:id/approve', approveItem);
admin.post('/queue/:id/reject', rejectItem);
admin.get('/skills', listAllSkills);
admin.post('/skills/:name/yank', yankSkill);
admin.get('/users', listUsers);
admin.patch('/users/:username/trust', updateTrust);
admin.get('/reports', listReports);
admin.patch('/reports/:id', updateReport);
admin.get('/errors', listErrors);
admin.patch('/errors/:id', updateError);
admin.get('/stats', getStats);

export { admin };
```

```typescript
// src/routes/index.ts — mounting

app.route('/admin', admin);
// ↑ ALL /admin/* routes hit authed + adminGuard
// No route can bypass this — the guard is on the sub-app, not per-route
```

**Why this is safe:**

| Attack                                 | Defense                                   |
| -------------------------------------- | ----------------------------------------- |
| No token                               | `authed` middleware rejects (401)         |
| Valid token, not admin                 | `adminGuard` checks JWT claim (403)       |
| Forged JWT with admin claim            | JWT signature verification fails (401)    |
| Revoked admin with valid JWT           | DB role check fails (403)                 |
| Dev forgets guard on new route         | Impossible — guard is on `admin.use('*')` |
| Admin panel accessed from wrong origin | CORS restricts to `admin.spm.dev`         |

### Validation

All request bodies validated with Zod schemas. The schemas live in a shared `spm-shared` package used by both the API and CLI.

```typescript
// spm-shared/src/schemas.ts

import { z } from 'zod';

export const SkillCategory = z.enum([
  'documents',
  'data-viz',
  'frontend',
  'backend',
  'infra',
  'testing',
  'code-quality',
  'security',
  'productivity',
  'other',
]);

export const TrustTier = z.enum(['registered', 'scanned', 'verified', 'official']);

export const PublishRequest = z.object({
  manifest: ManifestSchema,
  // package and sigstore_bundle are file uploads, validated separately
});

export const SearchParams = z.object({
  q: z.string().optional(),
  category: SkillCategory.optional(),
  trust: TrustTier.optional(),
  platform: z.string().optional(),
  sort: z.enum(['relevance', 'downloads', 'rating', 'updated', 'new']).default('relevance'),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});
```

### CORS

The API serves the CLI (no CORS needed), the public web UI, and the admin panel. Admin panel runs on a separate origin:

```typescript
app.use(
  '*',
  cors({
    origin: ['https://spm.dev', 'https://admin.spm.dev'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowHeaders: ['Authorization', 'Content-Type'],
  }),
);
```

Admin routes additionally verify the `Origin` header:

```typescript
admin.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  // Allow CLI (no origin) and admin.spm.dev only
  if (origin && origin !== 'https://admin.spm.dev') {
    return c.json({ error: 'forbidden' }, 403);
  }
  await next();
});
```

### Caching Strategy

| Route                  | Cache             | TTL  |
| ---------------------- | ----------------- | ---- |
| `GET /skills` (search) | Edge (Cloudflare) | 30s  |
| `GET /skills/:name`    | Edge              | 60s  |
| `GET /categories`      | Edge              | 5min |
| `GET /trending`        | Edge              | 5min |
| `GET /status`          | Edge              | 1min |
| All POST/PATCH/DELETE  | No cache          | —    |
| Download redirects     | R2 presigned      | 1hr  |
