<p align="center">
  <a href="https://skillpkg.dev">
    <img src="assets/logo-dark.png" alt="SPM" width="120" />
  </a>
</p>

<h1 align="center">SPM — Skills Package Manager</h1>

<p align="center">
  <strong>The package manager for AI agent skills.</strong><br/>
  <a href="https://skillpkg.dev">skillpkg.dev</a> · <a href="https://www.npmjs.com/package/@skillpkg/cli">npm</a> · <a href="https://skillpkg.dev/docs">docs</a>
</p>

<p align="center">
  <a href="https://claude.com/plugins/skillpkg"><img src="https://img.shields.io/badge/Claude-Plugin-blue" alt="Available on claude.com/plugins" /></a>
</p>

## Quick Start

```bash
# Install the CLI
npm install -g @skillpkg/cli

# Search for skills
spm search "pdf tools"

# Install a skill — linked to all your AI agents
spm install data-viz

# See what agents were detected
spm agents
```

Works with Claude Code, Cursor, Copilot, Codex, and 30+ agent platforms.

## Install Skills via Cowork

There is a `skillpkg` plugin for [Claude Cowork](https://claude.com/plugins) and Claude Code. Install it from [claude.com/plugins](https://claude.com/plugins) (search "skillpkg") or via:

```
claude plugin install skillpkg
```

Once installed, you get slash commands:

- `/skillpkg:search` — search the registry
- `/skillpkg:install` — install a skill
- `/skillpkg:info` — get skill details

See the [`skillpkg-plugin`](https://github.com/skillpkg/skillpkg-plugin) repo for more.

## Create & Publish

```bash
# Scaffold a new skill
spm init my-skill

# Test it (runs eval + security scan)
spm test

# Publish to the registry
spm login
spm publish
```

Every published skill is automatically security scanned (3 layers) and signed with [Sigstore](https://sigstore.dev) for supply chain integrity.

## MCP Server

Let your AI agents discover skills directly via [Model Context Protocol](https://modelcontextprotocol.io):

```bash
# Claude Code
claude mcp add spm -- npx -y @skillpkg/mcp

# Or add to .mcp.json
{ "mcpServers": { "spm": { "command": "npx", "args": ["-y", "@skillpkg/mcp"] } } }
```

See [`packages/mcp/README.md`](packages/mcp/README.md) for Claude Desktop and Cursor setup.

## Project Structure

```
packages/
  shared/     Zod schemas, types, constants          @spm/shared
  api/        Registry API (Cloudflare Workers)       registry.skillpkg.dev
  cli/        spm CLI                                 @skillpkg/cli
  web/        skillpkg.dev (Cloudflare Pages)
  admin/      Admin dashboard                         admin.skillpkg.dev
  mcp/        MCP server                              @skillpkg/mcp
  ui/         Shared React components                 @spm/ui
  web-auth/   Shared auth logic                       @spm/web-auth
migrations/   Neon Postgres SQL migrations
plan/         Spec docs
```

## Stack

| Component | Tech                                                 |
| --------- | ---------------------------------------------------- |
| Monorepo  | pnpm workspaces + Turborepo                          |
| API       | Hono on Cloudflare Workers                           |
| Database  | Neon Postgres + Drizzle ORM                          |
| Storage   | Cloudflare R2                                        |
| CLI       | TypeScript, Commander.js, Sigstore                   |
| Web       | React 19, Vite, Tailwind v4                          |
| Auth      | GitHub OAuth device flow + JWT                       |
| Security  | 3-layer scan pipeline (regex → static analysis → ML) |
| Signing   | Sigstore keyless (Fulcio + Rekor)                    |

## Development

```bash
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm test           # Run tests (~640 across all packages)
pnpm typecheck      # Type check all packages
pnpm lint           # Lint all packages
pnpm format         # Format with Prettier
```

### Package-level commands

```bash
pnpm --filter @spm/api dev          # Local API server
pnpm --filter @spm/web dev          # Local web dev server
pnpm --filter @spm/web test:e2e     # Playwright e2e tests
```

## Links

- **Website:** [skillpkg.dev](https://skillpkg.dev)
- **Registry API:** [registry.skillpkg.dev](https://registry.skillpkg.dev)
- **Admin:** [admin.skillpkg.dev](https://admin.skillpkg.dev)
- **CLI:** [`@skillpkg/cli`](https://www.npmjs.com/package/@skillpkg/cli) on npm
- **MCP:** [`@skillpkg/mcp`](https://www.npmjs.com/package/@skillpkg/mcp) on npm

## License

Apache-2.0
