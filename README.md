<p align="center">
  <a href="https://skillpkg.dev">
    <img src="assets/logo-dark.png" alt="SPM" width="120" />
  </a>
</p>

<h1 align="center">SPM — Skills Package Manager</h1>

<p align="center">
  <strong>The package manager for AI agent skills.</strong><br/>
  <a href="https://skillpkg.dev">skillpkg.dev</a> · <a href="https://github.com/skillpkg/spm/releases">releases</a> · <a href="https://www.npmjs.com/package/@skillpkg/cli">npm</a> · <a href="https://skillpkg.dev/docs">docs</a>
</p>

## Install

```bash
# macOS
brew install skillpkg/tap/spm

# Linux / macOS (curl)
curl -fsSL https://skillpkg.dev/install.sh | sh

# npm (downloads the native binary)
npm install -g @skillpkg/cli
```

Single static binary, zero runtime dependencies.

## Quick Start

```bash
# Search for skills
spm search "pdf tools"

# Install a skill — linked to all your AI agents
spm install data-viz

# See what agents were detected
spm agents
```

Works with Claude Code, Cursor, Copilot, Codex, and 30+ agent platforms.

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

See the [`examples/skill-template/`](examples/skill-template/) directory for a complete starter template ([`manifest.json`](examples/skill-template/manifest.json) + [`SKILL.md`](examples/skill-template/SKILL.md)), or fetch it from the API:

```bash
curl https://registry.skillpkg.dev/api/v1/template
```

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
cli-go/       Go CLI (spm binary)                    brew/curl/npm
packages/
  shared/     Zod schemas, types, constants          @spm/shared
  api/        Registry API (Cloudflare Workers)       registry.skillpkg.dev
  cli-npm/    npm wrapper (downloads Go binary)       @skillpkg/cli
  web/        skillpkg.dev (Cloudflare Pages)
  admin/      Admin dashboard                         admin.skillpkg.dev
  mcp/        MCP server                              @skillpkg/mcp
  ui/         Shared React components                 @spm/ui
  web-auth/   Shared auth logic                       @spm/web-auth
migrations/   Neon Postgres SQL migrations
examples/     Skill template & examples
plan/         Spec docs
```

## Stack

| Component | Tech                                                 |
| --------- | ---------------------------------------------------- |
| Monorepo  | pnpm workspaces + Turborepo                          |
| API       | Hono on Cloudflare Workers                           |
| Database  | Neon Postgres + Drizzle ORM                          |
| Storage   | Cloudflare R2                                        |
| CLI       | Go, Cobra, Sigstore                                  |
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
- **CLI:** [GitHub Releases](https://github.com/skillpkg/spm/releases) · [Homebrew](https://github.com/skillpkg/homebrew-tap) · [`@skillpkg/cli`](https://www.npmjs.com/package/@skillpkg/cli) on npm
- **MCP:** [`@skillpkg/mcp`](https://www.npmjs.com/package/@skillpkg/mcp) on npm

## License

Apache-2.0
