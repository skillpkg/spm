# SPM — Goals, Vision, and Positioning

## The Foundational Document

This is the "why" and "what" behind SPM. Every other document in this plan is a "how." Read this first.

---

## 1. The Problem

Agent Skills are an open standard. 26+ platforms have adopted them — Claude, OpenAI Codex, Gemini CLI, GitHub Copilot, Cursor, VS Code, Roo Code, Amp, Goose, Mistral AI, Databricks, and more. The format is universal: a SKILL.md with YAML frontmatter, optional scripts, references, and assets. Write once, use everywhere.

The standard defines what a skill IS. But sharing skills is broken.

```
Today, if you build a great skill:

  1. You put it in a GitHub repo, or ZIP it up
  2. You... share the link on Discord? Post it on Reddit?
     Email it? Upload it to a Slack channel?
  3. Someone clones/downloads it
  4. They manually place it in their skills directory
  5. They have no idea if it's safe, what version it is,
     what it depends on, or if there's a newer version
  6. When you fix a bug, repeat from step 2

This is how npm worked before npm existed.
This is how Python worked before pip existed.
It's solvable.
```

The Agent Skills spec (agentskills.io) defines the format. SPM solves distribution.

---

## 2. The Vision

**SPM is how you find, install, and share Agent Skills.**

That's the whole pitch. One sentence.

It should feel as natural as:

- `npm install express` → `spm install data-viz`
- `pip install pandas` → `spm install pdf-tools`
- `brew install ffmpeg` → `spm install chart-maker`

A developer who has never seen SPM before should be productive within 60 seconds:

```bash
$ spm install data-viz
  ✓ Installed data-viz@1.2.0
  ✓ Linked to: Claude Code, Cursor, VS Code

# Done. Your agents can now make charts.
```

A skill author should go from idea to published in under 10 minutes:

```bash
$ spm init my-skill
$ # ... write SKILL.md ...
$ spm publish
  ✓ Published my-skill@1.0.0
  ✓ Available in: Claude, Codex, Copilot, Cursor, and 22 more
```

---

## 3. What SPM Is

**SPM is the package manager for Agent Skills.**

It lets you:

- **Find** skills that extend what your AI agents can do
- **Install** them with one command, linked to all your agents
- **Share** skills you've built with the community
- **Manage** which skills are active, what version, and what depends on what

It handles:

- Packaging (SKILL.md + scripts + manifest → `.skl` file)
- Versioning (semver, updates, changelogs)
- Discovery (search, categories, keywords)
- Security (content scanning, signing, trust tiers)
- Dependencies (skill-on-skill, pip, npm)
- Agent linking (install once, available in Claude, Cursor, Copilot, Codex, etc.)

---

## 4. What SPM Is NOT

```
SPM is NOT a container registry.
  It doesn't manage images, layers, or runtimes.
  Skills are lightweight text + scripts, not containerized apps.

SPM is NOT an artifact repository.
  It's not JFrog, Nexus, or Harbor.
  There are no build artifacts, binaries, or compiled outputs.

SPM is NOT a prompt template library.
  Skills include scripts, references, and complex instructions.
  They're more than text templates.

SPM is NOT a marketplace (yet).
  It starts as a free ecosystem. Monetization comes later,
  and when it does, it's author-driven, not platform-driven.

SPM is NOT an npm wrapper.
  Unlike tools that piggyback on npmjs.org, SPM has its own
  purpose-built registry designed for AI skills — with content
  security scanning, trust verification, trigger analytics,
  and agent-native discovery that npm can't provide.

SPM is NOT platform-specific.
  It works with the Agent Skills open standard (agentskills.io).
  Any platform that supports the standard works with SPM.
```

---

## 5. Positioning and Language

### 5.1 How We Talk About SPM

SPM borrows the **developer experience** of npm/pip (familiar commands, familiar workflow) but the **language** should stay in the Agent Skills world.

```
USE:                                    AVOID:
─────────────────────────────────────────────────────────
"Install a skill"                       "Pull an image"
"Publish your skill"                    "Push to the registry"
"Browse skills"                         "Browse the registry"
"The SPM ecosystem"                     "The SPM registry"
"spm.dev" (the website)                 "The skill hub"
"Skill catalog" / "skill library"       "Artifact repository"
"Skill author"                          "Package maintainer"
"Find skills"                           "Search the index"
"Share your skill"                      "Upload your package"
"Update a skill"                        "Bump the dependency"
"Works with Claude, Cursor, Copilot..." "Claude-only tool"
"Agent Skills standard"                 "Our proprietary format"
```

### 5.2 The One-Liner (For Different Audiences)

```
For developers:
  "npm for Agent Skills."

For non-technical stakeholders:
  "A way to find and install new capabilities for AI agents
   like Claude, Copilot, Cursor, and Codex."

For Anthropic:
  "An open-source distribution system for the Agent Skills
   standard, with built-in security and trust."

For platform teams (Cursor, Codex, etc.):
  "The missing distribution layer for the Agent Skills
   standard your platform already supports."

For the README:
  "SPM is how you find, install, and share Agent Skills."
```

### 5.3 Why This Matters

The language shapes how people think about the product:

- "Registry" → people think Docker Hub, JFrog → enterprise, heavy, corporate
- "Hub" → people think GitHub → maybe ok, but implies centralization
- "Package manager" → people think npm, pip → fast, lightweight, developer-friendly
- "Skill manager" → people think "oh, it manages AI skills" → exactly right

**SPM is the skill package manager.** The CLI feels like npm. The website feels like a skill catalog. The experience feels lightweight and fast. The registry is an implementation detail that users never need to think about.

### 5.4 Relationship to the Agent Skills Standard

```
agentskills.io = The FORMAT (like HTML)
SPM            = The DISTRIBUTION (like a web browser + web server)

The Agent Skills spec defines:
  - SKILL.md format (YAML frontmatter + markdown)
  - Directory structure (scripts/, references/, assets/)
  - Progressive disclosure model
  - Metadata fields (name, description, license)

SPM adds what the spec doesn't cover:
  - Publishing and versioning
  - Discovery and search
  - Security scanning
  - Trust and verification
  - Analytics and metrics
  - Dependency management
  - Cross-agent installation
```

---

## 6. Design Principles

### 6.1 For Users

```
1. ONE COMMAND TO VALUE
   spm install X → all your agents can now do X.
   No config files, no setup, no restart.

2. ZERO CONFIGURATION
   Works out of the box. SPM auto-detects which agents
   you have (Claude Code, Cursor, VS Code, Codex) and links
   skills to all of them.

3. FAST
   Install should take <2 seconds for most skills.
   Search should feel instant.
   Publishing shouldn't feel like deploying.

4. SAFE BY DEFAULT
   Every skill is content-scanned before it reaches users.
   No skill can override your agents' safety guidelines.
   No skill can exfiltrate user data.

5. FAMILIAR
   If you've used npm, you already know SPM.
   install, search, publish, update — same verbs, same flow.

6. AGENT-AGNOSTIC
   Install once, works everywhere. Claude, Cursor, Copilot,
   Codex — any platform supporting the Agent Skills standard.
```

### 6.2 For Skill Authors

```
1. EASY TO START
   spm init + spm publish. That's the whole workflow.
   Three required fields in manifest.json.
   Everything else is optional.

2. WRITE ONCE, REACH EVERYWHERE
   Publish one skill, it's installable by users of Claude,
   Cursor, Codex, Copilot, and every other platform that
   supports the Agent Skills standard.

3. INSTANT FEEDBACK
   spm validate tells you what's wrong before you publish.
   spm test runs your test cases locally.
   Content scan failures explain exactly what to fix.

4. YOUR SKILL, YOUR RULES
   Free, paid, sponsorship — your choice.
   MIT, Apache, Proprietary — your license.
   Public, private, scoped — your distribution model.

5. DATA TO IMPROVE
   Analytics from Day 1: installs, triggers, search impressions.
   You know how people find and use your skill.
   You can optimize your description for better discovery.

6. COMMUNITY
   Reviews, ratings, and feedback loops.
   Bug reports and feature requests.
   Collaborate through skill dependencies.
```

### 6.3 For the Ecosystem

```
1. OPEN SOURCE CORE
   CLI, .skl format, protocol specs — Apache 2.0.
   Anyone can build on it. Anyone can self-host.
   No vendor lock-in.

2. STANDARDS-ALIGNED
   Built on the Agent Skills open standard (agentskills.io).
   SPM doesn't invent a new skill format — it distributes
   the one 26+ platforms already support.

3. SECURITY IS NON-NEGOTIABLE
   Content scanning catches prompt injection, data exfiltration.
   Signed packages prove authenticity.
   Trust tiers reward good actors.
   Never trade security for convenience.

4. GROW THE PIE
   Bulk import makes it easy for companies to contribute.
   npm import brings existing agent-skill packages into SPM.
   Low friction → more authors → more skills → more users.
   The ecosystem is the product.

5. DESIGNED FOR TRANSFER
   Built so any organization can adopt it.
   Clean architecture, Apache 2.0, specs-first design.
   Independent but aligned with the ecosystem.
```

---

## 7. Success Metrics

### 7.1 Phase 1 — Launch (Months 0-3)

```
Skills published:        100+ (including imports from npm)
Skills installed:        1,000+ installs total
Active authors:          20+
CLI downloads:           500+
Agents supported:        4+ (Claude, Cursor, Copilot, Codex)
Security: zero incidents of harmful skills reaching users
```

### 7.2 Phase 2 — Growth (Months 3-6)

```
Skills published:        500+
Skills installed:        10,000+ installs/month
Active authors:          100+
Company bulk imports:    3+ companies
Search queries:          1,000+/month
Average install time:    <2 seconds
Agents supported:        8+
```

### 7.3 Phase 3 — Ecosystem (Months 6-12)

```
Skills published:        2,000+
Skills installed:        50,000+ installs/month
Active authors:          500+
Skill dependencies:      Skills depending on other skills
Community reviews:       Active review culture
First paying customers:  Enterprise tier or Pro dashboard
Platform partnerships:   Active discussion with agent platforms
```

### 7.4 North Star Metric

**Monthly skill triggers** — how often agents actually use installed skills to help users. This is the metric that proves SPM creates real value, not just downloads.

---

## 8. Who This Is For

### 8.1 Primary Users

```
SKILL CONSUMERS (80% of users):
  Developers and AI agent users who want to extend capabilities.
  They use Claude, Cursor, Copilot, Codex, or other agents.
  They search, install, rate. They rarely publish.
  They care about: "does it work?", "is it safe?", "is it easy?"

SKILL AUTHORS (15% of users):
  Developers who build skills and want to share them.
  They publish, version, monitor analytics.
  They care about: "can people find my skill?", "how many
  platforms can use it?", "how is it performing?"

COMPANIES (5% of users):
  Teams that build internal skills and want to manage them.
  They bulk-import, run private registries, manage access.
  They care about: "security", "access control", "analytics",
  "works across our toolchain (Cursor + Copilot + Claude)"
```

### 8.2 Not For (Now)

```
Non-developers who want a GUI-only experience.
  → Web UI comes later, but SPM is CLI-first.

People who want to sell skills as a primary business.
  → Monetization is Phase 3+. Don't build for this audience yet.
```

---

## 9. Competitive Landscape

```
DIRECT COMPETITORS:

  skillpm (launched Feb 2025)
    → Thin npm wrapper (~630 lines, 3 dependencies)
    → Uses npmjs.org as the registry (no custom registry)
    → 90+ agent-skill packages already on npm
    → No content security scanning
    → No trust tiers or verification
    → No analytics beyond npm download counts
    → No private registry support
    → Good: validated the market, fast to adopt
    → Weak: can't add security, trust, or analytics on top of npm

    SPM's advantages over skillpm:
      ✓ Content security scanning (prompt injection detection)
      ✓ Trust tiers and publisher verification
      ✓ Trigger analytics (unique — no other tool has this)
      ✓ Agent-native discovery (AI suggests skills via MCP)
      ✓ Private registries for companies (federation)
      ✓ Bulk import tools for enterprise migration

    SPM can ALSO import from npm:
      Skills published via skillpm on npm can be indexed/imported
      into SPM, adding security scanning and trust on top.

  LobeHub Skills Marketplace
    → Already indexing skills as a browsable marketplace
    → Web-based discovery
    → No CLI, no versioning, no security scanning

ADJACENT / ECOSYSTEM:

  agentskills.io (Anthropic — the open standard)
    → Defines the SKILL.md format. SPM distributes it.
    → Complementary, not competitive.
    → SPM is to Agent Skills what npm is to Node.js.

  cursor-skills (community repo)
    → MCP-based skill discovery for Cursor specifically
    → Imports from GitHub repos
    → No registry, no versioning, no security

  GPT Store (OpenAI)
    → Different model: GPTs are full custom personas, not skills.
    → Agent Skills / Codex skills are OpenAI's modular answer.
    → SPM serves the modular skill ecosystem, not GPTs.

  VS Code Extensions Marketplace
    → VS Code now supports Agent Skills natively.
    → Extensions can contribute skills via chatSkills.
    → SPM and VS Code marketplace serve different layers.

  npm / pip / brew
    → SPM borrows their DX. Not competitors — role models.

  MCP Servers
    → Complementary. MCP connects agents to external APIs.
    → Skills teach agents how to do things.
    → A skill can depend on MCP servers.
```

---

## 10. What's Unique About SPM

```
1. TRIGGER ANALYTICS
   No other package manager can tell you "how often the runtime
   considered your package." SPM can, because agents' skill
   selection process is observable. This is unique and valuable
   for skill authors across all platforms.

2. CONTENT SECURITY SCANNING
   npm/pip scan for malware in code. SPM scans for prompt
   injection in natural language. This problem is new and
   SPM is the first to solve it systematically for skills.

3. AI-NATIVE DISCOVERY
   Agents themselves can search and suggest skills via MCP.
   "I don't have a skill for that, but there's one on SPM —
   want me to install it?" No other package manager has the
   runtime actively discovering and recommending packages.

4. THE DESCRIPTION IS THE INTERFACE
   In npm, the description is marketing. In SPM, the description
   is the trigger mechanism — it's literally how agents decide
   whether to activate your skill. This changes how authors
   think about metadata.

5. CROSS-AGENT BY DEFAULT
   Install once, linked to every agent on your machine.
   Claude, Cursor, Copilot, Codex — SPM handles the wiring.

6. PURPOSE-BUILT REGISTRY
   Unlike tools that piggyback on npm, SPM's registry is
   designed for skills: content scanning, trust tiers,
   skill-specific search, federation for private registries.
   npm wasn't designed for AI instructions — SPM is.
```

---

## 11. Risk Assessment

```
RISK: A major platform builds their own skill distribution
  MITIGATION: SPM is standards-aligned (agentskills.io) and
  open source (Apache 2.0). Being cross-platform means no
  single platform's native solution replaces SPM.
  Even if Anthropic builds distribution for Claude, SPM serves
  users who use multiple agents.
  LIKELIHOOD: Medium
  IMPACT: Medium (no longer fatal — SPM isn't tied to one platform)

RISK: skillpm gains network effects via npm's existing ecosystem
  MITIGATION: Import npm agent-skill packages into SPM, adding
  the security and trust layer. Compete on what npm can't do:
  scanning, analytics, trust, private registries.
  LIKELIHOOD: Medium
  IMPACT: Medium

RISK: Nobody publishes skills
  MITIGATION: Import existing 90+ skills from npm as seed library.
  Bulk import from companies. Make publishing dead simple.
  LIKELIHOOD: Low (market validated — skills already exist on npm)
  IMPACT: High

RISK: Malicious skills cause harm
  MITIGATION: Content security scanning, trust tiers, signing,
  server-side double-checking, abuse score, rate limits.
  LIKELIHOOD: Medium (people will try)
  IMPACT: High (trust is everything)

RISK: Agent Skills standard changes fundamentally
  MITIGATION: The core concept is "agent reads a markdown file."
  That's been stable across 26+ platforms. Even if frontmatter
  fields change, the distribution problem remains.
  LIKELIHOOD: Low
  IMPACT: Medium

RISK: No adoption — developers don't care
  MITIGATION: Cross-platform reach means the addressable market
  is 26+ platforms, not just one. The value prop is clear:
  "one command to extend all your agents."
  LIKELIHOOD: Low-Medium
  IMPACT: High
```

---

## 12. The Plan in One Page

```
BUILD:
  CLI (install, publish, search, validate, test, migrate, import)
  .skl format (SKILL.md + manifest.json + checksums)
  Agent linker (auto-detect and wire to Claude, Cursor, Copilot, Codex)
  Security pipeline (content scanning, signing, trust tiers)
  Analytics (event collection, daily aggregation)
  npm bridge (import agent-skill packages from npmjs.org)

LAUNCH:
  Seed with 90+ existing npm agent-skill packages
  Seed with Anthropic's built-in skills as @official
  Bulk import from companies with existing skill libraries
  Bootstrap CLI via npm/pip/brew (zero-setup install)

GROW:
  Author analytics dashboard
  Web UI for browsing skills
  MCP integration (agents discover and suggest skills)
  GitHub Actions for CI/CD publish
  Federation for private registries
  Platform-specific integrations (VS Code extension, etc.)

SUSTAIN:
  Pro tier for advanced analytics
  Enterprise tier for private registries with support
  Optional sponsorship/tip system for authors
  Everything free stays free forever
```
