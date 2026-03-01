# Migration from `.skill` to `.skl`

## Moving from the Current Format to SPM Packages

---

## 1. Current State

Today, the Agent Skills system uses:

```
Format:        .skill (ZIP file)
Contents:      SKILL.md + optional scripts/references/assets
Metadata:      YAML frontmatter in SKILL.md
                 Fields: name, description, license, allowed-tools,
                         metadata, compatibility
Validation:    Minimal (name exists, kebab-case, description exists)
Registry:      None (manually shared files)
Versioning:    None
Dependencies:  None declared
Security:      None (trust the file)
Signing:       None
```

SPM introduces `.skl`, which extends this:

```
Format:        .skl (ZIP file — same underlying format)
Contents:      manifest.json + SKILL.md + optional scripts/references/assets
Metadata:      manifest.json (structured) + YAML frontmatter (kept for compatibility)
Validation:    Comprehensive (content security, permissions, dependencies)
Registry:      SPM registry with search, versioning, trust tiers
Versioning:    Semver (MAJOR.MINOR.PATCH)
Dependencies:  Declared in manifest.json (skill deps + system deps)
Security:      Content scanning, permission audit, trust tiers
Signing:       Sigstore (optional, recommended)
```

---

## 2. What `.skill` Actually Is (From Real Skills)

### 2.1 The Packaging

Both `.skill` and `.skl` are **ZIP files**. That's it. The only difference is the extension and what's inside.

```python
# Current package_skill.py does exactly this:
zipfile.ZipFile("my-skill.skill", 'w', zipfile.ZIP_DEFLATED)
# Zips the skill directory, excludes __pycache__, node_modules, .pyc, evals/

# SPM's spm pack does exactly the same thing:
zipfile.ZipFile("my-skill-1.0.0.skl", 'w', zipfile.ZIP_DEFLATED)
# Same ZIP, but adds manifest.json + checksums
```

### 2.2 The Frontmatter (Current Format)

Every `.skill` has a SKILL.md with YAML frontmatter. Here's what's allowed today:

```yaml
# Allowed frontmatter properties (from quick_validate.py):
# name, description, license, allowed-tools, metadata, compatibility

# That's ALL. Six fields. Everything else is rejected.
```

Real examples from Anthropic's skills:

```yaml
# Minimal (skill-creator — just 2 fields)
---
name: skill-creator
description: Create new skills, modify and improve...
---
# Typical (pdf — 3 fields)
---
name: pdf
description: Use this skill whenever the user wants...
license: Proprietary. LICENSE.txt has complete terms
---
# Maximal (pptx — 3 fields, description is the heavy lifter)
---
name: pptx
description: 'Use this skill any time a .pptx file is involved
  in any way — as input, output, or both. This includes: creating
  slide decks, pitch decks...'
license: Proprietary. LICENSE.txt has complete terms
---
```

Notice: **no version**, **no dependencies**, **no author**, **no security declarations**, **no tool declarations** (allowed-tools exists but nobody uses it), **no platform info**.

### 2.3 The Structure (Current Format)

```
Simple skill (frontend-design):       Complex skill (docx):
├── SKILL.md (4 KB)                   ├── SKILL.md (20 KB)
└── LICENSE.txt                       ├── LICENSE.txt
                                      ├── scripts/
    2 files, 14 KB                    │   ├── comment.py
                                      │   ├── accept_changes.py
                                      │   ├── __init__.py
                                      │   ├── templates/ (5 XML files)
                                      │   └── office/
                                      │       ├── validate.py
                                      │       ├── soffice.py
                                      │       ├── pack.py, unpack.py
                                      │       ├── validators/ (4 files)
                                      │       ├── helpers/ (2 files)
                                      │       └── schemas/ (20+ XSD files)
                                      └── 61 files, 1.1 MB
```

### 2.4 The Validation (Current)

From `quick_validate.py`:

```
✓ SKILL.md exists
✓ Frontmatter starts with ---
✓ YAML parses correctly
✓ 'name' field exists
✓ 'description' field exists
✓ Name is kebab-case, ≤ 64 chars
✓ Description ≤ 1024 chars, no angle brackets
✓ No unexpected frontmatter keys
✓ Compatibility field ≤ 500 chars (if present)

That's it. No content scanning, no dependency detection,
no script analysis, no security checks.
```

---

## 3. What `.skl` Adds

The `.skl` format is a **superset** of `.skill`. Everything in `.skill` stays. `.skl` adds a structured metadata envelope and security layer.

### 3.1 Side-by-Side

```
                        .skill              .skl
                        ──────              ────
Container:              ZIP                 ZIP (same)
Extension:              .skill              .skl
SKILL.md:               ✓ required          ✓ required (same)
Frontmatter:            ✓ source of truth   ✓ kept, but manifest wins
LICENSE.txt:            ✓ optional          ✓ optional (same)
scripts/:               ✓ optional          ✓ optional (same)
references/:            ✓ optional          ✓ optional (same)
assets/:                ✓ optional          ✓ optional (same)

manifest.json:          ✗ doesn't exist     ✓ ADDED — structured metadata
checksums.sha256:       ✗                   ✓ ADDED — integrity verification
signature.sig:          ✗                   ✓ ADDED — optional Sigstore signing
CHANGELOG.md:           ✗                   ✓ ADDED — version history

VERSION:                None                Semver (1.0.0)
AUTHOR:                 None                Name + email + org
DEPENDENCIES:           None                Skills + pip + npm
SECURITY:               None                Permissions, filesystem scope
PLATFORM COMPAT:        None                claude-code / cursor / copilot / *
TOOL REQUIREMENTS:      Unused field        Required in manifest
KEYWORDS/CATEGORY:      None                For search/discovery
```

### 3.2 What manifest.json Contains (That Frontmatter Doesn't)

```jsonc
// This is ALL new information that .skill doesn't capture:

{
  // ── Identity (frontmatter has name + description, nothing else) ──
  "version": "1.2.0", // NEW: semver
  "authors": [
    // NEW: who made this (array!)
    { "name": "Almog", "email": "almog@example.com" },
    { "name": "Dana", "email": "dana@example.com" },
  ],
  "maintainers": [
    // NEW: current maintainer
    { "name": "Charlie" },
  ],
  "keywords": ["chart", "visualization"], // NEW: search discovery
  "category": "data", // NEW: browsing/filtering
  "private": false, // NEW: prevent accidental publish

  // ── Links (frontmatter has nothing) ──
  "urls": {
    // NEW: all links in one place
    "repository": "https://github.com/...",
    "issues": "https://github.com/.../issues",
    "funding": "https://github.com/sponsors/almog",
  },

  // ── Dependencies (frontmatter has zero concept of this) ──
  "dependencies": {
    "skills": {
      // NEW: skill depends on other skills
      "frontend-design": "^1.0.0",
    },
    "pip": ["plotly>=5.0", "pandas>=2.0"], // NEW: pip packages needed
    "npm": ["d3@^7.0.0"], // NEW: npm packages needed
    "system": ["ffmpeg"], // NEW: system binaries (documented)
  },

  // ── Platform (frontmatter has unused "compatibility" field) ──
  "agents": {
    "requires_tools": [
      // NEW: which tools the agent needs
      "bash",
      "file_write",
      "file_read",
    ],
    "requires_network": false, // NEW: needs egress?
    "platforms": [
      // NEW: where does it work?
      "claude-code",
      "cursor",
      "copilot",
      "codex",
      "*",
    ],
  },

  // ── Security (frontmatter has nothing) ──
  "security": {
    "sandboxed": true, // NEW: does it stay in sandbox?
    "network_access": false, // NEW: does it call external URLs?
  },
}

// IMPORTANT: Only "name", "version", "description" are REQUIRED.
// Everything above is optional with sensible defaults.
// See spm-manifest-spec.md for the full field reference.
```

### 3.3 What Migration Actually Does (File by File)

```
BEFORE (pdf.skill):                    AFTER (pdf-1.0.0.skl):
├── pdf/                               ├── pdf/
│   ├── SKILL.md          ← SAME      │   ├── SKILL.md
│   ├── LICENSE.txt        ← SAME      │   ├── LICENSE.txt
│   ├── REFERENCE.md       ← SAME      │   ├── REFERENCE.md
│   ├── FORMS.md           ← SAME      │   ├── FORMS.md
│   └── scripts/           ← SAME      │   ├── scripts/
│       ├── check_fillable_fields.py   │   │   ├── check_fillable_fields.py
│       ├── fill_fillable_fields.py    │   │   ├── fill_fillable_fields.py
│       ├── check_bounding_boxes.py    │   │   ├── check_bounding_boxes.py
│       ├── create_validation_image.py │   │   ├── create_validation_image.py
│       ├── fill_pdf_form_with_ann...  │   │   ├── fill_pdf_form_with_ann...
│       ├── convert_pdf_to_images.py   │   │   ├── convert_pdf_to_images.py
│       ├── extract_form_structure.py  │   │   ├── extract_form_structure.py
│       └── extract_form_field_info.py │   │   └── extract_form_field_info.py
                                       │   ├── manifest.json        ← NEW
12 files, 57 KB                        │   └── checksums.sha256     ← NEW
                                       │
                                       13-14 files, ~58 KB
```

That's it. Migration adds 1-2 files. Everything else is untouched.

### 3.4 What the Generated manifest.json Looks Like (for pdf)

```json
{
  "name": "pdf",
  "version": "1.0.0",
  "description": "Use this skill whenever the user wants to do anything with PDF files. This includes reading or extracting text/tables from PDFs, combining or merging multiple PDFs into one, splitting PDFs apart, rotating pages, adding watermarks, creating new PDFs, filling PDF forms, encrypting/decrypting PDFs, extracting images, and OCR on scanned PDFs to make them searchable. If the user mentions a .pdf file or asks to produce one, use this skill.",

  "authors": [],
  "license": "Proprietary",
  "keywords": ["pdf", "merge", "split", "watermark", "ocr", "forms", "encrypt"],
  "category": "productivity",

  "agents": {
    "requires_tools": ["bash", "file_write", "file_read"],
    "requires_network": false,
    "platforms": ["claude-code", "cursor", "copilot", "*"]
  },

  "dependencies": {
    "pip": ["pypdf"]
  },

  "security": {
    "sandboxed": true,
    "network_access": false
  }
}
```

Only `name`, `version`, and `description` are required. Everything else above is auto-detected and included as a convenience — the author can delete any field they don't care about.

See `spm-manifest-spec.md` for the full field specification, required vs optional breakdown, and cross-ecosystem comparison with npm and PyPI.

---

## 4. What Doesn't Change

SKILL.md is still how agents learn what to do. The frontmatter is still there. The scripts still work. The directory structure is identical. Agents read SKILL.md the same way whether it came from a `.skill` or `.skl` file.

The migration is non-breaking because **agents don't read manifest.json**. Agents read SKILL.md. The manifest is for SPM (the package manager), not for agents (the AI). It's metadata _about_ the skill, not instructions _for_ agents.

```
Who reads what:

  Agents read:          SPM reads:
  ├── SKILL.md          ├── manifest.json
  ├── references/*.md   ├── checksums.sha256
  └── scripts/*.py      ├── signature.sigstore
                        └── SKILL.md (for content scanning only)
```

## 5. Migration Is Non-Breaking

The critical design decision: **`.skill` files continue to work.** SPM reads both formats. Migration is encouraged, not forced.

```
┌─────────────────────────────────────────────────────────┐
│              Compatibility Matrix                        │
│                                                         │
│              │ Old Agents │ Agents + SPM │               │
│  ────────────┼────────────┼──────────────│               │
│  .skill file │    ✓       │     ✓        │               │
│  .skl file   │    ✗       │     ✓        │               │
│                                                         │
│  .skill files work everywhere.                          │
│  .skl files require SPM but unlock all new features.    │
│                                                         │
│  Migration path: gradual, not forced.                   │
└─────────────────────────────────────────────────────────┘
```

How SPM handles `.skill` files:

```python
def load_skill_package(filepath: Path):
    """Load either .skill or .skl format."""

    if filepath.suffix == '.skl':
        return load_skl(filepath)

    if filepath.suffix == '.skill':
        return load_legacy_skill(filepath)

    raise UnsupportedFormat(f"Unknown format: {filepath.suffix}")

def load_legacy_skill(filepath: Path) -> SkillPackage:
    """Load .skill format, treating it as a .skl without manifest.json."""

    with zipfile.ZipFile(filepath) as z:
        # Find SKILL.md
        skill_md_path = find_skill_md(z)
        content = z.read(skill_md_path).decode('utf-8')

        # Parse frontmatter
        frontmatter = parse_frontmatter(content)

        # Synthesize a manifest from frontmatter
        manifest = {
            "name": frontmatter.get("name", filepath.stem),
            "version": "0.0.0",  # No version in .skill format
            "description": frontmatter.get("description", ""),
            "license": frontmatter.get("license", "Unknown"),
            "agents": {
                "requires_tools": parse_allowed_tools(
                    frontmatter.get("allowed-tools", "")
                ),
            },
            "_migrated_from": "skill",
            "_migration_note": "Auto-generated manifest. Run 'spm migrate' for full .skl format."
        }

        return SkillPackage(
            format="legacy-skill",
            manifest=manifest,
            skill_md=content,
            files=z.namelist()
        )
```

---

## 6. Migration Tool

### `spm migrate` — Convert `.skill` to `.skl`

```bash
$ spm migrate ./my-skill.skill

  Reading my-skill.skill...

  Detected:
    Name: my-skill
    Description: "Does something useful..."
    Files: SKILL.md, LICENSE.txt, scripts/main.py
    Format: .skill (legacy)

  Generating manifest.json...
    ✓ Name: my-skill
    ✓ Description: from frontmatter
    ✓ License: MIT (from frontmatter)
    ✓ Allowed tools: bash_tool, create_file, view
    ? Version (no version found, default 1.0.0): 1.0.0
    ✓ Scripts detected: scripts/main.py (Python)
    ✓ Auto-detected dependency: pandas (imported in main.py)

  Security scan...
    ✓ Content scan passed
    ✓ No permission issues

  Output:
    ✓ my-skill/manifest.json (created)
    ✓ my-skill/SKILL.md (unchanged)
    ✓ my-skill/scripts/main.py (unchanged)
    ✓ my-skill/LICENSE.txt (unchanged)

  ✓ Migration complete!

  Next steps:
    1. Review manifest.json — fill in any missing fields
    2. Test: spm validate ./my-skill/
    3. Pack: spm pack (creates .skl from directory)
    4. Publish: spm publish
```

### Batch Migration

```bash
# Migrate all .skill files in a directory
$ spm migrate --batch ./skills/

  Found 5 .skill files:
    1/5 data-viz.skill ─────── ✓ migrated
    2/5 pdf-tools.skill ────── ✓ migrated
    3/5 chart-maker.skill ──── ✓ migrated
    4/5 report-gen.skill ───── ⚠ needs manual review (no description)
    5/5 bad-skill.skill ────── ❌ content scan failed

  Results: 3 migrated, 1 needs review, 1 blocked
```

### Migrate from Directory (Existing Unpacked Skills)

```bash
# Current skill directory (not zipped)
$ ls my-skill/
  SKILL.md  scripts/  references/

# Generate manifest and prepare for .skl
$ spm migrate --dir ./my-skill/

  Analyzing my-skill/...

  ✓ SKILL.md found, frontmatter valid
  ✓ 2 scripts detected
  ✓ 1 reference file detected

  Generating manifest.json...
  ✓ Written to my-skill/manifest.json

  Review and then run:
    spm pack ./my-skill/
```

---

## 7. Manifest Generation Logic

The migration tool auto-detects as much as possible from the existing `.skill` contents:

```python
class ManifestGenerator:
    """Generate manifest.json from a .skill file's contents."""

    def generate(self, skill_dir: Path) -> dict:
        skill_md = skill_dir / "SKILL.md"
        content = skill_md.read_text()
        frontmatter = parse_frontmatter(content)

        manifest = {
            "$schema": "https://spm.dev/schemas/manifest-v1.json",
            "name": frontmatter.get("name", skill_dir.name),
            "version": "1.0.0",
            "description": frontmatter.get("description", ""),
            "license": self._detect_license(skill_dir, frontmatter),
            "author": {},  # User fills in
            "keywords": self._extract_keywords(frontmatter),
            "category": self._guess_category(frontmatter),
            "agents": {
                "requires_tools": self._parse_tools(frontmatter),
                "requires_network": self._detect_network(skill_dir),
                "platforms": ["claude-code", "cursor", "copilot", "*"],
            },
            "dependencies": {
                "skills": {},
                "system": self._detect_system_deps(skill_dir),
            },
            "files": self._list_files(skill_dir),
            "security": {
                "sandboxed": True,
                "network_access": self._detect_network(skill_dir),
                "filesystem_scope": ["$WORKDIR", "$OUTPUTS"],
            },
        }

        return manifest

    def _parse_tools(self, frontmatter: dict) -> list:
        """Convert 'allowed-tools' string to list."""
        tools_str = frontmatter.get("allowed-tools", "")
        if not tools_str:
            return []
        return [t.strip() for t in tools_str.split(",")]

    def _detect_system_deps(self, skill_dir: Path) -> dict:
        """Scan scripts for import statements to detect dependencies."""
        deps = {"python": None, "pip_packages": [], "npm_packages": []}

        for py_file in skill_dir.rglob("*.py"):
            content = py_file.read_text()

            # Detect Python imports
            imports = re.findall(
                r'^(?:import|from)\s+(\w+)', content, re.MULTILINE
            )

            # Map common imports to pip packages
            IMPORT_TO_PIP = {
                "pandas": "pandas",
                "numpy": "numpy",
                "plotly": "plotly",
                "seaborn": "seaborn",
                "matplotlib": "matplotlib",
                "requests": "requests",
                "bs4": "beautifulsoup4",
                "PIL": "Pillow",
                "cv2": "opencv-python",
                "yaml": "pyyaml",
                "docx": "python-docx",
                "pptx": "python-pptx",
                "openpyxl": "openpyxl",
                "pypdf": "pypdf",
            }

            for imp in imports:
                if imp in IMPORT_TO_PIP:
                    pkg = IMPORT_TO_PIP[imp]
                    if pkg not in deps["pip_packages"]:
                        deps["pip_packages"].append(pkg)

        for js_file in skill_dir.rglob("*.js"):
            content = js_file.read_text()
            requires = re.findall(
                r"require\(['\"](\w[\w-]*)['\"]", content
            )
            for req in requires:
                if req not in deps["npm_packages"]:
                    deps["npm_packages"].append(req)

        if deps["pip_packages"]:
            deps["python"] = ">=3.10"

        return deps

    def _detect_network(self, skill_dir: Path) -> bool:
        """Detect if any scripts make network calls."""
        network_patterns = [
            r"requests\.(get|post|put|delete|patch|head)",
            r"urllib\.request",
            r"http\.client",
            r"aiohttp",
            r"fetch\(",
            r"axios\.",
            r"curl",
            r"wget",
            r"socket\.",
        ]

        for script in skill_dir.rglob("*"):
            if script.suffix in ('.py', '.js', '.sh'):
                content = script.read_text()
                for pattern in network_patterns:
                    if re.search(pattern, content):
                        return True
        return False

    def _extract_keywords(self, frontmatter: dict) -> list:
        """Extract keywords from description."""
        description = frontmatter.get("description", "")

        # Pull trigger words from description
        # "Use this skill for X, Y, and Z" → [X, Y, Z]
        triggers = re.findall(
            r"(?:triggers?\s+(?:on|include|for)|use\s+(?:for|when))[\s:]+(.+?)(?:\.|$)",
            description, re.IGNORECASE
        )

        keywords = []
        for trigger_group in triggers:
            words = re.split(r"[,;]|\band\b|\bor\b", trigger_group)
            keywords.extend(w.strip().lower() for w in words if w.strip())

        return keywords[:10]  # Max 10 keywords

    def _guess_category(self, frontmatter: dict) -> str:
        """Guess category from description."""
        description = frontmatter.get("description", "").lower()

        CATEGORY_SIGNALS = {
            "data": ["chart", "data", "csv", "visualization", "dashboard", "plot", "graph"],
            "code": ["code", "script", "debug", "programming", "refactor", "lint"],
            "writing": ["write", "document", "report", "blog", "article", "essay", "memo"],
            "design": ["design", "ui", "ux", "css", "layout", "frontend", "style"],
            "devops": ["deploy", "docker", "ci/cd", "pipeline", "infrastructure", "aws"],
            "productivity": ["task", "schedule", "organize", "workflow", "automate"],
        }

        scores = {}
        for category, signals in CATEGORY_SIGNALS.items():
            scores[category] = sum(1 for s in signals if s in description)

        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else "other"


```

---

## 8. Migrating Anthropic's Built-In Skills

The current built-in skills in `/mnt/skills/public/` should also migrate. This is what "official" `.skl` packages look like:

### Current Built-In Structure

```
/mnt/skills/public/
├── docx/
│   └── SKILL.md
├── docx.skill           ← ZIP of the above
├── pdf/
│   └── SKILL.md
├── pdf.skill
├── pptx/
│   └── SKILL.md
├── pptx.skill
├── xlsx/
│   └── SKILL.md
├── xlsx.skill
├── frontend-design/
│   └── SKILL.md
├── frontend-design.skill
└── product-self-knowledge/
    └── SKILL.md
```

### After Migration

```bash
$ spm migrate --batch /mnt/skills/public/ --official

  Migrating built-in skills...

  docx:
    ✓ Manifest generated
    ✓ Version: 1.0.0
    ✓ Dependencies: docx-js (detected from SKILL.md references)
    ✓ Tools: bash_tool, create_file, view, str_replace
    ✓ Category: writing
    → docx-1.0.0.skl

  pdf:
    ✓ Manifest generated
    ✓ Version: 1.0.0
    ✓ Dependencies: pypdf (detected), pip
    ✓ Tools: bash_tool, create_file, view
    ✓ Category: productivity
    → pdf-1.0.0.skl

  ... (remaining skills)

  ✓ 6 skills migrated to .skl format
  ✓ Ready for publishing to registry as @official scope
```

These become the seed content for the public registry — the first "official" skills that anchor the ecosystem.

---

## 9. Migration for Skill Authors

### 7.1 Existing Skill Creator Users

The skill-creator tool currently outputs `.skill` files. After SPM launches:

```
Before SPM:
  skill-creator → SKILL.md + scripts/ → package_skill.py → .skill

After SPM (backward compatible):
  skill-creator → SKILL.md + scripts/ → spm pack → .skl

  OR (old way still works):
  skill-creator → SKILL.md + scripts/ → package_skill.py → .skill
  Then: spm migrate my-skill.skill → .skl
```

### 7.2 Migration Guide for Authors

```bash
# You have an existing skill directory
$ ls my-cool-skill/
  SKILL.md  scripts/  references/

# Step 1: Generate manifest
$ spm migrate --dir ./my-cool-skill/
  ✓ manifest.json created

# Step 2: Review manifest (fill in missing fields)
$ cat my-cool-skill/manifest.json
  # Check: version, author, keywords, dependencies

# Step 3: Validate
$ spm validate ./my-cool-skill/
  ✓ All checks passed

# Step 4: Pack
$ spm pack ./my-cool-skill/
  ✓ my-cool-skill-1.0.0.skl created

# Step 5: Test locally
$ spm install ./my-cool-skill-1.0.0.skl
  ✓ Installed. Try it in your agent.

# Step 6: Publish
$ spm publish
  ✓ Published to registry!
```

### 7.3 Frontmatter Stays, Manifest Is Source of Truth

After migration, both `manifest.json` and SKILL.md frontmatter exist. They must stay in sync:

```
manifest.json is the SOURCE OF TRUTH for:
  - version
  - dependencies
  - security declarations
  - platform compatibility
  - file listings

SKILL.md frontmatter is KEPT for:
  - backward compatibility (agents still read frontmatter)
  - human readability (author sees metadata in SKILL.md)
  - trigger description (agents match skills by description)

On spm pack, SPM verifies they don't contradict:
  - manifest.name == frontmatter.name
  - manifest.description == frontmatter.description
  - manifest.allowed-tools matches frontmatter.allowed-tools
  If mismatch → warning + manifest wins
```

```bash
$ spm pack

  Checking manifest ↔ frontmatter consistency...
  ⚠ Description mismatch:
     manifest.json: "Create charts and dashboards from data"
     SKILL.md frontmatter: "Create charts from CSV files"

     Using manifest.json description (source of truth).
     Update SKILL.md frontmatter to match? (Y/n): Y
     ✓ Frontmatter updated
```

---

## 10. Handling Version 0.0.0

Migrated `.skill` files don't have versions. They get `0.0.0` as a placeholder:

```
Convention:
  0.0.0     → "migrated from .skill, never versioned"
  0.x.y     → "pre-release, still evolving"
  1.0.0     → "first stable release"

When an author migrates and publishes:
  1. spm migrate assigns 0.0.0 (or prompts for version)
  2. Author should immediately bump to 1.0.0 if it's stable
  3. Registry accepts 0.0.0 but shows "pre-release" badge
```

---

## 11. Bulk Import for Companies with Existing Libraries

Companies like Vercel, and others already building on the Agent Skills ecosystem, may have hundreds or thousands of skills. Making it trivial for them to publish to SPM seeds the registry with real, production-quality content from Day 1.

### Two Tools by Scale

```
Small (1-100 skills):     spm import
  Built into the CLI. Self-serve. No approval needed.
  $ spm import --from ./skills/ --org @me

Large (100-100k+ skills): spm-onboard
  Separate tool. Parallel pipeline. Resumable.
  Requires bulk import token for 100+ skills.
  $ npm install -g spm-onboard
  $ spm-onboard run --from ./skills/ --org @bigco

  See spm-bulk-import-scale.md for the full architecture
  of handling 100k+ skill migrations.
```

### 11.1 The Pitch to Companies

```
"You already have 500 skills. They work great internally.

 Publish them to SPM and:
   - Your skills get discovered by 100k+ agent users
   - You get download analytics and trigger data for free
   - Community submits bug reports and improvements
   - Your brand shows as a Verified Publisher
   - It takes 10 minutes, not 10 days.

 Small library?  spm import --from skills/ --org @vercel
 Large library?  spm-onboard run --from skills/ --org @vercel"
```

### 11.2 `spm import` — Small-Scale Migration (up to ~100 skills)

```bash
$ spm import --from ./skills/ --org @myteam

  Scanning ./skills/...
  Found 34 skills (22 .skill files, 12 directories with SKILL.md)

  Phase 1: Analysis
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% (34/34)

  Results:
    ✓ 30 skills can be auto-migrated
    ⚠   3 skills need minor fixes (missing descriptions, etc.)
    ❌   1 skill blocked (content security issue)

  Phase 2: Generate manifests
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% (30/30)

  Summary:
    Categories:  code (12), data (8), writing (6), design (4)
    With scripts: 18
    Detected dependencies: pandas (5), plotly (3)...
    Avg package size: 15 KB
    Total: 510 KB

  ? Publish all 30 skills to @myteam? (Y/n): Y

  Phase 3: Pack & publish
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% (30/30)

    ✓ 30 skills published as @myteam/skill-name
    ✓ Import report saved: ./spm-import-report.json

  ╭──────────────────────────────────────────────────────╮
  │  ✅ Imported 30 skills to @myteam                     │
  │                                                      │
  │  Browse: https://spm.dev/@myteam                     │
  │  Report: ./spm-import-report.json                    │
  │  Fix remaining: spm import --fix ./spm-import-report │
  ╰──────────────────────────────────────────────────────╯

# If you have more than 100 skills:
$ spm import --from ./skills/ --org @bigco

  Found 487 skills.

  ⚠ For imports over 100 skills, use spm-onboard:
    npm install -g spm-onboard
    spm-onboard run --from ./skills/ --org @bigco

  spm-onboard handles parallel scanning, batch uploads,
  resumable state, and bulk import tokens.

  See: https://spm.dev/docs/bulk-import
```

### 11.3 Import Sources

`spm import` (small-scale) supports:

```bash
# From a local directory of skills
$ spm import --from ./skills/ --org @myteam

# From a single .skill file
$ spm import --from my-cool-skill.skill --org @me

# From a GitHub repo with a skills directory
$ spm import --from github:myorg/ai-skills --org @myteam
```

`spm-onboard` (large-scale) adds:

```bash
# Scan an entire GitHub org (all repos with SKILL.md)
$ spm-onboard run --from github:vercel --org @vercel
  Scanning vercel's GitHub repositories...
  Found 87 repos containing SKILL.md files...

# From a running agent skill directory
$ spm-onboard run --from /mnt/skills/private/ --org @vercel

# From a ZIP/tar archive
$ spm-onboard run --from skills-export.tar.gz --org @vercel

# From another registry (cross-registry migration)
$ spm-onboard run --from-registry https://old-spm.company.com --org @vercel
```

### 11.4 GitHub Organization Scanner

For companies whose skills are spread across repos (`spm-onboard` only):

```python
class GitHubImporter:
    """Scan a GitHub org for skill-compatible repos."""

    def __init__(self, org: str, token: str):
        self.org = org
        self.github = GitHub(token)

    async def scan(self) -> list[SkillCandidate]:
        candidates = []

        repos = await self.github.list_repos(self.org)

        for repo in repos:
            # Check for SKILL.md at root
            skill_md = await self.github.get_file(repo, "SKILL.md")
            if skill_md:
                candidates.append(SkillCandidate(
                    source=f"github:{self.org}/{repo.name}",
                    name=repo.name,
                    skill_md=skill_md,
                    files=await self.github.list_files(repo),
                ))
                continue

            # Check for skills/ directory with multiple skills
            skills_dir = await self.github.list_dir(repo, "skills/")
            if skills_dir:
                for subdir in skills_dir:
                    skill_md = await self.github.get_file(
                        repo, f"skills/{subdir}/SKILL.md"
                    )
                    if skill_md:
                        candidates.append(SkillCandidate(
                            source=f"github:{self.org}/{repo.name}/skills/{subdir}",
                            name=subdir,
                            skill_md=skill_md,
                            files=await self.github.list_files(repo, f"skills/{subdir}/"),
                        ))

            # Check for .skill files
            for file in await self.github.list_files(repo):
                if file.endswith('.skill'):
                    candidates.append(SkillCandidate(
                        source=f"github:{self.org}/{repo.name}/{file}",
                        name=Path(file).stem,
                        is_packaged=True,
                    ))

        return candidates
```

```bash
$ spm-onboard run --from github:vercel --org @vercel --dry-run

  Scanning github.com/vercel...
  Scanned 234 repositories

  Found skills in:
    vercel/ai-sdk-skills         → 45 skills (skills/ directory)
    vercel/edge-functions-skill  →  1 skill (root SKILL.md)
    vercel/deploy-skill          →  1 skill (root SKILL.md)
    vercel/next-skill            →  1 skill (root SKILL.md)
    vercel/skill-collection      → 38 skills (skills/ directory)
    vercel/internal-tools        →  2 .skill files

  Total: 88 skills found across 6 repositories

  --dry-run: no changes made. Remove --dry-run to import.
```

### 11.5 Import Report

Every bulk import generates a detailed report for review:

```json
// spm-import-report.json
{
  "import_id": "imp_2026_02_27_abc123",
  "timestamp": "2026-02-27T15:00:00Z",
  "source": "./skills/",
  "org": "@vercel",
  "total_scanned": 487,

  "published": [
    {
      "name": "@vercel/edge-deploy",
      "version": "1.0.0",
      "source_path": "./skills/edge-deploy/",
      "package_size": 12400,
      "category": "devops",
      "detected_deps": ["boto3"],
      "scan_status": "pending",
      "url": "https://spm.dev/@vercel/edge-deploy"
    }
  ],

  "needs_fix": [
    {
      "name": "unnamed-skill-42",
      "source_path": "./skills/tool42/",
      "issues": [
        { "type": "missing_description", "message": "No description in frontmatter" },
        { "type": "name_invalid", "message": "Name contains underscores, needs kebab-case" }
      ],
      "suggested_fixes": {
        "name": "tool-42",
        "description": "(extracted from first paragraph of SKILL.md)"
      }
    }
  ],

  "blocked": [
    {
      "name": "internal-auth-tool",
      "source_path": "./skills/auth-tool/",
      "issues": [
        {
          "type": "content_security",
          "severity": "block",
          "message": "SKILL.md contains credential harvesting patterns"
        }
      ]
    }
  ]
}
```

### 11.6 `spm import --fix` — Resolve Issues Interactively

```bash
$ spm import --fix ./spm-import-report.json

  29 skills need fixes:

  1/29: unnamed-skill-42
    Issues:
      - No description in frontmatter
      - Name contains underscores

    Suggested fixes:
      Name: tool-42
      Description: (auto-extracted) "Generates deployment configs for edge functions"

    ? Accept suggestions? (Y/edit/skip)
      ❯ Yes

    ✓ Fixed and published as @vercel/tool-42

  2/29: data_processor
    Issues:
      - Name contains underscores

    ? New name (suggestion: data-processor): data-processor
    ✓ Fixed and published as @vercel/data-processor

  ...

  Results: 26 fixed and published, 3 skipped
```

### 11.7 Ongoing Sync (GitHub Actions)

For companies that want their GitHub skills to auto-publish to SPM on push:

```yaml
# .github/workflows/spm-publish.yml
name: Publish skills to SPM

on:
  push:
    branches: [main]
    paths:
      - 'skills/**'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install SPM
        run: npm install -g spm-cli

      - name: Detect changed skills
        id: changes
        run: |
          # Find which skills were modified
          changed=$(git diff --name-only HEAD~1 HEAD -- skills/ | \
                    cut -d'/' -f2 | sort -u)
          echo "skills=$changed" >> $GITHUB_OUTPUT

      - name: Publish changed skills
        env:
          SPM_TOKEN: ${{ secrets.SPM_TOKEN }}
        run: |
          for skill in ${{ steps.changes.outputs.skills }}; do
            echo "Publishing skills/$skill..."
            cd skills/$skill
            
            # Auto-bump patch version
            spm version patch
            
            # Publish
            spm publish --org @vercel --yes
            
            cd ../..
          done
```

```bash
# Or use the SPM GitHub Action (provided by SPM)
- uses: spm-dev/publish-action@v1
  with:
    skills-directory: skills/
    org: '@vercel'
    auto-version: patch
    token: ${{ secrets.SPM_TOKEN }}
```

### 11.8 Incentives for Companies to Import

```
┌──────────────────────────────────────────────────────────┐
│          Why Companies Should Bulk-Import                 │
│                                                          │
│  FOR THE COMPANY:                                        │
│  ├── Free distribution to all agent platform users        │
│  ├── Analytics on every skill (installs, triggers)       │
│  ├── Community bug reports and feedback                  │
│  ├── Verified Publisher badge (trust signal)             │
│  ├── Skills appear in agent MCP search                   │
│  ├── Automatic security scanning (free)                  │
│  └── Version management and dependency tracking          │
│                                                          │
│  FOR SPM:                                                │
│  ├── Instant library of production-quality skills        │
│  ├── Credibility ("Vercel publishes on SPM")             │
│  ├── Attracts users who want those skills                │
│  ├── Network effect: more skills → more users            │
│  │   → more authors → more skills                        │
│  └── Proves the format works at scale                    │
│                                                          │
│  FOR USERS:                                              │
│  ├── Discover skills they didn't know existed            │
│  ├── One-command install instead of manual file copying  │
│  ├── Verified, scanned, versioned packages               │
│  └── Updates delivered automatically                     │
└──────────────────────────────────────────────────────────┘
```

### 11.9 Outreach Strategy

```
Priority targets for bulk import partnerships:

Tier 1 — Reach out personally:
  - Anthropic (built-in skills → @official)
  - Vercel (if they have a skill library)
  - Companies known to use agent platforms extensively
  - Skill-creator power users (check community)

Tier 2 — Open invitation:
  - Blog post: "Publish your existing skills to SPM in 5 minutes"
  - GitHub search for repos containing SKILL.md
  - Agent Skills community forums / Discord
  - X/Twitter developer community

Tier 3 — Automated discovery:
  - GitHub crawler: find public repos with SKILL.md
  - Offer to import for authors (with their permission)
  - "Claim your skill" feature:
    "We found 'cool-tool' on GitHub. Is this yours? Claim it."
```

### 11.10 Implementation Priority

```
DAY 1 (spm import — built into CLI):
  ✓ spm import --from ./directory/ (up to ~100 skills)
  ✓ spm import --from file.skill (single .skill file)
  ✓ spm import --fix (interactive issue resolver)
  ✓ Import report (JSON)

WEEK 2 (spm import additions):
  ✓ spm import --from github:org/repo (single repo)
  ✓ Dry-run mode

MONTH 2 (spm-onboard — separate tool):
  ✓ spm-onboard: parallel scanning, batch upload, resumable state
  ✓ spm-onboard: GitHub org scanner (scan all repos)
  ✓ spm-onboard: bulk import tokens + approval flow
  ✓ spm-onboard: cross-registry migration

MONTH 2 (CI/CD):
  ✓ GitHub Action for auto-publish on push
  ✓ "Claim your skill" web feature
```

## 12. Migration Timeline

```
Phase 1 — SPM Launch:
  .skill files work everywhere (no migration needed)
  .skl format available for new skills
  spm migrate tool available
  Registry accepts both formats for upload
  CLI installs both formats

Phase 2 — Encourage Migration:
  New features only available for .skl (dependencies, signing, etc.)
  Built-in skills migrated to .skl
  Registry shows "legacy format" badge on .skill uploads
  spm publish warns if publishing .skill format

Phase 3 — Soft Deprecation:
  .skill still works but no longer the recommended format
  Documentation focuses on .skl
  skill-creator outputs .skl by default

Phase 4 — Full Migration (12+ months):
  .skill still loads (backward compatibility forever)
  Registry no longer accepts NEW .skill uploads
  All active skills have migrated to .skl
  .skill format documented as "legacy"
```

The key principle: **never break existing skills.** A `.skill` file from today should still work a year from now. Migration is about unlocking new features, not forcing change.

---

## 13. Summary

```
┌──────────────────────────────────────────────────────────┐
│              Migration Key Points                         │
│                                                          │
│  FORMAT:                                                 │
│    .skl = .skill + manifest.json + security features     │
│    Both are ZIP files. Same internal structure.           │
│    .skill files continue to work forever.                │
│                                                          │
│  MIGRATION TOOL:                                         │
│    spm migrate file.skill → generates manifest.json      │
│    spm migrate --dir ./skill/ → same for directories     │
│    spm migrate --batch ./dir/ → bulk migration           │
│    Auto-detects: deps, network usage, tools, category    │
│                                                          │
│  SYNC RULE:                                              │
│    manifest.json = source of truth                       │
│    SKILL.md frontmatter = kept for backward compat       │
│    spm pack verifies they don't contradict               │
│                                                          │
│  TIMELINE:                                               │
│    Day 1: both formats work, migration optional          │
│    Month 6: new features need .skl, migration encouraged │
│    Month 12+: registry stops accepting new .skill        │
│    Forever: .skill files still load in all agents          │
└──────────────────────────────────────────────────────────┘
```
