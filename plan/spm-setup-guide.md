# SPM — Accounts & Infrastructure Setup

Everything you need to create and configure before writing code.

---

## 1. Cloudflare

**What it runs:** API (Workers), package storage (R2), rate limiting (KV), web UI (Pages), caching (Cache API)

**Setup:**

1. Create account at https://cloudflare.com (free)
2. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. Create R2 bucket:
   ```bash
   wrangler r2 bucket create spm-packages
   ```
4. Create KV namespace (rate limiting):
   ```bash
   wrangler kv namespace create RATE_LIMIT
   ```
   Copy the returned `id` into `wrangler.toml`.
5. Set secrets:
   ```bash
   wrangler secret put DATABASE_URL
   wrangler secret put JWT_SECRET
   wrangler secret put RESEND_API_KEY
   ```

**wrangler.toml (packages/api/):**

```toml
name = "spm-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "PACKAGES"
bucket_name = "spm-packages"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "<your-kv-namespace-id>"

[vars]
ENVIRONMENT = "production"
```

**Deployment:**

```bash
cd packages/api
wrangler deploy          # deploys to spm-api.<your-subdomain>.workers.dev
```

**Custom domain (optional):**

If you own `spm.dev` or similar, add a custom route in the Cloudflare dashboard under Workers → Routes, or in `wrangler.toml`:

```toml
routes = [
  { pattern = "api.spm.dev/*", zone_name = "spm.dev" }
]
```

**Pages (web UI):**

1. In Cloudflare dashboard → Pages → Create project
2. Connect your GitHub repo
3. Set build settings:
   - Build command: `cd packages/web && pnpm build`
   - Output directory: `packages/web/dist`
4. Auto-deploys on push to `main`

**Admin panel (separate deploy):**

Same as above but pointing to `packages/admin/` with its own Pages project.

**Pricing (free tier):**

| Service | Free Tier | Paid |
|---------|-----------|------|
| Workers | 100K requests/day | $5/mo for 10M requests/mo |
| R2 | 10GB storage, 10M reads/mo | $0.015/GB storage, $0.36/M reads |
| KV | 100K reads/day, 1K writes/day | $5/mo for 10M reads/mo |
| Pages | Unlimited sites, 500 builds/mo | — |

Free tier is sufficient for development and early launch.

---

## 2. Neon (Postgres)

**What it runs:** All persistent data — skills, users, reviews, analytics, scan results.

**Setup:**

1. Create account at https://neon.tech (free)
2. Create a new project (name: `spm`)
3. Copy the connection string from the dashboard:
   ```
   postgresql://user:pass@ep-xxxxx.us-east-2.aws.neon.tech/spmdb?sslmode=require
   ```
4. Set it as a Cloudflare Worker secret:
   ```bash
   wrangler secret put DATABASE_URL
   # paste the connection string
   ```

**Database driver:**

Neon provides a serverless HTTP driver (`@neondatabase/serverless`) that works in Cloudflare Workers. Regular `pg` uses TCP sockets which Workers don't support.

```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

const sql = neon(env.DATABASE_URL)
const db = drizzle(sql)
```

**Running migrations:**

```bash
# From your local machine (uses TCP, not from Workers)
cd packages/api
pnpm db:migrate   # runs migrations/*.sql against Neon
```

**Branching (for development):**

Neon supports database branches — like git branches for your database. Use them for testing:

```bash
neonctl branches create --name dev
# gives you a separate connection string for the dev branch
```

**Pricing (free tier):**

| Feature | Free |
|---------|------|
| Storage | 0.5 GB |
| Compute | 190 hours/mo (auto-suspends on idle) |
| Branches | 10 |

More than enough for development. Scale plan is $19/mo when you need it.

---

## 3. Resend (Email)

**What it runs:** Transactional emails — email verification, publish notifications, security alerts.

**Setup:**

1. Create account at https://resend.com (free)
2. Add and verify your domain (e.g., `spm.dev`):
   - Add the DNS records Resend provides (SPF, DKIM, DMARC)
   - Wait for verification (usually < 5 minutes)
3. Create an API key in the dashboard
4. Set it as a Cloudflare Worker secret:
   ```bash
   wrangler secret put RESEND_API_KEY
   ```

**Usage in code:**

```typescript
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'SPM <noreply@spm.dev>',
    to: user.email,
    subject: 'Verify your SPM account',
    html: verificationEmailHtml,
  }),
})
```

**Pricing (free tier):**

| Feature | Free |
|---------|------|
| Emails | 100/day, 3,000/mo |
| Domains | 1 |

Sufficient for launch. Pro is $20/mo for 50K emails/mo.

---

## 4. Sigstore (Signing)

**What it runs:** Keyless signing of `.skl` packages so users can verify who published a skill.

**No account needed.** Sigstore is public infrastructure (like Let's Encrypt for code signing). The signing libraries handle everything:

```bash
npm install @sigstore/sign @sigstore/verify
```

- In CI (GitHub Actions): uses GitHub OIDC token automatically
- Locally: opens a browser for OAuth (GitHub/Google) to prove identity
- Signatures are logged to the public Rekor transparency log

Nothing to configure.

---

## 5. GitHub (Code + CI)

**What it runs:** Source code, CI/CD via GitHub Actions, OIDC for Sigstore.

**Setup:**

1. Create repo (e.g., `spm-dev/spm`)
2. Add repository secrets (Settings → Secrets → Actions):
   - `CLOUDFLARE_API_TOKEN` — from Cloudflare dashboard (API Tokens → Create Token → Edit Workers)
   - `SPM_TOKEN` — for CI publish workflows (generated after auth system is built)
3. Enable OIDC for Sigstore:
   - No config needed — GitHub Actions provides OIDC tokens natively
   - Just declare `permissions: id-token: write` in workflow files

---

## Quick Checklist

```
[ ] Cloudflare account created
[ ] Wrangler CLI installed and logged in
[ ] R2 bucket created (spm-packages)
[ ] KV namespace created (RATE_LIMIT)
[ ] Neon account created
[ ] Neon project created (spm), connection string copied
[ ] Resend account created
[ ] Resend domain verified, API key copied
[ ] GitHub repo created
[ ] Cloudflare secrets set:
    [ ] DATABASE_URL
    [ ] JWT_SECRET
    [ ] RESEND_API_KEY
[ ] GitHub secrets set:
    [ ] CLOUDFLARE_API_TOKEN
```

Once all boxes are checked, you're ready for Phase 1.

---

## Local Development

For local development, create a `.dev.vars` file in `packages/api/`. This is Wrangler's equivalent of `.env` — it loads automatically during `wrangler dev`:

**packages/api/.dev.vars:**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spm
JWT_SECRET=local-dev-secret-change-in-production
RESEND_API_KEY=re_test_xxxxx
ENVIRONMENT=development
```

**Root .env (for tooling like migrations, tests):**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spm
```

**Important:** `.dev.vars` and `.env` are both in `.gitignore` — never commit secrets.

**.gitignore entries:**

```
.env
.env.*
.dev.vars
```

**Example files for onboarding:**

Create `.dev.vars.example` and `.env.example` with placeholder values so new contributors know what's needed:

**packages/api/.dev.vars.example:**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spm
JWT_SECRET=change-me
RESEND_API_KEY=re_test_xxxxx
ENVIRONMENT=development
```

**How variables are loaded per environment:**

| Environment | Source | How |
|-------------|--------|-----|
| Local dev | `packages/api/.dev.vars` | Auto-loaded by `wrangler dev` |
| Local scripts | Root `.env` | Loaded by dotenv or turbo |
| CI (GitHub Actions) | Repository secrets | Injected as `env:` in workflow |
| Production | Cloudflare secrets | Set via `wrangler secret put` |

You never need a `.env` in production. Cloudflare encrypts secrets and injects them into the Worker at runtime via the `env` parameter:

```typescript
export default {
  async fetch(request: Request, env: Env) {
    // env.DATABASE_URL, env.JWT_SECRET, etc.
    // injected by Cloudflare, not read from a file
  }
}
```

Wrangler's local dev mode does the same thing but reads from `.dev.vars` instead.

```bash
cd packages/api
wrangler dev    # runs Workers locally with miniflare, loads .dev.vars
```

This emulates R2, KV, and Workers locally. For the database, either:
- Use a local Postgres (`docker run -p 5432:5432 postgres`)
- Use a Neon dev branch (free)

You can build and test the entire Phase 1 (monorepo, shared schemas, database migrations) before creating any cloud accounts. Cloud accounts become necessary when you're ready to deploy Phase 2+.
