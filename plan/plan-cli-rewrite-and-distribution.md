# SPM Go CLI Rewrite and Distribution — Plan

## Why

SPM's CLI is currently Node.js-only (`npm i -g @skillpkg/cli`). This gates out Python, Go, Rust, and other developers who don't have Node installed. Skills themselves are language-agnostic (markdown + optional scripts), but the **tool to manage them** requires Node.

A Go rewrite produces a ~10-15MB static binary with zero runtime dependencies, distributable via `brew`, `curl`, `apt`, `scoop` — and still `npm` for JS devs.

## Scope

Rewrite `packages/cli/` from TypeScript to Go. Everything else stays as-is:

- `packages/api/` — Hono on Cloudflare Workers (TypeScript, unchanged)
- `packages/web/` — React app (TypeScript, unchanged)
- `packages/shared/` — Zod schemas remain the source of truth; Go CLI ports the validation logic as Go structs + validators
- `packages/mcp/` — MCP server (TypeScript, unchanged)

The Go CLI lives in a new top-level directory: `cli-go/`.

## Architecture

```
cli-go/
├── main.go                    # Entry point
├── go.mod / go.sum
├── cmd/                       # Cobra commands (one file per command)
│   ├── root.go                # Root command, global flags (--json, --verbose, --silent, --registry)
│   ├── login.go
│   ├── logout.go
│   ├── whoami.go
│   ├── search.go
│   ├── info.go
│   ├── list.go
│   ├── agents.go
│   ├── install.go
│   ├── uninstall.go
│   ├── update.go
│   ├── init.go
│   ├── test.go
│   ├── pack.go
│   ├── version.go
│   ├── publish.go
│   ├── yank.go
│   ├── deprecate.go
│   ├── report.go
│   ├── collaborators.go
│   ├── sign.go
│   ├── verify.go
│   └── rescan.go
├── internal/
│   ├── api/                   # API client (HTTP, auth, multipart upload)
│   │   ├── client.go
│   │   ├── client_test.go
│   │   ├── auth.go            # Device flow OAuth
│   │   ├── auth_test.go
│   │   └── errors.go
│   ├── config/                # ~/.spm/config.toml management
│   │   ├── config.go
│   │   └── config_test.go
│   ├── manifest/              # Manifest parsing + validation
│   │   ├── manifest.go
│   │   ├── manifest_test.go
│   │   ├── validate.go
│   │   └── validate_test.go
│   ├── signing/               # Sigstore sign + verify
│   │   ├── signer.go
│   │   ├── signer_test.go
│   │   ├── verifier.go
│   │   └── verifier_test.go
│   ├── linker/                # Skill → agent directory linking
│   │   ├── linker.go
│   │   └── linker_test.go
│   ├── resolver/              # Version specifier parsing + resolution
│   │   ├── resolver.go
│   │   └── resolver_test.go
│   ├── skillsjson/            # skills.json + skills-lock.json management
│   │   ├── skillsjson.go
│   │   └── skillsjson_test.go
│   ├── preflight/             # Broken link detection + repair
│   │   ├── preflight.go
│   │   └── preflight_test.go
│   ├── scanner/               # Security scanner (regex patterns)
│   │   ├── scanner.go
│   │   └── scanner_test.go
│   └── output/                # Colors, spinners, icons, modes
│       ├── output.go
│       └── output_test.go
├── testdata/                  # Shared fixtures
│   ├── manifests/             # Valid/invalid manifest.json samples
│   ├── skills/                # Sample .skl archives
│   ├── bundles/               # Sigstore bundle fixtures
│   └── eval/                  # eval.json test fixtures
└── e2e/                       # End-to-end tests (compiled binary)
    ├── e2e_test.go
    ├── smoke_test.go
    ├── lifecycle_test.go
    └── testutil.go
```

## Go Dependencies

| Purpose             | Package                                            |
| ------------------- | -------------------------------------------------- |
| CLI framework       | `github.com/spf13/cobra`                           |
| Terminal colors     | `github.com/fatih/color`                           |
| Spinners            | `github.com/briandowns/spinner`                    |
| Tables              | `github.com/jedib0t/go-pretty/v6/table`            |
| Interactive prompts | `github.com/AlecAivazis/survey/v2`                 |
| Semver              | `github.com/Masterminds/semver/v3`                 |
| TOML                | `github.com/BurntSushi/toml`                       |
| Sigstore signing    | `github.com/sigstore/sigstore-go`                  |
| Browser open        | `github.com/pkg/browser`                           |
| Archive (tar/gzip)  | `archive/tar`, `compress/gzip` (stdlib)            |
| HTTP client         | `net/http` (stdlib)                                |
| JSON                | `encoding/json` (stdlib)                           |
| Testing             | `testing` (stdlib) + `github.com/stretchr/testify` |
| HTTP test server    | `net/http/httptest` (stdlib)                       |
| Release             | `goreleaser/goreleaser`                            |

## Parallel Work Streams

The rewrite is split into **5 independent streams** that can run concurrently. Each stream writes tests first, then implementation.

### Stream 1: Core Infrastructure

**Owner:** Agent 1
**No dependencies on other streams.**

```
internal/config/       — config.go + config_test.go
internal/output/       — output.go + output_test.go
internal/manifest/     — manifest.go + validate.go + tests
internal/resolver/     — resolver.go + resolver_test.go
cmd/root.go            — global flags, output mode wiring
```

**Tests first:**

- Config: load/save TOML, token persistence, default registry URL, env var overrides
- Output: icon set completeness, color functions return strings, mode switching (json > silent > verbose), log/logVerbose/logJson/logError behavior per mode
- Manifest: valid/invalid manifest parsing, all field constraints (name regex, version semver, description length, category enum, dependency arrays), round-trip JSON
- Resolver: parse `name`, `name@1.0.0`, `name@^1.0.0`, `@scope/name@~1.2.0`, `name@latest`, `*`, `>=1.0.0`

**Deliverable:** All internal packages compile and pass tests. No commands yet.

### Stream 2: API Client + Auth

**Owner:** Agent 2
**No dependencies on other streams.**

```
internal/api/          — client.go + auth.go + errors.go + tests
cmd/login.go
cmd/logout.go
cmd/whoami.go
```

**Tests first (using httptest.Server to mock the registry):**

- Device flow: initiate → poll (pending → slow_down → success), timeout/expiry
- Token management: save to config, load from config, 401 refresh
- All API endpoints: search, info, versions, download, publish (multipart), yank, deprecate, report, collaborators, classify, resolve, verify-signature, rescan
- Error handling: 400, 401, 404, 409, 422, 429, 500 — each maps to typed error
- Auth commands: login opens browser + polls, logout clears token, whoami displays user

**Deliverable:** Fully tested API client. Auth commands work against mock server.

### Stream 3: Sigstore Signing + Verification

**Owner:** Agent 3
**No dependencies on other streams.**

```
internal/signing/      — signer.go + verifier.go + tests
cmd/sign.go
cmd/verify.go
```

**Tests first:**

- CI signing: detect CI env (GITHUB_ACTIONS, GITLAB_CI, CI=true), auto-sign with OIDC
- Interactive signing: browser OIDC flow, local HTTP callback server
- Bundle creation: valid Sigstore bundle JSON output
- Verification: verify bundle against file bytes, extract signer identity from cert
- Bundle formats: handle v0.1/v0.2/v0.3 bundle schemas
- Failure modes: signing fails gracefully (returns nil, doesn't block publish), verification fails with clear error
- Commands: `spm sign` signs a .skl, `spm verify <skill>` checks installed skill

**Deliverable:** Sign and verify work independently. Can be integrated with publish later.

### Stream 4: File Operations (Skills JSON, Linker, Preflight, Scanner)

**Owner:** Agent 4
**No dependencies on other streams.**

```
internal/skillsjson/   — skillsjson.go + tests
internal/linker/       — linker.go + tests
internal/preflight/    — preflight.go + tests
internal/scanner/      — scanner.go + tests
```

**Tests first (all use real temp directories, no mocks):**

- Skills JSON: load/save round-trip, add/remove skills, lock file creation with metadata (version, resolved, checksum, source, signer), lock file merge on update, missing file handling
- Linker: symlink creation to agent dirs (~/.claude/skills, ~/.cursor/skills, ~/.agents/skills), copy fallback, unlink removes from all agents, getLinkedAgents returns agent names, handles missing dirs gracefully
- Preflight: detect broken symlinks, remove stale copies, skip healthy links, report counts
- Scanner: detect instruction override ("ignore all previous"), data exfiltration ("send to external"), hidden unicode (zero-width spaces), tag injection (`<system>`), behavioral manipulation ("do not log")

**Deliverable:** All file operation packages compile and pass tests.

### Stream 5: Commands (depends on Streams 1-4 completing)

**Owner:** All agents converge, or split into sub-groups

```
cmd/search.go          — uses api + output
cmd/info.go            — uses api + output
cmd/list.go            — uses skillsjson + output
cmd/agents.go          — uses linker + output
cmd/install.go         — uses api + skillsjson + linker + preflight
cmd/uninstall.go       — uses skillsjson + linker
cmd/update.go          — uses api + skillsjson + linker
cmd/init.go            — uses manifest + output
cmd/test.go            — uses scanner + manifest
cmd/pack.go            — uses manifest (tar/gzip)
cmd/version.go         — uses manifest
cmd/publish.go         — uses api + manifest + signing
cmd/yank.go            — uses api
cmd/deprecate.go       — uses api
cmd/report.go          — uses api
cmd/collaborators.go   — uses api
cmd/rescan.go          — uses api
```

**Tests first (per command):**

- Each command gets unit tests with mocked internal packages
- Validate output format (default vs json vs verbose vs silent)
- Validate error handling per API error code
- Validate flag parsing and argument validation

**Deliverable:** All 21 commands work.

## Stream Dependencies & Timeline

```
Week 1-2:  Streams 1-4 run in PARALLEL (tests first, then implementation)
           ┌─── Stream 1: Core Infrastructure ───┐
           ├─── Stream 2: API Client + Auth ──────┤
           ├─── Stream 3: Sigstore ───────────────┤
           └─── Stream 4: File Operations ────────┘

Week 3:    Stream 5: Commands (all agents converge)
           Commands wire together the internal packages.
           Split by command group:
             Agent 1: search, info, list, agents (read-only commands)
             Agent 2: install, uninstall, update (package management)
             Agent 3: publish, sign, verify, rescan (publishing + security)
             Agent 4: init, test, pack, version, yank, deprecate, report, collaborators

Week 4:    Integration + E2E tests
           - Compile binary, run smoke tests against it
           - Full lifecycle: init → test → pack → publish → install → verify → uninstall
           - Cross-platform CI (linux amd64, linux arm64, darwin amd64, darwin arm64, windows amd64)
           - goreleaser config + Homebrew formula + curl installer

Week 5:    Polish + docs + messaging updates
           - Update packages/web/ install instructions (multi-method)
           - Update READMEs (root, cli, mcp)
           - Update plan/spm-distribution.md with actual implementation
           - Footer, DocDetail, SkillHero — tabbed install UI
           - Release automation (GitHub Actions → goreleaser → brew tap + GitHub releases)
```

## Test Strategy

### Unit Tests (per internal package — Streams 1-4)

Each `internal/` package has `*_test.go` files that:

- Use `httptest.Server` for API mocking (no real network calls)
- Use `t.TempDir()` for file system operations (real files, auto-cleaned)
- Use `testify/assert` + `testify/require` for assertions
- Use table-driven tests for validation logic (manifest fields, specifier parsing, etc.)
- Cover happy path + every error path

**Target:** 100% of exported functions have tests. Write tests BEFORE implementation — the test file defines the contract.

### Integration Tests (Stream 5 — command level)

Each `cmd/*.go` gets tests in `cmd/*_test.go` that:

- Create a real Cobra command
- Execute it with `cmd.Execute()` capturing stdout/stderr
- Mock only the API (via httptest.Server) and home dir (via env var or param)
- Validate exit codes, output format, file side effects

### E2E Tests (`e2e/` — Week 4)

Compile the binary once, run tests against it:

```go
// e2e/testutil.go
func spm(t *testing.T, args ...string) (stdout, stderr string, exitCode int) {
    cmd := exec.Command(binaryPath, args...)
    cmd.Env = append(os.Environ(),
        "SPM_HOME=" + t.TempDir(),
        "SPM_REGISTRY=" + mockServer.URL,
    )
    // ...
}
```

**E2E test cases:**

```
smoke_test.go:
  - spm --help lists all commands
  - spm --version outputs semver
  - spm agents detects agent dirs
  - spm whoami without token exits 1
  - spm search with invalid registry fails gracefully

lifecycle_test.go:
  - init → test → pack → publish (full authoring flow)
  - install → list → verify → update → uninstall (full consumer flow)
  - install with missing deps → warns about pip/system requirements
  - publish → yank → install yanked version fails
  - collaborators add/remove/list cycle

security_test.go:
  - test --security catches all 5 injection categories
  - pack refuses manifest with invalid fields
  - verify detects tampered .skl files

multiplatform_test.go:
  - symlink vs copy on different OS (build-tagged)
  - path handling (forward/back slashes)
```

### Test Fixtures (`testdata/`)

Shared across all test levels:

```
testdata/
├── manifests/
│   ├── valid-minimal.json        # name + version + description only
│   ├── valid-full.json           # all fields populated
│   ├── invalid-name.json         # name with spaces
│   ├── invalid-version.json      # non-semver version
│   ├── invalid-description.json  # too short
│   ├── with-pip-deps.json        # pip dependencies declared
│   ├── with-npm-deps.json        # npm dependencies declared
│   └── with-system-deps.json     # system dependencies declared
├── skills/
│   ├── minimal.skl               # valid archive with manifest + SKILL.md
│   ├── with-scripts.skl          # archive with scripts/ directory
│   └── corrupted.skl             # truncated/invalid tar.gz
├── bundles/
│   ├── valid-bundle.json         # valid Sigstore bundle
│   └── invalid-bundle.json       # malformed bundle
├── eval/
│   ├── passing.json              # eval.json with all-passing test cases
│   ├── failing.json              # eval.json with expected failures
│   └── injection.md              # SKILL.md with known injection patterns
└── skills-json/
    ├── valid.json                # valid skills.json
    └── valid-lock.json           # valid skills-lock.json
```

## Key Design Decisions

### 1. Schema sync with @spm/shared

Go structs are the **port**, not the source of truth. If `@spm/shared` schemas change, Go structs must be updated manually. To mitigate drift:

- CI job compares Go struct field names against shared schema exports
- Alternatively: generate Go structs from a shared JSON Schema (future)

### 2. No npx dependency

The Go linker does **not** shell out to `npx skills`. It directly manages symlinks/copies to known agent directories:

- `~/.claude/skills/`
- `~/.cursor/skills/`
- `~/.agents/skills/` (Codex)
- Extensible via config for future agents

### 3. Dependency warnings (new feature)

`spm install` reads `dependencies.pip`, `dependencies.npm`, `dependencies.system` from each skill's manifest and:

- Checks if `python3` / `pip` / `node` / `npm` / system binaries are on `$PATH`
- Prints warnings for missing deps (does NOT auto-install)
- In `--json` mode, includes `missing_dependencies` array in output

### 4. Config environment variable overrides

```
SPM_HOME       — override ~/.spm (useful in tests and CI)
SPM_REGISTRY   — override default registry URL
SPM_TOKEN      — override auth token (for CI publishing)
```

### 5. Binary distribution

goreleaser produces:

- `spm_linux_amd64.tar.gz`
- `spm_linux_arm64.tar.gz`
- `spm_darwin_amd64.tar.gz`
- `spm_darwin_arm64.tar.gz`
- `spm_windows_amd64.zip`
- Homebrew tap formula (auto-updated)
- Install script at `skillpkg.dev/install.sh`

## Messaging & UI Updates (Week 5)

### Web app changes

**Footer.tsx** — Replace `npm i -g @skillpkg/cli` with tabbed install:

```
brew install spm  |  curl -fsSL skillpkg.dev/install.sh | sh  |  npm i -g @skillpkg/cli
```

**DocDetail.tsx** — Replace prerequisites:

```
Before:                          After:
- Node.js 18 or later     →    Install SPM:
- npm, pnpm, or yarn      →      brew install spm
                           →      curl -fsSL skillpkg.dev/install.sh | sh
                           →      npm i -g @skillpkg/cli (if you have Node)
```

**SkillHero.tsx** — Show dependency badges from manifest:

```
Requires: Python >= 3.10 | ffmpeg | pandas
```

### README changes

Root README: lead with `brew install spm` and `curl`, npm as alternative.
CLI README: point to Go binary releases, mention npm wrapper still works.

## Success Criteria

All of these must pass before shipping:

- [x] `go test ./...` passes (unit + integration)
- [x] E2E tests pass against compiled binary
- [x] Binary size < 20MB (actual: ~11MB)
- [x] goreleaser config exists
- [x] goreleaser builds succeed for all 5 targets (snapshot verified locally)
- [x] `brew install spm` — homebrew-tap repo created, goreleaser auto-publishes formula on release
- [x] `curl installer` — install.sh served from skillpkg.dev/install.sh via Cloudflare Pages
- [x] `npm i -g @skillpkg/cli` — wrapper package (packages/cli-npm/) downloads Go binary on postinstall
- [x] All 21 commands implemented
- [x] Web app shows multi-method install instructions
- [x] READMEs updated
