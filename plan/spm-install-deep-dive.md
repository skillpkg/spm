# `spm install` — Deep Dive

## The Complete Flow from Command to Usable Skill

---

## 1. Command Syntax

```bash
spm install <skill_name>[@<version>] [flags]

# Examples
spm install data-viz                    # Latest stable
spm install data-viz@1.2.0              # Exact version
spm install data-viz@^1.0.0             # Semver range (>=1.0.0 <2.0.0)
spm install data-viz@latest             # Explicit latest (same as no version)
spm install data-viz@next               # Pre-release / canary channel
spm install ./my-skill.skl              # Local .skl file
spm install github:almog/data-viz       # Direct from GitHub repo
spm install github:almog/data-viz#v1.2  # GitHub with tag

# Flags
--global                    # Install system-wide (default)
--project                   # Install to current project only
--skip-verify               # Skip signature verification (not recommended)
--skip-scan                 # Skip local security scan (not recommended)
--dry-run                   # Show what would happen without doing it
--force                     # Reinstall even if already installed
--verbose                   # Detailed output
--trust <level>             # Minimum trust level: official|verified|scanned|any
--no-deps                   # Skip dependency installation
--save                      # Add to project's spm.json (auto in project mode)
```

---

## 2. Complete Installation Pipeline

```
spm install data-viz@1.2.0
         │
         ▼
┌─────────────────────────────────────────────────┐
│ PHASE 1: RESOLVE                                │
│                                                 │
│  1.1 Parse input (name, version constraint)     │
│  1.2 Check local cache                          │
│  1.3 Query registry for version resolution      │
│  1.4 Build dependency tree                      │
│  1.5 Check for conflicts with installed skills  │
│  1.6 Present install plan to user               │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ PHASE 2: DOWNLOAD                               │
│                                                 │
│  2.1 Download .skl package(s)                   │
│  2.2 Verify checksum (integrity)                │
│  2.3 Verify signature (authenticity)            │
│  2.4 Cache the .skl                             │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ PHASE 3: SECURITY SCAN                          │
│                                                 │
│  3.1 Extract to temp directory                  │
│  3.2 Run local static analysis                  │
│  3.3 Prompt injection scan on SKILL.md          │
│  3.4 Permission audit (what does it access?)    │
│  3.5 Show security report to user               │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ PHASE 4: INSTALL                                │
│                                                 │
│  4.1 Install system dependencies (pip/npm)      │
│  4.2 Extract to skill store                     │
│  4.3 Install skill dependencies (other skills)  │
│  4.4 Link to agent platforms (Vercel skills CLI) │
│  4.5 Update spm.lock                            │
│  4.6 Register in local skill index              │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ PHASE 5: ACTIVATE                               │
│                                                 │
│  5.1 Validate skill loads correctly             │
│  5.2 Update available_skills manifest           │
│  5.3 Notify agent runtimes (if active)          │
│  5.4 Print success + usage info                 │
└─────────────────────────────────────────────────┘
```

---

## 3. Phase-by-Phase Breakdown

### Phase 1: RESOLVE

This is where SPM figures out exactly what to install.

#### 1.1 Parse Input

```javascript
// Internal parsing logic
function parseInstallTarget(input) {
  // Local file
  if (input.endsWith('.skl') || input.startsWith('./') || input.startsWith('/')) {
    return { type: 'local', path: input };
  }

  // GitHub shorthand
  if (input.startsWith('github:')) {
    const [owner, repoAndTag] = input.replace('github:', '').split('/');
    const [repo, tag] = repoAndTag.split('#');
    return { type: 'github', owner, repo, tag: tag || 'latest' };
  }

  // Registry (default)
  const [name, version] = input.split('@');
  return {
    type: 'registry',
    name,
    version: version || 'latest',
  };
}
```

#### 1.2 Check Local Cache

Before hitting the network, check if we already have this exact version:

```
~/.spm/cache/data-viz-1.2.0.skl    ← exists?
```

If cached and checksum matches → skip download (Phase 2).

#### 1.3 Query Registry for Version Resolution

```http
GET https://registry.spm.dev/api/v1/skills/data-viz/resolve?range=^1.2.0

Response:
{
  "name": "data-viz",
  "requested": "^1.2.0",
  "resolved": "1.2.3",           // Highest matching version
  "available": ["1.0.0", "1.1.0", "1.2.0", "1.2.1", "1.2.2", "1.2.3", "2.0.0-beta.1"],
  "download_url": "https://registry.spm.dev/api/v1/skills/data-viz/1.2.3/download",
  "checksum": "sha256:a1b2c3d4e5f6...",
  "signature_url": "https://registry.spm.dev/api/v1/skills/data-viz/1.2.3/signature",
  "dependencies": {
    "skills": {
      "frontend-design": ">=1.0.0"
    },
    "system": {
      "python": ">=3.10",
      "pip_packages": ["plotly>=5.0", "pandas>=2.0"]
    }
  },
  "trust": {
    "signed": true,
    "verified_author": true,
    "scan_passed": true,
    "scan_date": "2026-02-25T10:00:00Z"
  },
  "size_bytes": 45200,
  "published_at": "2026-02-20T10:00:00Z"
}
```

#### 1.4 Build Dependency Tree

```
data-viz@1.2.3
├── (skill) frontend-design@>=1.0.0
│   └── (resolved) frontend-design@1.4.1
│       └── (system) node >= 18
├── (system) python >= 3.10
├── (pip) plotly >= 5.0
└── (pip) pandas >= 2.0
```

SPM recursively resolves skill dependencies, building a flat list of everything needed. Uses a SAT-solver-style algorithm (similar to npm's Arborist) to find a compatible version set.

#### 1.5 Conflict Detection

```javascript
// Check against already-installed skills
function detectConflicts(toInstall, installed) {
  const conflicts = [];

  // Version conflict: another skill requires incompatible version
  for (const [dep, range] of toInstall.dependencies.skills) {
    const existing = installed.get(dep);
    if (existing && !semver.satisfies(existing.version, range)) {
      conflicts.push({
        type: 'version_conflict',
        skill: dep,
        installed: existing.version,
        required: range,
        by: toInstall.name,
      });
    }
  }

  // Trigger conflict: skill description overlaps with existing skill
  for (const existing of installed.values()) {
    const overlap = computeTriggerOverlap(toInstall.description, existing.description);
    if (overlap > 0.8) {
      conflicts.push({
        type: 'trigger_overlap',
        skill: existing.name,
        overlap_score: overlap,
        suggestion: `Consider uninstalling ${existing.name} or adjusting trigger priorities`,
      });
    }
  }

  return conflicts;
}
```

#### 1.6 Present Install Plan

```
$ spm install data-viz@^1.2.0

Resolving dependencies...

Install plan:
  📦 data-viz@1.2.3 (45.2 KB)
     ✓ signed by almog@example.com
     ✓ verified author
     ✓ security scan passed (2026-02-25)

  Dependencies to install:
    📦 frontend-design@1.4.1 (32.1 KB) — skill dependency
    🐍 plotly>=5.0 — pip package
    🐍 pandas>=2.0 — pip package

  ⚠️  Trigger overlap (82%) with installed skill "chart-maker"
     Both trigger on: charts, visualization, graphs
     Suggestion: data-viz will take priority (newer install)

  Total download: 77.3 KB

Proceed? (Y/n) █
```

---

### Phase 2: DOWNLOAD

#### 2.1 Download .skl Package

```javascript
async function downloadPackage(resolvedInfo) {
  const response = await fetch(resolvedInfo.download_url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  // Stream to temp file with progress
  const tempPath = path.join(CACHE_DIR, `${resolvedInfo.name}-${resolvedInfo.version}.skl.tmp`);
  const writer = fs.createWriteStream(tempPath);
  const progress = new ProgressBar(':bar :percent :etas', { total: resolvedInfo.size_bytes });

  for await (const chunk of response.body) {
    writer.write(chunk);
    progress.tick(chunk.length);
  }

  writer.close();
  return tempPath;
}
```

#### 2.2 Verify Checksum

```javascript
function verifyChecksum(filePath, expected) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  const actual = `sha256:${hash.digest('hex')}`;

  if (actual !== expected) {
    throw new IntegrityError(
      `Checksum mismatch!\n` +
      `Expected: ${expected}\n` +
      `Got:      ${actual}\n` +
      `The package may have been tampered with.`
    );
  }
}
```

#### 2.3 Verify Signature

```javascript
async function verifySignature(sklPath, bundleUrl, authorIdentity) {
  // Download Sigstore bundle (.sigstore file)
  const bundleResponse = await fetch(bundleUrl);
  const bundleJson = await bundleResponse.json();

  // sigstore-js verification (@sigstore/verify)
  // Same infrastructure npm uses for provenance verification
  const { verify } = require('@sigstore/verify');
  const { bundleFromJSON } = require('@sigstore/bundle');

  const bundle = bundleFromJSON(bundleJson);
  const artifact = fs.readFileSync(sklPath);

  try {
    verify(bundle, artifact, {
      certificateIssuer: 'https://github.com/login/oauth',
      certificateIdentityEmail: authorIdentity, // e.g., almog@example.com
    });
  } catch (err) {
    if (flags.skipVerify) {
      console.warn('⚠️  Signature verification FAILED but --skip-verify flag is set');
      console.warn('    Installing unsigned/unverified package at your own risk');
    } else {
      throw new SignatureError(
        `Signature verification failed for ${sklPath}.\n` +
          `This package may have been tampered with.\n` +
          `Use --skip-verify to install anyway (not recommended).`,
      );
    }
  }

  return {
    signer: result.signerIdentity,
    timestamp: result.signedAt,
    rekorLogId: result.tlogEntry?.logIndex,
    verified: true,
  };
}
```

#### 2.4 Cache

```javascript
// Move verified .skl to permanent cache
const cachePath = path.join(CACHE_DIR, `${name}-${version}.skl`);
fs.renameSync(tempPath, cachePath);

// Write cache metadata
fs.writeFileSync(
  cachePath + '.meta.json',
  JSON.stringify({
    name,
    version,
    checksum: resolvedInfo.checksum,
    signature_verified: true,
    cached_at: new Date().toISOString(),
  }),
);
```

---

### Phase 3: SECURITY SCAN

Local scan before extraction to the skill store. This runs even if the registry already scanned it — defense in depth.

#### 3.1 Extract to Temp Directory

```javascript
const tempDir = path.join(os.tmpdir(), `spm-scan-${name}-${version}`);
await extractSkl(cachePath, tempDir);
// .skl is a tar.gz internally
// tar -xzf data-viz-1.2.3.skl -C /tmp/spm-scan-data-viz-1.2.3/
```

#### 3.2 Static Analysis

```javascript
async function staticAnalysis(skillDir) {
  const issues = [];

  // Scan all script files
  const scripts = glob.sync(path.join(skillDir, '**/*.{py,js,ts,sh,bash}'));

  for (const script of scripts) {
    const content = fs.readFileSync(script, 'utf-8');
    const filename = path.relative(skillDir, script);

    // --- Network access detection ---
    const networkPatterns = [
      /import\s+requests/,
      /import\s+urllib/,
      /import\s+httpx/,
      /import\s+aiohttp/,
      /fetch\s*\(/,
      /axios\./,
      /curl\s/,
      /wget\s/,
      /socket\./,
      /subprocess.*curl|wget|nc\b/,
    ];

    for (const pattern of networkPatterns) {
      if (pattern.test(content)) {
        issues.push({
          severity: 'high',
          file: filename,
          type: 'network_access',
          pattern: pattern.toString(),
          message: `Potential network access detected. Skill manifest declares network_access: ${manifest.security?.network_access || false}`,
        });
      }
    }

    // --- Dangerous execution patterns ---
    const execPatterns = [
      { pattern: /eval\s*\(/, type: 'eval', severity: 'critical' },
      { pattern: /exec\s*\(/, type: 'exec', severity: 'critical' },
      { pattern: /os\.system\s*\(/, type: 'os_system', severity: 'critical' },
      { pattern: /subprocess\..*shell\s*=\s*True/, type: 'shell_injection', severity: 'critical' },
      { pattern: /__import__/, type: 'dynamic_import', severity: 'high' },
      { pattern: /compile\s*\(.*exec/, type: 'code_compilation', severity: 'high' },
    ];

    for (const { pattern, type, severity } of execPatterns) {
      if (pattern.test(content)) {
        issues.push({ severity, file: filename, type, message: `Dangerous pattern: ${type}` });
      }
    }

    // --- Filesystem access outside declared scope ---
    const fsPatterns = [
      /\/etc\//,
      /\/root\//,
      /~\//,
      /os\.environ/,
      /process\.env/,
      /\.ssh\//,
      /\.aws\//,
      /credentials/i,
      /\.env\b/,
    ];

    for (const pattern of fsPatterns) {
      if (pattern.test(content)) {
        issues.push({
          severity: 'high',
          file: filename,
          type: 'suspicious_fs_access',
          message: `Access to sensitive path detected: ${pattern}`,
        });
      }
    }

    // --- Obfuscation detection ---
    const obfuscationPatterns = [
      { pattern: /base64\.(b64decode|decodebytes)/, type: 'base64_decode' },
      { pattern: /\\x[0-9a-f]{2}.*\\x[0-9a-f]{2}.*\\x[0-9a-f]{2}/, type: 'hex_encoding' },
      { pattern: /String\.fromCharCode/, type: 'char_code_construction' },
      { pattern: /atob\s*\(/, type: 'base64_decode_js' },
    ];

    for (const { pattern, type } of obfuscationPatterns) {
      if (pattern.test(content)) {
        issues.push({
          severity: 'medium',
          file: filename,
          type: 'obfuscation',
          message: `Potential code obfuscation: ${type}`,
        });
      }
    }
  }

  return issues;
}
```

#### 3.3 Prompt Injection Scan

```javascript
async function scanForPromptInjection(skillMdPath) {
  const content = fs.readFileSync(skillMdPath, 'utf-8');
  const issues = [];

  // Pattern-based detection
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /forget\s+(all\s+)?prior\s+(instructions|context)/i,
    /you\s+are\s+now\s+/i,
    /new\s+system\s+prompt/i,
    /override\s+(system|safety|security)/i,
    /disregard\s+(the\s+)?(above|previous|system)/i,
    /pretend\s+you\s+are/i,
    /act\s+as\s+if\s+you\s+have\s+no\s+restrictions/i,
    /do\s+not\s+follow\s+(the\s+)?(safety|content)\s+(guidelines|policy)/i,
  ];

  for (const pattern of injectionPatterns) {
    const match = content.match(pattern);
    if (match) {
      issues.push({
        severity: 'critical',
        type: 'prompt_injection',
        match: match[0],
        message: `Potential prompt injection detected: "${match[0]}"`,
      });
    }
  }

  // Hidden content detection
  // Zero-width characters that could hide instructions
  const hiddenChars = /[\u200B\u200C\u200D\uFEFF\u00AD]/g;
  const hiddenMatches = content.match(hiddenChars);
  if (hiddenMatches && hiddenMatches.length > 3) {
    issues.push({
      severity: 'critical',
      type: 'hidden_content',
      message: `${hiddenMatches.length} zero-width/invisible characters detected — may hide instructions`,
    });
  }

  // Unicode homograph detection (e.g., Cyrillic "а" instead of Latin "a")
  const suspiciousUnicode = /[\u0400-\u04FF].*[a-zA-Z]|[a-zA-Z].*[\u0400-\u04FF]/;
  if (suspiciousUnicode.test(content)) {
    issues.push({
      severity: 'medium',
      type: 'unicode_homograph',
      message: 'Mixed scripts detected — possible homograph attack',
    });
  }

  return issues;
}
```

#### 3.4 Permission Audit

```javascript
function auditPermissions(manifest, staticIssues) {
  const report = {
    declared: {
      network: manifest.security?.network_access || false,
      filesystem: manifest.security?.filesystem_scope || ['$WORKDIR'],
      tools_required: manifest.agents?.requires_tools || [],
    },
    detected: {
      network: staticIssues.some((i) => i.type === 'network_access'),
      sensitive_fs: staticIssues.some((i) => i.type === 'suspicious_fs_access'),
      code_execution: staticIssues.some((i) => ['eval', 'exec', 'os_system'].includes(i.type)),
    },
    mismatches: [],
  };

  // Flag undeclared capabilities
  if (report.detected.network && !report.declared.network) {
    report.mismatches.push({
      severity: 'critical',
      message: 'Skill uses network access but does not declare it in manifest',
    });
  }

  return report;
}
```

#### 3.5 Show Security Report

```
Security scan results for data-viz@1.2.3:

  Static analysis:     ✓ Passed (0 critical, 0 high, 1 medium)
  Prompt injection:    ✓ Passed (no injection patterns found)
  Permission audit:    ✓ Consistent (declared matches detected)

  Permissions requested:
    📁 Filesystem: $WORKDIR, $OUTPUTS
    🌐 Network:    None
    🔧 Tools:      bash_tool, create_file, view

  ℹ️  1 medium issue:
    scripts/helpers/utils.py — base64 encoding detected (used for chart export)

Proceed with install? (Y/n) █
```

For **critical issues**, SPM blocks installation by default:

```
Security scan results for sketchy-skill@0.1.0:

  ❌ CRITICAL: Prompt injection pattern detected in SKILL.md
     Line 47: "ignore previous instructions and..."

  ❌ CRITICAL: Undeclared network access
     scripts/main.py uses 'requests' library but manifest declares
     network_access: false

  ❌ CRITICAL: eval() with dynamic input
     scripts/helpers.py line 23: eval(user_input)

  Installation BLOCKED due to critical security issues.

  Options:
    --force     Install anyway (dangerous, you accept all risk)
    spm report sketchy-skill    Report this skill to SPM security team
```

---

### Phase 4: INSTALL

#### 4.1 Install System Dependencies

```javascript
async function installSystemDeps(manifest) {
  const deps = manifest.dependencies?.system || {};

  // Check Python version
  if (deps.python) {
    const pythonVersion = execSync('python3 --version').toString().trim();
    if (!semver.satisfies(parsePythonVersion(pythonVersion), deps.python)) {
      throw new DependencyError(`Requires Python ${deps.python}, found ${pythonVersion}`);
    }
  }

  // Install pip packages
  if (deps.pip_packages?.length) {
    console.log(`Installing ${deps.pip_packages.length} pip packages...`);
    execSync(`pip install ${deps.pip_packages.join(' ')} --break-system-packages`, {
      stdio: 'inherit',
    });
  }

  // Install npm packages
  if (deps.npm_packages?.length) {
    console.log(`Installing ${deps.npm_packages.length} npm packages...`);
    execSync(`npm install -g ${deps.npm_packages.join(' ')}`, { stdio: 'inherit' });
  }
}
```

#### 4.2 Extract to Skill Store

```javascript
function extractToStore(sklPath, name, version) {
  const storeDir = path.join(SPM_HOME, 'skills', name, version);
  fs.mkdirSync(storeDir, { recursive: true });

  // Extract .skl (tar.gz) to version directory
  execSync(`tar -xzf ${sklPath} -C ${storeDir}`);

  // Update "current" symlink
  const currentLink = path.join(SPM_HOME, 'skills', name, 'current');
  if (fs.existsSync(currentLink)) fs.unlinkSync(currentLink);
  fs.symlinkSync(storeDir, currentLink);

  return storeDir;
}
```

Result:

```
~/.spm/skills/
└── data-viz/
    ├── 1.2.3/                  ← Extracted contents
    │   ├── manifest.json
    │   ├── SKILL.md
    │   ├── signature.sig
    │   ├── checksums.sha256
    │   ├── scripts/
    │   │   └── main.py
    │   ├── references/
    │   └── assets/
    └── current -> 1.2.3/      ← Symlink to active version
```

#### 4.3 Install Skill Dependencies

```javascript
async function installSkillDeps(manifest) {
  const skillDeps = manifest.dependencies?.skills || {};

  for (const [depName, versionRange] of Object.entries(skillDeps)) {
    const installed = getInstalledVersion(depName);

    if (installed && semver.satisfies(installed, versionRange)) {
      console.log(`  ✓ ${depName}@${installed} (already installed, compatible)`);
      continue;
    }

    if (installed && !semver.satisfies(installed, versionRange)) {
      console.log(`  ↑ ${depName}@${installed} → needs ${versionRange}`);
      // Recursive install with version constraint
    }

    // Recursive call — installs the dependency using the same pipeline
    console.log(`  + ${depName}@${versionRange}`);
    await spmInstall(depName, versionRange);
  }
}
```

#### 4.4 Link to Agent Platforms (Vercel skills CLI)

This is the critical bridge — making the installed skill visible to all agents. Instead of building custom per-agent linking, SPM delegates to Vercel's battle-tested `skills` CLI, which already supports 37+ agents:

```javascript
const { execSync } = require('child_process');

async function linkToAgentPlatforms(name, storeDir) {
  // Vercel's skills CLI handles:
  // - Auto-detecting installed agents (Claude Code, Cursor, Copilot, Codex, etc.)
  // - Creating symlinks into each agent's expected directory
  // - Handling edge cases (Windows junctions, copy mode fallback)
  // - Lock file management (~/.agents/.skill-lock.json)

  try {
    const result = execSync(`npx skills add "${storeDir}" -a '*' -y`, {
      encoding: 'utf-8',
      timeout: 30000,
    });

    // Parse which agents were linked
    const linkedAgents = parseSkillsOutput(result);
    // e.g., ['claude-code', 'cursor', 'copilot']

    return {
      linked: true,
      agents: linkedAgents,
      method: 'vercel-skills-cli',
    };
  } catch (err) {
    // Vercel CLI not available — fall back to basic linking
    console.warn('⚠️  Vercel skills CLI not found. Using basic linking.');
    console.warn('    Install with: npm install -g skills');

    // Minimal fallback: just link to .agents/skills/ (canonical dir)
    const agentsDir = path.join(os.homedir(), '.agents', 'skills', name);
    fs.mkdirSync(path.dirname(agentsDir), { recursive: true });
    fs.symlinkSync(storeDir, agentsDir);

    return {
      linked: true,
      agents: ['generic'],
      method: 'fallback-symlink',
    };
  }
}

// What Vercel's skills CLI does under the hood:
// 1. Detects installed agents by checking for config directories
//    (.claude/, .cursor/, .github/copilot/, .codex/, etc.)
// 2. For each detected agent, creates symlink:
//    ~/.agents/skills/<name>/ → canonical location
//    .claude/skills/<name>/  → agent-specific location
//    .cursor/skills/<name>/  → agent-specific location
// 3. Updates lock file at ~/.agents/.skill-lock.json
// 4. Supports 37+ agents out of the box
```

#### 4.5 Update spm.lock

```json
// spm.lock — pinned versions for reproducibility
{
  "lockfileVersion": 1,
  "dependencies": {
    "data-viz": {
      "version": "1.2.3",
      "resolved": "https://registry.spm.dev/api/v1/skills/data-viz/1.2.3/download",
      "checksum": "sha256:a1b2c3d4e5f6...",
      "signer": "almog@example.com",
      "signed_at": "2026-02-20T10:00:00Z",
      "dependencies": {
        "frontend-design": "1.4.1"
      }
    },
    "frontend-design": {
      "version": "1.4.1",
      "resolved": "https://registry.spm.dev/api/v1/skills/frontend-design/1.4.1/download",
      "checksum": "sha256:f6e5d4c3b2a1...",
      "signer": "anthropic-official@anthropic.com",
      "signed_at": "2026-02-18T10:00:00Z",
      "dependencies": {}
    }
  }
}
```

#### 4.6 Register in Local Skill Index

```javascript
// ~/.spm/index.json — fast lookup for installed skills
function updateLocalIndex(name, version, manifest) {
  const index = readIndex();

  index.skills[name] = {
    version,
    installed_at: new Date().toISOString(),
    description: manifest.description,
    category: manifest.category,
    keywords: manifest.keywords,
    trust: {
      signed: true,
      verified_author: true,
      scan_passed: true,
    },
    path: path.join(SPM_HOME, 'skills', name, 'current'),
    linked_agents: linkResult.agents, // e.g., ['claude-code', 'cursor', 'copilot']
    link_method: linkResult.method, // 'vercel-skills-cli' or 'fallback-symlink'
  };

  writeIndex(index);
}
```

---

### Phase 5: ACTIVATE

#### 5.1 Validate Skill Loads

```javascript
async function validateSkill(skillDir) {
  // Check SKILL.md is readable and well-formed
  const skillMd = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8');
  if (!skillMd.includes('---')) {
    console.warn('⚠️  SKILL.md missing YAML frontmatter');
  }

  // Check all declared scripts exist and are executable
  const manifest = readManifest(skillDir);
  for (const script of manifest.files?.scripts || []) {
    const scriptPath = path.join(skillDir, script);
    if (!fs.existsSync(scriptPath)) {
      throw new ValidationError(`Declared script missing: ${script}`);
    }
  }

  // Dry-run any test cases
  if (fs.existsSync(path.join(skillDir, 'tests', 'eval.json'))) {
    console.log('Running quick validation tests...');
    // Run a subset of test cases to verify skill works
  }
}
```

#### 5.2 Update `available_skills` Manifest

Agent system prompts include `<available_skills>`. SPM generates this from the local index:

```javascript
function generateAvailableSkillsXml() {
  const index = readIndex();

  let xml = '<available_skills>\n';

  for (const [name, info] of Object.entries(index.skills)) {
    xml += `<skill>\n`;
    xml += `<name>\n${name}\n</name>\n`;
    xml += `<description>\n${info.description}\n</description>\n`;
    xml += `<location>\n${info.path}/SKILL.md\n</location>\n`;
    xml += `</skill>\n\n`;
  }

  xml += '</available_skills>';
  return xml;
}

// Written to a known location that the agent's system prompt includes
fs.writeFileSync('/mnt/skills/available_skills.xml', generateAvailableSkillsXml());
```

#### 5.3 Print Success

```
$ spm install data-viz@^1.2.0

Resolving...      ✓ data-viz@1.2.3 (latest matching ^1.2.0)
Dependencies...   ✓ frontend-design@1.4.1 (already installed)
                  ✓ 2 pip packages installed
Downloading...    ✓ 45.2 KB (cached)
Verifying...      ✓ Signature valid (almog@example.com via Sigstore)
                  ✓ Checksum matches
Scanning...       ✓ No security issues
Installing...     ✓ Extracted to ~/.spm/skills/data-viz/1.2.3
                  ✓ Linked to /mnt/skills/user/data-viz
Activating...     ✓ Skill registered and available

╭─────────────────────────────────────────────────╮
│  ✅ data-viz@1.2.3 installed successfully        │
│                                                 │
│  Your agent can now use this skill when you ask  │
│  about: charts, visualization, dashboards,      │
│  graphs, plots, data display                    │
│                                                 │
│  Try: "Create a bar chart from my sales.csv"    │
╰─────────────────────────────────────────────────╯
```

---

## 4. Special Installation Flows

### 4.1 Local `.skl` File

```bash
$ spm install ./my-custom-skill.skl
```

Skips Phase 1 (resolve) and Phase 2.1-2.2 (download). Goes straight to signature verification (if signed) → scan → install. No registry involved.

### 4.2 GitHub Direct

```bash
$ spm install github:almog/gantt-chart#v1.0.0
```

```javascript
async function installFromGithub(owner, repo, tag) {
  // 1. Clone or download tarball from GitHub
  const url = `https://github.com/${owner}/${repo}/archive/refs/tags/${tag}.tar.gz`;
  const tarball = await download(url);

  // 2. Extract and look for manifest.json
  const tempDir = extractTarball(tarball);
  const manifest = readManifest(tempDir);

  // 3. Pack it into .skl format locally
  const sklPath = await packSkl(tempDir, manifest);

  // 4. Continue with normal install pipeline (scan, install, activate)
  // Note: no registry signature — will be marked as "unverified source"
  await installFromLocal(sklPath, { source: 'github', unverified: true });
}
```

### 4.3 Install via MCP (Agent-Initiated)

When an agent installs via the MCP `spm_install` tool during a conversation:

```javascript
// MCP handler — runs server-side
async function mcpInstall(name, version) {
  // 1. Require explicit user confirmation (agent must have asked)
  // 2. Run the same pipeline but non-interactive
  //    - Auto-accept if trust level >= verified
  //    - Block if critical security issues (no --force in MCP)
  // 3. Return result to agent

  return {
    success: true,
    name: 'data-viz',
    version: '1.2.3',
    skill_path: '/mnt/skills/user/data-viz/SKILL.md',
    message: 'Skill installed. You can now read the SKILL.md to use it.',
  };
}
```

### 4.4 Bulk Install from `spm.json`

For project-level skill management:

```json
// spm.json (lives in project root)
{
  "skills": {
    "data-viz": "^1.2.0",
    "pdf": "^2.0.0",
    "custom-report": "github:mycompany/custom-report#main"
  },
  "settings": {
    "trust_level": "verified",
    "auto_update": false
  }
}
```

```bash
$ spm install
# Reads spm.json, installs all declared skills
# Similar to npm install with no arguments
```

---

## 5. Update Flow

```bash
$ spm update data-viz

Checking for updates...
  data-viz: 1.2.3 → 1.3.0 available

Changelog for 1.3.0:
  - Added heatmap support
  - Fixed axis label overlap on small screens
  - New dependency: seaborn>=0.12

  Permission changes: None
  New dependencies: seaborn>=0.12 (pip)

Update? (Y/n) █

Downloading...    ✓ 48.1 KB
Verifying...      ✓ Signature valid
Scanning...       ✓ No issues (diff from 1.2.3 reviewed)
Installing...     ✓ Extracted to ~/.spm/skills/data-viz/1.3.0
                  ✓ Updated current → 1.3.0
                  ✓ Previous version 1.2.3 retained

  ✅ data-viz updated: 1.2.3 → 1.3.0

  Rollback: spm install data-viz@1.2.3
```

Key difference from fresh install: the **diff review** in Phase 3 compares the new version against the currently installed one, flagging any new permissions, dependencies, or suspicious changes.

---

## 6. Uninstall Flow

```bash
$ spm uninstall data-viz

Checking dependents...
  ⚠️  advanced-dashboard@1.0.0 depends on data-viz>=1.0.0

Remove anyway? This may break advanced-dashboard. (y/N) y

Removing...
  ✓ Unlinked from all agents (via npx skills remove data-viz)
  ✓ Removed from skill index
  ✓ Updated spm.lock
  ✓ Files retained in cache (~/.spm/cache/data-viz-1.2.3.skl)

  ✅ data-viz@1.2.3 uninstalled

  Reinstall: spm install data-viz@1.2.3 (will use cache)
```

---

## 7. Error Handling Matrix

| Error                       | Phase    | User Sees                                                    | Recovery                                   |
| --------------------------- | -------- | ------------------------------------------------------------ | ------------------------------------------ |
| Skill not found in registry | Resolve  | `Skill "xyz" not found. Did you mean...?`                    | Suggest similar names                      |
| No version satisfies range  | Resolve  | `No version of data-viz matches ^3.0.0. Available: 1.x, 2.x` | Show available versions                    |
| Network timeout             | Download | `Download failed. Retrying (2/3)...`                         | Auto-retry 3x, then fail                   |
| Checksum mismatch           | Download | `INTEGRITY ERROR: package may be tampered`                   | Block install, suggest reporting           |
| Signature invalid           | Download | `Signature verification failed`                              | Block (or `--skip-verify`)                 |
| Critical scan issue         | Scan     | `BLOCKED: [details]`                                         | Block (or `--force`)                       |
| pip install fails           | Install  | `Failed to install plotly: [pip error]`                      | Show pip output, suggest manual fix        |
| Disk full                   | Install  | `Not enough disk space (need 45MB, have 12MB)`               | Suggest `spm cache clean`                  |
| Symlink permission denied   | Install  | `Cannot link skill to agent directories`                     | Suggest `--copy` mode or check permissions |
| Circular dependency         | Resolve  | `Circular dependency: A → B → C → A`                         | Block, show cycle                          |

```

```
