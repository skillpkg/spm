import { useState, useEffect, useRef } from "react";

const MONO = "'IBM Plex Mono', 'JetBrains Mono', monospace";
const SANS = "'DM Sans', system-ui, sans-serif";

// ── Mock data ──
const CATEGORIES = [
  { name: "Documents", slug: "documents", icon: "📄", count: 34 },
  { name: "Data & Visualization", slug: "data-viz", icon: "📊", count: 28 },
  { name: "Frontend", slug: "frontend", icon: "🎨", count: 22 },
  { name: "Backend", slug: "backend", icon: "🔌", count: 18 },
  { name: "Infrastructure", slug: "infra", icon: "⚙️", count: 19 },
  { name: "Testing", slug: "testing", icon: "🧪", count: 16 },
  { name: "Code Quality", slug: "code-quality", icon: "✨", count: 10 },
  { name: "Security", slug: "security", icon: "🛡", count: 9 },
  { name: "Productivity", slug: "productivity", icon: "⚡", count: 11 },
];

const FEATURED = [
  {
    name: "pdf", version: "2.0.3",
    desc: "Read, create, merge, split, and fill PDF documents",
    author: "anthropic", trust: "official",
    downloads: "45.1k", weeklyGrowth: "+12%", rating: "4.9",
    tags: ["documents", "forms", "ocr"],
  },
  {
    name: "frontend-design", version: "1.4.1",
    desc: "Create distinctive, production-grade frontend interfaces with high design quality",
    author: "anthropic", trust: "official",
    downloads: "38.2k", weeklyGrowth: "+18%", rating: "4.8",
    tags: ["react", "html", "css", "ui"],
  },
  {
    name: "data-viz", version: "1.2.3",
    desc: "Charts, dashboards, and visualizations from CSV, JSON, or database output",
    author: "almog", trust: "verified",
    downloads: "12.4k", weeklyGrowth: "+31%", rating: "4.8",
    tags: ["charts", "plotly", "d3", "dashboards"],
  },
];

const RISING = [
  { name: "db-migrate", version: "2.0.1", desc: "Generate and run database migrations from schema diffs", author: "sarah", trust: "verified", downloads: "9.7k", weeklyGrowth: "+45%", rating: "4.6" },
  { name: "test-gen", version: "0.9.2", desc: "Auto-generate unit and integration tests from source code", author: "chen", trust: "scanned", downloads: "4.8k", weeklyGrowth: "+62%", rating: "4.3" },
  { name: "api-scaffold", version: "1.1.0", desc: "Generate REST and GraphQL APIs from schema definitions", author: "mike", trust: "verified", downloads: "7.2k", weeklyGrowth: "+28%", rating: "4.5" },
  { name: "docker-deploy", version: "1.3.0", desc: "Build Dockerfiles and compose stacks from project analysis", author: "ops-team", trust: "verified", downloads: "6.1k", weeklyGrowth: "+39%", rating: "4.4" },
  { name: "sql-query", version: "2.2.0", desc: "Generate and optimize SQL queries from natural language", author: "sarah", trust: "verified", downloads: "8.9k", weeklyGrowth: "+22%", rating: "4.7" },
];

const MOST_INSTALLED = [
  { name: "pdf", version: "2.0.3", author: "anthropic", trust: "official", downloads: "45.1k", rating: "4.9" },
  { name: "frontend-design", version: "1.4.1", author: "anthropic", trust: "official", downloads: "38.2k", rating: "4.8" },
  { name: "xlsx", version: "3.1.0", author: "anthropic", trust: "official", downloads: "31.5k", rating: "4.7" },
  { name: "docx", version: "1.8.0", author: "anthropic", trust: "official", downloads: "28.3k", rating: "4.7" },
  { name: "pptx", version: "1.5.0", author: "anthropic", trust: "official", downloads: "22.1k", rating: "4.6" },
];

const NEW_THIS_WEEK = [
  { name: "grpc-gen", version: "0.1.0", desc: "Generate gRPC service stubs from proto files", author: "proto-dev", trust: "scanned", downloads: "340", daysAgo: 2 },
  { name: "csv-clean", version: "1.0.0", desc: "Auto-detect and fix malformed CSV data", author: "data-dave", trust: "scanned", downloads: "520", daysAgo: 3 },
  { name: "svg-icon", version: "0.2.1", desc: "Generate custom SVG icons from descriptions", author: "icon-lab", trust: "registered", downloads: "180", daysAgo: 5 },
  { name: "env-vault", version: "1.0.0", desc: "Manage environment variables securely across projects", author: "sec-tools", trust: "verified", downloads: "890", daysAgo: 1 },
];

const SEARCH_SUGGESTIONS = [
  { query: "pdf processing", results: "12 skills" },
  { query: "data visualization", results: "8 skills" },
  { query: "database migration", results: "6 skills" },
  { query: "frontend components", results: "15 skills" },
  { query: "docker deploy", results: "4 skills" },
];

const ALL_SKILLS = [...FEATURED, ...RISING, ...NEW_THIS_WEEK];

// ── Trust config ──
const TRUST = {
  official:   { label: "Official",   color: "#10b981", checks: "✓✓✓" },
  verified:   { label: "Verified",   color: "#10b981", checks: "✓✓" },
  scanned:    { label: "Scanned",    color: "#3b82f6", checks: "✓" },
  registered: { label: "Registered", color: "#64748b", checks: "○" },
};

function TrustBadge({ tier, showLabel = true }) {
  const t = TRUST[tier];
  return (
    <span style={{
      fontFamily: MONO, fontSize: 11,
      color: t.color, whiteSpace: "nowrap",
    }}>
      {t.checks}{showLabel ? ` ${t.label}` : ""}
    </span>
  );
}

// ── Featured skill card (big, prominent) ──
function FeaturedCard({ skill, rank }) {
  const [hovered, setHovered] = useState(false);
  const accentColors = ["#10b981", "#3b82f6", "#a78bfa"];
  const accent = accentColors[rank % 3];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, minWidth: 240,
        background: hovered ? "#10131a" : "#0c0e14",
        border: `1px solid ${hovered ? accent + "44" : "#1a1d27"}`,
        borderRadius: 12,
        padding: "20px 22px 18px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? `0 8px 30px ${accent}11` : "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Rank accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: 3, height: "100%",
        background: accent,
        opacity: hovered ? 1 : 0.4,
        transition: "opacity 0.2s",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontFamily: MONO, fontSize: 16, color: "#67e8f9", fontWeight: 600 }}>{skill.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: "#334155" }}>{skill.version}</span>
          </div>
          <span style={{ fontFamily: SANS, fontSize: 12, color: "#475569" }}>by @{skill.author}</span>
        </div>
        <TrustBadge tier={skill.trust} />
      </div>

      <p style={{
        fontFamily: SANS, fontSize: 13, color: "#8896aa",
        margin: "0 0 14px", lineHeight: 1.5,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>{skill.desc}</p>

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
        {skill.tags?.map(tag => (
          <span key={tag} style={{
            fontFamily: MONO, fontSize: 10,
            padding: "2px 7px", borderRadius: 4,
            background: "#111318", color: "#64748b",
            border: "1px solid #1a1d27",
          }}>{tag}</span>
        ))}
      </div>

      <div style={{
        display: "flex", gap: 14,
        fontFamily: MONO, fontSize: 12,
        paddingTop: 12,
        borderTop: "1px solid #1a1d27",
      }}>
        <span style={{ color: "#64748b" }}>⬇ {skill.downloads}</span>
        <span style={{ color: "#10b981" }}>{skill.weeklyGrowth}</span>
        <span style={{ color: "#fbbf24" }}>★ {skill.rating}</span>
      </div>
    </div>
  );
}

// ── Compact skill row ──
function SkillRow({ skill, showGrowth = false, showDaysAgo = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center",
        padding: "11px 16px",
        borderBottom: "1px solid #1a1d2744",
        background: hovered ? "#10131a" : "transparent",
        cursor: "pointer",
        transition: "background 0.12s",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 150 }}>
        <span style={{ fontFamily: MONO, fontSize: 13, color: "#67e8f9", fontWeight: 500 }}>{skill.name}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: "#334155", marginLeft: 6 }}>{skill.version}</span>
      </div>
      <div style={{
        flex: 1, minWidth: 0,
        fontFamily: SANS, fontSize: 12, color: "#5a6578",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {skill.desc || ""}
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        fontFamily: MONO, fontSize: 11, color: "#475569",
        flexShrink: 0,
      }}>
        <TrustBadge tier={skill.trust} showLabel={false} />
        <span style={{ minWidth: 50, textAlign: "right" }}>⬇ {skill.downloads}</span>
        {showGrowth && skill.weeklyGrowth && (
          <span style={{ color: "#10b981", minWidth: 40, textAlign: "right" }}>{skill.weeklyGrowth}</span>
        )}
        {showDaysAgo && skill.daysAgo != null && (
          <span style={{ color: "#64748b", minWidth: 50, textAlign: "right" }}>
            {skill.daysAgo === 0 ? "today" : skill.daysAgo === 1 ? "1d ago" : `${skill.daysAgo}d ago`}
          </span>
        )}
        <span style={{ color: "#fbbf24", minWidth: 30 }}>★ {skill.rating || "—"}</span>
      </div>
    </div>
  );
}

function SkillList({ children }) {
  return (
    <div style={{ border: "1px solid #1a1d27", borderRadius: 10, overflow: "hidden" }}>
      {children}
    </div>
  );
}

function CategoryChip({ cat }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 14px",
        background: hovered ? "#10131a" : "#0c0e14",
        border: `1px solid ${hovered ? "#334155" : "#1a1d27"}`,
        borderRadius: 8,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: 14 }}>{cat.icon}</span>
      <span style={{ fontFamily: SANS, fontSize: 13, color: "#c8d0dc" }}>{cat.name}</span>
      <span style={{ fontFamily: MONO, fontSize: 11, color: "#475569" }}>{cat.count}</span>
    </div>
  );
}

// ── Tab selector ──
function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 18, borderBottom: "1px solid #1a1d27", paddingBottom: 0 }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            fontFamily: SANS, fontSize: 13, fontWeight: 500,
            padding: "8px 16px 10px",
            border: "none",
            borderBottom: active === tab.id ? "2px solid #10b981" : "2px solid transparent",
            background: "transparent",
            color: active === tab.id ? "#e2e8f0" : "#64748b",
            cursor: "pointer",
            transition: "all 0.15s",
            marginBottom: -1,
          }}
        >{tab.label}</button>
      ))}
    </div>
  );
}

// ── Main ──
export default function SPMRegistry() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [trendingTab, setTrendingTab] = useState("featured");
  const inputRef = useRef(null);

  const filtered = query.trim()
    ? ALL_SKILLS.filter(s =>
        s.name.includes(query.toLowerCase()) ||
        (s.desc || "").toLowerCase().includes(query.toLowerCase()) ||
        s.author.includes(query.toLowerCase())
      )
    : null;

  const showSuggestions = focused && !query.trim();

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
        e.preventDefault(); inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={{ background: "#080a0f", color: "#e2e8f0", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: #475569; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        input:focus { outline: none; }
        button:hover { opacity: 0.85; }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "11px 32px",
        borderBottom: "1px solid #1a1d27",
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,10,15,0.92)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            {/* Logo placeholder — replace with <img src="/logo.svg" height={24} /> */}
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "#080a0f",
            }}>S</div>
            <span style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: "#10b981" }}>spm</span>
          </a>
          <div style={{ display: "flex", gap: 18 }}>
            {["Registry", "Docs", "CLI", "Publish"].map(item => (
              <a key={item} href="#" style={{
                fontFamily: SANS, fontSize: 13, textDecoration: "none",
                color: item === "Registry" ? "#e2e8f0" : "#64748b",
                fontWeight: item === "Registry" ? 500 : 400,
              }}>{item}</a>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <code style={{ fontFamily: MONO, fontSize: 11, color: "#334155" }}>npm i -g spm</code>
          <a href="#" style={{
            fontFamily: SANS, fontSize: 13, color: "#080a0f",
            padding: "5px 14px", borderRadius: 6,
            background: "#10b981", textDecoration: "none", fontWeight: 600,
          }}>Sign in</a>
        </div>
      </nav>

      {/* ── Search ── */}
      <section style={{
        padding: "40px 32px 32px",
        display: "flex", flexDirection: "column", alignItems: "center",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", width: 500, height: 250, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.035) 0%, transparent 70%)",
          top: 0, left: "50%", transform: "translateX(-50%)", pointerEvents: "none",
        }} />

        <h1 style={{
          fontFamily: SANS, fontSize: 24, fontWeight: 600,
          color: "#e2e8f0", margin: "0 0 4px", position: "relative",
        }}>
          Find skills for your agents
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 13, color: "#475569", margin: "0 0 22px" }}>
          200+ skills · 8 categories · 37+ agent platforms
        </p>

        <div style={{ width: "100%", maxWidth: 600, position: "relative" }}>
          <div style={{
            display: "flex", alignItems: "center",
            background: "#0c0e14",
            border: `1.5px solid ${focused ? "#10b981" : "#1e293b"}`,
            borderRadius: 10, padding: "0 16px",
            transition: "border-color 0.2s",
            boxShadow: focused ? "0 0 0 3px rgba(16,185,129,0.07)" : "none",
          }}>
            <span style={{ color: "#475569", fontSize: 15, marginRight: 10 }}>⌕</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder="Search skills..."
              style={{
                flex: 1, fontFamily: SANS, fontSize: 15,
                padding: "13px 0", background: "transparent",
                border: "none", color: "#e2e8f0",
              }}
            />
            {!query && <kbd style={{ fontFamily: MONO, fontSize: 11, padding: "2px 6px", background: "#111318", border: "1px solid #1e293b", borderRadius: 4, color: "#475569" }}>/</kbd>}
            {query && <span onClick={() => { setQuery(""); inputRef.current?.focus(); }} style={{ color: "#475569", cursor: "pointer", fontSize: 14, padding: 4 }}>✕</span>}
          </div>

          {showSuggestions && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", width: "100%",
              background: "#0c0e14", border: "1px solid #1e293b", borderRadius: 10,
              overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.4)", zIndex: 50,
            }}>
              <div style={{ padding: "8px 14px", fontFamily: SANS, fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Popular searches
              </div>
              {SEARCH_SUGGESTIONS.map((s, i) => (
                <div key={i} onMouseDown={() => setQuery(s.query)}
                  style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#10131a"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontFamily: SANS, fontSize: 13, color: "#c8d0dc" }}>{s.query}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: "#475569" }}>{s.results}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Content ── */}
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "0 32px 60px" }}>
        {filtered ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 4px" }}>
              <span style={{ fontFamily: SANS, fontSize: 13, color: "#64748b" }}>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{query}"
              </span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: "#475569" }}>sorted by relevance</span>
            </div>
            <SkillList>
              {filtered.length > 0 ? (
                filtered.map(s => <SkillRow key={s.name} skill={s} />)
              ) : (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ fontFamily: SANS, fontSize: 15, color: "#64748b", marginBottom: 8 }}>No skills found for "{query}"</div>
                  <div style={{ fontFamily: SANS, fontSize: 13, color: "#475569" }}>
                    Try a different search, or <a href="#" style={{ color: "#10b981", textDecoration: "none" }}>publish your own</a>
                  </div>
                </div>
              )}
            </SkillList>
          </div>
        ) : (
          <div>
            {/* ── Trending section with tabs ── */}
            <div style={{ marginBottom: 40 }}>
              <Tabs
                tabs={[
                  { id: "featured", label: "🔥 Featured" },
                  { id: "rising", label: "📈 Rising" },
                  { id: "most-installed", label: "⬇ Most installed" },
                  { id: "new", label: "✨ New" },
                ]}
                active={trendingTab}
                onChange={setTrendingTab}
              />

              {trendingTab === "featured" && (
                <div>
                  <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
                    {FEATURED.map((s, i) => <FeaturedCard key={s.name} skill={s} rank={i} />)}
                  </div>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 10, padding: "0 2px",
                  }}>
                    <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: "#7a8599" }}>Also trending</span>
                    <a href="#" style={{ fontFamily: MONO, fontSize: 12, color: "#10b981", textDecoration: "none" }}>View all →</a>
                  </div>
                  <SkillList>
                    {RISING.slice(0, 3).map(s => <SkillRow key={s.name} skill={s} showGrowth />)}
                  </SkillList>
                </div>
              )}

              {trendingTab === "rising" && (
                <div>
                  <p style={{ fontFamily: SANS, fontSize: 12, color: "#475569", marginBottom: 12 }}>
                    Fastest growing installs this week
                  </p>
                  <SkillList>
                    {RISING.map(s => <SkillRow key={s.name} skill={s} showGrowth />)}
                  </SkillList>
                </div>
              )}

              {trendingTab === "most-installed" && (
                <div>
                  <p style={{ fontFamily: SANS, fontSize: 12, color: "#475569", marginBottom: 12 }}>
                    All-time most installed skills
                  </p>
                  <SkillList>
                    {MOST_INSTALLED.map((s, i) => (
                      <div key={s.name} style={{
                        display: "flex", alignItems: "center",
                        padding: "11px 16px",
                        borderBottom: "1px solid #1a1d2744",
                        cursor: "pointer", gap: 12,
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "#10131a"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{
                          fontFamily: MONO, fontSize: 14, fontWeight: 700,
                          color: i < 3 ? "#10b981" : "#334155",
                          minWidth: 24, textAlign: "right",
                        }}>#{i + 1}</span>
                        <span style={{ fontFamily: MONO, fontSize: 13, color: "#67e8f9", fontWeight: 500, minWidth: 140 }}>{s.name}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: "#334155" }}>{s.version}</span>
                        <div style={{ flex: 1 }} />
                        <TrustBadge tier={s.trust} showLabel={false} />
                        <span style={{ fontFamily: MONO, fontSize: 11, color: "#475569", minWidth: 54, textAlign: "right" }}>⬇ {s.downloads}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: "#fbbf24", minWidth: 30 }}>★ {s.rating}</span>
                      </div>
                    ))}
                  </SkillList>
                </div>
              )}

              {trendingTab === "new" && (
                <div>
                  <p style={{ fontFamily: SANS, fontSize: 12, color: "#475569", marginBottom: 12 }}>
                    Recently published skills
                  </p>
                  <SkillList>
                    {NEW_THIS_WEEK.map(s => <SkillRow key={s.name} skill={s} showDaysAgo />)}
                  </SkillList>
                </div>
              )}
            </div>

            {/* ── Categories ── */}
            <div>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 14,
              }}>
                <h2 style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "#94a3b8", margin: 0 }}>Browse by category</h2>
                <a href="#" style={{ fontFamily: MONO, fontSize: 12, color: "#10b981", textDecoration: "none" }}>All categories →</a>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map(cat => <CategoryChip key={cat.name} cat={cat} />)}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: "16px 32px",
        borderTop: "1px solid #1a1d27",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Logo placeholder — same as nav */}
          <div style={{
            width: 20, height: 20, borderRadius: 4,
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#080a0f",
          }}>S</div>
          <span style={{ fontFamily: MONO, fontSize: 13, color: "#10b981", fontWeight: 600 }}>spm</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "#262d3a" }}>Skills Package Manager</span>
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          {["Docs", "GitHub", "Status", "Discord"].map(item => (
            <a key={item} href="#" style={{ fontFamily: SANS, fontSize: 12, color: "#475569", textDecoration: "none" }}>{item}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
