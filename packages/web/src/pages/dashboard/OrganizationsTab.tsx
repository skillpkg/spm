import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '@spm/ui';
import {
  type UserOrg,
  type OrgMemberInfo,
  createOrg,
  updateOrg,
  inviteOrgMember,
  removeOrgMember,
  changeOrgMemberRole,
} from '../../lib/api';
import { cardStyle } from './styles';
import { myOrgsQuery, orgMembersQuery } from './queries';

// ── Shared styles ──

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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  width: 'auto',
  appearance: 'auto' as React.CSSProperties['appearance'],
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  display: 'block',
  marginBottom: 4,
};

const roleBadge = (role: string): React.CSSProperties => ({
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  display: 'inline-block',
  background:
    role === 'owner'
      ? 'rgba(16, 185, 129, 0.15)'
      : role === 'admin'
        ? 'rgba(59, 130, 246, 0.15)'
        : 'rgba(100, 116, 139, 0.15)',
  color:
    role === 'owner'
      ? '#34d399'
      : role === 'admin'
        ? '#60a5fa'
        : '#94a3b8',
});

const btnPrimary: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: '#fff',
  background: 'var(--color-accent)',
  border: 'none',
  borderRadius: 6,
  padding: '8px 14px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const btnGhost: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--color-text-dim)',
  background: 'none',
  border: '1px solid var(--color-border-default)',
  borderRadius: 6,
  padding: '7px 14px',
  cursor: 'pointer',
};

// ── Main tab ──

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
              ...btnGhost,
              color: 'var(--color-accent)',
              borderColor: 'rgba(16,185,129,0.25)',
              fontSize: 12,
              padding: '4px 10px',
            }}
          >
            + New
          </button>
        </div>

        <div style={cardStyle}>
          {(!orgs || orgs.length === 0) && !showCreateForm && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Text variant="body-sm" font="sans" color="muted" as="div" style={{ marginBottom: 12 }}>
                No organizations yet
              </Text>
              <button
                onClick={() => setShowCreateForm(true)}
                style={{ ...btnPrimary, fontSize: 13, padding: '8px 20px' }}
              >
                Create your first org
              </button>
            </div>
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
            org={orgs?.find((o) => o.name === selectedOrg)}
            token={token}
            currentUsername={username}
            role={orgs?.find((o) => o.name === selectedOrg)?.role ?? 'member'}
          />
        )}
        {!selectedOrg && !showCreateForm && orgs && orgs.length > 0 && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Text variant="body-sm" font="sans" color="muted" as="div">
              Select an organization to manage
            </Text>
          </div>
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
      padding: '14px 16px',
      background: selected ? 'var(--color-bg-hover)' : 'transparent',
      border: 'none',
      borderBottom: '1px solid var(--color-border-default)',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'background 100ms',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--color-bg-hover)',
          border: '1px solid var(--color-border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          color: 'var(--color-text-dim)',
          flexShrink: 0,
        }}
      >
        {org.name[0]?.toUpperCase()}
      </div>
      <div>
        <Text variant="body-sm" font="mono" as="div" style={{ color: 'var(--color-cyan)', marginBottom: 1 }}>
          @{org.name}
        </Text>
        <Text variant="caption" font="mono" color="muted" as="div">
          {org.member_count} member{org.member_count !== 1 ? 's' : ''} · {org.skill_count} skill{org.skill_count !== 1 ? 's' : ''}
        </Text>
      </div>
    </div>
    <span style={roleBadge(org.role)}>{org.role}</span>
  </button>
);

// ── Create org form ──

const CreateOrgForm = ({
  token,
  onCreated,
  onCancel,
}: {
  token: string;
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
              ...btnPrimary,
              fontSize: 13,
              padding: '8px 20px',
              opacity: submitting || name.length < 2 ? 0.5 : 1,
              cursor: submitting ? 'wait' : 'pointer',
            }}
          >
            {submitting ? 'Creating...' : 'Create organization'}
          </button>
          <button type="button" onClick={onCancel} style={{ ...btnGhost, fontSize: 13, padding: '8px 16px' }}>
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
  org,
  token,
  currentUsername,
  role,
}: {
  orgName: string;
  org?: UserOrg;
  token: string;
  currentUsername: string;
  role: string;
}) => {
  const queryClient = useQueryClient();
  const { data: membersData, isLoading } = useQuery(orgMembersQuery(orgName, token));
  const [activeSection, setActiveSection] = useState<'members' | 'settings'>('members');
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

  const sectionTab = (id: 'members' | 'settings', label: string) => (
    <button
      onClick={() => setActiveSection(id)}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: activeSection === id ? 600 : 400,
        color: activeSection === id ? 'var(--color-accent)' : 'var(--color-text-dim)',
        background: 'none',
        border: 'none',
        borderBottom: activeSection === id ? '2px solid var(--color-accent)' : '2px solid transparent',
        padding: '8px 16px',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--color-bg-hover)',
              border: '1px solid var(--color-border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 16,
              color: 'var(--color-text-dim)',
            }}
          >
            {orgName[0]?.toUpperCase()}
          </div>
          <div>
            <Text variant="h3" font="mono" color="primary" as="h2" style={{ margin: 0 }}>
              @{orgName}
            </Text>
            {org?.display_name && (
              <Text variant="caption" font="sans" color="dim" as="div">{org.display_name}</Text>
            )}
          </div>
        </div>
        <Link
          to={`/orgs/${orgName}`}
          style={{
            ...btnGhost,
            textDecoration: 'none',
            fontSize: 12,
          }}
        >
          View public profile
        </Link>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, margin: '12px 0 16px', paddingLeft: 46 }}>
        <Text variant="caption" font="mono" color="muted" as="span">
          {org?.member_count ?? members.length} member{(org?.member_count ?? members.length) !== 1 ? 's' : ''}
        </Text>
        <Text variant="caption" font="mono" color="muted" as="span">
          {org?.skill_count ?? 0} skill{(org?.skill_count ?? 0) !== 1 ? 's' : ''}
        </Text>
        <span style={roleBadge(role)}>your role: {role}</span>
      </div>

      {/* Section tabs */}
      <div style={{ borderBottom: '1px solid var(--color-border-default)', marginBottom: 16 }}>
        {sectionTab('members', `Members (${members.length})`)}
        {canManage && sectionTab('settings', 'Settings')}
      </div>

      {/* Members section */}
      {activeSection === 'members' && (
        <>
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
                  placeholder="SPM username (e.g. jane-doe)"
                />
                <select
                  style={{ ...selectStyle, padding: '7px 12px' }}
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
                    ...btnPrimary,
                    opacity: inviting || !inviteUsername.trim() ? 0.5 : 1,
                    cursor: inviting ? 'wait' : 'pointer',
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
          <MembersTable
            members={members}
            isLoading={isLoading}
            canManage={canManage}
            currentUsername={currentUsername}
            ownerRole={role}
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
          />
        </>
      )}

      {/* Settings section */}
      {activeSection === 'settings' && canManage && (
        <OrgSettingsForm orgName={orgName} org={org} token={token} />
      )}
    </div>
  );
};

// ── Members table ──

const MembersTable = ({
  members,
  isLoading,
  canManage,
  currentUsername,
  ownerRole,
  onRoleChange,
  onRemove,
}: {
  members: OrgMemberInfo[];
  isLoading: boolean;
  canManage: boolean;
  currentUsername: string;
  ownerRole: string;
  onRoleChange: (username: string, role: string) => void;
  onRemove: (username: string) => void;
}) => (
  <div style={cardStyle}>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: canManage ? '1fr 120px 80px' : '1fr 120px',
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
          gridTemplateColumns: canManage ? '1fr 120px 80px' : '1fr 120px',
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
              style={{ ...selectStyle, padding: '2px 6px', fontSize: 12 }}
              value={m.role}
              onChange={(e) => onRoleChange(m.username, e.target.value)}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
              {ownerRole === 'owner' && <option value="owner">owner</option>}
            </select>
          ) : (
            <span style={roleBadge(m.role)}>{m.role}</span>
          )}
        </div>

        {canManage && (
          <div style={{ textAlign: 'right' }}>
            {m.username !== currentUsername && (
              <button
                onClick={() => onRemove(m.username)}
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
        )}
      </div>
    ))}

    {!isLoading && members.length === 0 && (
      <Text variant="body-sm" font="sans" color="muted" as="div" style={{ padding: 16, textAlign: 'center' }}>
        No members found
      </Text>
    )}
  </div>
);

// ── Org settings form ──

const OrgSettingsForm = ({
  orgName,
  org,
  token,
}: {
  orgName: string;
  org?: UserOrg;
  token: string;
}) => {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(org?.display_name ?? '');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateOrg(
        orgName,
        {
          display_name: displayName || undefined,
          description: description || undefined,
          website: website || undefined,
        },
        token,
      );
      queryClient.invalidateQueries({ queryKey: ['myOrgs'] });
      queryClient.invalidateQueries({ queryKey: ['org', orgName] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...cardStyle, padding: 24 }}>
      <Text variant="h4" font="sans" color="primary" as="h3" style={{ margin: '0 0 20px' }}>
        Organization settings
      </Text>
      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Display name</label>
          <input
            style={inputStyle}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="My Team"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Description</label>
          <input
            style={inputStyle}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this organization do?"
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Website</label>
          <input
            style={inputStyle}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            type="url"
          />
        </div>
        {error && (
          <Text variant="body-sm" font="sans" as="div" style={{ color: 'var(--color-red)', marginBottom: 12 }}>
            {error}
          </Text>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              ...btnPrimary,
              fontSize: 13,
              padding: '8px 20px',
              opacity: saving ? 0.5 : 1,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          {saved && (
            <Text variant="body-sm" font="sans" as="span" style={{ color: 'var(--color-accent)' }}>
              Saved
            </Text>
          )}
        </div>
      </form>
    </div>
  );
};
