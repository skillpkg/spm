# SPM Registry — Infrastructure & Architecture

## Where Does the Registry Live?

---

## 1. High-Level Architecture

```
                        ┌─────────────────────┐
                        │    Cloudflare CDN    │
                        │   (edge caching +   │
                        │    DDoS protection)  │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   Load Balancer      │
                        │   (AWS ALB / GCP LB) │
                        └──────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
     ┌────────▼───────┐  ┌────────▼───────┐  ┌────────▼───────┐
     │  API Server 1  │  │  API Server 2  │  │  API Server N  │
     │  (Node/Rust)   │  │  (Node/Rust)   │  │  (Node/Rust)   │
     └────────┬───────┘  └────────┬───────┘  └────────┬───────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
         ┌─────────────┬───────────┼───────────┬─────────────┐
         │             │           │           │             │
   ┌─────▼─────┐ ┌─────▼─────┐ ┌──▼──┐ ┌──────▼──────┐ ┌───▼────┐
   │ PostgreSQL │ │    S3     │ │Redis│ │  Security   │ │  MCP   │
   │ (metadata) │ │ (packages)│ │(cache│ │  Scanner    │ │ Server │
   │            │ │           │ │+rate)│ │  (async)    │ │        │
   └───────────┘ └───────────┘ └─────┘ └─────────────┘ └────────┘
```

---

## 2. Deployment Options

### Option A: Cloud-Native on AWS (Recommended for Production)

```
┌──────────────────────────────────────────────────────────┐
│                        AWS                                │
│                                                          │
│  CloudFront (CDN)                                        │
│       │                                                  │
│  ALB (Load Balancer)                                     │
│       │                                                  │
│  ECS Fargate (API containers, auto-scaling)              │
│       │                                                  │
│  ├── RDS PostgreSQL (Multi-AZ, metadata)                 │
│  ├── S3 (.skl package storage + signatures)              │
│  ├── ElastiCache Redis (search cache + rate limiting)    │
│  ├── SQS (async security scan queue)                     │
│  ├── Lambda (security scanner workers)                   │
│  ├── ECR (container images)                              │
│  ├── Secrets Manager (API keys, signing keys)            │
│  ├── CloudWatch (monitoring + alerting)                  │
│  └── WAF (web application firewall)                      │
│                                                          │
│  Estimated cost: ~$500-2000/month at moderate scale      │
└──────────────────────────────────────────────────────────┘
```

### Option B: Minimal / Indie Launch (Start Here)

```
┌──────────────────────────────────────────────────────────┐
│              Fly.io + Managed Services                    │
│                                                          │
│  Fly.io (API + MCP server)                               │
│       │                                                  │
│  ├── Neon (serverless PostgreSQL)                        │
│  ├── Cloudflare R2 (S3-compatible, free egress)          │
│  ├── Upstash Redis (serverless, pay-per-request)         │
│  └── Cloudflare Workers (edge functions for downloads)   │
│                                                          │
│  Estimated cost: ~$50-200/month to start                 │
│  Scales to ~10k users before needing Option A            │
└──────────────────────────────────────────────────────────┘
```

### Option C: Fully Self-Hostable (For Enterprise/Private Registries)

```
┌──────────────────────────────────────────────────────────┐
│           Docker Compose (single machine)                 │
│                                                          │
│  docker-compose.yml:                                     │
│    api:        Node.js API server                        │
│    postgres:   PostgreSQL 16                             │
│    redis:      Redis 7                                   │
│    minio:      S3-compatible object storage              │
│    scanner:    Security scan worker                      │
│    nginx:      Reverse proxy + TLS                       │
│                                                          │
│  Runs on: any VPS, on-prem server, or k8s               │
│  For: companies running private skill registries         │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema (PostgreSQL)

```sql
-- =============================================
-- Core tables
-- =============================================

CREATE TABLE authors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(64) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    display_name    VARCHAR(128),
    avatar_url      TEXT,
    bio             TEXT,
    website         VARCHAR(512),
    github_id       VARCHAR(64),

    -- Trust & verification
    verified        BOOLEAN DEFAULT FALSE,
    verified_at     TIMESTAMPTZ,
    verified_method VARCHAR(32),  -- 'github', 'email', 'manual'
    trust_level     VARCHAR(16) DEFAULT 'unverified',
        -- 'official', 'verified', 'scanned', 'unverified'

    -- Signing
    public_key      TEXT,         -- Sigstore identity (OIDC subject)
    key_registered  TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE skills (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(64) UNIQUE NOT NULL,
    author_id       UUID NOT NULL REFERENCES authors(id),

    -- Latest version cache (denormalized for fast listing)
    latest_version  VARCHAR(32),

    -- Discovery
    description     TEXT NOT NULL,
    category        VARCHAR(32),
    keywords        TEXT[],
    repository_url  TEXT,
    homepage_url    TEXT,
    license         VARCHAR(32),

    -- Stats (denormalized, updated by background job)
    total_downloads BIGINT DEFAULT 0,
    weekly_downloads BIGINT DEFAULT 0,
    rating_avg      DECIMAL(3,2) DEFAULT 0,
    rating_count    INTEGER DEFAULT 0,

    -- Trust
    is_official     BOOLEAN DEFAULT FALSE,

    -- Status
    status          VARCHAR(16) DEFAULT 'active',
        -- 'active', 'deprecated', 'yanked', 'suspended'
    deprecated_by   VARCHAR(64),  -- replacement skill name

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE skill_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id        UUID NOT NULL REFERENCES skills(id),
    version         VARCHAR(32) NOT NULL,

    -- Package
    package_url     TEXT NOT NULL,      -- S3 URL to .skl file
    package_size    INTEGER NOT NULL,   -- bytes
    checksum        VARCHAR(128) NOT NULL,

    -- Signature
    signature_url   TEXT,               -- S3 URL to .sig file
    signed          BOOLEAN DEFAULT FALSE,
    signer_identity VARCHAR(255),
    signed_at       TIMESTAMPTZ,
    rekor_log_id    VARCHAR(128),       -- Sigstore transparency log

    -- Metadata (from manifest.json)
    manifest        JSONB NOT NULL,     -- full manifest.json

    -- Compatibility
    min_context     VARCHAR(16),
    requires_tools  TEXT[],
    requires_network BOOLEAN DEFAULT FALSE,
    platforms       TEXT[],

    -- Dependencies
    skill_deps      JSONB DEFAULT '{}',  -- { "skill-name": "version-range" }
    system_deps     JSONB DEFAULT '{}',  -- { "python": ">=3.10", ... }

    -- Security
    scan_status     VARCHAR(16) DEFAULT 'pending',
        -- 'pending', 'passed', 'failed', 'warning'
    scan_report     JSONB,
    scanned_at      TIMESTAMPTZ,

    -- Status
    status          VARCHAR(16) DEFAULT 'active',
        -- 'active', 'yanked', 'deprecated'
    yanked_reason   TEXT,

    -- Files listing (for browsing without download)
    file_list       JSONB,  -- [{ "path": "...", "size": 123 }]
    readme_html     TEXT,   -- Pre-rendered SKILL.md for web UI

    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (skill_id, version)
);

CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id        UUID NOT NULL REFERENCES skills(id),
    author_id       UUID NOT NULL REFERENCES authors(id),

    rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title           VARCHAR(128),
    body            TEXT,

    -- Moderation
    flagged         BOOLEAN DEFAULT FALSE,
    hidden          BOOLEAN DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (skill_id, author_id)  -- One review per user per skill
);

CREATE TABLE downloads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id        UUID NOT NULL REFERENCES skills(id),
    version_id      UUID NOT NULL REFERENCES skill_versions(id),

    -- Anonymous download tracking
    source          VARCHAR(16),  -- 'cli', 'mcp', 'web', 'ci'
    platform        VARCHAR(16),  -- 'claude-code', 'cursor', 'copilot', etc.
    region          VARCHAR(8),   -- rough geo for CDN optimization

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Security & audit
-- =============================================

CREATE TABLE security_scans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id      UUID NOT NULL REFERENCES skill_versions(id),

    -- Overall result
    status          VARCHAR(16) NOT NULL, -- 'passed', 'failed', 'warning'
    scanner_version VARCHAR(16),          -- SPM scanner pipeline version

    -- Per-layer results (vendor-agnostic — each layer is a pluggable provider)
    -- Stored as JSONB so we can add/swap layers without schema migrations.
    --
    -- Format per layer:
    --   {
    --     "provider": "regex-v1" | "protectai-deberta-v3" | "lakera-guard",
    --     "provider_version": "1.0.0",
    --     "status": "passed" | "failed" | "warning" | "skipped",
    --     "score": 0.0-1.0,          (ML layers only)
    --     "threshold": 0.95,          (ML layers only)
    --     "issues": [...],
    --     "latency_ms": 42,
    --     "timestamp": "2026-02-28T..."
    --   }
    layer_1_result  JSONB,    -- Regex pattern matching (built-in, fast)
    layer_2_result  JSONB,    -- ML classification (ProtectAI DeBERTa or successor)
    layer_3_result  JSONB,    -- Commercial API (Lakera Guard or successor)

    -- Legacy flat fields (kept for backward compat, derived from layers)
    static_analysis JSONB,    -- { issues: [...] }
    injection_scan  JSONB,    -- { issues: [...] }
    permission_audit JSONB,   -- { declared: {...}, detected: {...} }
    sandbox_result  JSONB,    -- { network_calls: [], file_access: [] }

    -- For updates: diff against previous version
    diff_review     JSONB,    -- { new_permissions: [], changes: [] }
    previous_version_id UUID REFERENCES skill_versions(id),

    -- Human review
    human_reviewed  BOOLEAN DEFAULT FALSE,
    reviewer_id     UUID REFERENCES authors(id),
    reviewer_notes  TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID REFERENCES authors(id),
    action          VARCHAR(32) NOT NULL,
        -- 'publish', 'yank', 'deprecate', 'verify_author',
        -- 'suspend_skill', 'flag_review', 'security_override'
    target_type     VARCHAR(16),  -- 'skill', 'version', 'author', 'review'
    target_id       UUID,
    details         JSONB,
    ip_address      INET,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Publish attempts (every publish, success or failure)
-- =============================================
--
-- Records EVERY publish attempt, not just successes.
-- Used for:
--   1. Publisher feedback: "You had 3 blocked attempts before this succeeded"
--   2. Trust scoring: High block-then-pass rate may indicate adversarial probing
--   3. Internal analytics: Which security patterns are most triggered?
--   4. Abuse detection: Many rapid blocked attempts = potential attacker
--
-- This is separate from audit_log (which only records successful state changes)
-- and security_scans (which stores per-version scan details).

CREATE TABLE publish_attempts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID NOT NULL REFERENCES authors(id),
    skill_name      VARCHAR(64) NOT NULL,  -- may not exist in skills table yet
    version         VARCHAR(32) NOT NULL,

    -- Outcome
    status          VARCHAR(16) NOT NULL,
        -- 'passed'           — all layers passed, skill published
        -- 'blocked'          — rejected by a security layer
        -- 'held_for_review'  — borderline, queued for human review
        -- 'validation_error' — manifest/structure issues (pre-scan)

    blocked_by_layer INTEGER,              -- 1, 2, or 3 (NULL if passed)
    issues          JSONB,                 -- full issue details + fix suggestions

    -- Context
    cli_version     VARCHAR(16),           -- which CLI version submitted this
    ip_address      INET,

    -- Timing
    scan_duration_ms INTEGER,              -- how long all layers took

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_publish_attempts_author ON publish_attempts (author_id, created_at DESC);
CREATE INDEX idx_publish_attempts_skill ON publish_attempts (skill_name, created_at DESC);

-- =============================================
-- API tokens
-- =============================================

CREATE TABLE api_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID NOT NULL REFERENCES authors(id),
    token_hash      VARCHAR(128) NOT NULL,  -- bcrypt hash of token
    name            VARCHAR(64),

    scopes          TEXT[] DEFAULT ARRAY['publish'],

    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    revoked         BOOLEAN DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================

-- Search
CREATE INDEX idx_skills_name_trgm ON skills USING gin (name gin_trgm_ops);
CREATE INDEX idx_skills_description_fts ON skills USING gin (
    to_tsvector('english', description)
);
CREATE INDEX idx_skills_keywords ON skills USING gin (keywords);
CREATE INDEX idx_skills_category ON skills (category);

-- Lookups
CREATE INDEX idx_skill_versions_skill ON skill_versions (skill_id);
CREATE INDEX idx_skill_versions_lookup ON skill_versions (skill_id, version);
CREATE INDEX idx_reviews_skill ON reviews (skill_id);
CREATE INDEX idx_downloads_skill ON downloads (skill_id);
CREATE INDEX idx_downloads_time ON downloads (created_at);
CREATE INDEX idx_audit_log_actor ON audit_log (actor_id);
CREATE INDEX idx_audit_log_target ON audit_log (target_type, target_id);

-- Stats
CREATE INDEX idx_skills_downloads ON skills (total_downloads DESC);
CREATE INDEX idx_skills_rating ON skills (rating_avg DESC);
```

---

## 4. Object Storage (S3 / R2)

```
s3://spm-registry/
│
├── packages/
│   ├── data-viz/
│   │   ├── data-viz-1.0.0.skl
│   │   ├── data-viz-1.0.0.skl.sig        # Detached signature
│   │   ├── data-viz-1.0.0.skl.sha256     # Checksum file
│   │   ├── data-viz-1.2.0.skl
│   │   ├── data-viz-1.2.0.skl.sig
│   │   └── data-viz-1.2.0.skl.sha256
│   └── frontend-design/
│       └── ...
│
├── readmes/
│   ├── data-viz/
│   │   ├── 1.0.0.html                    # Pre-rendered for web UI
│   │   └── 1.2.0.html
│   └── ...
│
└── avatars/
    ├── author-uuid-1.jpg
    └── ...
```

### Download Flow

```
Client: GET /api/v1/skills/data-viz/1.2.0/download
                    │
                    ▼
          ┌──────────────────┐
          │  API Server       │
          │  1. Auth check    │
          │  2. Log download  │
          │  3. Generate      │
          │     signed URL    │
          └────────┬─────────┘
                   │
                   │  302 Redirect to signed S3/R2 URL
                   ▼
          ┌──────────────────┐
          │  Cloudflare CDN   │  ← Cached at edge
          │  / CloudFront     │
          └────────┬─────────┘
                   │
                   │  Cache miss → fetch from origin
                   ▼
          ┌──────────────────┐
          │  S3 / R2          │
          │  (origin)         │
          └──────────────────┘
```

The API never serves the file directly — it generates a **pre-signed URL** with expiry, then redirects. This keeps API servers thin and lets the CDN handle bandwidth.

```javascript
// API: generate download URL
async function handleDownload(req, res) {
  const { name, version } = req.params;

  // 1. Verify skill+version exists
  const skill = await db.query(
    'SELECT sv.package_url, sv.checksum FROM skill_versions sv ' +
      'JOIN skills s ON sv.skill_id = s.id ' +
      'WHERE s.name = $1 AND sv.version = $2 AND sv.status = $3',
    [name, version, 'active'],
  );

  if (!skill.rows.length) return res.status(404).json({ error: 'Not found' });

  // 2. Log download (async, don't block response)
  downloadQueue.add({
    skill_name: name,
    version,
    source: req.headers['x-spm-source'] || 'unknown',
    platform: req.headers['x-spm-platform'] || 'unknown',
  });

  // 3. Generate pre-signed URL (expires in 5 minutes)
  const url = await s3.getSignedUrl('getObject', {
    Bucket: 'spm-registry',
    Key: `packages/${name}/${name}-${version}.skl`,
    Expires: 300,
  });

  // 4. Redirect (CDN will cache this)
  res.setHeader('X-Checksum', skill.rows[0].checksum);
  res.redirect(302, url);
}
```

---

## 5. API Server Implementation

```javascript
// server.js — Express/Fastify API

const fastify = require('fastify')({ logger: true });
const { Pool } = require('pg');
const Redis = require('ioredis');
const { S3Client } = require('@aws-sdk/client-s3');

// Connections
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);
const s3 = new S3Client({ region: process.env.AWS_REGION });

// ── Search ──────────────────────────────────────────────

fastify.get('/api/v1/skills', async (req, res) => {
  const {
    q,
    category,
    verified,
    signed,
    sort = 'downloads',
    order = 'desc',
    page = 1,
    limit = 20,
  } = req.query;

  // Check cache first
  const cacheKey = `search:${JSON.stringify(req.query)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Build query
  let where = ['s.status = $1'];
  let params = ['active'];
  let paramIdx = 2;

  if (q) {
    where.push(`(
      s.name ILIKE $${paramIdx} OR
      to_tsvector('english', s.description) @@ plainto_tsquery($${paramIdx + 1}) OR
      $${paramIdx + 2} = ANY(s.keywords)
    )`);
    params.push(`%${q}%`, q, q.toLowerCase());
    paramIdx += 3;
  }

  if (category) {
    where.push(`s.category = $${paramIdx}`);
    params.push(category);
    paramIdx++;
  }

  if (verified === 'true') {
    where.push(`a.verified = true`);
  }

  const sortColumn =
    {
      downloads: 's.total_downloads',
      rating: 's.rating_avg',
      recent: 's.updated_at',
      name: 's.name',
    }[sort] || 's.total_downloads';

  const offset = (page - 1) * limit;

  const result = await db.query(
    `
    SELECT 
      s.name, s.latest_version as version, s.description,
      s.category, s.keywords, s.total_downloads as downloads,
      s.weekly_downloads, s.rating_avg as rating, s.rating_count,
      s.repository_url, s.license, s.is_official,
      a.username as author, a.verified as author_verified,
      sv.signed, sv.platforms, sv.requires_tools,
      s.created_at, s.updated_at
    FROM skills s
    JOIN authors a ON s.author_id = a.id
    LEFT JOIN skill_versions sv ON s.id = sv.skill_id 
      AND sv.version = s.latest_version
    WHERE ${where.join(' AND ')}
    ORDER BY ${sortColumn} ${order === 'asc' ? 'ASC' : 'DESC'}
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `,
    [...params, limit, offset],
  );

  const countResult = await db.query(
    `
    SELECT COUNT(*) FROM skills s 
    JOIN authors a ON s.author_id = a.id
    WHERE ${where.join(' AND ')}
  `,
    params,
  );

  const response = {
    results: result.rows.map(formatSkillResult),
    total: parseInt(countResult.rows[0].count),
    page,
    pages: Math.ceil(countResult.rows[0].count / limit),
  };

  // Cache for 60 seconds
  await redis.setex(cacheKey, 60, JSON.stringify(response));

  return response;
});

// ── Publish ─────────────────────────────────────────────

fastify.post(
  '/api/v1/skills',
  {
    preHandler: [authenticate, rateLimit('publish', 10, '1h')],
  },
  async (req, res) => {
    const author = req.user;
    const file = req.body.package; // multipart .skl upload

    // 1. Extract and validate manifest
    const tempDir = await extractSkl(file);
    const manifest = await readManifest(tempDir);
    validateManifest(manifest);

    // 2. Check ownership (only original author or collaborators)
    const existing = await db.query('SELECT id, author_id FROM skills WHERE name = $1', [
      manifest.name,
    ]);
    if (existing.rows.length && existing.rows[0].author_id !== author.id) {
      return res.status(403).json({ error: 'Skill name is owned by another author' });
    }

    // 3. Check version doesn't already exist
    if (existing.rows.length) {
      const versionExists = await db.query(
        'SELECT id FROM skill_versions WHERE skill_id = $1 AND version = $2',
        [existing.rows[0].id, manifest.version],
      );
      if (versionExists.rows.length) {
        return res.status(409).json({ error: `Version ${manifest.version} already exists` });
      }
    }

    // 4. Upload .skl to S3
    const packageKey = `packages/${manifest.name}/${manifest.name}-${manifest.version}.skl`;
    const checksum = computeChecksum(file);
    await uploadToS3(packageKey, file);

    // 5. Upload signature if present
    let signatureInfo = {};
    if (req.body.signature) {
      const sigKey = `${packageKey}.sig`;
      await uploadToS3(sigKey, req.body.signature);
      signatureInfo = await verifySignature(file, req.body.signature, author);
    }

    // 6. Insert into database (transaction)
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      let skillId;
      if (!existing.rows.length) {
        // New skill
        const result = await client.query(
          `
        INSERT INTO skills (name, author_id, latest_version, description, 
          category, keywords, repository_url, license)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
          [
            manifest.name,
            author.id,
            manifest.version,
            manifest.description,
            manifest.category,
            manifest.keywords,
            manifest.repository,
            manifest.license,
          ],
        );
        skillId = result.rows[0].id;
      } else {
        skillId = existing.rows[0].id;
        await client.query(
          'UPDATE skills SET latest_version = $1, updated_at = NOW() WHERE id = $2',
          [manifest.version, skillId],
        );
      }

      await client.query(
        `
      INSERT INTO skill_versions (skill_id, version, package_url, package_size,
        checksum, signed, signer_identity, signed_at, manifest,
        requires_tools, requires_network, platforms, skill_deps, system_deps)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `,
        [
          skillId,
          manifest.version,
          packageKey,
          file.length,
          checksum,
          !!signatureInfo.verified,
          signatureInfo.signer,
          signatureInfo.timestamp,
          JSON.stringify(manifest),
          manifest.agents?.requires_tools,
          manifest.agents?.requires_network,
          manifest.agents?.platforms,
          JSON.stringify(manifest.dependencies?.skills || {}),
          JSON.stringify(manifest.dependencies?.system || {}),
        ],
      );

      // Audit log
      await client.query(
        `
      INSERT INTO audit_log (actor_id, action, target_type, target_id, details)
      VALUES ($1, 'publish', 'skill', $2, $3)
    `,
        [author.id, skillId, JSON.stringify({ version: manifest.version })],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // 7. Queue security scan (async)
    await scanQueue.add('scan', {
      skillId,
      version: manifest.version,
      packageKey,
    });

    // 8. Invalidate search cache
    await redis.del('search:*');

    return res.status(201).json({
      published: true,
      name: manifest.name,
      version: manifest.version,
      url: `https://spm.dev/skills/${manifest.name}`,
      scan_status: 'pending',
    });
  },
);

// ── Download ────────────────────────────────────────────

fastify.get('/api/v1/skills/:name/:version/download', async (req, res) => {
  // (Implementation shown in Section 4 above)
});

// ── Skill Info ──────────────────────────────────────────

fastify.get('/api/v1/skills/:name', async (req, res) => {
  const { name } = req.params;

  const cacheKey = `skill:${name}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const skill = await db.query(
    `
    SELECT s.*, a.username as author_name, a.verified as author_verified,
           a.avatar_url as author_avatar
    FROM skills s JOIN authors a ON s.author_id = a.id
    WHERE s.name = $1
  `,
    [name],
  );

  if (!skill.rows.length) return res.status(404).json({ error: 'Not found' });

  const versions = await db.query(
    `
    SELECT version, created_at, signed, scan_status, package_size, platforms
    FROM skill_versions WHERE skill_id = $1
    ORDER BY created_at DESC
  `,
    [skill.rows[0].id],
  );

  const response = {
    ...formatSkillDetail(skill.rows[0]),
    versions: versions.rows,
  };

  await redis.setex(cacheKey, 300, JSON.stringify(response));
  return response;
});

// ── Version Resolution ──────────────────────────────────

fastify.get('/api/v1/skills/:name/resolve', async (req, res) => {
  const { name } = req.params;
  const { range = 'latest' } = req.query;

  const versions = await db.query(
    `
    SELECT sv.version, sv.checksum, sv.signed, sv.signer_identity,
           sv.scan_status, sv.package_size, sv.skill_deps, sv.system_deps,
           sv.manifest
    FROM skill_versions sv
    JOIN skills s ON sv.skill_id = s.id
    WHERE s.name = $1 AND sv.status = 'active'
    ORDER BY sv.created_at DESC
  `,
    [name],
  );

  if (!versions.rows.length) {
    return res.status(404).json({ error: `Skill '${name}' not found` });
  }

  // Resolve version range
  const allVersions = versions.rows.map((v) => v.version);
  let resolved;

  if (range === 'latest') {
    resolved = versions.rows[0];
  } else {
    const semver = require('semver');
    const match = semver.maxSatisfying(allVersions, range);
    if (!match) {
      return res.status(404).json({
        error: `No version of '${name}' satisfies ${range}`,
        available: allVersions,
      });
    }
    resolved = versions.rows.find((v) => v.version === match);
  }

  return {
    name,
    requested: range,
    resolved: resolved.version,
    available: allVersions,
    download_url: `https://registry.spm.dev/api/v1/skills/${name}/${resolved.version}/download`,
    checksum: resolved.checksum,
    signed: resolved.signed,
    signer: resolved.signer_identity,
    scan_status: resolved.scan_status,
    dependencies: {
      skills: resolved.skill_deps,
      system: resolved.system_deps,
    },
    size_bytes: resolved.package_size,
  };
});

// Start server
fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
```

---

## 6. Redis Layer

```
Redis serves three purposes:

1. SEARCH CACHE
   Key: search:{query-hash}
   TTL: 60s
   Value: JSON search results
   Invalidated on: new publish, yank

2. RATE LIMITING
   Key: ratelimit:{action}:{author-id}
   TTL: varies by action
   Value: counter

   Limits:
     publish:   10/hour per author
     download:  1000/hour per IP
     search:    100/min per IP
     api:       5000/hour per token

3. DOWNLOAD COUNTERS
   Key: downloads:{skill}:{date}
   TTL: 90 days
   Value: counter (INCR)

   Aggregated nightly into PostgreSQL
   Enables weekly_downloads without counting rows

4. POPULAR SKILLS LEADERBOARD
   Key: trending:weekly
   Type: sorted set
   Score: download count
   Updated hourly
```

---

## 7. Security Scanner (Async Worker)

```
┌──────────┐     ┌───────────┐     ┌──────────────┐
│ Publish  │────►│  BullMQ / │────►│  Scanner     │
│ API      │     │  Upstash  │     │  Worker      │
└──────────┘     └───────────┘     └──────┬───────┘
                                          │
                                   ┌──────▼───────┐
                                   │ 1. Download   │
                                   │    .skl from  │
                                   │    R2         │
                                   │              │
                                   │ 2. Extract to │
                                   │    temp dir   │
                                   │              │
                                   │ 3. Layer 1:   │
                                   │    Regex scan │
                                   │    (patterns) │
                                   │              │
                                   │ 4. Layer 2:   │
                                   │    ML classify│
                                   │    (ProtectAI │
                                   │    DeBERTa v2)│
                                   │              │
                                   │ 5. Layer 3:   │
                                   │    Lakera API │
                                   │    (if config)│
                                   │              │
                                   │ 6. Static     │
                                   │    analysis   │
                                   │    (scripts)  │
                                   │              │
                                   │ 7. Permission │
                                   │    audit      │
                                   │              │
                                   │ 8. Write      │
                                   │    results    │
                                   │    to DB      │
                                   └──────────────┘

ML Model Hosting:
  ProtectAI/deberta-v3-base-prompt-injection-v2
  ├── Runs via ONNX runtime on scanner worker
  ├── Model loaded once, reused across scans
  ├── Apache 2.0 license, self-hosted
  ├── ~100-200ms per classification
  └── Cost: $0 (included in compute)

Lakera Guard (Phase 2+):
  ├── Single POST request per scan
  ├── Free tier: 10,000 requests/month
  ├── Covers: injections, jailbreaks, PII, content
  └── Only called if Layer 2 is borderline (0.7-0.95)
```

Note: Layer 1 (regex) runs synchronously during publish in the API server — blocking fast. Layers 2-3 can run in the async worker for background verification if needed (especially for bulk imports).

The scanner runs asynchronously for code analysis — publishing is not blocked for Tier 2+ authors. The content security layers (1-3) run synchronously and block the publish if they detect issues.

---

## 8. MCP Server Deployment

The MCP server that lets agents search the registry runs as a separate service:

```
┌─────────────────────────────────────────────┐
│            MCP Server Options                │
│                                             │
│  Option A: Hosted by SPM (recommended)      │
│  ┌─────────────────────────────────────┐    │
│  │  https://mcp.spm.dev/sse            │    │
│  │  Runs on same infra as registry     │    │
│  │  Talks to registry API internally   │    │
│  │  User adds to agent MCP connectors │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Option B: Local sidecar with CLI           │
│  ┌─────────────────────────────────────┐    │
│  │  $ spm mcp-server                   │    │
│  │  Runs on localhost:3001             │    │
│  │  For Claude Code / offline use      │    │
│  │  Talks to registry over HTTPS       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Option C: Cloudflare Worker (edge)         │
│  ┌─────────────────────────────────────┐    │
│  │  Deployed at edge, low latency      │    │
│  │  Proxies to registry API            │    │
│  │  Good for global user base          │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

For agent platform integration, the hosted option is cleanest — users just add the MCP connector URL in their agent settings (e.g., Claude.ai connectors, Cursor MCP config, etc.).

---

## 9. Self-Hosted / Private Registries

For companies that want internal skill registries:

```yaml
# docker-compose.yml for self-hosted registry

version: '3.8'

services:
  api:
    image: ghcr.io/spm-dev/spm-registry:latest
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgres://spm:password@postgres:5432/spm
      REDIS_URL: redis://redis:6379
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: spm-packages
      S3_ACCESS_KEY: minioadmin
      S3_SECRET_KEY: minioadmin
      JWT_SECRET: your-secret-here
      PUBLIC_URL: https://spm.yourcompany.com
    depends_on:
      - postgres
      - redis
      - minio

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: spm
      POSTGRES_USER: spm
      POSTGRES_PASSWORD: password
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - miniodata:/data

  scanner:
    image: ghcr.io/spm-dev/spm-scanner:latest
    environment:
      DATABASE_URL: postgres://spm:password@postgres:5432/spm
      S3_ENDPOINT: http://minio:9000

  nginx:
    image: nginx:alpine
    ports:
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/ssl/certs

volumes:
  pgdata:
  miniodata:
```

```bash
# CLI config for private registry
$ spm config set registry https://spm.yourcompany.com/api/v1

# Or per-project in skills.json
{
  "registry": "https://spm.yourcompany.com/api/v1",
  "skills": { ... }
}
```

### Scoped Registries (like npm scopes)

```json
// ~/.spm/config.json
{
  "registries": {
    "default": "https://registry.spm.dev/api/v1",
    "@mycompany": "https://spm.mycompany.com/api/v1",
    "@partner": "https://spm.partner.io/api/v1"
  }
}
```

```json
// skills.json
{
  "skills": {
    "data-viz": "^1.2.0", // → default registry
    "@mycompany/internal-report": "^2.0.0", // → company registry
    "@partner/special-tool": "^1.0.0" // → partner registry
  }
}
```

---

## 10. Monitoring & Observability

```
┌──────────────────────────────────────────┐
│            Monitoring Stack               │
│                                          │
│  Metrics (Prometheus / CloudWatch):      │
│  ├── API latency (p50, p95, p99)         │
│  ├── Download throughput                 │
│  ├── Search query volume                 │
│  ├── Publish rate                        │
│  ├── Security scan queue depth           │
│  ├── Error rates by endpoint             │
│  └── S3 storage usage                    │
│                                          │
│  Alerts:                                 │
│  ├── API error rate > 1%                 │
│  ├── Scan queue > 100 pending            │
│  ├── Download failures > 0.1%            │
│  ├── Database connections exhausted      │
│  ├── S3 upload failures                  │
│  └── Signature verification failures     │
│                                          │
│  Dashboards:                             │
│  ├── Registry health (Grafana)           │
│  ├── Popular skills / trending           │
│  ├── Author activity                     │
│  └── Security scan results over time     │
└──────────────────────────────────────────┘
```
