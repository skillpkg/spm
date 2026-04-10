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
  const { scope, name } = useParams<{ scope?: string; name: string }>();
  const fullName = scope ? `@${scope}/${name}` : name!;
  const [activeTab, setActiveTab] = useTabParam('tab', 'readme');

  const { data: apiData, isLoading } = useQuery(skillDetailQuery(fullName));
  const skill = apiData ? apiToSkillFull(apiData) : null;

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '64px 32px', textAlign: 'center' }}>
        <Text variant="h4" font="sans" color="muted" as="div">
          Loading skill...
        </Text>
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
      style={{ maxWidth: 1060, margin: '0 auto', padding: '0 32px 60px' }}
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
