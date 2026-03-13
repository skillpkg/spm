import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

const Breadcrumb = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<'nav'>>(
  ({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />,
);
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.ComponentPropsWithoutRef<'ol'>>(
  ({ style, ...props }, ref) => (
    <ol
      ref={ref}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 4,
        listStyle: 'none',
        fontSize: 13,
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
      {...props}
    />
  ),
);
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<'li'>>(
  ({ style, ...props }, ref) => (
    <li
      ref={ref}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...style }}
      {...props}
    />
  ),
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'> & { asChild?: boolean }
>(({ asChild, style, onMouseEnter, onMouseLeave, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a';
  const [hovered, setHovered] = React.useState(false);
  return (
    <Comp
      ref={ref}
      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      style={{
        color: hovered ? 'var(--color-text-secondary)' : 'var(--color-text-dim)',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'color 0.15s',
        ...style,
      }}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>(
  ({ style, ...props }, ref) => (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      style={{
        color: 'var(--color-text-primary)',
        fontWeight: 500,
        ...style,
      }}
      {...props}
    />
  ),
);
BreadcrumbPage.displayName = 'BreadcrumbPage';

const BreadcrumbSeparator = ({ children, style, ...props }: React.ComponentProps<'li'>) => (
  <li
    role="presentation"
    aria-hidden="true"
    style={{
      color: 'var(--color-text-faint)',
      fontSize: 12,
      margin: '0 2px',
      userSelect: 'none',
      ...style,
    }}
    {...props}
  >
    {children ?? '/'}
  </li>
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
