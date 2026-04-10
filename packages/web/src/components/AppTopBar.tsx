import { useLocation } from 'react-router-dom';
import { TopBar } from '@spm/ui';
import {
  LegacyBreadcrumb as Breadcrumb,
  type LegacyBreadcrumbItem as BreadcrumbItem,
} from '@spm/ui/shadcn';
import { docSections, docSlugToLabel } from '../data/docSections';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/search': 'Search',
  '/docs': 'Docs',
  '/cli': 'CLI Reference',
  '/publish': 'Publishing',
  '/dashboard': 'Dashboard',
  '/signin': 'Sign In',
};

const deriveBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  if (pathname === '/') return [{ label: 'Home' }];

  const crumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

  // Skill detail: /skills/:name or /skills/@:scope/:name
  if (pathname.startsWith('/skills/')) {
    const segments = pathname.split('/');
    const segment2 = decodeURIComponent(segments[2] ?? '');
    const name =
      segment2.startsWith('@') && segments[3]
        ? `${segment2}/${decodeURIComponent(segments[3])}`
        : segment2;
    crumbs.push({ label: 'Search', href: '/search' });
    crumbs.push({ label: name });
    return crumbs;
  }

  // Author profile: /authors/:username
  if (pathname.startsWith('/authors/')) {
    const username = decodeURIComponent(pathname.split('/')[2] ?? '');
    crumbs.push({ label: `@${username}` });
    return crumbs;
  }

  // Doc detail: /docs/:slug
  if (pathname.startsWith('/docs/')) {
    const slug = decodeURIComponent(pathname.split('/')[2] ?? '');
    crumbs.push({ label: 'Docs', href: '/docs' });
    const section = docSections.find((s) => s.items.some((i) => i.slug === slug));
    if (section) {
      crumbs.push({ label: section.title, href: `/docs/${section.items[0].slug}` });
    }
    crumbs.push({ label: docSlugToLabel[slug] ?? slug });
    return crumbs;
  }

  const label = ROUTE_LABELS[pathname] ?? pathname.slice(1);
  crumbs.push({ label });
  return crumbs;
};

export const AppTopBar = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const { pathname } = useLocation();

  return (
    <TopBar left={<Breadcrumb items={deriveBreadcrumbs(pathname)} />} onMenuClick={onMenuClick} />
  );
};
