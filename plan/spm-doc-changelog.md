# SPM Doc Update Changelog — Agent Skills Pivot

## Date: Feb 27, 2026

## Summary

SPM is pivoting from "Claude skills" to "Agent Skills" — the open standard adopted by 26+ platforms (Claude, Codex, Copilot, Cursor, Gemini CLI, etc.). This document catalogs every change made and every change still needed across all SPM docs.

---

## Context: What Changed

```
BEFORE:  "SPM is how you find, install, and share Claude skills."
AFTER:   "SPM is how you find, install, and share Agent Skills."

BEFORE:  Claude-first, other platforms "possible but not a goal"
AFTER:   Agent-agnostic, install once → linked to all agents

BEFORE:  No direct competitors
AFTER:   skillpm exists (npm wrapper, 90+ packages, launched Feb 25)
         LobeHub indexing skills as marketplace

NEW ARCHITECTURE COMPONENTS:
  - Vercel skills CLI: replaces spm-linker (37+ agents, open source)
  - npm-bridge: import agent-skill packages from npmjs.org
  - agents namespace: replaces claude namespace in manifest

BORROWED TOOLS (Session 7 — Build vs. Borrow):
  - Agent linking: Vercel skills CLI (npx skills add)
  - Content security: ProtectAI DeBERTa v2 (ML model, Apache 2.0)
  - Content security: Lakera Guard API (Phase 2+, free tier)
  - Package signing: sigstore-js (keyless, same as npm uses)
  - Name protection: string-similarity + confusables npm packages
  - Version resolution: npm semver
  - Schema validation: Zod
```

---

## Files Fully Updated ✅

### 1. spm-goals-vision.md — FULL REWRITE (Session 6)

- Problem statement: "Agent Skills are an open standard. 26+ platforms."
- Vision: "SPM is how you find, install, and share Agent Skills."
- One-liners updated for all audiences (added "For platform teams")
- Section 5.4 added: Relationship to Agent Skills Standard
- Design principles: added "AGENT-AGNOSTIC" and "WRITE ONCE, REACH EVERYWHERE"
- Section 8.2: removed "Other AI platforms" from "Not For" list
- Section 9: full competitive landscape with skillpm, LobeHub
- Section 10: added "CROSS-AGENT BY DEFAULT" and "PURPOSE-BUILT REGISTRY"
- Section 11: updated risks — platform lock-in no longer fatal, skillpm as competitor
- Section 12: added agent linker, npm bridge to plan

### 2. spm-manifest-spec.md — KEY SECTIONS UPDATED (Session 6)

- `claude` namespace → `agents` namespace throughout
- `agents.platforms`: now lists claude-code, cursor, copilot, codex
- `agents.requires_tools`: generic capabilities, not Claude-specific names
- `agents.requires_mcp`: NEW field for MCP server dependencies
- `security.filesystem_scope`: now uses `$WORKDIR`/`$OUTPUTS` variables
- All examples updated to use `agents` namespace
- FAQ updated: "Why agents namespace"

### 3. spm-reviews-and-stack.md — STACK UPDATED (Sessions 6+7)

- Monorepo: REMOVED spm-linker package (uses Vercel skills CLI instead)
- Monorepo: added `spm-shared/npm-bridge/` for npm import
- Added borrowed tools table (Vercel CLI, ProtectAI, Lakera, sigstore, etc.)
- Phase 1: 3-4 weeks with sigstore + Vercel CLI integration
- Moved sigstore signing from Phase 3 → Phase 1

### 4. spm-skills-json.md — FULLY UPDATED (Sessions 6+7)

- All Claude→agent language throughout
- Resolution pipeline references Vercel skills CLI for symlinking
- Option B updated to reference agent-agnostic directory management
- Key insight updated: symlinks managed by Vercel CLI

### 5. spm-content-security.md — FULLY UPDATED (Session 7)

- 3-layer security model (regex + ProtectAI DeBERTa + Lakera Guard API)
- TypeScript code for ML classification using ProtectAI model
- Server-side publish flow runs all 3 layers
- Phase-by-phase cost breakdown ($0/month for Phase 1-2)
- All Claude→agent language

### 6. spm-distribution.md — FULLY UPDATED (Session 7)

- Section 4 fully rewritten: Vercel skills CLI replaces manual platform detection
- Bootstrap uses `npx skills add` instead of Claude-specific directory probing
- All Claude→agent language throughout
- Summary table updated (Agent MCP instead of Claude Code MCP)

### 7. spm-install-deep-dive.md — FULLY UPDATED (Session 7)

- Filesystem scope uses $WORKDIR/$OUTPUTS instead of /home/claude
- Available_skills generation is agent-agnostic
- MCP install section: "Agent-Initiated" instead of "Claude-Initiated"
- Vercel skills CLI linking documented in post-install phase
- Sigstore verification in download phase

### 8. spm-migration.md — FULLY UPDATED (Session 7)

- All Claude→agent language (24 references updated)
- Manifest examples use `agents` namespace instead of `claude`
- Platform lists: claude-code, cursor, copilot, \* (not claude.ai/cowork)
- Filesystem scope uses $WORKDIR/$OUTPUTS
- Compatibility matrix: "Old Agents" / "Agents + SPM"
- Value prop: "agent platform users" not "Claude users"

### 9. spm-monetization-simplified.md — FULLY UPDATED (Session 7)

- All Claude→agent language (21 references updated)
- Platform breakdown: Claude Code vs Cursor vs Copilot
- Trigger analytics: agent-agnostic flow diagrams
- Option C: "High (Claude Code, Cursor), Low (web-based agents)"
- Option D: "Platform usage APIs" (not Anthropic-specific)

### 10. spm-monetization.md — UPDATED (Session 7)

- Platform breakdown uses multi-agent names
- Trigger analytics uses agent-agnostic language

### 11. spm-governance-transferability.md — UPDATED (Session 7)

- MCP server reference → agent discovery
- Example pitch: "major agent platforms" not just Claude

### 12. spm-name-squatting.md — UPDATED (Session 7)

- Reserved platform names expanded: cursor, windsurf, codeium, goose, amp, kiro, roo-code, vercel, skills-sh
- Detection uses string-similarity + confusables npm packages

### 13. spm-publisher-identity.md — UPDATED (Session 7)

- Sigstore details in publish flow
- 3-layer security scan in publish pipeline

### 14. spm-authoring-flow.md — UPDATED (Session 7)

- Publish output shows 3-layer scan + sigstore bundle
- Agent-agnostic SKILL.md template

### 15. spm-architecture.md — FULLY UPDATED (Session 7)

- Title: "Skills Package Manager for Agent Skills" (was "for Claude")
- Intro: agent-agnostic vision statement
- Manifest example: `agents` namespace, `$WORKDIR`/`$OUTPUTS` paths
- Section 5.3: fully rewritten — Vercel skills CLI replaces manual platform detection
- Section 6: MCP workflow is agent-agnostic ("Agent's thinking" not "Claude's thinking")
- Section 7.3: "Agent Platform Integration" (was "Claude.ai Integration")
- Section 9.4: runtime security uses `$WORKDIR`/`$SKILL_DIR`/`$OUTPUTS` variables
- Section 10: signing flow rewritten for Sigstore keyless (was GPG-style keypair)
- Section 10.3: sigstore-js implementation table (was "Implementation Options")
- End-to-end flow: fully agent-agnostic
- Glossary: all definitions updated
- Platform badges: "Claude Code, Cursor, Copilot, 37+ agents"

### 16. spm-registry-infrastructure.md — UPDATED (Session 7)

- Scanner worker: 3-layer model with ProtectAI + Lakera
- DB schema uses Sigstore identity

### 17. spm-build-vs-borrow.md — NEW (Session 7)

- Complete build-vs-borrow analysis for every SPM component
- Dependency map of all npm packages and external APIs
- Architecture diagram with borrowed tools
- Timeline impact: 2 months → 3-4 weeks

---

## Files Not Needing Updates ✓

### spm-federation.md

- No Claude-specific language found. Already agent-agnostic.

### spm-bulk-import-scale.md

- No Claude-specific language found. Already agent-agnostic.

---

## Remaining Items 🔄

### ~~spm-runtime SKILL.md (meta-skill)~~ → CREATED ✅

The meta-skill that teaches agents about SPM. Includes:

- Trigger: skill management, discovery, registry queries
- MCP workflow (spm_search → suggest → spm_install → read SKILL.md)
- CLI fallback for non-MCP agents
- Trust tier reference (Official / Verified / Scanned / Unverified)
- Resolution hierarchy explanation (project > global > built-in)
- Project-level skills.json management
- MCP tool reference (spm_search, spm_info, spm_install, spm_installed)
- 7 important rules for agent behavior
- 172 lines, 950 words — concise enough for agent context windows
- Companion manifest.json with `_meta.type: "meta-skill"` marker

### bootstrap.py

Not yet created. Needs:

- Multi-agent directory detection (via npx skills)
- Link to all detected agents on install

---

## New Architecture Components

### ~~spm-linker~~ → REPLACED by Vercel skills CLI (Session 6/7)

```
STATUS: ELIMINATED

The spm-linker package was designed to auto-detect installed agents
and link skills to all of them. Vercel's open-source skills CLI
(npx skills) already does this for 37+ agents.

DECISION: Don't build spm-linker. Use Vercel's CLI as a subprocess.

SPM install flow:
  spm install data-viz
    → download .skl from SPM registry
    → unpack to ~/.spm/cache/data-viz@1.2.0/
    → run 3-layer security scan
    → verify sigstore signature
    → npx skills add ~/.spm/cache/data-viz@1.2.0/ -a '*' -y
    → "✓ Installed data-viz@1.2.0"
    → "  Linked to: Claude Code, Cursor"

Savings: 3-4 weeks of development
License: Open source (MIT)
```

### npm-bridge (IN spm-shared)

```
Purpose: Import existing agent-skill packages from npmjs.org

How it works:
  1. Search npm for packages with "agent-skill" keyword
  2. Download the package
  3. Extract SKILL.md from skills/<name>/SKILL.md or root SKILL.md
  4. Generate manifest.json from package.json metadata
  5. Run content security scan
  6. Publish to SPM registry (with "imported-from-npm" flag)

CLI:
  spm import --from npm react-patterns
    → Downloads from npm
    → Extracts SKILL.md
    → Scans content
    → Publishes to SPM as react-patterns@<version>

  spm import --from npm --keyword agent-skill --all
    → Batch import all 90+ agent-skill packages from npm
    → Used to seed the SPM registry at launch

Metadata mapping:
  npm package.json          → SPM manifest.json
  ─────────────────────────────────────────────
  name                      → name
  version                   → version
  description               → description
  author                    → authors[0]
  license                   → license
  keywords                  → keywords
  homepage                  → urls.homepage
  repository.url            → urls.repository
  bugs.url                  → urls.issues
  funding                   → urls.funding
  skillpm.mcpServers        → agents.requires_mcp
```

---

## Key Terminology Changes

```
OLD                              NEW
───────────────────────────────────────────────────
"Claude skills"                  "Agent Skills"
"Claude skill package manager"   "Agent Skills package manager"
"claude namespace"               "agents namespace"
"Claude's skill system"          "The Agent Skills standard"
"claude.platforms"               "agents.platforms"
"claude.requires_tools"          "agents.requires_tools"
"Works with Claude"              "Works with 26+ agent platforms"
"/home/claude"                   "$WORKDIR"
"/mnt/user-data/outputs"         "$OUTPUTS"
"Claude-first"                   "Agent-agnostic, standards-aligned"
"Designed for Anthropic transfer" "Designed for ecosystem transfer"
"No direct competitors"          "skillpm, LobeHub are competitors"
```

---

## Impact on Architecture Decisions

### What DOESN'T change:

- .skl format (still ZIP with SKILL.md + manifest.json)
- Registry infrastructure (Neon + R2 + Fly.io)
- Trust tiers and publisher identity
- Monetization strategy
- Federation architecture
- Reviews and ratings system
- Tech stack (TypeScript everywhere)

### What DOES change:

- Install flow adds agent linking step (via Vercel skills CLI, not spm-linker)
- Manifest uses `agents` namespace instead of `claude`
- CLI adds `spm agents` command
- CLI adds `spm import --from npm` command
- **REMOVED** spm-linker package (Vercel skills CLI handles this)
- npm-bridge module in spm-shared
- Seed strategy: import 90+ skills from npm + 200+ from skills.sh on Day 1
- Competitive positioning: vs skillpm and Vercel skills.sh
- Success metrics: track per-platform installs
- Risk profile: much lower (not dependent on single platform)

---

## Session 7 Changes — Build vs. Borrow (Feb 28, 2026)

### Discovery

Researched existing tools across every step of SPM's flow. Found that most heavy components already exist as open-source libraries or free APIs.

### Key Borrowed Tools

| SPM Step               | Tool                                          | License     | Cost               |
| ---------------------- | --------------------------------------------- | ----------- | ------------------ |
| Agent linking          | Vercel skills CLI (npx skills)                | Open source | Free               |
| Prompt injection (ML)  | ProtectAI/deberta-v3-base-prompt-injection-v2 | Apache 2.0  | Free (self-hosted) |
| Prompt injection (API) | Lakera Guard                                  | Proprietary | Free 10k/month     |
| Package signing        | sigstore-js (@sigstore/sign, /verify)         | Apache 2.0  | Free               |
| Name squatting         | string-similarity + confusables               | MIT         | Free               |
| Version resolution     | npm semver                                    | ISC         | Free               |
| Schema validation      | Zod                                           | MIT         | Free               |
| ZIP handling           | archiver + yauzl                              | MIT         | Free               |
| CLI framework          | Commander.js                                  | MIT         | Free               |

### Timeline Impact

- Original Phase 1 estimate: 2 months
- Revised Phase 1 estimate: 3-4 weeks
- Sigstore signing moved from Phase 3 → Phase 1
- spm-linker eliminated entirely (Vercel CLI replaces it)

### Documents Updated

| Document                       | Changes                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| spm-content-security.md        | 3-layer security model (regex + ProtectAI DeBERTa + Lakera Guard). TypeScript code for ML classification. Server-side publish flow with all 3 layers.   |
| spm-reviews-and-stack.md       | Removed spm-linker package. Added borrowed tools table. Updated Phase 1 (3-4 weeks with sigstore + Vercel CLI). Moved sigstore from Phase 3 → Phase 1.  |
| spm-publisher-identity.md      | Sigstore details in publish flow (Fulcio CA, Rekor log). 3-layer security scan in publish pipeline. Updated scoring for sigstore signing.               |
| spm-install-deep-dive.md       | Section 4.4 rewritten: Vercel skills CLI replaces manual linking. Sigstore verification uses @sigstore/verify API. Agent-agnostic index entries.        |
| spm-authoring-flow.md          | Publish output shows 3-layer scan results and sigstore bundle. SKILL.md template uses agent-agnostic language.                                          |
| spm-distribution.md            | Bootstrap uses Vercel skills CLI instead of Claude-specific directory probing. All Claude references → agent-agnostic.                                  |
| spm-name-squatting.md          | Detection code references string-similarity and confusables npm packages. Homoglyph detection uses confusables (UAX #39). TypeScript examples.          |
| spm-architecture.md            | Component map updated with all borrowed tools. Security pipeline shows 3-layer model. Roadmap compressed (MVP in 3-4 weeks). Agent-agnostic throughout. |
| spm-registry-infrastructure.md | Scanner worker shows 3-layer model with ProtectAI DeBERTa + Lakera. DB schema uses Sigstore identity.                                                   |
| spm-doc-changelog.md           | This entry.                                                                                                                                             |

### NEW document: spm-build-vs-borrow.md

Complete analysis of every step in SPM's flow mapped to existing tools. Includes dependency map, architecture diagram, and timeline impact.

### NEW document: spm-runtime-SKILL.md + manifest.json

The actual meta-skill that gets installed into agent skill directories. Teaches agents about SPM skill resolution, MCP tools, trust tiers, CLI commands, and project-level management. Ships bundled with the SPM CLI binary.

### NEW document: spm-open-questions-resolved.md

All 15 open design questions consolidated and decided. Covers: ONNX vs HF API (ONNX), fork Vercel CLI (no, subprocess), index skills.sh Day 1 (top 50), global vs per-project (both), who can publish (open + scan gate), skill forking (namespaces + attribution), composition (deps only), telemetry (anonymous + opt-in), pricing (free Phase 1-2), federation (Phase 3), Lakera phase (integration Phase 1), CLI framework (Commander.js), lock file coexistence (each tool owns its own), trust tier storage (per-author + per-version scans).
