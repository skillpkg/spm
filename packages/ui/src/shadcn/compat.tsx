/**
 * Backward-compatible wrappers that map old @spm/ui component APIs
 * to shadcn/ui components. Consumers import from '@spm/ui/shadcn'.
 */
import * as React from 'react';
import { Button as ShadcnButton, type ButtonProps as ShadcnButtonProps } from './button';
import { Badge as ShadcnBadge, type BadgeProps as ShadcnBadgeProps } from './badge';
import { Card as ShadcnCard } from './card';
import {
  Breadcrumb as ShadcnBreadcrumb,
  BreadcrumbList,
  BreadcrumbItem as ShadcnBreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb';
import { Tabs as ShadcnTabs, TabsList, TabsTrigger } from './tabs';

/* ─── Button compat ─────────────────────────────────────────── */

const BUTTON_COLOR_TO_VARIANT: Record<string, ShadcnButtonProps['variant']> = {
  accent: 'default',
  green: 'green',
  red: 'destructive',
  blue: 'outline',
  cyan: 'cyan',
  'text-dim': 'secondary',
  'text-secondary': 'secondary',
};

export interface LegacyButtonProps {
  label: string;
  color: string;
  onClick?: () => void;
  small?: boolean;
}

export const LegacyButton = ({ label, color, onClick, small }: LegacyButtonProps) => (
  <ShadcnButton
    variant={BUTTON_COLOR_TO_VARIANT[color] ?? 'default'}
    size={small ? 'sm' : 'default'}
    onClick={onClick}
  >
    {label}
  </ShadcnButton>
);

/* ─── Badge compat ──────────────────────────────────────────── */

const BADGE_COLOR_TO_VARIANT: Record<string, ShadcnBadgeProps['variant']> = {
  accent: 'accent',
  cyan: 'cyan',
  blue: 'blue',
  red: 'red',
  purple: 'purple',
  yellow: 'yellow',
  orange: 'yellow',
  'text-secondary': 'secondary',
  'text-dim': 'secondary',
  '#818cf8': 'purple',
  green: 'accent',
};

export interface LegacyBadgeProps {
  label: string;
  color: string;
}

export const LegacyBadge = ({ label, color }: LegacyBadgeProps) => (
  <ShadcnBadge variant={BADGE_COLOR_TO_VARIANT[color] ?? 'default'}>{label}</ShadcnBadge>
);

/* ─── Card compat (direct pass-through) ────────────────────── */

export interface LegacyCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const LegacyCard = ({ children, className, style }: LegacyCardProps) => (
  <ShadcnCard className={className} style={style}>
    {children}
  </ShadcnCard>
);

/* ─── Breadcrumb compat ─────────────────────────────────────── */

export interface LegacyBreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface LegacyBreadcrumbProps {
  items: LegacyBreadcrumbItem[];
}

export const LegacyBreadcrumb = ({ items }: LegacyBreadcrumbProps) => {
  if (items.length === 0) return null;

  return (
    <ShadcnBreadcrumb>
      <BreadcrumbList>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <React.Fragment key={item.label}>
              {i > 0 && <BreadcrumbSeparator />}
              <ShadcnBreadcrumbItem>
                {isLast || (!item.href && !item.onClick) ? (
                  isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <span style={{ color: 'var(--color-text-dim)', fontSize: 13 }}>
                      {item.label}
                    </span>
                  )
                ) : (
                  <BreadcrumbLink
                    href={item.href ?? '#'}
                    onClick={
                      item.onClick
                        ? (e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.preventDefault();
                            item.onClick!();
                          }
                        : undefined
                    }
                  >
                    {item.label}
                  </BreadcrumbLink>
                )}
              </ShadcnBreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </ShadcnBreadcrumb>
  );
};

/* ─── Tabs compat ───────────────────────────────────────────── */

export interface LegacyTabDef {
  id: string;
  label: string;
  count?: number;
  countColor?: string;
}

export interface LegacyTabsProps {
  tabs: LegacyTabDef[];
  active: string;
  onChange: (id: string) => void;
}

export const LegacyTabs = ({ tabs, active, onChange }: LegacyTabsProps) => (
  <ShadcnTabs value={active} onValueChange={onChange}>
    <TabsList>
      {tabs.map((tab) => (
        <TabsTrigger key={tab.id} value={tab.id}>
          {tab.label}
          {tab.count != null && (
            <span
              style={{
                marginLeft: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 10,
                backgroundColor: 'rgba(16,185,129,0.1)',
                color: '#10b981',
              }}
            >
              {tab.count}
            </span>
          )}
        </TabsTrigger>
      ))}
    </TabsList>
  </ShadcnTabs>
);
