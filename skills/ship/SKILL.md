---
name: ship
version: 1.0.0
categories:
  - code-quality
  - productivity
triggers:
  - /ship
  - ship it
  - commit and push
  - quality pipeline
---

# Ship

Language-agnostic quality pipeline that auto-discovers project tools, runs them all, fixes failures, then commits with conventional commits and pushes.

## Process

### Step 1: Auto-Discover Project Tools

Detect what's available by checking config files:

- **Formatter**: prettier (.prettierrc), biome (biome.json), black (pyproject.toml), gofmt (go.mod), rustfmt (rustfmt.toml)
- **Linter**: eslint (eslint.config.\*), biome, ruff, golangci-lint, clippy
- **Type checker**: tsc (tsconfig.json), mypy, pyright
- **Build**: package.json scripts, Makefile, Cargo.toml, go.mod
- **Tests**: vitest, jest, pytest, go test, cargo test
- **Package manager**: pnpm (pnpm-lock.yaml), npm, yarn, bun, cargo, go

### Step 2: Run Formatter

Run the detected formatter. If it changes files, stage them.

### Step 3: Run Linter

Run the linter with auto-fix enabled (e.g., `eslint --fix`). Stage any auto-fixed files.

### Step 4: Run Type Checker

Run type checking (e.g., `tsc --noEmit`). If errors found, attempt to fix them and re-run.

### Step 5: Run Build

Run the build step. If it fails, diagnose and fix.

### Step 6: Run Tests

Run the test suite. If tests fail, analyze failures and fix the code. Re-run tests to confirm.

### Step 7: Fix Loop

If any step above failed:

1. Analyze the error output
2. Fix the issue
3. Re-run from the failed step
4. Repeat up to 3 times per step

### Step 8: Commit and Push

1. Stage all changed files
2. Analyze the diff to determine the change type
3. Generate a conventional commit message: `type(scope): description`
   - Types: feat, fix, refactor, docs, test, chore, ci, perf
   - Scope: infer from changed files/directories
4. Create the commit
5. Push to the current branch

## Rules

- Never force-push
- Never skip pre-commit hooks (no --no-verify)
- If the build or tests cannot be fixed after 3 attempts, stop and report the issue
- Always use conventional commits format
- Commit message should describe the "why", not the "what"
