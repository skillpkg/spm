import { useState, useCallback } from 'react';
import { useAuth } from '@spm/web-auth';
import {
  Badge,
  Button,
  Card,
  FilterDropdown,
  FilterTag,
  SearchInput,
  StatBox,
  TRUST_CONFIG,
  type TrustTier,
} from '@spm/ui';
import { getAdminUsers, updateUserRole, type AdminUserItem } from '../lib/api';
import { useAdminData } from '../lib/useAdminData';
import { LoadingState, ErrorState } from './DataState';

export const UsersTab = () => {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [trustFilter, setTrustFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState<{
    username: string;
    action: 'grant' | 'revoke';
  } | null>(null);

  const fetchUsers = useCallback(
    (t: string) =>
      getAdminUsers(t, { trust: trustFilter !== 'all' ? trustFilter : undefined, per_page: 100 }),
    [trustFilter],
  );
  const { data, isLoading, error, refetch } = useAdminData(fetchUsers, [trustFilter]);

  const handleConfirmAction = async () => {
    if (!token || !confirmAction) return;
    const newRole = confirmAction.action === 'grant' ? 'admin' : 'user';
    const reason =
      confirmAction.action === 'grant' ? 'Promoted via admin panel' : 'Revoked via admin panel';
    await updateUserRole(token, confirmAction.username, newRole as 'admin' | 'user', reason);
    setConfirmAction(null);
    refetch();
  };

  if (isLoading) return <LoadingState message="Loading users..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

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
      clear: () => setRoleFilter('all'),
    });
  }
  if (trustFilter !== 'all') {
    const cfg = TRUST_CONFIG[trustFilter as TrustTier];
    activeFilters.push({
      key: 'trust',
      label: cfg?.label ?? trustFilter,
      color: cfg?.color ?? 'text-dim',
      clear: () => setTrustFilter('all'),
    });
  }

  const isDestructive = confirmAction?.action === 'revoke';

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <StatBox label="Total users" value={data?.total ?? allUsers.length} />
        <StatBox label="Admins" value={adminCount} color="red" />
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
          onChange={setSearch}
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
          onChange={setRoleFilter}
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
          onChange={setTrustFilter}
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
            <span
              onClick={() => {
                setRoleFilter('all');
                setTrustFilter('all');
              }}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                color: 'var(--color-text-dim)',
                cursor: 'pointer',
                marginLeft: 4,
              }}
            >
              Clear all
            </span>
          )}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              marginLeft: 'auto',
            }}
          >
            {filtered.length} of {allUsers.length}
          </span>
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
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                color: 'var(--color-text-primary)',
                marginBottom: 2,
              }}
            >
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
            </div>
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--color-text-muted)',
              }}
            >
              Logged in audit trail
            </div>
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

      {/* Table */}
      <Card>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 160px 90px 65px 85px 80px 1fr',
            gap: 6,
            padding: '8px 14px',
            borderBottom: '1px solid var(--color-border-default)',
            fontFamily: 'var(--font-sans)',
            fontSize: 10,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <span>User</span>
          <span>Email</span>
          <span>GitHub</span>
          <span>Role</span>
          <span>Trust</span>
          <span>Joined</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
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
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--color-cyan)',
                  fontWeight: 500,
                }}
              >
                @{user.username}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-text-dim)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email ?? '--'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-blue)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.github_login ?? '--'}
              </span>
              {user.role === 'admin' ? (
                <Badge label="ADMIN" color="red" />
              ) : (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-text-faint)',
                  }}
                >
                  user
                </span>
              )}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: cfg?.color ?? 'var(--color-text-dim)',
                }}
              >
                {cfg?.checks ?? '--'} {cfg?.label ?? trustTier}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                }}
              >
                {user.created_at.slice(0, 10).slice(5)}
              </span>
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                }}
              >
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
