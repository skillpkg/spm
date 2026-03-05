import { Link } from 'react-router-dom';
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
        <h2
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          Browse by category
        </h2>
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
              <span style={{ fontSize: 14 }}>{cat.icon}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#c8d0dc' }}>
                {cat.name}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                }}
              >
                {cat.count}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
