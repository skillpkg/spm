# SPM — Built to Transfer

## Building for Independent Launch with Future Corporate Adoption

---

## 1. The Goal

```
Phase 1: You build it, you own it, you run it
Phase 2: Community grows, contributors join
Phase 3: A company (Anthropic, or others) wants to adopt/co-maintain
Phase 4: Smooth handoff or shared governance — no rewrites needed
```

This means every decision from Day 1 must optimize for:

- **Clean IP ownership** — no ambiguity about who owns what
- **Modular architecture** — components can be adopted independently
- **Standard tooling** — nothing proprietary, everything replaceable
- **Open governance** — clear contribution rules from the start
- **Data portability** — registry data can be migrated or federated

---

## 2. Licensing Strategy

This is the most important decision for transferability.

### Recommended: Apache 2.0

```
Why Apache 2.0 (not MIT, not AGPL):

✓ Explicitly grants patent rights — protects Anthropic (or anyone)
  from patent claims if they adopt it
✓ Requires attribution — your name stays on it
✓ Allows commercial use — no friction for corporate adoption
✓ Allows proprietary extensions — a company can build on top
  without open-sourcing their additions
✓ CLA-compatible — standard for projects that may transfer
  to a foundation or company
✗ Does NOT require derivative works to be open source
  (that's fine — you want adoption, not control)

Why NOT MIT:
  - No patent grant (risky for corporate adopters)

Why NOT AGPL:
  - Forces anyone running the registry server to open-source
    their modifications — kills corporate/enterprise adoption

Why NOT BSL/SSPL:
  - "Source available" licenses scare corporate legal teams
  - Anthropic would likely not adopt a BSL project
```

### Dual License Option

If you want to monetize while keeping it open:

```
Core (CLI, .skl format, protocol):     Apache 2.0
Registry server:                        Apache 2.0
Enterprise features (SSO, audit, etc):  Commercial license
```

This is the Elastic/Redis/MongoDB model — core is open, enterprise features are paid. But for maximum transferability, just go full Apache 2.0.

### License Files

```
spm/
├── LICENSE                    # Apache 2.0
├── NOTICE                     # Attribution notice (required by Apache 2.0)
├── CONTRIBUTORS.md            # All contributors
└── CLA.md                     # Contributor License Agreement
```

```
// NOTICE
SPM — Skills Package Manager
Copyright 2026 Almog [Last Name]

Licensed under the Apache License, Version 2.0
```

---

## 3. Contributor License Agreement (CLA)

This is critical for transferability. A CLA ensures you (and later, any adopting organization) have the rights to all contributed code.

```markdown
# SPM Contributor License Agreement

By contributing to this project, you agree that:

1. You grant the project maintainers a perpetual, worldwide,
   non-exclusive, royalty-free license to use, modify, and
   distribute your contributions under the project's license.

2. You have the right to make your contributions (they're your
   original work, or you have permission).

3. Your contributions may be relicensed under a compatible
   open-source license if the project governance changes.

4. You understand that your contributions are public and that
   a record of the contribution is maintained indefinitely.
```

**Why this matters**: Without a CLA, if Anthropic wants to adopt SPM, they'd need permission from every contributor individually. With a CLA, the project can be transferred cleanly.

Use **CLA Assistant** (GitHub App) to automate this — contributors sign on their first PR.

---

## 4. Architecture for Transferability

### 4.1 Monorepo Structure

```
spm/
├── LICENSE
├── NOTICE
├── CONTRIBUTING.md
├── GOVERNANCE.md
├── CODE_OF_CONDUCT.md
│
├── packages/
│   ├── cli/                      # The spm CLI
│   │   ├── package.json          # Independent package
│   │   ├── src/
│   │   └── tests/
│   │
│   ├── registry-server/          # Registry API
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── src/
│   │   └── tests/
│   │
│   ├── registry-web/             # Web UI (marketplace)
│   │   ├── package.json
│   │   ├── src/
│   │   └── tests/
│   │
│   ├── mcp-server/               # MCP server for agent discovery
│   │   ├── package.json
│   │   ├── src/
│   │   └── tests/
│   │
│   ├── scanner/                  # Security scanner
│   │   ├── package.json
│   │   ├── src/
│   │   └── tests/
│   │
│   ├── sdk/                      # JS/Python SDK for registry API
│   │   ├── package.json
│   │   ├── src/
│   │   └── tests/
│   │
│   └── shared/                   # Shared types, utils, constants
│       ├── package.json
│       └── src/
│           ├── manifest-schema.ts
│           ├── semver.ts
│           └── types.ts
│
├── specs/                        # Protocol specifications
│   ├── skl-format-v1.md          # .skl package format spec
│   ├── manifest-v1.md            # manifest.json schema
│   ├── registry-api-v1.md        # REST API specification
│   ├── resolution-v1.md          # Version resolution algorithm
│   └── security-scanning-v1.md   # Scanner rules and checks
│
├── infra/                        # Infrastructure as Code
│   ├── docker-compose.yml        # Self-hosted setup
│   ├── terraform/                # AWS deployment
│   ├── fly.toml                  # Fly.io deployment
│   └── k8s/                      # Kubernetes manifests
│
├── docs/                         # Documentation
│   ├── getting-started.md
│   ├── publishing.md
│   ├── self-hosting.md
│   └── api-reference.md
│
└── .github/
    ├── workflows/
    │   ├── ci.yml
    │   ├── release.yml
    │   └── security-audit.yml
    ├── ISSUE_TEMPLATE/
    ├── PULL_REQUEST_TEMPLATE.md
    └── CODEOWNERS
```

### 4.2 Why This Structure Matters for Handoff

| Decision                     | Reason                                                                      |
| ---------------------------- | --------------------------------------------------------------------------- |
| **Monorepo**                 | Everything in one place — easy to fork, easy to transfer ownership          |
| **Independent packages**     | A company can adopt just the CLI, or just the registry, or just the scanner |
| **Specs separate from code** | The protocol/format specs can live on even if the code is rewritten         |
| **IaC included**             | New maintainer can deploy without reverse-engineering your setup            |
| **Docker Compose**           | Anyone can run the full stack locally in 5 minutes                          |
| **Comprehensive tests**      | New maintainers can refactor with confidence                                |

### 4.3 Technology Choices for Transferability

Pick boring, mainstream tech that any company's engineering team already knows:

```
CLI:              Node.js (TypeScript) or Rust
                  → Both well-known, large talent pools
                  → Rust preferred for distribution (single binary)
                  → Node.js faster to prototype

Registry API:     Node.js (Fastify) or Go
                  → Standard web server, nothing exotic
                  → Easy to find maintainers

Database:         PostgreSQL
                  → Universal, every cloud has a managed version
                  → NOT DynamoDB, NOT MongoDB (vendor/taste lock-in)

Object Storage:   S3 API-compatible
                  → Works with AWS S3, Cloudflare R2, MinIO, GCS
                  → NOT a proprietary storage API

Cache:            Redis
                  → Universal, every cloud has managed Redis

Queue:            BullMQ (Redis-based) or SQS
                  → Simple, replaceable
                  → NOT Kafka (overkill, hard to maintain)

Web UI:           Next.js or plain React
                  → Largest talent pool in frontend
                  → NOT Svelte, NOT Solid (too niche for handoff)

MCP Server:       Standard MCP SDK (TypeScript or Python)
                  → Anthropic's own protocol — natural fit

IaC:              Terraform + Docker
                  → Industry standard
                  → NOT Pulumi, NOT CDK (smaller communities)
```

**The principle**: if a senior engineer at Anthropic (or Google, or Amazon) opens the repo, they should recognize every tool and be productive within a day.

---

## 5. Governance Model

### 5.1 Start: Benevolent Dictator (You)

```
Phase 1 — Solo/Small Team:

  Almog (Creator & Lead Maintainer)
    ├── Full commit access
    ├── Release authority
    ├── Registry admin
    └── Final say on direction

  Contributors
    ├── Submit PRs
    ├── Sign CLA
    └── Triage issues (with permission)
```

### 5.2 Growth: Core Team

```
Phase 2 — Community Growing:

  Core Maintainers (3-5 people)
    ├── Merge access to specific packages
    ├── Release specific components
    └── Vote on RFCs

  Creator (Almog)
    ├── Veto power (use sparingly)
    ├── Governance changes
    └── Core team membership decisions

  Contributors
    ├── PRs, issues, discussions
    └── RFC proposals
```

### 5.3 Maturity: Foundation or Corporate Stewardship

```
Phase 3 — If a company wants to adopt:

  Option A: Company sponsors the project
    ├── Company provides: hosting, CI, full-time engineer(s)
    ├── You remain: lead maintainer, governance role
    ├── Project stays: open source, community-governed
    ├── Example: Vercel sponsors Next.js

  Option B: Company forks and maintains alongside
    ├── Company runs their own registry (already supported)
    ├── Contributes back to upstream
    ├── Example: Google with Kubernetes

  Option C: Transfer to a foundation
    ├── Linux Foundation, OpenJS Foundation, etc.
    ├── Neutral governance, corporate members pay dues
    ├── You stay on the Technical Steering Committee
    ├── Example: Node.js → OpenJS Foundation

  Option D: Full acquisition
    ├── Company acquires the project and IP
    ├── CLA makes this legally clean
    ├── Negotiate: maintainer role, commitment to open source
    ├── Example: Docker, npm (acquired by GitHub)
```

### 5.4 GOVERNANCE.md

```markdown
# SPM Governance

## Project Leadership

SPM is currently maintained by Almog [Last Name] (Creator) with
input from community contributors.

## Decision Making

- **Minor changes** (bug fixes, docs): Any maintainer can merge
- **Significant changes** (new features, API changes): Require RFC  
  and approval from lead maintainer
- **Breaking changes** (format changes, protocol changes): Require  
  RFC, community discussion period (14 days), and lead approval
- **Governance changes**: Require lead maintainer approval

## RFC Process

1. Open a GitHub Discussion with the "RFC" label
2. Community discussion for at least 14 days
3. Core maintainers review and provide feedback
4. Lead maintainer makes final decision
5. Accepted RFCs become tracking issues

## Becoming a Maintainer

Contributors who demonstrate sustained, high-quality contributions
may be invited to become core maintainers. The lead maintainer
makes this decision based on:

- Quality and consistency of contributions
- Understanding of project goals and architecture
- Ability to review others' code constructively
- Commitment to the project's values

## Future Governance Changes

If the project grows to the point where single-person leadership
is no longer appropriate, the governance model will evolve.
Possible paths include establishing a Technical Steering Committee,
joining an open-source foundation, or partnering with a corporate
sponsor. Any such change will be discussed openly with the community.

## Code of Conduct

This project follows the Contributor Covenant Code of Conduct.
See CODE_OF_CONDUCT.md.
```

---

## 6. Specification-First Design

The most transferable thing isn't code — it's **specifications**. If the specs are solid, anyone can rewrite the implementation.

### What to Specify

```
specs/
├── skl-format-v1.md           # .skl file structure
│   - File layout
│   - manifest.json schema (JSON Schema)
│   - Checksum algorithm
│   - Signature format
│   - Compression format
│
├── manifest-v1.md             # manifest.json full spec
│   - All fields with types
│   - Version range syntax
│   - Dependency declaration
│   - Security declarations
│   - Platform compatibility
│
├── registry-api-v1.md         # REST API spec (OpenAPI 3.0)
│   - All endpoints
│   - Request/response schemas
│   - Authentication
│   - Rate limits
│   - Error codes
│
├── resolution-v1.md           # Version resolution algorithm
│   - Semver rules
│   - Dependency tree building
│   - Conflict resolution
│   - Project vs global priority
│
├── security-scanning-v1.md    # What the scanner checks
│   - Static analysis rules
│   - Prompt injection patterns
│   - Permission audit rules
│   - Trust tier definitions
│
├── skills-json-v1.md          # skills.json format
│   - Schema
│   - Resolution strategies
│   - Override syntax
│   - Lock file format
│
└── signing-v1.md              # Package signing spec
    - Sigstore integration
    - Key registration
    - Verification flow
    - Transparency log
```

### OpenAPI Spec for the Registry

```yaml
# specs/registry-api-v1.yaml (partial)
openapi: 3.0.3
info:
  title: SPM Registry API
  version: 1.0.0
  license:
    name: Apache 2.0

paths:
  /api/v1/skills:
    get:
      summary: Search skills
      parameters:
        - name: q
          in: query
          schema: { type: string }
        - name: category
          in: query
          schema: { type: string }
      responses:
        '200':
          description: Search results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SearchResults'

  /api/v1/skills/{name}/{version}/download:
    get:
      summary: Download a skill package
      responses:
        '302':
          description: Redirect to package URL

# This OpenAPI spec means anyone can:
# - Generate client SDKs automatically
# - Build a compatible registry server in any language
# - Test compliance with the spec
```

**Why specs matter for handoff**: If Anthropic decides to build their own registry implementation in Go or Rust, they can do it from the spec without reading your Node.js code. The spec IS the product — the code is just one implementation.

---

## 7. Data Portability

If the registry needs to move (new host, new owner, new implementation), data export must be trivial.

### Export Format

```bash
$ spm-admin export --format=portable --output ./export/

Exporting registry data...
  ✓ Skills metadata:  export/skills.jsonl       (1 JSON per line)
  ✓ Versions:         export/versions.jsonl
  ✓ Authors:          export/authors.jsonl
  ✓ Reviews:          export/reviews.jsonl
  ✓ Packages:         export/packages/           (all .skl files)
  ✓ Signatures:       export/signatures/         (all .sig files)
  ✓ Export manifest:  export/manifest.json

Export complete: 2.3 GB total
```

```json
// export/manifest.json
{
  "format_version": "1.0",
  "exported_at": "2026-06-15T10:00:00Z",
  "source": "https://registry.spm.dev",
  "stats": {
    "skills": 1247,
    "versions": 5891,
    "authors": 834,
    "reviews": 3201,
    "total_package_size_gb": 2.1
  },
  "files": {
    "skills": "skills.jsonl",
    "versions": "versions.jsonl",
    "authors": "authors.jsonl",
    "reviews": "reviews.jsonl",
    "packages_dir": "packages/",
    "signatures_dir": "signatures/"
  }
}
```

### Import into New Registry

```bash
# New registry (could be Anthropic's, could be a fork)
$ spm-admin import ./export/

Importing registry data...
  ✓ 834 authors imported
  ✓ 1247 skills imported
  ✓ 5891 versions imported
  ✓ 3201 reviews imported
  ✓ Packages synced to S3
  ✓ Search index rebuilt

Import complete. Registry ready.
```

---

## 8. Making It Attractive for Corporate Adoption

What would make Anthropic (or a similar company) want to adopt/support SPM:

### 8.1 Things to Build

| Feature                         | Why It Matters to Anthropic                  |
| ------------------------------- | -------------------------------------------- |
| **Clean, well-tested codebase** | Low cost to adopt and maintain               |
| **Comprehensive specs**         | Can reimplement in their preferred stack     |
| **Security scanning**           | They care deeply about safety                |
| **Self-hosting support**        | Enterprise customers need private registries |
| **MCP integration**             | Native to their ecosystem                    |
| **Active community**            | Proves demand, provides free QA              |
| **Usage metrics**               | Shows the ecosystem is real and growing      |

### 8.2 Community Building

```
Month 1-3:   Build core, publish to GitHub, write great docs
Month 3-6:   Launch public registry, seed with useful skills
             Blog posts, Twitter/X presence, Discord server
Month 6-9:   Conference talks (AI Engineer, etc.)
             Encourage contributions, grow core team
Month 9-12:  Enterprise features, private registry support
             Approach Anthropic with traction data

Traction metrics that matter:
  - GitHub stars (vanity but signals interest)
  - Published skills count
  - Monthly active CLI users
  - Download counts
  - Number of contributors
  - Companies using private registries
```

### 8.3 The Conversation with Anthropic

When the time comes, you want to be able to say:

> "SPM has X published skills, Y monthly active users, and Z
> companies running private registries. The codebase is Apache 2.0
> with a CLA, specs are fully documented, and the registry can be
> deployed on your infrastructure with `docker-compose up`.
>
> Here's how we could work together:
>
> - You host the public registry (better infrastructure, trust signal)
> - I continue as lead maintainer
> - We integrate natively into major agent platforms (Claude Code, Cursor, Copilot, etc.)
> - Enterprise features fund continued development"

---

## 9. What NOT to Do

| Anti-Pattern                 | Why It Kills Transferability                                 |
| ---------------------------- | ------------------------------------------------------------ |
| **Proprietary format**       | No one will adopt a format only your code can read           |
| **Vendor-locked infra**      | "Only works on AWS" limits who can run it                    |
| **No specs, just code**      | Forces adopter to reverse-engineer everything                |
| **GPL/AGPL license**         | Corporate legal teams will reject it                         |
| **No CLA**                   | Can't transfer IP cleanly                                    |
| **Hardcoded assumptions**    | Config should be env vars, not code                          |
| **Single-person bus factor** | Document everything, grow contributors                       |
| **No tests**                 | New maintainers can't refactor safely                        |
| **Mixing concerns**          | CLI depending on registry internals = can't adopt separately |

---

## 10. Day 1 Checklist

```
Before writing any code:

□ Create GitHub org: github.com/spm-dev (or similar)
□ LICENSE file: Apache 2.0
□ NOTICE file: your copyright
□ CLA: set up CLA Assistant GitHub App
□ GOVERNANCE.md: benevolent dictator model
□ CONTRIBUTING.md: how to contribute
□ CODE_OF_CONDUCT.md: Contributor Covenant
□ README.md: vision, quick start, architecture overview

□ Write specs first:
  □ .skl format spec
  □ manifest.json JSON Schema
  □ Registry API OpenAPI spec
  □ Resolution algorithm

□ Set up monorepo:
  □ packages/ structure
  □ Shared types/schemas
  □ CI/CD pipeline
  □ Release automation

□ Choose stack:
  □ CLI: TypeScript (fast to build) or Rust (better distribution)
  □ Registry: Fastify (TypeScript)
  □ Database: PostgreSQL
  □ Storage: S3-compatible
  □ Cache: Redis

Then start building.
```

---

## Summary

```
┌──────────────────────────────────────────────────┐
│           Transferability Pillars                  │
│                                                  │
│  1. LEGAL                                        │
│     Apache 2.0 + CLA + NOTICE                    │
│     → Clean IP, patent grant, attributable       │
│                                                  │
│  2. ARCHITECTURAL                                │
│     Monorepo + independent packages + specs      │
│     → Adopt whole or parts, reimplement freely   │
│                                                  │
│  3. TECHNICAL                                    │
│     Boring tech + tests + IaC + Docker           │
│     → Any team can run, modify, and deploy       │
│                                                  │
│  4. GOVERNANCE                                   │
│     Clear roles + RFC process + path to evolve   │
│     → Smooth transition when the time comes      │
│                                                  │
│  5. DATA                                         │
│     Export/import + portable formats              │
│     → Registry can migrate without data loss     │
│                                                  │
│  6. COMMUNITY                                    │
│     Docs + contributing guide + growing users     │
│     → Proves value, reduces adoption risk        │
└──────────────────────────────────────────────────┘
```

The bottom line: **build it like you're building it for someone else to maintain**, because one day they might. Every decision — from license to database to folder structure — should make a future maintainer's life easier.
