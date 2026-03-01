# Publisher Identity Verification

## You Don't Get to Publish Until We Know Who You Are

---

## 1. The Problem

Without identity verification:

- Anyone creates `almog@throwaway.com`, publishes a malicious skill
- Fake accounts squat popular names
- No accountability when something goes wrong
- Users can't trust that "verified author" means anything

SPM needs verification **before** the first publish, not after.

---

## 2. Verification Tiers

```
┌─────────────────────────────────────────────────────────────┐
│                   Publisher Trust Ladder                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Tier 0: Anonymous                                  │    │
│  │  Can: browse, search, install, review               │    │
│  │  Cannot: publish                                    │    │
│  │  Requirements: none                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                  │
│                     spm register                            │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Tier 1: Registered                                 │    │
│  │  Can: publish (with pending scan)                   │    │
│  │  Badge: none                                        │    │
│  │  Requirements:                                      │    │
│  │    ✓ GitHub OAuth (primary) or Email + verification │    │
│  │    ✓ Agree to Publisher Terms                       │    │
│  │    ✓ Account age > 24 hours before first publish    │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                  │
│               verify identity + track record                │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Tier 2: Verified Author                            │    │
│  │  Can: publish (fast-tracked scan)                   │    │
│  │  Badge: ✓ Verified                                  │    │
│  │  Requirements:                                      │    │
│  │    ✓ GitHub account linked (not just OAuth)         │    │
│  │    ✓ GitHub account age > 6 months                  │    │
│  │    ✓ At least 1 published skill with clean scans    │    │
│  │    ✓ No security violations                         │    │
│  │    OR manual review by SPM team                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                  │
│                  sustained trust + review                    │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Tier 3: Trusted Publisher                          │    │
│  │  Can: publish (auto-approved, no scan wait)         │    │
│  │  Badge: ★ Trusted Publisher                         │    │
│  │  Requirements:                                      │    │
│  │    ✓ 5+ skills published, all clean                 │    │
│  │    ✓ Account age > 6 months                         │    │
│  │    ✓ Consistent publishing history                  │    │
│  │    ✓ Community standing (positive reviews)          │    │
│  │    ✓ Signed all packages                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                  │
│                  SPM team invitation                         │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Tier 4: Official                                   │    │
│  │  Can: publish under @official scope                 │    │
│  │  Badge: 🏅 Official                                 │    │
│  │  Requirements:                                      │    │
│  │    ✓ Invited by SPM team or Anthropic               │    │
│  │    ✓ Organization identity verified                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Registration Flow

### 3.1 GitHub OAuth (Primary Path)

This is the recommended and fastest path. GitHub is the source of truth because it has established identity, history, and reputation.

```bash
$ spm register

  ? How do you want to register?
    ❯ GitHub (recommended — fastest path to publishing)
      Email (requires additional verification)

  Opening browser for GitHub authentication...
```

```
┌──────────────────────────────────────────────────────────┐
│                   Browser Flow                            │
│                                                          │
│  1. Redirect to GitHub OAuth                             │
│     https://github.com/login/oauth/authorize?            │
│       client_id=spm_abc123&                              │
│       scope=read:user,user:email&                        │
│       redirect_uri=https://registry.spm.dev/auth/cb      │
│                                                          │
│  2. User authorizes SPM                                  │
│                                                          │
│  3. GitHub redirects back with auth code                  │
│                                                          │
│  4. SPM backend exchanges code for token, fetches:       │
│     - GitHub username                                    │
│     - Email (verified)                                   │
│     - Account creation date                              │
│     - Public repos count                                 │
│     - Profile info                                       │
│                                                          │
│  5. SPM creates publisher account                        │
│     - Links GitHub identity                              │
│     - Stores GitHub account age                          │
│     - Sets initial trust tier                            │
└──────────────────────────────────────────────────────────┘
```

```bash
# Back in terminal after browser flow:

  ✓ Authenticated via GitHub

  GitHub profile:
    Username:   almog
    Email:      almog@example.com (verified ✓)
    Account age: 8 years
    Public repos: 47

  Creating SPM publisher account...
  ✓ Account created: @almog
  ✓ Trust tier: Registered (Tier 1)
  ✓ Credentials saved to ~/.spm/credentials.json

  📋 Before you can publish, you need to:
     ✓ GitHub linked (done)
     □ Accept Publisher Terms: spm terms accept
     □ Wait 24 hours (anti-spam cooldown)

  After that: spm publish
```

### 3.2 Email Registration (Alternative Path)

For users without GitHub or who prefer email:

```bash
$ spm register

  ? How do you want to register?
      GitHub (recommended)
    ❯ Email (requires additional verification)

  ? Email address: almog@example.com
  ? Username (public, kebab-case): almog
  ? Display name: Almog

  Sending verification email to almog@example.com...
  ✓ Check your inbox for a verification link

# User clicks the link in email

  ✓ Email verified
  ✓ Account created: @almog
  ✓ Trust tier: Registered (Tier 1)

  📋 Before you can publish:
     ✓ Email verified (done)
     □ Accept Publisher Terms: spm terms accept
     □ Wait 24 hours (anti-spam cooldown)
     ⚠ Email-only accounts have stricter publish limits.
       Link GitHub for faster verification: spm profile link-github
```

### 3.3 Email-Only Restrictions

Email-only accounts face additional friction to prevent abuse:

```
GitHub-linked account:          Email-only account:
─────────────────────           ─────────────────────
24h cooldown                    72h cooldown
5 skills/day publish limit      1 skill/day publish limit
Auto-scan (async)               Scan must PASS before visible
Can reach Tier 2 organically    Must link GitHub for Tier 2
Package signing optional        Package signing required
```

---

## 4. Publisher Terms Agreement

Required before first publish, regardless of registration method.

```bash
$ spm terms accept

  ┌──────────────────────────────────────────────────┐
  │          SPM Publisher Terms (Summary)            │
  │                                                  │
  │  By publishing to the SPM registry, you agree:   │
  │                                                  │
  │  1. IDENTITY: Your publisher identity is          │
  │     accurate and you are who you claim to be      │
  │                                                  │
  │  2. CONTENT: Skills you publish:                  │
  │     - Are your original work or properly licensed │
  │     - Do not contain malware or malicious code    │
  │     - Do not contain prompt injection attacks     │
  │     - Do not attempt to exfiltrate user data      │
  │     - Do not violate applicable laws              │
  │                                                  │
  │  3. SECURITY: You will:                           │
  │     - Accurately declare permissions in manifest  │
  │     - Respond to security reports within 72h      │
  │     - Yank compromised versions promptly          │
  │                                                  │
  │  4. ACCOUNTABILITY: SPM may:                      │
  │     - Scan your packages automatically            │
  │     - Suspend accounts that violate these terms   │
  │     - Remove skills that fail security review     │
  │                                                  │
  │  Full terms: https://spm.dev/publisher-terms      │
  └──────────────────────────────────────────────────┘

  ? I accept the Publisher Terms (type "accept"): accept

  ✓ Terms accepted (recorded at 2026-02-27T10:00:00Z)
```

---

## 5. Login & Session Management

### 5.1 Login Methods

```bash
# Interactive (opens browser for OAuth)
$ spm login
  ? Authentication method:
    ❯ GitHub
      API token
  Opening browser...
  ✓ Logged in as @almog

# Token-based (for CI/CD, scripts, headless)
$ spm login --token spm_tok_abc123...
  ✓ Logged in as @almog (via API token)

# Environment variable (for CI/CD)
$ export SPM_TOKEN=spm_tok_abc123...
$ spm publish   # Uses env token automatically
```

### 5.2 Token Types

```bash
$ spm token create

  ? Token name: github-actions-deploy
  ? Token scope:
    [x] publish          # Publish new versions
    [ ] yank             # Yank versions
    [ ] admin            # Manage collaborators, transfer ownership
    [x] read             # Search, download (default, always on)
  ? Expiry:
    ❯ 90 days
      1 year
      No expiry (not recommended)

  ✓ Token created:

    spm_tok_v1_abc123def456ghi789...

    ⚠️  Copy this token now — it won't be shown again.

    Scopes:  publish, read
    Expires: 2026-05-28

    For GitHub Actions:
      gh secret set SPM_TOKEN --body "spm_tok_v1_abc123..."
```

### 5.3 Credential Storage

```json
// ~/.spm/credentials.json (encrypted at rest)
{
  "registry": "https://registry.spm.dev",
  "auth": {
    "type": "oauth",
    "provider": "github",
    "access_token": "gho_encrypted_...",
    "refresh_token": "ghr_encrypted_...",
    "expires_at": "2026-03-27T10:00:00Z",
    "spm_token": "spm_tok_encrypted_..."
  },
  "user": {
    "username": "almog",
    "email": "almog@example.com",
    "tier": "verified"
  }
}
```

The credential file is:

- `chmod 600` (owner read/write only)
- Encrypted with OS keychain when available (macOS Keychain, Linux libsecret)
- Never committed to git (added to global gitignore by `spm register`)

---

## 6. Verification Upgrades

### 6.1 Tier 1 → Tier 2 (Verified Author)

Happens semi-automatically when conditions are met:

```bash
$ spm publish my-third-skill

  ...publishing...
  ✓ Published!

  🎉 Congratulations! You've been upgraded to Verified Author.

  Your account now shows the ✓ Verified badge because:
    ✓ GitHub linked (account age: 8 years)
    ✓ 3 skills published, all with clean security scans
    ✓ No violations on record
    ✓ Package signing active

  Benefits:
    - ✓ Verified badge on all your skills
    - Faster security scan processing
    - Higher search ranking
    - Eligible for featured collections
```

Or triggered manually if conditions are met:

```bash
$ spm verify request

  Checking verification requirements...
    ✓ GitHub linked (account age: 8 years)
    ✓ 1 skill published with clean scan
    ✓ No violations
    ✓ Packages signed

  ✓ You qualify for Verified Author status!
  ✓ Upgraded to Tier 2: Verified Author
```

### 6.2 Tier 2 → Tier 3 (Trusted Publisher)

Evaluated periodically by SPM. Not requestable — earned by track record:

```
Automated evaluation (monthly):

  Score components:
    + 5 points per published skill (clean scan)
    + 2 points per 1000 downloads
    + 3 points per average star rating above 4.0
    + 5 points for consistent publishing (>3 months active)
    + 10 points for signing all packages (via Sigstore)
    - 50 points per security violation
    - 20 points per yanked version (within 24h of publish)

  Threshold: 50 points → Trusted Publisher invitation

  When achieved:
    Email notification + in-CLI banner
    Must explicitly accept (comes with responsibility)
```

### 6.3 Organization Verification

```bash
$ spm org create my-company

  ? Organization name: my-company
  ? Display name: My Company Inc.
  ? Website: https://mycompany.com
  ? Organization email: dev@mycompany.com

  To verify organization ownership:

  Option A: DNS verification
    Add a TXT record to mycompany.com:
    spm-verification=spm_verify_abc123def456

  Option B: GitHub Organization
    Link your GitHub org: github.com/my-company
    You must be an admin of the GitHub org.

  ? Verification method:
    ❯ DNS record
      GitHub Organization
```

After DNS verification:

```bash
$ spm org verify my-company

  Checking DNS records for mycompany.com...
  ✓ TXT record found: spm-verification=spm_verify_abc123def456

  ✓ Organization @my-company verified!

  Skills published under @my-company will show:
    🏢 Verified Organization badge

  Manage members: spm org members my-company
```

---

## 7. Anti-Abuse Measures

### 7.1 Rate Limits by Tier

| Action         | Tier 0   | Tier 1  | Tier 2  | Tier 3    | Tier 4    |
| -------------- | -------- | ------- | ------- | --------- | --------- |
| Search         | 100/hr   | 500/hr  | 1000/hr | 5000/hr   | Unlimited |
| Download       | 500/hr   | 1000/hr | 5000/hr | Unlimited | Unlimited |
| Publish        | —        | 2/day   | 10/day  | 50/day    | Unlimited |
| Create account | 1/IP/day | —       | —       | —         | —         |
| Reviews        | —        | 10/day  | 20/day  | 50/day    | Unlimited |

### 7.2 Automated Abuse Detection

```
Signals that trigger review:

REGISTRATION:
  - Disposable email domain (mailinator, tempmail, etc.)
  - GitHub account < 30 days old
  - IP address associated with known abuse
  - Multiple accounts from same IP within 24h
  - Username similar to existing verified author (typosquatting)

PUBLISHING:
  - Burst publishing (many skills in short time)
  - Skills with nearly identical descriptions
  - Skill name similar to popular skill (squatting)
  - Binary/obfuscated content in scripts
  - SKILL.md with very little instructional content
  - Manifest declares no network but scripts use network

BEHAVIORAL:
  - Publishing then immediately yanking repeatedly
  - Mass-starring own skills from related accounts
  - Submitting fake reviews from related accounts
  - Claiming ownership of skills with established names
```

### 7.3 Account Suspension

```bash
# Automated or manual suspension

Dear @suspicious-user,

Your SPM publisher account has been suspended.

Reason: Multiple skills published with obfuscated code and
undeclared network access.

Affected skills:
  - helpful-tool@1.0.0 (removed)
  - useful-util@1.0.0 (removed)

You may appeal this decision within 30 days:
  spm appeal --reason "explanation"

Or contact: security@spm.dev
```

---

## 8. Publish Flow with Verification Gates

The complete publish flow with all identity checks:

```
spm publish
     │
     ▼
┌─────────────────┐
│ 1. Auth Check    │
│ - Valid token?   │──── No ──► "Run spm login first"
│ - Token expired? │
│ - Token scope    │
│   includes       │
│   'publish'?     │
└────────┬────────┘
         │ Yes
         ▼
┌─────────────────┐
│ 2. Account Check │
│ - Account exists?│──── No ──► "Run spm register first"
│ - Terms accepted?│──── No ──► "Run spm terms accept first"
│ - Account        │
│   suspended?     │──── Yes ─► "Account suspended. See spm appeal"
│ - Cooldown       │
│   elapsed?       │──── No ──► "Wait Xh before first publish"
└────────┬────────┘
         │ OK
         ▼
┌─────────────────┐
│ 3. Rate Limit    │
│ - Under daily    │──── No ──► "Daily publish limit reached (Tier N)"
│   publish limit? │
└────────┬────────┘
         │ OK
         ▼
┌─────────────────┐
│ 4. Ownership     │
│ - New skill name?│──── Yes ─► Register name to this author
│ - Existing name? │──── Check ► Is this author an owner/collab?
│   - Not owner?   │──── No ──► "Skill owned by @other-user"
└────────┬────────┘
         │ OK
         ▼
┌─────────────────┐
│ 5. Package       │
│    Validation    │
│ - manifest valid?│
│ - SKILL.md valid?│
│ - Files exist?   │
│ - Size under     │
│   limit?         │
│ - Has tests?     │
└────────┬────────┘
         │ OK
         ▼
┌─────────────────┐
│ 6. Signing       │
│ (sigstore-js)    │
│                  │
│ - Tier 1 email?  │──── Yes ─► Signing REQUIRED
│ - Tier 1 GitHub? │──── Signing recommended, optional
│ - Tier 2+?       │──── Signing recommended, optional
│                  │
│ If signing:      │
│ 1. GitHub OIDC   │──── Get ephemeral signing key from Fulcio CA
│    identity      │
│ 2. @sigstore/    │──── Sign .skl package hash
│    sign          │
│ 3. Rekor log     │──── Record signature on transparency log
│ 4. Bundle        │──── Generate Sigstore bundle (.sigstore)
│                  │
│ Same infra npm   │
│ uses. Keyless.   │
│ No PKI to manage.│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Upload        │
│ - Upload .skl    │
│ - Upload .sigstore│ (Sigstore bundle, if signed)
│ - Index metadata │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. Security Scan │
│ (3-layer pipeline)│
│ - Layer 1: regex │──► Pattern matching (instant)
│ - Layer 2: ML    │──► ProtectAI DeBERTa (server-side)
│ - Layer 3: API   │──► Lakera Guard (Phase 2+)
│                  │
│ - Tier 1?        │──► Must pass all layers before visible
│ - Tier 2?        │──► Async scan, visible immediately
│ - Tier 3+?       │──► Async scan, auto-approved
└────────┬────────┘
         │
         ▼
    ✅ Published
```

---

## 9. Two-Factor Authentication (2FA)

For high-tier accounts and sensitive operations:

```bash
$ spm 2fa enable

  ? 2FA method:
    ❯ Authenticator app (TOTP)
      Security key (WebAuthn/FIDO2)

  Scan this QR code with your authenticator app:
  ┌─────────────────┐
  │  ▄▄▄▄▄ ▄▄▄ ▄▄  │
  │  █ ▄▄▄ █▄▀▄█▄  │
  │  █ ███ █ ▀█▀▄  │
  │  ▀▀▀▀▀ ▀ ▀ ▀▀  │
  └─────────────────┘

  Or enter manually: JBSWY3DPEHPK3PXP

  ? Enter the 6-digit code from your app: 482193

  ✓ 2FA enabled

  Recovery codes (save these securely):
    abc123-def456
    ghi789-jkl012
    mno345-pqr678
    stu901-vwx234
```

2FA is required for:

- Publishing (Tier 2+, configurable)
- Yanking versions
- Transferring ownership
- Creating org-scoped packages
- Modifying account settings

```bash
$ spm publish

  ✓ Authenticated as @almog
  ? 2FA code: 593017
  ✓ 2FA verified

  Publishing data-viz@1.2.0...
```

---

## 10. Backend: Identity Tables

```sql
-- Extend the authors table from registry schema

ALTER TABLE authors ADD COLUMN
    github_username     VARCHAR(64),
    github_account_age  TIMESTAMPTZ,        -- When their GitHub was created
    github_repos_count  INTEGER,
    github_followers     INTEGER,

    email_verified      BOOLEAN DEFAULT FALSE,
    email_verified_at   TIMESTAMPTZ,
    email_domain        VARCHAR(255),        -- For disposable email detection

    terms_accepted      BOOLEAN DEFAULT FALSE,
    terms_accepted_at   TIMESTAMPTZ,
    terms_version       VARCHAR(16),         -- Which version of terms

    totp_secret         TEXT,                -- Encrypted TOTP seed
    totp_enabled        BOOLEAN DEFAULT FALSE,
    webauthn_credentials JSONB,              -- FIDO2 keys
    recovery_codes      TEXT[],              -- Encrypted recovery codes

    -- Anti-abuse
    registration_ip     INET,
    last_publish_at     TIMESTAMPTZ,
    publish_count_today INTEGER DEFAULT 0,
    abuse_score         INTEGER DEFAULT 0,   -- Automated risk score

    -- Suspension
    suspended           BOOLEAN DEFAULT FALSE,
    suspended_at        TIMESTAMPTZ,
    suspended_reason    TEXT,
    suspension_expires  TIMESTAMPTZ          -- NULL = permanent
);

-- Email verification tokens
CREATE TABLE email_verifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   UUID REFERENCES authors(id),
    email       VARCHAR(255) NOT NULL,
    token_hash  VARCHAR(128) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth connections (support multiple providers)
CREATE TABLE oauth_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID NOT NULL REFERENCES authors(id),
    provider        VARCHAR(32) NOT NULL,    -- 'github', 'google', etc.
    provider_user_id VARCHAR(128) NOT NULL,
    provider_username VARCHAR(128),
    access_token    TEXT,                     -- Encrypted
    refresh_token   TEXT,                     -- Encrypted
    token_expires   TIMESTAMPTZ,
    scopes          TEXT[],
    profile_data    JSONB,                   -- Raw profile from provider
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (provider, provider_user_id)
);

-- Org membership
CREATE TABLE org_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES authors(id),  -- Orgs are authors too
    user_id     UUID NOT NULL REFERENCES authors(id),
    role        VARCHAR(16) NOT NULL DEFAULT 'member',
                -- 'owner', 'admin', 'member'
    invited_by  UUID REFERENCES authors(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (org_id, user_id)
);

-- DNS verification for orgs
CREATE TABLE domain_verifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES authors(id),
    domain      VARCHAR(255) NOT NULL,
    token       VARCHAR(128) NOT NULL,
    verified    BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Disposable email blocklist
CREATE TABLE blocked_email_domains (
    domain      VARCHAR(255) PRIMARY KEY,
    reason      VARCHAR(128),
    added_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for abuse detection
CREATE INDEX idx_authors_registration_ip ON authors (registration_ip);
CREATE INDEX idx_authors_email_domain ON authors (email_domain);
```

---

## 11. Summary: Publish Readiness Requirements

```
┌──────────────────────────────────────────────────────┐
│     Minimum Requirements to Publish                   │
│                                                      │
│  GitHub path (recommended):                          │
│  ✓ GitHub OAuth completed                            │
│  ✓ Publisher Terms accepted                          │
│  ✓ 24-hour cooldown elapsed                          │
│  ✓ Package passes validation                         │
│  → Ready to publish                                  │
│                                                      │
│  Email path (stricter):                              │
│  ✓ Email verified (click link)                       │
│  ✓ Publisher Terms accepted                          │
│  ✓ 72-hour cooldown elapsed                          │
│  ✓ Package signing required (sigstore-js)            │
│  ✓ Package passes validation                         │
│  ✓ 3-layer security scan must PASS before visible    │
│  → Ready to publish (with restrictions)              │
│                                                      │
│  To upgrade trust tier:                              │
│  □ Link GitHub (if email-only)                       │
│  □ GitHub account age > 6 months                     │
│  □ 1+ skills with clean security scans              │
│  □ Enable 2FA (recommended for Tier 2+)             │
│  □ Sign all packages with Sigstore (recommended)    │
│                                                      │
│  To publish under an organization:                   │
│  □ Create org: spm org create                        │
│  □ Verify domain (DNS) or link GitHub org            │
│  □ Be org owner or admin                             │
└──────────────────────────────────────────────────────┘
```
