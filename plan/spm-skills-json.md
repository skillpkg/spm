# `skills.json` — Global and Project-Level Skill Management

## The Problem

Today, skills have no scoping mechanism. When agents load skills, they see a flat list from their skills directories. This creates problems:

1. **No reproducibility** — A project works on your machine but not on a teammate's because they have different skills installed
2. **No global tracking** — No record of which skills you've installed machine-wide, no way to restore after a reinstall
3. **No override control** — Global skills take precedence, and there's no way to pin a project to specific versions
4. **No conflict resolution** — Two skills with overlapping triggers? Undefined behavior
5. **No shared configuration** — Teams can't agree on a skill set for a project

`skills.json` solves this at both levels: globally (your machine) and per-project (your repo).

---

## 1. Where It Lives

SPM tracks skills at two levels: **global** (your machine) and **project** (your repo).

### Global (your machine, not committed)

```
~/.spm/
├── skills.json          ← Your globally installed skills
├── skills-lock.json     ← Pinned versions for global skills
├── cache/               ← Downloaded .skl packages
└── config.toml          ← SPM settings
```

Global files are managed by `spm install <name>` (no project context). They track which skills are available machine-wide across all projects and sessions. These are NOT committed to git — they're personal to your machine.

### Project (your repo, committed to git)

```
my-project/
├── skills.json          ← Project skill manifest (committed to git)
├── skills-lock.json     ← Pinned versions (committed to git)
├── .spm/                ← Local SPM state (gitignored)
│   └── skills/          ← Installed skill files
├── src/
└── ...
```

Project files are managed by `spm install <name>` and `spm remove <name>`. They declare exactly which skills this project needs, at which versions. Committed to git so teammates get the same skills.

### How they interact

```
spm install -g data-viz
  → Adds to ~/.spm/skills.json (global)
  → Available everywhere

spm install data-viz
  → Adds to ./skills.json (project)
  → Available in this project

spm install (no args, in a project directory)
  → Reads ./skills.json
  → Installs everything locally
  → Writes ./skills-lock.json
```

This matches npm exactly: `npm install <pkg>` is project-local, `npm install -g <pkg>` is global, `npm install` restores from package.json.

---

## 2. `skills.json` Schema

```json
{
  "$schema": "https://spm.dev/schemas/skills-v1.json",

  "name": "vacai-agent",
  "description": "Multi-agent trip advisor built with LangGraph",

  "skills": {
    "frontend-design": "^1.0.0",
    "pdf": "^2.0.0",
    "data-viz": "~1.2.0",
    "custom-report": "github:almog/custom-report#v1.0.0",
    "internal-templates": "file:./skills/internal-templates"
  },

  "resolution": {
    "strategy": "project-first",
    "overrides": {
      "pdf": {
        "priority": "project",
        "reason": "Custom PDF skill with company letterhead"
      }
    }
  },

  "settings": {
    "trust_level": "verified",
    "auto_update": false,
    "allow_transient_skills": false,
    "platform": ["claude-code", "cursor", "copilot", "codex"]
  }
}
```

### Field Reference

| Field         | Required | Description                               |
| ------------- | -------- | ----------------------------------------- |
| `name`        | No       | Project name (informational)              |
| `description` | No       | What the project is about                 |
| `skills`      | **Yes**  | Map of skill name → version constraint    |
| `resolution`  | No       | How to handle global vs project conflicts |
| `settings`    | No       | Project-wide SPM settings                 |

### Version Specifiers

```json
{
  "skills": {
    "data-viz": "1.2.3", // Exact version
    "frontend-design": "^1.0.0", // Compatible (>=1.0.0 <2.0.0)
    "pdf": "~2.1.0", // Patch only (>=2.1.0 <2.2.0)
    "chart-maker": ">=1.5.0", // Minimum version
    "custom-skill": "github:user/repo#tag", // GitHub source
    "local-skill": "file:./skills/my-local-skill", // Local path
    "internal": "file:../shared-skills/internal", // Relative path
    "beta-feature": "3.0.0-beta.1" // Pre-release
  }
}
```

---

## 3. Resolution Strategy: Global vs Project

### The Current Reality

Agents load skills from directories in this order (example: Claude Code):

```
/mnt/skills/public/      ← Built-in skills
/mnt/skills/examples/    ← Example/reference skills
/mnt/skills/user/        ← User-installed skills (global)
```

With Vercel's skills CLI, skills live in `~/.agents/skills/` (canonical) and are symlinked to per-agent dirs like `~/.claude/skills/`, `~/.cursor/skills/`, etc.

All are listed flat in `<available_skills>`. No priority. If names collide, the agent sees both and picks based on description match — effectively random.

### What SPM Adds

SPM introduces a resolution layer **before** skills reach the agent's `<available_skills>`:

```
┌──────────────────────────────────────────────────────┐
│                Resolution Pipeline                    │
│                                                      │
│  Input sources (raw, unordered):                     │
│    /mnt/skills/public/*          (built-in)          │
│    /mnt/skills/examples/*        (examples)          │
│    ~/.spm/skills/*               (global user)       │
│    ./.spm/skills/*               (project local)     │
│                                                      │
│  Resolution steps:                                   │
│    1. Read ./skills.json (project, if present)       │
│    2. Read ~/.spm/skills.json (global)               │
│    3. Merge both lists                               │
│    4. Apply resolution strategy (who wins conflicts) │
│    5. Apply priority overrides                       │
│    6. Generate final <available_skills> list          │
│                                                      │
│  Output: ordered, deduplicated skill list            │
└──────────────────────────────────────────────────────┘
```

### Resolution Strategies

```json
{
  "resolution": {
    "strategy": "project-first | global-first | strict-project | merge"
  }
}
```

#### `project-first` (Default)

**This is the default.** If no `resolution` field is set, SPM uses `project-first`. Project skills take priority. If a skill exists both globally and in the project, the **project version wins**. Global-only skills are still available. This is the "local wins" rule — identical to how npm, pip, and cargo handle the same situation.

```
./skills.json declares:        pdf@2.0.0, data-viz@1.2.0
~/.spm/skills.json declares:   pdf@1.0.0, docx@1.0.0

Result:
  pdf@2.0.0        ← from project (overrides global)
  data-viz@1.2.0   ← from project
  docx@1.0.0       ← from global (no project conflict)
```

This matches how every other package manager works (npm, pip, cargo).

#### `global-first` (Current Behavior)

Global skills take priority. Project skills only fill gaps. This preserves today's behavior for backward compatibility.

```
./skills.json declares:        pdf@2.0.0, data-viz@1.2.0
~/.spm/skills.json declares:   pdf@1.0.0, docx@1.0.0

Result:
  pdf@1.0.0        ← from global (wins over project)
  data-viz@1.2.0   ← from project (no global conflict)
  docx@1.0.0       ← from global
```

#### `strict-project`

**Only** skills declared in the project's skills.json are loaded. Global skills are completely ignored. Useful for locked-down environments.

```
./skills.json declares:        pdf@2.0.0, data-viz@1.2.0
~/.spm/skills.json declares:   pdf@1.0.0, docx@1.0.0

Result:
  pdf@2.0.0        ← from project
  data-viz@1.2.0   ← from project
  (docx not available — not in project skills.json)
```

#### `merge`

Both versions are available. The agent sees both and the skill with the more specific description match wins at trigger time. Risky but flexible.

```
Result:
  pdf@2.0.0        ← from project (as "project-pdf" or namespaced)
  pdf@1.0.0        ← from global
  data-viz@1.2.0   ← from project
  docx@1.0.0       ← from global
```

### Per-Skill Override

For fine-grained control, override resolution on specific skills:

```json
{
  "resolution": {
    "strategy": "project-first",
    "overrides": {
      "pdf": {
        "priority": "project",
        "reason": "Custom PDF with company branding"
      },
      "docx": {
        "priority": "global",
        "reason": "Built-in docx skill is better maintained"
      },
      "frontend-design": {
        "priority": "project",
        "alias": "custom-frontend",
        "reason": "Extended version with our design system"
      }
    }
  }
}
```

---

## 4. The Lock File: `skills-lock.json`

Like `package-lock.json` or `poetry.lock`, this pins exact versions for reproducible environments.

```json
{
  "lockfileVersion": 1,
  "generated_at": "2026-02-27T10:00:00Z",
  "generated_by": "spm@0.1.0",

  "skills": {
    "frontend-design": {
      "version": "1.4.1",
      "resolved": "https://registry.spm.dev/api/v1/skills/frontend-design/1.4.1/download",
      "checksum": "sha256:abc123...",
      "source": "registry",
      "signer": "anthropic-official@anthropic.com"
    },
    "pdf": {
      "version": "2.0.3",
      "resolved": "https://registry.spm.dev/api/v1/skills/pdf/2.0.3/download",
      "checksum": "sha256:def456...",
      "source": "registry",
      "signer": "almog@example.com"
    },
    "data-viz": {
      "version": "1.2.3",
      "resolved": "https://registry.spm.dev/api/v1/skills/data-viz/1.2.3/download",
      "checksum": "sha256:ghi789...",
      "source": "registry",
      "signer": "almog@example.com",
      "dependencies": {
        "frontend-design": "1.4.1"
      }
    },
    "custom-report": {
      "version": "1.0.0",
      "resolved": "github:almog/custom-report#abc1234",
      "checksum": "sha256:jkl012...",
      "source": "github",
      "commit": "abc1234def5678"
    },
    "internal-templates": {
      "version": "0.0.0",
      "resolved": "file:./skills/internal-templates",
      "checksum": "sha256:mno345...",
      "source": "local"
    }
  },

  "system_dependencies": {
    "python": ">=3.10",
    "pip": ["plotly>=5.0", "pandas>=2.0", "seaborn>=0.12"],
    "npm": []
  }
}
```

### Lock file rules:

- **Always committed to git** — ensures all team members use identical versions
- **Auto-updated by every mutation** — `spm install`, `spm update`, and `spm remove` all update the lock file. Never manually edited.
- **Exact versions only** — no ranges, no ambiguity
- **Includes checksums** — integrity verification at install time
- **Includes source** — so SPM knows where to re-download

---

## 5. CLI Workflows

### Initialize a Project

```bash
$ cd my-project
$ spm init

Creating skills.json...

  ? Project name: vacai-agent
  ? Resolution strategy: (project-first)
  ? Minimum trust level: (verified)

  ✓ Created skills.json
  ✓ Created .spm/ directory
  ✓ Added .spm/ to .gitignore

# Or non-interactive:
$ spm init --name vacai-agent --strategy project-first --yes
```

### Install All Project Skills

```bash
$ cd my-project    # contains skills.json
$ spm install

Reading skills.json...
  5 skills declared

Resolving versions...
  ✓ frontend-design: ^1.0.0 → 1.4.1
  ✓ pdf: ^2.0.0 → 2.0.3
  ✓ data-viz: ~1.2.0 → 1.2.3
  ✓ custom-report: github:almog/custom-report#v1.0.0
  ✓ internal-templates: file:./skills/internal-templates

Installing 5 skills...
  ✓ frontend-design@1.4.1 (cached)
  ✓ pdf@2.0.3
  ✓ data-viz@1.2.3
  ✓ custom-report@1.0.0 (from GitHub)
  ✓ internal-templates (local)

  System dependencies:
  ✓ pip: plotly, pandas, seaborn (installed)

Writing skills-lock.json...
  ✓ Locked 5 skills

✅ All project skills installed
```

If a `skills-lock.json` exists, `spm install` uses exact pinned versions from the lock file (no resolution needed). If only `skills.json` exists, it resolves and creates the lock file.

### Install a Skill to Project

```bash
$ spm install data-viz@^1.2.0

# This does:
# 1. Adds "data-viz": "^1.2.0" to ./skills.json
# 2. Resolves version
# 3. Installs to .spm/skills/
# 4. Updates ./skills-lock.json
# 5. Links into agent skill paths (via npx skills add)

Installed data-viz@1.2.3
  ✓ Added to skills.json
  ✓ Linked to: Claude Code, Cursor, Codex
```

### Install a Skill Globally

```bash
$ spm install -g data-viz

# This does:
# 1. Adds "data-viz": "^1.2.0" to ~/.spm/skills.json
# 2. Resolves version
# 3. Downloads to ~/.spm/cache/
# 4. Updates ~/.spm/skills-lock.json
# 5. Links into agent skill paths (via npx skills add)

Installed data-viz@1.2.3 (global)
  ✓ Linked to: Claude Code, Cursor, Codex
```

Global skills are available in every session on this machine, regardless of project.

**The distinction:** `spm install <n>` = project (committed to git). `spm install -g <n>` = global (your machine only). Same as npm.

### Remove a Skill

```bash
$ spm remove data-viz

# 1. Removes from skills.json
# 2. Checks for dependents
# 3. Uninstalls from .spm/skills/
# 4. Updates skills-lock.json
# 5. Removes symlink

Removed data-viz from skills.json
```

### Check Project Health

```bash
$ spm check

Checking skills.json against skills-lock.json...
  ✓ All versions locked and consistent

Checking installed skills match lock...
  ✓ All 5 skills installed at correct versions

Checking system dependencies...
  ✓ python 3.11 (requires >=3.10)
  ✓ plotly 5.18 (requires >=5.0)
  ✓ pandas 2.1 (requires >=2.0)

Checking resolution conflicts...
  ⚠️  pdf@2.0.3 (project) overrides global pdf@1.0.0
     Override declared in skills.json ✓

Checking for outdated skills...
  data-viz: 1.2.3 → 1.3.0 available (minor)
  frontend-design: 1.4.1 (up to date)
  pdf: 2.0.3 (up to date)

✅ Project skills are healthy
```

---

## 6. Team Workflow

### Scenario: New Team Member Joins

```bash
# New dev clones the repo
$ git clone https://github.com/team/vacai-agent
$ cd vacai-agent

# Install all project skills from lock file (exact versions)
$ spm install

Reading skills-lock.json...
  Installing exact pinned versions

  ✓ frontend-design@1.4.1
  ✓ pdf@2.0.3
  ✓ data-viz@1.2.3
  ✓ custom-report@1.0.0
  ✓ internal-templates (local)

✅ Project ready — all 5 skills match team's locked versions
```

Every teammate gets the exact same skill versions. Global skills (installed via `spm install -g`) are separate and don't interfere.

### Scenario: Updating a Skill

```bash
# Dev wants to update data-viz
$ spm update data-viz

Checking registry...
  data-viz: 1.2.3 → 1.3.0 available

Changelog for 1.3.0:
  + Added heatmap support
  + New dependency: seaborn>=0.12

  No permission changes
  No breaking changes (minor version)

Update? (Y/n) y

  ✓ Updated data-viz: 1.2.3 → 1.3.0
  ✓ Updated skills-lock.json

# Dev commits both files
$ git add skills.json skills-lock.json
$ git commit -m "chore: update data-viz to 1.3.0 for heatmap support"
```

### Scenario: Skill Version Mismatch

```bash
# Dev pulls latest code, lock file changed
$ git pull
$ spm install

Reading skills-lock.json...

  ⚠️  data-viz: installed 1.2.3, lock requires 1.3.0
  Updating data-viz: 1.2.3 → 1.3.0

  ✓ All skills now match lock file
```

### Scenario: CI/CD Integration

```yaml
# .github/workflows/ci.yml
- name: Install project skills
  run: |
    npm install -g spm
    spm ci    # Like npm ci — strict install from lock file only

# spm ci:
# - Fails if skills-lock.json is missing
# - Fails if skills-lock.json doesn't match skills.json
# - Installs exact locked versions (no resolution)
# - Faster than spm install (no network resolution)
```

---

## 7. Resolution Engine: Implementation

```javascript
class SkillResolver {
  constructor(projectConfig, globalSkills, builtinSkills) {
    this.project = projectConfig; // from skills.json
    this.global = globalSkills; // from ~/.spm/skills/
    this.builtin = builtinSkills; // from /mnt/skills/public/
    this.strategy = projectConfig?.resolution?.strategy || 'project-first';
  }

  resolve() {
    const result = new Map();
    const conflicts = [];

    switch (this.strategy) {
      case 'project-first':
        return this.resolveProjectFirst(result, conflicts);
      case 'global-first':
        return this.resolveGlobalFirst(result, conflicts);
      case 'strict-project':
        return this.resolveStrictProject(result, conflicts);
      case 'merge':
        return this.resolveMerge(result, conflicts);
    }
  }

  resolveProjectFirst(result, conflicts) {
    // 1. Start with all project-declared skills (highest priority)
    for (const [name, version] of Object.entries(this.project.skills || {})) {
      result.set(name, {
        name,
        version,
        source: 'project',
        path: `.spm/skills/${name}/current/`,
      });
    }

    // 2. Add global skills that don't conflict
    for (const [name, info] of this.global) {
      if (result.has(name)) {
        // Conflict — project wins, but log it
        conflicts.push({
          skill: name,
          winner: 'project',
          project_version: result.get(name).version,
          global_version: info.version,
          reason: this.getOverrideReason(name) || 'project-first strategy',
        });
        continue;
      }
      result.set(name, { ...info, source: 'global' });
    }

    // 3. Add built-in skills that don't conflict
    for (const [name, info] of this.builtin) {
      if (result.has(name)) {
        conflicts.push({
          skill: name,
          winner: result.get(name).source,
          builtin_version: info.version,
          reason: `${result.get(name).source} takes priority over built-in`,
        });
        continue;
      }
      result.set(name, { ...info, source: 'builtin' });
    }

    // 4. Apply per-skill overrides
    const overrides = this.project.resolution?.overrides || {};
    for (const [name, override] of Object.entries(overrides)) {
      if (override.priority === 'global' && this.global.has(name)) {
        // Force global version even though strategy is project-first
        result.set(name, { ...this.global.get(name), source: 'global (override)' });
      }
      if (override.alias) {
        // Rename to avoid collision
        const skill = result.get(name);
        if (skill) {
          result.delete(name);
          result.set(override.alias, { ...skill, originalName: name });
        }
      }
    }

    return { skills: result, conflicts };
  }

  resolveStrictProject(result, conflicts) {
    // Only project skills — nothing else
    for (const [name, version] of Object.entries(this.project.skills || {})) {
      result.set(name, {
        name,
        version,
        source: 'project',
        path: `.spm/skills/${name}/current/`,
      });
    }

    // Log what was excluded
    for (const [name] of this.builtin) {
      if (!result.has(name)) {
        conflicts.push({
          skill: name,
          status: 'excluded',
          reason: 'strict-project: not declared in skills.json',
        });
      }
    }

    return { skills: result, conflicts };
  }

  getOverrideReason(name) {
    return this.project.resolution?.overrides?.[name]?.reason;
  }

  // Generate the <available_skills> XML that goes into the agent's context
  generateAvailableSkillsXml() {
    const { skills, conflicts } = this.resolve();

    let xml = '<available_skills>\n';

    // Sort: project skills first, then global, then built-in
    const sorted = [...skills.entries()].sort((a, b) => {
      const priority = { project: 0, global: 1, builtin: 2 };
      return (priority[a[1].source] || 3) - (priority[b[1].source] || 3);
    });

    for (const [name, info] of sorted) {
      const manifest = this.loadManifest(info.path);
      xml += `<skill>\n`;
      xml += `<name>\n${name}\n</name>\n`;
      xml += `<description>\n${manifest.description}\n</description>\n`;
      xml += `<location>\n${info.path}/SKILL.md\n</location>\n`;
      xml += `</skill>\n\n`;
    }

    xml += '</available_skills>';
    return xml;
  }
}
```

---

## 8. How It Generates `<available_skills>`

The final piece: how does `skills.json` actually affect what the agent sees?

### Today (No SPM)

The system prompt is generated server-side. It scans skill directories and builds `<available_skills>`:

```
Scan /mnt/skills/public/*     → read each SKILL.md frontmatter
Scan /mnt/skills/examples/*   → read each SKILL.md frontmatter
Scan /mnt/skills/user/*       → read each SKILL.md frontmatter (if exists)
Concatenate all → <available_skills>
```

No ordering, no dedup, no conflict resolution.

### With SPM

SPM adds a resolution step between scanning and generating:

```
┌─────────────────┐
│ Scan all dirs    │ Same as today
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Read skills.json │ If present in current project/session
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Resolution       │ Apply strategy (project-first, etc.)
│ Engine           │ Resolve conflicts
│                  │ Apply overrides
│                  │ Deduplicate
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate         │ Ordered, deduplicated <available_skills>
│ available_skills │ Project skills listed first for visibility
└─────────────────┘
```

### The Integration Point

For this to actually work in Claude.ai / Claude Code, one of these must happen:

**Option A: SPM generates a skill overlay file**

```bash
# SPM writes a resolved skills manifest
spm resolve --output /mnt/skills/.resolved_skills.json

# The agent's runtime reads this instead of scanning directories
# This requires Anthropic to support the overlay file
```

**Option B: SPM controls the symlinks**

```bash
# SPM manages what appears in /mnt/skills/user/
# Only resolved skills get symlinked in
# Others are unlinked (but not deleted from cache)

spm install  # Links resolved skills
spm deactivate pdf  # Unlinks without uninstalling
```

**Option C: SPM generates available_skills directly**

```bash
# SPM generates the XML fragment
spm generate-context > /mnt/skills/.available_skills_override.xml

# The agent's runtime uses this if present
```

**Option B is most pragmatic** given the current system — it works without any changes to agent runtimes. SPM simply controls which symlinks exist in the directories agents already read. Vercel's skills CLI manages these symlinks.

---

## 9. Edge Cases

### No `skills.json` Present

SPM falls back to current behavior — all installed global skills are visible. No resolution needed.

### `skills.json` But No `skills-lock.json`

First run — SPM resolves versions, installs, and creates the lock file:

```bash
$ spm install
  ⚠️  No skills-lock.json found. Resolving from skills.json...
  ✓ Created skills-lock.json with resolved versions
```

### Lock File Drift

```bash
$ spm install

  ❌ skills-lock.json is out of sync with skills.json

  Changes detected:
    + chart-maker@^1.0.0 (added to skills.json, not in lock)
    - old-skill (in lock but removed from skills.json)
    ~ pdf: skills.json says ^2.0.0, lock has 2.0.3 (compatible ✓)

  Run 'spm install --update-lock' to regenerate,
  or 'spm ci' will fail until resolved.
```

### Local Skill Changes

When a local file-referenced skill changes:

```json
{ "internal-templates": "file:./skills/internal-templates" }
```

SPM detects content changes by checking the checksum:

```bash
$ spm check
  ⚠️  internal-templates: local files modified since last lock
     Lock checksum: sha256:mno345...
     Current checksum: sha256:xyz789...

  Run 'spm lock' to update the lock file
```

### Offline Mode

```bash
$ spm install --offline

  Using cached packages only...
  ✓ frontend-design@1.4.1 (cached)
  ✓ pdf@2.0.3 (cached)
  ❌ data-viz@1.2.3 not in cache

  Failed: 1 skill not available offline.
  Pre-cache with: spm cache add data-viz@1.2.3
```

---

## 10. Summary: How Global + Project Coexist

```
┌─────────────────────────────────────────────────┐
│           Skill Resolution Hierarchy             │
│                                                 │
│  ┌─────────────┐                                │
│  │ skills.json │  Project declares what it needs │
│  │ + overrides │  and how conflicts resolve      │
│  └──────┬──────┘                                │
│         │                                       │
│         ▼                                       │
│  ┌──────────────┐  ┌────────────────┐           │
│  │ .spm/skills/ │  │ ~/.spm/skills/ │           │
│  │ (project)    │  │ (global)       │           │
│  └──────┬───────┘  └───────┬────────┘           │
│         │                  │                    │
│         └────────┬─────────┘                    │
│                  │                              │
│                  ▼                              │
│         ┌───────────────┐                       │
│         │  Resolution   │                       │
│         │  Engine       │                       │
│         └───────┬───────┘                       │
│                 │                               │
│                 ▼                               │
│         ┌───────────────┐                       │
│         │ /mnt/skills/  │  Only resolved        │
│         │ user/         │  skills get symlinked  │
│         └───────────────┘                       │
│                 │                               │
│                 ▼                               │
│         ┌───────────────┐                       │
│         │<available_    │  Agent sees the        │
│         │  skills>      │  final resolved set    │
│         └───────────────┘                       │
└─────────────────────────────────────────────────┘
```

**The key insight**: SPM doesn't need to change how agents load skills. It just needs to control which skills are **symlinked** into the directories agents already read. The resolution engine is the brain; symlinks (via Vercel's skills CLI) are the muscle.
