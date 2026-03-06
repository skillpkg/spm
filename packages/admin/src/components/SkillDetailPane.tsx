import { useState, useEffect } from 'react';
import { useAuth } from '@spm/web-auth';
import { Button, Card, Sparkline, TRUST_CONFIG, type TrustTier } from '@spm/ui';
import {
  getSkillDetail,
  getSkillVersion,
  getAdminSkillVersion,
  getSkillDownloads,
  yankSkill,
  blockSkill,
  unblockSkill,
  type SkillDetailResponse,
  type SkillVersionResponse,
  type SkillDownloadsDay,
} from '../lib/api';
import { useSearchParamsState } from '../lib/useSearchParamsState';

const WEB_URL = import.meta.env.VITE_WEB_URL || 'https://skillpkg.dev';
const README_COLLAPSED_LINES = 15;

const buildSparklineData = (days: SkillDownloadsDay[]): number[] => {
  const counts = new Map<string, number>();
  for (const d of days) counts.set(d.date, d.count);

  const result: number[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().split('T')[0];
    result.push(counts.get(key) ?? 0);
  }
  return result;
};

type DetailTab = 'readme' | 'skill-content' | 'definition' | 'security';

export const SkillDetailPane = ({ skillName }: { skillName: string }) => {
  const { token } = useAuth();
  const { set } = useSearchParamsState();
  const [detail, setDetail] = useState<SkillDetailResponse | null>(null);
  const [versionData, setVersionData] = useState<SkillVersionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readmeExpanded, setReadmeExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('readme');
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [yankTarget, setYankTarget] = useState<string | null>(null);
  const [yankReason, setYankReason] = useState('');
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [sparklineData, setSparklineData] = useState<number[] | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await getSkillDetail(token, skillName);
        if (cancelled) return;
        setDetail(d);

        if (d.latest_version) {
          const v = await getSkillVersion(token, skillName, d.latest_version);
          if (cancelled) return;
          setVersionData(v);
        }

        // Fetch downloads for sparkline (non-blocking)
        getSkillDownloads(token, skillName)
          .then((res) => {
            if (!cancelled) setSparklineData(buildSparklineData(res.days));
          })
          .catch(() => {
            // Sparkline is non-critical; silently skip on error
          });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load skill');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token, skillName]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getSkillDownloads(token, skillName)
      .then((res) => {
        if (!cancelled) setSparklineData(buildSparklineData(res.days));
      })
      .catch(() => {
        // Sparkline is non-critical
      });
    return () => {
      cancelled = true;
    };
  }, [token, skillName]);

  const handleYank = async () => {
    if (!token || !yankTarget || !yankReason.trim()) return;
    await yankSkill(token, skillName, yankTarget, yankReason.trim());
    setYankTarget(null);
    setYankReason('');
    // Reload detail
    const d = await getSkillDetail(token, skillName);
    setDetail(d);
  };

  const handleVersionChange = async (version: string) => {
    if (!token) return;
    setSelectedVersion(version);
    setVersionLoading(true);
    try {
      const v = await getAdminSkillVersion(token, skillName, version);
      setVersionData(v);
      setReadmeExpanded(false);
    } catch {
      // Keep existing version data on error
    } finally {
      setVersionLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!token || !blockReason.trim()) return;
    await blockSkill(token, skillName, blockReason.trim());
    setShowBlockConfirm(false);
    setBlockReason('');
    const d = await getSkillDetail(token, skillName);
    setDetail(d);
  };

  const handleUnblock = async () => {
    if (!token) return;
    await unblockSkill(token, skillName);
    const d = await getSkillDetail(token, skillName);
    setDetail(d);
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <span
          style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-muted)' }}
        >
          Loading {skillName}...
        </span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ padding: 24 }}>
        <Button
          label="← Back to list"
          color="text-dim"
          small
          onClick={() => set({ skill: null })}
        />
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.05)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--color-text-primary)',
          }}
        >
          {error ?? 'Skill not found'}
        </div>
      </div>
    );
  }

  const trustTier = (detail.author.trust_tier || 'registered') as TrustTier;
  const cfg = TRUST_CONFIG[trustTier];

  const readmeLines = versionData?.readme_md?.split('\n') ?? [];
  const readmeCollapsed = readmeLines.length > README_COLLAPSED_LINES && !readmeExpanded;
  const displayedReadme = readmeCollapsed
    ? readmeLines.slice(0, README_COLLAPSED_LINES).join('\n')
    : (versionData?.readme_md ?? '');

  const manifest = versionData?.manifest;

  return (
    <div>
      {/* Back button */}
      <div style={{ marginBottom: 16 }}>
        <Button
          label="← Back to list"
          color="text-dim"
          small
          onClick={() => set({ skill: null })}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>
        {/* Main content */}
        <div>
          {/* Header */}
          <Card>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--color-cyan)',
                  }}
                >
                  {detail.name}
                </span>
                {detail.latest_version && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    v{detail.latest_version}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: cfg?.color ?? 'var(--color-text-dim)',
                    padding: '2px 8px',
                    border: `1px solid ${cfg?.color ?? 'var(--color-border-default)'}`,
                    borderRadius: 4,
                  }}
                >
                  {cfg?.checks ?? ''} {cfg?.label ?? trustTier}
                </span>
                {detail.deprecated && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: '#ef4444',
                      padding: '2px 8px',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 4,
                    }}
                  >
                    DEPRECATED
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  by{' '}
                  {(
                    detail.authors ?? [
                      {
                        username: detail.author.username,
                        github_login: detail.author.username,
                        trust_tier: detail.author.trust_tier,
                        role: 'owner',
                      },
                    ]
                  ).map((a, i, arr) => (
                    <span key={a.username}>
                      <a
                        href={`${WEB_URL}/authors/${a.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--color-text-primary)',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        @{a.username}
                      </a>
                      <a
                        href={`https://github.com/${a.github_login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--color-text-faint)',
                          textDecoration: 'none',
                          marginLeft: 4,
                          fontSize: 10,
                        }}
                      >
                        (GitHub)
                      </a>
                      {a.role !== 'owner' && (
                        <span
                          style={{ fontSize: 10, color: 'var(--color-text-faint)', marginLeft: 2 }}
                        >
                          ({a.role})
                        </span>
                      )}
                      {i < arr.length - 1 && ', '}
                    </span>
                  ))}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-text-faint)',
                  }}
                >
                  {detail.downloads.toLocaleString()} downloads
                </span>
              </div>
              {sparklineData && (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 10,
                      color: 'var(--color-text-faint)',
                      marginBottom: 4,
                    }}
                  >
                    Last 30 days
                  </div>
                  <Sparkline data={sparklineData} width={200} height={32} color="#10b981" />
                </div>
              )}
              {detail.description && (
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    color: 'var(--color-text-dim)',
                    marginTop: 10,
                    marginBottom: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {detail.description}
                </p>
              )}
            </div>
          </Card>

          {/* Version selector */}
          {detail.versions.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <label
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                }}
              >
                Version:
              </label>
              <select
                value={selectedVersion ?? detail.latest_version ?? ''}
                onChange={(e) => handleVersionChange(e.target.value)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '4px 8px',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 4,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {detail.versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    {v.version}
                    {v.yanked ? ' (yanked)' : ''}
                  </option>
                ))}
              </select>
              {versionLoading && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-text-faint)',
                  }}
                >
                  Loading...
                </span>
              )}
            </div>
          )}

          {/* Sub-tabs */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              borderBottom: '1px solid var(--color-border-default)',
              marginTop: 12,
              marginBottom: 16,
            }}
          >
            {(
              [
                { id: 'readme' as const, label: 'README' },
                { id: 'skill-content' as const, label: 'Skill Content' },
                { id: 'definition' as const, label: 'Definition' },
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
                  padding: '8px 16px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderBottom:
                    activeTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
                  color:
                    activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* README tab */}
          {activeTab === 'readme' && (
            <Card>
              <div style={{ padding: '14px 18px' }}>
                {versionData?.readme_md ? (
                  <>
                    <pre
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--color-text-dim)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                      }}
                    >
                      {displayedReadme}
                    </pre>
                    {readmeCollapsed && (
                      <button
                        onClick={() => setReadmeExpanded(true)}
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 12,
                          color: 'var(--color-blue)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '8px 0 0',
                          display: 'block',
                        }}
                      >
                        Show more ({readmeLines.length - README_COLLAPSED_LINES} more lines)
                      </button>
                    )}
                    {readmeExpanded && readmeLines.length > README_COLLAPSED_LINES && (
                      <button
                        onClick={() => setReadmeExpanded(false)}
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 12,
                          color: 'var(--color-blue)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '8px 0 0',
                          display: 'block',
                        }}
                      >
                        Show less
                      </button>
                    )}
                  </>
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-faint)',
                    }}
                  >
                    No README available
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* Skill Content tab — full SKILL.md for admin review */}
          {activeTab === 'skill-content' && (
            <Card>
              <div style={{ padding: '14px 18px' }}>
                {versionData?.readme_md ? (
                  <pre
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-dim)',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                    }}
                  >
                    {versionData.readme_md}
                  </pre>
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-faint)',
                    }}
                  >
                    No skill content available for this version.
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* Definition tab */}
          {activeTab === 'definition' && (
            <Card>
              <div style={{ padding: '14px 18px' }}>
                {manifest ? (
                  <pre
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-dim)',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(manifest, null, 2)}
                  </pre>
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-faint)',
                    }}
                  >
                    No manifest available
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* Security tab */}
          {activeTab === 'security' && (
            <Card>
              <div style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Scan status */}
                  <div>
                    <span
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Scan Status
                    </span>
                    <div
                      style={{
                        marginTop: 6,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--color-text-dim)',
                      }}
                    >
                      {detail.scan_status ?? 'unknown'}
                    </div>
                  </div>

                  {/* Scan layers */}
                  <div>
                    <span
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Security Layers
                    </span>
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {['Layer 1: Static Analysis', 'Layer 2: LLM Review', 'Layer 3: Sandbox'].map(
                        (layer, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontFamily: 'var(--font-mono)',
                              fontSize: 12,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: i === 0 ? '#10b981' : 'var(--color-text-faint)',
                                display: 'inline-block',
                              }}
                            />
                            <span style={{ color: 'var(--color-text-dim)' }}>{layer}</span>
                            <span style={{ color: 'var(--color-text-faint)', marginLeft: 'auto' }}>
                              {i === 0 ? 'active' : 'not yet available'}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Signature info */}
                  <div>
                    <span
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Sigstore Signature
                    </span>
                    <div
                      style={{
                        marginTop: 6,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: versionData?.signed ? '#10b981' : 'var(--color-text-faint)',
                      }}
                    >
                      {versionData?.signed ? 'Signed (Fulcio + Rekor)' : 'Not signed'}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {/* Versions */}
          <h3
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 8,
            }}
          >
            Versions ({detail.versions.length})
          </h3>
          <Card>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {detail.versions.map((v) => (
                <div
                  key={v.version}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 14px',
                    borderBottom: '1px solid rgba(26,29,39,0.25)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: v.yanked ? 'var(--color-text-faint)' : 'var(--color-text-primary)',
                        textDecoration: v.yanked ? 'line-through' : 'none',
                      }}
                    >
                      {v.version}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--color-text-faint)',
                        marginLeft: 8,
                      }}
                    >
                      {v.published_at.slice(0, 10)}
                    </span>
                  </div>
                  {!v.yanked && (
                    <Button
                      label="Yank"
                      color="red"
                      small
                      onClick={() => setYankTarget(v.version)}
                    />
                  )}
                  {v.yanked && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: '#ef4444',
                      }}
                    >
                      yanked
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Yank confirmation */}
          {yankTarget && (
            <div
              style={{
                marginTop: 12,
                padding: '12px 14px',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8,
                background: 'rgba(239,68,68,0.05)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--color-text-primary)',
                  marginBottom: 8,
                }}
              >
                Yank{' '}
                <strong style={{ color: 'var(--color-cyan)' }}>
                  {skillName}@{yankTarget}
                </strong>
                ?
              </div>
              <input
                value={yankReason}
                onChange={(e) => setYankReason(e.target.value)}
                placeholder="Reason (required)..."
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  padding: '6px 10px',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 6,
                  outline: 'none',
                  marginBottom: 8,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <Button label="Yank" color="red" small onClick={handleYank} />
                <Button
                  label="Cancel"
                  color="text-dim"
                  small
                  onClick={() => {
                    setYankTarget(null);
                    setYankReason('');
                  }}
                />
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div style={{ marginTop: 16 }}>
            <h3
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 8,
              }}
            >
              Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a
                href={`${WEB_URL}/skills/${detail.name}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: 'var(--color-blue)',
                  textDecoration: 'none',
                }}
              >
                Open on web →
              </a>

              {/* Block / Unblock */}
              {detail.status === 'blocked' ? (
                <Button label="Unblock Skill" color="green" small onClick={handleUnblock} />
              ) : (
                <Button
                  label="Block Skill"
                  color="red"
                  small
                  onClick={() => setShowBlockConfirm(true)}
                />
              )}
            </div>

            {/* Block confirmation */}
            {showBlockConfirm && (
              <div
                style={{
                  marginTop: 12,
                  padding: '12px 14px',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.05)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    color: 'var(--color-text-primary)',
                    marginBottom: 8,
                  }}
                >
                  Block <strong style={{ color: 'var(--color-cyan)' }}>{skillName}</strong>?
                </div>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Reason (required)..."
                  rows={3}
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    padding: '6px 10px',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 6,
                    outline: 'none',
                    marginBottom: 8,
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button label="Block" color="red" small onClick={handleBlock} />
                  <Button
                    label="Cancel"
                    color="text-dim"
                    small
                    onClick={() => {
                      setShowBlockConfirm(false);
                      setBlockReason('');
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Categories */}
          {detail.categories.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: 8,
                }}
              >
                Categories
              </h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {detail.categories.map((cat) => (
                  <a
                    key={cat}
                    href={`${WEB_URL}/search?category=${encodeURIComponent(cat)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: 'var(--color-accent)',
                      color: 'var(--color-bg)',
                      textDecoration: 'none',
                    }}
                  >
                    {cat}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
