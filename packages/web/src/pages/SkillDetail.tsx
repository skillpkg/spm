import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SKILLS_DB, TRUST_CONFIG } from '../data/mock';
import { TrustBadge } from '../components/TrustBadge';

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  return (
    <span
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="font-mono text-[11px] cursor-pointer p-[2px_6px] transition-colors select-none"
      style={{ color: copied ? '#10b981' : '#64748b' }}
    >
      {copied ? '\u2713 copied' : 'copy'}
    </span>
  );
};

export const SkillDetail = () => {
  const { name } = useParams<{ name: string }>();
  const [activeTab, setActiveTab] = useState<'readme' | 'versions' | 'security'>('readme');

  const skill = SKILLS_DB.find((s) => s.name === name);

  if (!skill) {
    return (
      <div className="max-w-[1060px] mx-auto px-8 py-16 text-center">
        <div className="font-sans text-xl text-text-dim mb-4">Skill not found</div>
        <Link to="/" className="text-accent no-underline font-sans text-sm">
          Back to registry
        </Link>
      </div>
    );
  }

  const trustInfo = TRUST_CONFIG[skill.trust];

  return (
    <div className="max-w-[1060px] mx-auto px-8 pb-[60px]">
      {/* Breadcrumb */}
      <div className="py-4 font-sans text-[13px]">
        <Link to="/" className="text-text-dim no-underline hover:text-text-secondary">
          Registry
        </Link>
        <span className="text-text-faint mx-2">/</span>
        <span className="text-text-secondary">{skill.name}</span>
      </div>

      {/* Hero */}
      <div className="flex justify-between items-start p-6 bg-bg-card border border-border-default rounded-xl mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-mono text-[26px] font-bold text-cyan m-0">{skill.name}</h1>
            <span className="font-mono text-[15px] text-text-faint">{skill.version}</span>
            <TrustBadge tier={skill.trust} size="lg" />
          </div>
          <p className="font-sans text-[15px] text-text-secondary mb-4 leading-relaxed max-w-[520px]">
            {skill.desc}
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {skill.tags?.map((t) => (
              <span
                key={t}
                className="font-mono text-[11px] px-2 py-[3px] rounded bg-[#111318] text-text-dim border border-border-default"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Install box */}
        <div className="bg-bg border border-border-default rounded-[10px] p-4 min-w-[280px] ml-6">
          <div className="font-sans text-xs text-text-dim mb-2">Install</div>
          <div className="flex items-center justify-between font-mono text-[13px] p-[10px_12px] bg-bg-card border border-border-default rounded-md mb-3">
            <span>
              <span className="text-text-muted">$ </span>
              <span className="text-text-primary">spm install {skill.name}</span>
            </span>
            <CopyButton text={`spm install ${skill.name}`} />
          </div>
          <div className="flex items-center justify-between font-mono text-[13px] p-[10px_12px] bg-bg-card border border-border-default rounded-md">
            <span>
              <span className="text-text-muted">$ </span>
              <span className="text-text-primary">spm install -g {skill.name}</span>
            </span>
            <CopyButton text={`spm install -g ${skill.name}`} />
          </div>
        </div>
      </div>

      {/* Content: tabs + sidebar */}
      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-border-default mb-5">
            {(
              [
                { id: 'readme' as const, label: 'README' },
                {
                  id: 'versions' as const,
                  label: `Versions (${skill.versions?.length || 0})`,
                },
                { id: 'security' as const, label: 'Security' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="font-sans text-[13px] font-medium px-[18px] py-2.5 border-none bg-transparent cursor-pointer"
                style={{
                  borderBottom:
                    activeTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
                  color: activeTab === tab.id ? '#e2e8f0' : '#64748b',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'readme' && (
            <div className="font-sans text-sm text-text-secondary leading-[1.75] py-1">
              {skill.longDesc?.split('\n\n').map((para, i) => (
                <p key={i} className="mb-4">
                  {para}
                </p>
              ))}
            </div>
          )}

          {activeTab === 'versions' && (
            <div>
              {skill.versions?.map((v, i) => (
                <div
                  key={v.v}
                  className="flex gap-4 items-start py-3.5"
                  style={{
                    borderBottom:
                      i < (skill.versions?.length ?? 0) - 1 ? '1px solid #1a1d2744' : 'none',
                  }}
                >
                  <span
                    className="font-mono text-sm font-semibold min-w-[60px]"
                    style={{
                      color: i === 0 ? '#10b981' : '#64748b',
                    }}
                  >
                    {v.v}
                  </span>
                  <div>
                    <div className="font-sans text-[13px] text-text-secondary">{v.changes}</div>
                    <div className="font-mono text-[11px] text-text-muted mt-1">{v.date}</div>
                  </div>
                  {i === 0 && (
                    <span className="font-mono text-[10px] px-2 py-[2px] rounded bg-[rgba(16,185,129,0.08)] text-accent ml-auto">
                      latest
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="py-1 flex flex-col gap-3">
              {/* Signature */}
              <div className="p-4 bg-bg-card border border-border-default rounded-[10px]">
                <div className="font-sans text-[13px] font-semibold text-text-primary mb-2.5">
                  {skill.security.signed ? '\uD83D\uDD12' : '\u26A0'} Signature
                </div>
                {skill.security.signed ? (
                  <div className="font-mono text-[13px] text-accent">
                    &#x2713; Signed by {skill.security.signer} (Sigstore OIDC)
                  </div>
                ) : (
                  <div className="font-mono text-[13px] text-yellow">
                    &#x26A0; Unsigned — author has not set up Sigstore signing
                  </div>
                )}
              </div>

              {/* Scan results */}
              <div className="p-4 bg-bg-card border border-border-default rounded-[10px]">
                <div className="font-sans text-[13px] font-semibold text-text-primary mb-2.5">
                  &#x1F6E1; Scan Results
                </div>
                <div className="flex flex-col gap-1.5">
                  {skill.security.layers?.map((layer, i) => (
                    <div key={i} className="font-mono text-[13px] text-accent">
                      &#x2713; {layer}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar metadata */}
        <aside className="w-[220px] shrink-0">
          <div className="sticky top-[70px]">
            {/* Stats */}
            <div className="p-4 bg-bg-card border border-border-default rounded-[10px] mb-3.5">
              {[
                { label: 'Downloads', value: skill.downloads },
                { label: 'This week', value: skill.weeklyDownloads },
                {
                  label: 'Rating',
                  value: `\u2605 ${skill.rating} (${skill.reviews})`,
                  color: '#fbbf24',
                },
                { label: 'License', value: skill.license },
                { label: 'Size', value: skill.size },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between py-1.5"
                  style={{ borderBottom: '1px solid #1a1d2733' }}
                >
                  <span className="font-sans text-xs text-text-muted">{row.label}</span>
                  <span className="font-mono text-xs" style={{ color: row.color || '#94a3b8' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Author */}
            <div className="p-3.5 bg-bg-card border border-border-default rounded-[10px] mb-3.5">
              <div className="font-sans text-[11px] text-text-muted mb-2 uppercase tracking-wide">
                Author
              </div>
              <Link
                to={`/authors/${skill.author}`}
                className="flex items-center gap-2 no-underline"
              >
                <div className="w-7 h-7 rounded-md bg-bg-hover border border-border-default flex items-center justify-center font-mono text-xs text-text-dim">
                  {skill.author[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-mono text-[13px] text-text-primary">@{skill.author}</div>
                  <div className="font-mono text-[11px]" style={{ color: trustInfo.color }}>
                    {trustInfo.checks} {trustInfo.label}
                  </div>
                </div>
              </Link>
            </div>

            {/* Links */}
            <div className="p-3.5 bg-bg-card border border-border-default rounded-[10px] mb-3.5">
              <div className="font-sans text-[11px] text-text-muted mb-2 uppercase tracking-wide">
                Links
              </div>
              <div className="font-sans text-[13px] text-blue py-1">Repository</div>
              <div className="font-sans text-[13px] text-blue py-1">Report issue</div>
            </div>

            {/* Dependencies */}
            {((skill.dependencies?.pip?.length ?? 0) > 0 ||
              (skill.dependencies?.system?.length ?? 0) > 0) && (
              <div className="p-3.5 bg-bg-card border border-border-default rounded-[10px]">
                <div className="font-sans text-[11px] text-text-muted mb-2 uppercase tracking-wide">
                  Dependencies
                </div>
                {skill.dependencies.system?.map((d) => (
                  <div key={d} className="font-mono text-xs text-text-dim py-0.5">
                    {d}
                  </div>
                ))}
                {skill.dependencies.pip?.map((d) => (
                  <div key={d} className="font-mono text-xs text-text-dim py-0.5">
                    pip: {d}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
