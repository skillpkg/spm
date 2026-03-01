# Skill Authoring Flow — From Idea to Published Skill

---

## 1. The Full Author Journey

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  spm init │──►│  Develop  │──►│  Test    │──►│  Pack    │──►│  Publish │
│           │   │  & Write  │   │  & Eval  │   │  & Sign  │   │          │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
    │               │               │               │               │
    ▼               ▼               ▼               ▼               ▼
  Scaffold       SKILL.md        Local          .skl file       Registry
  project        + scripts       testing        + signature     listing
```

---

## 2. `spm init` — Scaffolding

### Interactive Wizard

```bash
$ mkdir my-skill && cd my-skill
$ spm init

🔧 Create a new skill

  ? Skill name (kebab-case): data-viz
  ? Description (what triggers this skill):
    > Create publication-quality charts and dashboards from data files
  ? Category:
    ❯ documents
      data-viz
      frontend
      backend
      infra
      testing
      code-quality
      security
      productivity
      other
  ? Will this skill include scripts? (Y/n): Y
  ? Primary script language:
    ❯ Python
      Node.js
      Shell
  ? Will this skill need network access? (y/N): N
  ? License:
    ❯ MIT
      Apache-2.0
      ISC
      Proprietary
      None
  ? Author name: Almog
  ? Author email: almog@example.com

Scaffolding data-viz...
  ✓ Created manifest.json
  ✓ Created SKILL.md (template)
  ✓ Created scripts/ directory
  ✓ Created references/ directory
  ✓ Created tests/eval.json (empty)
  ✓ Created .spmignore
  ✓ Created LICENSE

✅ Skill scaffolded! Next steps:
   1. Edit SKILL.md with your instructions
   2. Add scripts to scripts/
   3. Run tests: spm test
   4. Publish: spm publish
```

### Non-Interactive / Quick

```bash
# One-liner for experienced authors
$ spm init data-viz --category data-viz --language python --license MIT --yes

# From existing directory (detect and fill in)
$ cd my-existing-skill-dir
$ spm init --detect
  Detected: SKILL.md exists, 3 Python scripts, no manifest
  ✓ Generated manifest.json from SKILL.md frontmatter
  ✓ Detected scripts: main.py, helpers.py, utils.py
  ✓ Created tests/eval.json (empty)
```

### From Conversation (Agent-Assisted)

```bash
# Turn a workflow from an agent conversation into a skill
$ spm init --from-conversation

  ? Paste the conversation URL or export:
    > https://claude.ai/chat/abc123...    # or any supported agent URL

  Analyzing conversation...
  Detected workflow:
    - Reads CSV files
    - Generates charts using plotly
    - Exports as HTML or PNG

  ✓ Generated SKILL.md from conversation patterns
  ✓ Extracted scripts from code blocks
  ✓ Created test cases from conversation examples

  Review generated files? (Y/n)
```

### Scaffolded Structure

```
data-viz/
├── manifest.json           # Package metadata
├── SKILL.md                # Core instructions (template filled in)
├── scripts/
│   └── main.py             # Starter script
├── references/             # Additional docs (empty)
├── assets/                 # Templates, static files (empty)
├── tests/
│   └── eval.json           # Test cases (empty template)
├── .spmignore              # Files excluded from packaging
├── LICENSE                 # Chosen license
└── CHANGELOG.md            # Version history (template)
```

### Generated `manifest.json`

```json
{
  "$schema": "https://spm.dev/schemas/manifest-v1.json",
  "name": "data-viz",
  "version": "0.1.0",
  "description": "Create publication-quality charts and dashboards from data files. Triggers on: charts, visualization, dashboard, plots, graphs, data display, histogram, scatter plot, bar chart.",
  "author": {
    "name": "Almog",
    "email": "almog@example.com"
  },
  "license": "MIT",
  "keywords": [],
  "category": "data-viz",
  "agents": {
    "min_context": "standard",
    "requires_tools": ["bash", "file_write", "file_read"],
    "requires_network": false,
    "platforms": ["claude-code", "cursor", "copilot", "*"]
  },
  "dependencies": {
    "skills": {},
    "system": {
      "python": ">=3.10",
      "pip_packages": []
    }
  },
  "files": {
    "entry": "SKILL.md",
    "scripts": [],
    "references": [],
    "assets": []
  },
  "security": {
    "sandboxed": true,
    "network_access": false,
    "filesystem_scope": ["$WORKDIR", "$OUTPUTS"]
  }
}
```

### Generated `SKILL.md` Template

```markdown
---
name: data-viz
description: 'Create publication-quality charts and dashboards from data files. Triggers on: charts, visualization, dashboard, plots, graphs, data display, histogram, scatter plot, bar chart.'
allowed-tools: bash_tool, create_file, view
---

# data-viz

## Overview

[Describe what this skill does and when an agent should use it]

## Quick Reference

| Task            | Approach           |
| --------------- | ------------------ |
| [Common task 1] | [How to handle it] |
| [Common task 2] | [How to handle it] |

## Instructions

### Step 1: [Understand the Input]

[What does the agent receive? CSV, JSON, user description?]

### Step 2: [Process]

[Core logic — what scripts to run, what decisions to make]

### Step 3: [Generate Output]

[What does the final output look like?]

## Scripts

- `scripts/main.py` — [What this script does]

## Examples

### Example 1: [Simple case]

**User says**: "[example prompt]"
**Agent does**: [expected behavior]

### Example 2: [Complex case]

**User says**: "[example prompt]"  
**Agent does**: [expected behavior]

## Edge Cases

- [What to do when input is malformed]
- [What to do when a dependency is missing]
- [Fallback behavior]
```

### Generated `.spmignore`

```
# Files excluded from .skl package
__pycache__/
*.pyc
node_modules/
.git/
.env
.DS_Store
evals/
*.tmp
*.log
.vscode/
.idea/
```

---

## 3. Development Phase

### Writing the SKILL.md

The SKILL.md is the core product. The skill-creator has great guidance on this, but here's SPM's recommended workflow:

```bash
# While developing, validate continuously
$ spm validate --watch

Watching for changes...

[12:01:03] SKILL.md changed
  ✓ Frontmatter valid
  ✓ Name: data-viz (kebab-case ✓)
  ✓ Description: 156 chars (max 1024 ✓)
  ✓ Allowed tools declared
  ⚠ No examples section detected (recommended)
  ⚠ scripts/main.py referenced but doesn't exist yet

[12:03:15] scripts/main.py created
  ✓ Script registered in manifest.files.scripts
  ✓ Python syntax valid
  ⚠ Uses 'requests' library — add to dependencies.system.pip_packages?
```

### Adding Dependencies

```bash
# Add a pip dependency
$ spm add-dep plotly --pip
  ✓ Added plotly to manifest.dependencies.system.pip_packages

# Add a skill dependency
$ spm add-dep frontend-design --skill ">=1.0.0"
  ✓ Added frontend-design@>=1.0.0 to manifest.dependencies.skills

# Add a tool requirement
$ spm add-dep bash_tool --tool
  ✓ Added bash to manifest.agents.requires_tools
```

### Versioning During Development

```bash
# Bump version
$ spm version patch    # 0.1.0 → 0.1.1
$ spm version minor    # 0.1.1 → 0.2.0
$ spm version major    # 0.2.0 → 1.0.0
$ spm version 1.0.0-beta.1   # Exact pre-release
```

Updates `manifest.json` version and appends to `CHANGELOG.md`.

---

## 4. Testing & Evaluation

### `spm test` — Local Testing

```bash
$ spm test

Running skill tests...

Loading SKILL.md... ✓
Checking manifest... ✓

Test cases (from tests/eval.json):

  1/3 "Create a bar chart from sales.csv"
      ✓ Skill triggered (description matched)
      ✓ SKILL.md read successfully
      ✓ scripts/main.py executed (exit 0)
      ✓ Output file generated: chart.html
      ⏱ 4.2s

  2/3 "Make a dashboard showing Q1-Q4 revenue trends"
      ✓ Skill triggered
      ✓ SKILL.md read successfully
      ✓ scripts/main.py executed (exit 0)
      ✓ Output file generated: dashboard.html
      ⏱ 6.8s

  3/3 "Visualize the correlation between temperature and sales"
      ✓ Skill triggered
      ✓ SKILL.md read successfully
      ✓ scripts/main.py executed (exit 0)
      ✓ Output file generated: scatter.html
      ⏱ 3.1s

Results: 3/3 passed (14.1s total)
```

### `tests/eval.json` Format

```json
{
  "skill_name": "data-viz",
  "evals": [
    {
      "prompt": "Create a bar chart from sales.csv",
      "test_files": ["fixtures/sales.csv"],
      "assertions": [
        { "type": "file_exists", "path": "*.html" },
        { "type": "skill_triggered", "expected": true },
        { "type": "exit_code", "expected": 0 }
      ]
    },
    {
      "prompt": "Make a dashboard showing Q1-Q4 revenue trends",
      "assertions": [
        { "type": "skill_triggered", "expected": true },
        { "type": "output_contains", "pattern": "plotly" }
      ]
    },
    {
      "prompt": "What is 2+2?",
      "assertions": [{ "type": "skill_triggered", "expected": false }]
    }
  ]
}
```

The last test case is a **negative test** — "What is 2+2?" should NOT trigger the data-viz skill.

### `spm test --security` — Pre-Publish Security Check

```bash
$ spm test --security

Running security checks...

  Static analysis:
    ✓ scripts/main.py — no dangerous patterns
    ✓ scripts/helpers.py — no dangerous patterns

  Prompt injection scan:
    ✓ SKILL.md — no injection patterns detected

  Permission audit:
    ✓ network_access: false — no network calls detected
    ✓ filesystem_scope consistent with code

  Dependency audit:
    ✓ plotly — no known vulnerabilities
    ✓ pandas — no known vulnerabilities

✅ All security checks passed
```

---

## 5. `spm pack` — Build the Package

```bash
$ spm pack

Validating...
  ✓ manifest.json valid
  ✓ SKILL.md valid (frontmatter + body)
  ✓ All declared files exist
  ✓ Version 1.0.0 not yet published

Packing...
  Including:
    manifest.json (1.2 KB)
    SKILL.md (3.4 KB)
    scripts/main.py (2.1 KB)
    scripts/helpers.py (1.8 KB)
    references/chart-types.md (4.2 KB)
    LICENSE (1.1 KB)
    CHANGELOG.md (0.4 KB)

  Excluding (.spmignore):
    __pycache__/
    tests/
    .git/

  Total: 7 files, 14.2 KB

  ✓ Checksum: sha256:a1b2c3d4e5...

Output: data-viz-1.0.0.skl

💡 Test locally: spm install ./data-viz-1.0.0.skl
   Publish:      spm publish
```

### Local Testing of the Package

```bash
# Install from local .skl — tests the exact package users will get
$ spm install ./data-viz-1.0.0.skl

Installing from local file...
  ✓ Extracted
  ✓ Security scan passed
  ✓ Installed to ~/.spm/skills/data-viz/1.0.0
  ✓ Linked to /mnt/skills/user/data-viz

Now open your agent and test:
  "Create a bar chart from this CSV data..."
```

---

## 6. `spm publish` — Ship It

### First-Time Setup

```bash
$ spm login

  ? How do you want to authenticate?
    ❯ GitHub (recommended)
      Email + password
      API token

  Opening browser for GitHub authentication...
  ✓ Authenticated as almog (almog@example.com)
  ✓ Token saved to ~/.spm/credentials.json

# Or with a token directly
$ spm login --token spm_abc123...
```

### Publishing

```bash
$ spm publish

Pre-flight checks...
  ✓ Authenticated as: almog
  ✓ manifest.json valid
  ✓ SKILL.md valid
  ✓ Version 1.0.0 not yet published
  ✓ Layer 1 security scan passed (regex patterns)
  ✓ Package size: 14.2 KB (max 5 MB ✓)

Category check...
  Detected from SKILL.md: data-viz
  ✓ Matches manifest.json category

Packing data-viz@1.0.0...
  ✓ Built data-viz-1.0.0.skl

Signing with Sigstore...
  ✓ Ephemeral key from Fulcio CA (GitHub identity: almog)
  ✓ Package hash signed
  ✓ Recorded on Rekor transparency log
  ✓ Sigstore bundle created (.sigstore)

Uploading to registry.spm.dev...
  ████████████████████████████████ 100%
  ✓ Package uploaded (.skl)
  ✓ Sigstore bundle uploaded (.sigstore)

Registry processing (server-side security)...
  ✓ Layer 1: Regex patterns — passed
  ✓ Layer 2: ML classification (ProtectAI DeBERTa) — safe (0.02)
  ✓ Metadata indexed

╭──────────────────────────────────────────────╮
│  ✅ data-viz@1.0.0 published!                 │
│                                              │
│  📦 https://spm.dev/skills/data-viz          │
│  📊 Security scan: pending                   │
│                                              │
│  Install: spm install data-viz               │
│  Badge:  [![spm](https://spm.dev/badge/      │
│           data-viz)](https://spm.dev/...)     │
╰──────────────────────────────────────────────╯
```

### Publishing Updates

```bash
# Edit SKILL.md, fix bugs, add features...

$ spm version minor    # 1.0.0 → 1.1.0
$ git add -A && git commit -m "feat: add heatmap support"

$ spm publish

Pre-flight checks...
  ✓ Version 1.1.0 (previous: 1.0.0)
  ⓘ Diff from 1.0.0:
    + scripts/heatmap.py (new file)
    ~ SKILL.md (12 lines changed)
    ~ manifest.json (added seaborn dependency)

  No new permissions requested ✓

...rest of publish flow...
```

### Publish Guards

```bash
# Prevent accidental publishes

$ spm publish
  ❌ Version 1.0.0 already published. Bump version first:
     spm version patch   (→ 1.0.1)
     spm version minor   (→ 1.1.0)

$ spm publish
  ❌ Uncommitted changes detected. Commit or stash first.
     Modified: SKILL.md, scripts/main.py

$ spm publish
  ❌ tests/eval.json has 0 test cases. Add at least 1 test.
     See: spm help test

$ spm publish
  ⚠️  No CHANGELOG.md entry for version 1.1.0
     Continue anyway? (y/N)
```

---

### Category Classification (Hybrid LLM + Author)

Categories are a **controlled vocabulary** — authors pick from a fixed list, not free-form. This keeps browse/filter reliable across the registry.

**Canonical category list:**

| Category     | Description                              |
| ------------ | ---------------------------------------- |
| documents    | PDF, DOCX, PPTX, XLSX, text processing   |
| data-viz     | Charts, dashboards, CSV/JSON, analytics  |
| frontend     | UI, React, HTML/CSS, design systems      |
| backend      | API, GraphQL, REST, database, migrations |
| infra        | Docker, CI/CD, deploy, cloud, IaC        |
| testing      | Test generation, coverage, benchmarks    |
| code-quality | Linting, standards, review, refactoring  |
| security     | Auth, encryption, vulnerability scanning |
| productivity | Git, terminal, workflow automation       |
| other        | Doesn't fit above categories             |

**How it works:**

1. **At `spm init`** — author picks a category from the list (stored in manifest.json)
2. **At `spm publish`** — LLM reads the SKILL.md and independently classifies the category
3. **Three outcomes:**

```bash
# Match — silent, no prompt
Category check...
  Detected from SKILL.md: data-viz
  ✓ Matches manifest.json category

# Mismatch — suggest correction
Category check...
  Detected from SKILL.md: frontend
  ⚠ manifest.json says: data-viz

  Your SKILL.md looks more like a "frontend" skill.
  ? Update category to frontend? (Y/n/keep) _

# Uncertain — ask author to confirm
Category check...
  Could not confidently classify. SKILL.md touches multiple areas.
  ? Confirm category: data-viz (Y/change) _
```

4. **Final category is stored in the registry** and used for browse/filter on spm.dev

**Tags remain free-form** — authors write whatever tags they want in manifest.json. Tags power search; categories power browse.

---

## 7. Post-Publish Management

### Yanking a Bad Version

```bash
$ spm yank data-viz@1.1.0

  ⚠️  Yanking removes this version from new installs.
     Existing installs and lock files still work.
     This action is logged and visible publicly.

  ? Reason: "Critical bug in heatmap script causes data corruption"

  Yanking data-viz@1.1.0...
  ✓ Version yanked
  ✓ Audit log entry created

  Users with 1.1.0 in their lock file will see:
  "⚠️  data-viz@1.1.0 has been yanked: Critical bug..."
```

### Deprecating a Skill

```bash
$ spm deprecate data-viz --message "Use advanced-viz instead"

  Deprecating data-viz...
  ✓ Skill marked as deprecated
  ✓ Deprecation notice set: "Use advanced-viz instead"

  Users will see on install:
  "⚠️  data-viz is deprecated. Use advanced-viz instead."
```

### Transfer Ownership

```bash
$ spm owner add @newmaintainer data-viz
  ✓ @newmaintainer added as co-owner of data-viz

$ spm owner transfer data-viz @newmaintainer
  ⚠️  This transfers full ownership. You will lose publish rights.
  Confirm? (type "data-viz" to confirm): data-viz
  ✓ Ownership transferred to @newmaintainer
```

---

## 8. Author Identity & Multiple Accounts

### Linking GitHub

```bash
$ spm profile link-github
  Opening browser for GitHub OAuth...
  ✓ Linked GitHub: github.com/almog
  ✓ Your published skills now show GitHub verification badge
```

### Organization Publishing

```bash
# Publish under an org name
$ spm org create my-company
$ spm publish --org my-company

# Scoped package
# Published as @my-company/data-viz
```

### API Token for CI

```bash
$ spm token create --name "github-actions" --scope publish

  Token: spm_tok_abc123def456...

  ⚠️  This token is shown only once. Save it now.

  For GitHub Actions, add as a secret:
    gh secret set SPM_TOKEN --body "spm_tok_abc123def456..."

  Then in your workflow:
    - run: spm publish
      env:
        SPM_TOKEN: ${{ secrets.SPM_TOKEN }}
```

---

## 9. Authoring Best Practices Summary

```
┌─────────────────────────────────────────────────────┐
│              Skill Authoring Checklist                │
│                                                     │
│  Before Publishing:                                 │
│  □ SKILL.md has clear, step-by-step instructions    │
│  □ Description is "pushy" — triggers correctly      │
│  □ At least 2-3 example prompts included            │
│  □ Edge cases documented                            │
│  □ At least 1 positive + 1 negative test case       │
│  □ spm validate passes clean                        │
│  □ spm test passes all cases                        │
│  □ spm test --security passes                       │
│  □ Tested locally with spm install ./file.skl       │
│  □ CHANGELOG.md updated                             │
│  □ Keywords and category set in manifest             │
│                                                     │
│  Quality Signals (boost discoverability):            │
│  □ README with screenshots or examples              │
│  □ Repository URL linked                            │
│  □ 5+ test cases                                    │
│  □ References directory with supplementary docs     │
│  □ Multiple platform support declared               │
│  □ GitHub identity linked (verification badge)      │
└─────────────────────────────────────────────────────┘
```
