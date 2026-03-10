# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in SPM, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email **support@skillpkg.dev** with:

- Description of the vulnerability
- Steps to reproduce
- Affected component (API, CLI, web, registry)
- Severity assessment (if known)

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation within 7 days for critical issues.

## Scope

This policy covers:

- **Registry API** (`registry.skillpkg.dev`)
- **CLI** (`@skillpkg/cli`)
- **Web app** (`skillpkg.dev`)
- **Admin panel** (`admin.skillpkg.dev`)
- **Skill security scanning pipeline** (Layers 1-3)
- **Authentication and authorization** (GitHub OAuth, JWT)

## Security Scanning

All published skills are scanned through a 3-layer security pipeline:

1. **Layer 1** — Static analysis (regex pattern matching)
2. **Layer 2** — ML classification (ProtectAI DeBERTa)
3. **Layer 3** — Lakera Guard API

Skills that fail scanning are blocked from the registry.
