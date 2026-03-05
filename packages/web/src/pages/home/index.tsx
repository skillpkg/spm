import { useState, useEffect } from 'react';
import { CATEGORIES, type SkillSummary, type Category } from '../../data/constants';
import { getTrending, getCategories, type TrendingSkill, type CategoryItem } from '../../lib/api';
import { HeroSearch } from './HeroSearch';
import { TrendingTabs, type TrendingTab } from './TrendingTabs';
import { CategoryGrid } from './CategoryGrid';

const formatDownloads = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const trendingToSummary = (s: TrendingSkill): SkillSummary => ({
  name: s.name,
  version: s.version ?? '0.0.0',
  desc: s.description,
  author: s.author.username,
  trust: s.author.trust_tier as SkillSummary['trust'],
  downloads: formatDownloads(s.downloads),
  weeklyGrowth: s.weekly_growth_pct ? `+${s.weekly_growth_pct}%` : undefined,
  rating: s.rating_avg != null ? String(s.rating_avg) : undefined,
});

const apiCategoryToCategory = (c: CategoryItem): Category => ({
  name: c.display,
  slug: c.slug,
  icon: c.icon,
  count: c.count,
});

export const Home = () => {
  const [query, setQuery] = useState('');
  const [trendingTab, setTrendingTab] = useState<TrendingTab>('featured');

  // API state for trending tabs
  const [featuredSkills, setFeaturedSkills] = useState<SkillSummary[]>([]);
  const [risingSkills, setRisingSkills] = useState<SkillSummary[]>([]);
  const [mostInstalledSkills, setMostInstalledSkills] = useState<SkillSummary[]>([]);
  const [newSkills, setNewSkills] = useState<SkillSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);

  // Fetch trending data on mount and tab change
  useEffect(() => {
    let cancelled = false;
    const apiTab = trendingTab === 'most-installed' ? 'most_installed' : trendingTab;

    getTrending(apiTab)
      .then((data) => {
        if (cancelled) return;
        const mapped = data.skills.map(trendingToSummary);
        if (mapped.length === 0) return;
        switch (trendingTab) {
          case 'featured':
            setFeaturedSkills(mapped);
            break;
          case 'rising':
            setRisingSkills(mapped);
            break;
          case 'most-installed':
            setMostInstalledSkills(mapped);
            break;
          case 'new':
            setNewSkills(mapped);
            break;
        }
      })
      .catch(() => {
        // On error: leave empty arrays
      });

    return () => {
      cancelled = true;
    };
  }, [trendingTab]);

  // Fetch categories on mount
  useEffect(() => {
    getCategories()
      .then((data) => {
        if (data.categories.length > 0) {
          setCategories(data.categories.map(apiCategoryToCategory));
        }
      })
      .catch(() => {
        // Fallback: keep static categories
      });
  }, []);

  const allSkills = [...featuredSkills, ...risingSkills, ...newSkills];
  const filtered = query.trim()
    ? allSkills.filter(
        (s) =>
          s.name.includes(query.toLowerCase()) ||
          (s.desc || '').toLowerCase().includes(query.toLowerCase()) ||
          s.author.includes(query.toLowerCase()),
      )
    : null;

  const totalSkills = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div>
      <HeroSearch
        totalSkills={totalSkills}
        totalCategories={categories.length}
        query={query}
        setQuery={setQuery}
        filtered={filtered}
      />

      {!filtered && (
        <section style={{ maxWidth: 920, margin: '0 auto', padding: '0 32px 60px' }}>
          <TrendingTabs
            trendingTab={trendingTab}
            setTrendingTab={setTrendingTab}
            featuredSkills={featuredSkills}
            risingSkills={risingSkills}
            mostInstalledSkills={mostInstalledSkills}
            newSkills={newSkills}
          />
          <CategoryGrid categories={categories} />
        </section>
      )}
    </div>
  );
};
