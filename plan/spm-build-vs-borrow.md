# SPM — Build vs. Borrow Analysis

## What We Can Use Instead of Building

For every step of SPM's flow, here's what exists vs. what we actually need to build.

---

## The Full SPM Flow (With Tool Mapping)

```
STEP                         BUILD?    USE EXISTING?
─────────────────────────────────────────────────────────────
1. Agent linking             NO        Vercel skills CLI
2. Prompt injection scan     NO        Lakera Guard API / ProtectAI models
3. Package signing           NO        sigstore-js
4. Registry server           PARTIAL   Custom API, but leverage Verdaccio patterns
5. Storage                   NO        Cloudflare R2 (S3-compatible)
6. Database                  NO        Neon (serverless Postgres)
7. Semver resolution         NO        npm semver library
8. CLI framework             NO        oclif or Commander.js
9. ZIP handling              NO        archiver + yauzl
10. Schema validation        NO        Zod
11. Background jobs          NO        BullMQ + Upstash Redis
12. Full-text search         NO        Postgres pg_trgm / tsvector
13. Auth                     NO        GitHub OAuth + Lucia
14. 2FA                      NO        otpauth library
15. Name similarity          MINIMAL   string-similarity / levenshtein npm packages
16. Analytics pipeline       BUILD     (this is unique to SPM)
17. Trigger analytics        BUILD     (this is SPM's moat — nobody has this)
18. Discovery via MCP        BUILD     (MCP integration is custom)
19. npm bridge/import        BUILD     (custom: fetch + parse + re-publish)
20. Trust tiers engine       BUILD     (custom business logic)
21. Reviews system           BUILD     (but simple — standard CRUD)
22. Web UI                   PARTIAL   Astro/Next.js, but content is custom
```

---

## Detailed Breakdown By Category

### 1. AGENT LINKING — Don't Build, Use Vercel

```
Tool:     npx skills add <path> -a '*' -y
What:     Auto-detects agents, symlinks skills into each one
Supports: 37+ agents (Claude, Cursor, Copilot, Codex, Gemini, etc.)
License:  Open source
How SPM uses it:

  spm install data-viz
    → SPM downloads .skl from registry
    → SPM unpacks to ~/.spm/cache/data-viz@1.2.0/
    → SPM runs: npx skills add ~/.spm/cache/data-viz@1.2.0/ -a '*' -y
    → Done. Skills CLI handles all agent detection + symlinking.

  spm uninstall data-viz
    → SPM runs: npx skills remove data-viz (or removes symlinks directly)
    → SPM cleans cache

Savings: 3-4 weeks of development (agent detection, per-platform
         directory logic, symlink management, Windows support)
```

### 2. CONTENT SECURITY — Don't Build ML Models, Use APIs + Patterns

```
THREE LAYERS (from cheapest to most expensive):

Layer 1: Regex pattern matching (FREE, local, fast)
  What: Static pattern detection for known injection phrases
  Examples: "ignore previous instructions", "system prompt:",
            base64-encoded instructions, URL exfiltration patterns
  Build: YES, but it's just a list of regex patterns — hours, not weeks
  Runs: Client-side (spm validate) AND server-side (spm publish)

Layer 2: ML model classification (FREE, can run server-side)
  Tool:     ProtectAI/deberta-v3-base-prompt-injection-v2
  What:     Fine-tuned DeBERTa model, classifies text as injection/safe
  License:  Apache 2.0
  Accuracy: ~90-99% depending on dataset (good enough for first pass)
  How:      Run via ONNX runtime on server during publish
  Cost:     FREE (self-hosted model, no API calls)
  Note:     Also available: deepset/deberta-v3-base-injection (MIT)

  Alternative for server:
  Tool:     Hugging Face Inference API
  What:     Host the model on HF, call via API
  Cost:     Free tier available

Layer 3: Commercial API (PAID, highest accuracy, Phase 2+)
  Tool:     Lakera Guard API
  What:     Production-grade prompt injection detection
  Features: 100+ languages, jailbreak detection, PII detection,
            content moderation, malicious link detection
  Cost:     Free: 10,000 requests/month (enough for Phase 1!)
            Pro: contact for pricing
  Latency:  <100ms
  How:      Single POST request per skill publish

  Alternative:
  Tool:     OpenAI Guardrails (if using OpenAI)

RECOMMENDED STRATEGY:
  Phase 1: Layer 1 (regex) + Layer 2 (ProtectAI model, self-hosted)
           → $0/month, catches 95%+ of injections
  Phase 2: Add Layer 3 (Lakera Guard free tier) for edge cases
           → 10k free requests = ~10k publishes/month
  Phase 3: Lakera Pro or custom-trained model

Savings: Don't need to train any ML models. Don't need to build
         a prompt injection detector from scratch. The hard
         ML work is already done.
```

### 3. PACKAGE SIGNING — Don't Build, Use Sigstore

```
Tool:     sigstore-js (@sigstore/sign, @sigstore/bundle, @sigstore/cli)
What:     Keyless code signing using OIDC identity (GitHub, Google)
          Same tech npm uses for package provenance
How:
  On publish (spm publish):
    1. Author authenticates via GitHub OAuth (already have this)
    2. sigstore-js gets ephemeral signing key from Fulcio CA
    3. Signs the .skl package hash
    4. Records signature on Rekor transparency log
    5. Stores Sigstore bundle alongside .skl in R2

  On install (spm install):
    1. Download .skl + sigstore bundle
    2. sigstore-js verifies signature against Rekor
    3. Confirms package was published by claimed author

License:  Apache 2.0
Cost:     FREE (Sigstore public infrastructure is free for all)
NPM pkg:  @sigstore/sign, @sigstore/verify

Why this is huge:
  - We get the SAME signing infrastructure npm uses
  - No PKI to manage, no key distribution problem
  - Works with GitHub Actions for CI/CD publish
  - Transparent — anyone can audit the Rekor log

Savings: Months of crypto engineering. Package signing was going
         to be Phase 3. With sigstore-js, it can be Phase 1.
```

### 4. SEMVER + DEPENDENCY RESOLUTION — Don't Build

```
Tool:     semver (npm package, 50M+ weekly downloads)
What:     Full semver parsing, comparison, range matching
How:      semver.satisfies('1.2.3', '^1.0.0') → true
Cost:     FREE

Also:
  node-semver handles: ranges, pre-releases, build metadata
  Already used by npm, yarn, pnpm internally

Savings: Don't write version resolution logic. Just import semver.
```

### 5. NAME SIMILARITY (Anti-squatting) — Don't Build

```
Tool:     string-similarity (npm) or fastest-levenshtein (npm)
What:     String similarity scoring for name squatting detection
How:      Compare new skill name against existing names
          "react-paterns" vs "react-patterns" → 0.93 similarity → block
Cost:     FREE

Also useful:
  confusables (npm) — detects Unicode homoglyph attacks
  Example: "ℝeact-patterns" using ℝ instead of R → detected

Savings: Don't implement Levenshtein distance or homoglyph tables.
```

### 6. ZIP HANDLING — Don't Build

```
Tool:     archiver (for creating .skl ZIP files)
          yauzl (for extracting/reading .skl files)
What:     Proven ZIP libraries used by thousands of packages
Cost:     FREE

Savings: Trivial, but no reason to build custom archive handling.
```

### 7. CLI FRAMEWORK — Don't Build

```
Tool:     oclif (Salesforce/Heroku) or Commander.js

oclif advantages:
  - Plugin system (useful if SPM has extension plugins)
  - Auto-generated help
  - Built-in testing utilities
  - Used by Heroku CLI, Salesforce CLI

Commander.js advantages:
  - Simpler, lighter
  - More flexibility
  - Used by more projects

Recommendation: Commander.js for Phase 1 (lighter),
                consider oclif if plugin system needed later.
```

### 8. SEARCH — Don't Build (Phase 1)

```
Phase 1: Postgres full-text search
  Tool:     Built-in pg_trgm + tsvector in Neon Postgres
  What:     Good enough for <10k skills
  How:      CREATE INDEX ON skills USING GIN (to_tsvector('english', description));
  Cost:     FREE (part of Neon)

Phase 2 (if needed):
  Tool:     Meilisearch or Typesense
  What:     Typo-tolerant, instant search
  Cost:     Meilisearch Cloud free tier or self-hosted

Savings: Don't build search infrastructure. Postgres handles it.
```

---

## What SPM Actually Needs to BUILD

After borrowing everything above, here's what's left — the actual unique value:

```
MUST BUILD (unique to SPM):

1. Registry API
   - Hono routes for publish/install/search
   - But it's standard CRUD, not complex
   - Drizzle ORM + Neon, straightforward

2. Trigger Analytics Pipeline  ← THE MOAT
   - Event ingestion endpoint
   - Daily aggregation job
   - Author dashboard queries
   - Nobody else has this

3. npm Bridge
   - Fetch packages with "agent-skill" keyword from npm
   - Extract SKILL.md, generate manifest
   - Run through security pipeline
   - Re-publish to SPM registry

4. Trust Tiers Engine
   - Score calculation based on: email verified, GitHub linked,
     age, published count, security record
   - Promotion/demotion logic
   - Display on search results

5. MCP Discovery Integration
   - MCP server that agents can query
   - "Find me a skill for CSV analysis" → returns results
   - Agent can suggest: "Want me to install it?"

6. Reviews System
   - Basic CRUD (create/read/update reviews)
   - Rating aggregation (Bayesian average)
   - Anomaly detection (rate limits, IP checks)
   - Simple — standard web app stuff

7. Manifest Validation
   - Zod schema for manifest.json
   - But shared between CLI and API (spm-shared)

8. Pattern List for Layer 1 Security
   - Regex patterns for known injection phrases
   - Maintained as a JSON file, updateable
   - CLI fetches latest patterns on publish
```

---

## Revised Architecture Diagram

```
┌──────────────────────────────────────────────────┐
│                   spm CLI                         │
│  (Commander.js, TypeScript, ships via npm)        │
├──────────────────────────────────────────────────┤
│  spm-shared (Zod schemas, regex scanner, semver,  │
│              name validation, archive handling)    │
└───────┬──────────────────────────────┬───────────┘
        │                              │
        ▼                              ▼
┌───────────────┐             ┌────────────────────┐
│  spm Registry │             │  Vercel skills CLI  │
│  (Hono API)   │             │  (agent linking)    │
│               │             │  37+ agents         │
│  ┌──────────┐ │             └────────────────────┘
│  │  Neon DB │ │
│  └──────────┘ │
│  ┌──────────┐ │      ┌─────────────────────────┐
│  │  R2 Store│ │      │  Security Pipeline       │
│  └──────────┘ │      │                          │
│  ┌──────────┐ │      │  L1: Regex patterns     │
│  │ BullMQ   │ │      │  L2: ProtectAI DeBERTa  │
│  └──────────┘ │      │  L3: Lakera Guard API   │
│  ┌──────────┐ │      └─────────────────────────┘
│  │ Sigstore │ │
│  │ signing  │ │      ┌─────────────────────────┐
│  └──────────┘ │      │  Analytics Pipeline      │
└───────────────┘      │  (THE MOAT — built custom)│
                       │  Trigger analytics        │
                       │  Install tracking          │
                       │  Search impressions        │
                       └─────────────────────────┘
```

---

## Impact on Timeline

```
ORIGINAL ESTIMATE:
  Phase 1 MVP: 2 months

REVISED ESTIMATE (with borrowed tools):
  Phase 1 MVP: 3-4 weeks

What changed:
  - Agent linking: 0 weeks (was 3-4 weeks)     → use Vercel skills CLI
  - Security scanning: 1 week (was 3-4 weeks)  → regex + ProtectAI model
  - Package signing: 0.5 weeks (was Phase 3)   → sigstore-js
  - Name similarity: 0 weeks (was 1 week)      → npm packages
  - Search: 0 weeks (was 1 week)               → Postgres built-in

What still takes time:
  - Registry API: 1-2 weeks (standard CRUD + publish flow)
  - CLI commands: 1 week (init, publish, install, search, validate)
  - Analytics pipeline: 1 week (event ingestion + aggregation)
  - npm bridge: 0.5 weeks (fetch + parse + re-publish)
  - Trust tiers: 0.5 weeks (scoring logic)
  - Integration + testing: 1 week

TOTAL: ~4-5 weeks to a working MVP with:
  ✓ Registry with publish/install/search
  ✓ Content security scanning (3 layers!)
  ✓ Package signing (sigstore!)
  ✓ Agent linking to 37+ platforms
  ✓ Analytics pipeline
  ✓ npm bridge (seed with 90+ existing skills)
  ✓ Trust tiers
  ✓ Name squatting prevention
```

---

## Complete Dependency Map

```
npm packages SPM will use:

CLI:
  commander           CLI framework
  chalk               Terminal colors
  ora                 Spinners
  inquirer            Interactive prompts
  undici              HTTP client (built into Node 18+)
  archiver            Create ZIP files
  yauzl               Read ZIP files
  semver              Version parsing/comparison

API:
  hono                Web framework
  drizzle-orm         Type-safe ORM
  @neondatabase/serverless  Postgres driver
  zod                 Schema validation
  bullmq              Job queue
  @aws-sdk/client-s3  R2 storage

Security:
  @sigstore/sign      Package signing
  @sigstore/verify    Package verification
  string-similarity   Name squatting detection
  confusables         Unicode homoglyph detection

External APIs:
  Lakera Guard        Prompt injection detection (Phase 2)
  GitHub OAuth        Authentication
  Sigstore/Fulcio     Certificate authority
  Sigstore/Rekor      Transparency log

ML Models (self-hosted, Phase 1):
  ProtectAI/deberta-v3-base-prompt-injection-v2
    → Run via ONNX runtime or Hugging Face Inference API
    → Classifies SKILL.md content as injection/safe

External CLIs (called by SPM):
  npx skills add      Agent linking (Vercel skills CLI)
```

---

## Decision Summary

```
BORROW (don't build):
  ✓ Agent linking           → Vercel skills CLI
  ✓ Prompt injection ML     → ProtectAI DeBERTa model
  ✓ Prompt injection API    → Lakera Guard (Phase 2)
  ✓ Package signing         → sigstore-js
  ✓ Semver resolution       → npm semver
  ✓ Name similarity         → string-similarity + confusables
  ✓ ZIP handling            → archiver + yauzl
  ✓ CLI framework           → Commander.js
  ✓ Search                  → Postgres full-text (Phase 1)
  ✓ Schema validation       → Zod
  ✓ Job queue               → BullMQ
  ✓ Storage                 → R2
  ✓ Database                → Neon
  ✓ Auth                    → GitHub OAuth + Lucia
  ✓ 2FA                     → otpauth

BUILD (unique value):
  → Registry API (Hono routes, standard CRUD)
  → Analytics pipeline (trigger analytics = moat)
  → npm bridge (import existing skills)
  → Trust tiers engine (scoring logic)
  → MCP discovery (agent-native search)
  → Reviews system (basic CRUD)
  → Regex pattern scanner (JSON pattern list)
  → Manifest validation (Zod schemas)
```
