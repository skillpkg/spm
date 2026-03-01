import { useState, useEffect, useRef } from "react";

const MONO = "'IBM Plex Mono', 'JetBrains Mono', monospace";
const SANS = "'DM Sans', system-ui, sans-serif";

// ── Color tokens ──
const C = {
  bg: "#080a0f", bgCard: "#0c0e14", bgHover: "#10131a", bgInput: "#0c0e14",
  border: "#1a1d27", borderHover: "#334155", borderFocus: "#10b981",
  text: "#e2e8f0", textSec: "#94a3b8", textDim: "#64748b", textMuted: "#475569", textFaint: "#334155",
  accent: "#10b981", accentDim: "#059669", cyan: "#67e8f9", yellow: "#fbbf24", blue: "#3b82f6", red: "#ef4444",
};

const TRUST = {
  official:   { label: "Official",   color: C.accent, checks: "✓✓✓", bg: "rgba(16,185,129,0.08)" },
  verified:   { label: "Verified",   color: C.accent, checks: "✓✓",  bg: "rgba(16,185,129,0.06)" },
  scanned:    { label: "Scanned",    color: C.blue,   checks: "✓",   bg: "rgba(59,130,246,0.06)" },
  registered: { label: "Registered", color: C.textDim, checks: "○",  bg: "rgba(148,163,184,0.05)" },
};

// ── Mock skill data ──
const SKILLS_DB = [
  { name: "pdf", version: "2.0.3", desc: "Read, create, merge, split, and fill PDF documents", longDesc: "A comprehensive PDF skill that handles the full lifecycle of PDF documents. Supports reading and extracting text from existing PDFs, creating new documents with rich formatting, merging multiple files, splitting pages, rotating, adding watermarks, filling form fields, and basic OCR for scanned documents.\n\nBuilt on top of proven libraries (pdf-lib, pdfjs-dist) with optimized workflows for common agent tasks. Includes templates for reports, invoices, and letters.", author: "anthropic", trust: "official", downloads: "45,100", weeklyDownloads: "3,200", rating: "4.9", reviews: 342, license: "MIT", published: "2026-01-10", updated: "2026-02-20", size: "34 KB", platforms: ["all"], category: "documents", tags: ["documents", "forms", "ocr", "merge", "split"], versions: [{ v: "2.0.3", date: "2026-02-20", changes: "Fixed OCR encoding for CJK characters" }, { v: "2.0.2", date: "2026-02-01", changes: "Added watermark opacity control" }, { v: "2.0.0", date: "2026-01-10", changes: "Major rewrite: new template system, form filling" }, { v: "1.5.1", date: "2025-11-28", changes: "Bug fixes for merge with bookmarks" }], dependencies: { skills: [], system: ["python >=3.10"], pip: ["pdf-lib", "pdfjs-dist"] }, security: { signed: true, signer: "anthropic@github", scanned: "passed", layers: ["pattern: clean", "ml: 0.01 (safe)", "lakera: passed"] }, repo: "https://github.com/anthropic/spm-pdf" },
  { name: "frontend-design", version: "1.4.1", desc: "Create distinctive, production-grade frontend interfaces with high design quality", longDesc: "Guides creation of distinctive, production-grade frontend interfaces that avoid generic aesthetics. Covers typography, color systems, motion design, spatial composition, and visual details.\n\nSupports HTML/CSS, React, Vue, and Svelte output. Includes comprehensive guidelines for making bold design choices while maintaining production quality.", author: "anthropic", trust: "official", downloads: "38,200", weeklyDownloads: "2,800", rating: "4.8", reviews: 289, license: "MIT", published: "2025-10-15", updated: "2026-02-18", size: "28 KB", platforms: ["all"], category: "frontend", tags: ["react", "html", "css", "ui", "design"], versions: [{ v: "1.4.1", date: "2026-02-18", changes: "Added Tailwind v4 patterns" }, { v: "1.4.0", date: "2026-01-20", changes: "Svelte support, dark mode guidelines" }, { v: "1.3.0", date: "2025-12-05", changes: "Vue component patterns" }], dependencies: { skills: [], system: [], pip: [] }, security: { signed: true, signer: "anthropic@github", scanned: "passed", layers: ["pattern: clean", "ml: 0.02 (safe)", "lakera: passed"] }, repo: "https://github.com/anthropic/spm-frontend-design" },
  { name: "data-viz", version: "1.2.3", desc: "Charts, dashboards, and visualizations from CSV, JSON, or database output", longDesc: "Create beautiful data visualizations from any data source. Supports bar charts, line charts, scatter plots, heatmaps, geographic maps, dashboards, and custom compositions.\n\nAuto-detects data structure and suggests appropriate visualization types. Outputs publication-ready charts using Plotly, D3, or matplotlib depending on context.", author: "almog", trust: "verified", downloads: "12,400", weeklyDownloads: "1,200", rating: "4.8", reviews: 142, license: "MIT", published: "2025-11-01", updated: "2026-02-15", size: "22 KB", platforms: ["all"], category: "data-viz", tags: ["charts", "plotly", "d3", "dashboards", "matplotlib"], versions: [{ v: "1.2.3", date: "2026-02-15", changes: "Heatmap support, color palette improvements" }, { v: "1.2.0", date: "2026-01-05", changes: "Geographic map visualizations" }, { v: "1.1.0", date: "2025-12-10", changes: "Dashboard layout system" }], dependencies: { skills: [], system: ["python >=3.10"], pip: ["plotly", "pandas", "seaborn"] }, security: { signed: true, signer: "almog@github", scanned: "passed", layers: ["pattern: clean", "ml: 0.03 (safe)", "lakera: passed"] }, repo: "https://github.com/almog/data-viz" },
  { name: "xlsx", version: "3.1.0", desc: "Read, write, and transform Excel spreadsheets", longDesc: "Full Excel support: read complex workbooks, write formatted spreadsheets, transform data between sheets, handle formulas, charts, and pivot tables.", author: "anthropic", trust: "official", downloads: "31,500", weeklyDownloads: "2,100", rating: "4.7", reviews: 231, license: "MIT", published: "2025-09-20", updated: "2026-02-10", size: "31 KB", platforms: ["all"], category: "documents", tags: ["excel", "spreadsheet", "csv", "data"], versions: [{ v: "3.1.0", date: "2026-02-10", changes: "Pivot table support" }], dependencies: { skills: [], system: [], pip: ["openpyxl"] }, security: { signed: true, signer: "anthropic@github", scanned: "passed", layers: ["pattern: clean", "ml: 0.01 (safe)"] }, repo: "https://github.com/anthropic/spm-xlsx" },
  { name: "db-migrate", version: "2.0.1", desc: "Generate and run database migrations from schema diffs", longDesc: "Analyzes your current database schema against a target, generates migration scripts, and applies them safely with rollback support. Supports PostgreSQL, MySQL, and SQLite.", author: "sarah", trust: "verified", downloads: "9,700", weeklyDownloads: "890", rating: "4.6", reviews: 87, license: "Apache-2.0", published: "2025-12-01", updated: "2026-02-22", size: "18 KB", platforms: ["all"], category: "backend", tags: ["database", "migration", "postgresql", "mysql"], versions: [{ v: "2.0.1", date: "2026-02-22", changes: "SQLite support" }], dependencies: { skills: [], system: ["python >=3.10"], pip: ["alembic", "sqlalchemy"] }, security: { signed: true, signer: "sarah@github", scanned: "passed", layers: ["pattern: clean", "ml: 0.05 (safe)"] }, repo: "https://github.com/sarah-dev/db-migrate" },
  { name: "test-gen", version: "0.9.2", desc: "Auto-generate unit and integration tests from source code", longDesc: "Analyzes source code structure and generates comprehensive test suites. Supports Python (pytest), TypeScript (vitest/jest), and Go testing frameworks.", author: "chen", trust: "scanned", downloads: "4,800", weeklyDownloads: "620", rating: "4.3", reviews: 45, license: "MIT", published: "2026-01-15", updated: "2026-02-25", size: "15 KB", platforms: ["claude-code", "cursor"], category: "testing", tags: ["testing", "pytest", "vitest", "jest", "automation"], versions: [{ v: "0.9.2", date: "2026-02-25", changes: "Go test generation" }], dependencies: { skills: [], system: [], pip: [] }, security: { signed: false, scanned: "passed", layers: ["pattern: clean", "ml: 0.08 (safe)"] }, repo: "https://github.com/chen-ml/test-gen" },
  { name: "api-scaffold", version: "1.1.0", desc: "Generate REST and GraphQL APIs from schema definitions", longDesc: "Define your data models and get a fully scaffolded API with routes, validation, auth middleware, and OpenAPI docs. Supports Express, Fastify, and Hono.", author: "mike", trust: "verified", downloads: "7,200", weeklyDownloads: "540", rating: "4.5", reviews: 63, license: "MIT", published: "2025-12-20", updated: "2026-02-12", size: "20 KB", platforms: ["all"], category: "backend", tags: ["api", "rest", "graphql", "express", "openapi"], versions: [{ v: "1.1.0", date: "2026-02-12", changes: "Hono framework support" }], dependencies: { skills: [], system: ["node >=18"], pip: [] }, security: { signed: true, signer: "mike@github", scanned: "passed", layers: ["pattern: clean", "ml: 0.04 (safe)"] }, repo: "https://github.com/mike-builds/api-scaffold" },
  { name: "docker-deploy", version: "1.3.0", desc: "Build Dockerfiles and compose stacks from project analysis", longDesc: "Analyzes project structure, detects frameworks and dependencies, generates optimized multi-stage Dockerfiles and docker-compose configurations.", author: "ops-team", trust: "verified", downloads: "6,100", weeklyDownloads: "480", rating: "4.4", reviews: 52, license: "MIT", published: "2025-11-15", updated: "2026-02-08", size: "16 KB", platforms: ["all"], category: "infra", tags: ["docker", "containers", "deploy", "devops"], versions: [{ v: "1.3.0", date: "2026-02-08", changes: "Multi-stage build optimization" }], dependencies: { skills: [], system: [], pip: [] }, security: { signed: true, signer: "ops-team@github", scanned: "passed", layers: ["pattern: clean", "ml: 0.03 (safe)"] }, repo: "https://github.com/ops-team/docker-deploy" },
];

const CATEGORIES = ["All", "Documents", "Data & Visualization", "Frontend", "Backend", "Infrastructure", "Testing", "Code Quality", "Security", "Productivity"];

const CATEGORY_SLUGS = {
  "Documents": "documents",
  "Data & Visualization": "data-viz",
  "Frontend": "frontend",
  "Backend": "backend",
  "Infrastructure": "infra",
  "Testing": "testing",
  "Code Quality": "code-quality",
  "Security": "security",
  "Productivity": "productivity",
};
const TRUST_TIERS = ["All", "Official", "Verified", "Scanned", "Registered"];
const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "downloads", label: "Most downloads" },
  { id: "rating", label: "Highest rated" },
  { id: "updated", label: "Recently updated" },
  { id: "new", label: "Newest" },
];

// ── Shared components ──

function TrustBadge({ tier, size = "sm" }) {
  const t = TRUST[tier];
  const s = size === "lg" ? { fs: 13, px: 12, py: 5 } : { fs: 11, px: 8, py: 3 };
  return (
    <span style={{
      fontFamily: MONO, fontSize: s.fs,
      padding: `${s.py}px ${s.px}px`,
      borderRadius: 5,
      background: t.bg,
      color: t.color,
      border: `1px solid ${t.color}18`,
      whiteSpace: "nowrap",
    }}>
      {t.checks} {t.label}
    </span>
  );
}

function Tag({ children, onClick }) {
  const [h, setH] = useState(false);
  return (
    <span
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      onClick={onClick}
      style={{
        fontFamily: MONO, fontSize: 11,
        padding: "3px 8px", borderRadius: 4,
        background: h ? C.bgHover : "#111318",
        color: h ? C.textSec : C.textDim,
        border: `1px solid ${C.border}`,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.12s",
      }}
    >{children}</span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <span
      onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{
        fontFamily: MONO, fontSize: 11,
        color: copied ? C.accent : C.textDim,
        cursor: "pointer", padding: "2px 6px",
        transition: "color 0.15s", userSelect: "none",
      }}
    >{copied ? "✓ copied" : "copy"}</span>
  );
}

function Nav({ query, setQuery, onHome }) {
  const inputRef = useRef(null);
  return (
    <nav style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "10px 32px",
      borderBottom: `1px solid ${C.border}`,
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(8,10,15,0.92)",
      backdropFilter: "blur(12px)",
    }}>
      <a onClick={onHome} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", cursor: "pointer", flexShrink: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 5,
          background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.bg,
        }}>S</div>
        <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.accent }}>spm</span>
      </a>

      <div style={{
        flex: 1, maxWidth: 440,
        display: "flex", alignItems: "center",
        background: C.bgInput, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: "0 12px",
      }}>
        <span style={{ color: C.textMuted, fontSize: 13, marginRight: 8 }}>⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search skills..."
          style={{
            flex: 1, fontFamily: SANS, fontSize: 13,
            padding: "8px 0", background: "transparent",
            border: "none", color: C.text, outline: "none",
          }}
        />
        {query && <span onClick={() => setQuery("")} style={{ color: C.textMuted, cursor: "pointer", fontSize: 12, padding: 4 }}>✕</span>}
      </div>

      <div style={{ display: "flex", gap: 16, marginLeft: "auto", alignItems: "center" }}>
        {["Docs", "CLI", "Publish"].map(item => (
          <a key={item} href="#" style={{ fontFamily: SANS, fontSize: 13, color: C.textDim, textDecoration: "none" }}>{item}</a>
        ))}
        <a href="#" style={{
          fontFamily: SANS, fontSize: 13, color: C.bg,
          padding: "5px 14px", borderRadius: 6,
          background: C.accent, textDecoration: "none", fontWeight: 600,
        }}>Sign in</a>
      </div>
    </nav>
  );
}

// ══════════════════════════════════════════
//  SEARCH RESULTS PAGE
// ══════════════════════════════════════════

function SearchResults({ query, results, onSelect, onQueryChange }) {
  const [category, setCategory] = useState("All");
  const [trustFilter, setTrustFilter] = useState("All");
  const [sort, setSort] = useState("relevance");

  const filtered = results
    .filter(s => category === "All" || s.category === CATEGORY_SLUGS[category])
    .filter(s => trustFilter === "All" || s.trust === trustFilter.toLowerCase());

  return (
    <div style={{ display: "flex", maxWidth: 1060, margin: "0 auto", padding: "24px 32px", gap: 28 }}>
      {/* ── Sidebar filters ── */}
      <aside style={{ width: 200, flexShrink: 0 }}>
        <div style={{ position: "sticky", top: 70 }}>
          {/* Category filter */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.textDim, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>Category</h3>
            {CATEGORIES.map(cat => (
              <div
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  fontFamily: SANS, fontSize: 13,
                  padding: "6px 10px", borderRadius: 6,
                  color: category === cat ? C.text : C.textDim,
                  background: category === cat ? `${C.accent}12` : "transparent",
                  cursor: "pointer",
                  transition: "all 0.12s",
                  marginBottom: 1,
                }}
              >{cat}</div>
            ))}
          </div>

          {/* Trust filter */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.textDim, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>Trust tier</h3>
            {TRUST_TIERS.map(tier => (
              <div
                key={tier}
                onClick={() => setTrustFilter(tier)}
                style={{
                  fontFamily: SANS, fontSize: 13,
                  padding: "6px 10px", borderRadius: 6,
                  color: trustFilter === tier ? C.text : C.textDim,
                  background: trustFilter === tier ? `${C.accent}12` : "transparent",
                  cursor: "pointer",
                  transition: "all 0.12s",
                  marginBottom: 1,
                }}
              >{tier}</div>
            ))}
          </div>

          {/* Platform filter */}
          <div>
            <h3 style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.textDim, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>Platform</h3>
            {["All platforms", "Claude Code", "Cursor", "Codex"].map(p => (
              <div key={p} style={{
                fontFamily: SANS, fontSize: 13,
                padding: "6px 10px", borderRadius: 6,
                color: p === "All platforms" ? C.text : C.textDim,
                background: p === "All platforms" ? `${C.accent}12` : "transparent",
                cursor: "pointer", marginBottom: 1,
              }}>{p}</div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Results ── */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 16,
        }}>
          <div>
            <span style={{ fontFamily: SANS, fontSize: 14, color: C.textSec }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
            {query && <span style={{ fontFamily: SANS, fontSize: 14, color: C.textDim }}> for "{query}"</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: SANS, fontSize: 12, color: C.textMuted }}>Sort:</span>
            <select
              value={sort} onChange={e => setSort(e.target.value)}
              style={{
                fontFamily: SANS, fontSize: 12,
                background: C.bgCard, color: C.textSec,
                border: `1px solid ${C.border}`, borderRadius: 6,
                padding: "5px 8px", outline: "none", cursor: "pointer",
              }}
            >
              {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Active filters */}
        {(category !== "All" || trustFilter !== "All") && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {category !== "All" && (
              <span onClick={() => setCategory("All")} style={{
                fontFamily: SANS, fontSize: 12,
                padding: "4px 10px", borderRadius: 20,
                background: `${C.accent}15`, color: C.accent,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}>{category} <span style={{ fontSize: 10 }}>✕</span></span>
            )}
            {trustFilter !== "All" && (
              <span onClick={() => setTrustFilter("All")} style={{
                fontFamily: SANS, fontSize: 12,
                padding: "4px 10px", borderRadius: 20,
                background: `${C.accent}15`, color: C.accent,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}>{trustFilter} <span style={{ fontSize: 10 }}>✕</span></span>
            )}
          </div>
        )}

        {/* Skill list */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          {filtered.length > 0 ? filtered.map(skill => (
            <SearchResultRow key={skill.name} skill={skill} onClick={() => onSelect(skill.name)} />
          )) : (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontFamily: SANS, fontSize: 15, color: C.textDim, marginBottom: 8 }}>No skills match these filters</div>
              <div style={{ fontFamily: SANS, fontSize: 13, color: C.textMuted }}>
                Try broadening your search or <a href="#" style={{ color: C.accent, textDecoration: "none" }}>publish your own</a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SearchResultRow({ skill, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        padding: "16px 20px",
        borderBottom: `1px solid ${C.border}44`,
        background: h ? C.bgHover : "transparent",
        cursor: "pointer",
        transition: "background 0.12s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 15, color: C.cyan, fontWeight: 600 }}>{skill.name}</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>{skill.version}</span>
          <TrustBadge tier={skill.trust} />
        </div>
        <div style={{ display: "flex", gap: 16, fontFamily: MONO, fontSize: 12, color: C.textMuted }}>
          <span>⬇ {skill.downloads}</span>
          <span style={{ color: C.yellow }}>★ {skill.rating}</span>
        </div>
      </div>
      <p style={{ fontFamily: SANS, fontSize: 13, color: C.textDim, margin: "0 0 8px", lineHeight: 1.5 }}>{skill.desc}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: SANS, fontSize: 12, color: C.textMuted }}>by @{skill.author}</span>
        <div style={{ display: "flex", gap: 4 }}>
          {skill.tags?.slice(0, 4).map(t => <Tag key={t}>{t}</Tag>)}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  SKILL DETAIL PAGE
// ══════════════════════════════════════════

function SkillDetail({ skill, onBack, onSelectSkill }) {
  const [activeTab, setActiveTab] = useState("readme");

  if (!skill) return null;

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 32px 60px" }}>
      {/* Breadcrumb */}
      <div style={{ padding: "16px 0", fontFamily: SANS, fontSize: 13 }}>
        <span onClick={onBack} style={{ color: C.textDim, cursor: "pointer" }}>Registry</span>
        <span style={{ color: C.textFaint, margin: "0 8px" }}>/</span>
        <span style={{ color: C.textSec }}>{skill.name}</span>
      </div>

      {/* ── Hero ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "24px 28px",
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        marginBottom: 24,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: C.cyan, margin: 0 }}>{skill.name}</h1>
            <span style={{ fontFamily: MONO, fontSize: 15, color: C.textFaint }}>{skill.version}</span>
            <TrustBadge tier={skill.trust} size="lg" />
          </div>
          <p style={{ fontFamily: SANS, fontSize: 15, color: C.textSec, margin: "0 0 16px", lineHeight: 1.5, maxWidth: 520 }}>{skill.desc}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {skill.tags?.map(t => <Tag key={t}>{t}</Tag>)}
          </div>
        </div>

        {/* Install box */}
        <div style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "16px 20px",
          minWidth: 280,
        }}>
          <div style={{ fontFamily: SANS, fontSize: 12, color: C.textDim, marginBottom: 8 }}>Install</div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontFamily: MONO, fontSize: 13,
            padding: "10px 12px",
            background: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            marginBottom: 12,
          }}>
            <span><span style={{ color: C.textMuted }}>$ </span><span style={{ color: C.text }}>spm install {skill.name}</span></span>
            <CopyButton text={`spm install ${skill.name}`} />
          </div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontFamily: MONO, fontSize: 13,
            padding: "10px 12px",
            background: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
          }}>
            <span><span style={{ color: C.textMuted }}>$ </span><span style={{ color: C.text }}>spm install -g {skill.name}</span></span>
            <CopyButton text={`spm install -g ${skill.name}`} />
          </div>
        </div>
      </div>

      {/* ── Content: tabs + sidebar ── */}
      <div style={{ display: "flex", gap: 24 }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
            {[
              { id: "readme", label: "README" },
              { id: "versions", label: `Versions (${skill.versions?.length || 0})` },
              { id: "security", label: "Security" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                fontFamily: SANS, fontSize: 13, fontWeight: 500,
                padding: "10px 18px",
                border: "none",
                borderBottom: activeTab === tab.id ? `2px solid ${C.accent}` : "2px solid transparent",
                background: "transparent",
                color: activeTab === tab.id ? C.text : C.textDim,
                cursor: "pointer", marginBottom: -1,
              }}>{tab.label}</button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "readme" && (
            <div style={{
              fontFamily: SANS, fontSize: 14, color: C.textSec, lineHeight: 1.75,
              padding: "4px 0",
            }}>
              {skill.longDesc?.split("\n\n").map((para, i) => (
                <p key={i} style={{ margin: "0 0 16px" }}>{para}</p>
              ))}
            </div>
          )}

          {activeTab === "versions" && (
            <div>
              {skill.versions?.map((v, i) => (
                <div key={v.v} style={{
                  display: "flex", gap: 16, alignItems: "flex-start",
                  padding: "14px 0",
                  borderBottom: i < skill.versions.length - 1 ? `1px solid ${C.border}44` : "none",
                }}>
                  <span style={{
                    fontFamily: MONO, fontSize: 14, fontWeight: 600,
                    color: i === 0 ? C.accent : C.textDim,
                    minWidth: 60,
                  }}>{v.v}</span>
                  <div>
                    <div style={{ fontFamily: SANS, fontSize: 13, color: C.textSec }}>{v.changes}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, marginTop: 4 }}>{v.date}</div>
                  </div>
                  {i === 0 && (
                    <span style={{
                      fontFamily: MONO, fontSize: 10, padding: "2px 8px",
                      borderRadius: 4, background: `${C.accent}15`, color: C.accent, marginLeft: "auto",
                    }}>latest</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "security" && (
            <div style={{ padding: "4px 0" }}>
              <div style={{
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                {/* Signature */}
                <div style={{
                  padding: "16px 20px",
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                }}>
                  <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>
                    {skill.security.signed ? "🔒" : "⚠"} Signature
                  </div>
                  {skill.security.signed ? (
                    <div style={{ fontFamily: MONO, fontSize: 13, color: C.accent }}>
                      ✓ Signed by {skill.security.signer} (Sigstore OIDC)
                    </div>
                  ) : (
                    <div style={{ fontFamily: MONO, fontSize: 13, color: C.yellow }}>
                      ⚠ Unsigned — author has not set up Sigstore signing
                    </div>
                  )}
                </div>

                {/* Scan results */}
                <div style={{
                  padding: "16px 20px",
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                }}>
                  <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>
                    🛡 Scan Results
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {skill.security.layers?.map((layer, i) => (
                      <div key={i} style={{ fontFamily: MONO, fontSize: 13, color: C.accent }}>
                        ✓ {layer}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar metadata ── */}
        <aside style={{ width: 220, flexShrink: 0 }}>
          <div style={{ position: "sticky", top: 70 }}>
            {/* Stats */}
            <div style={{
              padding: "16px 18px",
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              marginBottom: 14,
            }}>
              {[
                { label: "Downloads", value: skill.downloads },
                { label: "This week", value: skill.weeklyDownloads },
                { label: "Rating", value: `★ ${skill.rating} (${skill.reviews})`, color: C.yellow },
                { label: "License", value: skill.license },
                { label: "Size", value: skill.size },
              ].map(row => (
                <div key={row.label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: `1px solid ${C.border}33`,
                }}>
                  <span style={{ fontFamily: SANS, fontSize: 12, color: C.textMuted }}>{row.label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: row.color || C.textSec }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Author */}
            <div style={{
              padding: "14px 18px",
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              marginBottom: 14,
            }}>
              <div style={{ fontFamily: SANS, fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Author</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: C.bgHover, border: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: MONO, fontSize: 12, color: C.textDim,
                }}>{skill.author[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 13, color: C.text }}>@{skill.author}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: TRUST[skill.trust].color }}>{TRUST[skill.trust].checks} {TRUST[skill.trust].label}</div>
                </div>
              </div>
            </div>

            {/* Links */}
            <div style={{
              padding: "14px 18px",
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              marginBottom: 14,
            }}>
              <div style={{ fontFamily: SANS, fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Links</div>
              {[
                { label: "Repository", url: skill.repo },
                { label: "Report issue", url: "#" },
              ].map(link => (
                <a key={link.label} href={link.url} style={{
                  display: "block",
                  fontFamily: SANS, fontSize: 13, color: C.blue,
                  textDecoration: "none", padding: "4px 0",
                }}>{link.label}</a>
              ))}
            </div>

            {/* Dependencies */}
            {(skill.dependencies?.pip?.length > 0 || skill.dependencies?.system?.length > 0) && (
              <div style={{
                padding: "14px 18px",
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
              }}>
                <div style={{ fontFamily: SANS, fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Dependencies</div>
                {skill.dependencies.system?.map(d => (
                  <div key={d} style={{ fontFamily: MONO, fontSize: 12, color: C.textDim, padding: "2px 0" }}>{d}</div>
                ))}
                {skill.dependencies.pip?.map(d => (
                  <div key={d} style={{ fontFamily: MONO, fontSize: 12, color: C.textDim, padding: "2px 0" }}>pip: {d}</div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  APP SHELL
// ══════════════════════════════════════════

export default function SPMApp() {
  const [view, setView] = useState("search"); // "search" | "detail"
  const [query, setQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState(null);

  const searchResults = query.trim()
    ? SKILLS_DB.filter(s =>
        s.name.includes(query.toLowerCase()) ||
        s.desc.toLowerCase().includes(query.toLowerCase()) ||
        s.author.includes(query.toLowerCase()) ||
        s.tags?.some(t => t.includes(query.toLowerCase()))
      )
    : SKILLS_DB;

  const handleSelectSkill = (name) => {
    const skill = SKILLS_DB.find(s => s.name === name);
    if (skill) {
      setSelectedSkill(skill);
      setView("detail");
    }
  };

  const handleHome = () => {
    setView("search");
    setSelectedSkill(null);
  };

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: #475569; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        input:focus, select:focus { outline: none; }
        button:hover { opacity: 0.88; }
      `}</style>

      <Nav query={query} setQuery={(q) => { setQuery(q); setView("search"); }} onHome={handleHome} />

      {view === "search" && (
        <SearchResults
          query={query}
          results={searchResults}
          onSelect={handleSelectSkill}
          onQueryChange={setQuery}
        />
      )}

      {view === "detail" && (
        <SkillDetail
          skill={selectedSkill}
          onBack={handleHome}
          onSelectSkill={handleSelectSkill}
        />
      )}

      <footer style={{
        padding: "16px 32px",
        borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.bg,
          }}>S</div>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>Skills Package Manager</span>
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          {["Docs", "GitHub", "Status", "Discord"].map(item => (
            <a key={item} href="#" style={{ fontFamily: SANS, fontSize: 12, color: C.textMuted, textDecoration: "none" }}>{item}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
