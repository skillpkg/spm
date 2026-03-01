# SPM — Open Design Questions (Resolved)

All open questions from across the 20+ design docs, consolidated and decided.

---

## 1. ONNX Runtime vs HF Inference API for Layer 2?

**Context**: ProtectAI DeBERTa model can run locally via ONNX or remotely via HF API.

**Decision: ONNX runtime on the server.**

Why:

- Zero latency to external API, runs in-process
- No HF rate limits or downtime dependency
- Free forever (no API usage billing)
- Model is ~100MB, fits easily on a Fly.io machine
- Same approach npm's provenance system uses for local verification

ONNX setup: `@xenova/transformers` (or `onnxruntime-node`) loads the quantized model once at server startup. Classification takes ~50-100ms per SKILL.md.

Fallback: If ONNX fails to load (memory pressure, cold start), skip Layer 2 and route to Layer 3 (Lakera API) or hold for manual review. The scanner provider interface already supports `optional: true` per layer.

---

## 2. Fork Vercel's skills CLI or call as subprocess?

**Context**: SPM uses `npx skills add` for agent linking. Should we fork for tighter control?

**Decision: Subprocess call in Phase 1. Pin version. Evaluate fork later.**

Why NOT fork now:

- Vercel ships updates when new agents appear — we'd miss those
- Maintenance burden of merging upstream changes
- Their codebase is 3k+ lines of agent-specific logic we don't want to own
- Fork signals competition, subprocess signals collaboration

How:

```typescript
// spm-cli/src/lib/linker.ts
import { execSync } from 'child_process';

const SKILLS_CLI_VERSION = '0.3.14'; // pinned, tested

export function linkSkill(skillPath: string, agents: string = '*') {
  execSync(`npx skills@${SKILLS_CLI_VERSION} add ${skillPath} -a '${agents}' -y`, {
    stdio: 'pipe',
    timeout: 30000,
  });
}
```

Pin the version to avoid breaking changes. Bump deliberately after testing.

**When to reconsider forking:**

- If Vercel makes breaking changes without semver
- If we need to add custom behavior (e.g., SPM-specific metadata in the lock file)
- If Vercel abandons the project

---

## 3. Index skills.sh on Day 1?

**Context**: skills.sh has 200+ skills. Should SPM import them at launch?

**Decision: Yes. Import all 200+ at launch. Use failures to tune the scanner.**

Reasoning:

- Empty registry on Day 1 = dead on arrival
- 200+ skills gives immediate value and legitimacy
- Running all 200+ through the security pipeline is the best stress test we could ask for before launch
- Skills that get blocked are investigated: either fix the scanner (false positive) or legitimately flag the skill (real issue)
- This doubles as scanner calibration — if 30% of legitimate skills fail, we know our patterns are too aggressive

Approach:

1. **Pre-launch**: Import all 200+ skills from skills.sh. Run through full security pipeline. Treat blocked skills as a tuning exercise — adjust scanner thresholds and patterns until the false positive rate is acceptable.
2. **On-demand**: `spm import --from github <owner>/<repo>` for any new skill on skills.sh or GitHub. Runs full security pipeline, publishes as "Scanned" tier.
3. **Phase 2**: Background job that periodically syncs newly added skills from skills.sh into SPM.

---

## 4. Scope: global or per-project?

**From architecture doc, Question 1**: Should skills install globally or per-project?

**Decision: Both. Global by default, per-project with skills.json. Both levels tracked.**

Two separate file pairs:

- **Global**: `~/.spm/skills.json` + `~/.spm/skills-lock.json` — your machine, not committed
- **Project**: `./skills.json` + `./skills-lock.json` — your repo, committed to git

Commands:

- `spm install data-viz` → adds to project `./skills.json`
- `spm install -g data-viz` → adds to global `~/.spm/skills.json`
- `spm install` (no args, in a project) → installs everything from `./skills.json`

Same as npm: `npm install <pkg>` is project-local, `npm install -g <pkg>` is global, `npm install` restores from lockfile. When a teammate clones and runs `spm install`, they get exact pinned versions from the lock file.

This is documented in spm-skills-json.md.

---

## 5. Who can publish? Open (npm) or gated (App Store)?

**From architecture doc, Question 2**

**Decision: Open registration, gated by security scan.**

- Anyone with a GitHub account can register (`spm register`)
- Anyone can publish (after 24h cooldown)
- ALL publishes go through the 3-layer security pipeline
- Blocked publishes get fix suggestions + recorded in attempt history
- Trust tier progression rewards good publishers over time

This is npm's model, not the App Store. Friction-to-publish is the death of ecosystems. Security scanning is the gate, not manual review.

Exception: Tier 0 (Anonymous) cannot publish. Must have at least Tier 1 (Registered) with email or GitHub verified.

---

## 6. Skill forking?

**From architecture doc, Question 3**

**Decision: Allow forks, require attribution, use namespaces to avoid confusion.**

- Any user can publish a skill with any unused name
- If `data-viz` is taken, you can publish `@yourname/data-viz`
- Manifest has optional `forked_from` field for attribution
- Search results show "forked from data-viz" badge when `forked_from` is set
- No automatic fork tracking (unlike GitHub). If you fork, you explicitly declare it.

Phase 2: Add "fork graph" to web UI showing lineage.

---

## 7. Skill composition?

**From architecture doc, Question 4**

**Decision: Dependencies, not "extends." Composition is the agent's job.**

Skills can depend on other skills:

```json
{
  "dependencies": {
    "skills": {
      "frontend-design": ">=1.0.0"
    }
  }
}
```

SPM installs dependencies alongside the skill. But there's no "extends" mechanism — skills don't inherit from each other. The agent reads multiple SKILL.md files and composes them itself.

Why: "extends" creates tight coupling, versioning nightmares, and diamond dependency problems. Dependencies are enough. Agents are good at reading multiple SKILL.md files and combining their instructions.

---

## 8. Telemetry and privacy?

**From architecture doc, Question 5**

**Decision: Anonymous install counts only. Opt-in for trigger analytics.**

**What's collected automatically (no opt-out):**

- Download counts per skill per version (anonymous, no user ID)
- Platform breakdown (which agents installed it)

**What's opt-in (trigger analytics):**

- When an agent triggers a skill, it can report the event to SPM
- This powers author dashboards ("your skill was triggered 1,200 times this week")
- Requires the user to have the SPM MCP server connected
- No message content is ever sent — just: `{skill: "data-viz", platform: "claude-code", timestamp}`

**What's never collected:**

- Conversation content
- User messages
- File contents
- Agent responses

Privacy model is documented in spm-monetization-simplified.md.

---

## 9. Pricing model?

**From architecture doc, Question 6**

**Decision: Free for Phase 1-2. Explore premium tiers in Phase 3+.**

- Publishing: free
- Installing: free
- Private registries: free for Phase 1 (self-hosted)
- Premium possibilities (Phase 3+):
  - Paid "premium" skills (author sets price, SPM takes 15%)
  - Organization tier (private registry as a service)
  - Pro analytics dashboard (deeper trigger analytics)

Don't monetize before there's adoption. This is fully documented in spm-monetization.md and spm-monetization-simplified.md.

---

## 10. Registry federation?

**From architecture doc, Question 7**

**Decision: Support private registries. Federation protocol in Phase 3.**

Phase 1: `spm config set registry https://internal.company.com/spm` — point CLI at any compatible registry. Companies run their own instance for internal skills.

Phase 2: Scoped registries (like npm): `@company/skill-name` can resolve to a different registry.

Phase 3: Federation protocol — registries can discover and mirror skills from each other.

This is already documented in spm-federation.md and spm-registry-infrastructure.md (Section 9: Self-Hosted).

---

## 11. Lakera Guard: Phase 1 or Phase 2?

**Context**: Build-vs-borrow says Phase 2, but free tier is 10k requests/month.

**Decision: Phase 1 for the integration, Phase 2 for relying on it.**

Reasoning:

- The Lakera integration is literally one API call. It takes a day to build.
- Free tier (10k requests) is more than enough for early publishes.
- BUT: We don't want to depend on it for launch. If Lakera is down, publishes should still work.

Implementation:

- Build the Lakera provider (implements `ScannerProvider` interface)
- Layer 3 runs if Layer 2 is borderline (score 0.7-0.95) AND Lakera API is available
- If Lakera is unavailable: hold for manual review instead
- In Phase 2: make Layer 3 a hard gate (Lakera must pass, not just optional)

---

## 12. Commander.js vs oclif?

**Context**: Build-vs-borrow says Commander.js for Phase 1.

**Decision: Commander.js.**

- Lighter, faster to start
- No plugin system needed for Phase 1
- 40% of CLI tools on npm use Commander
- oclif is overkill until we need plugin extensibility

If we need plugins later (e.g., `spm plugin install custom-scanner`), we can migrate to oclif. The command structure would transfer directly.

---

## 13. skills.json: lock file format?

**Context**: Vercel's skills CLI has its own lock file (`~/.agents/.skill-lock.json`). SPM has `skills.json`. How do they coexist?

**Decision: SPM owns skills.json + skills-lock.json (project-local). Vercel's lock file is separate and we don't touch it.**

This follows the npm convention exactly:

- `skills.json` = `package.json` — human-editable intent ("I want data-viz ^1.2.0")
- `skills-lock.json` = `package-lock.json` — auto-generated resolved versions ("data-viz pinned to 1.2.3, sha256:abc")
- Both live in the project root, both get committed to git

```
my-project/
├── skills.json          # intent (human-editable)
├── skills-lock.json     # resolved (auto-generated by spm install)
└── ...
```

- `~/.agents/.skill-lock.json` = Vercel's skills CLI tracking file (which skills are symlinked where). We don't write to it — `npx skills add` manages it.

Someone clones the repo, runs `spm install`, and gets the exact same resolved versions. The lock file must be project-local for this to work — a global lock file would defeat the purpose.

---

## 14. spm-runtime: how to handle CLI-only users (no MCP)?

**Context**: spm-runtime SKILL.md assumes MCP might not be available.

**Decision: Already handled. Section 2 Option B covers CLI fallback.**

The SKILL.md has two paths:

- **Option A**: MCP tools available → agent searches and installs directly
- **Option B**: No MCP → agent suggests CLI commands to the user

No additional work needed. This is the design.

---

## 15. Trust tier: stored per-author or per-skill?

**Context**: Q1 from Almog's earlier feedback.

**Decision: Per-author, with per-version scan status.**

- `authors.trust_level` = the author's tier (Official/Verified/Scanned/Registered)
- `security_scans.status` = per-version scan result (passed/failed/warning)
- Display on search results: combines both (e.g., "✓✓ Verified author, ✓ scanned")

A verified author's skills aren't automatically "verified" — they still go through scanning. But they get fast-tracked (Tier 3+ gets flags instead of blocks for borderline patterns).

---

## Summary Table

| #   | Question                       | Decision                                                  | Phase |
| --- | ------------------------------ | --------------------------------------------------------- | ----- |
| 1   | ONNX vs HF API                 | ONNX runtime on server                                    | 1     |
| 2   | Fork Vercel CLI                | Subprocess, pin version                                   | 1     |
| 3   | Index skills.sh Day 1          | All 200+ pre-launch (scanner tuning exercise)             | 1     |
| 4   | Global vs per-project          | Both (npm model)                                          | 1     |
| 5   | Who can publish                | Open + security gate                                      | 1     |
| 6   | Skill forking                  | Namespaces + attribution field                            | 1     |
| 7   | Skill composition              | Dependencies only, no "extends"                           | 1     |
| 8   | Telemetry                      | Anonymous installs, opt-in triggers                       | 1     |
| 9   | Pricing                        | Free, explore premium Phase 3                             | 3     |
| 10  | Federation                     | Private registries Phase 1, federation Phase 3            | 1/3   |
| 11  | Lakera phase                   | Integration Phase 1, hard gate Phase 2                    | 1/2   |
| 12  | CLI framework                  | Commander.js                                              | 1     |
| 13  | Lock file coexistence          | Project-local `skills-lock.json` (like package-lock.json) | 1     |
| 14  | No-MCP fallback                | CLI fallback in spm-runtime                               | 1     |
| 15  | Trust: per-author or per-skill | Per-author + per-version scans                            | 1     |
