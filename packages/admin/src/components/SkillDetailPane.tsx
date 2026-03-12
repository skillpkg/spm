import { useState } from 'react';
import { useAuth } from '@spm/web-auth';
import { useTabParam } from '../lib/useTabParam';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Sparkline, Text, TRUST_CONFIG, type TrustTier } from '@spm/ui';
import {
  getAdminSkillVersion,
  yankSkill,
  blockSkill,
  unblockSkill,
  rescanSkill,
  approveSkill,
  type SkillDownloadsDay,
  type ScanLayer,
} from '../lib/api';
import {
  adminSkillDetailQuery,
  adminSkillVersionQuery,
  adminSkillDownloadsQuery,
} from './SkillDetailPane.queries';
import { useSearchParamsState } from '../lib/useSearchParamsState';

const WEB_URL = import.meta.env.VITE_WEB_URL || 'https://skillpkg.dev';
const README_COLLAPSED_LINES = 15;

const layerStatusColor = (status: string): string => {
  switch (status) {
    case 'passed':
      return '#10b981';
    case 'flagged':
      return '#f59e0b';
    case 'blocked':
      return '#ef4444';
    case 'error':
      return '#f97316';
    case 'pending':
      return 'var(--color-text-muted)';
    case 'skipped':
    default:
      return 'var(--color-text-faint)';
  }
};

const securityLevelColor = (level?: string | null): string => {
  switch (level) {
    case 'full':
      return '#10b981';
    case 'partial':
      return '#f59e0b';
    case 'flagged':
      return '#f97316';
    case 'blocked':
      return '#ef4444';
    case 'unscanned':
    default:
      return 'var(--color-text-faint)';
  }
};

const defaultScanLayers: ScanLayer[] = [
  { layer: 1, name: 'Static Analysis', status: 'skipped' },
  { layer: 2, name: 'ML Classification', status: 'skipped' },
  { layer: 3, name: 'Lakera Guard', status: 'skipped' },
];

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

export const SkillDetailPane = ({ skillName }: { skillName: string }) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { set } = useSearchParamsState();
  const [readmeExpanded, setReadmeExpanded] = useState(false);
  const [activeTab, setActiveTab] = useTabParam('skill_tab', 'readme');
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [manualVersionData, setManualVersionData] = useState<{
    readme_md: string | null;
    manifest: Record<string, unknown>;
    signed: boolean;
  } | null>(null);
  const [yankTarget, setYankTarget] = useState<string | null>(null);
  const [yankReason, setYankReason] = useState('');
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [rescanning, setRescanning] = useState(false);

  const {
    data: detail,
    isLoading: loading,
    error,
  } = useQuery(adminSkillDetailQuery(token ?? '', skillName));

  const latestVersion = detail?.latest_version ?? '';
  const { data: latestVersionData } = useQuery(
    adminSkillVersionQuery(token ?? '', skillName, latestVersion),
  );

  const { data: downloadsData } = useQuery(adminSkillDownloadsQuery(token ?? '', skillName));
  const sparklineData = downloadsData ? buildSparklineData(downloadsData.days) : null;

  const versionData = manualVersionData ?? latestVersionData ?? null;

  const handleYank = async () => {
    if (!token || !yankTarget || !yankReason.trim()) return;
    await yankSkill(token, skillName, yankTarget, yankReason.trim());
    setYankTarget(null);
    setYankReason('');
    queryClient.invalidateQueries({ queryKey: ['admin', 'skillDetail', skillName] });
  };

  const handleVersionChange = async (version: string) => {
    if (!token) return;
    setSelectedVersion(version);
    setVersionLoading(true);
    try {
      const v = await getAdminSkillVersion(token, skillName, version);
      setManualVersionData(v);
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
    queryClient.invalidateQueries({ queryKey: ['admin', 'skillDetail', skillName] });
  };

  const handleUnblock = async () => {
    if (!token) return;
    await unblockSkill(token, skillName);
    queryClient.invalidateQueries({ queryKey: ['admin', 'skillDetail', skillName] });
  };

  const handleRescan = async () => {
    if (!token || rescanning) return;
    setRescanning(true);
    try {
      await rescanSkill(token, skillName);
      queryClient.invalidateQueries({ queryKey: ['admin', 'skillDetail', skillName] });
    } finally {
      setRescanning(false);
    }
  };

  const handleApprove = async () => {
    if (!token) return;
    await approveSkill(token, skillName);
    queryClient.invalidateQueries({ queryKey: ['admin', 'skillDetail', skillName] });
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Text variant="body-sm" font="mono" color="muted">
          Loading {skillName}...
        </Text>
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
          }}
        >
          <Text variant="body-sm" color="primary">
            {error?.message ?? 'Skill not found'}
          </Text>
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
                <Text
                  variant="h3"
                  font="mono"
                  weight={700}
                  style={{ fontSize: 18, color: 'var(--color-cyan)' }}
                >
                  {detail.name}
                </Text>
                {detail.latest_version && (
                  <Text variant="body-sm" font="mono" color="muted">
                    v{detail.latest_version}
                  </Text>
                )}
                <Text
                  variant="label"
                  font="mono"
                  style={{
                    color: cfg?.color ?? 'var(--color-text-dim)',
                    padding: '2px 8px',
                    border: `1px solid ${cfg?.color ?? 'var(--color-border-default)'}`,
                    borderRadius: 4,
                  }}
                >
                  {cfg?.checks ?? ''} {cfg?.label ?? trustTier}
                </Text>
                {detail.deprecated && (
                  <Text
                    variant="label"
                    font="mono"
                    style={{
                      color: '#ef4444',
                      padding: '2px 8px',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 4,
                    }}
                  >
                    DEPRECATED
                  </Text>
                )}
                {detail.imported_from && (
                  <a
                    href={detail.imported_from}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Badge label="Imported" color="#818cf8" />
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <Text variant="body-sm" as="span" color="muted">
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
                          textDecoration: 'none',
                          marginLeft: 4,
                        }}
                      >
                        <Text variant="tiny" as="span" color="faint">
                          (GitHub)
                        </Text>
                      </a>
                      {a.role !== 'owner' && (
                        <Text variant="tiny" as="span" color="faint" style={{ marginLeft: 2 }}>
                          ({a.role})
                        </Text>
                      )}
                      {i < arr.length - 1 && ', '}
                    </span>
                  ))}
                </Text>
                <Text variant="label" font="mono" color="faint">
                  {detail.downloads.toLocaleString()} downloads
                </Text>
              </div>
              {sparklineData && (
                <div style={{ marginTop: 8 }}>
                  <Text variant="tiny" as="div" color="faint" style={{ marginBottom: 4 }}>
                    Last 30 days
                  </Text>
                  <Sparkline data={sparklineData} width={200} height={32} color="#10b981" />
                </div>
              )}
              {detail.description && (
                <Text
                  variant="body-sm"
                  as="p"
                  color="dim"
                  style={{ marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}
                >
                  {detail.description}
                </Text>
              )}
            </div>
          </Card>

          {/* Version selector */}
          {detail.versions.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Text variant="caption" as="label" color="muted">
                Version:
              </Text>
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
                <Text variant="label" font="mono" color="faint">
                  Loading...
                </Text>
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
                { id: 'definition' as const, label: 'Definition' },
                { id: 'security' as const, label: 'Security' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderBottom:
                    activeTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                <Text
                  variant="body-sm"
                  weight={500}
                  color={activeTab === tab.id ? 'primary' : 'muted'}
                >
                  {tab.label}
                </Text>
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
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '8px 0 0',
                          display: 'block',
                        }}
                      >
                        <Text variant="caption" style={{ color: 'var(--color-blue)' }}>
                          Show more ({readmeLines.length - README_COLLAPSED_LINES} more lines)
                        </Text>
                      </button>
                    )}
                    {readmeExpanded && readmeLines.length > README_COLLAPSED_LINES && (
                      <button
                        onClick={() => setReadmeExpanded(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '8px 0 0',
                          display: 'block',
                        }}
                      >
                        <Text variant="caption" style={{ color: 'var(--color-blue)' }}>
                          Show less
                        </Text>
                      </button>
                    )}
                  </>
                ) : (
                  <Text variant="caption" font="mono" color="faint">
                    No README available
                  </Text>
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
                  <Text variant="caption" font="mono" color="faint">
                    No manifest available
                  </Text>
                )}
              </div>
            </Card>
          )}

          {/* Security tab */}
          {activeTab === 'security' && (
            <Card>
              <div style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Security level */}
                  <div>
                    <Text variant="body-sm" weight={600} color="primary">
                      Security Level
                    </Text>
                    <div
                      style={{
                        marginTop: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: securityLevelColor(detail.security?.scan_security_level),
                          display: 'inline-block',
                        }}
                      />
                      <Text
                        variant="body-sm"
                        font="mono"
                        weight={600}
                        style={{
                          color: securityLevelColor(detail.security?.scan_security_level),
                          textTransform: 'capitalize',
                        }}
                      >
                        {detail.security?.scan_security_level ??
                          detail.security?.scan_status ??
                          'unknown'}
                      </Text>
                    </div>
                  </div>

                  {/* Scan layers */}
                  <div>
                    <Text variant="body-sm" weight={600} color="primary">
                      Security Layers
                    </Text>
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(detail.security?.scan_layers && detail.security.scan_layers.length > 0
                        ? detail.security.scan_layers
                        : defaultScanLayers
                      ).map((layer) => (
                        <div
                          key={layer.layer}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: layerStatusColor(layer.status),
                              display: 'inline-block',
                            }}
                          />
                          <Text variant="caption" font="mono" color="dim">
                            L{layer.layer}: {layer.name}
                          </Text>
                          <Text
                            variant="caption"
                            font="mono"
                            style={{ color: layerStatusColor(layer.status), marginLeft: 'auto' }}
                          >
                            {layer.status}
                            {layer.confidence != null &&
                              ` (${(layer.confidence * 100).toFixed(0)}%)`}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Approve/Block for flagged or blocked scans */}
                  {(detail.security?.scan_security_level === 'flagged' ||
                    detail.security?.scan_security_level === 'blocked') && (
                    <div
                      style={{
                        marginTop: 4,
                        display: 'flex',
                        gap: 8,
                      }}
                    >
                      <Button label="Approve" color="green" small onClick={handleApprove} />
                      <Button
                        label="Block"
                        color="red"
                        small
                        onClick={() => setShowBlockConfirm(true)}
                      />
                    </div>
                  )}

                  {/* Signature info */}
                  <div>
                    <Text variant="body-sm" weight={600} color="primary">
                      Sigstore Signature
                    </Text>
                    <Text
                      variant="caption"
                      as="div"
                      font="mono"
                      style={{
                        marginTop: 6,
                        color: versionData?.signed ? '#10b981' : 'var(--color-text-faint)',
                      }}
                    >
                      {versionData?.signed ? 'Signed (Fulcio + Rekor)' : 'Not signed'}
                    </Text>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {/* Versions */}
          <Text variant="body" as="h3" weight={600} color="primary" style={{ marginBottom: 8 }}>
            Versions ({detail.versions.length})
          </Text>
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
                    <Text
                      variant="caption"
                      font="mono"
                      style={{
                        color: v.yanked ? 'var(--color-text-faint)' : 'var(--color-text-primary)',
                        textDecoration: v.yanked ? 'line-through' : 'none',
                      }}
                    >
                      {v.version}
                    </Text>
                    <Text variant="tiny" font="mono" color="faint" style={{ marginLeft: 8 }}>
                      {v.published_at.slice(0, 10)}
                    </Text>
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
                    <Text variant="tiny" font="mono" style={{ color: '#ef4444' }}>
                      yanked
                    </Text>
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
              <Text variant="body-sm" as="div" color="primary" style={{ marginBottom: 8 }}>
                Yank{' '}
                <strong style={{ color: 'var(--color-cyan)' }}>
                  {skillName}@{yankTarget}
                </strong>
                ?
              </Text>
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
            <Text variant="body" as="h3" weight={600} color="primary" style={{ marginBottom: 8 }}>
              Actions
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a
                href={`${WEB_URL}/skills/${detail.name}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Text variant="caption" style={{ color: 'var(--color-blue)' }}>
                  Open on web &#8594;
                </Text>
              </a>

              {/* Re-scan */}
              <Button
                label={rescanning ? 'Scanning...' : 'Re-scan Security'}
                color="cyan"
                small
                onClick={handleRescan}
              />

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
                <Text variant="body-sm" as="div" color="primary" style={{ marginBottom: 8 }}>
                  Block <strong style={{ color: 'var(--color-cyan)' }}>{skillName}</strong>?
                </Text>
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
              <Text variant="body" as="h3" weight={600} color="primary" style={{ marginBottom: 8 }}>
                Categories
              </Text>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {detail.categories.map((cat) => (
                  <a
                    key={cat}
                    href={`${WEB_URL}/search?category=${encodeURIComponent(cat)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: 'var(--color-accent)',
                      textDecoration: 'none',
                    }}
                  >
                    <Text variant="label" font="mono" style={{ color: 'var(--color-bg)' }}>
                      {cat}
                    </Text>
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
