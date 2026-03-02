import { useState } from 'react';
import { USERS_ADMIN, TRUST_CONFIG, type TrustTier } from '../data/mock';
import {
  ActionButton,
  Badge,
  FilterDropdown,
  FilterTag,
  SearchInput,
  SectionCard,
  StatBox,
  StatusBadge,
} from './ui';

export const UsersTab = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trustFilter, setTrustFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState<{
    username: string;
    action: 'grant' | 'revoke' | 'suspend';
  } | null>(null);

  const filtered = USERS_ADMIN.filter(
    (u) =>
      !search ||
      u.username.includes(search.toLowerCase()) ||
      u.email.includes(search.toLowerCase()),
  )
    .filter((u) => roleFilter === 'all' || u.role === roleFilter)
    .filter((u) => statusFilter === 'all' || u.status === statusFilter)
    .filter((u) => trustFilter === 'all' || u.trust === trustFilter);

  const adminCount = USERS_ADMIN.filter((u) => u.role === 'admin').length;

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
  if (statusFilter !== 'all') {
    const colorMap: Record<string, string> = {
      active: 'accent',
      flagged: 'yellow',
      suspended: 'red',
    };
    activeFilters.push({
      key: 'status',
      label: statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1),
      color: colorMap[statusFilter] ?? 'text-dim',
      clear: () => setStatusFilter('all'),
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

  const isDestructive = confirmAction?.action === 'revoke' || confirmAction?.action === 'suspend';

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-2.5 mb-4">
        <StatBox label="Total users" value={USERS_ADMIN.length} />
        <StatBox label="Admins" value={adminCount} color="red" />
        <StatBox
          label="Active"
          value={USERS_ADMIN.filter((u) => u.status === 'active').length}
          color="accent"
        />
        <StatBox
          label="Flagged"
          value={USERS_ADMIN.filter((u) => u.status === 'flagged').length}
          color="yellow"
        />
      </div>

      {/* Search + dropdown filters */}
      <div
        className={`flex gap-2.5 items-center flex-wrap ${activeFilters.length > 0 ? 'mb-2' : 'mb-4'}`}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search username or email..."
          maxWidth="max-w-[280px]"
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
          label="Status"
          value={statusFilter}
          options={[
            { value: 'all', label: 'All status' },
            { value: 'active', label: 'Active', color: 'accent' },
            { value: 'flagged', label: 'Flagged', color: 'yellow' },
            { value: 'suspended', label: 'Suspended', color: 'red' },
          ]}
          onChange={setStatusFilter}
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
        <div className="flex gap-1.5 mb-3.5 items-center">
          {activeFilters.map((f) => (
            <FilterTag key={f.key} label={f.label} color={f.color} onRemove={f.clear} />
          ))}
          {activeFilters.length > 1 && (
            <span
              onClick={() => {
                setRoleFilter('all');
                setStatusFilter('all');
                setTrustFilter('all');
              }}
              className="font-sans text-[11px] text-text-dim cursor-pointer ml-1"
            >
              Clear all
            </span>
          )}
          <span className="font-mono text-[11px] text-text-muted ml-auto">
            {filtered.length} of {USERS_ADMIN.length}
          </span>
        </div>
      )}

      {/* Confirmation banner */}
      {confirmAction && (
        <div
          className={`px-[18px] py-3.5 mb-3.5 border rounded-[10px] flex justify-between items-center ${
            isDestructive ? 'bg-red/5 border-red/20' : 'bg-accent/5 border-accent/20'
          }`}
        >
          <div>
            <div className="font-sans text-sm text-text-primary mb-0.5">
              {confirmAction.action === 'grant' && (
                <>
                  Grant admin role to{' '}
                  <strong className="text-cyan">@{confirmAction.username}</strong>?
                </>
              )}
              {confirmAction.action === 'revoke' && (
                <>
                  Revoke admin role from{' '}
                  <strong className="text-cyan">@{confirmAction.username}</strong>?
                </>
              )}
              {confirmAction.action === 'suspend' && (
                <>
                  Suspend <strong className="text-cyan">@{confirmAction.username}</strong>?
                </>
              )}
            </div>
            <div className="font-sans text-xs text-text-muted">Logged in audit trail</div>
          </div>
          <div className="flex gap-2">
            <ActionButton
              label="Confirm"
              color={isDestructive ? 'red' : 'accent'}
              onClick={() => setConfirmAction(null)}
            />
            <ActionButton label="Cancel" color="text-dim" onClick={() => setConfirmAction(null)} />
          </div>
        </div>
      )}

      {/* Table */}
      <SectionCard>
        <div className="grid grid-cols-[120px_160px_90px_65px_85px_70px_70px_65px_1fr] gap-1.5 px-3.5 py-2 border-b border-border-default font-sans text-[10px] text-text-muted uppercase tracking-wider">
          <span>User</span>
          <span>Email</span>
          <span>GitHub</span>
          <span>Role</span>
          <span>Trust</span>
          <span>Joined</span>
          <span>Active</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {filtered.map((user) => (
          <div
            key={user.username}
            className="grid grid-cols-[120px_160px_90px_65px_85px_70px_70px_65px_1fr] gap-1.5 px-3.5 py-2.5 border-b border-border-default/25 items-center hover:bg-bg-hover"
          >
            <span className="font-mono text-[13px] text-cyan font-medium">@{user.username}</span>
            <span className="font-mono text-[11px] text-text-dim overflow-hidden text-ellipsis whitespace-nowrap">
              {user.email}
            </span>
            <span className="font-mono text-[11px] text-blue overflow-hidden text-ellipsis whitespace-nowrap">
              {user.github}
            </span>
            {user.role === 'admin' ? (
              <Badge label="ADMIN" color="red" />
            ) : (
              <span className="font-mono text-[11px] text-text-faint">user</span>
            )}
            <span className={`font-mono text-[11px] text-${TRUST_CONFIG[user.trust].color}`}>
              {TRUST_CONFIG[user.trust].checks} {TRUST_CONFIG[user.trust].label}
            </span>
            <span className="font-mono text-[11px] text-text-muted">{user.joined.slice(5)}</span>
            <span className="font-mono text-[11px] text-text-muted">
              {user.lastActive.slice(5)}
            </span>
            <StatusBadge status={user.status} />
            <div className="flex gap-1 justify-end flex-wrap">
              {user.role === 'user' ? (
                <ActionButton
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
                <ActionButton
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
              {user.status !== 'suspended' && (
                <ActionButton
                  label="Suspend"
                  color="red"
                  small
                  onClick={() =>
                    setConfirmAction({
                      username: user.username,
                      action: 'suspend',
                    })
                  }
                />
              )}
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
};
