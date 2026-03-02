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
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        cursor: 'pointer',
        padding: '2px 6px',
        userSelect: 'none',
        color: copied ? '#10b981' : '#64748b',
      }}
    >
      {copied ? '\u2713 copied' : 'copy'}
    </span>
  );
};

const cardStyle: React.CSSProperties = {
  padding: 14,
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 10,
  marginBottom: 14,
};

export const SkillDetail = () => {
  const { name } = useParams<{ name: string }>();
  const [activeTab, setActiveTab] = useState<'readme' | 'versions' | 'security'>('readme');

  const skill = SKILLS_DB.find((s) => s.name === name);

  if (!skill) {
    return (
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '64px 32px', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 20,
            color: 'var(--color-text-dim)',
            marginBottom: 16,
          }}
        >
          Skill not found
        </div>
        <Link
          to="/"
          style={{
            color: 'var(--color-accent)',
            textDecoration: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
          }}
        >
          Back to registry
        </Link>
      </div>
    );
  }

  const trustInfo = TRUST_CONFIG[skill.trust];

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 32px 60px' }}>
      {/* Breadcrumb */}
      <div style={{ padding: '16px 0', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
        <Link to="/" style={{ color: 'var(--color-text-dim)', textDecoration: 'none' }}>
          Registry
        </Link>
        <span style={{ color: 'var(--color-text-faint)', margin: '0 8px' }}>/</span>
        <span style={{ color: 'var(--color-text-secondary)' }}>{skill.name}</span>
      </div>

      {/* Hero */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: 24,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--color-cyan)',
                margin: 0,
              }}
            >
              {skill.name}
            </h1>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 15,
                color: 'var(--color-text-faint)',
              }}
            >
              {skill.version}
            </span>
            <TrustBadge tier={skill.trust} size="lg" />
          </div>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              color: 'var(--color-text-secondary)',
              marginBottom: 16,
              lineHeight: 1.6,
              maxWidth: 520,
              marginTop: 0,
            }}
          >
            {skill.desc}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {skill.tags?.map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: '#111318',
                  color: 'var(--color-text-dim)',
                  border: '1px solid var(--color-border-default)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Install box */}
        <div
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 10,
            padding: 16,
            minWidth: 280,
            marginLeft: 24,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--color-text-dim)',
              marginBottom: 8,
            }}
          >
            Install
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              padding: '10px 12px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 6,
              marginBottom: 12,
            }}
          >
            <span>
              <span style={{ color: 'var(--color-text-muted)' }}>$ </span>
              <span style={{ color: 'var(--color-text-primary)' }}>spm install {skill.name}</span>
            </span>
            <CopyButton text={`spm install ${skill.name}`} />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              padding: '10px 12px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 6,
            }}
          >
            <span>
              <span style={{ color: 'var(--color-text-muted)' }}>$ </span>
              <span style={{ color: 'var(--color-text-primary)' }}>
                spm install -g {skill.name}
              </span>
            </span>
            <CopyButton text={`spm install -g ${skill.name}`} />
          </div>
        </div>
      </div>

      {/* Content: tabs + sidebar */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              borderBottom: '1px solid var(--color-border-default)',
              marginBottom: 20,
            }}
          >
            {(
              [
                { id: 'readme' as const, label: 'README' },
                { id: 'versions' as const, label: `Versions (${skill.versions?.length || 0})` },
                { id: 'security' as const, label: 'Security' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '10px 18px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
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
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.75,
                paddingTop: 4,
              }}
            >
              {skill.longDesc?.split('\n\n').map((para, i) => (
                <p key={i} style={{ marginBottom: 16 }}>
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
                  style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                    padding: '14px 0',
                    borderBottom:
                      i < (skill.versions?.length ?? 0) - 1 ? '1px solid #1a1d2744' : 'none',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 14,
                      fontWeight: 600,
                      minWidth: 60,
                      color: i === 0 ? '#10b981' : '#64748b',
                    }}
                  >
                    {v.v}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {v.changes}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                        marginTop: 4,
                      }}
                    >
                      {v.date}
                    </div>
                  </div>
                  {i === 0 && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'rgba(16,185,129,0.08)',
                        color: 'var(--color-accent)',
                        marginLeft: 'auto',
                      }}
                    >
                      latest
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Signature */}
              <div style={{ ...cardStyle, marginBottom: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    marginBottom: 10,
                  }}
                >
                  {skill.security.signed ? '\uD83D\uDD12' : '\u26A0'} Signature
                </div>
                {skill.security.signed ? (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--color-accent)',
                    }}
                  >
                    &#x2713; Signed by {skill.security.signer} (Sigstore OIDC)
                  </div>
                ) : (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--color-yellow)',
                    }}
                  >
                    &#x26A0; Unsigned — author has not set up Sigstore signing
                  </div>
                )}
              </div>

              {/* Scan results */}
              <div style={{ ...cardStyle, marginBottom: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    marginBottom: 10,
                  }}
                >
                  &#x1F6E1; Scan Results
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {skill.security.layers?.map((layer, i) => (
                    <div
                      key={i}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        color: 'var(--color-accent)',
                      }}
                    >
                      &#x2713; {layer}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar metadata */}
        <aside style={{ width: 220, flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 70 }}>
            {/* Stats */}
            <div style={cardStyle}>
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
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid #1a1d2733',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: row.color || '#94a3b8',
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Author */}
            <div style={cardStyle}>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Author
              </div>
              <Link
                to={`/authors/${skill.author}`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'var(--color-bg-hover)',
                    border: '1px solid var(--color-border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--color-text-dim)',
                  }}
                >
                  {skill.author[0].toUpperCase()}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    @{skill.author}
                  </div>
                  <div
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: trustInfo.color }}
                  >
                    {trustInfo.checks} {trustInfo.label}
                  </div>
                </div>
              </Link>
            </div>

            {/* Links */}
            <div style={cardStyle}>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Links
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--color-blue)',
                  padding: '4px 0',
                }}
              >
                Repository
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--color-blue)',
                  padding: '4px 0',
                }}
              >
                Report issue
              </div>
            </div>

            {/* Dependencies */}
            {((skill.dependencies?.pip?.length ?? 0) > 0 ||
              (skill.dependencies?.system?.length ?? 0) > 0) && (
              <div style={cardStyle}>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Dependencies
                </div>
                {skill.dependencies.system?.map((d) => (
                  <div
                    key={d}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-dim)',
                      padding: '2px 0',
                    }}
                  >
                    {d}
                  </div>
                ))}
                {skill.dependencies.pip?.map((d) => (
                  <div
                    key={d}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-dim)',
                      padding: '2px 0',
                    }}
                  >
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
