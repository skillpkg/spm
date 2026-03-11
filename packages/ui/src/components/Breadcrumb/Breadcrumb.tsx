import { useState } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Separator = () => (
  <span
    style={{
      color: 'var(--color-text-faint)',
      fontSize: 12,
      margin: '0 2px',
      userSelect: 'none',
    }}
  >
    /
  </span>
);

const CrumbLink = ({ item, isLast }: { item: BreadcrumbItem; isLast: boolean }) => {
  const [hovered, setHovered] = useState(false);

  if (isLast || (!item.href && !item.onClick)) {
    return (
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: isLast ? 'var(--color-text-primary)' : 'var(--color-text-dim)',
          fontWeight: isLast ? 500 : 400,
        }}
      >
        {item.label}
      </span>
    );
  }

  const handleClick = item.onClick
    ? (e: React.MouseEvent) => {
        e.preventDefault();
        item.onClick!();
      }
    : undefined;

  return (
    <a
      href={item.href ?? '#'}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: hovered ? 'var(--color-text-secondary)' : 'var(--color-text-dim)',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'color 0.15s',
      }}
    >
      {item.label}
    </a>
  );
};

export const Breadcrumb = ({ items }: BreadcrumbProps) => {
  if (items.length === 0) return null;

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {items.map((item, i) => (
        <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <Separator />}
          <CrumbLink item={item} isLast={i === items.length - 1} />
        </span>
      ))}
    </nav>
  );
};
