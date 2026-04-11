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
        {/* Skeleton hero — matches SkillHero layout */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: 24,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 12,
            marginBottom: 24,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title */}
            <div className="skel-shimmer" style={{ width: 260, height: 28, borderRadius: 6, marginBottom: 8 }} />
            {/* Scope / author */}
            <div className="skel-shimmer" style={{ width: 120, height: 14, borderRadius: 4, marginBottom: 12 }} />
            {/* Version + trust badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div className="skel-shimmer" style={{ width: 56, height: 20, borderRadius: 4 }} />
              <div className="skel-shimmer" style={{ width: 72, height: 22, borderRadius: 10 }} />
            </div>
            {/* Description */}
            <div className="skel-shimmer" style={{ width: '80%', height: 14, borderRadius: 4, marginBottom: 6 }} />
            <div className="skel-shimmer" style={{ width: '55%', height: 14, borderRadius: 4, marginBottom: 16 }} />
            {/* Category badges */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <div className="skel-shimmer" style={{ width: 64, height: 22, borderRadius: 4 }} />
              <div className="skel-shimmer" style={{ width: 80, height: 22, borderRadius: 4 }} />
            </div>
            {/* Tags */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[52, 64, 48, 56].map((w, j) => (
                <div key={j} className="skel-shimmer" style={{ width: w, height: 22, borderRadius: 4, border: '1px solid var(--color-border-default)' }} />
              ))}
            </div>
          </div>
          {/* Install box */}
          <div style={{ width: 220, flexShrink: 0, marginLeft: 24 }}>
            <div className="skel-shimmer" style={{ width: '100%', height: 36, borderRadius: 6, marginBottom: 8 }} />
            <div className="skel-shimmer" style={{ width: '60%', height: 12, borderRadius: 4 }} />
          </div>
        </div>

        {/* Skeleton tabs + content — matches tab bar + readme + sidebar */}
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Tab bar */}
            <div
              style={{
                display: 'flex',
                gap: 0,
                borderBottom: '1px solid var(--color-border-default)',
                marginBottom: 20,
              }}
            >
              {[64, 90, 68].map((w, i) => (
                <div key={i} style={{ padding: '10px 18px' }}>
                  <div className="skel-shimmer" style={{ width: w, height: 14, borderRadius: 4 }} />
                </div>
              ))}
            </div>
            {/* README content lines */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="skel-shimmer"
                style={{
                  width: `${95 - i * 7}%`,
                  height: i === 1 ? 20 : 13,
                  borderRadius: 4,
                  marginBottom: i === 1 ? 16 : 10,
                }}
              />
            ))}
          </div>
          {/* Sidebar */}
          <aside style={{ width: 240, flexShrink: 0 }}>
            {[56, 100, 100, 80, 100, 60].map((pct, i) => (
              <div key={i} className="skel-shimmer" style={{ width: `${pct}%`, height: i === 0 ? 18 : 14, borderRadius: 4, marginBottom: i === 0 ? 12 : 8 }} />
            ))}
            <div style={{ height: 16 }} />
            {[56, 100, 80].map((pct, i) => (
              <div key={`b${i}`} className="skel-shimmer" style={{ width: `${pct}%`, height: i === 0 ? 18 : 14, borderRadius: 4, marginBottom: i === 0 ? 12 : 8 }} />
            ))}
          </aside>
        </div>

        <style>{`
          @keyframes shimmer {
            0% { background-position: -400px 0; }
            100% { background-position: 400px 0; }
          }
          .skel-shimmer {
            background: linear-gradient(
              90deg,
              rgba(255,255,255,0.03) 25%,
              rgba(255,255,255,0.08) 50%,
              rgba(255,255,255,0.03) 75%
            );
            background-size: 800px 100%;
            animation: shimmer 1.8s ease-in-out infinite;
          }
        `}</style>
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
