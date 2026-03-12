import { Link } from 'react-router-dom';
import { Text } from '@spm/ui';
import { type Category } from '../../data/constants';

interface CategoryGridProps {
  categories: Category[];
}

export const CategoryGrid = ({ categories }: CategoryGridProps) => {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <Text variant="h4" font="sans" color="secondary" as="h2" style={{ margin: 0 }}>
          Browse by category
        </Text>
        <Link
          to="/search"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--color-accent)',
            textDecoration: 'none',
          }}
        >
          All categories &rarr;
        </Link>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((cat) => (
          <Link
            key={cat.name}
            to={`/search?category=${cat.slug}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <Text variant="body" as="span" style={{ fontSize: 14 }}>
                {cat.icon}
              </Text>
              <Text variant="body-sm" font="sans" as="span" style={{ color: '#c8d0dc' }}>
                {cat.name}
              </Text>
              <Text variant="label" font="mono" color="muted" as="span">
                {cat.count}
              </Text>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
