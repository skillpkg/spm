import React, { useState } from 'react';
import { useAuth } from '@spm/web-auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  SearchInput,
  StatusBadge,
  Text,
  TRUST_CONFIG,
  type TrustTier,
} from '@spm/ui';
import { yankSkill, rescanSkill } from '../lib/api';
import { adminSkillsQuery } from './SkillModeration.queries';
import { useSearchParamsState } from '../lib/useSearchParamsState';
import { LoadingState, ErrorState } from './DataState';
import { SkillDetailPane } from './SkillDetailPane';

const WEB_URL = import.meta.env.VITE_WEB_URL || 'https://skillpkg.dev';

export const SkillModeration = () => {
  const { token } = useAuth();
  const { get, getNumber, set } = useSearchParamsState();

  const search = get('search');
  const page = getNumber('page', 1);
  const selectedSkill = get('skill');

  const [yankTarget, setYankTarget] = useState<{ name: string; version: string } | null>(null);
  const [yankReason, setYankReason] = useState('');
  const [rescanningSkill, setRescanningSkill] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(adminSkillsQuery(token ?? '', page));

  const handleRescan = async (name: string) => {
    if (!token || rescanningSkill) return;
    setRescanningSkill(name);
    try {
      await rescanSkill(token, name);
      refetch();
    } finally {
      setRescanningSkill(null);
    }
  };

  const handleYankConfirm = async () => {
    if (!token || !yankTarget || !yankReason.trim()) return;
    await yankSkill(token, yankTarget.name, yankTarget.version, yankReason.trim());
    setYankTarget(null);
    setYankReason('');
    refetch();
    queryClient.invalidateQueries({ queryKey: ['admin', 'skillDetail', yankTarget.name] });
  };

  // Show inline detail if a skill is selected
  if (selectedSkill) {
    return <SkillDetailPane skillName={selectedSkill} />;
  }

  if (isLoading) return <LoadingState message="Loading skills..." />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const skills = data?.results ?? [];

  const filtered = skills.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.author.toLowerCase().includes(search.toLowerCase()),
  );

  // Map scan_status to a status the StatusBadge can display
  const getDisplayStatus = (skill: (typeof skills)[0]) => {
    if (skill.deprecated) return 'deprecated';
    if (skill.scan_status === 'flagged') return 'held';
    if (skill.scan_status === 'blocked') return 'blocked';
    return 'published';
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <SearchInput
          value={search}
          onChange={(v) => set({ search: v || null, page: null })}
          placeholder="Search skills or authors..."
        />
        <Text variant="caption" font="mono" color="muted">
          {data?.total ?? 0} total skills
        </Text>
      </div>

      {/* Yank confirmation */}
      {yankTarget && (
        <div
          style={{
            padding: '14px 18px',
            marginBottom: 14,
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.05)',
          }}
        >
          <Text variant="body" as="div" color="primary" style={{ marginBottom: 10 }}>
            Yank{' '}
            <strong style={{ color: 'var(--color-cyan)' }}>
              {yankTarget.name}@{yankTarget.version}
            </strong>
            ?
          </Text>
          <input
            value={yankReason}
            onChange={(e) => setYankReason(e.target.value)}
            placeholder="Reason for yanking (required)..."
            style={{
              width: '100%',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              padding: '8px 12px',
              background: 'var(--color-bg)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 6,
              outline: 'none',
              marginBottom: 10,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button label="Yank" color="red" onClick={handleYankConfirm} />
            <Button
              label="Cancel"
              color="text-dim"
              onClick={() => {
                setYankTarget(null);
                setYankReason('');
              }}
            />
          </div>
        </div>
      )}

      <Card>
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 80px 80px 150px',
            gap: 10,
            padding: '8px 16px',
            borderBottom: '1px solid var(--color-border-default)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <Text variant="label" color="muted">
            Skill
          </Text>
          <Text variant="label" color="muted">
            Status
          </Text>
          <Text variant="label" color="muted">
            Trust
          </Text>
          <Text variant="label" color="muted">
            Published
          </Text>
          <Text variant="label" color="muted" align="right">
            Actions
          </Text>
        </div>

        {/* Rows */}
        {filtered.map((skill) => {
          const trustTier = (skill.trust_tier || 'registered') as TrustTier;
          const cfg = TRUST_CONFIG[trustTier];

          return (
            <div
              key={skill.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 80px 80px 150px',
                gap: 10,
                padding: '10px 16px',
                borderBottom: '1px solid rgba(26,29,39,0.25)',
                alignItems: 'center',
              }}
            >
              <div>
                <Text
                  variant="body-sm"
                  as="span"
                  font="mono"
                  weight={500}
                  style={{ color: 'var(--color-cyan)', cursor: 'pointer' }}
                  onClick={() => set({ skill: skill.name })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') set({ skill: skill.name });
                  }}
                >
                  {skill.name}
                </Text>
                <Text variant="label" font="mono" color="faint" style={{ marginLeft: 6 }}>
                  {skill.latest_version ?? '--'}
                </Text>
                <Text variant="label" color="muted" style={{ marginLeft: 8 }}>
                  @{skill.author}
                </Text>
              </div>
              <StatusBadge status={getDisplayStatus(skill)} />
              <Text
                variant="label"
                font="mono"
                style={{ color: cfg?.color ?? 'var(--color-text-dim)' }}
              >
                {cfg?.checks ?? '--'}
              </Text>
              <Text variant="label" font="mono" color="muted" align="right">
                {skill.updated_at.slice(0, 10).slice(5)}
              </Text>
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                }}
              >
                <a
                  href={`${WEB_URL}/skills/${skill.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open on web"
                  style={{
                    textDecoration: 'none',
                    padding: '2px 4px',
                  }}
                >
                  <Text variant="caption" font="mono" color="faint">
                    &#8599;
                  </Text>
                </a>
                <Button
                  label={rescanningSkill === skill.name ? 'Scanning...' : 'Rescan'}
                  color="cyan"
                  small
                  onClick={() => handleRescan(skill.name)}
                />
                <Button
                  label="Yank"
                  color="red"
                  small
                  onClick={() =>
                    skill.latest_version
                      ? setYankTarget({ name: skill.name, version: skill.latest_version })
                      : undefined
                  }
                />
              </div>
            </div>
          );
        })}
      </Card>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <Button
            label="Previous"
            color="text-dim"
            small
            onClick={() => set({ page: Math.max(1, page - 1) })}
          />
          <Text variant="caption" font="mono" color="muted" style={{ padding: '4px 8px' }}>
            Page {data.page} of {data.pages}
          </Text>
          <Button
            label="Next"
            color="text-dim"
            small
            onClick={() => set({ page: Math.min(data.pages, page + 1) })}
          />
        </div>
      )}
    </div>
  );
};
