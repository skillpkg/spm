# Bulk Import at Scale — `spm-onboard`

## A Dedicated Onboarding Tool for Large-Scale Migrations

---

## 1. Two Tools, Two Audiences

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  spm import (built into the CLI)                         │
│  ├── For: individual authors, small teams                │
│  ├── Scale: up to ~100 skills                            │
│  ├── Installed: already part of spm                      │
│  ├── Self-serve: no approval needed                      │
│  ├── Flow: spm import --from ./skills/ --org @me         │
│  └── Handles: migrate, generate manifests, publish       │
│                                                          │
│  spm-onboard (separate tool)                             │
│  ├── For: companies with large skill libraries           │
│  ├── Scale: 100 to 100,000+ skills                       │
│  ├── Installed: separate (npm i -g spm-onboard)          │
│  ├── Requires: bulk import token (auto or approved)      │
│  ├── Flow: spm-onboard run --from ./skills/ --org @bigco │
│  └── Handles: parallel scanning, batch upload,           │
│       resumable state, pre-validation, progress UI       │
│                                                          │
│  Think of it as:                                         │
│    spm import   = "I have a folder of skills"            │
│    spm-onboard  = "We have a company-wide migration"     │
│                                                          │
│  spm-onboard is NOT in spm --help.                       │
│  It's a service SPM provides to companies,               │
│  not a daily-use developer command.                      │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Where the Bottlenecks Are

```
100,000 skills to migrate. Let's find every wall:

BOTTLENECK 1: Rate Limits
  Current design: Tier 2 author = 10 publishes/day
  Time to publish 100k: 27 YEARS
  ❌ Completely broken for bulk import

BOTTLENECK 2: Content Scanning
  Scanning SKILL.md + scripts per skill: ~200ms average
  100k × 200ms = 20,000 seconds = ~5.5 hours (serial)
  Parallelized (10 workers): ~33 minutes
  ⚠️ Manageable but needs parallel pipeline

BOTTLENECK 3: Name Similarity Checks
  Each new name checked against ALL existing names
  Levenshtein distance is O(n×m) per comparison
  100k names × 100k existing = 10 BILLION comparisons
  ❌ Naive approach is impossibly slow

BOTTLENECK 4: Upload Bandwidth
  Average skill size: ~20 KB (most are SKILL.md + small scripts)
  100k × 20 KB = 2 GB total
  Even at 10 Mbps upload: ~27 minutes
  ✅ Fine

BOTTLENECK 5: Database Writes
  100k rows in skills table + 100k in skill_versions
  + 100k in analytics_events + index updates
  Bulk insert: ~2-5 minutes with batching
  ✅ Fine

BOTTLENECK 6: Storage (R2/S3)
  100k objects × 20 KB = 2 GB
  S3 batch PUT: ~10 minutes with parallelism
  ✅ Fine

BOTTLENECK 7: Package Size Limits
  What if a skill is 500 MB? (canvas-design is already 2.6 MB)
  Need per-skill and total limits
  ⚠️ Needs policy
```

---

## 2. Solutions for Each Bottleneck

### 2.1 Rate Limits: Bulk Import Token

Bulk import gets its own rate limit tier — separate from normal publishing.

```python
# Bulk import is NOT "publish 100k times."
# It's a single authorized bulk operation with its own rules.

class BulkImportToken:
    """
    A time-limited, scope-limited token specifically for bulk imports.
    Requested by the org admin, approved by SPM team (or auto-approved
    for Tier 3+).
    """

    # Limits per bulk import session
    MAX_SKILLS_PER_IMPORT = 50_000   # Per session. Run twice for 100k.
    MAX_TOTAL_SIZE_GB = 10           # Total upload size per session
    MAX_SKILL_SIZE_MB = 50           # Per individual skill
    TOKEN_VALIDITY_HOURS = 72        # Token expires after 3 days
    CONCURRENT_UPLOADS = 20          # Parallel upload streams
```

```bash
# Request a bulk import token
$ spm-onboard request-token --org @vercel --estimated-skills 100000

  Requesting bulk import token for @vercel...

  Estimated: 100,000 skills
  Your trust level: Tier 2 (Verified Author)

  For imports over 10,000 skills, SPM team review is required.

  ? Provide a brief description of what you're importing:
    > Vercel's internal skill library, built over 18 months.
    > All skills are production-tested and actively used.

  ✓ Request submitted: BULK-2026-0042
    Estimated review time: 1-2 business days

  For imports under 10,000: auto-approved for Tier 2+
  For imports under 1,000:  auto-approved for Tier 1+
```

Auto-approval thresholds:

```
Skills     │ Tier 1    │ Tier 2      │ Tier 3+     │ Tier 4
───────────┼───────────┼─────────────┼─────────────┼────────────
< 100      │ ✓ auto    │ ✓ auto      │ ✓ auto      │ ✓ auto
< 1,000    │ ✓ auto    │ ✓ auto      │ ✓ auto      │ ✓ auto
< 10,000   │ review    │ ✓ auto      │ ✓ auto      │ ✓ auto
< 50,000   │ review    │ review      │ ✓ auto      │ ✓ auto
50,000+    │ review    │ review      │ review      │ ✓ auto
```

### 2.2 Content Scanning: Parallel Pipeline

Don't scan one by one. Stream through a parallel pipeline.

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

class BulkScanner:
    """Parallel content scanner for bulk imports."""

    def __init__(self, workers: int = 10):
        self.workers = workers
        self.executor = ProcessPoolExecutor(max_workers=workers)

    async def scan_batch(self, skills: list[Path]) -> dict:
        """Scan all skills in parallel batches."""
        results = {"passed": [], "blocked": [], "flagged": []}

        # Process in chunks to avoid memory issues
        CHUNK_SIZE = 100
        total = len(skills)

        for i in range(0, total, CHUNK_SIZE):
            chunk = skills[i:i + CHUNK_SIZE]

            # Scan chunk in parallel
            loop = asyncio.get_event_loop()
            futures = [
                loop.run_in_executor(self.executor, scan_single_skill, skill)
                for skill in chunk
            ]

            chunk_results = await asyncio.gather(*futures)

            for skill, result in zip(chunk, chunk_results):
                if result.has_blocks:
                    results["blocked"].append((skill, result))
                elif result.has_flags:
                    results["flagged"].append((skill, result))
                else:
                    results["passed"].append(skill)

            # Progress update
            done = min(i + CHUNK_SIZE, total)
            print(f"  Scanned {done}/{total} ({done*100//total}%)")

        return results

# Performance at 10 workers:
#   100 skills:     ~2 seconds
#   1,000 skills:   ~20 seconds
#   10,000 skills:  ~3 minutes
#   100,000 skills: ~30 minutes
```

### 2.3 Name Similarity: Pre-computed Index

Don't compare every name against every other name. Use a pre-computed similarity index.

```python
class NameSimilarityIndex:
    """
    Pre-computed index for fast name similarity checking.
    Uses normalized forms + phonetic hashing for O(1) lookups
    instead of O(n) Levenshtein comparisons.
    """

    def __init__(self):
        self.exact_names = set()          # Exact match: O(1)
        self.normalized_names = set()      # Stripped hyphens/underscores: O(1)
        self.ngram_index = defaultdict(set)  # 3-gram index for fuzzy matching
        self.soundex_index = defaultdict(set) # Phonetic index

    def build_from_db(self, existing_names: list[str]):
        """Build index from all existing skill names. Run once at import start."""
        for name in existing_names:
            self.exact_names.add(name.lower())
            self.normalized_names.add(self._normalize(name))

            # Build n-gram index (for fast approximate matching)
            for ngram in self._ngrams(name, 3):
                self.ngram_index[ngram].add(name)

            # Build phonetic index
            self.soundex_index[self._soundex(name)].add(name)

    def check_name(self, proposed: str) -> NameCheckResult:
        """Check a proposed name against the index. O(1) for most checks."""

        proposed_lower = proposed.lower()
        proposed_normalized = self._normalize(proposed)

        # O(1) exact match
        if proposed_lower in self.exact_names:
            return NameCheckResult("block", "exact_duplicate")

        # O(1) normalized collision
        if proposed_normalized in self.normalized_names:
            return NameCheckResult("block", "normalized_collision")

        # O(small_set) n-gram candidates (fast fuzzy matching)
        # Instead of comparing against ALL names, only compare against
        # names that share n-grams with the proposed name
        candidates = set()
        for ngram in self._ngrams(proposed, 3):
            candidates.update(self.ngram_index.get(ngram, set()))

        # Only run Levenshtein against candidates (typically < 100, not 100k)
        for candidate in candidates:
            distance = self._levenshtein(proposed_lower, candidate.lower())
            if distance <= 1 and len(proposed) <= 8:
                return NameCheckResult("block", f"typosquat:{candidate}")
            elif distance <= 1:
                return NameCheckResult("flag", f"similar:{candidate}")

        # Add to index (so subsequent checks in the same batch catch dupes)
        self._add_to_index(proposed)

        return NameCheckResult("pass", None)

    def _normalize(self, name: str) -> str:
        return name.lower().replace("-", "").replace("_", "")

    def _ngrams(self, name: str, n: int) -> list[str]:
        name = name.lower()
        return [name[i:i+n] for i in range(len(name) - n + 1)]

    def _soundex(self, name: str) -> str:
        """Simple phonetic hash."""
        # Soundex or Metaphone implementation
        ...

    def _add_to_index(self, name: str):
        """Add a name to the index during batch processing."""
        self.exact_names.add(name.lower())
        self.normalized_names.add(self._normalize(name))
        for ngram in self._ngrams(name, 3):
            self.ngram_index[ngram].add(name)

# Performance:
#   Build index from 100k existing names: ~2 seconds
#   Check one name against index: ~0.1ms
#   Check 100k new names: ~10 seconds
#   vs. naive Levenshtein: ~hours
```

### 2.4 Upload: Streaming Batch Protocol

Don't upload 100k individual HTTP requests. Use a batch protocol.

```python
# Client side: stream .skl files in a batch upload

class BulkUploader:
    """Upload skills in parallel streams with batched metadata."""

    def __init__(self, token: str, concurrent: int = 20):
        self.token = token
        self.semaphore = asyncio.Semaphore(concurrent)
        self.session = aiohttp.ClientSession()

    async def upload_all(self, skills: list[PreparedSkill]) -> BulkResult:
        """Upload all skills with concurrent streams."""

        # Phase 1: Send metadata batch (single request, all 100k manifests)
        metadata = [s.manifest for s in skills]
        validation = await self.session.post(
            f"{REGISTRY_URL}/api/v1/bulk/validate",
            json={"skills": metadata, "token": self.token},
        )
        validation_result = await validation.json()

        # Server pre-validates all names, versions, manifests in one shot
        # Returns: which skills are OK to upload, which have issues
        approved = validation_result["approved"]    # name + version pairs
        rejected = validation_result["rejected"]    # with reasons

        print(f"Pre-validation: {len(approved)} approved, {len(rejected)} rejected")

        # Phase 2: Upload approved skills in parallel
        results = []

        async def upload_one(skill):
            async with self.semaphore:
                try:
                    resp = await self.session.put(
                        f"{REGISTRY_URL}/api/v1/bulk/upload/{skill.name}/{skill.version}",
                        headers={
                            "Authorization": f"Bearer {self.token}",
                            "Content-Type": "application/octet-stream",
                        },
                        data=skill.skl_bytes,
                    )
                    return ("ok", skill.name, await resp.json())
                except Exception as e:
                    return ("error", skill.name, str(e))

        tasks = [upload_one(s) for s in skills if s.name in approved]

        # Process with progress bar
        for coro in asyncio.as_completed(tasks):
            result = await coro
            results.append(result)
            if len(results) % 100 == 0:
                print(f"  Uploaded {len(results)}/{len(tasks)}")

        return BulkResult(results, rejected)

# Performance at 20 concurrent streams:
#   1,000 skills × 20KB:    ~30 seconds
#   10,000 skills × 20KB:   ~5 minutes
#   100,000 skills × 20KB:  ~45 minutes
```

### 2.5 Server Side: Bulk Import Pipeline

```python
# Registry API: dedicated bulk import endpoints

@app.post("/api/v1/bulk/validate")
async def bulk_validate(request):
    """Pre-validate all skills in a batch before any uploads."""

    token = validate_bulk_token(request.headers["Authorization"])
    manifests = request.json["skills"]

    # Build name similarity index (once for the batch)
    existing_names = await db.fetch("SELECT name FROM skills")
    name_index = NameSimilarityIndex()
    name_index.build_from_db([r["name"] for r in existing_names])

    approved = []
    rejected = []

    for manifest in manifests:
        issues = []

        # Manifest validation
        if not manifest.get("name"):
            issues.append({"type": "missing_name"})
        if not manifest.get("version"):
            issues.append({"type": "missing_version"})
        if not manifest.get("description"):
            issues.append({"type": "missing_description"})

        # Name check (using pre-built index — fast)
        if manifest.get("name"):
            name_result = name_index.check_name(manifest["name"])
            if name_result.severity == "block":
                issues.append({
                    "type": "name_blocked",
                    "reason": name_result.reason
                })

        # Version check (does this version already exist?)
        if manifest.get("name") and manifest.get("version"):
            exists = await db.fetchrow(
                "SELECT 1 FROM skill_versions WHERE skill_name=$1 AND version=$2",
                manifest["name"], manifest["version"]
            )
            if exists:
                issues.append({"type": "version_exists"})

        if issues:
            rejected.append({"name": manifest.get("name"), "issues": issues})
        else:
            approved.append(manifest["name"])

    return Response(200, {
        "approved": approved,
        "rejected": rejected,
        "total": len(manifests),
        "approved_count": len(approved),
        "rejected_count": len(rejected)
    })


@app.put("/api/v1/bulk/upload/{name}/{version}")
async def bulk_upload_single(request, name, version):
    """Receive a single .skl file as part of a bulk import."""

    token = validate_bulk_token(request.headers["Authorization"])
    skl_bytes = await request.body()

    # Size check
    if len(skl_bytes) > MAX_SKILL_SIZE_MB * 1024 * 1024:
        return Response(413, {"error": "skill_too_large"})

    # Queue for async processing (don't block the upload)
    await queue.enqueue("bulk_process_skill", {
        "name": name,
        "version": version,
        "token_id": token.id,
        "storage_key": await store_temp(skl_bytes),
    })

    return Response(202, {"status": "queued"})


# Background worker processes queued skills
async def bulk_process_skill(job):
    """Process a single skill from the bulk import queue."""

    skl_bytes = await fetch_temp(job["storage_key"])
    temp_dir = extract_skl(skl_bytes)

    # Content scan
    scanner = ContentScanner()
    issues = scanner.scan_skill(temp_dir)
    blocks = [i for i in issues if i.severity == "block"]

    if blocks:
        await update_bulk_status(job, "blocked", issues=blocks)
        return

    # Store package
    checksum = hashlib.sha256(skl_bytes).hexdigest()
    await storage.put(f"packages/{job['name']}/{job['version']}.skl", skl_bytes)

    # Insert into database
    await db.execute("""
        INSERT INTO skills (name, description, author_id, category)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO NOTHING
    """, ...)

    await db.execute("""
        INSERT INTO skill_versions (skill_name, version, checksum, skl_path)
        VALUES ($1, $2, $3, $4)
    """, job["name"], job["version"], checksum, f"packages/{job['name']}/{job['version']}.skl")

    await update_bulk_status(job, "published")
```

---

## 3. Size and Amount Limits

```
┌──────────────────────────────────────────────────────────┐
│                  Limits                                    │
│                                                          │
│  PER SKILL:                                              │
│  ├── Max .skl file size:     50 MB                       │
│  │   (canvas-design is 2.6 MB, docx is 155 KB)          │
│  │   (50 MB covers even the most asset-heavy skills)     │
│  ├── Max SKILL.md size:       1 MB                       │
│  ├── Max manifest.json:       64 KB                      │
│  ├── Max files in package:    500 files                  │
│  └── Max description length:  1024 chars                 │
│                                                          │
│  PER BULK IMPORT SESSION:                                │
│  ├── Max skills:              50,000                     │
│  │   (run twice for 100k)                                │
│  ├── Max total upload size:   10 GB                      │
│  ├── Max concurrent uploads:  20 streams                 │
│  ├── Token validity:          72 hours                   │
│  └── Max failed skills:       20% (above this, halt)     │
│                                                          │
│  PER ORGANIZATION:                                       │
│  ├── Max skills published:    unlimited (Tier 2+)        │
│  ├── Max total storage:       100 GB                     │
│  │   (100k × 20KB = 2 GB — well within this)            │
│  └── Max import sessions/month: 10                       │
│                                                          │
│  GLOBAL:                                                 │
│  ├── Max active bulk imports:  5 concurrent              │
│  │   (server capacity management)                        │
│  └── Max new skills/day:      10,000                     │
│       (across all bulk imports, to prevent abuse)         │
└──────────────────────────────────────────────────────────┘
```

---

## 4. The Full 100k Flow

```
Step 1: Request bulk import token
  $ spm-onboard request-token --org @bigco --estimated-skills 100000
  → Requires SPM team approval (>50k threshold)
  → Approved within 1-2 business days
  → Token valid for 72 hours

Step 2: Local analysis (runs on the company's machine, not the server)
  $ spm-onboard analyze --from ./skills/ --org @bigco

  Scanning 100,000 skill directories...
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% (8 minutes)

  Results:
    ✓ 94,200 can be auto-migrated
    ⚠  4,800 need minor fixes (missing description, etc.)
    ❌  1,000 blocked (content security, invalid structure)

  Total upload size: 1.8 GB

  Report saved: ./bulk-analysis-report.json

Step 3: Fix what's fixable
  $ spm-onboard fix --report ./bulk-analysis-report.json --auto

  Auto-fixing 4,800 skills:
    - 2,100: generated description from first paragraph of SKILL.md
    - 1,400: converted underscore names to kebab-case
    -   800: added missing version (set to 1.0.0)
    -   500: removed invalid frontmatter keys

  ✓ 4,300 auto-fixed
  ⚠   500 need manual review (saved to ./manual-review.json)

Step 4: Bulk upload — batch 1 (first 50k)
  $ spm-onboard upload --from ./skills/ --org @bigco \
      --batch 1 --batch-size 50000 --token BULK-2026-0042

  Phase 1: Pre-validating 50,000 manifests...
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% (45 seconds)
    ✓ 49,200 approved
    ❌ 800 rejected (name conflicts, duplicate versions)

  Phase 2: Content scanning (parallel, 10 workers)...
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% (15 minutes)
    ✓ 48,900 passed
    ❌ 300 blocked (content security issues)

  Phase 3: Uploading (20 concurrent streams)...
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% (22 minutes)
    ✓ 48,900 uploaded and queued

  Phase 4: Server processing (async, background)...
    Processing... (check status with: spm import status BULK-2026-0042)

Step 5: Bulk upload — batch 2 (remaining 50k)
  $ spm-onboard upload --from ./skills/ --org @bigco \
      --batch 2 --batch-size 50000 --token BULK-2026-0042

  (Same flow)

Step 6: Monitor
  $ spm-onboard status BULK-2026-0042

  Bulk import BULK-2026-0042:
    Batch 1: 48,900 published, 1,100 failed
    Batch 2: 45,300 published, 200 processing, 500 failed

    Total published:  94,200 / 100,000
    Total failed:      1,600 (report: ./failed-skills.json)
    Total skipped:     4,200 (fixable issues)

    Estimated completion: 12 minutes

  Overall: 94% success rate
```

---

## 5. Timing Estimates

```
100,000 skills at ~20 KB average:

  Local analysis:              8 minutes
  Auto-fix:                    3 minutes
  Pre-validation (server):     2 minutes (batched)
  Content scanning (parallel): 30 minutes (10 workers)
  Upload (20 streams):         45 minutes
  Server processing (async):   60 minutes (background queue)
  ────────────────────────────────────────────
  Total wall-clock time:       ~2.5 hours

  Of which the user is actively waiting: ~1.5 hours
  (Server processing happens in background)

  Breakdown by operation cost:
  ┌─────────────────────────┬────────┬────────────┐
  │ Operation               │ Per    │ 100k total │
  │                         │ skill  │            │
  ├─────────────────────────┼────────┼────────────┤
  │ Manifest generation     │ 5ms    │ 8 min      │
  │ Content scanning        │ 200ms  │ 30 min*    │
  │ Name similarity check   │ 0.1ms  │ 10 sec**   │
  │ Upload (network)        │ 50ms   │ 45 min***  │
  │ DB insert               │ 2ms    │ 3 min      │
  │ Storage write            │ 10ms   │ 5 min***   │
  └─────────────────────────┴────────┴────────────┘
  *  With 10 parallel workers
  ** With pre-built n-gram index
  *** With 20 concurrent streams
```

---

## 6. Failure Handling

What happens when things go wrong mid-import?

```python
class BulkImportResumption:
    """
    Track progress so imports can be resumed after failure.
    State saved locally in ./spm-import-state.json
    """

    def __init__(self, import_id: str):
        self.state_file = f"./spm-import-state-{import_id}.json"
        self.state = self._load_or_create()

    def _load_or_create(self):
        if Path(self.state_file).exists():
            return json.loads(Path(self.state_file).read_text())
        return {
            "import_id": self.import_id,
            "total": 0,
            "published": [],     # Names successfully published
            "failed": [],        # Names that failed (with reasons)
            "remaining": [],     # Names not yet attempted
            "last_updated": None
        }

    def mark_published(self, name: str):
        self.state["published"].append(name)
        self.state["remaining"].remove(name)
        self._save()

    def mark_failed(self, name: str, reason: str):
        self.state["failed"].append({"name": name, "reason": reason})
        self.state["remaining"].remove(name)
        self._save()

    def get_remaining(self) -> list[str]:
        return self.state["remaining"]

    def _save(self):
        self.state["last_updated"] = datetime.utcnow().isoformat()
        Path(self.state_file).write_text(json.dumps(self.state, indent=2))
```

```bash
# Network error mid-import? Just resume:
$ spm-onboard upload --resume BULK-2026-0042

  Resuming bulk import...
  Already published: 62,400
  Remaining: 37,600

  Continuing upload...
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100%

  ✓ Import complete

# Halt if too many failures (safety valve)
$ spm-onboard upload --from ./skills/ --org @bigco ...

  Phase 3: Uploading...
  ━━━━━━━━━━━━━━━━━━━ 34%

  ⚠️ HALTED: Failure rate exceeded 20% threshold
     Published: 17,000
     Failed: 4,500 (21%)

  The import has been paused to prevent mass-publishing
  of broken skills. Review failures:
    spm import failures BULK-2026-0042

  Resume after fixing:
    spm-onboard upload --resume BULK-2026-0042
```

---

## 7. Server Capacity Planning for Bulk Imports

```
Scenario: 3 companies each importing 100k skills in the same week

  Total new skills: 300,000

  Storage: 300k × 20KB = 6 GB → Fine (R2 free tier: 10 GB)
  Database: 300k new rows → Fine (Neon handles millions)

  Content scanning: 300k × 200ms ÷ 10 workers = 100 minutes
    → Run as background queue. Scanner workers auto-scale.

  Bandwidth: 6 GB over a week → Trivial

  Name index: 300k names in memory → ~50 MB → Fine

  Constraint: max 5 concurrent bulk imports
    → Queue additional imports
    → Each import gets dedicated scanner workers

Infrastructure scaling trigger:
  If bulk import queue > 24 hours deep:
    → Spin up additional scanner workers
    → Increase DB connection pool
    → Alert SPM team
```
