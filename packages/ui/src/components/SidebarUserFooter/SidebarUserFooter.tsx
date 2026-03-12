export interface SidebarUserFooterProps {
  username: string;
  avatarUrl?: string;
  onSignOut: () => void;
}

export const SidebarUserFooter = ({ username, avatarUrl, onSignOut }: SidebarUserFooterProps) => {
  const src = avatarUrl ?? `https://github.com/${username}.png?size=28`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img
        src={src}
        alt={username}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1px solid var(--color-border-default)',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {username}
        </div>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 6px',
          flexShrink: 0,
        }}
      >
        Sign out
      </button>
    </div>
  );
};
