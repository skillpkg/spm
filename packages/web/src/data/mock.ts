export type TrustTier = 'official' | 'verified' | 'scanned' | 'registered';

export interface SkillSummary {
  name: string;
  version: string;
  desc: string;
  author: string;
  trust: TrustTier;
  downloads: string;
  weeklyGrowth?: string;
  rating?: string;
  tags?: string[];
  daysAgo?: number;
}

export interface SkillVersion {
  v: string;
  date: string;
  changes: string;
}

export interface SkillFull extends SkillSummary {
  longDesc: string;
  weeklyDownloads: string;
  reviews: number;
  license: string;
  published: string;
  updated: string;
  size: string;
  platforms: string[];
  category: string;
  versions: SkillVersion[];
  dependencies: {
    skills: string[];
    system: string[];
    pip: string[];
  };
  security: {
    signed: boolean;
    signer?: string;
    scanned: string;
    layers: string[];
  };
  repo: string;
}

export interface Category {
  name: string;
  slug: string;
  icon: string;
  count: number;
}

export interface SearchSuggestion {
  query: string;
  results: string;
}

export const CATEGORIES: Category[] = [
  { name: 'Documents', slug: 'documents', icon: '📄', count: 34 },
  { name: 'Data & Visualization', slug: 'data-viz', icon: '📊', count: 28 },
  { name: 'Frontend', slug: 'frontend', icon: '🎨', count: 22 },
  { name: 'Backend', slug: 'backend', icon: '🔌', count: 18 },
  { name: 'Infrastructure', slug: 'infra', icon: '⚙️', count: 19 },
  { name: 'Testing', slug: 'testing', icon: '🧪', count: 16 },
  { name: 'Code Quality', slug: 'code-quality', icon: '✨', count: 10 },
  { name: 'Security', slug: 'security', icon: '🛡', count: 9 },
  { name: 'Productivity', slug: 'productivity', icon: '⚡', count: 11 },
];

export const FEATURED: SkillSummary[] = [
  {
    name: 'pdf',
    version: '2.0.3',
    desc: 'Read, create, merge, split, and fill PDF documents',
    author: 'anthropic',
    trust: 'official',
    downloads: '45.1k',
    weeklyGrowth: '+12%',
    rating: '4.9',
    tags: ['documents', 'forms', 'ocr'],
  },
  {
    name: 'frontend-design',
    version: '1.4.1',
    desc: 'Create distinctive, production-grade frontend interfaces with high design quality',
    author: 'anthropic',
    trust: 'official',
    downloads: '38.2k',
    weeklyGrowth: '+18%',
    rating: '4.8',
    tags: ['react', 'html', 'css', 'ui'],
  },
  {
    name: 'data-viz',
    version: '1.2.3',
    desc: 'Charts, dashboards, and visualizations from CSV, JSON, or database output',
    author: 'almog',
    trust: 'verified',
    downloads: '12.4k',
    weeklyGrowth: '+31%',
    rating: '4.8',
    tags: ['charts', 'plotly', 'd3', 'dashboards'],
  },
];

export const RISING: SkillSummary[] = [
  {
    name: 'db-migrate',
    version: '2.0.1',
    desc: 'Generate and run database migrations from schema diffs',
    author: 'sarah',
    trust: 'verified',
    downloads: '9.7k',
    weeklyGrowth: '+45%',
    rating: '4.6',
  },
  {
    name: 'test-gen',
    version: '0.9.2',
    desc: 'Auto-generate unit and integration tests from source code',
    author: 'chen',
    trust: 'scanned',
    downloads: '4.8k',
    weeklyGrowth: '+62%',
    rating: '4.3',
  },
  {
    name: 'api-scaffold',
    version: '1.1.0',
    desc: 'Generate REST and GraphQL APIs from schema definitions',
    author: 'mike',
    trust: 'verified',
    downloads: '7.2k',
    weeklyGrowth: '+28%',
    rating: '4.5',
  },
  {
    name: 'docker-deploy',
    version: '1.3.0',
    desc: 'Build Dockerfiles and compose stacks from project analysis',
    author: 'ops-team',
    trust: 'verified',
    downloads: '6.1k',
    weeklyGrowth: '+39%',
    rating: '4.4',
  },
  {
    name: 'sql-query',
    version: '2.2.0',
    desc: 'Generate and optimize SQL queries from natural language',
    author: 'sarah',
    trust: 'verified',
    downloads: '8.9k',
    weeklyGrowth: '+22%',
    rating: '4.7',
  },
];

export const MOST_INSTALLED: SkillSummary[] = [
  {
    name: 'pdf',
    version: '2.0.3',
    desc: 'Read, create, merge, split, and fill PDF documents',
    author: 'anthropic',
    trust: 'official',
    downloads: '45.1k',
    rating: '4.9',
  },
  {
    name: 'frontend-design',
    version: '1.4.1',
    desc: 'Create distinctive, production-grade frontend interfaces with high design quality',
    author: 'anthropic',
    trust: 'official',
    downloads: '38.2k',
    rating: '4.8',
  },
  {
    name: 'xlsx',
    version: '3.1.0',
    desc: 'Read, write, and transform Excel spreadsheets',
    author: 'anthropic',
    trust: 'official',
    downloads: '31.5k',
    rating: '4.7',
  },
  {
    name: 'docx',
    version: '1.8.0',
    desc: 'Read and generate Word documents',
    author: 'anthropic',
    trust: 'official',
    downloads: '28.3k',
    rating: '4.7',
  },
  {
    name: 'pptx',
    version: '1.5.0',
    desc: 'Create and edit PowerPoint presentations',
    author: 'anthropic',
    trust: 'official',
    downloads: '22.1k',
    rating: '4.6',
  },
];

export const NEW_THIS_WEEK: SkillSummary[] = [
  {
    name: 'grpc-gen',
    version: '0.1.0',
    desc: 'Generate gRPC service stubs from proto files',
    author: 'proto-dev',
    trust: 'scanned',
    downloads: '340',
    daysAgo: 2,
  },
  {
    name: 'csv-clean',
    version: '1.0.0',
    desc: 'Auto-detect and fix malformed CSV data',
    author: 'data-dave',
    trust: 'scanned',
    downloads: '520',
    daysAgo: 3,
  },
  {
    name: 'svg-icon',
    version: '0.2.1',
    desc: 'Generate custom SVG icons from descriptions',
    author: 'icon-lab',
    trust: 'registered',
    downloads: '180',
    daysAgo: 5,
  },
  {
    name: 'env-vault',
    version: '1.0.0',
    desc: 'Manage environment variables securely across projects',
    author: 'sec-tools',
    trust: 'verified',
    downloads: '890',
    daysAgo: 1,
  },
];

export const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  { query: 'pdf processing', results: '12 skills' },
  { query: 'data visualization', results: '8 skills' },
  { query: 'database migration', results: '6 skills' },
  { query: 'frontend components', results: '15 skills' },
  { query: 'docker deploy', results: '4 skills' },
];

export const ALL_SKILLS: SkillSummary[] = [...FEATURED, ...RISING, ...NEW_THIS_WEEK];

export const CATEGORY_NAMES = [
  'All',
  'Documents',
  'Data & Visualization',
  'Frontend',
  'Backend',
  'Infrastructure',
  'Testing',
  'Code Quality',
  'Security',
  'Productivity',
] as const;

export const CATEGORY_SLUGS: Record<string, string> = {
  Documents: 'documents',
  'Data & Visualization': 'data-viz',
  Frontend: 'frontend',
  Backend: 'backend',
  Infrastructure: 'infra',
  Testing: 'testing',
  'Code Quality': 'code-quality',
  Security: 'security',
  Productivity: 'productivity',
};

export const TRUST_TIERS = ['All', 'Official', 'Verified', 'Scanned', 'Registered'] as const;

export const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'downloads', label: 'Most downloads' },
  { id: 'rating', label: 'Highest rated' },
  { id: 'updated', label: 'Recently updated' },
  { id: 'new', label: 'Newest' },
] as const;

export const TRUST_CONFIG: Record<
  TrustTier,
  { label: string; color: string; checks: string; bg: string }
> = {
  official: {
    label: 'Official',
    color: '#10b981',
    checks: '\u2713\u2713\u2713',
    bg: 'rgba(16,185,129,0.08)',
  },
  verified: {
    label: 'Verified',
    color: '#10b981',
    checks: '\u2713\u2713',
    bg: 'rgba(16,185,129,0.06)',
  },
  scanned: {
    label: 'Scanned',
    color: '#3b82f6',
    checks: '\u2713',
    bg: 'rgba(59,130,246,0.06)',
  },
  registered: {
    label: 'Registered',
    color: '#64748b',
    checks: '\u25CB',
    bg: 'rgba(148,163,184,0.05)',
  },
};

export const SKILLS_DB: SkillFull[] = [
  {
    name: 'pdf',
    version: '2.0.3',
    desc: 'Read, create, merge, split, and fill PDF documents',
    longDesc:
      'A comprehensive PDF skill that handles the full lifecycle of PDF documents. Supports reading and extracting text from existing PDFs, creating new documents with rich formatting, merging multiple files, splitting pages, rotating, adding watermarks, filling form fields, and basic OCR for scanned documents.\n\nBuilt on top of proven libraries (pdf-lib, pdfjs-dist) with optimized workflows for common agent tasks. Includes templates for reports, invoices, and letters.',
    author: 'anthropic',
    trust: 'official',
    downloads: '45,100',
    weeklyDownloads: '3,200',
    rating: '4.9',
    reviews: 342,
    license: 'MIT',
    published: '2026-01-10',
    updated: '2026-02-20',
    size: '34 KB',
    platforms: ['all'],
    category: 'documents',
    tags: ['documents', 'forms', 'ocr', 'merge', 'split'],
    versions: [
      {
        v: '2.0.3',
        date: '2026-02-20',
        changes: 'Fixed OCR encoding for CJK characters',
      },
      {
        v: '2.0.2',
        date: '2026-02-01',
        changes: 'Added watermark opacity control',
      },
      {
        v: '2.0.0',
        date: '2026-01-10',
        changes: 'Major rewrite: new template system, form filling',
      },
      {
        v: '1.5.1',
        date: '2025-11-28',
        changes: 'Bug fixes for merge with bookmarks',
      },
    ],
    dependencies: {
      skills: [],
      system: ['python >=3.10'],
      pip: ['pdf-lib', 'pdfjs-dist'],
    },
    security: {
      signed: true,
      signer: 'anthropic@github',
      scanned: 'passed',
      layers: ['pattern: clean', 'ml: 0.01 (safe)', 'lakera: passed'],
    },
    repo: 'https://github.com/anthropic/spm-pdf',
  },
  {
    name: 'frontend-design',
    version: '1.4.1',
    desc: 'Create distinctive, production-grade frontend interfaces with high design quality',
    longDesc:
      'Guides creation of distinctive, production-grade frontend interfaces that avoid generic aesthetics. Covers typography, color systems, motion design, spatial composition, and visual details.\n\nSupports HTML/CSS, React, Vue, and Svelte output. Includes comprehensive guidelines for making bold design choices while maintaining production quality.',
    author: 'anthropic',
    trust: 'official',
    downloads: '38,200',
    weeklyDownloads: '2,800',
    rating: '4.8',
    reviews: 289,
    license: 'MIT',
    published: '2025-10-15',
    updated: '2026-02-18',
    size: '28 KB',
    platforms: ['all'],
    category: 'frontend',
    tags: ['react', 'html', 'css', 'ui', 'design'],
    versions: [
      {
        v: '1.4.1',
        date: '2026-02-18',
        changes: 'Added Tailwind v4 patterns',
      },
      {
        v: '1.4.0',
        date: '2026-01-20',
        changes: 'Svelte support, dark mode guidelines',
      },
      { v: '1.3.0', date: '2025-12-05', changes: 'Vue component patterns' },
    ],
    dependencies: { skills: [], system: [], pip: [] },
    security: {
      signed: true,
      signer: 'anthropic@github',
      scanned: 'passed',
      layers: ['pattern: clean', 'ml: 0.02 (safe)', 'lakera: passed'],
    },
    repo: 'https://github.com/anthropic/spm-frontend-design',
  },
  {
    name: 'data-viz',
    version: '1.2.3',
    desc: 'Charts, dashboards, and visualizations from CSV, JSON, or database output',
    longDesc:
      'Create beautiful data visualizations from any data source. Supports bar charts, line charts, scatter plots, heatmaps, geographic maps, dashboards, and custom compositions.\n\nAuto-detects data structure and suggests appropriate visualization types. Outputs publication-ready charts using Plotly, D3, or matplotlib depending on context.',
    author: 'almog',
    trust: 'verified',
    downloads: '12,400',
    weeklyDownloads: '1,200',
    rating: '4.8',
    reviews: 142,
    license: 'MIT',
    published: '2025-11-01',
    updated: '2026-02-15',
    size: '22 KB',
    platforms: ['all'],
    category: 'data-viz',
    tags: ['charts', 'plotly', 'd3', 'dashboards', 'matplotlib'],
    versions: [
      {
        v: '1.2.3',
        date: '2026-02-15',
        changes: 'Heatmap support, color palette improvements',
      },
      {
        v: '1.2.0',
        date: '2026-01-05',
        changes: 'Geographic map visualizations',
      },
      { v: '1.1.0', date: '2025-12-10', changes: 'Dashboard layout system' },
    ],
    dependencies: {
      skills: [],
      system: ['python >=3.10'],
      pip: ['plotly', 'pandas', 'seaborn'],
    },
    security: {
      signed: true,
      signer: 'almog@github',
      scanned: 'passed',
      layers: ['pattern: clean', 'ml: 0.03 (safe)', 'lakera: passed'],
    },
    repo: 'https://github.com/almog/data-viz',
  },
  {
    name: 'xlsx',
    version: '3.1.0',
    desc: 'Read, write, and transform Excel spreadsheets',
    longDesc:
      'Full Excel support: read complex workbooks, write formatted spreadsheets, transform data between sheets, handle formulas, charts, and pivot tables.',
    author: 'anthropic',
    trust: 'official',
    downloads: '31,500',
    weeklyDownloads: '2,100',
    rating: '4.7',
    reviews: 231,
    license: 'MIT',
    published: '2025-09-20',
    updated: '2026-02-10',
    size: '31 KB',
    platforms: ['all'],
    category: 'documents',
    tags: ['excel', 'spreadsheet', 'csv', 'data'],
    versions: [{ v: '3.1.0', date: '2026-02-10', changes: 'Pivot table support' }],
    dependencies: { skills: [], system: [], pip: ['openpyxl'] },
    security: {
      signed: true,
      signer: 'anthropic@github',
      scanned: 'passed',
      layers: ['pattern: clean', 'ml: 0.01 (safe)'],
    },
    repo: 'https://github.com/anthropic/spm-xlsx',
  },
  {
    name: 'db-migrate',
    version: '2.0.1',
    desc: 'Generate and run database migrations from schema diffs',
    longDesc:
      'Analyzes your current database schema against a target, generates migration scripts, and applies them safely with rollback support. Supports PostgreSQL, MySQL, and SQLite.',
    author: 'sarah',
    trust: 'verified',
    downloads: '9,700',
    weeklyDownloads: '890',
    rating: '4.6',
    reviews: 87,
    license: 'Apache-2.0',
    published: '2025-12-01',
    updated: '2026-02-22',
    size: '18 KB',
    platforms: ['all'],
    category: 'backend',
    tags: ['database', 'migration', 'postgresql', 'mysql'],
    versions: [{ v: '2.0.1', date: '2026-02-22', changes: 'SQLite support' }],
    dependencies: {
      skills: [],
      system: ['python >=3.10'],
      pip: ['alembic', 'sqlalchemy'],
    },
    security: {
      signed: true,
      signer: 'sarah@github',
      scanned: 'passed',
      layers: ['pattern: clean', 'ml: 0.05 (safe)'],
    },
    repo: 'https://github.com/sarah-dev/db-migrate',
  },
  {
    name: 'test-gen',
    version: '0.9.2',
    desc: 'Auto-generate unit and integration tests from source code',
    longDesc:
      'Analyzes source code structure and generates comprehensive test suites. Supports Python (pytest), TypeScript (vitest/jest), and Go testing frameworks.',
    author: 'chen',
    trust: 'scanned',
    downloads: '4,800',
    weeklyDownloads: '620',
    rating: '4.3',
    reviews: 45,
    license: 'MIT',
    published: '2026-01-15',
    updated: '2026-02-25',
    size: '15 KB',
    platforms: ['claude-code', 'cursor'],
    category: 'testing',
    tags: ['testing', 'pytest', 'vitest', 'jest', 'automation'],
    versions: [{ v: '0.9.2', date: '2026-02-25', changes: 'Go test generation' }],
    dependencies: { skills: [], system: [], pip: [] },
    security: {
      signed: false,
      scanned: 'passed',
      layers: ['pattern: clean', 'ml: 0.08 (safe)'],
    },
    repo: 'https://github.com/chen-ml/test-gen',
  },
  {
    name: 'api-scaffold',
    version: '1.1.0',
    desc: 'Generate REST and GraphQL APIs from schema definitions',
    longDesc:
      'Define your data models and get a fully scaffolded API with routes, validation, auth middleware, and OpenAPI docs. Supports Express, Fastify, and Hono.',
    author: 'mike',
    trust: 'verified',
    downloads: '7,200',
    weeklyDownloads: '540',
    rating: '4.5',
    reviews: 63,
    license: 'MIT',
    published: '2025-12-20',
    updated: '2026-02-12',
    size: '20 KB',
    platforms: ['all'],
    category: 'backend',
    tags: ['api', 'rest', 'graphql', 'express', 'openapi'],
    versions: [
      {
        v: '1.1.0',
        date: '2026-02-12',
        changes: 'Hono framework support',
      },
    ],
    dependencies: { skills: [], system: ['node >=18'], pip: [] },
    security: {
      signed: true,
      signer: 'mike@github',
      scanned: 'passed',
      layers: ['pattern: clean', 'ml: 0.04 (safe)'],
    },
    repo: 'https://github.com/mike-builds/api-scaffold',
  },
  {
    name: 'docker-deploy',
    version: '1.3.0',
    desc: 'Build Dockerfiles and compose stacks from project analysis',
    longDesc:
      'Analyzes project structure, detects frameworks and dependencies, generates optimized multi-stage Dockerfiles and docker-compose configurations.',
    author: 'ops-team',
    trust: 'verified',
    downloads: '6,100',
    weeklyDownloads: '480',
    rating: '4.4',
    reviews: 52,
    license: 'MIT',
    published: '2025-11-15',
    updated: '2026-02-08',
    size: '16 KB',
    platforms: ['all'],
    category: 'infra',
    tags: ['docker', 'containers', 'deploy', 'devops'],
    versions: [
      {
        v: '1.3.0',
        date: '2026-02-08',
        changes: 'Multi-stage build optimization',
      },
    ],
    dependencies: { skills: [], system: [], pip: [] },
    security: {
      signed: true,
      signer: 'ops-team@github',
      scanned: 'passed',
      layers: ['pattern: clean', 'ml: 0.03 (safe)'],
    },
    repo: 'https://github.com/ops-team/docker-deploy',
  },
];
