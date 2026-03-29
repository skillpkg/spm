# SPM — Skills Package Manager

A package manager for AI agent skills. Monorepo with four packages + Go CLI.

## Project Structure

- `cli-go/` — Go CLI (primary CLI, static binary, distributed via brew/curl/npm)
- `packages/shared/` — Zod schemas, types, constants (imported by all other packages)
- `packages/api/` — Hono registry API (deploys to Cloudflare Workers)
- `packages/cli-npm/` — npm wrapper package (@skillpkg/cli) that downloads the Go binary
- `packages/web/` — skillpkg.dev React app (deploys to Cloudflare Pages)
- `migrations/` — Neon Postgres SQL migrations
- `plan/` — Full spec docs. READ THESE before implementing a feature.

## Stack

- Language: TypeScript everywhere
- Monorepo: pnpm workspaces + Turborepo
- API: Hono (Cloudflare Workers runtime)
- DB: Neon Postgres + Drizzle ORM
- Storage: Cloudflare R2
- CLI (Go): cobra + fatih/color + go-pretty + sigstore-go + goreleaser
- CLI (legacy TS): commander.js + chalk + ora + tsup
- Web: React + Vite + Tailwind
- Validation: Zod (shared schemas)
- Auth: GitHub OAuth device flow → JWT
- Signing: Sigstore keyless (@sigstore/sign)

## Commands

- `pnpm install` — install all dependencies
- `pnpm build` — build all packages (turbo)
- `pnpm lint` — eslint across all packages
- `pnpm format` — prettier --write
- `pnpm typecheck` — tsc --noEmit across all packages
- `pnpm test` — vitest across all packages
- `pnpm test:watch` — vitest in watch mode
- `pnpm test:go` — run Go CLI tests (go test ./...)
- `pnpm lint:go` — lint Go CLI (golangci-lint)
- `pnpm format:go` — format Go CLI (gofmt)
- `pnpm build:go` — build Go CLI binary
- `pnpm vet:go` — go vet on Go CLI

## Workflow

- Use conventional commits: `type(scope): description`
- Types: feat, fix, refactor, docs, test, chore, ci
- Scopes: shared, api, cli, cli-go, web, migrations, docs
- Always run `/ship` at the end of every session to commit and push changes.

## Code Style

- Strict TypeScript (no `any`, no `as` casts unless justified)
- Named exports, not default exports (except React components)
- Prefer `const` arrow functions
- Error handling: never swallow errors silently
- Imports: use `@spm/shared` workspace alias for shared package

## Architecture Rules

- All request/response types defined in `packages/shared/src/schemas.ts`
- API routes validate with Zod schemas from shared
- CLI imports validation schemas from shared
- DB schema lives in `packages/api/src/db/schema.ts` (Drizzle)
- SQL migrations in `migrations/` — never edit DB manually
- Categories, trust tiers, error codes are enums in shared

## Go CLI

The Go CLI (`cli-go/`) is the primary CLI going forward. It produces a static binary (~11MB) with zero runtime dependencies. The legacy TypeScript CLI (`packages/cli/`) remains for reference but is no longer actively developed.

## Key Docs (read before implementing)

- `plan/spm-architecture.md` — system overview, DB schema
- `plan/spm-registry-api.md` — all API routes + request/response shapes
- `plan/spm-implementation-plan.md` — phase-by-phase build order
- `plan/spm-content-security.md` — 3-layer scanning pipeline
- `plan/spm-cli-output-design.md` — CLI output formatting
