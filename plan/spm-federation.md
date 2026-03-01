# SPM Federation

## How Multiple Registries Coexist and Sync

---

## 1. Why Federation Matters

```
Without federation:
  Company A runs private registry → can't use public skills
  Company B runs private registry → can't share with Company A
  Community fork of SPM → ecosystem splits
  Regional mirror → gets stale

With federation:
  Company A's private registry pulls from public seamlessly
  Company B shares selected skills with Company A
  Mirrors stay in sync automatically
  Ecosystem stays unified even with multiple registries
```

---

## 2. Federation Models

```
┌──────────────────────────────────────────────────────────┐
│                  Federation Topology                      │
│                                                          │
│  Model 1: HUB AND SPOKE (recommended for launch)        │
│                                                          │
│          ┌──────────────────┐                            │
│          │  Public Registry  │                            │
│          │  registry.spm.dev │                            │
│          └────────┬─────────┘                            │
│           ┌───────┼───────┐                              │
│           │       │       │                              │
│     ┌─────▼──┐ ┌──▼────┐ ┌▼───────┐                    │
│     │Company │ │Company│ │Regional│                      │
│     │A       │ │B      │ │Mirror  │                      │
│     │(pulls) │ │(pulls)│ │(pulls) │                      │
│     └────────┘ └───────┘ └────────┘                      │
│                                                          │
│  Model 2: MESH (future, if needed)                       │
│                                                          │
│     ┌────────┐     ┌────────┐                            │
│     │Registry│◄───►│Registry│                            │
│     │   A    │     │   B    │                            │
│     └───┬────┘     └────┬───┘                            │
│         │               │                                │
│         └───────┬───────┘                                │
│           ┌─────▼─────┐                                  │
│           │ Registry  │                                  │
│           │    C      │                                  │
│           └───────────┘                                  │
│                                                          │
│  Model 3: PROXY (simplest for enterprises)               │
│                                                          │
│     User ──► Company Proxy ──► Public Registry           │
│              (filters, caches,   (source of truth)       │
│               adds private)                              │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Hub and Spoke (Launch Model)

The public registry is the hub. Private registries pull from it.

### 3.1 How It Works

```
┌──────────────────────────────────────────────────────────┐
│  Company A's Private Registry                             │
│                                                          │
│  Skills available:                                       │
│  ├── @company-a/internal-report  (private, local only)   │
│  ├── @company-a/branding         (private, local only)   │
│  ├── pdf@1.0.0                   (mirrored from public)  │
│  ├── docx@1.0.0                  (mirrored from public)  │
│  └── data-viz@1.2.0              (mirrored from public)  │
│                                                          │
│  Sync config:                                            │
│  ├── Upstream: registry.spm.dev                          │
│  ├── Mode: selective (allowlist)                         │
│  ├── Schedule: every 6 hours                             │
│  └── Auto-approve: trust_level >= "verified"             │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Sync Configuration

```yaml
# Private registry config: federation.yml

federation:
  enabled: true
  role: spoke # This registry pulls from a hub

  upstream:
    url: https://registry.spm.dev/api/v1
    auth: none # Public registry, no auth needed

  sync:
    mode: selective # "all", "selective", "none"
    schedule: '0 */6 * * *' # Every 6 hours (cron)

    # Only mirror skills matching these criteria
    allowlist:
      categories: ['data', 'code', 'writing', 'design']
      trust_levels: ['official', 'verified']
      min_downloads: 100 # Skip obscure skills
      # OR explicit skill list:
      # skills: ["pdf", "docx", "data-viz", "frontend-design"]

    # Never mirror these
    blocklist:
      skills: ['some-banned-skill']
      authors: ['untrusted-author']

    # What to sync
    include:
      packages: true # Download .skl files
      signatures: true # Include signatures
      metadata: true # Skill info, versions
      reviews: false # Don't sync community reviews

    # Security
    verify_signatures: true
    require_scan_passed: true
    re_scan_locally: true # Run our own security scan too

  # What this registry shares back (if anything)
  publish_upstream: false # Private skills stay private
```

### 3.3 Sync Process

```python
class FederationSync:
    """Syncs skills from upstream registry to local."""

    async def sync(self):
        """Run a federation sync cycle."""
        config = load_federation_config()

        if not config["enabled"]:
            return

        log.info("Starting federation sync from %s", config["upstream"]["url"])

        # 1. Fetch upstream catalog
        upstream_skills = await self.fetch_upstream_catalog()

        # 2. Filter by allowlist/blocklist
        filtered = self.apply_filters(upstream_skills, config["sync"])

        # 3. Compare with local state
        to_add, to_update, to_remove = await self.diff_with_local(filtered)

        log.info("Sync plan: %d new, %d updates, %d removals",
                 len(to_add), len(to_update), len(to_remove))

        # 4. Download and verify new/updated packages
        for skill in to_add + to_update:
            try:
                await self.sync_skill(skill, config)
            except Exception as e:
                log.error("Failed to sync %s: %s", skill["name"], e)
                continue

        # 5. Remove skills no longer in upstream (optional)
        if config["sync"].get("remove_stale", False):
            for skill in to_remove:
                await self.remove_local(skill)

        # 6. Update sync metadata
        await self.update_sync_state(
            last_sync=datetime.utcnow(),
            skills_synced=len(to_add) + len(to_update),
            errors=self.error_count
        )

    async def fetch_upstream_catalog(self):
        """Get list of all skills from upstream."""
        all_skills = []
        page = 1

        while True:
            response = await self.http.get(
                f"{self.upstream_url}/skills",
                params={"page": page, "limit": 100, "sort": "name"}
            )
            data = response.json()
            all_skills.extend(data["results"])

            if page >= data["pages"]:
                break
            page += 1

        return all_skills

    def apply_filters(self, skills, sync_config):
        """Apply allowlist and blocklist filters."""
        filtered = []

        for skill in skills:
            # Blocklist check
            if skill["name"] in sync_config.get("blocklist", {}).get("skills", []):
                continue
            if skill["author"] in sync_config.get("blocklist", {}).get("authors", []):
                continue

            allowlist = sync_config.get("allowlist", {})

            # Category filter
            if "categories" in allowlist:
                if skill.get("category") not in allowlist["categories"]:
                    continue

            # Trust level filter
            if "trust_levels" in allowlist:
                author_trust = "verified" if skill.get("author_verified") else "unverified"
                if skill.get("is_official"):
                    author_trust = "official"
                if author_trust not in allowlist["trust_levels"]:
                    continue

            # Download threshold
            if "min_downloads" in allowlist:
                if skill.get("downloads", 0) < allowlist["min_downloads"]:
                    continue

            # Explicit skill list (if provided, overrides other filters)
            if "skills" in allowlist:
                if skill["name"] not in allowlist["skills"]:
                    continue

            filtered.append(skill)

        return filtered

    async def sync_skill(self, skill, config):
        """Download and verify a single skill."""
        name = skill["name"]
        version = skill["version"]

        # Download .skl package
        download_url = f"{self.upstream_url}/skills/{name}/{version}/download"
        package = await self.http.get(download_url, follow_redirects=True)

        # Verify checksum
        actual_checksum = hashlib.sha256(package.content).hexdigest()
        if actual_checksum != skill.get("checksum"):
            raise IntegrityError(f"Checksum mismatch for {name}@{version}")

        # Verify signature (if required)
        if config["sync"].get("verify_signatures"):
            sig_url = f"{self.upstream_url}/skills/{name}/{version}/signature"
            sig = await self.http.get(sig_url)
            if not verify_sigstore(package.content, sig.content):
                raise SignatureError(f"Signature invalid for {name}@{version}")

        # Re-scan locally (if required)
        if config["sync"].get("re_scan_locally"):
            temp_dir = extract_skl(package.content)
            scan_result = security_scanner.scan(temp_dir)
            if scan_result.has_blocks:
                raise SecurityError(
                    f"Local scan failed for {name}@{version}: {scan_result.summary}"
                )

        # Store locally
        await self.store_package(name, version, package.content)
        await self.update_local_metadata(name, version, skill)

        log.info("Synced %s@%s from upstream", name, version)
```

---

## 4. Proxy Mode (Simplest for Enterprises)

Instead of running a full registry, companies can run a thin proxy that adds private skills to the public namespace.

```
┌────────────────────────────────────────────────────────┐
│                    Proxy Mode                           │
│                                                        │
│  User: spm install pdf                                 │
│        │                                               │
│        ▼                                               │
│  Company Proxy (spm-proxy)                             │
│        │                                               │
│        ├── Is "pdf" a private skill? ──── Yes ──► Serve│
│        │                                     from local│
│        │                                               │
│        └── No ──► Forward to registry.spm.dev          │
│                   Cache response                       │
│                   Serve to user                        │
│                                                        │
│  Config: ~/.spm/config.json                            │
│  {                                                     │
│    "registry": "https://spm-proxy.internal:3000",      │
│    "fallback": "https://registry.spm.dev"              │
│  }                                                     │
└────────────────────────────────────────────────────────┘
```

```javascript
// spm-proxy: minimal Express server

const express = require('express');
const httpProxy = require('http-proxy-middleware');
const app = express();

const PRIVATE_SKILLS_DIR = '/opt/spm/private-skills/';
const PUBLIC_REGISTRY = 'https://registry.spm.dev';

// Check local first, then proxy to public
app.get('/api/v1/skills/:name', (req, res, next) => {
  const localPath = path.join(PRIVATE_SKILLS_DIR, req.params.name);

  if (fs.existsSync(localPath)) {
    // Serve from local private registry
    return serveLocalSkill(req, res, localPath);
  }

  // Forward to public registry
  next();
});

app.get('/api/v1/skills/:name/:version/download', (req, res, next) => {
  const localPath = path.join(
    PRIVATE_SKILLS_DIR,
    req.params.name,
    `${req.params.name}-${req.params.version}.skl`,
  );

  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  next();
});

// Search: merge local + public results
app.get('/api/v1/skills', async (req, res) => {
  const localResults = searchLocalSkills(req.query.q);

  const publicResponse = await fetch(
    `${PUBLIC_REGISTRY}/api/v1/skills?${new URLSearchParams(req.query)}`,
  );
  const publicResults = await publicResponse.json();

  // Merge, dedup (local wins on name collision)
  const merged = mergeResults(localResults, publicResults.results);

  res.json({
    results: merged,
    total: merged.length,
    sources: ['private', 'public'],
  });
});

// Everything else: proxy to public
app.use(
  '/api/v1',
  httpProxy.createProxyMiddleware({
    target: PUBLIC_REGISTRY,
    changeOrigin: true,
  }),
);

app.listen(3000);
```

---

## 5. Scopes, Privacy, and Authentication

### 5.1 What `@scope` Means (and Doesn't Mean)

The `@` prefix means **"this skill belongs to a namespace"** — it does NOT mean private.

```
@almog/data-viz         → Public skill, almog's namespace, on public registry
@acme/internal-tool     → Private skill, on acme's private registry
@anthropic/pdf          → Public skill, official Anthropic namespace
data-viz                → Unscoped community skill, on public registry
```

Whether a skill is private depends on **the registry it lives on**, not the `@` prefix. The scope just determines which registry the CLI talks to.

```
Naming rules:
  my-skill              → unscoped, routes to default (public) registry
  @org/my-skill         → scoped, routes to whatever registry @org maps to
  @almog/my-skill       → personal namespace (public or private, depends on registry)
  @acme/my-skill        → company namespace (public or private, depends on registry)

NOT supported:
  org/my-skill           → ambiguous (directory? org? category?)
  acme:my-skill          → non-standard
  my-skill@acme          → confusing with version syntax
```

### 5.2 Private Registry Authentication

The public registry controls access to public skills. Private registries control their own access. SPM CLI just needs to know how to authenticate.

```
┌─────────────────────────────────────────────────────────┐
│           Who Controls Access?                           │
│                                                         │
│  Public registry (registry.spm.dev):                    │
│    → Open to everyone. No auth for read/install.        │
│    → Auth only required for publishing.                 │
│    → SPM team manages this.                             │
│                                                         │
│  Private registry (spm.acme.com):                       │
│    → Acme controls who gets in.                         │
│    → Acme's server, Acme's auth, Acme's rules.         │
│    → SPM CLI just sends whatever token Acme requires.   │
│    → SPM has zero authority over private registries.     │
└─────────────────────────────────────────────────────────┘
```

#### CLI Auth Flow

```bash
# Configure auth for a private registry
$ spm registry login @acme

  ? Authentication method for spm.acme.com:
    ❯ OAuth / SSO (redirects to company login)
      API token
      Basic auth (username/password)

  Opening browser for SSO...
  ✓ Authenticated to @acme registry
  ✓ Token saved to ~/.spm/credentials.json
```

The token is stored per-registry:

```json
// ~/.spm/credentials.json (encrypted at rest)
{
  "registries": {
    "default": {
      "url": "https://registry.spm.dev/api/v1",
      "auth": null
    },
    "@acme": {
      "url": "https://spm.acme.com/api/v1",
      "auth": {
        "type": "oauth",
        "token": "encrypted_...",
        "refresh_token": "encrypted_...",
        "expires_at": "2026-03-27T10:00:00Z"
      }
    },
    "@partner": {
      "url": "https://spm.partner.io/api/v1",
      "auth": {
        "type": "api_token",
        "token": "encrypted_..."
      }
    }
  }
}
```

When the CLI fetches a scoped skill, it attaches the correct auth:

```
# Unauthenticated (public)
GET https://registry.spm.dev/api/v1/skills/data-viz/1.0.0/download

# Authenticated (private)
GET https://spm.acme.com/api/v1/skills/@acme/internal-tool/1.0.0/download
Authorization: Bearer <acme_token>
```

Missing, expired, or invalid token → server returns 401 → CLI prompts re-login:

```bash
$ spm install @acme/internal-tool

  ❌ Authentication required for @acme registry
     Run: spm registry login @acme
```

#### Supported Auth Methods

SPM CLI supports these out of the box. Private registries pick whichever they want:

```
OAuth / SSO:     Browser redirect, token exchange (OIDC)
                 Best for: companies with Okta, Azure AD, Google Workspace

API Token:       Static token, generated in registry dashboard
                 Best for: CI/CD, service accounts, simple setups

Basic Auth:      Username + password
                 Best for: quick internal setups (not recommended for production)

Mutual TLS:      Client certificate authentication
                 Best for: high-security environments, machine-to-machine
```

#### Self-Hosted Registry RBAC

SPM's self-hosted registry template includes basic role-based access control:

```
Viewer:      can search + install
Publisher:   can search + install + publish
Admin:       can search + install + publish + manage users + manage policies
```

Companies can replace this with their own auth middleware. The registry is just a server — they control the door. SPM CLI just needs to know how to knock.

### 5.3 Scoped Registries (npm-style)

Different scopes resolve to different registries. No federation protocol needed — just smart routing.

```json
// ~/.spm/config.json
{
  "registries": {
    "default": "https://registry.spm.dev/api/v1",
    "@acme": "https://spm.acme.com/api/v1",
    "@partner": "https://spm.partner.io/api/v1"
  }
}
```

```bash
# Install routes to the right registry automatically
$ spm install data-viz              # → registry.spm.dev
$ spm install @acme/internal-tool   # → spm.acme.com
$ spm install @partner/connector    # → spm.partner.io

# Search can span registries
$ spm search "report" --all-registries

  Public (registry.spm.dev):
    📦 report-builder v1.2.0 (★4.5, 2.1k downloads)
    📦 pdf-report v1.0.0 (★4.2, 890 downloads)

  @acme (spm.acme.com):
    📦 @acme/quarterly-report v3.0.0 (internal)
    📦 @acme/client-report v2.1.0 (internal)

  @partner (spm.partner.io):
    📦 @partner/compliance-report v1.0.0
```

```python
# CLI: resolve registry from skill name

def resolve_registry(skill_name: str) -> str:
    """Determine which registry to query for a skill."""
    config = load_config()
    registries = config.get("registries", {})

    # Check for scope prefix
    if skill_name.startswith("@"):
        scope = skill_name.split("/")[0]  # "@acme"
        if scope in registries:
            return registries[scope]
        raise RegistryError(
            f"No registry configured for scope '{scope}'. "
            f"Add it: spm config set registries.{scope} https://..."
        )

    # Default registry
    return registries.get("default", "https://registry.spm.dev/api/v1")
```

---

## 6. Regional Mirrors

For performance and compliance (data residency), SPM can have read-only mirrors.

```
┌──────────────────────────────────────────────────────────┐
│                  Mirror Topology                          │
│                                                          │
│     ┌──────────┐                                        │
│     │  Primary  │ registry.spm.dev (US-East)             │
│     │  Registry │ Source of truth for all writes          │
│     └────┬─────┘                                        │
│          │                                               │
│     ┌────┼──────────────────┐                            │
│     │    │                  │                             │
│  ┌──▼──────┐  ┌──────────┐  ┌──────────┐               │
│  │EU Mirror │  │APAC      │  │US-West   │               │
│  │Frankfurt │  │Mirror    │  │Mirror    │               │
│  │(read)    │  │Singapore │  │(read)    │               │
│  └──────────┘  │(read)    │  └──────────┘               │
│                └──────────┘                              │
│                                                          │
│  Writes: always go to primary                            │
│  Reads: routed to nearest mirror via CDN/GeoDNS          │
│  Sync: real-time replication or 5-minute delay            │
└──────────────────────────────────────────────────────────┘
```

```yaml
# Mirror config
mirror:
  role: mirror
  primary: https://registry.spm.dev
  region: eu-west-1

  sync:
    mode: all # Mirror everything
    method: streaming # Real-time via change stream
    # OR
    # method: polling
    # interval: 300        # Every 5 minutes

  storage:
    packages: s3://spm-mirror-eu/packages/
    database: postgres://mirror-eu.rds.amazonaws.com/spm

  read_only: true # This mirror never accepts publishes
  redirect_writes: https://registry.spm.dev
```

---

## 7. Cross-Registry Skill Dependencies

A skill in one registry can depend on a skill in another:

```json
// @acme/internal-report manifest.json
{
  "name": "@acme/internal-report",
  "dependencies": {
    "skills": {
      "pdf": "^1.0.0", // From public registry
      "@acme/branding": "^2.0.0", // From company registry
      "@partner/data-feed": "^1.0.0" // From partner registry
    }
  }
}
```

Resolution at install time:

```bash
$ spm install @acme/internal-report

  Resolving dependencies...
    @acme/internal-report@3.0.0  ← spm.acme.com
    ├── pdf@1.0.0                ← registry.spm.dev (public)
    ├── @acme/branding@2.1.0     ← spm.acme.com (private)
    └── @partner/data-feed@1.0.0 ← spm.partner.io

  Installing from 3 registries...
    ✓ pdf@1.0.0 (public, cached)
    ✓ @acme/branding@2.1.0 (private)
    ✓ @partner/data-feed@1.0.0 (partner)
    ✓ @acme/internal-report@3.0.0 (private)

  ✅ Installed with cross-registry dependencies
```

---

## 8. Federation API Endpoints

Endpoints that registries expose for federation:

```yaml
# Federation-specific API endpoints

# Catalog endpoint — returns all skills with metadata
GET /api/v1/federation/catalog
  Query params:
    since: ISO datetime (only skills updated after this time)
    page, limit: pagination
  Response:
    {
      "skills": [
        {
          "name": "data-viz",
          "latest_version": "1.2.0",
          "versions": ["1.0.0", "1.1.0", "1.2.0"],
          "checksum": "sha256:...",
          "updated_at": "2026-02-27T...",
          "author_verified": true,
          "category": "data",
          "downloads": 12400
        }
      ],
      "total": 1247,
      "sync_token": "abc123..."  # For incremental sync
    }

# Incremental changes since last sync
GET /api/v1/federation/changes
  Query params:
    sync_token: from previous catalog/changes call
  Response:
    {
      "changes": [
        {"action": "published", "skill": "new-skill", "version": "1.0.0"},
        {"action": "updated", "skill": "data-viz", "version": "1.3.0"},
        {"action": "yanked", "skill": "bad-skill", "version": "1.0.0"},
        {"action": "deprecated", "skill": "old-tool"}
      ],
      "sync_token": "def456..."
    }

# Health check for federation monitoring
GET /api/v1/federation/health
  Response:
    {
      "status": "healthy",
      "role": "hub",            # or "spoke", "mirror", "proxy"
      "skills_count": 1247,
      "last_publish": "2026-02-27T...",
      "version": "1.0.0"
    }
```

---

## 9. Security in Federation

```
┌──────────────────────────────────────────────────────────┐
│              Federation Security Rules                    │
│                                                          │
│  1. TRUST BOUNDARIES                                     │
│     Private registries NEVER auto-publish to public      │
│     Public skills pulled into private are RE-SCANNED     │
│     Cross-registry deps are verified independently       │
│                                                          │
│  2. PACKAGE INTEGRITY                                    │
│     Checksums verified on every sync                     │
│     Signatures verified if present                       │
│     Tampered packages rejected and logged                │
│                                                          │
│  3. SYNC AUTHENTICATION                                  │
│     Public → Private: API key or OAuth                   │
│     Private → Private: mutual TLS or API key             │
│     Mirrors: read-only token from primary                │
│                                                          │
│  4. ACCESS CONTROL                                       │
│     Public registry: open read, auth for publish         │
│     Private registry: server owner controls all access   │
│     SPM CLI: attaches per-registry tokens automatically  │
│     Expired/missing token: 401 → prompt re-login         │
│                                                          │
│  5. DATA ISOLATION                                       │
│     Private skill metadata never leaks to public         │
│     Analytics from private registries stay private        │
│     User data never crosses registry boundaries          │
│                                                          │
│  6. SUPPLY CHAIN PROTECTION                              │
│     Dependency confusion: scoped names prevent it        │
│     (@acme/utils can't be squatted on public registry)   │
│     Upstream compromise: local re-scan catches it        │
│     Stale mirror: version pinning via skills.lock        │
└──────────────────────────────────────────────────────────┘
```

Dependency confusion prevention (the big one):

```python
def check_dependency_confusion(skill_name: str, registries: dict):
    """
    Prevent dependency confusion attacks where a public package
    has the same name as a private one.
    """
    # Scoped packages (@acme/tool) are safe — scope determines registry
    if skill_name.startswith("@"):
        return True

    # Unscoped packages: check if it exists in multiple registries
    found_in = []
    for registry_name, registry_url in registries.items():
        if skill_exists(skill_name, registry_url):
            found_in.append(registry_name)

    if len(found_in) > 1:
        # Exists in both public and private — dangerous!
        raise DependencyConfusionWarning(
            f"'{skill_name}' exists in multiple registries: {found_in}. "
            f"Use a scoped name (@scope/{skill_name}) to be explicit, "
            f"or pin the source in skills.json."
        )

    return True
```

---

## 10. Priority for Implementation

```
DAY 1 (Launch):
  ✓ Scoped registries in config (~/.spm/config.json)
  ✓ CLI routes to correct registry by scope
  ✓ Cross-registry dependencies resolve correctly

  This is just config + routing. No sync protocol needed.

PHASE 2 (When enterprise customers ask):
  ✓ Proxy mode (simplest private registry)
  ✓ Federation catalog + changes API
  ✓ Selective sync (hub and spoke)

PHASE 3 (At scale):
  ✓ Regional mirrors
  ✓ Real-time sync
  ✓ Full mesh federation (if demand exists)
```

Scoped registries solve 80% of the federation need with almost zero infrastructure. A company just points `@acme` at their server and everything works. Full sync protocol is only needed when they want to cache public skills locally.
