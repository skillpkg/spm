export const CATEGORIES = [
  'documents',
  'data-viz',
  'frontend',
  'backend',
  'infra',
  'testing',
  'code-quality',
  'security',
  'productivity',
  'other',
] as const;

export type SkillCategory = (typeof CATEGORIES)[number];

export const CATEGORY_INFO: Record<
  SkillCategory,
  { display: string; icon: string; description: string }
> = {
  documents: {
    display: 'Documents',
    icon: '📄',
    description: 'PDF, DOCX, PPTX, XLSX, text processing',
  },
  'data-viz': {
    display: 'Data & Visualization',
    icon: '📊',
    description: 'Charts, dashboards, CSV/JSON, analytics',
  },
  frontend: { display: 'Frontend', icon: '🎨', description: 'UI, React, HTML/CSS, design systems' },
  backend: {
    display: 'Backend',
    icon: '🔌',
    description: 'API, GraphQL, REST, database, migrations',
  },
  infra: {
    display: 'Infrastructure',
    icon: '⚙️',
    description: 'Docker, CI/CD, deploy, cloud, IaC',
  },
  testing: { display: 'Testing', icon: '🧪', description: 'Test generation, coverage, benchmarks' },
  'code-quality': {
    display: 'Code Quality',
    icon: '✨',
    description: 'Linting, standards, review, refactoring',
  },
  security: {
    display: 'Security',
    icon: '🛡',
    description: 'Auth, encryption, vulnerability scanning',
  },
  productivity: {
    display: 'Productivity',
    icon: '⚡',
    description: 'Git, terminal, workflow automation',
  },
  other: { display: 'Other', icon: '📦', description: "Doesn't fit above categories" },
};
