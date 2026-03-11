import type { ReactNode } from 'react';

export interface SidebarLayoutProps {
  /** The Sidebar component */
  sidebar: ReactNode;
  /** Main page content */
  children: ReactNode;
  /** Sidebar width — must match the Sidebar width prop (default 240) */
  sidebarWidth?: number;
  /** Optional top bar rendered above the main content */
  topBar?: ReactNode;
}

export const SidebarLayout = ({
  sidebar,
  children,
  sidebarWidth = 240,
  topBar,
}: SidebarLayoutProps) => (
  <div
    style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--color-bg)',
      color: 'var(--color-text-primary)',
    }}
  >
    {sidebar}
    <div
      style={{
        flex: 1,
        marginLeft: sidebarWidth,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      {topBar}
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  </div>
);
