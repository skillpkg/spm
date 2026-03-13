// shadcn-style primitives (inline-styled for reliable rendering)
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './button';
export { Badge, type BadgeProps, type BadgeVariant } from './badge';
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Input } from './input';
export { SearchInput, type SearchInputProps } from './search-input';

// Legacy-compatible wrappers (drop-in replacements for old @spm/ui components)
export {
  LegacyButton,
  type LegacyButtonProps,
  LegacyBadge,
  type LegacyBadgeProps,
  LegacyCard,
  type LegacyCardProps,
  LegacyBreadcrumb,
  type LegacyBreadcrumbItem,
  type LegacyBreadcrumbProps,
  LegacyTabs,
  type LegacyTabDef,
  type LegacyTabsProps,
} from './compat';
