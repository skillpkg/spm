import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '@spm/ui';
import { type UserOrg, createOrg, inviteOrgMember, removeOrgMember, changeOrgMemberRole } from '../../lib/api';
import { cardStyle } from './styles';
import { myOrgsQuery, orgMembersQuery } from './queries';

interface OrganizationsTabProps {
  username: string;
  token: string;
}

export const OrganizationsTab = ({ username, token }: OrganizationsTabProps) => {
  const queryClient = useQueryClient();
  const { data: orgs, isLoading } = useQuery(myOrgsQuery(username, token));
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (isLoading) {
    return (
      <Text variant="body-sm" font="sans" color="muted" as="div" style={{ padding: '32px 0', textAlign: 'center' }}>
        Loading organizations...
      </Text>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Org list */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text variant="h4" font="sans" color="secondary" as="h2" style={{ margin: 0 }}>
            Your organizations
          </Text>
          <button
            onClick={() => { setShowCreateForm(true); setSelectedOrg(null); }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--color-accent)',
              background: 'none',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            + New
          </button>
        </div>

        <div style={cardStyle}>
          {(!orgs || orgs.length === 0) && !showCreateForm && (
            <Text
              variant="body-sm"
              font="sans"
              color="muted"
              as="div"
              style={{ padding: 20, textAlign: 'center' }}
            >
              No organizations yet
            </Text>
          )}
          {orgs?.map((org) => (
            <OrgListItem
              key={org.name}
              org={org}
              selected={selectedOrg === org.name}
              onSelect={() => { setSelectedOrg(org.name); setShowCreateForm(false); }}
            />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {showCreateForm && (
          <CreateOrgForm
            token={token}
            username={username}
            onCreated={(name) => {
              setShowCreateForm(false);
              setSelectedOrg(name);
              queryClient.invalidateQueries({ queryKey: ['myOrgs'] });
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
        {selectedOrg && !showCreateForm && (
          <OrgManagePanel
            orgName={selectedOrg}
            token={token}
            currentUsername={username}
            role={orgs?.find((o) => o.name === selectedOrg)?.role ?? 'member'}
          />
        )}
        {!selectedOrg && !showCreateForm && (
          <Text
            variant="body-sm"
            font="sans"
            color="muted"
            as="div"
            style={{ padding: '48px 0', textAlign: 'center' }}
          >
            Select an organization or create a new one
          </Text>
        )}
      </div>
    </div>
  );
};

// ── Org list item ──

const OrgListItem = ({
  org,
  selected,
  onSelect,
}: {
  org: UserOrg;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    onClick={onSelect}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      padding: '12px 16px',
      borderBottom: '1px solid var(--color-border-default)',
      background: selected ? 'var(--color-bg-hover)' : 'transparent',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
    }}
  >
    <div>
      <Text variant="body-sm" font="mono" as="div" style={{ color: 'var(--color-cyan)', marginBottom: 2 }}>
        @{org.name}
      </Text>
      {org.display_name && (
        <Text variant="caption" font="sans" color="dim" as="div">
          {org.display_name}
        </Text>
      )}
    </div>
    <div style={{ textAlign: 'right' }}>
      <Text
        variant="label"
        font="mono"
        as="div"
        style={{
          padding: '1px 6px',
          borderRadius: 4,
          fontSize: 10,
          display: 'inline-block',
          background:
            org.role === 'owner'
              ? 'rgba(16, 185, 129, 0.15)'
              : org.role === 'admin'
                ? 'rgba(59, 130, 246, 0.15)'
                : 'rgba(100, 116, 139, 0.15)',
          color:
            org.role === 'owner'
              ? '#34d399'
              : org.role === 'admin'
                ? '#60a5fa'
                : '#94a3b8',
        }}
      >
        {org.role}
      </Text>
      <Text variant="caption" font="mono" color="muted" as="div" style={{ marginTop: 2 }}>
        {org.member_count} members · {org.skill_count} skills
      </Text>
    </div>
  </button>
);

// ── Create org form ──

const CreateOrgForm = ({
  token,
  username,
  onCreated,
  onCancel,
}: {
  token: string;
  username: string;
  onCreated: (name: string) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await createOrg(
        {
          name,
          ...(displayName ? { display_name: displayName } : {}),
          ...(description ? { description } : {}),
        },
        token,
      );
      onCreated(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--color-text-primary)',
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border-default)',
    borderRadius: 6,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    display: 'block',
    marginBottom: 4,
  };

  void username;

  return (
    <div style={{ ...cardStyle, padding: 24 }}>
      <Text variant="h4" font="sans" color="primary" as="h3" style={{ margin: '0 0 20px' }}>
        Create organization
      </Text>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Organization name *</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="my-team"
            required
            maxLength={39}
            minLength={2}
          />
          <Text variant="caption" font="sans" color="muted" as="div" style={{ marginTop: 4 }}>
            2-39 characters, lowercase letters, numbers, and hyphens
          </Text>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Display name</label>
          <input
            style={inputStyle}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="My Team"
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Description</label>
          <input
            style={inputStyle}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this organization do?"
          />
        </div>
        {error && (
          <Text variant="body-sm" font="sans" as="div" style={{ color: 'var(--color-red)', marginBottom: 12 }}>
            {error}
          </Text>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={submitting || name.length < 2}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: '#fff',
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: 6,
              padding: '8px 20px',
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting || name.length < 2 ? 0.5 : 1,
            }}
          >
            {submitting ? 'Creating...' : 'Create organization'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--color-text-dim)',
              background: 'none',
              border: '1px solid var(--color-border-default)',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Org management panel ──

const OrgManagePanel = ({
  orgName,
  token,
  currentUsername,
  role,
}: {
  orgName: string;
  token: string;
  currentUsername: string;
  role: string;
}) => {
  const queryClient = useQueryClient();
  const { data: membersData, isLoading } = useQuery(orgMembersQuery(orgName, token));
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);

  const members = membersData?.members ?? [];
  const canManage = role === 'owner' || role === 'admin';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviteError('');
    setInviting(true);
    try {
      await inviteOrgMember(orgName, { username: inviteUsername.replace(/^@/, ''), role: inviteRole }, token);
      setInviteUsername('');
      queryClient.invalidateQueries({ queryKey: ['org', orgName, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['myOrgs'] });
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (username: string) => {
    if (!confirm(`Remove @${username} from @${orgName}?`)) return;
    try {
      await removeOrgMember(orgName, username, token);
      queryClient.invalidateQueries({ queryKey: ['org', orgName, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['myOrgs'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleRoleChange = async (username: string, newRole: string) => {
    try {
      await changeOrgMemberRole(orgName, username, newRole, token);
      queryClient.invalidateQueries({ queryKey: ['org', orgName, 'members'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to change role');
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '7px 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--color-text-primary)',
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border-default)',
    borderRadius: 6,
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'auto' as React.CSSProperties['appearance'],
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Text variant="h3" font="mono" color="primary" as="h2" style={{ margin: 0 }}>
            @{orgName}
          </Text>
          <Link
            to={`/orgs/${orgName}`}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--color-blue)',
              textDecoration: 'none',
            }}
          >
            View profile
          </Link>
        </div>
      </div>

      {/* Invite form */}
      {canManage && (
        <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
          <Text variant="body-sm" font="sans" color="secondary" weight={600} as="div" style={{ marginBottom: 10 }}>
            Invite member
          </Text>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="username"
            />
            <select
              style={selectStyle}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
              {role === 'owner' && <option value="owner">owner</option>}
            </select>
            <button
              type="submit"
              disabled={inviting || !inviteUsername.trim()}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: '#fff',
                background: 'var(--color-accent)',
                border: 'none',
                borderRadius: 6,
                padding: '8px 14px',
                cursor: inviting ? 'wait' : 'pointer',
                opacity: inviting || !inviteUsername.trim() ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {inviting ? 'Inviting...' : 'Invite'}
            </button>
          </form>
          {inviteError && (
            <Text variant="caption" font="sans" as="div" style={{ color: 'var(--color-red)', marginTop: 6 }}>
              {inviteError}
            </Text>
          )}
        </div>
      )}

      {/* Members table */}
      <div style={cardStyle}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 80px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--color-border-default)',
          }}
        >
          <Text variant="caption" font="sans" color="muted" weight={600} as="div">USERNAME</Text>
          <Text variant="caption" font="sans" color="muted" weight={600} as="div">ROLE</Text>
          {canManage && (
            <Text variant="caption" font="sans" color="muted" weight={600} as="div" style={{ textAlign: 'right' }}>
              ACTIONS
            </Text>
          )}
        </div>

        {isLoading && (
          <Text variant="body-sm" font="sans" color="muted" as="div" style={{ padding: 16, textAlign: 'center' }}>
            Loading members...
          </Text>
        )}

        {members.map((m) => (
          <div
            key={m.username}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 80px',
              padding: '10px 16px',
              borderBottom: '1px solid var(--color-border-default)',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link
                to={`/authors/${m.username}`}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--color-cyan)',
                  textDecoration: 'none',
                }}
              >
                @{m.username}
              </Link>
              {m.username === currentUsername && (
                <Text variant="caption" font="sans" color="muted" as="span">(you)</Text>
              )}
            </div>

            <div>
              {canManage && m.username !== currentUsername ? (
                <select
                  style={{
                    ...selectStyle,
                    padding: '2px 6px',
                    fontSize: 12,
                  }}
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.username, e.target.value)}
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                  {role === 'owner' && <option value="owner">owner</option>}
                </select>
              ) : (
                <Text
                  variant="label"
                  font="mono"
                  as="span"
                  style={{
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontSize: 10,
                    background:
                      m.role === 'owner'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : m.role === 'admin'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(100, 116, 139, 0.15)',
                    color:
                      m.role === 'owner'
                        ? '#34d399'
                        : m.role === 'admin'
                          ? '#60a5fa'
                          : '#94a3b8',
                  }}
                >
                  {m.role}
                </Text>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              {canManage && m.username !== currentUsername && (
                <button
                  onClick={() => handleRemove(m.username)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-red)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px',
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}

        {!isLoading && members.length === 0 && (
          <Text variant="body-sm" font="sans" color="muted" as="div" style={{ padding: 16, textAlign: 'center' }}>
            No members found
          </Text>
        )}
      </div>
    </div>
  );
};
