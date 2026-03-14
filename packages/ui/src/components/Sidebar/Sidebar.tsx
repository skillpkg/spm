import { useState, type ReactNode } from 'react';
import { withAlpha } from '../../utils/colors';

/* ── Types ── */

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  badge?: string;
  badgeColor?: string;
  /** Indent level for sub-items (default 0) */
  indent?: number;
}

export interface SidebarProps {
  /** Logo / branding slot rendered at the top */
  header: ReactNode;
  /** Navigation sections */
  sections: SidebarSection[];
  /** Currently active item id */
  activeId?: string;
  /** Footer slot (user info, sign out, etc.) */
  footer?: ReactNode;
  /** Width in px (default 240) */
  width?: number;
  /** Whether the sidebar is collapsed on mobile */
  mobileOpen?: boolean;
  /** Called when mobile overlay is tapped */
  onMobileClose?: () => void;
}

/* ── Sub-components ── */

const SectionTitle = ({ title }: { title: string }) => (
  <div
    style={{
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--color-text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      padding: '16px 16px 6px',
    }}
  >
    {title}
  </div>
);

const NavItem = ({ item, isActive }: { item: SidebarItem; isActive: boolean }) => {
  const [hovered, setHovered] = useState(false);

  const indent = item.indent ?? 0;
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 16px',
    paddingLeft: 16 + indent * 14,
    margin: '1px 8px',
    borderRadius: 8,
    fontFamily: 'var(--font-sans)',
    fontSize: indent ? 12.5 : 13,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-dim)',
    background: isActive
      ? withAlpha('var(--color-accent)', 0.08)
      : hovered
        ? 'var(--color-bg-hover)'
        : 'transparent',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
    border: 'none',
    width: 'calc(100% - 16px)',
    textAlign: 'left',
  };

  const content = (
    <>
      {item.icon && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            width: 18,
            height: 18,
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
            flexShrink: 0,
          }}
        >
          {item.icon}
        </span>
      )}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            padding: '1px 6px',
            borderRadius: 4,
            backgroundColor: withAlpha(item.badgeColor ?? 'var(--color-accent)', 0.12),
            color: item.badgeColor ?? 'var(--color-accent)',
          }}
        >
          {item.badge}
        </span>
      )}
      {item.external && (
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>&rarr;</span>
      )}
    </>
  );

  const handlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };

  if (item.href) {
    return (
      <a
        href={item.href}
        style={style}
        {...handlers}
        target={item.external ? '_blank' : undefined}
        rel={item.external ? 'noopener noreferrer' : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={item.onClick} style={style} {...handlers}>
      {content}
    </button>
  );
};

/* ── Main Component ── */

export const Sidebar = ({
  header,
  sections,
  activeId,
  footer,
  width = 240,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) => {
  const sidebarContent = (
    <aside
      style={{
        width,
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg)',
        borderRight: '1px solid var(--color-border-default)',
        zIndex: 200,
        overflow: 'hidden',
      }}
    >
      {/* Header / Logo */}
      <div style={{ padding: '16px 16px 8px', flexShrink: 0 }}>{header}</div>

      {/* Nav sections */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {sections.map((section, i) => (
          <div key={section.title ?? `section-${i}`}>
            {section.title && <SectionTitle title={section.title} />}
            {section.items.map((item) => (
              <NavItem key={item.id} item={item} isActive={activeId === item.id} />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid var(--color-border-default)',
            padding: '12px 16px',
          }}
        >
          {footer}
        </div>
      )}
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="sidebar-desktop" style={{ display: 'contents' }}>
        {sidebarContent}
      </div>

      {/* Mobile: overlay + sidebar when open */}
      {mobileOpen && (
        <>
          <div
            onClick={onMobileClose}
            data-testid="sidebar-overlay"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 199,
            }}
          />
          <div className="sidebar-mobile" style={{ display: 'contents' }}>
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
};
