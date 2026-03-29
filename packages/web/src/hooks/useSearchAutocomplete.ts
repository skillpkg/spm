import { useQuery } from '@tanstack/react-query';
import { searchAuthors, searchTags, getCategories } from '../lib/api';

export type AutocompleteMode = 'author' | 'category' | 'tag' | null;

export interface AutocompleteItem {
  key: string;
  label: string;
  sublabel: string;
  icon?: string;
  badge?: { trust_tier: string };
  navigateTo: string;
}

interface PrefixMatch {
  mode: AutocompleteMode;
  prefix: string;
}

const detectPrefix = (query: string): PrefixMatch => {
  const authorMatch = query.match(/^author:(\S*)$/i);
  if (authorMatch) return { mode: 'author', prefix: authorMatch[1] ?? '' };

  const categoryMatch = query.match(/^category:(\S*)$/i);
  if (categoryMatch) return { mode: 'category', prefix: categoryMatch[1] ?? '' };

  const tagMatch = query.match(/^tag:(\S*)$/i);
  if (tagMatch) return { mode: 'tag', prefix: tagMatch[1] ?? '' };

  return { mode: null, prefix: '' };
};

export const useSearchAutocomplete = (debouncedQuery: string, focused: boolean) => {
  const { mode, prefix } = detectPrefix(debouncedQuery);

  // Author search (API-backed)
  const { data: authorData, isFetching: isFetchingAuthors } = useQuery({
    queryKey: ['authors', prefix],
    queryFn: () => searchAuthors(prefix, 8),
    enabled: mode === 'author' && prefix.length >= 1,
  });

  // Category search (cached, client-side filtered)
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: mode === 'category',
    staleTime: 60_000,
  });

  // Tag search (API-backed)
  const { data: tagData, isFetching: isFetchingTags } = useQuery({
    queryKey: ['tags', prefix],
    queryFn: () => searchTags(prefix, 15),
    enabled: mode === 'tag' && prefix.length >= 1,
  });

  // Build normalized items
  let items: AutocompleteItem[] = [];
  let isFetching = false;

  if (mode === 'author') {
    isFetching = isFetchingAuthors;
    items = (authorData?.authors ?? []).map((a) => ({
      key: a.username,
      label: `@${a.username}`,
      sublabel: `${a.skill_count} skill${a.skill_count !== 1 ? 's' : ''}`,
      badge: { trust_tier: a.trust_tier },
      navigateTo: `/search?q=${encodeURIComponent(`author:${a.username}`)}`,
    }));
  } else if (mode === 'category') {
    const filtered = (categoriesData?.categories ?? []).filter((c) =>
      c.slug.toLowerCase().startsWith(prefix.toLowerCase()),
    );
    items = filtered.map((c) => ({
      key: c.slug,
      label: c.display,
      sublabel: `${c.count} skill${c.count !== 1 ? 's' : ''}`,
      icon: c.icon,
      navigateTo: `/search?category=${encodeURIComponent(c.slug)}`,
    }));
  } else if (mode === 'tag') {
    isFetching = isFetchingTags;
    items = (tagData?.tags ?? []).map((t) => ({
      key: t.tag,
      label: t.tag,
      sublabel: `${t.count} skill${t.count !== 1 ? 's' : ''}`,
      navigateTo: `/search?q=${encodeURIComponent(`tag:${t.tag}`)}`,
    }));
  }

  const showDropdown = focused && mode !== null && (mode === 'category' || prefix.length >= 1);

  const emptyMessage =
    mode && !isFetching && items.length === 0 && (mode === 'category' || prefix.length >= 1)
      ? `No ${mode === 'author' ? 'authors' : mode === 'category' ? 'categories' : 'tags'} matching "${prefix}"`
      : null;

  return {
    mode,
    prefix,
    items,
    isFetching,
    showDropdown,
    emptyMessage,
  };
};
