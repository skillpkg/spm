# SPM Monetization — Simplified

## Phase 1: Free + Tips. But Instrument Everything from Day 1.

---

## 1. Simplified Revenue Model

```
LAUNCH (Phase 1-2):
  Everything is free.
  Optional tips via "spm sponsor" (95% to author, 5% processing).
  That's it.

LATER (Phase 3+):
  SPM Pro ($10-20/month) — for authors AND power users:
    ├── Advanced analytics dashboard
    ├── Trigger rate insights
    ├── Advanced security scanning
    ├── Priority support
    ├── API access to analytics data
    └── Whatever else proves valuable by then

  Enterprise (custom pricing) — for companies:
    ├── Private registry hosting
    ├── SSO / SAML
    ├── Audit logs
    └── Support SLA

  Premium skills (author-set pricing):
    ├── Only when demand proves it makes sense
    └── Not before Phase 3

NEVER:
  Ads, data selling, pay-to-publish, pay-to-install-free-skills
```

The point: don't build billing infrastructure before you have users. But DO build analytics infrastructure before you have users.

---

## 2. Why Analytics from Day 1

```
Month 6 without Day 1 analytics:
  Author: "How many people use my skill?"
  SPM: "Uh... we have total download count. That's it."
  Author: "Is anyone actually triggering it? Is my description good?"
  SPM: "No idea."
  Author: leaves

Month 6 WITH Day 1 analytics:
  Author: "How's my skill doing?"
  SPM: "847 installs, 62% trigger rate, most common prompt pattern
        is 'create a chart from CSV', you're the #3 skill in the
        data category, and usage grew 23% this month."
  Author: stays, improves skill, tells friends
```

Analytics is what makes SPM sticky. npm doesn't have this. PyPI doesn't have this. The VS Code marketplace barely has this. **Trigger analytics is SPM's unfair advantage** — because SPM is the only package manager where the runtime (the agent) can report back how skills are actually used.

---

## 3. What to Collect from Day 1

### 3.1 Event Types

Every meaningful action becomes an event. Stored cheaply, queried later.

```python
# Core events to instrument from Day 1

EVENTS = {
    # ── Install lifecycle ─────────────────────────────
    "skill.installed": {
        "fields": {
            "skill_name": str,
            "version": str,
            "source": str,          # "registry", "github", "local"
            "scope": str,           # "global", "project"
            "platform": str,        # "claude-code", "cursor", "copilot", "codex"
            "install_time_ms": int, # How long install took
            "has_deps": bool,       # Had skill dependencies?
            "from_cache": bool,     # Was it cached locally?
        },
        "why": "Basic adoption metric. Segment by platform, scope, source."
    },

    "skill.uninstalled": {
        "fields": {
            "skill_name": str,
            "version": str,
            "installed_duration_days": int,  # How long was it installed?
            "platform": str,
        },
        "why": "Churn tracking. Short duration = skill didn't meet expectations."
    },

    "skill.updated": {
        "fields": {
            "skill_name": str,
            "from_version": str,
            "to_version": str,
            "auto_update": bool,    # Manual or automatic?
        },
        "why": "Update adoption speed. Are users staying current?"
    },

    # ── Search & discovery ────────────────────────────
    "search.query": {
        "fields": {
            "query": str,           # What they searched for
            "results_count": int,   # How many results returned
            "category_filter": str, # Did they filter by category?
            "source": str,          # "cli", "web", "mcp"
        },
        "why": "What are people looking for? Where are the gaps?"
    },

    "search.click": {
        "fields": {
            "query": str,           # Original search query
            "skill_name": str,      # Which result they clicked
            "position": int,        # Position in results (1st, 2nd, etc.)
        },
        "why": "Search ranking quality. Do people click the top result?"
    },

    "search.install": {
        "fields": {
            "query": str,           # Original search query
            "skill_name": str,      # Which skill they installed
            "position": int,        # Where it appeared in results
        },
        "why": "Search-to-install funnel. The metric that matters most."
    },

    "search.no_results": {
        "fields": {
            "query": str,
        },
        "why": "Unmet demand. What skills should exist but don't?"
    },

    # ── Trigger analytics (the killer feature) ────────
    "skill.considered": {
        "fields": {
            "skill_name": str,
            "version": str,
            "user_prompt_hash": str,    # Hashed, not the actual prompt
            "prompt_category": str,     # "data", "code", "writing", etc.
            "platform": str,
        },
        "why": "How often does the agent even consider this skill? "
               "High considered + low triggered = bad description."
    },

    "skill.triggered": {
        "fields": {
            "skill_name": str,
            "version": str,
            "user_prompt_hash": str,
            "prompt_category": str,
            "platform": str,
            "read_time_ms": int,        # Time to read SKILL.md
            "scripts_executed": list,   # Which scripts ran
            "execution_time_ms": int,   # Total execution time
            "success": bool,            # Did it complete successfully?
        },
        "why": "The core metric. When the agent reads and uses your skill."
    },

    "skill.skipped": {
        "fields": {
            "skill_name": str,
            "version": str,
            "user_prompt_hash": str,
            "reason": str,             # "better_match", "not_relevant", "error"
            "chosen_instead": str,     # Which skill was picked instead
        },
        "why": "Competitive intelligence. Why is another skill winning?"
    },

    # ── MCP search (agent-initiated) ─────────────────
    "mcp.search": {
        "fields": {
            "query": str,
            "results_count": int,
            "installed_any": bool,      # Did user install from results?
        },
        "why": "How often does an agent search for skills mid-conversation?"
    },

    "mcp.install_suggested": {
        "fields": {
            "skill_name": str,
            "user_accepted": bool,      # Did they say yes to install?
        },
        "why": "MCP install conversion rate."
    },

    # ── Publishing ────────────────────────────────────
    "skill.published": {
        "fields": {
            "skill_name": str,
            "version": str,
            "is_update": bool,
            "has_scripts": bool,
            "has_references": bool,
            "package_size": int,
            "scan_result": str,         # "passed", "warning", "failed"
        },
        "why": "Ecosystem health. Publishing velocity."
    },

    "skill.publish_blocked": {
        "fields": {
            "skill_name": str,
            "block_reason": str,        # "content_security", "name_squat", etc.
            "category": str,
        },
        "why": "Security effectiveness. Are we catching bad actors?"
    },

    # ── Reviews ───────────────────────────────────────
    "review.submitted": {
        "fields": {
            "skill_name": str,
            "rating": int,
            "has_body": bool,           # Did they write text or just star?
        },
        "why": "Engagement depth."
    },
}
```

### 3.2 Privacy Rules for Events

```
WHAT WE COLLECT:
  ✓ Skill names, versions, categories
  ✓ Platform (Claude Code vs Cursor vs Copilot)
  ✓ Timestamps
  ✓ Hashed prompt categories (NOT the actual prompt)
  ✓ Aggregate counts
  ✓ Performance metrics (timing)

WHAT WE NEVER COLLECT:
  ✗ User prompts / conversation content
  ✗ File contents
  ✗ User IP addresses (anonymized before storage)
  ✗ Personal information beyond what's in the SPM account
  ✗ Which specific user triggered which skill (anonymized)
  ✗ Anything from the user's uploads or outputs

ANONYMIZATION:
  - User IDs hashed before analytics storage
  - IP addresses truncated to /24 (last octet removed)
  - Prompts never stored — only a category label and hash
  - Individual events not traceable to specific users
  - Only aggregate data shown in dashboards
```

---

## 4. Storage Architecture for Analytics

### 4.1 Day 1: Simple and Cheap

Don't build a data warehouse. Just append events to a table and a time-series-friendly structure.

```sql
-- Single events table. Partitioned by month.
-- This handles millions of events cheaply.

CREATE TABLE analytics_events (
    id              UUID DEFAULT gen_random_uuid(),
    event_type      VARCHAR(32) NOT NULL,

    -- Common dimensions
    skill_name      VARCHAR(64),
    skill_version   VARCHAR(32),
    platform        VARCHAR(16),
    source          VARCHAR(16),

    -- Event-specific data (flexible schema)
    properties      JSONB NOT NULL DEFAULT '{}',

    -- Time
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE analytics_events_2026_02 PARTITION OF analytics_events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE analytics_events_2026_03 PARTITION OF analytics_events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
-- ... auto-create future partitions via cron

-- Indexes for common queries
CREATE INDEX idx_events_skill ON analytics_events (skill_name, created_at);
CREATE INDEX idx_events_type ON analytics_events (event_type, created_at);
CREATE INDEX idx_events_type_skill ON analytics_events (event_type, skill_name, created_at);
```

```sql
-- Pre-aggregated daily stats (materialized by nightly job)
-- This is what the dashboard actually queries — fast, small.

CREATE TABLE analytics_daily (
    date            DATE NOT NULL,
    skill_name      VARCHAR(64) NOT NULL,

    -- Install metrics
    installs        INTEGER DEFAULT 0,
    uninstalls      INTEGER DEFAULT 0,
    updates         INTEGER DEFAULT 0,

    -- Trigger metrics
    times_considered INTEGER DEFAULT 0,
    times_triggered  INTEGER DEFAULT 0,
    times_skipped    INTEGER DEFAULT 0,
    avg_execution_ms INTEGER DEFAULT 0,
    success_rate     DECIMAL(5,4) DEFAULT 0,

    -- Search metrics
    search_impressions INTEGER DEFAULT 0,  -- Appeared in search results
    search_clicks      INTEGER DEFAULT 0,  -- Clicked from search
    search_installs    INTEGER DEFAULT 0,  -- Installed from search

    -- Platform breakdown (JSONB for flexibility)
    platform_breakdown JSONB DEFAULT '{}',
    -- e.g., {"claude-code": 45, "cursor": 30, "copilot": 5}

    PRIMARY KEY (date, skill_name)
);

-- Weekly and monthly rollups
CREATE TABLE analytics_weekly (
    week_start      DATE NOT NULL,      -- Monday
    skill_name      VARCHAR(64) NOT NULL,

    installs        INTEGER DEFAULT 0,
    triggers        INTEGER DEFAULT 0,
    trigger_rate    DECIMAL(5,4) DEFAULT 0,
    unique_users    INTEGER DEFAULT 0,  -- Approximate (HyperLogLog)

    PRIMARY KEY (week_start, skill_name)
);
```

### 4.2 Aggregation Job

```python
# Runs nightly at 2am UTC

async def aggregate_daily():
    """Roll up raw events into daily stats."""
    yesterday = date.today() - timedelta(days=1)

    skills = await db.fetch("""
        SELECT DISTINCT skill_name
        FROM analytics_events
        WHERE created_at >= $1 AND created_at < $2
    """, yesterday, yesterday + timedelta(days=1))

    for skill in skills:
        name = skill["skill_name"]

        stats = await db.fetchrow("""
            SELECT
                COUNT(*) FILTER (WHERE event_type = 'skill.installed') as installs,
                COUNT(*) FILTER (WHERE event_type = 'skill.uninstalled') as uninstalls,
                COUNT(*) FILTER (WHERE event_type = 'skill.updated') as updates,
                COUNT(*) FILTER (WHERE event_type = 'skill.considered') as considered,
                COUNT(*) FILTER (WHERE event_type = 'skill.triggered') as triggered,
                COUNT(*) FILTER (WHERE event_type = 'skill.skipped') as skipped,
                AVG((properties->>'execution_time_ms')::int)
                    FILTER (WHERE event_type = 'skill.triggered') as avg_exec,
                AVG(CASE WHEN event_type = 'skill.triggered'
                         AND (properties->>'success')::bool THEN 1.0 ELSE 0.0 END)
                    FILTER (WHERE event_type = 'skill.triggered') as success_rate
            FROM analytics_events
            WHERE skill_name = $1
              AND created_at >= $2 AND created_at < $3
        """, name, yesterday, yesterday + timedelta(days=1))

        await db.execute("""
            INSERT INTO analytics_daily
                (date, skill_name, installs, uninstalls, updates,
                 times_considered, times_triggered, times_skipped,
                 avg_execution_ms, success_rate)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (date, skill_name) DO UPDATE SET
                installs = EXCLUDED.installs,
                uninstalls = EXCLUDED.uninstalls,
                updates = EXCLUDED.updates,
                times_considered = EXCLUDED.times_considered,
                times_triggered = EXCLUDED.times_triggered,
                times_skipped = EXCLUDED.times_skipped,
                avg_execution_ms = EXCLUDED.avg_execution_ms,
                success_rate = EXCLUDED.success_rate
        """, yesterday, name,
            stats["installs"], stats["uninstalls"], stats["updates"],
            stats["considered"], stats["triggered"], stats["skipped"],
            stats["avg_exec"], stats["success_rate"])

    # Update skills table with running totals
    await db.execute("""
        UPDATE skills s SET
            total_downloads = (
                SELECT COALESCE(SUM(installs), 0)
                FROM analytics_daily WHERE skill_name = s.name
            ),
            weekly_downloads = (
                SELECT COALESCE(SUM(installs), 0)
                FROM analytics_daily
                WHERE skill_name = s.name
                  AND date >= CURRENT_DATE - 7
            )
    """)
```

### 4.3 Event Ingestion

Lightweight — don't over-engineer this at launch.

```python
# In the CLI: fire-and-forget, non-blocking

import asyncio
import aiohttp

ANALYTICS_ENDPOINT = "https://registry.spm.dev/api/v1/analytics/events"

async def track_event(event_type: str, properties: dict):
    """
    Send analytics event. Non-blocking, fire-and-forget.
    Failures are silently ignored — analytics should never
    break the user experience.
    """
    # Respect opt-out
    if get_config("analytics.opt_out"):
        return

    event = {
        "type": event_type,
        "properties": properties,
        "timestamp": datetime.utcnow().isoformat(),
        "cli_version": SPM_VERSION,
    }

    try:
        async with aiohttp.ClientSession() as session:
            await asyncio.wait_for(
                session.post(ANALYTICS_ENDPOINT, json=event),
                timeout=2.0  # 2 second timeout — don't slow down CLI
            )
    except Exception:
        pass  # Silently ignore. Analytics is best-effort.


# Usage in CLI commands:

async def cmd_install(skill_name, version):
    start = time.monotonic()

    # ... actual install logic ...

    elapsed = int((time.monotonic() - start) * 1000)

    await track_event("skill.installed", {
        "skill_name": skill_name,
        "version": resolved_version,
        "source": source,
        "platform": detect_platform().name,
        "install_time_ms": elapsed,
        "from_cache": was_cached,
    })
```

```python
# In the registry API: batch ingestion

from collections import deque

event_buffer = deque(maxlen=1000)

@app.post("/api/v1/analytics/events")
async def ingest_event(request):
    event = request.json
    event_buffer.append(event)

    # Flush to DB every 100 events or 30 seconds
    if len(event_buffer) >= 100:
        await flush_events()

    return Response(202)  # Accepted, not 200 — async processing

async def flush_events():
    """Batch insert buffered events."""
    if not event_buffer:
        return

    events = list(event_buffer)
    event_buffer.clear()

    # Bulk insert
    await db.executemany("""
        INSERT INTO analytics_events (event_type, skill_name, skill_version,
                                       platform, source, properties, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    """, [
        (e["type"],
         e["properties"].get("skill_name"),
         e["properties"].get("version"),
         e["properties"].get("platform"),
         e["properties"].get("source"),
         json.dumps(e["properties"]),
         e["timestamp"])
        for e in events
    ])
```

---

## 5. Analytics Opt-Out

Users must be able to opt out. This is non-negotiable.

```bash
# Opt out of analytics
$ spm config set analytics.opt_out true

  ✓ Analytics disabled. SPM will not send usage data.

  Note: download counts are still tracked server-side
  (they're part of the registry, not your CLI).
  Only CLI-side events (installs, triggers, searches) are affected.

# Opt back in
$ spm config set analytics.opt_out false
```

First run prompt:

```bash
$ spm install data-viz    # First ever spm command after install

  📊 SPM collects anonymous usage analytics to help skill
     authors understand how their skills are used.

     We NEVER collect: prompts, file contents, personal data.
     We DO collect: install/trigger counts, platform, timing.

     Full policy: https://spm.dev/privacy

  ? Enable analytics? (Y/n): Y
  ✓ Analytics enabled. Opt out anytime: spm config set analytics.opt_out true
```

---

## 6. Trigger Analytics: The Hard Part

The most valuable data — trigger analytics — requires integration with agent runtimes. This is where it gets tricky, but the multi-agent nature of SPM actually helps: we can use whatever observation method each platform supports.

### 6.1 How Trigger Data Flows

```
User sends message to agent
         │
         ▼
Agent checks <available_skills>
         │
         ├── Considers skill A ──► EVENT: skill.considered
         ├── Considers skill B ──► EVENT: skill.considered
         │
         ▼
Agent picks skill A
         │
         ├── Reads SKILL.md ─────► EVENT: skill.triggered
         ├── Skill B skipped ────► EVENT: skill.skipped
         │
         ▼
Agent executes skill A
         │
         ├── Runs scripts ───────► EVENT: (included in skill.triggered)
         ├── Success/failure ────► EVENT: (included in skill.triggered)
         │
         ▼
Response to user
```

### 6.2 Where This Data Comes From

```
Option A: spm-runtime skill reports back (most feasible)

  An spm-runtime SKILL.md could instruct the agent to fire
  events when it reads skills. But this is fragile — agents
  might not consistently follow these meta-instructions.

  Feasibility: Medium
  Reliability: Low-Medium

Option B: MCP server observes skill usage

  If the spm MCP server is connected, the agent's tool calls
  to spm_search and spm_install are observable. But actual
  skill triggering (reading SKILL.md) doesn't go through MCP.

  Feasibility: Medium
  Reliability: Medium (only for MCP-initiated actions)

Option C: CLI reports from local observation

  When an agent uses bash or file-read tools to access a SKILL.md,
  the CLI could detect this from file access logs or
  inotify/fswatch on the skills directory.

  Feasibility: High (Claude Code, Cursor), Low (web-based agents)
  Reliability: High where available

Option D: Platform usage APIs

  The ideal solution. Agent platforms expose anonymized skill
  usage data to skill authors. Requires partnerships.

  Feasibility: Depends on platform relationships
  Reliability: Highest

Option E: Instrumented wrapper scripts

  Instead of the agent running scripts/main.py directly,
  SKILL.md instructs the agent to run scripts/run.sh which
  wraps main.py and reports usage before executing.

  Feasibility: High
  Reliability: High (for skills with scripts)
```

### 6.3 Day 1 Approach: Start with What's Observable

```python
# What we CAN track from Day 1 without Anthropic's help:

TRACK_NOW = {
    "skill.installed":     "CLI knows this → 100% reliable",
    "skill.uninstalled":   "CLI knows this → 100% reliable",
    "skill.updated":       "CLI knows this → 100% reliable",
    "search.query":        "CLI/API knows this → 100% reliable",
    "search.click":        "Web UI knows this → 100% reliable",
    "skill.published":     "Registry knows this → 100% reliable",
    "mcp.search":          "MCP server knows this → 100% reliable",
    "mcp.install_suggested": "MCP server knows this → 100% reliable",
}

TRACK_LATER = {
    "skill.considered":    "Needs runtime integration or Option D",
    "skill.triggered":     "Partial via Option C/E now, full via Option D later",
    "skill.skipped":       "Needs runtime integration or Option D",
}

# For skills with scripts: use wrapper approach (Option E)
# Day 1 — partial trigger tracking for script-based skills
```

### 6.4 Wrapper Script Approach (Option E)

Skills that include scripts can get trigger tracking from Day 1:

```python
# scripts/spm_wrapper.py
# Included in every skill scaffold by spm init
# SKILL.md instructs the agent to run this instead of main.py directly

import sys
import time
import json
import os
from pathlib import Path

def report_trigger(skill_name, script_name, success, duration_ms):
    """Report skill trigger to SPM analytics (fire-and-forget)."""
    try:
        event_file = Path.home() / ".spm" / "pending_events.jsonl"
        event = {
            "type": "skill.triggered",
            "properties": {
                "skill_name": skill_name,
                "script": script_name,
                "success": success,
                "execution_time_ms": duration_ms,
                "platform": os.environ.get("SPM_PLATFORM", "unknown"),
            },
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        with open(event_file, "a") as f:
            f.write(json.dumps(event) + "\n")
    except Exception:
        pass  # Never fail the actual skill execution

if __name__ == "__main__":
    skill_name = os.environ.get("SPM_SKILL_NAME", "unknown")
    script = sys.argv[1] if len(sys.argv) > 1 else "main.py"

    start = time.monotonic()
    success = True

    try:
        # Execute the actual script
        exec(open(script).read())
    except Exception as e:
        success = False
        raise
    finally:
        elapsed = int((time.monotonic() - start) * 1000)
        report_trigger(skill_name, script, success, elapsed)
```

Events accumulate in `~/.spm/pending_events.jsonl` and get flushed to the registry on the next `spm` command (or by a background sync).

---

## 7. Free vs Future Pro Analytics

```
FREE (Day 1, for all authors):
  ├── Total downloads (all time)
  ├── Downloads this week / this month
  ├── Average rating + review count
  ├── Active version distribution
  └── Basic trigger count (when available via wrapper)

FUTURE PRO (Phase 3, paid tier):
  ├── Everything in Free
  ├── Downloads over time (full history chart)
  ├── Trigger rate (triggered / considered ratio)
  ├── Platform breakdown (pie chart)
  ├── Geographic distribution (heatmap)
  ├── Search impression + click-through data
  ├── Competitor comparison (your skill vs category avg)
  ├── Prompt category analysis (what types of tasks trigger you)
  ├── Version adoption curve (how fast users update)
  ├── Install → uninstall retention
  ├── Export to CSV / API access
  └── Custom alerts (downloads drop, bad review, etc.)
```

---

## 8. Day 1 Implementation Checklist

```
□ analytics_events table (partitioned by month)
□ analytics_daily table (pre-aggregated)
□ Nightly aggregation job
□ Event ingestion API endpoint (batch + single)
□ CLI track_event() function (fire-and-forget, non-blocking)
□ Analytics opt-out config + first-run prompt
□ Instrument: skill.installed, skill.uninstalled, skill.updated
□ Instrument: search.query, search.no_results
□ Instrument: skill.published, skill.publish_blocked
□ Instrument: mcp.search, mcp.install_suggested
□ Wrapper script template in spm init scaffold
□ Pending events file + flush on next CLI command
□ Free author dashboard: downloads, rating, basic stats
□ Privacy policy page (spm.dev/privacy)
```

Everything else — the pro dashboard, trigger analytics depth, competitor comparison — comes later. But the data pipeline is ready for it.
