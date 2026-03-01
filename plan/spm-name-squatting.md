# Name Squatting Prevention

## Protecting the Namespace Before It Gets Polluted

---

## 1. The Problem

Name squatting ruined other ecosystems before rules existed:

```
npm:     Someone registers "react-native-utils" with empty package
         → Real author has to use "react-native-utils-official"
         → Users install the wrong one
         → Sometimes the squatter publishes malicious code later

PyPI:    Typosquatting: "reqeusts" instead of "requests"
         → Catches typos, installs malware
         → Thousands of downloads before caught

SPM:     Without prevention:
         → Someone registers "pdf", "docx", "xlsx" before Anthropic
         → Someone grabs "chatgpt-helper", "openai-tools"
         → Trademark holders forced to dispute
         → Users confused by abandoned placeholder skills
```

SPM needs to prevent this from Day 1, not retrofit it after the damage is done.

---

## 2. Name Policy — The Rules

### 2.1 Reserved Names

Names that cannot be registered by anyone (reserved for official/future use):

```python
RESERVED_NAMES = {
    # Core skill names (match current built-in skills)
    "pdf", "docx", "xlsx", "pptx", "csv",
    "frontend-design", "product-self-knowledge",
    "skill-creator", "mcp-builder",

    # SPM internal names
    "spm", "spm-runtime", "spm-core", "spm-cli",
    "spm-registry", "spm-scanner", "spm-sdk",

    # Platform names (all 37+ supported agent platforms)
    "claude", "anthropic", "claude-code", "cowork",
    "chatgpt", "openai", "codex", "copilot",
    "gemini", "google", "google-deepmind",
    "cursor", "windsurf", "codeium",
    "microsoft", "meta", "llama",
    "goose", "amp", "kiro", "roo-code",
    "vercel", "skills-sh",

    # Generic high-value names
    "core", "base", "common", "utils", "helpers",
    "standard", "default", "official", "admin",
    "test", "debug", "example", "template",
    "config", "settings", "preferences",

    # Offensive/misleading
    # (loaded from a maintained blocklist)
}
```

Reserved names can only be published by:

- SPM team (Tier 4: Official)
- Explicit approval from SPM admin

```bash
$ spm publish
  ❌ The name "claude" is reserved.
     Reserved names can only be published by authorized maintainers.
     If you believe you should have access, contact: names@spm.dev
```

### 2.2 Naming Rules

```
Valid names:
  ✓ kebab-case only (lowercase, hyphens, digits)
  ✓ 2-64 characters
  ✓ Must start with a letter
  ✓ No consecutive hyphens
  ✓ No leading/trailing hyphens

Invalid:
  ✗ DataViz          (no uppercase)
  ✗ data_viz          (no underscores)
  ✗ a                  (too short)
  ✗ 123-skill          (must start with letter)
  ✗ my--skill          (consecutive hyphens)
  ✗ -my-skill          (leading hyphen)

Scoped names:
  ✓ @mycompany/data-viz    (org scope, org must be verified)
  ✗ @random/data-viz       (org doesn't exist or not a member)
```

### 2.3 Name Similarity Rules

New registrations are checked against existing names for:

```
Exact duplicate:        data-viz   vs  data-viz         → BLOCKED (obvious)

Hyphen variants:        data-viz   vs  dataviz          → BLOCKED
                        data-viz   vs  data--viz        → BLOCKED

Typosquatting:          data-viz   vs  data-vix         → FLAGGED (edit distance 1)
                        data-viz   vs  dara-viz         → FLAGGED (edit distance 1)
                        requests   vs  reqeusts         → FLAGGED (transposition)

Homograph attack:       data-viz   vs  dаta-viz         → BLOCKED (Cyrillic 'а')
                        score      vs  scоre            → BLOCKED (Cyrillic 'о')

Pluralization:          data-viz   vs  data-vizs        → FLAGGED
                        chart      vs  charts           → FLAGGED

Common prefixes:        data-viz   vs  my-data-viz      → ALLOWED (different enough)
                        data-viz   vs  the-data-viz     → FLAGGED (generic prefix)
                        data-viz   vs  real-data-viz    → FLAGGED (implies "official")

Common suffixes:        data-viz   vs  data-viz-pro     → ALLOWED
                        data-viz   vs  data-viz-official → FLAGGED (implies authority)
                        data-viz   vs  data-viz-fixed   → FLAGGED (implies fork)
```

---

## 3. Detection System

### 3.1 Name Similarity Algorithm

SPM uses existing npm packages for similarity detection instead of building custom algorithms:

```
BORROWED TOOLS:
  string-similarity   — Dice coefficient for fuzzy matching
  fastest-levenshtein — Levenshtein edit distance (fastest implementation)
  confusables         — Unicode homoglyph/confusable detection (UAX #39)
```

```typescript
import { compareTwoStrings } from 'string-similarity';
import { distance as levenshtein } from 'fastest-levenshtein';
import { isConfusable } from 'confusables';

interface NameCheckResult {
  allowed: boolean;
  issues: Array<{
    type: string;
    severity: 'block' | 'flag' | 'warn';
    details: string;
  }>;
}

class NameSquatDetector {

    # Prefixes/suffixes that imply authority or fake relationship
    SUSPICIOUS_PREFIXES = [
        "the-", "real-", "official-", "true-", "original-",
        "better-", "improved-", "fixed-", "secure-",
    ]
    SUSPICIOUS_SUFFIXES = [
        "-official", "-real", "-original", "-fixed",
        "-secure", "-plus", "-pro", "-better",
        "-improved", "-v2", "-new", "-latest",
    ]

    def __init__(self, existing_names: set[str]):
        self.existing = existing_names
        self.normalized_map = {
            self._normalize(n): n for n in existing_names
        }

    def check(self, proposed: str) -> dict:
        """
        Returns:
          {
            "allowed": bool,
            "issues": [
              {"type": "...", "severity": "block|flag|warn", "details": "..."}
            ]
          }
        """
        issues = []

        # 1. Reserved name check
        if proposed in RESERVED_NAMES:
            issues.append({
                "type": "reserved",
                "severity": "block",
                "details": f"'{proposed}' is a reserved name"
            })
            return {"allowed": False, "issues": issues}

        # 2. Exact duplicate (case-insensitive)
        if proposed.lower() in {n.lower() for n in self.existing}:
            issues.append({
                "type": "duplicate",
                "severity": "block",
                "details": f"'{proposed}' is already taken"
            })
            return {"allowed": False, "issues": issues}

        # 3. Normalized collision (remove hyphens, lowercase)
        normalized = self._normalize(proposed)
        if normalized in self.normalized_map:
            existing_name = self.normalized_map[normalized]
            issues.append({
                "type": "normalized_collision",
                "severity": "block",
                "details": f"'{proposed}' is too similar to existing '{existing_name}' "
                           f"(both normalize to '{normalized}')"
            })

        # 4. Unicode homograph detection
        if self._has_homoglyphs(proposed):
            issues.append({
                "type": "homograph",
                "severity": "block",
                "details": f"'{proposed}' contains characters that visually mimic ASCII "
                           f"(possible homograph attack)"
            })

        # 5. Levenshtein distance check (typosquatting)
        for existing_name in self.existing:
            dist = levenshtein_distance(proposed, existing_name)

            # Scale threshold by name length
            # Short names (3-5 chars): distance 1 = block
            # Medium names (6-12 chars): distance 1 = flag, distance 2 = warn
            # Long names (13+): distance 1-2 = flag
            name_len = max(len(proposed), len(existing_name))

            if dist == 1 and name_len <= 8:
                issues.append({
                    "type": "typosquat",
                    "severity": "block",
                    "details": f"'{proposed}' is 1 character away from popular skill "
                               f"'{existing_name}' (edit distance: {dist})"
                })
            elif dist == 1 and name_len > 8:
                issues.append({
                    "type": "typosquat",
                    "severity": "flag",
                    "details": f"'{proposed}' is 1 character away from '{existing_name}'"
                })
            elif dist == 2 and name_len <= 10:
                issues.append({
                    "type": "typosquat_possible",
                    "severity": "warn",
                    "details": f"'{proposed}' is similar to '{existing_name}' "
                               f"(edit distance: {dist})"
                })

        # 6. Suspicious prefix/suffix
        for prefix in self.SUSPICIOUS_PREFIXES:
            if proposed.startswith(prefix):
                base = proposed[len(prefix):]
                if base in self.existing:
                    issues.append({
                        "type": "authority_claim",
                        "severity": "flag",
                        "details": f"'{proposed}' uses prefix '{prefix}' on existing "
                                   f"skill '{base}' — implies false authority"
                    })

        for suffix in self.SUSPICIOUS_SUFFIXES:
            if proposed.endswith(suffix):
                base = proposed[:-len(suffix)]
                if base in self.existing:
                    issues.append({
                        "type": "authority_claim",
                        "severity": "flag",
                        "details": f"'{proposed}' uses suffix '{suffix}' on existing "
                                   f"skill '{base}' — implies false authority"
                    })

        # 7. Pluralization
        for variant in self._plural_variants(proposed):
            if variant in self.existing:
                issues.append({
                    "type": "plural_variant",
                    "severity": "flag",
                    "details": f"'{proposed}' is a plural/singular variant of "
                               f"existing '{variant}'"
                })

        # Determine outcome
        has_block = any(i["severity"] == "block" for i in issues)
        has_flag = any(i["severity"] == "flag" for i in issues)

        allowed = not has_block and not has_flag

        return {"allowed": allowed, "issues": issues}

    def _normalize(self, name: str) -> str:
        """Remove hyphens and lowercase for collision detection."""
        return name.lower().replace("-", "").replace("_", "")

    _hasHomoglyphs(name: string): boolean {
        /**
         * Uses the `confusables` npm package (UAX #39 standard).
         * Detects Unicode characters that visually mimic ASCII.
         * Example: "ℝeact-patterns" (ℝ instead of R) → detected
         * Example: "dаta-viz" (Cyrillic а instead of Latin a) → detected
         */
        const result = isConfusable(name);
        return result !== false;
    }

    _pluralVariants(name: string): string[] {
        const variants: string[] = [];
        if (name.endsWith('s') && !name.endsWith('ss')) {
            variants.push(name.slice(0, -1));          // charts → chart
        }
        if (name.endsWith('es')) {
            variants.push(name.slice(0, -2));          // watches → watch
        }
        if (!name.endsWith('s')) {
            variants.push(name + 's');                 // chart → charts
        }
        return variants;
    }
}
```

### 3.2 Severity Actions

```
BLOCK:   Registration denied immediately.
         User sees clear error message.
         No human review needed.

FLAG:    Registration held for manual review.
         User sees: "This name requires manual approval (1-3 business days)"
         SPM team reviews and approves/denies.
         Auto-approved if author is Tier 3+.

WARN:    Registration proceeds with a warning.
         User sees: "⚠️ This name is similar to 'X'. Continue? (y/N)"
         Logged for future reference.
         If the existing skill author complains later, this log helps.
```

---

## 4. Anti-Squatting Policies

### 4.1 Use-It-or-Lose-It

Names are not permanently owned just by registering. You must publish meaningful content.

```
Rules:
  - First publish must happen within 30 days of name registration
  - If no version exists after 30 days, name is released
  - If a skill has 0 downloads for 12 months AND hasn't been
    updated in 12 months, it enters "dormant" status
  - Dormant skills get a 90-day warning before name is released
  - Skills with >100 total downloads are never auto-released
```

```bash
# Warning email to dormant skill author:

Subject: Your SPM skill "cool-charts" may lose its name

Hi @almog,

Your skill "cool-charts" has had 0 downloads and no updates
for 12 months. Under SPM's namespace policy, dormant skills
may have their names released for reuse.

Actions:
  - Publish an update to keep the name (even a minor version bump)
  - Or reply to this email to request an extension

If no action is taken, the name "cool-charts" will be released
on 2027-06-15.

Questions? names@spm.dev
```

### 4.2 Pre-Registration (Name Reservation)

For legitimate upcoming skills:

```bash
$ spm reserve my-upcoming-skill

  Reserving name "my-upcoming-skill" for @almog...

  ✓ Name reserved for 30 days
  ✓ Reservation expires: 2026-03-29

  You must publish the first version before the reservation expires.
  Extend once (30 more days): spm reserve my-upcoming-skill --extend

# Limits:
#   Tier 1: 2 active reservations
#   Tier 2: 5 active reservations
#   Tier 3: 10 active reservations
#   Tier 4: Unlimited
```

### 4.3 Trademark and Brand Claims

```bash
# If a trademark holder wants to claim a name:

$ spm dispute data-viz --reason trademark

  Opening a name dispute...

  ? Your name/organization: Acme Corp
  ? Trademark registration number (optional): US-12345678
  ? Evidence URL (trademark certificate, website, etc.):
    > https://acme.com/trademarks/data-viz
  ? Description of your claim:
    > We hold the registered trademark "DataViz" for software
    > tools in the US and EU.

  ✓ Dispute filed: #DISPUTE-2026-0042

  What happens next:
  1. SPM team reviews within 5 business days
  2. Current owner is notified and can respond
  3. SPM team makes a decision
  4. Either the name transfers, or the dispute is denied

  Track status: spm dispute status DISPUTE-2026-0042
```

Dispute resolution process:

```
┌─────────────┐     ┌────────────────┐     ┌──────────────┐
│ Claimant     │     │   SPM Team     │     │ Current      │
│ files        │────►│   reviews      │────►│ Owner        │
│ dispute      │     │   evidence     │     │ notified     │
└─────────────┘     └───────┬────────┘     └──────┬───────┘
                            │                      │
                            │   ◄── responds ──────┘
                            │       (7 day window)
                            ▼
                    ┌───────────────┐
                    │   Decision     │
                    │               │
                    ├── Transfer ───► Name given to claimant
                    │               │ Existing versions stay available
                    │               │ Old author gets 30-day notice
                    │               │
                    ├── Denied ─────► Claimant can appeal once
                    │               │
                    └── Coexist ───► Both keep their names
                                    (if scoped differently)

```

---

## 5. Name Registration Flow (Integrated with Publish)

Name registration happens automatically on first publish. But SPM runs all checks before accepting:

```bash
$ spm publish

  ...validation passes...

  Checking name availability: "data-viz"

  ┌─ Name Analysis ──────────────────────────────────────┐
  │                                                      │
  │  Proposed: data-viz                                  │
  │                                                      │
  │  ✓ Not reserved                                      │
  │  ✓ Not taken                                         │
  │  ✓ No normalized collision                           │
  │  ✓ No homoglyphs                                     │
  │  ✓ No typosquat match (nearest: "data-vis", dist=2)  │
  │  ✓ No suspicious prefix/suffix                       │
  │  ✓ No plural variant conflict                        │
  │                                                      │
  │  Result: ✅ ALLOWED                                   │
  └──────────────────────────────────────────────────────┘

  Registering name "data-viz" to @almog...
  ✓ Name registered

  Uploading...
```

When issues are found:

```bash
$ spm publish    # trying to publish "dta-viz"

  Checking name availability: "dta-viz"

  ┌─ Name Analysis ──────────────────────────────────────┐
  │                                                      │
  │  Proposed: dta-viz                                   │
  │                                                      │
  │  ✓ Not reserved                                      │
  │  ✓ Not taken                                         │
  │  ✓ No normalized collision                           │
  │  ✓ No homoglyphs                                     │
  │  ❌ TYPOSQUAT: 1 char from "data-viz" (12.4k downloads)│
  │                                                      │
  │  Result: ❌ BLOCKED                                   │
  │                                                      │
  │  This name is too similar to the popular skill       │
  │  "data-viz" and may confuse users.                   │
  │                                                      │
  │  Suggestions:                                        │
  │    - Use a more distinctive name                     │
  │    - If you're the "data-viz" author, publish as     │
  │      a new version instead                           │
  │    - Dispute: spm dispute dta-viz --reason legitimate│
  └──────────────────────────────────────────────────────┘
```

```bash
$ spm publish    # trying to publish "real-pdf"

  Checking name availability: "real-pdf"

  ┌─ Name Analysis ──────────────────────────────────────┐
  │                                                      │
  │  Proposed: real-pdf                                  │
  │                                                      │
  │  ✓ Not reserved                                      │
  │  ✓ Not taken                                         │
  │  ⚠️ AUTHORITY CLAIM: prefix "real-" on existing       │
  │     skill "pdf" — implies this is the authentic       │
  │     version                                          │
  │                                                      │
  │  Result: 🔍 FLAGGED FOR REVIEW                       │
  │                                                      │
  │  This name has been submitted for manual review.     │
  │  You'll be notified within 1-3 business days.        │
  │                                                      │
  │  In the meantime, consider alternative names:        │
  │    - pdf-enhanced                                    │
  │    - pdf-with-ocr                                    │
  │    - almog-pdf                                       │
  └──────────────────────────────────────────────────────┘
```

---

## 6. Proactive Squatting Prevention at Scale

### 6.1 Popularity-Based Protection

Popular skills automatically get a "protection radius" — stricter similarity checks:

```python
def get_protection_radius(skill):
    """
    Higher download counts = larger protection zone.
    More variants are blocked/flagged for popular skills.
    """
    downloads = skill.total_downloads

    if downloads > 100_000:
        return {
            "levenshtein_block": 2,     # Block names within edit distance 2
            "levenshtein_flag": 3,      # Flag names within edit distance 3
            "block_prefixed": True,     # Block all "real-X", "official-X"
            "block_plurals": True,
        }
    elif downloads > 10_000:
        return {
            "levenshtein_block": 1,
            "levenshtein_flag": 2,
            "block_prefixed": True,
            "block_plurals": True,
        }
    elif downloads > 1_000:
        return {
            "levenshtein_block": 1,
            "levenshtein_flag": 2,
            "block_prefixed": False,    # Only flag, don't block
            "block_plurals": False,
        }
    else:
        return {
            "levenshtein_block": 1,
            "levenshtein_flag": 1,
            "block_prefixed": False,
            "block_plurals": False,
        }
```

### 6.2 Batch Squatting Detection

Detect users who register many names without publishing:

```python
def detect_batch_squatting(author_id):
    """
    Flag authors who seem to be hoarding names.
    """
    reservations = db.query("""
        SELECT COUNT(*) as count
        FROM name_reservations
        WHERE author_id = %s AND status = 'active'
    """, author_id)

    published = db.query("""
        SELECT COUNT(*) as count
        FROM skills
        WHERE author_id = %s AND status = 'active'
    """, author_id)

    # Red flag: many reservations, few publishes
    if reservations.count > 3 and published.count == 0:
        flag_for_review(author_id, "batch_squatting",
            f"{reservations.count} reservations, {published.count} published")

    # Red flag: published many empty/placeholder skills
    placeholder_skills = db.query("""
        SELECT COUNT(*) as count
        FROM skills s
        JOIN skill_versions sv ON s.id = sv.skill_id
        WHERE s.author_id = %s
          AND sv.package_size < 500    -- Less than 500 bytes
    """, author_id)

    if placeholder_skills.count > 2:
        flag_for_review(author_id, "placeholder_publishing",
            f"{placeholder_skills.count} skills under 500 bytes")
```

### 6.3 Minimum Content Requirements

A published skill must have actual content. Not just a name grab:

```python
MINIMUM_REQUIREMENTS = {
    "skill_md_min_bytes": 200,          # SKILL.md must be > 200 bytes
    "skill_md_min_lines": 10,           # At least 10 lines of content
    "description_min_length": 30,       # Description must be 30+ chars
    "must_have_instructions": True,     # SKILL.md must have content beyond frontmatter
}

def validate_not_placeholder(skill_dir):
    """Reject placeholder/empty skills."""
    skill_md = Path(skill_dir) / "SKILL.md"
    content = skill_md.read_text()

    # Strip frontmatter
    body = content.split("---", 2)[-1].strip() if "---" in content else content

    if len(body) < MINIMUM_REQUIREMENTS["skill_md_min_bytes"]:
        return False, "SKILL.md body is too short (needs actual instructions)"

    if body.count("\n") < MINIMUM_REQUIREMENTS["skill_md_min_lines"]:
        return False, "SKILL.md needs at least 10 lines of instructions"

    # Check for placeholder patterns
    placeholder_patterns = [
        r"^#\s*TODO",
        r"^#\s*Coming soon",
        r"^#\s*Work in progress",
        r"placeholder",
        r"will be added later",
    ]
    for pattern in placeholder_patterns:
        if re.search(pattern, body, re.IGNORECASE | re.MULTILINE):
            return False, f"SKILL.md appears to be a placeholder ({pattern})"

    return True, "Content check passed"
```

---

## 7. Backend: Name Management Tables

```sql
-- Name reservation (for spm reserve)
CREATE TABLE name_reservations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(64) UNIQUE NOT NULL,
    author_id       UUID NOT NULL REFERENCES authors(id),
    status          VARCHAR(16) DEFAULT 'active',
        -- 'active', 'published' (converted to skill), 'expired', 'released'
    expires_at      TIMESTAMPTZ NOT NULL,
    extended        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Name disputes
CREATE TABLE name_disputes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id      VARCHAR(32) UNIQUE NOT NULL,  -- e.g. DISPUTE-2026-0042

    skill_name      VARCHAR(64) NOT NULL,

    -- Claimant
    claimant_id     UUID REFERENCES authors(id),
    claimant_name   VARCHAR(128),
    claimant_email  VARCHAR(255) NOT NULL,
    claim_type      VARCHAR(32) NOT NULL,
        -- 'trademark', 'legitimate', 'typosquat_victim', 'impersonation'
    claim_evidence  TEXT,
    trademark_number VARCHAR(64),

    -- Current owner
    current_owner_id UUID REFERENCES authors(id),
    owner_response   TEXT,
    owner_responded_at TIMESTAMPTZ,

    -- Resolution
    status          VARCHAR(16) DEFAULT 'pending',
        -- 'pending', 'owner_notified', 'under_review',
        -- 'transferred', 'denied', 'withdrawn'
    resolved_by     UUID REFERENCES authors(id),  -- SPM team member
    resolution_notes TEXT,
    resolved_at     TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Flagged names awaiting manual review
CREATE TABLE name_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposed_name   VARCHAR(64) NOT NULL,
    author_id       UUID NOT NULL REFERENCES authors(id),

    flag_reasons    JSONB NOT NULL,  -- Array of issues from detector

    status          VARCHAR(16) DEFAULT 'pending',
        -- 'pending', 'approved', 'denied'
    reviewed_by     UUID REFERENCES authors(id),
    review_notes    TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ
);

-- Name change history (for audit)
CREATE TABLE name_transfers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name      VARCHAR(64) NOT NULL,
    from_author_id  UUID REFERENCES authors(id),
    to_author_id    UUID REFERENCES authors(id),
    reason          VARCHAR(32),  -- 'dispute', 'voluntary', 'dormant_release'
    dispute_id      UUID REFERENCES name_disputes(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast similarity checks
CREATE INDEX idx_skills_name_trgm ON skills USING gin (name gin_trgm_ops);
CREATE INDEX idx_reservations_active ON name_reservations (name)
    WHERE status = 'active';
CREATE INDEX idx_reservations_expires ON name_reservations (expires_at)
    WHERE status = 'active';
```

---

## 8. Automated Cleanup Jobs

```python
# Runs nightly via cron

async def cleanup_names():
    """Release expired reservations and dormant names."""

    # 1. Expire old reservations
    expired = await db.execute("""
        UPDATE name_reservations
        SET status = 'expired'
        WHERE status = 'active' AND expires_at < NOW()
        RETURNING name, author_id
    """)
    for row in expired:
        log.info(f"Released reservation: {row.name} (author: {row.author_id})")
        await notify_author(row.author_id,
            f"Your reservation for '{row.name}' has expired.")

    # 2. Warn dormant skills (12 months no downloads, no updates)
    dormant = await db.fetch("""
        SELECT s.id, s.name, s.author_id, s.updated_at, s.total_downloads
        FROM skills s
        WHERE s.status = 'active'
          AND s.total_downloads < 100
          AND s.updated_at < NOW() - INTERVAL '12 months'
          AND NOT EXISTS (
              SELECT 1 FROM downloads d
              WHERE d.skill_id = s.id
                AND d.created_at > NOW() - INTERVAL '12 months'
          )
          AND NOT EXISTS (
              SELECT 1 FROM name_dormancy_warnings w
              WHERE w.skill_id = s.id
                AND w.created_at > NOW() - INTERVAL '90 days'
          )
    """)

    for skill in dormant:
        await send_dormancy_warning(skill)
        await db.execute("""
            INSERT INTO name_dormancy_warnings (skill_id, expires_at)
            VALUES ($1, NOW() + INTERVAL '90 days')
        """, skill.id)

    # 3. Release names from skills that didn't respond to dormancy warning
    releases = await db.fetch("""
        SELECT w.skill_id, s.name, s.author_id
        FROM name_dormancy_warnings w
        JOIN skills s ON w.skill_id = s.id
        WHERE w.expires_at < NOW()
          AND w.status = 'warned'
          AND s.status = 'active'
          AND s.updated_at < w.created_at  -- No activity since warning
    """)

    for skill in releases:
        await db.execute("""
            UPDATE skills SET status = 'dormant' WHERE id = $1
        """, skill.skill_id)
        log.info(f"Released dormant name: {skill.name}")
        await notify_author(skill.author_id,
            f"'{skill.name}' has been released due to inactivity. "
            f"Your existing versions remain available.")

# Dormancy warnings table
# CREATE TABLE name_dormancy_warnings (
#     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
#     skill_id    UUID NOT NULL REFERENCES skills(id),
#     status      VARCHAR(16) DEFAULT 'warned',
#     expires_at  TIMESTAMPTZ NOT NULL,
#     created_at  TIMESTAMPTZ DEFAULT NOW()
# );
```

---

## 9. Summary: Layered Protection

```
┌─────────────────────────────────────────────────────────┐
│              Name Protection Layers                      │
│                                                         │
│  Layer 1: RESERVED NAMES (pre-populated)                │
│  ├── Platform names (claude, anthropic, openai...)      │
│  ├── SPM internal names (spm, spm-runtime...)           │
│  ├── Current built-in skill names (pdf, docx...)        │
│  └── Generic high-value names (core, utils, admin...)   │
│                                                         │
│  Layer 2: FORMAT RULES (instant validation)             │
│  ├── kebab-case, 2-64 chars, starts with letter        │
│  └── No consecutive hyphens, no leading/trailing hyphen │
│                                                         │
│  Layer 3: SIMILARITY DETECTION (automated)              │
│  ├── Normalized collision (remove hyphens)              │
│  ├── Unicode homograph detection                        │
│  ├── Levenshtein distance (typosquatting)               │
│  ├── Suspicious prefix/suffix (-official, real-, etc.)  │
│  └── Plural variant check                              │
│                                                         │
│  Layer 4: CONTENT REQUIREMENTS (on publish)             │
│  ├── SKILL.md minimum content (200 bytes, 10 lines)    │
│  ├── No placeholder patterns                           │
│  └── Real description (30+ chars)                      │
│                                                         │
│  Layer 5: BEHAVIORAL DETECTION (ongoing)                │
│  ├── Batch reservation flagging                        │
│  ├── Placeholder publishing detection                  │
│  └── Dormancy → name release after 12+3 months         │
│                                                         │
│  Layer 6: HUMAN REVIEW (escalation)                     │
│  ├── Flagged names reviewed by SPM team                │
│  ├── Trademark disputes                                │
│  └── Community reports                                  │
│                                                         │
│  Layer 7: POPULARITY PROTECTION (dynamic)               │
│  ├── Popular skills get wider similarity radius         │
│  └── High-download skills harder to typosquat          │
└─────────────────────────────────────────────────────────┘
```
