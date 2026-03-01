# SPM Monetization

## How the Ecosystem Sustains Itself and Rewards Authors

---

## 1. Guiding Principles

```
1. The core must stay free and open source forever
   → CLI, .skl format, protocol specs, self-hosting = always free
   → No "you need to pay to publish" barrier

2. Authors who create value should capture value
   → If your skill saves someone 10 hours, you deserve compensation
   → But the ecosystem should also thrive on free contributions

3. Revenue funds infrastructure, not profits
   → Registry hosting, security scanning, CDN = costs money
   → Sustainability, not maximization

4. No ads, no data selling, ever
   → Trust is the product
   → The moment you sell user data, the ecosystem dies
```

---

## 2. Revenue Model Overview

```
┌──────────────────────────────────────────────────────────┐
│                  Revenue Streams                          │
│                                                          │
│  FREE (always):                                          │
│  ├── CLI tool                                            │
│  ├── Publishing free skills                              │
│  ├── Installing any free skill                           │
│  ├── Self-hosting a private registry                     │
│  ├── Basic author analytics                              │
│  └── Community features (reviews, ratings)               │
│                                                          │
│  PAID:                                                   │
│  ├── 💰 Premium Skills (author sets price)               │
│  ├── 🏢 Enterprise Registry (self-hosted support)        │
│  ├── 📊 Pro Author Dashboard (advanced analytics)        │
│  ├── ✅ Priority Security Scanning                       │
│  └── 🎯 Featured Placement (curated, not ads)            │
│                                                          │
│  FUTURE:                                                 │
│  ├── 🤝 Skill Marketplace commissions                    │
│  ├── 📜 Certification program                            │
│  └── 🎓 Enterprise training                              │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Premium Skills

### 3.1 How It Works

Authors can publish skills as free or paid. Users pay to install paid skills.

```json
// manifest.json — pricing section
{
  "name": "enterprise-report-builder",
  "version": "2.0.0",
  "pricing": {
    "model": "one-time",
    "price_usd": 9.99,
    "trial": {
      "enabled": true,
      "duration_days": 7,
      "full_access": true
    },
    "free_tier": {
      "enabled": false
    }
  }
}
```

### 3.2 Pricing Models

```
┌─────────────────────────────────────────────────────────┐
│                  Pricing Options                         │
│                                                         │
│  ONE-TIME PURCHASE                                      │
│  ├── User pays once, owns the version forever           │
│  ├── Major version upgrades may require new purchase    │
│  ├── Patch/minor updates included                       │
│  ├── Price range: $1.99 - $99.99                        │
│  └── Best for: standalone tools, converters, templates  │
│                                                         │
│  SUBSCRIPTION                                           │
│  ├── Monthly or yearly billing                          │
│  ├── All updates included while subscribed              │
│  ├── Skill stops working when subscription expires      │
│  ├── Price range: $0.99 - $19.99/month                  │
│  └── Best for: skills that need ongoing maintenance,    │
│      data updates, or API access                        │
│                                                         │
│  PAY-WHAT-YOU-WANT                                      │
│  ├── Free to install, suggested price shown             │
│  ├── Users can pay $0 or any amount                     │
│  ├── Author sets suggested amount                       │
│  └── Best for: open source authors who want tips        │
│                                                         │
│  FREE WITH SPONSOR                                      │
│  ├── Skill is free for everyone                         │
│  ├── "Sponsor" button on skill page                     │
│  ├── Monthly sponsorship tiers                          │
│  └── Best for: popular community skills                 │
│                                                         │
│  FREEMIUM                                               │
│  ├── Basic version free                                 │
│  ├── Pro features require purchase                      │
│  ├── Feature gating via manifest flags                  │
│  └── Best for: skills with basic + advanced modes       │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Purchase Flow

```bash
$ spm install enterprise-report-builder

  📦 enterprise-report-builder@2.0.0
     by @almog (✓ Verified Author)
     ★★★★★ 4.8 (156 reviews) | 3.2k installs

  💰 Price: $9.99 (one-time)
     Includes: all 2.x updates
     Trial: 7 days free (full access)

  ? Purchase or start trial?
    ❯ Start 7-day free trial
      Purchase for $9.99
      Cancel

  Starting trial...
  ✓ Trial activated (expires: 2026-03-06)
  ✓ Skill installed and ready to use

  To purchase before trial ends:
    spm purchase enterprise-report-builder
```

```bash
$ spm purchase enterprise-report-builder

  ? Payment method:
    ❯ Credit card (Stripe)
      GitHub Sponsors (if author supports it)

  Opening secure payment page...

  ✓ Payment successful: $9.99
  ✓ License activated for @your-username
  ✓ Receipt sent to your@email.com

  License:
    Skill: enterprise-report-builder
    Version: 2.x (all minor/patch updates)
    Type: perpetual (this major version)
    Key: spm_lic_abc123...
```

### 3.4 License Verification

```python
# How paid skills are gated

# At install time:
async def check_license(skill_name, user_id):
    """Verify the user has a valid license for this skill."""

    license = await db.query("""
        SELECT l.*, sv.version
        FROM licenses l
        JOIN skill_versions sv ON l.skill_version_id = sv.id
        WHERE l.user_id = $1
          AND l.skill_name = $2
          AND l.status = 'active'
          AND (l.expires_at IS NULL OR l.expires_at > NOW())
    """, user_id, skill_name)

    if not license:
        # Check for active trial
        trial = await db.query("""
            SELECT * FROM trials
            WHERE user_id = $1 AND skill_name = $2
              AND expires_at > NOW() AND status = 'active'
        """, user_id, skill_name)

        if trial:
            return {"valid": True, "type": "trial", "expires": trial.expires_at}

        return {"valid": False, "reason": "no_license"}

    return {"valid": True, "type": license.type, "key": license.license_key}

# License is stored locally after purchase:
# ~/.spm/licenses/enterprise-report-builder.json
# {
#   "skill": "enterprise-report-builder",
#   "version_range": "2.x",
#   "license_key": "spm_lic_abc123...",
#   "purchased_at": "2026-02-27T...",
#   "type": "perpetual"
# }
```

### 3.5 DRM Philosophy: Light Touch

```
What we DO:
  ✓ License key verified at install time
  ✓ Periodic check (weekly) that license is still valid
  ✓ Skill removed if subscription lapses + grace period ends

What we DON'T do:
  ✗ No runtime license checking (skill works offline)
  ✗ No code obfuscation (SKILL.md is always readable)
  ✗ No phone-home on every use
  ✗ No hardware fingerprinting

Why light touch:
  - Skills are text files — heavy DRM is impossible anyway
  - Trust-based system works better for this audience
  - Friction kills adoption
  - Piracy is a distribution problem, not a protection problem
  - If your skill is good, people will pay
```

---

## 4. Revenue Split

### 4.1 Commission Structure

```
┌──────────────────────────────────────────┐
│         Revenue Split                     │
│                                          │
│  Skill price: $9.99                      │
│                                          │
│  Author receives:     80%  ($7.99)       │
│  SPM platform fee:    15%  ($1.50)       │
│  Payment processing:   5%  ($0.50)       │
│                       ─────────────      │
│  Total:              100%  ($9.99)       │
│                                          │
│  For subscriptions:                      │
│  Author receives:     85%               │
│  SPM platform fee:    10%               │
│  Payment processing:   5%               │
│  (Higher author cut for recurring)       │
│                                          │
│  For sponsorships:                       │
│  Author receives:     95%               │
│  SPM platform fee:     0%               │
│  Payment processing:   5%               │
│  (SPM takes nothing from sponsorships)   │
└──────────────────────────────────────────┘
```

Comparison with other platforms:

| Platform        | Creator Cut | Platform Fee |
| --------------- | ----------- | ------------ |
| **SPM**         | **80-95%**  | **0-15%**    |
| Apple App Store | 70-85%      | 15-30%       |
| Google Play     | 70-85%      | 15-30%       |
| Gumroad         | 90%         | 10%          |
| npm (no paid)   | —           | —            |
| VS Code (free)  | —           | —            |

### 4.2 Author Payouts

```bash
$ spm earnings

  Earnings for @almog (February 2026):

  ┌────────────────────────────────────────────┐
  │  enterprise-report-builder                  │
  │  Sales: 47 × $9.99 = $469.53              │
  │  Your cut (80%): $375.62                   │
  │                                            │
  │  advanced-charts (subscription)            │
  │  Active subscribers: 128                    │
  │  Revenue: 128 × $4.99 = $638.72           │
  │  Your cut (85%): $542.91                   │
  │                                            │
  │  data-viz (pay-what-you-want)              │
  │  Tips: 23 payments, avg $3.20 = $73.60    │
  │  Your cut (95%): $69.92                    │
  │                                            │
  │  ─────────────────────────────────────     │
  │  Total this month: $988.45                 │
  │  Pending payout: $988.45                   │
  │  Next payout: March 1, 2026               │
  └────────────────────────────────────────────┘

  Lifetime earnings: $12,847.30

  Payout settings: spm earnings settings
```

Payout methods:

- **Stripe Connect** (primary) — direct to bank account
- **GitHub Sponsors** passthrough — for authors who prefer GitHub's infra
- **PayPal** — fallback option

Payout schedule:

- Monthly, on the 1st
- Minimum payout: $50 (below that, rolls over)
- Payout in USD, EUR, or GBP (author's choice)

### 4.3 Tax Handling

```bash
$ spm earnings settings

  ? Payout method:
    ❯ Bank account (via Stripe Connect)

  ? Tax information:
    SPM uses Stripe Connect for payouts. Stripe handles
    tax form generation (1099-K for US, equivalent for other regions).

    Please complete tax information in your Stripe dashboard:
    https://connect.stripe.com/setup/...

  ⚠️  SPM does not provide tax advice. Consult a tax professional
     about reporting income from skill sales.
```

---

## 5. Enterprise Registry

For companies that want to run their own private registry with support.

### 5.1 Tiers

```
┌──────────────────────────────────────────────────────────┐
│              Enterprise Plans                             │
│                                                          │
│  SELF-HOSTED FREE                                        │
│  ├── Docker Compose deployment                           │
│  ├── All features included                               │
│  ├── Community support only (GitHub issues)              │
│  ├── No SLA                                              │
│  └── $0/month                                            │
│                                                          │
│  SELF-HOSTED PRO                                         │
│  ├── Everything in Free, plus:                           │
│  ├── Priority email support (48h response)               │
│  ├── Deployment assistance                               │
│  ├── SSO / SAML integration                              │
│  ├── Audit log export                                    │
│  ├── Custom security scanning rules                      │
│  ├── SLA: 99.9% for support response                     │
│  └── $500/month                                          │
│                                                          │
│  MANAGED CLOUD                                           │
│  ├── SPM hosts your private registry                     │
│  ├── Everything in Pro, plus:                            │
│  ├── No infrastructure management                        │
│  ├── Automatic updates and scaling                       │
│  ├── Dedicated support (24h response)                    │
│  ├── Custom domain (spm.yourcompany.com)                │
│  ├── SSO / SAML / SCIM                                   │
│  ├── Data residency options (US, EU, APAC)              │
│  ├── SLA: 99.99% uptime                                 │
│  └── $2,000/month (up to 100 users)                      │
│      $5,000/month (up to 500 users)                      │
│      Custom pricing above 500                            │
│                                                          │
│  ENTERPRISE                                              │
│  ├── Everything in Managed Cloud, plus:                  │
│  ├── Dedicated account manager                           │
│  ├── Custom integrations                                 │
│  ├── On-prem deployment support                          │
│  ├── Security review of your skills                      │
│  ├── Training and onboarding                             │
│  ├── Compliance certifications (SOC2, etc.)             │
│  └── Custom pricing                                      │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Enterprise Features (Not in Open Source)

These features are built separately from the open source registry, licensed commercially:

```
SSO / SAML integration
  → Login with Okta, Azure AD, Google Workspace

SCIM provisioning
  → Auto-create/disable accounts from identity provider

Role-based access control (RBAC)
  → Custom roles: viewer, publisher, reviewer, admin
  → Team-based permissions

Audit log export
  → Ship to Splunk, Datadog, ELK
  → Compliance-ready format

Custom security policies
  → Company-specific scanning rules
  → Mandatory signing policies
  → Approved dependency lists

Private + public skill mixing
  → Install from both company registry and public SPM
  → Scoped: @company/* from private, everything else from public

Usage analytics
  → Which teams use which skills
  → Cost attribution
  → ROI reporting
```

---

## 6. Pro Author Dashboard

Free analytics cover basics. Pro dashboard goes deeper.

### 6.1 Free vs Pro Analytics

```
FREE (all authors):                PRO ($9.99/month):
├── Total downloads                ├── Everything in Free
├── Downloads over time (30 days)  ├── Downloads over time (all time)
├── Average rating                 ├── Geographic breakdown
├── Number of reviews              ├── Platform breakdown (Claude Code
├── Current version stats          │   vs Cursor vs Copilot vs Codex)
└── Revenue (if paid skill)        ├── Referral sources
                                   ├── Install-to-uninstall ratio
                                   ├── Version adoption curves
                                   ├── User retention (returning users)
                                   ├── Trigger rate analytics
                                   │   (how often agents pick your skill)
                                   ├── Search impression data
                                   │   (how often your skill appears
                                   │    in search results)
                                   ├── Competitor comparison
                                   │   (your skill vs category average)
                                   ├── Revenue forecasting
                                   ├── Export data (CSV, API access)
                                   └── Custom alerts
                                       (downloads spike, bad review, etc.)
```

### 6.2 The Killer Feature: Trigger Analytics

This is unique to skill ecosystems — no other package manager has this:

```
Trigger Analytics tells you:
  - How often agents consider your skill for a task
  - How often they actually read your SKILL.md (triggered)
  - How often it was considered but another skill was chosen
  - Which search queries lead to your skill
  - What prompts trigger your skill most frequently

This data helps authors:
  - Optimize their description for better triggering
  - Understand what users actually need
  - Identify gaps (many searches, few triggers = bad description)
```

---

## 7. Featured Placement

Not ads. Curated editorial content.

```
┌──────────────────────────────────────────────────────────┐
│                  Featured Program                         │
│                                                          │
│  What it IS:                                             │
│  ├── Curated "Staff Picks" on the homepage               │
│  ├── "Skill of the Week" editorial feature               │
│  ├── Category-specific "Best Of" lists                   │
│  ├── "New & Noteworthy" section                          │
│  └── Seasonal collections ("Back to School" etc.)        │
│                                                          │
│  What it is NOT:                                         │
│  ├── Not pay-to-play (money doesn't buy placement)       │
│  ├── Not ads (no "sponsored" results in search)          │
│  └── Not algorithmic promotion (editorial discretion)    │
│                                                          │
│  Selection criteria:                                     │
│  ├── Quality of SKILL.md instructions                    │
│  ├── User ratings and reviews                            │
│  ├── Download growth trajectory                          │
│  ├── Author reputation (Tier 2+)                         │
│  ├── Fills a gap in the ecosystem                        │
│  └── SPM team editorial judgment                         │
│                                                          │
│  Revenue from featured:                                  │
│  └── None directly — it drives ecosystem health          │
│      which drives enterprise sales                       │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Sponsorship System

For free skills that want community support:

```bash
$ spm sponsor data-viz

  📦 data-viz by @almog
  ★★★★★ 4.7 | 12.4k downloads | Free

  Sponsor tiers:
    ☕ Coffee       $3/month    "Thanks for the great skill!"
    🍕 Pizza        $10/month   "Your name in the README"
    🚀 Booster      $25/month   "Priority feature requests"
    💎 Patron       $100/month  "Monthly 1:1 call with author"

  ? Select tier:
    ❯ ☕ Coffee ($3/month)

  Opening payment page...
  ✓ Sponsorship active! Thank you for supporting @almog.
```

Author sees:

```bash
$ spm earnings sponsors

  Sponsors for data-viz:
    ☕ 23 Coffee sponsors      = $69/month
    🍕  8 Pizza sponsors       = $80/month
    🚀  3 Booster sponsors     = $75/month
    💎  1 Patron sponsor       = $100/month
    ─────────────────────────────────────
    Total:                       $324/month

  Sponsor wall (public):
    💎 @bigcompany
    🚀 @dev1, @dev2, @dev3
    🍕 @user1, @user2 + 6 more
    ☕ 23 supporters
```

---

## 9. Revenue Projections by Phase

```
Phase 1 (Months 1-6): $0 revenue
  Focus: build, launch, grow users
  Cost: ~$200/month (Fly.io + Neon + R2)
  Funded by: personal savings / side project budget

Phase 2 (Months 6-12): $500-2,000/month
  Sources:
    - Pro Author Dashboard: ~20 authors × $10 = $200
    - Premium skills (early): ~$300 in commissions
    - Sponsorships (early): ~$100 pass-through (SPM takes 0%)
    - First enterprise inquiry
  Cost: ~$500/month (growing infrastructure)

Phase 3 (Months 12-24): $5,000-15,000/month
  Sources:
    - Pro Author Dashboard: ~100 × $10 = $1,000
    - Premium skills: ~$3,000 in commissions
    - Enterprise Self-Hosted Pro: 2-5 × $500 = $1,000-2,500
    - First Managed Cloud customer: $2,000
  Cost: ~$2,000/month

Phase 4 (Month 24+): $20,000+/month
  Sources:
    - Premium skills scale: $5,000-10,000 in commissions
    - Enterprise: 5-10 customers = $10,000-25,000
    - Pro Author: $2,000-3,000
    - Featured collections (partnership revenue)
  Cost: ~$5,000/month (team, infrastructure)

Break-even target: Month 8-12
Sustainability target: Month 18
```

---

## 10. Payment Infrastructure

### 10.1 Stack

```
┌──────────────────────────────────────────────────────────┐
│                  Payment Stack                            │
│                                                          │
│  Stripe                                                  │
│  ├── Checkout (one-time purchases)                       │
│  ├── Billing (subscriptions)                             │
│  ├── Connect (author payouts)                            │
│  ├── Tax calculation                                     │
│  └── Invoicing (enterprise)                              │
│                                                          │
│  Why Stripe:                                             │
│  ├── Handles global payments + tax compliance            │
│  ├── Stripe Connect = built-in marketplace payouts       │
│  ├── Well-documented API                                 │
│  ├── Standard for developer tools                        │
│  └── If SPM transfers to Anthropic, they likely use      │
│      Stripe already                                      │
└──────────────────────────────────────────────────────────┘
```

### 10.2 Database Tables

```sql
-- Licenses (for paid skills)
CREATE TABLE licenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES authors(id),
    skill_name      VARCHAR(64) NOT NULL,
    skill_version_id UUID REFERENCES skill_versions(id),

    type            VARCHAR(16) NOT NULL,
        -- 'perpetual', 'subscription', 'trial'
    status          VARCHAR(16) DEFAULT 'active',
        -- 'active', 'expired', 'revoked', 'refunded'

    license_key     VARCHAR(128) UNIQUE NOT NULL,

    -- Payment info
    stripe_payment_id   VARCHAR(128),
    stripe_subscription_id VARCHAR(128),
    amount_paid     DECIMAL(10,2),
    currency        VARCHAR(3) DEFAULT 'USD',

    -- Validity
    purchased_at    TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,  -- NULL = perpetual
    version_range   VARCHAR(16),  -- e.g., "2.x"

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trials
CREATE TABLE trials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES authors(id),
    skill_name      VARCHAR(64) NOT NULL,

    status          VARCHAR(16) DEFAULT 'active',
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    converted       BOOLEAN DEFAULT FALSE,  -- Did they purchase after trial?

    UNIQUE (user_id, skill_name)  -- One trial per user per skill
);

-- Author payment accounts
CREATE TABLE author_payment_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID UNIQUE NOT NULL REFERENCES authors(id),

    stripe_connect_id VARCHAR(128),
    payout_method   VARCHAR(16),  -- 'stripe', 'paypal', 'github_sponsors'
    payout_currency VARCHAR(3) DEFAULT 'USD',

    -- Tax info
    tax_info_provided BOOLEAN DEFAULT FALSE,
    tax_country     VARCHAR(2),

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (ledger)
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id      UUID REFERENCES licenses(id),

    type            VARCHAR(16) NOT NULL,
        -- 'purchase', 'subscription_renewal', 'refund',
        -- 'payout', 'sponsorship', 'tip'

    -- Parties
    buyer_id        UUID REFERENCES authors(id),
    seller_id       UUID REFERENCES authors(id),

    -- Amounts
    gross_amount    DECIMAL(10,2) NOT NULL,
    platform_fee    DECIMAL(10,2),
    processing_fee  DECIMAL(10,2),
    author_amount   DECIMAL(10,2),
    currency        VARCHAR(3) DEFAULT 'USD',

    -- Stripe reference
    stripe_payment_intent VARCHAR(128),
    stripe_transfer_id    VARCHAR(128),

    status          VARCHAR(16) DEFAULT 'completed',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsorships
CREATE TABLE sponsorships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id      UUID NOT NULL REFERENCES authors(id),
    author_id       UUID NOT NULL REFERENCES authors(id),
    skill_name      VARCHAR(64),  -- NULL = sponsor the author generally

    tier            VARCHAR(32),
    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'USD',
    frequency       VARCHAR(16) DEFAULT 'monthly',

    stripe_subscription_id VARCHAR(128),

    status          VARCHAR(16) DEFAULT 'active',
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at    TIMESTAMPTZ,

    UNIQUE (sponsor_id, author_id, skill_name)
);

-- Payouts
CREATE TABLE payouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID NOT NULL REFERENCES authors(id),

    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'USD',

    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,

    stripe_transfer_id VARCHAR(128),

    status          VARCHAR(16) DEFAULT 'pending',
        -- 'pending', 'processing', 'completed', 'failed'

    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_licenses_user ON licenses (user_id, skill_name);
CREATE INDEX idx_transactions_seller ON transactions (seller_id, created_at);
CREATE INDEX idx_sponsorships_author ON sponsorships (author_id)
    WHERE status = 'active';
CREATE INDEX idx_payouts_author ON payouts (author_id, period_start);
```

---

## 11. Refund Policy

```
┌──────────────────────────────────────────────────────────┐
│                  Refund Policy                            │
│                                                          │
│  ONE-TIME PURCHASES:                                     │
│  ├── Full refund within 7 days, no questions asked       │
│  ├── After 7 days: case-by-case (skill broken, etc.)     │
│  ├── Skill access revoked on refund                      │
│  └── Abuse detection: >3 refunds = account review        │
│                                                          │
│  SUBSCRIPTIONS:                                          │
│  ├── Cancel anytime, access until end of billing period  │
│  ├── Prorated refund for annual plans within 30 days     │
│  └── No refund after 30 days for annual plans            │
│                                                          │
│  TRIALS:                                                 │
│  ├── Free — nothing to refund                            │
│  └── Auto-converts only if user explicitly purchases     │
│      (no sneaky auto-billing)                            │
│                                                          │
│  Process:                                                │
│  $ spm refund enterprise-report-builder                  │
│  or: email support@spm.dev                               │
└──────────────────────────────────────────────────────────┘
```

---

## 12. Anti-Fraud Measures

```python
FRAUD_SIGNALS = {
    # Self-purchasing
    "self_buy": {
        "detection": "Author purchases their own skill from alternate account",
        "signals": ["same IP", "same payment method", "account created same day"],
        "action": "block_transaction + flag_accounts"
    },

    # Review manipulation
    "fake_reviews": {
        "detection": "Multiple positive reviews from new/related accounts",
        "signals": ["accounts created within 24h of review",
                     "same IP range", "identical review text"],
        "action": "remove_reviews + warn_author"
    },

    # Download inflation
    "download_farming": {
        "detection": "Automated downloads to inflate stats",
        "signals": ["many downloads from same IP/subnet",
                     "downloads without subsequent usage",
                     "burst pattern (100 downloads in 1 minute)"],
        "action": "exclude_from_counts + warn_author"
    },

    # Refund abuse
    "refund_cycling": {
        "detection": "Buy, use, refund pattern",
        "signals": [">3 refunds in 30 days", "refund after extensive use"],
        "action": "deny_refund + restrict_purchases"
    },

    # Price manipulation
    "price_bait_switch": {
        "detection": "List skill cheap, then raise price after reviews accumulate",
        "signals": ["price increase >200% within 30 days",
                     "price increase after positive review surge"],
        "action": "revert_price + notify_buyers + warn_author"
    }
}
```

---

## 13. Summary: Revenue Architecture

```
┌──────────────────────────────────────────────────────────┐
│              SPM Revenue Architecture                     │
│                                                          │
│  ALWAYS FREE:                                            │
│  ├── CLI, format, specs, self-hosting                    │
│  ├── Publishing free skills                              │
│  ├── Installing free skills                              │
│  └── Basic analytics                                     │
│                                                          │
│  AUTHOR MONETIZATION:                                    │
│  ├── Premium skills (80% to author)                      │
│  ├── Subscriptions (85% to author)                       │
│  ├── Pay-what-you-want / tips (95% to author)            │
│  ├── Sponsorships (95% to author)                        │
│  └── Payouts via Stripe Connect, monthly                 │
│                                                          │
│  PLATFORM REVENUE:                                       │
│  ├── Skill commissions (15% one-time, 10% subscription)  │
│  ├── Pro Author Dashboard ($10/month)                    │
│  ├── Enterprise Self-Hosted Pro ($500/month)             │
│  ├── Managed Cloud ($2-5k/month)                         │
│  └── Enterprise custom (contract pricing)                │
│                                                          │
│  PRINCIPLES:                                             │
│  ├── No ads, no data selling                             │
│  ├── Light DRM (license key at install, not runtime)     │
│  ├── 7-day trial, no sneaky auto-billing                 │
│  ├── 7-day no-questions refund                           │
│  └── Sustainability over maximization                    │
└──────────────────────────────────────────────────────────┘
```
