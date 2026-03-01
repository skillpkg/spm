import { useState } from "react";

const MONO = "'IBM Plex Mono', 'JetBrains Mono', monospace";
const SANS = "'DM Sans', system-ui, sans-serif";

const C = {
  bg: "#080a0f", bgCard: "#0c0e14", bgHover: "#10131a",
  border: "#1a1d27", borderHover: "#334155",
  text: "#e2e8f0", textSec: "#94a3b8", textDim: "#64748b", textMuted: "#475569", textFaint: "#334155",
  accent: "#10b981", accentDim: "#059669", cyan: "#67e8f9", yellow: "#fbbf24", blue: "#3b82f6", red: "#ef4444", purple: "#a78bfa",
};

const TRUST = {
  official:   { label: "Official",   color: C.accent, checks: "✓✓✓" },
  verified:   { label: "Verified",   color: C.accent, checks: "✓✓" },
  scanned:    { label: "Scanned",    color: C.blue,   checks: "✓" },
  registered: { label: "Registered", color: C.textDim, checks: "○" },
};

// ── Mock author data ──
const AUTHOR = {
  username: "almog",
  github: "almog",
  email: "almog@example.com",
  trust: "verified",
  joined: "2025-11-01",
  totalDownloads: 24600,
  weeklyDownloads: 2840,
  avgRating: 4.7,
  totalReviews: 185,
};

const MY_SKILLS = [
  {
    name: "data-viz", version: "1.2.3", category: "data-viz",
    desc: "Charts, dashboards, and visualizations from CSV, JSON, or database output",
    downloads: 12400, weeklyDownloads: 1200, weeklyGrowth: "+31%",
    rating: 4.8, reviews: 142, trust: "verified",
    published: "2025-11-01", updated: "2026-02-15",
    status: "published",
  },
  {
    name: "csv-transform", version: "1.0.2", category: "data-viz",
    desc: "Clean, reshape, and merge CSV files with auto-detected schemas",
    downloads: 8200, weeklyDownloads: 940, weeklyGrowth: "+18%",
    rating: 4.6, reviews: 38, trust: "verified",
    published: "2025-12-10", updated: "2026-02-20",
    status: "published",
  },
  {
    name: "chart-export", version: "0.8.0", category: "data-viz",
    desc: "Export interactive charts to PNG, SVG, and PDF with custom themes",
    downloads: 4000, weeklyDownloads: 700, weeklyGrowth: "+45%",
    rating: 4.5, reviews: 5, trust: "scanned",
    published: "2026-01-20", updated: "2026-02-25",
    status: "published",
  },
];

// Weekly downloads over last 8 weeks (for sparkline)
const WEEKLY_TREND = [
  { week: "Jan 6", downloads: 1420 },
  { week: "Jan 13", downloads: 1580 },
  { week: "Jan 20", downloads: 1890 },
  { week: "Jan 27", downloads: 2100 },
  { week: "Feb 3", downloads: 2240 },
  { week: "Feb 10", downloads: 2510 },
  { week: "Feb 17", downloads: 2680 },
  { week: "Feb 24", downloads: 2840 },
];

const RECENT_ACTIVITY = [
  { type: "publish", skill: "chart-export", version: "0.8.0", date: "2026-02-25", detail: "Published new version" },
  { type: "review", skill: "data-viz", date: "2026-02-23", detail: "New 5★ review from @chen" },
  { type: "publish", skill: "csv-transform", version: "1.0.2", date: "2026-02-20", detail: "Bug fix: UTF-8 BOM handling" },
  { type: "milestone", skill: "data-viz", date: "2026-02-18", detail: "Reached 12,000 downloads" },
  { type: "review", skill: "csv-transform", date: "2026-02-15", detail: "New 4★ review from @sarah" },
  { type: "publish", skill: "data-viz", version: "1.2.3", date: "2026-02-15", detail: "Heatmap support, color palette improvements" },
];

const PUBLISH_HISTORY = [
  { skill: "chart-export", version: "0.8.0", date: "2026-02-25", status: "success", scanTime: "1.2s" },
  { skill: "csv-transform", version: "1.0.2", date: "2026-02-20", status: "success", scanTime: "0.9s" },
  { skill: "data-viz", version: "1.2.3", date: "2026-02-15", status: "success", scanTime: "1.1s" },
  { skill: "chart-export", version: "0.7.0", date: "2026-02-01", status: "blocked", scanTime: "0.8s", reason: "env_access pattern in export script" },
  { skill: "data-viz", version: "1.2.0", date: "2026-01-05", status: "success", scanTime: "1.0s" },
  { skill: "csv-transform", version: "1.0.0", date: "2025-12-10", status: "held", scanTime: "3.2s", reason: "ML confidence 0.72 — approved after review" },
];

const AGENT_BREAKDOWN = [
  { agent: "Claude Code", pct: 48, color: C.accent },
  { agent: "Cursor", pct: 28, color: C.blue },
  { agent: "Codex", pct: 12, color: C.purple },
  { agent: "Windsurf", pct: 7, color: C.yellow },
  { agent: "Other", pct: 5, color: C.textDim },
];

// ── Components ──

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      flex: 1, minWidth: 150,
      padding: "18px 20px",
      background: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
    }}>
      <div style={{ fontFamily: SANS, fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: color || C.text }}>{value}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 12, color: C.accent, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MiniChart({ data, width = 220, height = 48 }) {
  const max = Math.max(...data.map(d => d.downloads));
  const min = Math.min(...data.map(d => d.downloads));
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((d.downloads - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = points + ` ${pad + w},${pad + h} ${pad},${pad + h}`;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polygon points={areaPoints} fill={`${C.accent}15`} />
      <polyline points={points} fill="none" stroke={C.accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      {(() => {
        const lastX = pad + w;
        const lastY = pad + h - ((data[data.length - 1].downloads - min) / range) * h;
        return <circle cx={lastX} cy={lastY} r="3" fill={C.accent} />;
      })()}
    </svg>
  );
}

function BarSegment({ pct, color, label }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: `${pct}%`, height: 28, background: color,
        position: "relative", cursor: "default",
        borderRadius: pct === 100 ? 6 : 0,
        transition: "opacity 0.15s",
        opacity: h ? 0.85 : 1,
      }}
    >
      {h && (
        <div style={{
          position: "absolute", bottom: 34, left: "50%", transform: "translateX(-50%)",
          background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6,
          padding: "4px 10px", whiteSpace: "nowrap", zIndex: 10,
          fontFamily: MONO, fontSize: 11, color: C.text,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}>
          {label} {pct}%
        </div>
      )}
    </div>
  );
}

function SkillRow({ skill }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 100px 100px 90px 80px",
        alignItems: "center",
        padding: "14px 18px",
        borderBottom: `1px solid ${C.border}44`,
        background: h ? C.bgHover : "transparent",
        cursor: "pointer",
        transition: "background 0.12s",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontFamily: MONO, fontSize: 14, color: C.cyan, fontWeight: 600 }}>{skill.name}</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>{skill.version}</span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 12, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {skill.desc}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: MONO, fontSize: 13, color: C.text }}>{(skill.downloads / 1000).toFixed(1)}k</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.accent }}>{skill.weeklyGrowth}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: MONO, fontSize: 13, color: C.yellow }}>★ {skill.rating}</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted }}>{skill.reviews} reviews</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: TRUST[skill.trust].color }}>
          {TRUST[skill.trust].checks} {TRUST[skill.trust].label}
        </span>
      </div>
      <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 11, color: C.textMuted }}>
        {skill.updated}
      </div>
    </div>
  );
}

function ActivityItem({ item }) {
  const icons = { publish: "📦", review: "⭐", milestone: "🎯" };
  const colors = { publish: C.accent, review: C.yellow, milestone: C.purple };
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "10px 0",
      borderBottom: `1px solid ${C.border}33`,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icons[item.type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SANS, fontSize: 13, color: C.textSec }}>
          {item.detail}
          {item.version && <span style={{ fontFamily: MONO, fontSize: 12, color: C.textDim, marginLeft: 6 }}>v{item.version}</span>}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, marginTop: 2 }}>
          <span style={{ color: C.cyan }}>{item.skill}</span> · {item.date}
        </div>
      </div>
    </div>
  );
}

function PublishRow({ item }) {
  const statusConfig = {
    success: { label: "Published", color: C.accent, bg: `${C.accent}15` },
    blocked: { label: "Blocked", color: C.red, bg: `${C.red}15` },
    held:    { label: "Held → Approved", color: C.yellow, bg: `${C.yellow}15` },
  };
  const s = statusConfig[item.status];
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "140px 60px 1fr 100px 70px",
      alignItems: "center",
      padding: "10px 16px",
      borderBottom: `1px solid ${C.border}44`,
      gap: 12,
    }}>
      <div>
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.cyan }}>{item.skill}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint, marginLeft: 6 }}>{item.version}</span>
      </div>
      <span style={{
        fontFamily: MONO, fontSize: 11,
        padding: "2px 8px", borderRadius: 4,
        background: s.bg, color: s.color,
        textAlign: "center",
      }}>{s.label}</span>
      <div style={{ fontFamily: SANS, fontSize: 12, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {item.reason || "All checks passed"}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, textAlign: "right" }}>{item.date}</div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: C.textDim, textAlign: "right" }}>{item.scanTime}</div>
    </div>
  );
}

function TrustProgress({ currentTier }) {
  const tiers = [
    { id: "registered", label: "Registered", desc: "Published at least 1 skill", done: true },
    { id: "scanned", label: "Scanned", desc: "All skills passed security scan", done: true },
    { id: "verified", label: "Verified", desc: "GitHub linked + 6 months active", done: currentTier === "verified" || currentTier === "official" },
    { id: "official", label: "Official", desc: "SPM core team or Anthropic", done: currentTier === "official" },
  ];

  const currentIdx = tiers.findIndex(t => t.id === currentTier);

  return (
    <div style={{
      padding: "20px 22px",
      background: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
    }}>
      <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 16 }}>
        Trust progression
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {tiers.map((tier, i) => (
          <div key={tier.id} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            {/* Vertical line + dot */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
              <div style={{
                width: 14, height: 14, borderRadius: "50%",
                background: tier.done ? TRUST[tier.id].color : C.bgCard,
                border: `2px solid ${tier.done ? TRUST[tier.id].color : C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, color: C.bg, fontWeight: 700,
                flexShrink: 0,
              }}>
                {tier.done && "✓"}
              </div>
              {i < tiers.length - 1 && (
                <div style={{
                  width: 2, height: 32,
                  background: tiers[i + 1].done ? TRUST[tiers[i + 1].id].color : C.border,
                }} />
              )}
            </div>
            {/* Label */}
            <div style={{ paddingBottom: i < tiers.length - 1 ? 18 : 0 }}>
              <div style={{
                fontFamily: MONO, fontSize: 13,
                color: tier.id === currentTier ? TRUST[tier.id].color : tier.done ? C.textSec : C.textMuted,
                fontWeight: tier.id === currentTier ? 600 : 400,
              }}>
                {TRUST[tier.id].checks} {tier.label}
                {tier.id === currentTier && <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.7 }}>← you</span>}
              </div>
              <div style={{ fontFamily: SANS, fontSize: 12, color: C.textMuted, marginTop: 2 }}>{tier.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tabs ──
function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          fontFamily: SANS, fontSize: 13, fontWeight: 500,
          padding: "9px 18px",
          border: "none",
          borderBottom: active === tab.id ? `2px solid ${C.accent}` : "2px solid transparent",
          background: "transparent",
          color: active === tab.id ? C.text : C.textDim,
          cursor: "pointer", marginBottom: -1,
        }}>{tab.label}</button>
      ))}
    </div>
  );
}

// ── Main ──
export default function AuthorDashboard() {
  const [tab, setTab] = useState("overview");

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        button:hover { opacity: 0.88; }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "11px 32px",
        borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,10,15,0.92)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{
              width: 26, height: 26, borderRadius: 5,
              background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.bg,
            }}>S</div>
            <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.accent }}>spm</span>
          </a>
          <div style={{ display: "flex", gap: 18 }}>
            {["Registry", "Docs", "Dashboard"].map(item => (
              <a key={item} href="#" style={{
                fontFamily: SANS, fontSize: 13, textDecoration: "none",
                color: item === "Dashboard" ? C.text : C.textDim,
                fontWeight: item === "Dashboard" ? 500 : 400,
              }}>{item}</a>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 13, color: C.textSec }}>@{AUTHOR.username}</span>
          <div style={{
            width: 30, height: 30, borderRadius: 6,
            background: C.bgHover, border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: MONO, fontSize: 13, color: C.textDim,
          }}>A</div>
        </div>
      </nav>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 32px 60px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: C.bgHover, border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: MONO, fontSize: 20, color: C.textDim,
              }}>A</div>
              <div>
                <h1 style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>@{AUTHOR.username}</h1>
                <div style={{ fontFamily: MONO, fontSize: 12, color: TRUST[AUTHOR.trust].color }}>
                  {TRUST[AUTHOR.trust].checks} {TRUST[AUTHOR.trust].label} Author
                </div>
              </div>
            </div>
          </div>
          <a href="#" style={{
            fontFamily: MONO, fontSize: 13, color: C.accent,
            padding: "8px 18px", borderRadius: 8,
            border: `1px solid ${C.accent}44`,
            textDecoration: "none",
          }}>+ Publish new skill</a>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <StatCard label="Total downloads" value={(AUTHOR.totalDownloads / 1000).toFixed(1) + "k"} sub={`↑ ${(AUTHOR.weeklyDownloads).toLocaleString()} this week`} />
          <StatCard label="Skills published" value={MY_SKILLS.length} />
          <StatCard label="Avg rating" value={`★ ${AUTHOR.avgRating}`} sub={`${AUTHOR.totalReviews} reviews`} color={C.yellow} />
          <div style={{
            flex: 1, minWidth: 150,
            padding: "18px 20px",
            background: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
          }}>
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Weekly trend</div>
            <MiniChart data={WEEKLY_TREND} />
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "skills", label: `Skills (${MY_SKILLS.length})` },
            { id: "publishes", label: "Publish history" },
            { id: "analytics", label: "Analytics" },
          ]}
          active={tab}
          onChange={setTab}
        />

        {/* ══ Overview tab ══ */}
        {tab === "overview" && (
          <div style={{ display: "flex", gap: 20 }}>
            {/* Main column */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Skills */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h2 style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: C.textSec, margin: 0 }}>Your skills</h2>
                  <span onClick={() => setTab("skills")} style={{ fontFamily: MONO, fontSize: 12, color: C.accent, cursor: "pointer" }}>View all →</span>
                </div>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                  {/* Header */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 100px 90px 80px",
                    padding: "8px 18px",
                    borderBottom: `1px solid ${C.border}`,
                    fontFamily: SANS, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5,
                  }}>
                    <span>Skill</span>
                    <span style={{ textAlign: "right" }}>Downloads</span>
                    <span style={{ textAlign: "right" }}>Rating</span>
                    <span style={{ textAlign: "right" }}>Trust</span>
                    <span style={{ textAlign: "right" }}>Updated</span>
                  </div>
                  {MY_SKILLS.map(s => <SkillRow key={s.name} skill={s} />)}
                </div>
              </div>

              {/* Recent activity */}
              <div>
                <h2 style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: C.textSec, margin: "0 0 10px" }}>Recent activity</h2>
                <div style={{
                  padding: "6px 18px",
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                }}>
                  {RECENT_ACTIVITY.map((item, i) => <ActivityItem key={i} item={item} />)}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside style={{ width: 240, flexShrink: 0 }}>
              <TrustProgress currentTier={AUTHOR.trust} />

              {/* Agent breakdown */}
              <div style={{
                padding: "18px 20px",
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                marginTop: 14,
              }}>
                <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>
                  Installs by agent
                </div>
                {/* Stacked bar */}
                <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
                  {AGENT_BREAKDOWN.map(a => (
                    <BarSegment key={a.agent} pct={a.pct} color={a.color} label={a.agent} />
                  ))}
                </div>
                {/* Legend */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {AGENT_BREAKDOWN.map(a => (
                    <div key={a.agent} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color }} />
                        <span style={{ fontFamily: SANS, fontSize: 12, color: C.textSec }}>{a.agent}</span>
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: C.textDim }}>{a.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div style={{
                padding: "16px 20px",
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                marginTop: 14,
              }}>
                <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 10 }}>
                  Quick links
                </div>
                {[
                  { label: "Public profile", url: "#" },
                  { label: "Account settings", url: "#" },
                  { label: "API tokens", url: "#" },
                  { label: "Publish guide", url: "#" },
                ].map(link => (
                  <a key={link.label} href={link.url} style={{
                    display: "block", fontFamily: SANS, fontSize: 13,
                    color: C.blue, textDecoration: "none", padding: "4px 0",
                  }}>{link.label}</a>
                ))}
              </div>
            </aside>
          </div>
        )}

        {/* ══ Skills tab ══ */}
        {tab === "skills" && (
          <div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 100px 90px 80px",
                padding: "8px 18px",
                borderBottom: `1px solid ${C.border}`,
                fontFamily: SANS, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5,
              }}>
                <span>Skill</span>
                <span style={{ textAlign: "right" }}>Downloads</span>
                <span style={{ textAlign: "right" }}>Rating</span>
                <span style={{ textAlign: "right" }}>Trust</span>
                <span style={{ textAlign: "right" }}>Updated</span>
              </div>
              {MY_SKILLS.map(s => <SkillRow key={s.name} skill={s} />)}
            </div>
          </div>
        )}

        {/* ══ Publish history tab ══ */}
        {tab === "publishes" && (
          <div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "140px 60px 1fr 100px 70px",
                padding: "8px 16px",
                borderBottom: `1px solid ${C.border}`,
                fontFamily: SANS, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5,
                gap: 12,
              }}>
                <span>Skill</span>
                <span>Status</span>
                <span>Detail</span>
                <span style={{ textAlign: "right" }}>Date</span>
                <span style={{ textAlign: "right" }}>Scan</span>
              </div>
              {PUBLISH_HISTORY.map((item, i) => <PublishRow key={i} item={item} />)}
            </div>
            <div style={{ marginTop: 16, padding: "14px 18px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10 }}>
              <div style={{ fontFamily: SANS, fontSize: 13, color: C.textSec }}>
                <span style={{ fontFamily: MONO, color: C.accent }}>{PUBLISH_HISTORY.filter(p => p.status === "success").length}</span> successful
                {" · "}
                <span style={{ fontFamily: MONO, color: C.red }}>{PUBLISH_HISTORY.filter(p => p.status === "blocked").length}</span> blocked
                {" · "}
                <span style={{ fontFamily: MONO, color: C.yellow }}>{PUBLISH_HISTORY.filter(p => p.status === "held").length}</span> held for review
                {" · "}
                <span style={{ fontFamily: MONO, color: C.textDim }}>{PUBLISH_HISTORY.length}</span> total attempts
              </div>
            </div>
          </div>
        )}

        {/* ══ Analytics tab ══ */}
        {tab === "analytics" && (
          <div>
            {/* Weekly downloads chart */}
            <div style={{
              padding: "20px 24px",
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              marginBottom: 20,
            }}>
              <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 16 }}>
                Weekly downloads
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                {WEEKLY_TREND.map((w, i) => {
                  const max = Math.max(...WEEKLY_TREND.map(d => d.downloads));
                  const h = (w.downloads / max) * 100;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted }}>{(w.downloads / 1000).toFixed(1)}k</span>
                      <div style={{
                        width: "100%", maxWidth: 48, height: h,
                        background: i === WEEKLY_TREND.length - 1
                          ? `linear-gradient(180deg, ${C.accent} 0%, ${C.accentDim} 100%)`
                          : `${C.accent}30`,
                        borderRadius: "4px 4px 0 0",
                        transition: "height 0.3s",
                      }} />
                      <span style={{ fontFamily: MONO, fontSize: 9, color: C.textMuted }}>{w.week.split(" ")[1]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-skill breakdown */}
            <div style={{
              padding: "20px 24px",
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              marginBottom: 20,
            }}>
              <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 16 }}>
                Downloads by skill
              </div>
              {MY_SKILLS.map(skill => {
                const pct = Math.round((skill.downloads / AUTHOR.totalDownloads) * 100);
                return (
                  <div key={skill.name} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: MONO, fontSize: 13, color: C.cyan }}>{skill.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: C.textSec }}>{(skill.downloads / 1000).toFixed(1)}k ({pct}%)</span>
                    </div>
                    <div style={{ width: "100%", height: 6, background: `${C.accent}15`, borderRadius: 3 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: C.accent, borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Agent breakdown (bigger version) */}
            <div style={{
              padding: "20px 24px",
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
            }}>
              <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 16 }}>
                Installs by agent platform
              </div>
              {AGENT_BREAKDOWN.map(a => (
                <div key={a.agent} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: SANS, fontSize: 13, color: C.textSec }}>{a.agent}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: C.textDim }}>{a.pct}%</span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: `${a.color}20`, borderRadius: 3 }}>
                    <div style={{ width: `${a.pct}%`, height: "100%", background: a.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
