import { useState, useCallback } from 'react';
import { useAuth } from '@spm/web-auth';
import { Button, Card, SearchInput, StatusBadge, TRUST_CONFIG, type TrustTier } from '@spm/ui';
import { getAdminSkills, yankSkill } from '../lib/api';
import { useAdminData } from '../lib/useAdminData';
import { LoadingState, ErrorState } from './DataState';

export const SkillModeration = () => {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchSkills = useCallback((t: string) => getAdminSkills(t, page, 50), [page]);
  const { data, isLoading, error, refetch } = useAdminData(fetchSkills, [page]);

  const handleYank = async (name: string, version: string | null) => {
    if (!token || !version) return;
    const reason = prompt(`Reason for yanking ${name}@${version}:`);
    if (!reason) return;
    await yankSkill(token, name, version, reason);
    refetch();
  };

  if (isLoading) return <LoadingState message="Loading skills..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

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
          onChange={setSearch}
          placeholder="Search skills or authors..."
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--color-text-muted)',
          }}
        >
          {data?.total ?? 0} total skills
        </span>
      </div>

      <Card>
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 80px 90px 110px',
            gap: 10,
            padding: '8px 16px',
            borderBottom: '1px solid var(--color-border-default)',
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <span>Skill</span>
          <span>Status</span>
          <span>Trust</span>
          <span style={{ textAlign: 'right' }}>Published</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
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
                gridTemplateColumns: '1fr 80px 80px 90px 110px',
                gap: 10,
                padding: '10px 16px',
                borderBottom: '1px solid rgba(26,29,39,0.25)',
                alignItems: 'center',
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--color-cyan)',
                    fontWeight: 500,
                  }}
                >
                  {skill.name}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-text-faint)',
                    marginLeft: 6,
                  }}
                >
                  {skill.latest_version ?? '--'}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    marginLeft: 8,
                  }}
                >
                  @{skill.author}
                </span>
              </div>
              <StatusBadge status={getDisplayStatus(skill)} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: cfg?.color ?? 'var(--color-text-dim)',
                }}
              >
                {cfg?.checks ?? '--'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  textAlign: 'right',
                }}
              >
                {skill.updated_at.slice(0, 10).slice(5)}
              </span>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <Button label="View" color="blue" small />
                <Button
                  label="Yank"
                  color="red"
                  small
                  onClick={() => handleYank(skill.name, skill.latest_version)}
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              padding: '4px 8px',
            }}
          >
            Page {data.page} of {data.pages}
          </span>
          <Button
            label="Next"
            color="text-dim"
            small
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
          />
        </div>
      )}
    </div>
  );
};
