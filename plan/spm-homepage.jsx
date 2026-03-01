import { useState, useEffect, useRef } from "react";

const MONO = "'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace";
const SANS = "'DM Sans', 'Satoshi', system-ui, sans-serif";

// ── Terminal typing animation ──
function useTypewriter(lines, speed = 40, lineDelay = 600) {
  const [displayed, setDisplayed] = useState([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (currentLine >= lines.length) { setDone(true); return; }
    const line = lines[currentLine];
    if (currentChar >= line.text.length) {
      const timeout = setTimeout(() => {
        setDisplayed(prev => [...prev, line]);
        setCurrentLine(prev => prev + 1);
        setCurrentChar(0);
      }, line.pause || lineDelay);
      return () => clearTimeout(timeout);
    }
    const isCommand = line.type === "cmd";
    const timeout = setTimeout(() => {
      setCurrentChar(prev => prev + 1);
    }, isCommand ? speed : 5);
    return () => clearTimeout(timeout);
  }, [currentLine, currentChar, lines, speed, lineDelay]);

  return { displayed, currentLine, currentChar, done, lines };
}

// ── Terminal component ──
function Terminal({ title = "spm" }) {
  const termLines = [
    { type: "cmd", text: "spm install data-viz", pause: 400 },
    { type: "out", text: "", pause: 100 },
    { type: "out", text: "  ✓ data-viz@1.2.3", pause: 200 },
    { type: "out", text: "    Trust: ✓✓ Verified · ✓ Signed · ✓ Scanned", pause: 200 },
    { type: "out", text: "    Linked to: Claude Code, Cursor, Codex", pause: 200 },
    { type: "out", text: "    Added to skills.json", pause: 600 },
    { type: "out", text: "", pause: 100 },
    { type: "cmd", text: 'spm search "pdf processing"', pause: 400 },
    { type: "out", text: "", pause: 100 },
    { type: "out", text: "  📦 pdf@2.0.3                    ⬇ 45,100  ★ 4.9", pause: 150 },
    { type: "out", text: "     Read, create, merge, split PDF documents", pause: 150 },
    { type: "out", text: "     by @anthropic · ✓✓✓ Official", pause: 150 },
    { type: "out", text: "", pause: 100 },
    { type: "out", text: "  📦 pdf-forms@1.1.0              ⬇ 8,200   ★ 4.6", pause: 150 },
    { type: "out", text: "     Fill, validate, and extract PDF form data", pause: 150 },
    { type: "out", text: "     by @sarah · ✓✓ Verified", pause: 500 },
  ];

  const { displayed, currentLine, currentChar, done, lines } = useTypewriter(termLines);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayed, currentChar]);

  const renderLine = (line, idx) => {
    if (line.type === "cmd") {
      return (
        <div key={idx} style={{ color: "#e2e8f0", marginTop: idx > 0 ? 4 : 0 }}>
          <span style={{ color: "#10b981" }}>❯ </span>
          <span>{line.text}</span>
        </div>
      );
    }
    // Color the output
    let text = line.text;
    let color = "#94a3b8";
    if (text.includes("✓✓✓")) color = "#10b981";
    else if (text.includes("✓✓")) color = "#10b981";
    else if (text.includes("✓")) color = "#10b981";
    if (text.includes("📦")) color = "#e2e8f0";
    if (text.includes("⬇") || text.includes("★")) {
      const parts = text.split(/(⬇[\s\d,]+|★[\s\d.]+)/);
      return (
        <div key={idx} style={{ color: "#e2e8f0" }}>
          {parts.map((p, i) =>
            p.startsWith("⬇") ? <span key={i} style={{ color: "#94a3b8" }}>{p}</span> :
            p.startsWith("★") ? <span key={i} style={{ color: "#fbbf24" }}>{p}</span> :
            <span key={i} style={{ color: p.includes("📦") ? "#67e8f9" : "#e2e8f0" }}>{p}</span>
          )}
        </div>
      );
    }
    return <div key={idx} style={{ color }}>{text}</div>;
  };

  const currentLineObj = currentLine < lines.length ? lines[currentLine] : null;

  return (
    <div style={{
      background: "#0c0e14",
      borderRadius: 12,
      border: "1px solid #1e293b",
      overflow: "hidden",
      width: "100%",
      maxWidth: 640,
      boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
    }}>
      {/* Title bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 16px",
        background: "#111318",
        borderBottom: "1px solid #1e293b",
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 12, color: "#64748b", marginLeft: 8 }}>{title}</span>
      </div>
      {/* Content */}
      <div style={{
        padding: "16px 20px",
        fontFamily: MONO,
        fontSize: 13,
        lineHeight: 1.7,
        minHeight: 280,
        maxHeight: 340,
        overflowY: "auto",
      }}>
        {displayed.map(renderLine)}
        {currentLineObj && (
          <div style={{ color: currentLineObj.type === "cmd" ? "#e2e8f0" : "#94a3b8", marginTop: currentLineObj.type === "cmd" && displayed.length > 0 ? 4 : 0 }}>
            {currentLineObj.type === "cmd" && <span style={{ color: "#10b981" }}>❯ </span>}
            <span>{currentLineObj.text.slice(0, currentChar)}</span>
            <span style={{
              display: "inline-block",
              width: 8, height: 16,
              background: "#10b981",
              marginLeft: 1,
              animation: "blink 1s step-end infinite",
              verticalAlign: "text-bottom",
            }} />
          </div>
        )}
        {done && (
          <div style={{ marginTop: 8, color: "#e2e8f0" }}>
            <span style={{ color: "#10b981" }}>❯ </span>
            <span style={{
              display: "inline-block",
              width: 8, height: 16,
              background: "#10b981",
              animation: "blink 1s step-end infinite",
              verticalAlign: "text-bottom",
            }} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── Trust badge component ──
function TrustBadge({ tier, size = "md" }) {
  const config = {
    official:   { label: "Official",   color: "#10b981", checks: "✓✓✓", bg: "rgba(16,185,129,0.1)" },
    verified:   { label: "Verified",   color: "#10b981", checks: "✓✓",  bg: "rgba(16,185,129,0.08)" },
    scanned:    { label: "Scanned",    color: "#3b82f6", checks: "✓",   bg: "rgba(59,130,246,0.08)" },
    registered: { label: "Registered", color: "#94a3b8", checks: "○",   bg: "rgba(148,163,184,0.08)" },
  }[tier];
  const s = size === "sm" ? { fontSize: 11, padding: "2px 8px" } : { fontSize: 13, padding: "4px 12px" };
  return (
    <span style={{
      fontFamily: MONO,
      fontSize: s.fontSize,
      padding: s.padding,
      borderRadius: 6,
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.color}22`,
      whiteSpace: "nowrap",
    }}>
      {config.checks} {config.label}
    </span>
  );
}

// ── Skill card ──
function SkillCard({ name, description, author, trust, downloads, rating, platforms }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#111318" : "#0c0e14",
        border: `1px solid ${hovered ? "#334155" : "#1e293b"}`,
        borderRadius: 10,
        padding: "20px 24px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 8px 30px rgba(0,0,0,0.3)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 16, color: "#67e8f9", fontWeight: 600 }}>{name}</span>
        <TrustBadge tier={trust} size="sm" />
      </div>
      <p style={{ fontFamily: SANS, fontSize: 14, color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.5 }}>{description}</p>
      <div style={{ display: "flex", gap: 16, fontFamily: MONO, fontSize: 12, color: "#64748b" }}>
        <span>by @{author}</span>
        <span>⬇ {downloads}</span>
        <span style={{ color: "#fbbf24" }}>★ {rating}</span>
      </div>
    </div>
  );
}

// ── Feature block ──
function Feature({ icon, title, desc }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontFamily: SANS, fontSize: 18, fontWeight: 600, color: "#e2e8f0", margin: "0 0 8px" }}>{title}</h3>
      <p style={{ fontFamily: SANS, fontSize: 14, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

// ── How it works step ──
function Step({ number, title, code, desc }) {
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <div style={{
        fontFamily: MONO, fontSize: 14, fontWeight: 700,
        color: "#10b981", background: "rgba(16,185,129,0.1)",
        width: 36, height: 36, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, border: "1px solid rgba(16,185,129,0.2)",
      }}>{number}</div>
      <div>
        <h4 style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: "#e2e8f0", margin: "0 0 6px" }}>{title}</h4>
        {code && (
          <code style={{
            fontFamily: MONO, fontSize: 13,
            background: "#111318", color: "#67e8f9",
            padding: "4px 10px", borderRadius: 6,
            border: "1px solid #1e293b",
            display: "inline-block", marginBottom: 6,
          }}>{code}</code>
        )}
        <p style={{ fontFamily: SANS, fontSize: 14, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  );
}

// ── Stat counter ──
function Stat({ value, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: "#e2e8f0" }}>{value}</div>
      <div style={{ fontFamily: SANS, fontSize: 14, color: "#64748b", marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── Main homepage ──
export default function SPMHomepage() {
  const [installCopied, setInstallCopied] = useState(false);

  const copyInstall = () => {
    navigator.clipboard?.writeText("npm install -g spm");
    setInstallCopied(true);
    setTimeout(() => setInstallCopied(false), 2000);
  };

  return (
    <div style={{
      background: "#080a0f",
      color: "#e2e8f0",
      minHeight: "100vh",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 40px",
        borderBottom: "1px solid #1e293b11",
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,10,15,0.85)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: "#10b981" }}>spm</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: "#64748b", padding: "2px 8px", background: "#111318", borderRadius: 4 }}>beta</span>
        </div>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {["Docs", "Registry", "CLI", "Blog"].map(item => (
            <a key={item} href="#" style={{ fontFamily: SANS, fontSize: 14, color: "#94a3b8", textDecoration: "none" }}>{item}</a>
          ))}
          <a href="#" style={{
            fontFamily: MONO, fontSize: 13, color: "#10b981",
            padding: "6px 16px", borderRadius: 6,
            border: "1px solid rgba(16,185,129,0.3)",
            textDecoration: "none",
          }}>GitHub</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: "100px 40px 80px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
      }}>
        {/* Subtle glow behind terminal */}
        <div style={{
          position: "absolute",
          width: 500, height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
          top: "10%", left: "50%", transform: "translateX(-50%)",
          animation: "glow 6s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        <div style={{ textAlign: "center", maxWidth: 700, marginBottom: 48, position: "relative" }}>
          <h1 style={{
            fontFamily: SANS, fontSize: 52, fontWeight: 700,
            margin: "0 0 20px",
            lineHeight: 1.15,
            background: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Skills for every<br />AI agent
          </h1>
          <p style={{
            fontFamily: SANS, fontSize: 18, color: "#94a3b8",
            margin: "0 0 32px", lineHeight: 1.6,
          }}>
            The package manager for Agent Skills. Find, install, and share reusable skills
            across Claude Code, Cursor, Codex, and 30+ more agent platforms.
          </p>

          {/* Install command */}
          <div
            onClick={copyInstall}
            style={{
              display: "inline-flex", alignItems: "center", gap: 12,
              fontFamily: MONO, fontSize: 15,
              padding: "12px 24px",
              background: "#111318",
              border: "1px solid #1e293b",
              borderRadius: 8,
              cursor: "pointer",
              transition: "border-color 0.2s",
              userSelect: "none",
            }}
          >
            <span style={{ color: "#64748b" }}>$</span>
            <span style={{ color: "#e2e8f0" }}>npm install -g spm</span>
            <span style={{
              color: installCopied ? "#10b981" : "#64748b",
              fontSize: 12, marginLeft: 8,
              transition: "color 0.2s",
            }}>
              {installCopied ? "✓ copied" : "copy"}
            </span>
          </div>
        </div>

        {/* Terminal animation */}
        <div style={{ animation: "fadeUp 0.8s ease-out", position: "relative" }}>
          <Terminal />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{
        display: "flex", justifyContent: "center", gap: 80,
        padding: "40px",
        borderTop: "1px solid #1e293b",
        borderBottom: "1px solid #1e293b",
        background: "#0a0c11",
      }}>
        <Stat value="200+" label="Skills" />
        <Stat value="37+" label="Agent Platforms" />
        <Stat value="3-Layer" label="Security Scan" />
        <Stat value="100%" label="Open Source" />
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: "80px 40px", maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{
          fontFamily: SANS, fontSize: 32, fontWeight: 700,
          color: "#e2e8f0", margin: "0 0 48px", textAlign: "center",
        }}>How it works</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          <Step
            number="1"
            title="Install a skill"
            code="spm install data-viz"
            desc="SPM resolves the version, verifies the signature, scans for security issues, and links it to all your agents in one command."
          />
          <Step
            number="2"
            title="Your agent learns it"
            desc="The skill's SKILL.md is loaded into your agent's context. Next time you ask for a chart, it knows exactly how to build one — with the right libraries, patterns, and best practices."
          />
          <Step
            number="3"
            title="Share with your team"
            code="git add skills.json skills-lock.json"
            desc="Skills are tracked in skills.json, just like package.json. Your teammates run spm install and get the exact same skill versions."
          />
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{
        padding: "80px 40px",
        borderTop: "1px solid #1e293b",
        background: "#0a0c11",
      }}>
        <h2 style={{
          fontFamily: SANS, fontSize: 32, fontWeight: 700,
          color: "#e2e8f0", margin: "0 0 48px", textAlign: "center",
        }}>Built for trust</h2>

        <div style={{
          display: "flex", gap: 40, maxWidth: 900, margin: "0 auto",
          flexWrap: "wrap", justifyContent: "center",
        }}>
          <Feature
            icon="🛡"
            title="3-Layer Security"
            desc="Every published skill passes pattern matching, ML classification, and prompt injection detection before reaching the registry."
          />
          <Feature
            icon="🔒"
            title="Sigstore Signing"
            desc="Skills are cryptographically signed. You can verify exactly who published what, backed by an immutable transparency log."
          />
          <Feature
            icon={<span style={{ display: "inline-flex", gap: 4 }}><TrustBadge tier="verified" size="sm" /></span>}
            title="Trust Tiers"
            desc="Every author earns trust over time. Official, Verified, Scanned, or Registered — you always know what you're installing."
          />
        </div>
      </section>

      {/* ── Trending skills ── */}
      <section style={{ padding: "80px 40px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 32 }}>
          <h2 style={{ fontFamily: SANS, fontSize: 32, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
            Trending skills
          </h2>
          <a href="#" style={{ fontFamily: MONO, fontSize: 13, color: "#10b981", textDecoration: "none" }}>
            Browse all →
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <SkillCard
            name="data-viz"
            description="Create charts, dashboards, and visualizations from CSV, JSON, or DB output"
            author="almog"
            trust="verified"
            downloads="12.4k"
            rating="4.8"
          />
          <SkillCard
            name="pdf"
            description="Read, create, merge, split, and fill PDF documents"
            author="anthropic"
            trust="official"
            downloads="45.1k"
            rating="4.9"
          />
          <SkillCard
            name="frontend-design"
            description="Create distinctive, production-grade frontend interfaces"
            author="anthropic"
            trust="official"
            downloads="38.2k"
            rating="4.8"
          />
          <SkillCard
            name="db-migrate"
            description="Generate and run database migrations from schema diffs"
            author="sarah"
            trust="verified"
            downloads="9.7k"
            rating="4.6"
          />
        </div>
      </section>

      {/* ── Agent compatibility ── */}
      <section style={{
        padding: "80px 40px",
        borderTop: "1px solid #1e293b",
        background: "#0a0c11",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: SANS, fontSize: 32, fontWeight: 700,
          color: "#e2e8f0", margin: "0 0 16px",
        }}>One skill, every agent</h2>
        <p style={{
          fontFamily: SANS, fontSize: 16, color: "#94a3b8",
          margin: "0 0 40px", maxWidth: 500, marginLeft: "auto", marginRight: "auto",
        }}>
          Install once, use everywhere. SPM auto-detects and links to all your agent platforms.
        </p>

        <div style={{
          display: "flex", flexWrap: "wrap", gap: 12,
          justifyContent: "center", maxWidth: 700, margin: "0 auto",
        }}>
          {[
            "Claude Code", "Cursor", "Codex", "Copilot", "Gemini CLI",
            "Windsurf", "Goose", "Amp", "Kiro", "OpenCode", "Roo Code",
          ].map(agent => (
            <span key={agent} style={{
              fontFamily: MONO, fontSize: 13,
              padding: "8px 16px",
              background: "#111318",
              border: "1px solid #1e293b",
              borderRadius: 6,
              color: "#94a3b8",
            }}>{agent}</span>
          ))}
          <span style={{
            fontFamily: MONO, fontSize: 13,
            padding: "8px 16px",
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 6,
            color: "#10b981",
          }}>+26 more</span>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding: "80px 40px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: SANS, fontSize: 36, fontWeight: 700,
          color: "#e2e8f0", margin: "0 0 16px",
        }}>Start building with skills</h2>
        <p style={{
          fontFamily: SANS, fontSize: 16, color: "#94a3b8",
          margin: "0 0 32px",
        }}>
          Install in 30 seconds. Publish your first skill in 5 minutes.
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <a href="#" style={{
            fontFamily: MONO, fontSize: 14,
            padding: "12px 28px", borderRadius: 8,
            background: "#10b981", color: "#080a0f",
            textDecoration: "none", fontWeight: 600,
            border: "none",
          }}>Get started</a>
          <a href="#" style={{
            fontFamily: MONO, fontSize: 14,
            padding: "12px 28px", borderRadius: 8,
            background: "transparent", color: "#94a3b8",
            textDecoration: "none",
            border: "1px solid #334155",
          }}>Read the docs</a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: "40px",
        borderTop: "1px solid #1e293b",
        display: "flex", justifyContent: "space-between",
        alignItems: "center",
        maxWidth: 900, margin: "0 auto",
      }}>
        <span style={{ fontFamily: MONO, fontSize: 14, color: "#64748b" }}>
          <span style={{ color: "#10b981" }}>spm</span> · Skills Package Manager
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          {["GitHub", "Docs", "Status", "Discord"].map(item => (
            <a key={item} href="#" style={{ fontFamily: SANS, fontSize: 13, color: "#64748b", textDecoration: "none" }}>{item}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
