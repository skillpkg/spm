# SPM — Skills Package Manager

**SPM is how you find, install, and share Agent Skills.**

🌐 **[skillpkg.dev](https://skillpkg.dev)** — Browse skills, search the registry, view security scans

```bash
# Install the CLI
npm install -g @skillpkg/cli

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

## Links

- **Website:** [skillpkg.dev](https://skillpkg.dev)
- **CLI:** [`@skillpkg/cli`](https://www.npmjs.com/package/@skillpkg/cli)
- **API:** `registry.skillpkg.dev`
- **Docs:** [skillpkg.dev/docs](https://skillpkg.dev/docs)

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
  web/      — skillpkg.dev (Cloudflare Pages)
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
