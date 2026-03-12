import { useState } from 'react';
import { useAuth } from '@spm/web-auth';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  FilterDropdown,
  FilterTag,
  SearchInput,
  StatBox,
  Text,
  TRUST_CONFIG,
  type TrustTier,
} from '@spm/ui';
import { updateUserRole, updateUserTrust, type AdminUserItem } from '../lib/api';
import { usersQuery } from './UsersTab.queries';
import { useSearchParamsState } from '../lib/useSearchParamsState';
import { LoadingState, ErrorState } from './DataState';

export const UsersTab = () => {
  const { token } = useAuth();
  const { get, set } = useSearchParamsState();

  const search = get('search');
  const roleFilter = get('role', 'all');
  const trustFilter = get('trust', 'all');

  const [confirmAction, setConfirmAction] = useState<{
    username: string;
    action: 'grant' | 'revoke';
  } | null>(null);
  const [trustAction, setTrustAction] = useState<{
    username: string;
    currentTier: TrustTier;
    newTier: TrustTier;
  } | null>(null);

  const { data, isLoading, error, refetch } = useQuery(usersQuery(token ?? '', trustFilter));

  const handleConfirmAction = async () => {
    if (!token || !confirmAction) return;
    const newRole = confirmAction.action === 'grant' ? 'admin' : 'user';
    const reason =
      confirmAction.action === 'grant' ? 'Promoted via admin panel' : 'Revoked via admin panel';
    await updateUserRole(token, confirmAction.username, newRole as 'admin' | 'user', reason);
    setConfirmAction(null);
    refetch();
  };

  const handleTrustChange = async () => {
    if (!token || !trustAction) return;
    await updateUserTrust(
      token,
      trustAction.username,
      trustAction.newTier,
      `Changed from ${trustAction.currentTier} to ${trustAction.newTier} via admin panel`,
    );
    setTrustAction(null);
    refetch();
  };

  if (isLoading) return <LoadingState message="Loading users..." />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const allUsers = data?.results ?? [];

  const filtered = allUsers
    .filter(
      (u) =>
        !search ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.email ?? '').toLowerCase().includes(search.toLowerCase()),
    )
    .filter((u) => roleFilter === 'all' || u.role === roleFilter);

  const adminCount = allUsers.filter((u) => u.role === 'admin').length;
  const trustCounts = {
    official: allUsers.filter((u) => u.trust_tier === 'official').length,
    verified: allUsers.filter((u) => u.trust_tier === 'verified').length,
    scanned: allUsers.filter((u) => u.trust_tier === 'scanned').length,
    registered: allUsers.filter((u) => u.trust_tier === 'registered').length,
  };

  const activeFilters: {
    key: string;
    label: string;
    color: string;
    clear: () => void;
  }[] = [];

  if (roleFilter !== 'all') {
    activeFilters.push({
      key: 'role',
      label: roleFilter === 'admin' ? 'Admins' : 'Users',
      color: roleFilter === 'admin' ? 'red' : 'blue',
      clear: () => set({ role: null }),
    });
  }
  if (trustFilter !== 'all') {
    const cfg = TRUST_CONFIG[trustFilter as TrustTier];
    activeFilters.push({
      key: 'trust',
      label: cfg?.label ?? trustFilter,
      color: cfg?.color ?? 'text-dim',
      clear: () => set({ trust: null }),
    });
  }

  const isDestructive = confirmAction?.action === 'revoke';

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatBox label="Total users" value={data?.total ?? allUsers.length} />
        <StatBox label="Admins" value={adminCount} color="red" />
        <StatBox label="Official" value={trustCounts.official} color="var(--color-accent)" />
        <StatBox label="Verified" value={trustCounts.verified} color="var(--color-accent)" />
        <StatBox label="Scanned" value={trustCounts.scanned} color="var(--color-blue)" />
        <StatBox label="Registered" value={trustCounts.registered} color="var(--color-text-dim)" />
      </div>

      {/* Search + dropdown filters */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: activeFilters.length > 0 ? 8 : 16,
        }}
      >
        <SearchInput
          value={search}
          onChange={(v) => set({ search: v || null })}
          placeholder="Search username or email..."
        />

        <FilterDropdown
          label="Role"
          value={roleFilter}
          color="red"
          options={[
            { value: 'all', label: 'All roles' },
            { value: 'admin', label: 'Admins', color: 'red' },
            { value: 'user', label: 'Users' },
          ]}
          onChange={(v) => set({ role: v === 'all' ? null : v })}
        />

        <FilterDropdown
          label="Trust"
          value={trustFilter}
          options={[
            { value: 'all', label: 'All tiers' },
            { value: 'official', label: 'Official', color: 'accent' },
            { value: 'verified', label: 'Verified', color: 'accent' },
            { value: 'scanned', label: 'Scanned', color: 'blue' },
            { value: 'registered', label: 'Registered', color: 'text-dim' },
          ]}
          onChange={(v) => set({ trust: v === 'all' ? null : v })}
        />
      </div>

      {/* Active filter tags */}
      {activeFilters.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 14,
            alignItems: 'center',
          }}
        >
          {activeFilters.map((f) => (
            <FilterTag key={f.key} label={f.label} color={f.color} onRemove={f.clear} />
          ))}
          {activeFilters.length > 1 && (
            <Text
              variant="label"
              as="span"
              color="dim"
              style={{ cursor: 'pointer', marginLeft: 4 }}
              onClick={() => set({ role: null, trust: null })}
            >
              Clear all
            </Text>
          )}
          <Text variant="label" font="mono" color="muted" style={{ marginLeft: 'auto' }}>
            {filtered.length} of {allUsers.length}
          </Text>
        </div>
      )}

      {/* Confirmation banner */}
      {confirmAction && (
        <div
          style={{
            padding: '14px 18px',
            marginBottom: 14,
            border: isDestructive
              ? '1px solid rgba(239,68,68,0.2)'
              : '1px solid rgba(16,185,129,0.2)',
            borderRadius: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: isDestructive ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)',
          }}
        >
          <div>
            <Text variant="body" as="div" color="primary" style={{ marginBottom: 2 }}>
              {confirmAction.action === 'grant' && (
                <>
                  Grant admin role to{' '}
                  <strong style={{ color: 'var(--color-cyan)' }}>@{confirmAction.username}</strong>?
                </>
              )}
              {confirmAction.action === 'revoke' && (
                <>
                  Revoke admin role from{' '}
                  <strong style={{ color: 'var(--color-cyan)' }}>@{confirmAction.username}</strong>?
                </>
              )}
            </Text>
            <Text variant="caption" color="muted">
              Logged in audit trail
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              label="Confirm"
              color={isDestructive ? 'red' : 'accent'}
              onClick={handleConfirmAction}
            />
            <Button label="Cancel" color="text-dim" onClick={() => setConfirmAction(null)} />
          </div>
        </div>
      )}

      {/* Trust tier confirmation */}
      {trustAction && (
        <div
          style={{
            padding: '14px 18px',
            marginBottom: 14,
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(16,185,129,0.05)',
          }}
        >
          <div>
            <Text variant="body" as="div" color="primary" style={{ marginBottom: 2 }}>
              Change <strong style={{ color: 'var(--color-cyan)' }}>@{trustAction.username}</strong>{' '}
              trust tier from <strong>{trustAction.currentTier}</strong> to{' '}
              <strong style={{ color: 'var(--color-accent)' }}>{trustAction.newTier}</strong>?
            </Text>
            <Text variant="caption" color="muted">
              Logged in audit trail
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button label="Confirm" color="accent" onClick={handleTrustChange} />
            <Button label="Cancel" color="text-dim" onClick={() => setTrustAction(null)} />
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 160px 90px 65px 85px 80px 1fr',
            gap: 6,
            padding: '8px 14px',
            borderBottom: '1px solid var(--color-border-default)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <Text variant="tiny" color="muted">
            User
          </Text>
          <Text variant="tiny" color="muted">
            Email
          </Text>
          <Text variant="tiny" color="muted">
            GitHub
          </Text>
          <Text variant="tiny" color="muted">
            Role
          </Text>
          <Text variant="tiny" color="muted">
            Trust
          </Text>
          <Text variant="tiny" color="muted">
            Joined
          </Text>
          <Text variant="tiny" color="muted" align="right">
            Actions
          </Text>
        </div>
        {filtered.map((user: AdminUserItem) => {
          const trustTier = user.trust_tier as TrustTier;
          const cfg = TRUST_CONFIG[trustTier];

          return (
            <div
              key={user.username}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 160px 90px 65px 85px 80px 1fr',
                gap: 6,
                padding: '10px 14px',
                borderBottom: '1px solid rgba(26,29,39,0.25)',
                alignItems: 'center',
              }}
            >
              <Text
                variant="body-sm"
                font="mono"
                weight={500}
                style={{ color: 'var(--color-cyan)' }}
              >
                @{user.username}
              </Text>
              <Text variant="label" font="mono" color="dim" truncate>
                {user.email ?? '--'}
              </Text>
              <Text variant="label" font="mono" truncate style={{ color: 'var(--color-blue)' }}>
                {user.github_login ?? '--'}
              </Text>
              {user.role === 'admin' ? (
                <Badge label="ADMIN" color="red" />
              ) : (
                <Text variant="label" font="mono" color="faint">
                  user
                </Text>
              )}
              <Text
                variant="label"
                font="mono"
                style={{ color: cfg?.color ?? 'var(--color-text-dim)' }}
              >
                {cfg?.checks ?? '--'} {cfg?.label ?? trustTier}
              </Text>
              <Text variant="label" font="mono" color="muted">
                {user.created_at.slice(0, 10).slice(5)}
              </Text>
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <select
                  value={trustTier}
                  onChange={(e) => {
                    const newTier = e.target.value as TrustTier;
                    if (newTier !== trustTier) {
                      setTrustAction({
                        username: user.username,
                        currentTier: trustTier,
                        newTier,
                      });
                    }
                  }}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    background: 'var(--color-bg-card)',
                    color: cfg?.color ?? 'var(--color-text-dim)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 4,
                    padding: '3px 6px',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="registered">Registered</option>
                  <option value="scanned">Scanned</option>
                  <option value="verified">Verified</option>
                  <option value="official">Official</option>
                </select>
                {user.role === 'user' ? (
                  <Button
                    label="Make admin"
                    color="red"
                    small
                    onClick={() =>
                      setConfirmAction({
                        username: user.username,
                        action: 'grant',
                      })
                    }
                  />
                ) : (
                  <Button
                    label="Revoke admin"
                    color="yellow"
                    small
                    onClick={() =>
                      setConfirmAction({
                        username: user.username,
                        action: 'revoke',
                      })
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};
