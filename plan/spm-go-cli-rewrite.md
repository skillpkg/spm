# SPM Go CLI Rewrite — Implementation Plan

## Why

The SPM CLI is currently Node.js/TypeScript. Python, Go, Rust developers must install Node just to use `spm`. Rewriting in Go produces a single static binary (~20-25MB) with zero runtime dependencies, installable via brew, curl, apt, pip wrapper, or npm wrapper.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Repo location | `packages/cli-go/` in monorepo | Eventually replaces `packages/cli/` |
| API type sync | Manual Go structs → OpenAPI-generated later | Start simple, upgrade when OpenAPI migration completes |
| Agent linking | Direct symlink/copy to known dirs | Drop `npx skills` — we only need 3 agent paths today |
| npm package | Thin binary wrapper via postinstall | JS devs keep `npm i -g @skillpkg/cli`, gets Go binary underneath |
| Sigstore bundles | Fully compatible | Same JSON bundle format — existing signed skills verify unchanged |
| `supported_languages` | Not adding to manifest | Skills are language-agnostic; `dependencies.pip`/`npm`/`system` declare runtime needs implicitly |
| Test approach | Test-first (TDD) | Write all tests first, implement until they pass |
| CI | Separate Go CI job alongside existing TS CI | TS CI stays for API/web/shared |

---

## Parallel Tracks Overview

```
Track A: Go CLI (6 weeks)              Track B: OpenAPI Migration (3 weeks)
─────────────────────────              ────────────────────────────────────
Wk 1-2: Core infra + tests            Wk 1: @hono/zod-openapi + simple endpoints
Wk 3-4: All commands + tests           Wk 2: Complex endpoints + response schemas
Wk 5:   Signing + E2E                 Wk 3: Spec validation + Swagger UI
Wk 6:   CI integration + polish
                                        ← OpenAPI spec feeds Go struct codegen
Wk 7: Distribution (brew/curl/apt/npm/pip wrappers)
Wk 8: Messaging & docs update (web, README, footer)
```

---

## Go Project Structure

```
packages/cli-go/
├── main.go                          # Entry: cmd.Execute()
├── go.mod / go.sum
├── .goreleaser.yaml
│
├── cmd/                             # Cobra commands (thin — delegate to internal/)
│   ├── root.go                      # Root cmd, global flags, preflight hook
│   ├── login.go                     # Auth commands
│   ├── logout.go
│   ├── whoami.go
│   ├── search.go                    # Discovery commands
│   ├── info.go
│   ├── list.go
│   ├── agents.go
│   ├── install.go                   # Package management commands
│   ├── uninstall.go
│   ├── update.go
│   ├── init.go                      # Authoring commands
│   ├── test_cmd.go
│   ├── pack.go
│   ├── version_cmd.go
│   ├── publish.go                   # Publishing commands
│   ├── sign.go
│   ├── verify.go
│   ├── yank.go
│   ├── deprecate.go
│   ├── report.go
│   ├── collaborators.go
│   ├── rescan.go
│   └── doctor.go                    # NEW: check system deps for installed skills
│
├── internal/                        # Private business logic
│   ├── api/                         # Registry API client
│   │   ├── client.go                # HTTP, auth headers, errors, multipart upload
│   │   ├── auth.go                  # GitHub device flow OAuth
│   │   └── types.go                 # Request/response structs
│   ├── config/
│   │   └── config.go                # ~/.spm/config.toml read/write
│   ├── signing/
│   │   ├── signer.go                # CI + interactive Sigstore signing
│   │   └── verifier.go              # Bundle verification + identity extraction
│   ├── linker/
│   │   ├── linker.go                # Symlink/copy to ~/.claude/skills, ~/.cursor/skills, ~/.agents/skills
│   │   └── preflight.go             # Broken link detection + repair
│   ├── manifest/
│   │   ├── manifest.go              # Manifest struct + Validate()
│   │   └── skillsjson.go            # skills.json + skills-lock.json management
│   ├── resolver/
│   │   └── resolver.go              # Specifier parsing, version range resolution
│   ├── scanner/
│   │   └── scanner.go               # Security pattern scanning (regex-based)
│   ├── output/
│   │   └── output.go                # Colors, icons, spinners, tables, output modes
│   └── archive/
│       └── archive.go               # .skl tar.gz pack/unpack
│
├── internal/**/  *_test.go          # Unit + integration tests (alongside source)
│
├── testdata/                        # Shared test fixtures
│   ├── manifests/                   # Valid/invalid manifest.json samples
│   ├── skills/                      # Sample .skl and skill directories
│   ├── bundles/                     # Sample .sigstore bundles
│   └── api_responses/               # Recorded API response JSON
│
└── e2e/                             # End-to-end tests (build tag: //go:build e2e)
    ├── cli_test.go                  # Individual command tests against built binary
    ├── lifecycle_test.go            # init → test → pack → publish flow
    └── helpers_test.go              # Shared test utilities
```

---

## Go Dependencies

| Purpose | Package | Notes |
|---------|---------|-------|
| CLI framework | `github.com/spf13/cobra` | Standard (gh, kubectl, docker) |
| Colors | `github.com/fatih/color` | Lightweight |
| Spinners | `github.com/briandowns/spinner` | Simple |
| Tables | `github.com/jedib0t/go-pretty/v6/table` | Feature-rich |
| Prompts | `github.com/AlecAivazis/survey/v2` | Mature |
| Semver | `github.com/Masterminds/semver/v3` | Full spec |
| TOML | `github.com/BurntSushi/toml` | Config |
| Sigstore sign | `github.com/sigstore/sigstore-go` | Official SDK |
| Sigstore OIDC | `github.com/sigstore/sigstore/pkg/oauthflow` | Browser flow |
| Browser open | `github.com/pkg/browser` | Cross-platform |
| Tar/gzip | `archive/tar`, `compress/gzip` | stdlib |
| HTTP | `net/http` | stdlib |
| Testing | `github.com/stretchr/testify` | Assertions + mocks |

---

## Implementation Streams (Parallel Agents)

Work is divided into 5 independent streams that can run in parallel. Each stream follows TDD: write tests first, then implement until all tests pass.

### Stream 1: Core Infrastructure

**Owner:** Agent 1
**Duration:** Week 1-2
**No dependencies on other streams**

#### Phase 1A — Tests First (3-4 days)

```
internal/config/config_test.go
├── TestLoadConfig_Default             # No config file → default values
├── TestLoadConfig_FromFile            # Read existing config.toml
├── TestSaveConfig                     # Write config.toml round-trip
├── TestSaveToken / TestLoadToken      # Auth token persistence
├── TestConfigDir_Creation             # ~/.spm/ auto-created
└── TestConfigDir_XDGSupport           # Respects XDG_CONFIG_HOME if set

internal/output/output_test.go
├── TestIcons_AllKeysPresent           # success, error, warning, info, etc.
├── TestColors_AllFunctionsReturnStrings
├── TestOutputMode_Default             # Normal mode
├── TestOutputMode_JSON                # --json flag
├── TestOutputMode_Silent              # --silent flag
├── TestOutputMode_Verbose             # --verbose flag
├── TestOutputMode_Precedence          # json > silent > verbose
├── TestLog_DefaultMode                # Outputs with indent
├── TestLog_SilentMode                 # Suppressed
├── TestLogJSON_ValidJSON              # Pretty-printed, parseable
├── TestLogError_Format                # Title + detail + hint
└── TestLogError_SilentNotSuppressed   # Errors show even in silent

internal/manifest/manifest_test.go
├── TestValidateManifest_Valid         # All required fields present
├── TestValidateManifest_MinimalValid  # Only required fields
├── TestValidateManifest_InvalidName   # Bad chars, too short, too long
├── TestValidateManifest_ScopedName    # @org/skill-name format
├── TestValidateManifest_InvalidVersion # Not semver
├── TestValidateManifest_DescriptionTooShort  # < 30 chars
├── TestValidateManifest_DescriptionTooLong   # > 1024 chars
├── TestValidateManifest_TooManyCategories    # > 3
├── TestValidateManifest_InvalidCategory      # Not in enum
├── TestValidateManifest_TooManyKeywords      # > 20
├── TestValidateManifest_Dependencies         # pip, npm, system arrays
├── TestValidateManifest_Agents               # platforms, requires_tools
├── TestParseManifestFile              # Read from disk
└── TestParseManifestFile_MalformedJSON

internal/manifest/skillsjson_test.go
├── TestLoadSkillsJson                 # Read skills.json
├── TestLoadSkillsJson_NotFound        # Returns nil, no error
├── TestSaveSkillsJson                 # Write round-trip
├── TestAddSkillToJson                 # Add entry with version range
├── TestRemoveSkillFromJson            # Remove entry
├── TestLoadLockFile                   # Read skills-lock.json
├── TestSaveLockFile                   # Write with metadata
├── TestUpdateLockFile                 # Merge new entries
├── TestRemoveFromLockFile             # Remove + update timestamp
└── TestLockFile_Checksums             # SHA256 integrity

internal/resolver/resolver_test.go
├── TestParseSpecifier_BareName        # "my-skill"
├── TestParseSpecifier_WithVersion     # "my-skill@1.2.3"
├── TestParseSpecifier_WithRange       # "my-skill@^1.0.0"
├── TestParseSpecifier_Latest          # "my-skill@latest"
├── TestParseSpecifier_Prerelease      # "my-skill@1.0.0-beta.1"
├── TestParseSpecifier_Scoped          # "@org/my-skill"
├── TestParseSpecifier_ScopedVersion   # "@org/my-skill@^2.0.0"
├── TestParseSpecifier_Wildcard        # "my-skill@*"
└── TestParseSpecifier_ComparisonRange # "my-skill@>=1.0.0"

internal/archive/archive_test.go
├── TestPackSkill_CreatesArchive       # tar.gz with correct files
├── TestPackSkill_IncludesManifest     # manifest.json present
├── TestPackSkill_IncludesSkillMD      # SKILL.md present
├── TestPackSkill_IncludesScripts      # scripts/ directory
├── TestPackSkill_ExcludesDotFiles     # .git, .env excluded
├── TestPackSkill_Filename             # name-version.skl format
├── TestUnpackSkill_ExtractsAll        # All files extracted
├── TestUnpackSkill_InvalidArchive     # Graceful error
└── TestUnpackSkill_Checksums          # SHA256 verification
```

#### Phase 1B — Implementation (3-4 days)

Implement `internal/config`, `internal/output`, `internal/manifest`, `internal/resolver`, `internal/archive` until all tests pass.

---

### Stream 2: API Client & Auth

**Owner:** Agent 2
**Duration:** Week 1-2
**No dependencies on other streams**

#### Phase 2A — Tests First (3-4 days)

```
internal/api/client_test.go
├── TestNewClient_DefaultRegistry      # https://registry.skillpkg.dev
├── TestNewClient_CustomRegistry       # From config.toml
├── TestClient_AuthHeaders             # Bearer token included
├── TestClient_NoAuth                  # Unauthenticated requests work
├── TestClient_ErrorHandling_401       # Auth error → specific message
├── TestClient_ErrorHandling_404       # Not found → suggestion
├── TestClient_ErrorHandling_409       # Conflict → version exists
├── TestClient_ErrorHandling_422       # Validation → field errors
├── TestClient_ErrorHandling_500       # Server error → retry hint
├── TestClient_ErrorHandling_Network   # Connection refused/timeout
├── TestSearchSkills                   # Query + filters → results
├── TestSearchSkills_Pagination        # page + per_page params
├── TestSearchSkills_EmptyResults      # No matches → empty array
├── TestGetSkillInfo                   # Full skill detail
├── TestGetSkillVersions               # Version list
├── TestDownloadSkill                  # Follow redirect, save .skl
├── TestResolveSkills                  # Batch version resolution
├── TestPublishSkill_Multipart         # File + manifest + bundle upload
├── TestPublishSkill_Success201        # Published immediately
├── TestPublishSkill_Held200           # Held for review
├── TestPublishSkill_Blocked422        # Security blocked
├── TestYankVersion                    # DELETE with reason
├── TestUpdateSkill_Deprecate          # PATCH deprecated flag
├── TestListCollaborators              # GET collaborator list
├── TestAddCollaborator                # POST collaborator
├── TestRemoveCollaborator             # DELETE collaborator
├── TestClassifySkill                  # Category classification
├── TestReportIssue                    # Report submission
├── TestRescanSkill                    # Trigger rescan
├── TestWhoami                         # GET current user
└── TestVerifySignature                # POST verify endpoint

internal/api/auth_test.go
├── TestDeviceFlow_RequestCode         # POST /auth/device-code
├── TestDeviceFlow_PollToken_Success   # Token received
├── TestDeviceFlow_PollToken_Pending   # Keep polling
├── TestDeviceFlow_PollToken_SlowDown  # Increase interval
├── TestDeviceFlow_PollToken_Expired   # Deadline exceeded
├── TestDeviceFlow_OpensBrowser        # verification_uri opened
└── TestDeviceFlow_SavesToken          # Token persisted to config

internal/api/types_test.go
├── TestManifestJSON_RoundTrip         # Marshal → unmarshal identity
├── TestSearchResponse_Parse           # Parse recorded API response
├── TestSkillInfo_Parse                # Parse recorded API response
├── TestPublishResponse_Parse          # Parse all status variants
├── TestErrorResponse_Parse            # Parse error with code + details
└── TestTypes_MatchAPIContract         # Validate against testdata/api_responses/
```

All API tests use `net/http/httptest.Server` — no real network calls in unit tests.

#### Phase 2B — Implementation (3-4 days)

Implement `internal/api/` until all tests pass. Use `httptest.NewServer()` for mock API responses in tests.

---

### Stream 3: Sigstore Signing & Verification

**Owner:** Agent 3
**Duration:** Week 3-5 (starts after Stream 1 scaffolding)
**Depends on:** `internal/api` (for upload), `internal/archive` (for file hashing)

#### Phase 3A — Tests First (2-3 days)

```
internal/signing/signer_test.go
├── TestSignPackage_CI_GitHubActions   # Auto-detects CI=true + GITHUB_ACTIONS
├── TestSignPackage_CI_GitLabCI        # Auto-detects GITLAB_CI
├── TestSignPackage_CI_NoEnv           # Not in CI → returns nil (no error)
├── TestSignPackage_Interactive        # Browser OIDC flow → bundle
├── TestSignPackage_Interactive_Cancel # User cancels browser → graceful
├── TestSignPackage_CustomToken        # Pre-provided OIDC token
├── TestSignPackage_ProducesBundle     # Output is valid Sigstore JSON bundle
├── TestSignPackage_BundleContents     # Bundle has cert, signature, tlog entry
├── TestSignPackage_SignerIdentity     # Extract email/URI from certificate
├── TestSignPackage_FileIntegrity      # Signed content matches file bytes
└── TestSignPackage_Error_Graceful     # Signing failure doesn't crash publish

internal/signing/verifier_test.go
├── TestVerifyBundle_Valid             # Good bundle + file → verified
├── TestVerifyBundle_Tampered          # Modified file → verification fails
├── TestVerifyBundle_InvalidBundle     # Malformed JSON → error
├── TestVerifyBundle_ExtractIdentity   # Returns signer email/URI
├── TestVerifyBundle_TrustedRoot       # Fetches TUF root correctly
├── TestVerifyBundle_BundleV01         # Handles bundle format v0.1
├── TestVerifyBundle_BundleV02         # Handles bundle format v0.2
├── TestVerifyBundle_BundleV03         # Handles bundle format v0.3
├── TestVerifyBundle_ExistingTSBundle  # Verifies bundle signed by TS CLI ← KEY TEST
└── TestVerifyBundle_NoBundleFile      # No .sigstore file → "unsigned"
```

The `ExistingTSBundle` test uses a real bundle from `testdata/bundles/` created by the current TS CLI — this proves backward compatibility.

#### Phase 3B — Implementation (4-5 days)

Implement using `sigstore-go` for signing and `sigstore/pkg/oauthflow` for interactive OIDC browser flow.

---

### Stream 4: Linker & Preflight

**Owner:** Agent 4
**Duration:** Week 1-2
**No dependencies on other streams**

#### Phase 4A — Tests First (2 days)

```
internal/linker/linker_test.go
├── TestLinkSkill_Symlink              # Creates symlink in agent dir
├── TestLinkSkill_AllAgents            # Links to claude + cursor + codex
├── TestLinkSkill_AgentDirNotExist     # Agent not installed → skip gracefully
├── TestLinkSkill_ExistingLink         # Replaces old symlink
├── TestLinkSkill_CopyFallback         # Symlink fails → copy (Windows)
├── TestLinkSkill_CrossPlatform        # os.Symlink behavior per platform
├── TestUnlinkSkill_RemovesAll         # Removes from all agent dirs
├── TestUnlinkSkill_BrokenLink         # Already broken → no error
├── TestGetLinkedAgents                # Returns list of linked agent names
├── TestGetLinkedAgents_None           # No agents installed → empty list
├── TestAgentDirs_Defaults             # ~/.claude/skills, ~/.cursor/skills, ~/.agents/skills
└── TestAgentDirs_CustomHome           # Respects mocked home directory

internal/linker/preflight_test.go
├── TestPreflight_AllHealthy           # No broken links → no action
├── TestPreflight_BrokenSymlink        # Detects and removes broken symlink
├── TestPreflight_StaleCopy            # Hash mismatch → re-copies
├── TestPreflight_OrphanedEntry        # In skills.json but dir missing → warns
├── TestPreflight_MissingAgentDir      # Agent uninstalled → skip
└── TestPreflight_FirstRun             # No ~/.spm → triggers bootstrap
```

#### Phase 4B — Implementation (2 days)

Agent directories hardcoded as:
```go
var AgentDirs = []AgentDir{
    {Name: "Claude Code", Path: filepath.Join(home, ".claude", "skills")},
    {Name: "Cursor",      Path: filepath.Join(home, ".cursor", "skills")},
    {Name: "Codex",       Path: filepath.Join(home, ".agents", "skills")},
}
```

No `npx skills` dependency. New agents added by updating this slice.

---

### Stream 5: Scanner & Doctor (NEW)

**Owner:** Agent 5
**Duration:** Week 2-3
**No dependencies on other streams**

#### Phase 5A — Tests First (2 days)

```
internal/scanner/scanner_test.go
├── TestScan_Clean                     # No violations → pass
├── TestScan_InstructionOverride       # "Ignore all previous instructions"
├── TestScan_DataExfiltration          # "send data to external server"
├── TestScan_HiddenUnicode            # Zero-width spaces, RTL overrides
├── TestScan_TagInjection              # <system>...</system> tags
├── TestScan_BehavioralManipulation    # "Do not log this conversation"
├── TestScan_MultipleViolations        # Returns all found
├── TestScan_BinaryFile                # Skips non-text files
├── TestScan_LargeFile                 # Performance within bounds
└── TestScan_CustomPatterns            # Extensible pattern list

cmd/doctor_test.go (integration)
├── TestDoctor_NoDeps                  # Skill with no deps → all green
├── TestDoctor_PythonAvailable         # python3 found → ok
├── TestDoctor_PythonMissing           # python3 not found → warning
├── TestDoctor_PipPackageMissing       # pandas not installed → warning
├── TestDoctor_SystemDepMissing        # ffmpeg not found → warning
├── TestDoctor_MultipleSkills          # Checks all installed skills
└── TestDoctor_JSONOutput              # --json flag → machine-readable
```

#### Phase 5B — Implementation (2 days)

`spm doctor` reads manifest `dependencies` from all installed skills and checks:
- `pip`: runs `pip show <package>` or `python -c "import <package>"`
- `npm`: runs `npm list -g <package>` (optional, only if node available)
- `system`: runs `which <binary>`
- Reports missing deps with install hints

---

## Command Layer Tests (Week 3-4)

After streams 1-5 complete, command tests wire everything together. Commands are thin Cobra wrappers that call `internal/` packages. Tests use dependency injection via `NewXxxCmd(deps)`.

```
cmd/login_test.go         — mock device flow, verify token saved
cmd/logout_test.go        — verify token removed
cmd/whoami_test.go        — mock API whoami, format output; no token → error
cmd/search_test.go        — mock API search, verify table output, JSON mode, empty results
cmd/info_test.go          — mock API info, trust badges, versions, signed status
cmd/list_test.go          — mock skills.json read, project + global, counts
cmd/agents_test.go        — mock home dir with agent dirs, detect linked
cmd/install_test.go       — mock download + extract + link, skills.json update, lock file
cmd/uninstall_test.go     — mock unlink + remove from skills.json
cmd/update_test.go        — mock resolve + download, selective update, lock sync
cmd/init_test.go          — temp dir, verify manifest.json + SKILL.md created
cmd/test_cmd_test.go      — eval.json runner, security scan, pass/fail reporting
cmd/pack_test.go          — temp dir with skill, verify .skl created, manifest validated
cmd/version_cmd_test.go   — patch/minor/major bumps, manifest updated
cmd/publish_test.go       — mock classify + pack + sign + upload, all error codes
cmd/sign_test.go          — mock signer, CI vs interactive
cmd/verify_test.go        — mock verifier, signed/unsigned/failed output
cmd/yank_test.go          — mock API, --force flag, --reason
cmd/deprecate_test.go     — mock API, --undo flag
cmd/report_test.go        — mock API, interactive reason prompt
cmd/collaborators_test.go — add/remove/list, auth required
cmd/rescan_test.go        — mock API trigger
cmd/doctor_test.go        — system dep checking (see Stream 5)
```

All command tests capture stdout/stderr via `cmd.SetOut(buf)` and assert output content.

---

## E2E Tests (Week 5)

Build tag: `//go:build e2e`

E2E tests compile the real binary and run it against a mock HTTP server (or staging API).

```
e2e/cli_test.go
├── TestHelp_ListsAllCommands           # --help shows all 22 commands
├── TestVersion_OutputsSemver           # --version → x.y.z format
├── TestSearch_NoAuth                   # Works without login
├── TestSearch_InvalidRegistry          # Graceful error
├── TestWhoami_NoToken                  # Exit code 1
├── TestAgents_DetectsInstalled         # Finds agent dirs
├── TestAgents_JSONOutput               # --json → valid JSON
├── TestList_NoSkillsJson              # "No skills.json found"
├── TestInit_CreatesProject             # manifest.json + SKILL.md created
├── TestInit_DefaultValues              # --yes flag
├── TestTest_SecurityScan_Clean         # Clean skill passes
├── TestTest_SecurityScan_Injection     # Catches prompt injection
├── TestVersion_Bump_Patch              # 1.0.0 → 1.0.1
├── TestVersion_Bump_Minor              # 1.0.0 → 1.1.0
├── TestVersion_Bump_Major              # 1.0.0 → 2.0.0
├── TestPack_CreatesSkl                 # .skl file with correct name
├── TestPublish_DryRun                  # --dry-run doesn't upload
└── TestDoctor_ShowsDeps                # Checks system deps

e2e/lifecycle_test.go
├── TestFullLifecycle                   # init → version → test → pack (integration)
├── TestInstallUninstall                # install → verify linked → uninstall → verify removed
└── TestGlobalVsProject                # Global install, project override, resolution
```

---

## CI Integration (Week 6)

### GitHub Actions Workflow

```yaml
# .github/workflows/cli-go.yml
name: CLI (Go)

on:
  push:
    paths: ['packages/cli-go/**']
  pull_request:
    paths: ['packages/cli-go/**']

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        go: ['1.22']
    runs-on: ${{ matrix.os }}
    defaults:
      run:
        working-directory: packages/cli-go
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: ${{ matrix.go }}
      - run: go test ./...                              # Unit + integration
      - run: go test -tags e2e ./e2e/                   # E2E tests
      - run: go vet ./...                               # Static analysis
      - run: golangci-lint run                          # Linting

  build:
    needs: test
    strategy:
      matrix:
        goos: [linux, darwin, windows]
        goarch: [amd64, arm64]
        exclude:
          - goos: windows
            goarch: arm
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: packages/cli-go
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - run: |
          GOOS=${{ matrix.goos }} GOARCH=${{ matrix.goarch }} CGO_ENABLED=0 \
          go build -ldflags="-s -w -X main.version=${{ github.ref_name }}" \
          -o spm-${{ matrix.goos }}-${{ matrix.goarch }} .
      - uses: actions/upload-artifact@v4
        with:
          name: spm-${{ matrix.goos }}-${{ matrix.goarch }}
          path: packages/cli-go/spm-*

  release:
    needs: build
    if: startsWith(github.ref, 'refs/tags/cli-v')
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: packages/cli-go
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
      - uses: goreleaser/goreleaser-action@v5
        with:
          args: release --clean
          workdir: packages/cli-go
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Existing TS CI (unchanged)

The existing `pnpm test`, `pnpm typecheck`, `pnpm lint` workflows continue to run for `packages/api/`, `packages/web/`, `packages/shared/`. No changes needed.

### CI runs both in parallel:

```
Push to main
├── TS CI: pnpm test + typecheck + lint (api, web, shared)
└── Go CI: go test + build matrix (cli-go)
```

---

## Track B: OpenAPI Migration (Weeks 1-3, parallel)

### Week 1: Setup + Simple Endpoints

- Add `@hono/zod-openapi` to `packages/api/`
- Convert simple GET endpoints first: `/health`, `/categories`, `/trending`, `/tags`
- Define response schemas for each converted endpoint
- Add `/docs` route serving Swagger UI via `@hono/swagger-ui`
- **Result:** Swagger UI live at `https://registry.skillpkg.dev/docs`

### Week 2: Complex Endpoints + Response Schemas

- Convert remaining ~40 endpoints to `createRoute()` pattern
- Define response schemas (the main work — currently inline `c.json({...})`)
- Handle multipart upload schema for `/skills` publish endpoint
- Add auth security scheme definitions
- Add `.describe()` to shared Zod schemas for documentation

### Week 3: Spec Validation + Go Codegen

- Validate generated OpenAPI spec with `swagger-cli validate`
- Export spec as `openapi.json` / `openapi.yaml` at build time
- Set up `oapi-codegen` to generate Go types from spec into `internal/api/types_gen.go`
- Replace manual Go structs with generated ones
- Add CI step: regenerate types on API changes, fail if drift detected

### What You Get

- **Swagger UI** at `/docs` — interactive API explorer
- **Runtime response validation** — API returns match declared schemas
- **Auto-generated Go types** — zero drift between API and CLI
- **Client SDK generation** — anyone can generate clients in any language

---

## Distribution (Week 7)

### GoReleaser Config

```yaml
# packages/cli-go/.goreleaser.yaml
version: 2
builds:
  - main: .
    binary: spm
    env: [CGO_ENABLED=0]
    goos: [linux, darwin, windows]
    goarch: [amd64, arm64]
    ldflags:
      - -s -w
      - -X main.version={{.Version}}
      - -X main.commit={{.ShortCommit}}

universal_binaries:
  - replace: true               # macOS fat binary

archives:
  - format: tar.gz
    format_overrides:
      - goos: windows
        format: zip

brews:
  - repository:
      owner: skillpkg
      name: homebrew-tap
    homepage: https://skillpkg.dev
    description: Skills Package Manager for AI agents

nfpms:
  - formats: [deb, rpm]
    maintainer: SPM Team

checksum:
  name_template: checksums.txt
```

### Distribution Channels

| Channel | Install command | How it works |
|---------|----------------|--------------|
| **Homebrew** | `brew install skillpkg/tap/spm` | Formula downloads Go binary from GitHub release |
| **curl** | `curl -fsSL skillpkg.dev/install.sh \| sh` | Shell script detects OS/arch, downloads binary |
| **apt/deb** | `apt install spm` | `.deb` package from GoReleaser, hosted in apt repo |
| **rpm** | `yum install spm` | `.rpm` package from GoReleaser |
| **npm wrapper** | `npm i -g @skillpkg/cli` | postinstall.js downloads Go binary for OS/arch |
| **pip wrapper** | `pip install spm-cli` | setup.py downloads Go binary for OS/arch |
| **scoop** | `scoop install spm` | Windows package manager |
| **GitHub Release** | Manual download | Direct binary download per platform |

### npm Wrapper Package

```
packages/cli-npm-wrapper/
├── package.json
│   ├── "name": "@skillpkg/cli"
│   ├── "bin": { "spm": "bin/spm" }
│   └── "postinstall": "node install.js"
├── install.js              # ~50 lines: detect OS/arch → download Go binary → bin/spm
└── bin/
    └── spm                 # Go binary (placed by postinstall)
```

JS developers see zero change. `npm i -g @skillpkg/cli` still works, just downloads a Go binary now.

### pip Wrapper Package

```
packages/cli-pip-wrapper/
├── pyproject.toml
├── spm_cli/
│   ├── __init__.py
│   └── install.py          # Downloads Go binary on first run
└── scripts/
    └── spm                 # Entry point that delegates to Go binary
```

### curl Installer Script

```bash
#!/bin/sh
set -e
VERSION="1.0.0"
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in x86_64) ARCH="amd64" ;; arm64|aarch64) ARCH="arm64" ;; esac

URL="https://github.com/skillpkg/spm/releases/download/cli-v${VERSION}/spm_${OS}_${ARCH}.tar.gz"
curl -fsSL "$URL" | tar xz -C /usr/local/bin spm
echo "spm v${VERSION} installed to /usr/local/bin/spm"
```

---

## Messaging & Docs Update (Week 8)

### Web UI Changes

| File | Change |
|------|--------|
| `packages/web/src/components/Footer.tsx` | Replace `npm i -g @skillpkg/cli` with tabbed install: brew / curl / npm / pip |
| `packages/web/src/pages/DocDetail.tsx` | Remove "Node.js 18+" prerequisite. Show multi-method install |
| `packages/web/src/pages/skill-detail/SkillHero.tsx` | Show dependency badges (Python 3.10+, ffmpeg, etc.) from manifest |
| `packages/web/src/pages/home/HeroSearch.tsx` | Add "Works with any language" or "Language-agnostic" messaging |

### README Changes

| File | Change |
|------|--------|
| `README.md` | Lead with `brew install spm` or `curl`. npm as one option among many |
| `packages/cli/README.md` | Deprecation notice → points to `packages/cli-go/` |
| `packages/cli-go/README.md` | New README with multi-method install, Go contribution guide |

### Documentation Pages

- Getting Started: show brew/curl first, npm/pip as alternatives
- Skill Authoring: emphasize language-agnostic nature, show Python/Go script examples
- Dependencies: document `pip`/`npm`/`system` fields, explain `spm doctor`

---

## Transition Plan

### Phase 1: Soft Launch (Week 7)

- Go CLI available via `brew install` and `curl`
- npm package still ships TS CLI (unchanged)
- Blog post: "SPM now works without Node.js"

### Phase 2: npm Wrapper Switch (Week 8)

- npm `@skillpkg/cli` becomes thin wrapper downloading Go binary
- Existing TS CLI moves to `@skillpkg/cli-legacy` (deprecated)
- `pip install spm-cli` goes live

### Phase 3: Cleanup (Week 9+)

- `packages/cli/` archived (kept for reference)
- `packages/cli-go/` becomes the only CLI
- TS CI drops CLI tests, keeps API/web/shared only

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Sigstore bundle incompatibility | `TestVerifyBundle_ExistingTSBundle` — test with real TS-signed bundle |
| API type drift | Integration tests hit real API contract; OpenAPI codegen eliminates long-term |
| Windows symlink issues | `TestLinkSkill_CopyFallback` + Windows CI matrix |
| Binary size (~25MB) | `-s -w` ldflags, acceptable for CLI tools (gh=40MB, cosign=50MB) |
| Missing command parity | E2E `TestHelp_ListsAllCommands` ensures all 22 commands registered |
| Agent dir path changes | Hardcoded paths easy to update; `spm doctor` validates at runtime |

---

## Summary: Work Breakdown by Week

```
Week 1   Stream 1: Core tests          Stream 2: API tests         Stream 4: Linker tests
         Stream 5: Scanner tests        Track B: OpenAPI setup

Week 2   Stream 1: Core impl           Stream 2: API impl          Stream 4: Linker impl
         Stream 5: Scanner impl         Track B: OpenAPI simple endpoints

Week 3   Command tests (all)           Stream 3: Signing tests     Track B: OpenAPI complex endpoints
         Command impl starts

Week 4   Command impl continues        Stream 3: Signing impl      Track B: OpenAPI spec + codegen

Week 5   E2E tests                     Stream 3: Signing polish    Swap manual types → generated
         E2E impl + integration

Week 6   CI setup (GitHub Actions)     Polish, edge cases          Full test suite green on 3 OS

Week 7   Distribution: GoReleaser, brew, curl, apt, npm wrapper, pip wrapper

Week 8   Messaging: web UI, READMEs, docs, deprecation notices
```

**Total: ~8 weeks with parallel agents. 5 streams + 1 parallel track.**
