# SPM Distribution & Installation

## Zero-Setup Philosophy

The user should never need to manually set up spm-runtime. Every installation method auto-bootstraps it.

```
User runs:  brew install spm
User gets:  spm CLI + agent linking ready (via Vercel skills CLI)

That's it. No "spm init --global". No "spm bootstrap install". Just works.
```

---

## 1. Installation Methods

### 1.1 Homebrew (macOS/Linux) — Primary

```ruby
# Formula: spm.rb
class Spm < Formula
  desc "Skills Package Manager for AI Agents"
  homepage "https://spm.dev"
  url "https://github.com/spm-dev/spm/releases/download/v0.1.0/spm-0.1.0.tar.gz"
  sha256 "abc123..."
  license "MIT"

  depends_on "node" => ">=18"    # or rust if CLI is Rust-based
  depends_on "python@3.10"       # for skill scripts

  def install
    # Install the CLI binary
    bin.install "spm"

    # Install shell completions
    bash_completion.install "completions/spm.bash" => "spm"
    zsh_completion.install "completions/_spm"
    fish_completion.install "completions/spm.fish"
  end

  def post_install
    # THIS IS THE KEY — auto-bootstrap spm-runtime
    system bin/"spm", "bootstrap", "--silent"
  end

  def caveats
    <<~EOS
      SPM has been installed and configured automatically.

      Your agents will now respect project-level skills.json files,
      with project skills overriding global ones.

      Quick start:
        spm search <keyword>       # Find skills
        spm install <skill>        # Install a skill
        cd my-project && spm init  # Set up project skills

      Docs: https://spm.dev/docs
    EOS
  end

  test do
    assert_match "spm v", shell_output("#{bin}/spm --version")
    system bin/"spm", "bootstrap", "check"
  end
end
```

```bash
# User experience:
$ brew install spm
==> Installing spm
==> Downloading https://github.com/spm-dev/spm/releases/...
==> Installing dependencies: node
==> Pouring spm-0.1.0.tar.gz
==> Post-install: configuring spm-runtime...
   ✓ SPM home created: ~/.spm
   ✓ spm-runtime skill installed
   ✓ Agent skill resolution enabled
==> Caveats
SPM has been installed and configured automatically.
...
```

### 1.2 npm Global Install

```json
// package.json
{
  "name": "spm-cli",
  "version": "0.1.0",
  "description": "Skills Package Manager for AI Agents",
  "bin": {
    "spm": "./bin/spm.js"
  },
  "scripts": {
    "postinstall": "node ./scripts/postinstall.js"
  }
}
```

```javascript
// scripts/postinstall.js
// Runs automatically after `npm install -g spm-cli`

const { execSync } = require('child_process');
const path = require('path');

const spmBin = path.join(__dirname, '..', 'bin', 'spm.js');

try {
  console.log('🔧 Configuring SPM...');
  execSync(`node ${spmBin} bootstrap --silent`, { stdio: 'inherit' });
  console.log('✅ SPM ready — Your agents will now respect skills.json');
} catch (err) {
  console.warn('⚠️  Auto-setup incomplete. Run `spm bootstrap install` manually.');
  // Don't fail the install — CLI still works, just needs manual bootstrap
}
```

```bash
# User experience:
$ npm install -g spm-cli
+ spm-cli@0.1.0
🔧 Configuring SPM...
   ✓ spm-runtime skill installed
✅ SPM ready — Your agents will now respect skills.json
```

### 1.3 pip Install

```toml
# pyproject.toml
[project]
name = "spm-cli"
version = "0.1.0"
description = "Skills Package Manager for AI Agents"

[project.scripts]
spm = "spm.cli:main"

[project.entry-points."spm.post_install"]
bootstrap = "spm.bootstrap:post_install"
```

```python
# spm/cli.py — detect first run if post-install hook didn't fire
import sys
from pathlib import Path

SPM_HOME = Path.home() / ".spm"
RUNTIME_MARKER = SPM_HOME / "spm-runtime.meta.json"

def main():
    # Auto-bootstrap on first CLI invocation if needed
    if not RUNTIME_MARKER.exists():
        print("🔧 First run detected — setting up SPM...")
        from spm.bootstrap import install
        install(silent=False)
        print()

    # Normal CLI dispatch
    command = sys.argv[1] if len(sys.argv) > 1 else "help"
    # ... route to command handlers
```

```bash
# User experience:
$ pip install spm-cli
$ spm search charts
🔧 First run detected — setting up SPM...
   ✓ spm-runtime skill installed
   ✓ Agent skill resolution enabled

Searching for "charts"...
  📦 data-viz v1.2.3 (4.7★, 12k downloads)
  ...
```

### 1.4 Curl One-Liner

```bash
# For quick installs / CI environments
curl -fsSL https://spm.dev/install.sh | sh
```

```bash
#!/bin/sh
# install.sh — downloaded and piped to sh

set -e

SPM_VERSION="0.1.0"
SPM_HOME="$HOME/.spm"
INSTALL_DIR="/usr/local/bin"

echo "📦 Installing SPM v${SPM_VERSION}..."

# Detect OS and arch
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
esac

# Download binary
DOWNLOAD_URL="https://github.com/spm-dev/spm/releases/download/v${SPM_VERSION}/spm-${OS}-${ARCH}"
echo "  Downloading from ${DOWNLOAD_URL}..."

if command -v curl > /dev/null; then
  curl -fsSL "$DOWNLOAD_URL" -o /tmp/spm
elif command -v wget > /dev/null; then
  wget -q "$DOWNLOAD_URL" -O /tmp/spm
else
  echo "❌ Need curl or wget"
  exit 1
fi

chmod +x /tmp/spm

# Install binary (try sudo if needed)
if [ -w "$INSTALL_DIR" ]; then
  mv /tmp/spm "$INSTALL_DIR/spm"
else
  echo "  Need sudo to install to ${INSTALL_DIR}..."
  sudo mv /tmp/spm "$INSTALL_DIR/spm"
fi

echo "  ✓ Binary installed: ${INSTALL_DIR}/spm"

# --- Auto-bootstrap spm-runtime ---
echo "  Configuring agent integration..."
spm bootstrap --silent

echo ""
echo "✅ SPM v${SPM_VERSION} installed successfully!"
echo ""
echo "   spm search <keyword>    Find skills"
echo "   spm install <skill>     Install a skill"
echo "   spm init                Set up a project"
echo ""
```

### 1.5 Agent Auto-Detection

For agent platform users, SPM can detect the environment and self-bootstrap. Example for Claude Code:

```bash
# In .claude/settings.json
{
  "mcpServers": {
    "spm": {
      "command": "spm",
      "args": ["mcp-server"],
      "postStart": "spm bootstrap --silent"
    }
  }
}

# Similar config exists for Cursor (.cursor/settings.json),
# Copilot, Codex, and other platforms that support MCP.
```

---

## 2. The `spm bootstrap` Command

All installation methods converge on this single command. It does four things:

1. Creates the `~/.spm/` directory structure
2. Initializes global `skills.json`, `skills-lock.json`, and `config.toml` (if they don't exist)
3. Stores and links the spm-runtime meta-skill to all detected agents
4. Writes metadata for self-healing checks

```typescript
// src/commands/bootstrap.ts

import { Command } from 'commander';
import { installRuntime, checkRuntime, uninstallRuntime } from '../lib/runtime';

export const bootstrapCommand = new Command('bootstrap')
  .description('Set up SPM and install the spm-runtime meta-skill')
  .argument('[action]', 'install | check | uninstall', 'install')
  .option('--silent', 'Minimal output (for post-install hooks)', false)
  .action(async (action: string, opts: { silent: boolean }) => {
    switch (action) {
      case 'install':
        await installRuntime(opts);
        break;
      case 'check':
        await checkRuntime();
        break;
      case 'uninstall':
        await uninstallRuntime();
        break;
    }
  });
```

```typescript
// src/lib/runtime.ts

import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SPM_HOME = path.join(os.homedir(), '.spm');
const RUNTIME_SKILL = 'spm-runtime';
const RUNTIME_META = path.join(SPM_HOME, 'spm-runtime.meta.json');
const SKILLS_CLI_VERSION = '0.3.14'; // pinned, tested

// Bundled with the CLI binary — not downloaded from registry
const SKILL_MD_PATH = path.join(__dirname, '..', 'assets', 'spm-runtime-SKILL.md');

export async function installRuntime({ silent = false } = {}) {
  const log = silent ? (..._: any[]) => {} : console.log;

  // ── Step 1: Create ~/.spm/ directory structure ──
  const dirs = [SPM_HOME, path.join(SPM_HOME, 'skills'), path.join(SPM_HOME, 'cache')];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
  log('  ✓ SPM home: ' + SPM_HOME);

  // ── Step 2: Initialize global skills.json, skills-lock.json, config.toml ──
  const globalSkillsJson = path.join(SPM_HOME, 'skills.json');
  const globalLockJson = path.join(SPM_HOME, 'skills-lock.json');
  const configToml = path.join(SPM_HOME, 'config.toml');

  if (!fs.existsSync(globalSkillsJson)) {
    const initialSkillsJson = {
      $schema: 'https://spm.dev/schemas/skills-v1.json',
      name: 'global',
      description: 'Globally installed skills for this machine',
      skills: {},
      resolution: {
        strategy: 'project-first',
      },
    };
    fs.writeFileSync(globalSkillsJson, JSON.stringify(initialSkillsJson, null, 2) + '\n');
    log('  ✓ Created ~/.spm/skills.json');
  }

  if (!fs.existsSync(globalLockJson)) {
    const initialLock = {
      lockfileVersion: 1,
      skills: {},
    };
    fs.writeFileSync(globalLockJson, JSON.stringify(initialLock, null, 2) + '\n');
    log('  ✓ Created ~/.spm/skills-lock.json');
  }

  if (!fs.existsSync(configToml)) {
    const initialConfig = [
      '# SPM Configuration',
      '# https://spm.dev/docs/config',
      '',
      '# Registry',
      'registry = "https://registry.spm.dev"',
      '',
      '# Auth (set by `spm login`)',
      '# auth_token = ""',
      '',
      '# Defaults',
      'default_strategy = "project-first"',
      'skills_cli_version = "' + SKILLS_CLI_VERSION + '"',
      'telemetry = true',
      '',
      '# Security',
      '# Minimum trust tier to install without confirmation prompt',
      '# Options: official, verified, scanned, registered',
      'min_trust_tier = "scanned"',
      '',
    ].join('\n');
    fs.writeFileSync(configToml, initialConfig);
    log('  ✓ Created ~/.spm/config.toml');
  }

  // ── Step 3: Store spm-runtime skill ──
  const storePath = path.join(SPM_HOME, 'skills', RUNTIME_SKILL, 'current');
  fs.mkdirSync(storePath, { recursive: true });
  fs.copyFileSync(SKILL_MD_PATH, path.join(storePath, 'SKILL.md'));
  log('  ✓ spm-runtime skill stored');

  // ── Step 4: Link to all detected agents via Vercel skills CLI ──
  let linked = false;
  let linkTarget: string | null = null;

  try {
    execSync(`npx skills@${SKILLS_CLI_VERSION} add "${storePath}" -a '*' -y`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: 'pipe',
    });
    linked = true;
    linkTarget = 'vercel-skills-cli';
    log('  ✓ Linked to all detected agents (via Vercel skills CLI)');
  } catch {
    // Vercel CLI not available or no agents detected — fall back to canonical directory.
    // This cascade handles cross-platform differences:
    //   macOS/Linux: symlink works, one file to update
    //   Windows: symlinks require Developer Mode or admin privileges,
    //            so we fall through to direct copy. Preflight's hash check
    //            detects stale copies and re-copies on SPM update.
    const canonicalDir = path.join(os.homedir(), '.agents', 'skills', RUNTIME_SKILL);

    // Attempt 1: Symlink (fast, auto-updates, works on macOS/Linux)
    try {
      fs.mkdirSync(path.dirname(canonicalDir), { recursive: true });

      // Clean up existing (symlink or directory)
      if (fs.existsSync(canonicalDir)) {
        const stat = fs.lstatSync(canonicalDir);
        if (stat.isSymbolicLink()) fs.unlinkSync(canonicalDir);
        else fs.rmSync(canonicalDir, { recursive: true });
      }

      fs.symlinkSync(storePath, canonicalDir);
      linked = true;
      linkTarget = canonicalDir;
      log('  ✓ Linked to: ~/.agents/skills/ (symlink)');
      log('    Install Vercel skills CLI for multi-agent support: npm i -g skills');
    } catch {
      // Attempt 2: Direct copy (Windows without Developer Mode, restricted filesystems)
      // Trade-off: copies don't auto-update when SPM updates, but preflight
      // detects hash mismatch and re-copies automatically.
      try {
        fs.mkdirSync(canonicalDir, { recursive: true });
        fs.copyFileSync(path.join(storePath, 'SKILL.md'), path.join(canonicalDir, 'SKILL.md'));
        linked = true;
        linkTarget = canonicalDir;
        log('  ✓ Copied to: ~/.agents/skills/ (direct copy)');
      } catch {
        log('  ⚠️  Could not install to any agent skill directory');
        log('     Run `spm bootstrap` again or install manually');
      }
    }
  }

  // ── Step 5: Write metadata for self-healing ──
  // link_method tells preflight how the skill was installed:
  //   'vercel-skills-cli' → managed by Vercel, re-run npx skills on update
  //   path (symlink)      → auto-updates, just verify symlink intact
  //   path (copy)         → must re-copy on SPM update (preflight handles this)
  const meta = {
    installed_at: new Date().toISOString(),
    spm_version: require('../../package.json').version,
    skill_md_hash: hashFile(path.join(storePath, 'SKILL.md')),
    linked,
    link_method: linkTarget,
    is_copy:
      linked &&
      linkTarget !== 'vercel-skills-cli' &&
      !isSymlink(path.join(linkTarget!, 'SKILL.md')),
  };
  fs.writeFileSync(RUNTIME_META, JSON.stringify(meta, null, 2) + '\n');

  if (!silent) {
    console.log('\n✅ SPM initialized\n');
    console.log('  Global skills:  ~/.spm/skills.json');
    console.log('  Config:         ~/.spm/config.toml');
    console.log('  Project skills: run `spm init` in a project directory\n');
  }
}

export async function checkRuntime() {
  if (!fs.existsSync(RUNTIME_META)) {
    console.log('❌ spm-runtime not installed. Run `spm bootstrap`.');
    process.exit(1);
  }

  const meta = JSON.parse(fs.readFileSync(RUNTIME_META, 'utf-8'));
  const skillMdPath = path.join(SPM_HOME, 'skills', RUNTIME_SKILL, 'current', 'SKILL.md');

  const checks = [
    { name: '~/.spm/ exists', ok: fs.existsSync(SPM_HOME) },
    { name: 'skills.json exists', ok: fs.existsSync(path.join(SPM_HOME, 'skills.json')) },
    { name: 'skills-lock.json exists', ok: fs.existsSync(path.join(SPM_HOME, 'skills-lock.json')) },
    { name: 'config.toml exists', ok: fs.existsSync(path.join(SPM_HOME, 'config.toml')) },
    { name: 'spm-runtime stored', ok: fs.existsSync(skillMdPath) },
    { name: 'spm-runtime linked', ok: meta.linked },
    { name: 'spm-runtime current', ok: meta.skill_md_hash === hashFile(SKILL_MD_PATH) },
  ];

  for (const check of checks) {
    console.log(`  ${check.ok ? '✓' : '✗'} ${check.name}`);
  }

  const allOk = checks.every((c) => c.ok);
  if (allOk) {
    console.log('\n✅ SPM is healthy');
  } else {
    console.log('\n⚠️  Issues found. Run `spm bootstrap` to fix.');
  }
}

export async function uninstallRuntime() {
  const storePath = path.join(SPM_HOME, 'skills', RUNTIME_SKILL);
  if (fs.existsSync(storePath)) fs.rmSync(storePath, { recursive: true });
  if (fs.existsSync(RUNTIME_META)) fs.unlinkSync(RUNTIME_META);

  // Try to unlink via Vercel CLI
  try {
    execSync(`npx skills@${SKILLS_CLI_VERSION} remove ${RUNTIME_SKILL}`, {
      stdio: 'pipe',
      timeout: 15000,
    });
  } catch {
    // Manual cleanup
    const canonicalDir = path.join(os.homedir(), '.agents', 'skills', RUNTIME_SKILL);
    if (fs.existsSync(canonicalDir)) fs.rmSync(canonicalDir, { recursive: true });
  }

  console.log('  ✓ spm-runtime uninstalled');
}

// Simple hash for content comparison (not security)
function hashFile(filePath: string): string {
  try {
    const crypto = require('crypto');
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  } catch {
    return '';
  }
}

function isSymlink(filePath: string): boolean {
  try {
    return fs.lstatSync(path.dirname(filePath)).isSymbolicLink();
  } catch {
    return false;
  }
}
```

---

## 3. Self-Healing: Auto-Fix on Every Run

SPM verifies its own health before every command. If anything is broken, it auto-repairs silently:

```typescript
// src/lib/preflight.ts — runs before EVERY spm command

import fs from 'fs';
import path from 'path';
import os from 'os';

const SPM_HOME = path.join(os.homedir(), '.spm');
const RUNTIME_META = path.join(SPM_HOME, 'spm-runtime.meta.json');
const SKILL_MD_BUNDLED = path.join(__dirname, '..', 'assets', 'spm-runtime-SKILL.md');

export async function preflight() {
  // 1. Does ~/.spm/ exist at all?
  if (!fs.existsSync(RUNTIME_META)) {
    // First run or wiped — full bootstrap silently
    const { installRuntime } = await import('./runtime');
    await installRuntime({ silent: true });
    return;
  }

  // 2. Are the global files present?
  const globalSkillsJson = path.join(SPM_HOME, 'skills.json');
  const configToml = path.join(SPM_HOME, 'config.toml');
  if (!fs.existsSync(globalSkillsJson) || !fs.existsSync(configToml)) {
    const { installRuntime } = await import('./runtime');
    await installRuntime({ silent: true });
    return;
  }

  // 3. Is spm-runtime still linked and current?
  const meta = JSON.parse(fs.readFileSync(RUNTIME_META, 'utf-8'));
  const storedSkillMd = path.join(SPM_HOME, 'skills', 'spm-runtime', 'current', 'SKILL.md');

  const bundledHashChanged = meta.skill_md_hash !== hashFile(SKILL_MD_BUNDLED);
  const storedFileMissing = !fs.existsSync(storedSkillMd);

  if (storedFileMissing || bundledHashChanged) {
    // SPM updated with new SKILL.md, or stored file was deleted.
    // Full re-bootstrap: updates stored file, re-links/re-copies to agents.
    // This handles both symlink (auto-updates) and copy (needs re-copy) cases.
    const { installRuntime } = await import('./runtime');
    await installRuntime({ silent: true });
  }
}

function hashFile(filePath: string): string {
  try {
    const crypto = require('crypto');
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  } catch {
    return '';
  }
}
```

```typescript
// src/index.ts — CLI entrypoint

import { Command } from 'commander';
import { preflight } from './lib/preflight';
import { bootstrapCommand } from './commands/bootstrap';
// ... other command imports

const program = new Command('spm')
  .version(require('../package.json').version)
  .description('Skills Package Manager — find, install, and share Agent Skills')
  .hook('preAction', async () => {
    // Verify SPM health before every command
    await preflight();
  });

program.addCommand(bootstrapCommand);
// ... other commands

program.parse();
```

This means:

- **Fresh install** → bootstrap runs as post-install hook
- **User deleted `~/.spm`** → next `spm` command auto-repairs
- **SPM updated** → spm-runtime SKILL.md auto-updates on next run
- **Symlink broken** → auto-recreated
- **Windows copy stale** → preflight detects hash mismatch, re-copies

---

## 4. Agent Linking via Vercel Skills CLI

SPM does not maintain its own agent detection logic. Instead, it delegates to Vercel's open-source `skills` CLI which already supports 37+ agent platforms:

```
Supported agents (auto-detected by npx skills):
  Claude Code, Cursor, Copilot, Codex, Gemini CLI, Windsurf,
  Goose, Amp, Kiro, OpenCode, Roo Code, and 26+ more
```

### How SPM Uses It

```typescript
// src/lib/linker.ts

import { execSync } from 'child_process';

const SKILLS_CLI_VERSION = '0.3.14'; // pinned, bumped deliberately after testing

/**
 * After SPM downloads and unpacks a .skl to its cache,
 * Vercel's skills CLI handles all agent detection and symlinking.
 */
export function linkToAgents(skillCachePath: string, options: { agents?: string } = {}) {
  const agents = options.agents || '*'; // '*' = all detected agents

  try {
    const result = execSync(
      `npx skills@${SKILLS_CLI_VERSION} add "${skillCachePath}" -a '${agents}' -y`,
      { encoding: 'utf-8', timeout: 30000, stdio: 'pipe' },
    );

    return parseLinkerOutput(result);
  } catch {
    // Fall back to canonical directory if Vercel CLI isn't available
    return fallbackLink(skillCachePath);
  }
}

export function unlinkFromAgents(skillName: string) {
  try {
    execSync(`npx skills@${SKILLS_CLI_VERSION} remove ${skillName} -y`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
  } catch {
    // Manual cleanup if needed
  }
}

// Canonical directory structure (managed by Vercel's CLI):
//   ~/.agents/skills/<skill>/    ← canonical location
//   ~/.claude/skills/<skill>/    ← symlink (Claude Code)
//   ~/.cursor/skills/<skill>/    ← symlink (Cursor)
//   .agents/skills/<skill>/      ← project-level skills
```

### What the User Sees

```bash
$ spm install data-viz

  ✓ Downloaded data-viz@1.2.0 (verified: sigstore ✓)
  ✓ Security scan passed (3 layers)
  ✓ Linked to agents:
      Claude Code  → ~/.claude/skills/data-viz
      Cursor       → ~/.cursor/skills/data-viz
      Copilot      → (not detected)
```

### Why We Don't Build This

```
What Vercel's skills CLI handles that we'd otherwise need:
  ✓ Agent detection (37+ platforms, growing)
  ✓ Per-agent directory conventions
  ✓ Symlink vs copy mode
  ✓ Windows support (junctions instead of symlinks)
  ✓ Lock file management
  ✓ Deduplication across agents
  ✓ Edge cases (permissions, readonly dirs, etc.)

Estimated savings: 3-4 weeks of development
License: Open source (MIT)
```

---

## 5. Uninstall — Clean Removal

```bash
$ brew uninstall spm
```

Brew runs the uninstall, but we also need cleanup:

```ruby
# In the formula
def uninstall
  # Remove spm-runtime from agent skill paths
  system bin/"spm", "bootstrap", "uninstall" rescue nil
end
```

Or for npm:

```json
{
  "scripts": {
    "preuninstall": "spm bootstrap uninstall 2>/dev/null || true"
  }
}
```

---

## 6. Complete User Journey

```
┌─────────────────────────────────────────────────────────┐
│                  First-Time User                         │
│                                                         │
│  $ brew install spm                                     │
│    ✓ Binary installed                                   │
│    ✓ spm-runtime auto-installed (post-install hook)     │
│    ✓ Agent integration ready (37+ platforms via skills CLI)│
│                                                         │
│  (nothing else needed — it just works)                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                  Daily Usage                             │
│                                                         │
│  $ spm search charts                                    │
│    (preflight: spm-runtime verified ✓)                  │
│    Results: data-viz, chart-maker, ...                  │
│                                                         │
│  $ spm install data-viz                                 │
│    (preflight: spm-runtime verified ✓)                  │
│    ✓ Installed globally                                 │
│                                                         │
│  $ cd my-project && spm init                            │
│    ✓ Created skills.json                                │
│                                                         │
│  $ spm install custom-pdf@2.0.0                             │
│    ✓ Added to skills.json                               │
│    ✓ Project custom-pdf overrides global pdf             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                  Self-Healing                            │
│                                                         │
│  $ rm -rf ~/.spm     (user accidentally deletes)        │
│  $ spm search charts                                    │
│    🔧 Repairing SPM installation...                     │
│    ✓ spm-runtime reinstalled                            │
│    Results: data-viz, chart-maker, ...                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                  SPM Update                              │
│                                                         │
│  $ brew upgrade spm                                     │
│    ✓ Binary updated to v0.2.0                           │
│    ✓ spm-runtime SKILL.md updated (post-install hook)   │
│    (new resolution rules automatically applied)         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                  Clean Removal                           │
│                                                         │
│  $ brew uninstall spm                                   │
│    ✓ spm-runtime removed from agent skill dirs           │
│    ✓ Binary removed                                     │
│    (agents go back to default behavior)                  │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Summary: Zero Friction Installation

| Method    | Command               | Post-Install Hook            | Auto-Bootstrap |
| --------- | --------------------- | ---------------------------- | -------------- |
| Homebrew  | `brew install spm`    | `spm bootstrap --silent`     | ✓              |
| npm       | `npm i -g spm-cli`    | `postinstall` script         | ✓              |
| pip       | `pip install spm-cli` | First-run detection          | ✓              |
| curl      | `curl ... \| sh`      | Inline in install script     | ✓              |
| Agent MCP | Config in settings    | `postStart` hook             | ✓              |
| Manual    | Download binary       | Preflight on first `spm` run | ✓              |

**Every path leads to the same result**: `~/.spm` exists, `spm-runtime` is linked into agent skill directories (via Vercel's skills CLI), and the resolution hierarchy is active. The user never thinks about it.
