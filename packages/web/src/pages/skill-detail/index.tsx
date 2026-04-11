import { useParams, Link } from 'react-router-dom';
import { useTabParam } from '../../lib/useTabParam';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@spm/ui';
import { skillDetailQuery } from './queries';
import { apiToSkillFull } from './types';
import { SkillHero } from './SkillHero';
import { ReadmeTab } from './ReadmeTab';
import { VersionsTab } from './VersionsTab';
import { SecurityTab } from './SecurityTab';
import { SkillSidebar } from './SkillSidebar';

export const SkillDetail = () => {
  // Splat route `/skills/*` captures both unscoped (`foo`) and scoped
  // (`@alice/foo`) names as a single param. React Router v7 does not match
  // literal-prefix patterns like `@:scope/:name`, so the splat is required.
  const params = useParams();
  const fullName = decodeURIComponent(params['*'] ?? '');
  const [activeTab, setActiveTab] = useTabParam('tab', 'readme');

  const { data: apiData, isLoading } = useQuery(skillDetailQuery(fullName));
  const skill = apiData ? apiToSkillFull(apiData) : null;

  if (isLoading) {
    return (
      <div
        className="spm-page-wrap"
        style={{ maxWidth: 1060, margin: '0 auto', padding: '24px 32px 60px' }}
      >
        {/* Skeleton hero */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              width: 280,
              height: 28,
              borderRadius: 6,
              background: 'var(--color-bg-card)',
              marginBottom: 12,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: 180,
              height: 16,
              borderRadius: 4,
              background: 'var(--color-bg-card)',
              marginBottom: 20,
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: '0.15s',
            }}
          />
          <div
            style={{
              width: '70%',
              height: 14,
              borderRadius: 4,
              background: 'var(--color-bg-card)',
              marginBottom: 8,
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: '0.3s',
            }}
          />
          <div
            style={{
              width: '50%',
              height: 14,
              borderRadius: 4,
              background: 'var(--color-bg-card)',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: '0.45s',
            }}
          />
        </div>
        {/* Skeleton tabs + content */}
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                gap: 16,
                borderBottom: '1px solid var(--color-border-default)',
                marginBottom: 20,
                paddingBottom: 10,
              }}
            >
              {[100, 80, 70].map((w, i) => (
                <div
                  key={i}
                  style={{
                    width: w,
                    height: 14,
                    borderRadius: 4,
                    background: 'var(--color-bg-card)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  width: `${90 - i * 10}%`,
                  height: 14,
                  borderRadius: 4,
                  background: 'var(--color-bg-card)',
                  marginBottom: 12,
                  animation: 'pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          <div style={{ width: 240, flexShrink: 0 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 6,
                  background: 'var(--color-bg-card)',
                  marginBottom: 12,
                  animation: 'pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }`}</style>
      </div>
    );
  }

  if (!skill) {
    return (
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '64px 32px', textAlign: 'center' }}>
        <Text variant="h2" font="sans" color="dim" as="div" style={{ marginBottom: 16 }}>
          Skill not found
        </Text>
        <Link
          to="/"
          style={{
            color: 'var(--color-accent)',
            textDecoration: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
          }}
        >
          Back to registry
        </Link>
      </div>
    );
  }

  return (
    <div
      className="spm-page-wrap"
      style={{ maxWidth: 1060, margin: '0 auto', padding: '24px 32px 60px' }}
    >
      <SkillHero skill={skill} />

      {/* Content: tabs + sidebar */}
      <div className="spm-skill-layout" style={{ display: 'flex', gap: 24 }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              borderBottom: '1px solid var(--color-border-default)',
              marginBottom: 20,
            }}
          >
            {(
              [
                { id: 'readme' as const, label: 'README' },
                { id: 'versions' as const, label: `Versions (${skill.versions?.length || 0})` },
                { id: 'security' as const, label: 'Security' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '10px 18px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderBottom:
                    activeTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
                  color: activeTab === tab.id ? '#e2e8f0' : '#64748b',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'readme' && <ReadmeTab skill={skill} />}
          {activeTab === 'versions' && <VersionsTab skill={skill} />}
          {activeTab === 'security' && <SecurityTab skill={skill} />}
        </div>

        <SkillSidebar skill={skill} />
      </div>
    </div>
  );
};
