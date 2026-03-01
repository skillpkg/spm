# SPM — Skills Package Manager

**SPM is how you find, install, and share Agent Skills.**

The [Agent Skills standard](https://agentskills.io) defines the format. SPM solves distribution.

```bash
# Install a skill — all your agents can now use it
spm install data-viz

# Search for skills
spm search "pdf tools"

# Publish your own skill
spm init my-skill
spm publish
```

## What It Does

- **Find** skills that extend what your AI agents can do
- **Install** them with one command, linked to all your agents
- **Share** skills you've built with the community
- **Manage** versions, dependencies, and security

Works with Claude Code, Cursor, Copilot, Codex, and 30+ agent platforms that support the Agent Skills standard.

## Stack

| Component | Tech                        |
| --------- | --------------------------- |
| Monorepo  | pnpm workspaces + Turborepo |
| API       | Hono (Cloudflare Workers)   |
| Database  | Neon Postgres + Drizzle ORM |
| Storage   | Cloudflare R2               |
| CLI       | TypeScript + Commander.js   |
| Web       | React + Vite + Tailwind     |
| Auth      | GitHub OAuth device flow    |
| Signing   | Sigstore keyless            |

## Project Structure

```
packages/
  shared/   — Zod schemas, types, constants
  api/      — Registry API (Cloudflare Workers)
  cli/      — spm CLI (npm package)
  web/      — spm.dev (Cloudflare Pages)
migrations/ — Neon Postgres SQL migrations
plan/       — Full spec docs
```

## Development

```bash
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm test           # Run tests
pnpm typecheck      # Type check
pnpm lint           # Lint
```

## License

Apache-2.0
