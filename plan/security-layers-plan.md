# Security Layers 2 & 3 Implementation Plan

## Goal

Add DeBERTa ML classification (Layer 2) and Lakera Guard API (Layer 3) to the security pipeline. Introduce `--no-security` publish flag and surface security status clearly across CLI, web, and admin.

---

## Current State

- **Layer 1 (Static Analysis):** Live. 25 regex patterns in `packages/api/src/security/patterns.ts`, runs synchronously during publish in `scanner.ts`.
- **Scanner orchestrator:** `packages/api/src/services/scanner.ts` has a pluggable `ScanLayer[]` array — currently only Layer 1. Adding layers = pushing to this array.
- **DB:** `scans` table already exists with `layer`, `status`, `confidence`, `details` columns. `publish_attempts` tracks blocked publishes.
- **API response:** `GET /skills/:name` returns `security.scan_status` and `security.scan_layers[]` but these are read from the manifest JSONB, not from the `scans` table.
- **Web UI:** `SecurityTab.tsx` shows hardcoded "Layer 2: not yet available" when no real layer data exists.
- **Admin UI:** Security sub-tab in `SkillDetailPane.tsx` shows same hardcoded 3 layers.

---

## Architecture Decisions

### DeBERTa (Layer 2) — Hugging Face Inference API

- Model: `ProtectAI/deberta-v3-base-prompt-injection-v2`
- Host: **Hugging Face free Inference API** (no ONNX needed, no infrastructure)
- Endpoint: `https://api-inference.huggingface.co/models/ProtectAI/deberta-v3-base-prompt-injection-v2`
- Auth: `HF_API_TOKEN` (free account, free inference for public models)
- Cost: **$0/month** — public models get free inference
- Latency: ~1-3s per request (cold start up to 20s if model is sleeping, retryable)
- Input: Each text file from the .skl package (SKILL.md, README, etc.)
- Output: `[{ label: "INJECTION" | "SAFE", score: 0.0-1.0 }]`

### Lakera Guard (Layer 3)

- Endpoint: `https://api.lakera.ai/v2/guard`
- Auth: `LAKERA_API_KEY` (free tier)
- Cost: **$0/month** — free tier: 10,000 requests/month
- Latency: ~200-500ms per request
- Input: Concatenated skill content
- Output: `{ flagged: boolean, categories: {...}, payload_type: "..." }`

### `--no-security` Flag

- On `spm publish --no-security`: skip CLI-side preflight scan, send header `X-Skip-Security: true`
- Server **still runs Layer 1** (always, non-negotiable — catches known malicious patterns)
- Server skips Layer 2 + Layer 3 when flag is present
- Result: skill is published with `scan_status: "partial"` (only L1)
- UI displays: "Partial scan — Layers 2 & 3 skipped by publisher"

### Security Tier System

Skills get a computed security level based on scan results:

| Level       | Criteria                            | Badge         |
| ----------- | ----------------------------------- | ------------- |
| `full`      | All 3 layers passed                 | Green shield  |
| `partial`   | Only Layer 1 (--no-security)        | Yellow shield |
| `flagged`   | Any layer flagged (held for review) | Orange shield |
| `blocked`   | Any layer blocked (rejected)        | Red shield    |
| `unscanned` | Legacy / pre-security skills        | Gray shield   |

---

## DB Changes

### Migration: `006_scan_enhancements.sql`

```sql
-- Add scan_status column to skills table for fast filtering
ALTER TABLE skills ADD COLUMN scan_security_level TEXT NOT NULL DEFAULT 'unscanned';

-- Add index for security filtering
CREATE INDEX idx_skills_security_level ON skills(scan_security_level);
```

The existing `scans` table already supports multi-layer scans (has `layer`, `status`, `confidence`, `details` columns). No schema change needed for scan rows.

### Drizzle schema update

- Add `scanSecurityLevel` to `skills` table in `schema.ts`

---

## Implementation Tasks

### Track 1: API (packages/api) — Core Pipeline

**T1.1: Layer 2 service — DeBERTa via HuggingFace**

- File: `packages/api/src/security/layer2.ts`
- Call HF Inference API with each text file
- Parse response: `INJECTION` with score > threshold = finding
- Threshold: score >= 0.95 → `block`, score 0.7-0.95 → `warn`
- Handle model sleeping (HTTP 503) with 1 retry after 5s
- Env var: `HF_API_TOKEN` in wrangler.toml secrets

**T1.2: Layer 3 service — Lakera Guard**

- File: `packages/api/src/security/layer3.ts`
- Concatenate all text files, send to Lakera `/v2/guard`
- Map `flagged: true` to a finding with category from response
- Threshold: `flagged` → `warn` (hold for review, don't auto-block)
- Env var: `LAKERA_API_KEY` in wrangler.toml secrets

**T1.3: Update scanner orchestrator**

- File: `packages/api/src/services/scanner.ts`
- Add layer2 and layer3 to the `layers[]` array
- Accept `skipAdvanced?: boolean` parameter to skip L2/L3
- New decision logic:
  - L1 block → REJECT (unchanged)
  - L2 score >= 0.95 → REJECT
  - L2 score 0.7-0.95 → FLAG for review (publish but hold)
  - L3 flagged → FLAG for review
  - All pass → ACCEPT
- If L2/L3 services are unreachable, degrade gracefully (log warning, proceed with L1 only)
- Return per-layer results with name, status, confidence, detail

**T1.4: Update publish route**

- File: `packages/api/src/routes/skills.ts`
- Read `X-Skip-Security` header → pass `skipAdvanced` to pipeline
- After scan: write rows to `scans` table (one row per layer)
- Compute `scan_security_level` and write to `skills` table
- Include scan layer results in the version manifest JSONB
- New outcomes: `passed` (all clear), `flagged` (held), `blocked` (rejected), `partial` (skipped)

**T1.5: Update GET /skills/:name response**

- Read `scan_security_level` from skills table
- Read layer details from `scans` table (join on latest version)
- Return structured `security.scan_layers[]` with real data:
  ```json
  {
    "scan_status": "passed",
    "scan_security_level": "full",
    "scan_layers": [
      { "layer": 1, "name": "Static Analysis", "status": "passed", "confidence": null },
      { "layer": 2, "name": "ML Classification", "status": "passed", "confidence": 0.02 },
      { "layer": 3, "name": "Lakera Guard", "status": "passed", "confidence": null }
    ]
  }
  ```

**T1.6: Add security filter to search/list**

- File: `packages/api/src/routes/skills.ts`
- Accept `?security=full|partial|any` query param on `GET /skills`
- Default: `any` (no filter)
- `full`: only skills with all 3 layers passed
- `partial`: only L1 scanned

**T1.7: Migration + Drizzle schema**

- Create `migrations/006_scan_enhancements.sql`
- Update `packages/api/src/db/schema.ts`

**T1.8: Tests**

- Unit tests for layer2.ts and layer3.ts (mock HTTP calls)
- Integration test for pipeline with all 3 layers
- Test `--no-security` header skipping L2/L3
- Test graceful degradation when L2/L3 unavailable
- Test security level computation

### Track 2: CLI (packages/cli)

**T2.1: Add `--no-security` flag to publish**

- File: `packages/cli/src/commands/publish.ts`
- Add `--no-security` option
- When set: send `X-Skip-Security: true` header via API client
- Show warning: "Publishing without full security scan — skill will show partial security status"
- JSON output: include `security_level: "partial"`

**T2.2: Update API client**

- File: `packages/cli/src/lib/api-client.ts`
- Add `skipSecurity?: boolean` param to `publishSkill()`
- Set `X-Skip-Security: true` header when enabled

**T2.3: Show security level in `spm info`**

- File: `packages/cli/src/commands/info.ts` (or wherever info renders)
- Display security badge: "Security: Full (3/3 layers)" or "Partial (1/3)"
- Color: green for full, yellow for partial, red for flagged

**T2.4: Add `--security=full` filter to `spm search`**

- File: `packages/cli/src/commands/search.ts`
- Add `--security` option: `full`, `partial`, `any`
- Pass to API as query param

**T2.5: Tests**

- Test `--no-security` flag sends header
- Test info displays security level
- Test search with security filter

### Track 3: Web (packages/web)

**T3.1: Update SecurityTab with real layer data**

- File: `packages/web/src/pages/skill-detail/SecurityTab.tsx`
- Remove hardcoded layer list
- Render real `scan_layers[]` from API with status, confidence
- Each layer shows: green check (passed), yellow warning (flagged), red X (blocked), gray (skipped)
- Show security level badge prominently

**T3.2: Add SecurityBadge component**

- File: `packages/ui/src/components/SecurityBadge.tsx` (shared ui package)
- Shield icon with color based on level: green/yellow/orange/red/gray
- Label: "Full scan", "Partial", "Flagged", "Unscanned"
- Used in skill cards, search results, detail page

**T3.3: Add security filter to Search page**

- File: `packages/web/src/pages/Search.tsx` (or search/)
- Add "Security" filter in sidebar: Full scan / Partial / Any
- Pass `security` param to API

**T3.4: Show SecurityBadge in skill cards/rows**

- Files: `SkillCard.tsx`, `SkillRow.tsx`
- Show small security badge next to trust badge
- Tooltip: "All 3 security layers passed" etc.

**T3.5: Update types**

- File: `packages/web/src/pages/skill-detail/types.ts`
- Update `SkillFull.security` to include `level` and structured layer data
- Update `apiToSkillFull` mapper

**T3.6: Tests**

- Test SecurityTab renders real layer data
- Test SecurityBadge variants
- Test search with security filter

### Track 4: Admin (packages/admin)

**T4.1: Update Security sub-tab**

- File: `packages/admin/src/components/SkillDetailPane.tsx`
- Show real layer data from API response
- Each layer: status, confidence score, detail text
- For flagged skills: show "Approve" / "Block" buttons

**T4.2: Update scan analytics**

- File: `packages/admin/src/components/ScanAnalytics.tsx`
- Add per-layer stats: L1 pass rate, L2 flag rate, L3 flag rate
- Show "Partial scans" count (--no-security publishes)

**T4.3: Tests**

- Test security tab shows real layer data

---

## Parallel Execution Plan

```
Track 1 (API)          Track 2 (CLI)        Track 3 (Web)        Track 4 (Admin)
─────────────          ─────────────        ─────────────        ──────────────
T1.7 Migration         (wait for T1.3)      T3.2 SecurityBadge   (wait for T1.5)
T1.1 Layer 2 svc       T2.1 --no-security   T3.5 Update types
T1.2 Layer 3 svc       T2.2 API client      (wait for T1.5)
T1.3 Orchestrator      T2.3 Info display    T3.1 SecurityTab
T1.4 Publish route     T2.4 Search filter   T3.3 Search filter
T1.5 GET response      T2.5 Tests           T3.4 Skill cards
T1.6 Search filter                          T3.6 Tests
T1.8 Tests                                                       T4.1 Security tab
                                                                  T4.2 Scan analytics
                                                                  T4.3 Tests
```

**Dependencies:**

- Track 2 (CLI) depends on T1.3 (orchestrator interface) for header contract
- Track 3 (Web) T3.1/T3.3 depend on T1.5 (API response shape)
- Track 4 (Admin) depends on T1.5 (API response shape)
- Track 3 T3.2 (SecurityBadge) and T3.5 (types) can start immediately
- Track 1 tasks T1.1 and T1.2 are independent of each other (parallel)

**Recommended team split:**

- **API agent:** T1.1 → T1.2 → T1.3 → T1.4 → T1.5 → T1.6 → T1.7 → T1.8
- **CLI agent:** T2.1 → T2.2 → T2.3 → T2.4 → T2.5
- **Web agent:** T3.2 → T3.5 → T3.1 → T3.3 → T3.4 → T3.6
- **Admin agent:** T4.1 → T4.2 → T4.3

---

## Environment Variables Needed

| Variable         | Where                    | Source                                        |
| ---------------- | ------------------------ | --------------------------------------------- |
| `HF_API_TOKEN`   | Cloudflare Worker secret | https://huggingface.co/settings/tokens (free) |
| `LAKERA_API_KEY` | Cloudflare Worker secret | https://platform.lakera.ai (free tier)        |

Both need to be added to `wrangler.toml` bindings and `.dev.vars` for local dev.

### How to get a HuggingFace API token

1. Go to https://huggingface.co/join and create a free account
2. Go to https://huggingface.co/settings/tokens
3. Click **"Create new token"**
4. Name: `spm-security` (or anything)
5. Type: **Read** (that's all we need — inference on public models)
6. Click **"Create token"** and copy the value (starts with `hf_...`)
7. Add to Cloudflare:
   ```
   npx wrangler secret put HF_API_TOKEN
   # paste the hf_... token when prompted
   ```
8. Add to `.dev.vars` for local dev:
   ```
   HF_API_TOKEN=hf_your_token_here
   ```

### How to get a Lakera Guard API key

1. Go to https://platform.lakera.ai and click **"Sign Up"** (free, no credit card)
2. After signing in, go to the **API Keys** section in the dashboard
3. Click **"Create API Key"**
4. Name: `spm-security` (or anything)
5. Copy the key value
6. Add to Cloudflare:
   ```
   npx wrangler secret put LAKERA_API_KEY
   # paste the key when prompted
   ```
7. Add to `.dev.vars` for local dev:
   ```
   LAKERA_API_KEY=your_lakera_key_here
   ```

### Free tier limits

- **HuggingFace:** Unlimited inference on public models. Rate limit ~30 req/min. Models may "sleep" after inactivity (cold start ~20s, we retry).
- **Lakera Guard:** 10,000 requests/month on free tier. At ~100 publishes/day that's ~3,000/month — well within limits.

---

## Graceful Degradation

- If HuggingFace is down or model is sleeping → publish proceeds with L1 only, `scan_security_level = "partial"`, log warning
- If Lakera is down or rate-limited → same, skip L3
- If both are down → L1 only, always runs (local, no external dependency)
- `--no-security` → L1 only, explicit user choice

---

## Risk & Mitigations

| Risk                                  | Mitigation                                                                |
| ------------------------------------- | ------------------------------------------------------------------------- |
| HF model cold start (20s)             | Retry once after 5s, degrade if still sleeping                            |
| Lakera 10k/month limit                | Monitor usage, alert at 80%, degrade if exhausted                         |
| False positives blocking legit skills | L2/L3 only flag (hold for review), never auto-block. Only L1 auto-blocks. |
| Latency added to publish              | L2 + L3 run in parallel (Promise.all), total ~2-3s added                  |
| API keys leaked                       | Stored as Cloudflare secrets, never in code/env files                     |
