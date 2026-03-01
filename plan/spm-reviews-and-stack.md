# Reviews, Ratings, and Tech Stack

## Trust Signals, Abuse Prevention, and What We Build With

---

# Part 1: Reviews and Ratings

## 1. Rating System Design

### 1.1 Keep It Simple

```
Rating: 1-5 stars (integer, no half-stars)
Review: Optional text (0-2000 chars)
One review per user per skill (can update, not duplicate)
```

No complex rubrics, no multi-axis ratings (quality / docs / usefulness). One number. Optional words. That's it.

Why? npm has download counts and GitHub stars. PyPI has almost nothing. VS Code has 1-5 stars + text. The simpler it is, the more people use it.

### 1.2 What's Displayed

```
Skill page:

  ┌────────────────────────────────────────────────┐
  │  data-viz v1.2.0                               │
  │  ★★★★☆ 4.2 (47 ratings)  ·  2.1k installs     │
  │                                                │
  │  Reviews (12):                                 │
  │                                                │
  │  ★★★★★  "Perfect for dashboards"        - @dev1│
  │  ★★★★☆  "Works great, needs better..." - @dev2│
  │  ★★☆☆☆  "Broke on large CSVs"          - @dev3│
  │                                                │
  │  Sort by: Most recent | Most helpful | Critical│
  └────────────────────────────────────────────────┘
```

### 1.3 Aggregate Score

```python
def calculate_display_rating(skill_name: str) -> float:
    """
    Weighted rating that accounts for number of ratings.
    Bayesian average prevents skills with 1 five-star rating
    from ranking above skills with 100 four-star ratings.
    """
    ratings = db.fetch("SELECT rating FROM reviews WHERE skill_name=$1", skill_name)

    if not ratings:
        return 0.0

    # Bayesian average
    # C = average rating across ALL skills (global prior)
    # m = minimum ratings to be considered (confidence threshold)
    C = 3.5   # Global average across all skills
    m = 5     # Need at least 5 ratings before score stabilizes

    n = len(ratings)
    avg = sum(r["rating"] for r in ratings) / n

    # Weighted: pulls toward global average when few ratings
    bayesian = (n * avg + m * C) / (n + m)

    return round(bayesian, 1)

# Examples:
#   1 rating of 5.0  → displays as 3.8 (pulled toward 3.5)
#   5 ratings of 5.0 → displays as 4.3
#   50 ratings of 5.0 → displays as 4.8
#   100 ratings of 4.0 → displays as 4.0 (enough data, minimal pull)
```

---

## 2. Who Can Review

```
ANYONE with an SPM account can rate (1-5 stars).
  → Just need to be logged in.
  → No install requirement for rating.

ANYONE who has INSTALLED the skill can leave a text review.
  → Review button only appears after install.
  → Prevents drive-by text reviews from people who never used it.

AUTHOR cannot review their own skill.
  → Automatic exclusion.

ONE review per user per skill.
  → Can edit/update, but not create duplicates.
  → Updated reviews show "edited" badge with date.
```

Why allow ratings without install? Because users might evaluate a skill by reading its docs without installing. But text reviews should come from people who actually used it.

---

## 3. Abuse Prevention

### 3.1 Threat Model

```
ATTACK 1: Rating Bombing
  Competitor creates 50 accounts, gives you 1-star ratings.

ATTACK 2: Self-Promotion
  Author creates fake accounts, gives themselves 5 stars.

ATTACK 3: Review Spam
  Bot accounts posting promotional or irrelevant text reviews.

ATTACK 4: Coordinated Campaigns
  Discord/Slack group organizes mass 1-star or 5-star reviews.

ATTACK 5: Revenge Reviews
  Author A reviews Author B's competing skill with 1 star.

ATTACK 6: Review Manipulation by Author
  Author bullies or incentivizes users to leave good reviews.
```

### 3.2 Defenses

```
┌──────────────────────────────────────────────────────────┐
│              Defense Layers                                │
│                                                          │
│  LAYER 1: Account Requirements                           │
│  ├── Must have verified email                            │
│  ├── Account must be >24 hours old to review             │
│  ├── Cannot review from the same IP as another account   │
│  │   that already reviewed the same skill                │
│  └── Flagged accounts can't review (abuse score > 0)     │
│                                                          │
│  LAYER 2: Rate Limits                                    │
│  ├── Max 5 reviews per user per day                      │
│  ├── Max 20 reviews per user per week                    │
│  ├── Max 3 reviews from the same IP per skill per day    │
│  └── New accounts (< 7 days): max 2 reviews per day     │
│                                                          │
│  LAYER 3: Anomaly Detection                              │
│  ├── Spike detection: >10 reviews on a skill in 1 hour  │
│  │   → flag for manual review                            │
│  ├── Rating distribution: all reviews are 1 or 5 stars   │
│  │   → flag for review (natural distributions are mixed) │
│  ├── Account cluster: multiple new accounts from same    │
│  │   IP range reviewing same skills → auto-block         │
│  └── Author's other skills: if author reviews competitor │
│       skills with 1 star → flag for review               │
│                                                          │
│  LAYER 4: Community Moderation                           │
│  ├── "Report review" button (with reason)                │
│  ├── Skill author can flag reviews (but can't delete)    │
│  ├── Tier 3+ users' flags get priority                   │
│  └── Consistently helpful reviewers get "trusted" badge  │
│                                                          │
│  LAYER 5: Author Response                                │
│  ├── Author can post ONE public reply per review         │
│  ├── Reply doesn't change the rating                     │
│  └── Professional response culture encouraged            │
└──────────────────────────────────────────────────────────┘
```

### 3.3 Anomaly Detection

```python
class ReviewAnomalyDetector:
    """Detect suspicious review patterns."""

    async def check_review(self, review: Review) -> AnomalyResult:
        """Run all checks on a new review before publishing."""

        flags = []

        # 1. Velocity check: too many reviews on this skill recently?
        recent_count = await db.fetchval("""
            SELECT COUNT(*) FROM reviews
            WHERE skill_name = $1 AND created_at > NOW() - INTERVAL '1 hour'
        """, review.skill_name)

        if recent_count > 10:
            flags.append(AnomalyFlag(
                type="velocity_spike",
                severity="hold",
                detail=f"{recent_count} reviews in last hour"
            ))

        # 2. IP cluster check
        same_ip_reviews = await db.fetchval("""
            SELECT COUNT(DISTINCT user_id) FROM reviews
            WHERE skill_name = $1
            AND ip_prefix = $2
            AND created_at > NOW() - INTERVAL '7 days'
        """, review.skill_name, review.ip_prefix)  # /24 prefix

        if same_ip_reviews >= 3:
            flags.append(AnomalyFlag(
                type="ip_cluster",
                severity="block",
                detail=f"{same_ip_reviews} users from same IP range"
            ))

        # 3. Rating distribution check
        distribution = await db.fetch("""
            SELECT rating, COUNT(*) as cnt FROM reviews
            WHERE skill_name = $1
            AND created_at > NOW() - INTERVAL '24 hours'
            GROUP BY rating
        """, review.skill_name)

        if len(distribution) > 5:
            ratings = [r["rating"] for r in distribution for _ in range(r["cnt"])]
            # If all recent ratings are extreme (1 or 5), flag
            extreme_pct = sum(1 for r in ratings if r in (1, 5)) / len(ratings)
            if extreme_pct > 0.9:
                flags.append(AnomalyFlag(
                    type="polarized_ratings",
                    severity="hold",
                    detail=f"{extreme_pct:.0%} of recent ratings are 1 or 5 stars"
                ))

        # 4. Author conflict check
        is_competing_author = await db.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM skills
                WHERE author_id = $1
                AND category = (SELECT category FROM skills WHERE name = $2)
                AND name != $2
            )
        """, review.user_id, review.skill_name)

        if is_competing_author and review.rating <= 2:
            flags.append(AnomalyFlag(
                type="competing_author",
                severity="hold",
                detail="Low rating from author of competing skill in same category"
            ))

        # Decision
        blocks = [f for f in flags if f.severity == "block"]
        holds = [f for f in flags if f.severity == "hold"]

        if blocks:
            return AnomalyResult("blocked", flags)
        elif holds:
            return AnomalyResult("held_for_review", flags)
        else:
            return AnomalyResult("published", flags)
```

### 3.4 "Helpful" Voting

Users can vote reviews as "helpful" or "not helpful" (like Amazon).

```
Review:
  ★★☆☆☆  "Breaks when CSV has more than 10k rows.
           Tested with Python 3.11 on Claude Code."  - @dev3

  👍 12 people found this helpful  |  🚩 Report

Sort by "Most helpful" surfaces quality reviews.
```

This creates a self-moderating system — low-effort or abusive reviews get downvoted and sink, detailed honest reviews float up.

---

## 4. Database Schema

```sql
CREATE TABLE reviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name   VARCHAR(128) NOT NULL REFERENCES skills(name),
    user_id      UUID NOT NULL REFERENCES users(id),
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body         TEXT CHECK (char_length(body) <= 2000),

    -- Abuse prevention
    ip_prefix    VARCHAR(15),          -- /24 prefix, for cluster detection
    status       VARCHAR(20) DEFAULT 'published',
                 -- 'published', 'held', 'removed', 'flagged'
    anomaly_flags JSONB DEFAULT '[]',

    -- Author response
    author_reply TEXT CHECK (char_length(author_reply) <= 1000),
    author_reply_at TIMESTAMPTZ,

    -- Helpfulness
    helpful_count    INT DEFAULT 0,
    unhelpful_count  INT DEFAULT 0,

    -- Timestamps
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),

    -- One review per user per skill
    UNIQUE(skill_name, user_id)
);

CREATE TABLE review_votes (
    user_id    UUID NOT NULL REFERENCES users(id),
    review_id  UUID NOT NULL REFERENCES reviews(id),
    vote       VARCHAR(10) NOT NULL CHECK (vote IN ('helpful', 'unhelpful')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, review_id)
);

CREATE TABLE review_reports (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id  UUID NOT NULL REFERENCES reviews(id),
    reporter_id UUID NOT NULL REFERENCES users(id),
    reason     VARCHAR(50) NOT NULL,
                -- 'spam', 'abusive', 'irrelevant', 'fake', 'conflict_of_interest'
    detail     TEXT,
    status     VARCHAR(20) DEFAULT 'pending',
                -- 'pending', 'upheld', 'dismissed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_reviews_skill ON reviews(skill_name, status);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_recent ON reviews(created_at DESC);
CREATE INDEX idx_reviews_helpful ON reviews(skill_name, helpful_count DESC);
```

---

# Part 2: Tech Stack

## 5. Stack Decision

### 5.1 Guiding Principles

```
1. USE WHAT WE KNOW
   SPM is a side project. Learning a new framework while building
   a complex product is a recipe for shipping nothing.

2. MINIMIZE MOVING PARTS
   Every service is a thing that can break at 2 AM. Fewer services
   = more sleep. Managed services > self-hosted.

3. CHEAP AT SMALL SCALE
   Revenue is $0 for the first 6+ months. The stack must cost
   <$50/month while the ecosystem bootstraps.

4. CAN SCALE WHEN NEEDED
   Don't over-engineer for 1M users on Day 1. But don't pick
   tech that tops out at 100 users either.

5. DEVELOPER-FRIENDLY ECOSYSTEM
   Good docs, active community, easy to hire/contribute.
```

### 5.2 The Stack

```
┌──────────────────────────────────────────────────────────┐
│                    SPM Tech Stack                         │
│                                                          │
│  CLI:                                                    │
│  ├── Language: TypeScript (Node.js)                      │
│  ├── Why: npm is a CLI written in JS. Developers have    │
│  │   Node installed. We ship via npm install -g spm.     │
│  │   Same language as the API = shared types/validation. │
│  ├── CLI framework: Commander.js or oclif                │
│  ├── HTTP client: undici (built into Node 18+)           │
│  ├── Archive: archiver + yauzl (ZIP handling)            │
│  └── Testing: vitest                                     │
│                                                          │
│  API / Backend:                                          │
│  ├── Language: TypeScript (Node.js)                      │
│  ├── Framework: Hono (lightweight, fast, edge-friendly)  │
│  │   Why not Express: Hono is typed, faster, modern.     │
│  │   Why not Fastify: Hono is simpler, Cloudflare-ready. │
│  │   Why not Python/FastAPI: sharing types with CLI is    │
│  │   worth more than Python's ecosystem advantages here. │
│  ├── Validation: Zod (shared schemas with CLI)           │
│  ├── ORM: Drizzle (type-safe, lightweight)               │
│  └── Testing: vitest                                     │
│                                                          │
│  Database:                                               │
│  ├── Neon (serverless Postgres)                          │
│  ├── Why: free tier is generous, scales to enterprise,   │
│  │   branching for dev/staging, serverless = no idle     │
│  │   costs. Standard Postgres = no vendor lock-in.       │
│  └── Migrations: Drizzle Kit                             │
│                                                          │
│  Storage (packages):                                     │
│  ├── Cloudflare R2                                       │
│  ├── Why: S3-compatible, no egress fees (huge for a      │
│  │   package manager where downloads are the main cost). │
│  │   10 GB free. Generous free tier.                     │
│  └── SDK: @aws-sdk/client-s3 (R2 is S3-compatible)      │
│                                                          │
│  Hosting:                                                │
│  ├── Fly.io (API server)                                 │
│  ├── Why: simple deployment, global edge, good free      │
│  │   tier, Docker-based. Easy to scale from 1 to N.     │
│  │   Alternatively: Railway, Render, or Cloudflare       │
│  │   Workers if we go fully edge-native.                 │
│  └── Workers option: Hono runs on Cloudflare Workers     │
│       natively. Could go serverless-first for $0 at low  │
│       traffic. But Fly.io is simpler to reason about.    │
│                                                          │
│  CDN:                                                    │
│  ├── Cloudflare (free tier)                              │
│  ├── Sits in front of Fly.io + R2                        │
│  └── Caches package downloads, API responses             │
│                                                          │
│  Auth:                                                   │
│  ├── GitHub OAuth (primary login method)                 │
│  ├── Implementation: Lucia or next-auth patterns         │
│  ├── Sessions: DB-backed (Postgres)                      │
│  └── 2FA: TOTP (Google Authenticator / Authy)            │
│                                                          │
│  Background Jobs:                                        │
│  ├── BullMQ (Redis-based job queue)                      │
│  ├── Why: mature, reliable, has dashboard (Bull Board).  │
│  ├── Redis: Upstash (serverless Redis, free tier)        │
│  └── Jobs: content scanning, analytics aggregation,      │
│       email notifications, federation sync               │
│                                                          │
│  Search:                                                 │
│  ├── Phase 1: Postgres full-text search (pg_trgm)       │
│  │   Free, no extra service. Good enough for <10k skills.│
│  ├── Phase 2: Meilisearch or Typesense (if needed)       │
│  │   Fast typo-tolerant search. Self-hosted on Fly.io.  │
│  └── Why not Algolia/Elastic: cost at scale, overkill    │
│       for early phase.                                   │
│                                                          │
│  Web UI (future):                                        │
│  ├── Framework: Next.js or Astro                         │
│  ├── Hosting: Vercel or Cloudflare Pages                 │
│  ├── Styling: Tailwind CSS                               │
│  └── Not built until Phase 2+                            │
│                                                          │
│  Monitoring:                                             │
│  ├── Sentry (error tracking, free tier)                  │
│  ├── Better Stack or Axiom (logs, free tier)             │
│  └── Uptime: Better Uptime or Fly.io built-in           │
│                                                          │
│  CI/CD:                                                  │
│  ├── GitHub Actions (free for open source)               │
│  ├── Tests on every PR                                   │
│  ├── Deploy to Fly.io on merge to main                   │
│  └── Publish CLI to npm on release tag                   │
│                                                          │
│  spm-onboard (bulk import tool):                         │
│  ├── Language: TypeScript (shares code with CLI)         │
│  ├── Separate npm package: spm-onboard                   │
│  └── Uses same API client as main CLI                    │
└──────────────────────────────────────────────────────────┘
```

### 5.3 Why TypeScript Everywhere

```
Option A: TypeScript CLI + TypeScript API
  ✓ Shared types (manifest schema, validation, API contracts)
  ✓ Shared code (archive handling, content scanning)
  ✓ One language to maintain
  ✓ CLI ships via npm (developers already have Node)
  ✓ Hono runs on edge (Cloudflare Workers) if needed
  ✗ Not as fast as Rust/Go for CLI
  ✗ Node.js cold starts on serverless

Option B: Python CLI + Python API (FastAPI)
  ✓ Great for content scanning (NLP, regex)
  ✓ pip install spm
  ✓ FastAPI is excellent
  ✗ CLI via pip has dependency hell issues
  ✗ No shared types between CLI and API
  ✗ Python CLIs feel slower to start

Option C: Rust/Go CLI + TypeScript API
  ✓ Fast CLI binary (no runtime needed)
  ✓ Single binary distribution
  ✗ Two languages = harder to maintain for one person
  ✗ Slower to develop in Rust/Go
  ✗ Can't share validation logic

Option D: TypeScript CLI + Python API
  ✗ Worst of both worlds. Two ecosystems, no code sharing.

DECISION: TypeScript everywhere (Option A).
  The shared types/validation/schemas between CLI and API
  is the decisive factor. CLI speed is acceptable — npm
  itself is written in JavaScript and nobody complains.
```

### 5.4 Why These Specific Services

```
┌───────────────┬──────────────┬──────────────────────────────┐
│ Service       │ Free Tier    │ Why This One                 │
├───────────────┼──────────────┼──────────────────────────────┤
│ Neon          │ 500 MB       │ Serverless Postgres, branch  │
│               │ 1 project    │ for dev, scales to TB.       │
│               │              │ Standard SQL = no lock-in.   │
│               │              │                              │
│ Cloudflare R2 │ 10 GB        │ S3-compatible, ZERO egress.  │
│               │ 1M req/mo    │ Package downloads are free.  │
│               │              │ This alone saves hundreds/mo │
│               │              │ vs S3 at scale.              │
│               │              │                              │
│ Fly.io        │ 3 shared VMs │ Simple Docker deploy. Global │
│               │ 3 GB storage │ edge. Good DX. Scale to N    │
│               │              │ machines with one command.   │
│               │              │                              │
│ Upstash Redis │ 10k cmd/day  │ Serverless Redis. Perfect    │
│               │              │ for BullMQ job queue. No     │
│               │              │ idle cost.                   │
│               │              │                              │
│ Cloudflare    │ Unlimited    │ CDN, DNS, DDoS protection.   │
│ (CDN/DNS)     │              │ Package downloads cached.    │
│               │              │ All free.                    │
│               │              │                              │
│ GitHub        │ Free for OSS │ OAuth, Actions, source code, │
│               │              │ issues. The whole workflow.   │
│               │              │                              │
│ Sentry        │ 5k events/mo │ Error tracking. Know when    │
│               │              │ things break.                │
│               │              │                              │
│ Vercel        │ Hobby tier   │ Web UI hosting (when built). │
│               │              │ Or Cloudflare Pages (free).  │
└───────────────┴──────────────┴──────────────────────────────┘

Estimated monthly cost:
  Phase 1 (< 1k users):   $0-20/month  (mostly free tiers)
  Phase 2 (1k-10k users): $50-150/month (Neon Pro, Fly scale)
  Phase 3 (10k+ users):   $200-500/month (more workers, storage)
```

### 5.5 Shared Code Architecture

```
spm/
├── packages/
│   ├── spm-cli/           # The CLI (npm install -g spm)
│   │   ├── src/
│   │   │   ├── commands/  # install, publish, search, etc.
│   │   │   ├── lib/       # CLI-specific logic
│   │   │   └── index.ts   # Entry point
│   │   └── package.json
│   │
│   ├── spm-api/           # The API server
│   │   ├── src/
│   │   │   ├── routes/    # Hono route handlers
│   │   │   ├── services/  # Business logic
│   │   │   ├── security/  # ML model + Lakera integration
│   │   │   ├── jobs/      # Background workers
│   │   │   └── index.ts   # Entry point
│   │   └── package.json
│   │
│   ├── spm-onboard/       # Bulk import tool
│   │   ├── src/
│   │   └── package.json
│   │
│   └── spm-shared/        # Shared code (the magic)
│       ├── src/
│       │   ├── schemas/   # Zod schemas (manifest, review, etc.)
│       │   ├── scanner/   # Layer 1: regex pattern scanning
│       │   ├── archive/   # .skl pack/unpack (archiver + yauzl)
│       │   ├── semver/    # Version parsing (wraps npm semver)
│       │   ├── naming/    # Name validation (string-similarity + confusables)
│       │   ├── npm-bridge/ # Import agent-skill packages from npm
│       │   └── types/     # TypeScript types
│       └── package.json
│
├── turbo.json             # Turborepo config (monorepo build)
├── pnpm-workspace.yaml    # Workspace definition
└── package.json           # Root
```

Key design decisions:

- **No spm-linker package.** Agent linking is handled by Vercel's `skills` CLI (`npx skills add <path>`). It already supports 37+ agents, handles symlinks, and detects installed agents. SPM calls it as a subprocess after download + unpack + scan.

- **spm-shared** is imported by both CLI and API. Manifest validation, regex scanning, archive handling, name rules — all run identical code on both sides. This is why TypeScript everywhere matters.

- **spm-api/security/** contains the server-side-only layers: ProtectAI DeBERTa model (Layer 2) and Lakera Guard API integration (Layer 3). These don't run in the CLI — only the fast regex scanner (Layer 1) runs locally.

- **npm-bridge** in spm-shared handles importing existing agent-skill packages from npmjs.org, adding SPM's security scanning and trust layer on top.

### Borrowed Tools (not built, just imported)

```
TOOL                          WHAT IT REPLACES           WHERE USED
──────────────────────────────────────────────────────────────────────
npx skills add                Agent linking (replaces     CLI (subprocess)
ProtectAI DeBERTa v2          Custom ML model             API (security/)
Lakera Guard API              Custom injection API         API (security/)
@sigstore/sign + /verify      Custom package signing       CLI + API
npm semver                    Custom version resolver      spm-shared
string-similarity             Custom Levenshtein           spm-shared/naming
confusables                   Custom homoglyph tables      spm-shared/naming
archiver + yauzl              Custom ZIP handling          spm-shared/archive
Zod                           Custom validation            spm-shared/schemas
Commander.js                  Custom CLI framework         spm-cli
```

### 5.6 Why Monorepo

```
Alternative: separate repos for CLI, API, shared
  ✗ Publishing shared changes requires cross-repo PRs
  ✗ Version sync between packages is painful
  ✗ CI runs in multiple places

Monorepo with Turborepo:
  ✓ One PR updates CLI + API + shared together
  ✓ Turborepo caches builds (fast CI)
  ✓ pnpm workspaces for local development
  ✓ Single CI pipeline
  ✓ Standard approach for projects like this
```

---

## 6. Content Scanning Implementation

Where does content scanning actually run?

```
CLI (spm validate, spm publish):
  → Runs spm-shared/scanner locally
  → Fast feedback before upload
  → Uses patterns bundled with the CLI

API (on package receive):
  → Runs spm-shared/scanner server-side
  → Same code, same patterns
  → ALSO checks against latest pattern database
  → Patterns update server-side without CLI update

Pattern updates:
  → Stored in DB table: scan_patterns
  → CLI fetches latest patterns on spm publish (preflight)
  → Server always has latest
  → Pattern changes don't require CLI release
```

```typescript
// spm-shared/src/scanner/index.ts

export interface ScanResult {
  passed: boolean;
  blocks: ScanIssue[];
  flags: ScanIssue[];
}

export function scanSkillContent(
  skillMd: string,
  scripts: Map<string, string>,
  patterns: ScanPattern[],
): ScanResult {
  const issues: ScanIssue[] = [];

  // Normalize content for evasion resistance
  const normalizedMd = normalize(skillMd);

  // Run all patterns against SKILL.md
  for (const pattern of patterns) {
    const matches = pattern.regex.exec(normalizedMd);
    if (matches) {
      issues.push({
        type: pattern.category,
        severity: pattern.severity,
        line: getLineNumber(skillMd, matches.index),
        match: matches[0].substring(0, 100),
        message: pattern.message,
      });
    }
  }

  // Run patterns against all scripts too
  for (const [filename, content] of scripts) {
    const normalizedScript = normalize(content);
    for (const pattern of patterns) {
      if (!pattern.scanScripts) continue;
      const matches = pattern.regex.exec(normalizedScript);
      if (matches) {
        issues.push({
          type: pattern.category,
          severity: pattern.severity,
          file: filename,
          line: getLineNumber(content, matches.index),
          match: matches[0].substring(0, 100),
          message: pattern.message,
        });
      }
    }
  }

  return {
    passed: issues.filter((i) => i.severity === 'block').length === 0,
    blocks: issues.filter((i) => i.severity === 'block'),
    flags: issues.filter((i) => i.severity === 'flag'),
  };
}

// This exact function runs in CLI AND API.
// One codebase, two execution contexts.
```

---

## 7. API Route Overview

```typescript
// spm-api/src/routes/index.ts (Hono)

import { Hono } from 'hono';

const app = new Hono();

// ── Skills ──────────────────────────────────
app.get('/api/v1/skills', searchSkills);
app.get('/api/v1/skills/:name', getSkill);
app.get('/api/v1/skills/:name/:version', getSkillVersion);
app.get('/api/v1/skills/:name/:version/download', downloadSkill);
app.post('/api/v1/skills', publishSkill); // auth
app.delete('/api/v1/skills/:name/:version', yankVersion); // auth

// ── Reviews ─────────────────────────────────
app.get('/api/v1/skills/:name/reviews', getReviews);
app.post('/api/v1/skills/:name/reviews', createReview); // auth
app.put('/api/v1/skills/:name/reviews/:id', updateReview); // auth
app.post('/api/v1/reviews/:id/reply', authorReply); // auth
app.post('/api/v1/reviews/:id/vote', voteReview); // auth
app.post('/api/v1/reviews/:id/report', reportReview); // auth

// ── Auth ────────────────────────────────────
app.get('/api/v1/auth/github', githubOAuth);
app.get('/api/v1/auth/github/callback', githubCallback);
app.post('/api/v1/auth/2fa/setup', setup2FA); // auth
app.post('/api/v1/auth/2fa/verify', verify2FA); // auth

// ── User / Author ───────────────────────────
app.get('/api/v1/users/me', getProfile); // auth
app.get('/api/v1/users/:username', getPublicProfile);
app.get('/api/v1/users/:username/skills', getUserSkills);

// ── Analytics ───────────────────────────────
app.post('/api/v1/analytics/events', ingestEvents); // auth
app.get('/api/v1/analytics/:name', getSkillAnalytics); // auth

// ── Bulk Import ─────────────────────────────
app.post('/api/v1/bulk/request-token', requestBulkToken); // auth
app.post('/api/v1/bulk/validate', bulkValidate); // bulk-auth
app.put('/api/v1/bulk/upload/:name/:version', bulkUpload); // bulk-auth

// ── Federation ──────────────────────────────
app.get('/api/v1/federation/catalog', federationCatalog);
app.get('/api/v1/federation/changes', federationChanges);
app.get('/api/v1/federation/health', federationHealth);

// ── MCP ─────────────────────────────────────
app.get('/api/v1/mcp/search', mcpSearch);
app.get('/api/v1/mcp/suggest', mcpSuggest);
```

---

## 8. What Gets Built When

```
PHASE 1 — MVP (3-4 weeks, was 2 months):
  Stack: CLI + API + DB + Storage + Vercel skills CLI

  CLI commands:
    spm init, validate, pack, publish, install,
    search, list, update, uninstall

  Agent Linking (BORROWED — Vercel skills CLI):
    SPM calls: npx skills add <path> -a '*' -y
    Supports: 37+ agents (Claude, Cursor, Copilot, Codex, etc.)
    spm agents — show detected agents and linked skills

  Security Pipeline (3 layers, mostly borrowed):
    Layer 1: Regex patterns (built — JSON file + scanner)
    Layer 2: ProtectAI DeBERTa v2 (borrowed — ONNX runtime)
    Layer 3: Lakera Guard (borrowed — Phase 2, free API)

  Package Signing (BORROWED — sigstore-js):
    @sigstore/sign on publish, @sigstore/verify on install
    Keyless via GitHub OIDC, recorded on Rekor transparency log
    Same infrastructure npm uses for provenance

  API:
    Skills CRUD, search, download, publish
    GitHub OAuth, basic auth
    Content scanning (all 3 layers server-side)
    Analytics event ingestion
    Sigstore bundle storage alongside .skl packages

  npm Bridge:
    spm import --from npm <package-name>
    Import existing agent-skill packages from npmjs.org
    Seed registry with 90+ existing npm skills

  DB: Neon (skills, versions, users, analytics_events)
  Storage: R2 (packages + sigstore bundles)
  Hosting: Fly.io (1 machine)
  Domain: spm.dev

  NOT yet: reviews, web UI, federation, bulk import tool

PHASE 2 — Growth (Months 2-3):
  + Reviews and ratings (with anomaly detection)
  + Author analytics dashboard (basic stats)
  + spm-onboard (bulk import tool)
  + MCP integration (agents discover and suggest skills)
  + GitHub Actions for CI/CD publish
  + Background jobs (BullMQ + Upstash Redis)
  + Lakera Guard Layer 3 integration (free tier)
  + Additional agent platform testing

PHASE 3 — Ecosystem (Months 4-6):
  + Web UI (Next.js or Astro on Vercel)
  + Advanced search (Meilisearch if Postgres FTS isn't enough)
  + Federation API
  + 2FA for publishing (otpauth library)
  + Pro tier analytics
  + skills.sh indexing (import 200+ skills with security scanning)

PHASE 4 — Scale (Months 7+):
  + Enterprise features (SSO, teams, audit logs)
  + Regional mirrors
  + Premium skills
  + Advanced trigger analytics
  + Custom-trained ML model (fine-tuned on SPM-specific data)
```
