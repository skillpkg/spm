# SPM CI/CD Integration

GitHub Actions workflows for installing and publishing skills in CI pipelines.

---

## 1. Overview

Two official GitHub Actions:

| Action                     | Purpose                         | When                  |
| -------------------------- | ------------------------------- | --------------------- |
| `spm-registry/setup-spm`   | Install SPM CLI + restore cache | Every CI run          |
| `spm-registry/publish-spm` | Publish a skill to the registry | On release / tag push |

Plus reusable workflow patterns for testing, security scanning, and automated version bumps.

---

## 2. Setup Action

### spm-registry/setup-spm

Installs the SPM CLI and optionally authenticates + restores the skill cache.

```yaml
- uses: spm-registry/setup-spm@v1
  with:
    # SPM CLI version (default: latest)
    version: 'latest'

    # Auth token for publish/private skills (optional)
    # Store as GitHub secret: Settings → Secrets → SPM_TOKEN
    token: ${{ secrets.SPM_TOKEN }}

    # Restore cached skills from previous runs (default: true)
    cache: true
```

**What it does:**

1. Installs `spm` globally via npm
2. Creates `~/.spm/config.toml` with registry URL
3. If `token` provided: writes auth token to config
4. If `cache: true`: restores `~/.spm/skills/` from GitHub Actions cache (keyed on `skills-lock.json` hash)

---

## 3. Install in CI

### Basic: Install project skills

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: spm-registry/setup-spm@v1

      - name: Install skills
        run: spm install

      - name: Run tests
        run: npm test
```

`spm install` reads `skills.json` and installs all dependencies, just like `npm install` reads `package.json`.

### With skill-specific tests

```yaml
- name: Install skills
  run: spm install

- name: Test skills work
  run: spm test --all

- name: Security scan installed skills
  run: spm audit
```

`spm test --all` runs eval.json test cases for every installed skill. `spm audit` checks all installed skills against the latest security scan results from the registry.

### Cache strategy

The setup action caches `~/.spm/skills/` keyed on the hash of `skills-lock.json`. This means:

- Same lock file → cache hit → instant install (no downloads)
- Lock file changed → cache miss → fresh download + new cache stored

```yaml
- uses: spm-registry/setup-spm@v1
  with:
    cache: true # default, uses skills-lock.json hash as key
```

For monorepos with multiple `skills.json` files:

```yaml
- uses: spm-registry/setup-spm@v1
  with:
    cache: true
    cache-dependency-path: |
      apps/web/skills-lock.json
      apps/api/skills-lock.json
```

---

## 4. Publish Action

### spm-registry/publish-spm

Publishes a skill to the SPM registry. Handles packing, scanning, signing, and uploading.

```yaml
- uses: spm-registry/publish-spm@v1
  with:
    # Auth token (required)
    token: ${{ secrets.SPM_TOKEN }}

    # Working directory containing manifest.json (default: .)
    directory: '.'

    # Fail the workflow if scan flags the skill (default: true)
    fail-on-flag: true

    # Sign with Sigstore using GitHub OIDC (default: true)
    sign: true
```

**What it does:**

1. Reads `manifest.json` from the working directory
2. Runs `spm pack` to create the `.skl` archive
3. Runs local Layer 1 security scan (fast, catches obvious issues before upload)
4. If `sign: true`: signs the package via Sigstore using the GitHub Actions OIDC token (keyless — the signer identity is `repo:<owner>/<repo>` which is even stronger than personal GitHub identity)
5. Uploads to registry via `POST /skills` (server runs full 3-layer scan)
6. Reports results: published, held, or blocked
7. If `fail-on-flag: true` and skill is held/blocked: exits with non-zero code, failing the workflow

---

## 5. Workflow Patterns

### 5a. Publish on GitHub Release

The most common pattern. Create a GitHub release → skill gets published to SPM.

```yaml
name: Publish to SPM
on:
  release:
    types: [published]

permissions:
  id-token: write # Required for Sigstore OIDC signing
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: spm-registry/setup-spm@v1
        with:
          token: ${{ secrets.SPM_TOKEN }}

      - name: Verify version matches release tag
        run: |
          MANIFEST_VERSION=$(spm version --current)
          TAG_VERSION="${{ github.event.release.tag_name }}"
          TAG_VERSION="${TAG_VERSION#v}"  # strip leading 'v'
          if [ "$MANIFEST_VERSION" != "$TAG_VERSION" ]; then
            echo "::error::Version mismatch: manifest.json=$MANIFEST_VERSION, tag=$TAG_VERSION"
            exit 1
          fi

      - name: Run skill tests
        run: spm test

      - uses: spm-registry/publish-spm@v1
        with:
          token: ${{ secrets.SPM_TOKEN }}
          sign: true
```

### 5b. Publish on Tag Push

Alternative: publish when a version tag is pushed.

```yaml
name: Publish to SPM
on:
  push:
    tags: ['v*.*.*']

permissions:
  id-token: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: spm-registry/setup-spm@v1
        with:
          token: ${{ secrets.SPM_TOKEN }}

      - name: Run tests
        run: spm test

      - uses: spm-registry/publish-spm@v1
        with:
          token: ${{ secrets.SPM_TOKEN }}
```

### 5c. PR Validation

Run security scans on every PR that modifies skill content. Catch issues before merge.

```yaml
name: Skill PR Check
on:
  pull_request:
    paths:
      - 'SKILL.md'
      - 'scripts/**'
      - 'manifest.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: spm-registry/setup-spm@v1

      - name: Validate manifest
        run: spm validate

      - name: Local security scan
        run: spm test --security

      - name: Dry-run publish
        run: spm publish --dry-run
```

`spm validate` checks manifest.json structure, semver validity, category existence, required fields. `spm test --security` runs Layer 1 regex patterns locally (fast, no API call). `spm publish --dry-run` does everything except the actual upload — packs, scans, shows what would happen.

### 5d. Automated Version Bump

Auto-bump version on merge to main, then publish.

```yaml
name: Auto Version + Publish
on:
  push:
    branches: [main]
    paths:
      - 'SKILL.md'
      - 'scripts/**'

permissions:
  id-token: write
  contents: write # needed for git push

jobs:
  version-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: spm-registry/setup-spm@v1
        with:
          token: ${{ secrets.SPM_TOKEN }}

      - name: Bump patch version
        run: |
          spm version patch
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add manifest.json
          git commit -m "chore: bump version to $(spm version --current)"
          git push

      - uses: spm-registry/publish-spm@v1
        with:
          token: ${{ secrets.SPM_TOKEN }}
          sign: true
```

### 5e. Multi-Skill Monorepo

For repos containing multiple skills (like `vercel-labs/agent-skills`).

```yaml
name: Publish Changed Skills
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      skills: ${{ steps.changes.outputs.skills }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - id: changes
        run: |
          CHANGED=$(git diff --name-only HEAD~1 HEAD | grep "^skills/" | cut -d/ -f2 | sort -u | jq -R -s -c 'split("\n") | map(select(. != ""))')
          echo "skills=$CHANGED" >> $GITHUB_OUTPUT

  publish:
    needs: detect-changes
    if: needs.detect-changes.outputs.skills != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        skill: ${{ fromJson(needs.detect-changes.outputs.skills) }}
    steps:
      - uses: actions/checkout@v4

      - uses: spm-registry/setup-spm@v1
        with:
          token: ${{ secrets.SPM_TOKEN }}

      - uses: spm-registry/publish-spm@v1
        with:
          token: ${{ secrets.SPM_TOKEN }}
          directory: skills/${{ matrix.skill }}
          sign: true
```

This detects which skill directories changed in the last commit and publishes only those — each as a parallel job.

### 5f. Scheduled Security Re-Scan

Weekly re-scan of your published skills against the latest threat patterns.

```yaml
name: Weekly Security Audit
on:
  schedule:
    - cron: '0 9 * * 1' # Monday 9am UTC

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: spm-registry/setup-spm@v1
        with:
          token: ${{ secrets.SPM_TOKEN }}

      - name: Audit all published skills
        run: spm audit --published --verbose

      - name: Notify on issues
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {"text": "⚠️ SPM security audit found issues in published skills. Check: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 6. Environment Variables

The SPM CLI respects these environment variables in CI:

| Variable        | Purpose                                               | Example                           |
| --------------- | ----------------------------------------------------- | --------------------------------- |
| `SPM_TOKEN`     | Auth token (alternative to `--token` flag)            | `spm_eyJhbG...`                   |
| `SPM_REGISTRY`  | Custom registry URL                                   | `https://registry.spm.dev/api/v1` |
| `SPM_CACHE_DIR` | Custom cache directory                                | `/tmp/spm-cache`                  |
| `CI`            | Auto-detected; enables non-interactive mode           | `true` (set by GitHub Actions)    |
| `NO_COLOR`      | Disable colored output                                | `1`                               |
| `SPM_LOG_LEVEL` | Verbosity: `silent`, `error`, `warn`, `info`, `debug` | `info`                            |

When `CI=true` (auto-set by GitHub Actions), SPM:

- Never prompts for input (auto-accepts defaults)
- Uses `--json` output format for structured logs
- Skips spinner animations
- Exits with non-zero code on any warning (strict mode)

---

## 7. Sigstore Signing in CI

GitHub Actions has native OIDC support, which makes Sigstore signing seamless.

**How it works:**

1. Workflow declares `permissions: id-token: write`
2. GitHub Actions provides an OIDC token scoped to the repo
3. SPM exchanges this token with Fulcio (Sigstore CA) for an ephemeral signing certificate
4. The certificate identity is `https://github.com/<owner>/<repo>/.github/workflows/<workflow>.yml@refs/tags/<tag>` — this ties the signature to a specific repo and workflow, not a person
5. Package hash is signed and recorded on Rekor transparency log

**Why this is better than personal signing:**

- No key management
- Identity is the _repo + workflow_, not an individual — survives team changes
- Verifiable: anyone can confirm "this package was built by this CI workflow from this repo"
- Tamper-evident: Rekor provides an immutable public log

**Verification on install:**

```
spm install data-viz

  ✓ Signed by: github.com/almog/data-viz/.github/workflows/publish.yml
  ✓ Rekor entry: https://rekor.sigstore.dev/api/v1/log/entries/...
  ✓ Checksum verified
```

---

## 8. Outputs

The publish action exports outputs for use in subsequent steps:

```yaml
- uses: spm-registry/publish-spm@v1
  id: publish
  with:
    token: ${{ secrets.SPM_TOKEN }}

- name: Post-publish
  run: |
    echo "Published: ${{ steps.publish.outputs.name }}@${{ steps.publish.outputs.version }}"
    echo "Status: ${{ steps.publish.outputs.status }}"
    echo "URL: ${{ steps.publish.outputs.url }}"
    echo "Checksum: ${{ steps.publish.outputs.checksum }}"
```

| Output      | Description                    | Example                           |
| ----------- | ------------------------------ | --------------------------------- |
| `name`      | Skill name                     | `data-viz`                        |
| `version`   | Published version              | `1.2.3`                           |
| `status`    | `published`, `held`, `blocked` | `published`                       |
| `url`       | Registry URL                   | `https://spm.dev/skills/data-viz` |
| `checksum`  | SHA256 of .skl                 | `a1b2c3d4...`                     |
| `signer`    | Sigstore signer identity       | `github.com/almog/data-viz/...`   |
| `rekor_url` | Rekor transparency log entry   | `https://rekor.sigstore.dev/...`  |

---

## 9. Complete Example: Full Skill Repo

A complete GitHub repo structure for a skill with CI/CD:

```
my-skill/
├── .github/
│   └── workflows/
│       ├── ci.yml          # PR validation
│       └── publish.yml     # Publish on release
├── manifest.json
├── SKILL.md
├── scripts/
│   └── analyze.py
├── eval.json               # Test cases
├── skills.json             # Skill dependencies (if any)
├── skills-lock.json        # Lock file
├── LICENSE
└── README.md
```

**ci.yml:**

```yaml
name: CI
on:
  pull_request:
    paths: ['SKILL.md', 'scripts/**', 'manifest.json']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: spm-registry/setup-spm@v1
      - run: spm validate
      - run: spm test
      - run: spm test --security
      - run: spm publish --dry-run
```

**publish.yml:**

```yaml
name: Publish
on:
  release:
    types: [published]

permissions:
  id-token: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: spm-registry/setup-spm@v1
        with:
          token: ${{ secrets.SPM_TOKEN }}
      - run: spm test
      - uses: spm-registry/publish-spm@v1
        id: pub
        with:
          token: ${{ secrets.SPM_TOKEN }}
          sign: true
      - run: echo "Published ${{ steps.pub.outputs.name }}@${{ steps.pub.outputs.version }}"
```
