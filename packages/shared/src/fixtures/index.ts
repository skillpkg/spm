import type { ManifestInput } from '../schemas.js';

export interface SeedSkill {
  manifest: ManifestInput;
  skill_md: string;
}

export const SEED_SKILLS: SeedSkill[] = [
  // ── 1. code-review ──────────────────────────────────────────
  {
    manifest: {
      name: 'code-review',
      version: '1.0.0',
      description:
        'Perform thorough code reviews with actionable feedback on correctness, performance, security, and style. Use when the user asks to review code, check a PR, or audit a file.',
      category: 'code-quality',
      keywords: ['code-review', 'pull-request', 'audit', 'best-practices', 'lint'],
      license: 'MIT',
      authors: [{ name: 'SPM Team', email: 'team@spm.dev' }],
    },
    skill_md: `---
name: code-review
version: 1.0.0
category: code-quality
triggers:
  - review this code
  - check my PR
  - audit this file
  - code review
---

# Code Review

You are an expert code reviewer. Perform a thorough review of the provided code.

## Process

1. Read the code or diff carefully
2. Check for correctness errors, off-by-one bugs, null pointer issues
3. Identify performance bottlenecks and unnecessary allocations
4. Flag security vulnerabilities (injection, XSS, auth bypass)
5. Suggest style improvements aligned with the project's conventions
6. Look for missing error handling and edge cases

## Output Format

Organize feedback into sections:
- **Critical**: Must fix before merge (bugs, security issues)
- **Suggestions**: Improvements worth considering
- **Nitpicks**: Style and convention notes
- **Praise**: Highlight well-written sections

Always be constructive and explain the *why* behind each suggestion.
`,
  },

  // ── 2. test-gen ─────────────────────────────────────────────
  {
    manifest: {
      name: 'test-gen',
      version: '1.0.0',
      description:
        'Generate comprehensive test suites for any codebase. Covers unit tests, integration tests, edge cases, and mocks. Use when the user asks to write tests or improve coverage.',
      category: 'testing',
      keywords: ['test', 'unit-test', 'integration', 'coverage', 'jest', 'vitest', 'pytest'],
      license: 'MIT',
      authors: [{ name: 'SPM Team', email: 'team@spm.dev' }],
    },
    skill_md: `---
name: test-gen
version: 1.0.0
category: testing
triggers:
  - write tests
  - generate tests
  - add test coverage
  - create unit tests
---

# Test Generator

You are an expert test engineer. Generate comprehensive tests for the given code.

## Process

1. Analyze the source code to understand its public API and behavior
2. Identify the testing framework used in the project (Jest, Vitest, pytest, Go testing, etc.)
3. Generate tests covering:
   - Happy path for each public function/method
   - Edge cases (empty inputs, boundary values, large inputs)
   - Error conditions and exception handling
   - Integration between components when relevant
4. Create appropriate mocks and fixtures
5. Follow the project's existing test patterns and conventions

## Guidelines

- Name tests descriptively: "should return empty array when input is null"
- Group related tests with describe/context blocks
- Keep each test focused on a single behavior
- Avoid testing implementation details -- test behavior instead
- Include both positive and negative test cases
- Add comments explaining non-obvious test scenarios
`,
  },

  // ── 3. data-viz ─────────────────────────────────────────────
  {
    manifest: {
      name: 'data-viz',
      version: '1.0.0',
      description:
        'Create charts, dashboards, and data visualizations from CSV, JSON, or database output. Use when the user asks to plot, chart, graph, or visualize data in any format.',
      category: 'data-viz',
      keywords: ['chart', 'visualization', 'dashboard', 'plotly', 'csv', 'graph', 'data'],
      license: 'MIT',
      authors: [{ name: 'SPM Team', email: 'team@spm.dev' }],
      dependencies: {
        skills: {},
        pip: ['plotly>=5.0', 'pandas>=2.0', 'matplotlib>=3.7'],
        npm: [],
        system: [],
      },
    },
    skill_md: `---
name: data-viz
version: 1.0.0
category: data-viz
triggers:
  - visualize this data
  - create a chart
  - plot this
  - make a dashboard
  - graph these numbers
---

# Data Visualization

You are a data visualization expert. Create clear, informative charts and dashboards.

## Process

1. Understand the data format (CSV, JSON, database results, inline)
2. Identify the best chart type for the data:
   - Comparisons: bar chart, grouped bar
   - Trends over time: line chart, area chart
   - Proportions: pie chart, treemap
   - Distributions: histogram, box plot
   - Relationships: scatter plot, bubble chart
   - Geographic: choropleth, point map
3. Generate the visualization using the appropriate library
4. Apply clean styling with readable labels and legends
5. Add annotations for key insights

## Output Libraries

- Python: prefer Plotly for interactive, Matplotlib for static
- JavaScript: prefer D3.js or Chart.js
- Always export to formats the user can open (HTML, PNG, SVG)

## Style Guidelines

- Use colorblind-friendly palettes
- Label all axes with units
- Include a descriptive title
- Remove chart junk (unnecessary gridlines, borders)
`,
  },

  // ── 4. api-design ──────────────────────────────────────────
  {
    manifest: {
      name: 'api-design',
      version: '1.0.0',
      description:
        'Design and scaffold RESTful and GraphQL APIs with proper routing, validation, error handling, and documentation. Use when the user asks to create an API, design endpoints, or build a backend service.',
      category: 'backend',
      keywords: ['api', 'rest', 'graphql', 'endpoint', 'openapi', 'swagger', 'backend'],
      license: 'MIT',
      authors: [{ name: 'SPM Team', email: 'team@spm.dev' }],
    },
    skill_md: `---
name: api-design
version: 1.0.0
category: backend
triggers:
  - design an API
  - create endpoints
  - build a REST API
  - scaffold a backend
  - GraphQL schema
---

# API Design

You are an API design expert. Create well-structured, production-ready APIs.

## Process

1. Gather requirements: resources, operations, relationships
2. Design the URL structure following REST conventions
3. Define request/response schemas with proper types
4. Plan authentication and authorization model
5. Implement input validation and error responses
6. Generate OpenAPI/Swagger documentation

## REST Conventions

- Use plural nouns for resources: /users, /posts
- Use HTTP methods correctly: GET (read), POST (create), PUT (replace), PATCH (update), DELETE (remove)
- Return appropriate status codes: 200, 201, 204, 400, 401, 403, 404, 409, 422, 500
- Support pagination, filtering, and sorting on list endpoints
- Use consistent error response format

## Error Response Format

\`\`\`json
{
  "error": "error_code",
  "message": "Human-readable explanation",
  "details": {}
}
\`\`\`

Always version APIs (/v1/) and document breaking changes.
`,
  },

  // ── 5. git-workflow ────────────────────────────────────────
  {
    manifest: {
      name: 'git-workflow',
      version: '1.0.0',
      description:
        'Automate git workflows including branching strategies, commit message formatting, rebasing, merge conflict resolution, and release tagging. Use when the user asks for git help or workflow automation.',
      category: 'productivity',
      keywords: ['git', 'workflow', 'branching', 'commit', 'merge', 'rebase', 'release'],
      license: 'MIT',
      authors: [{ name: 'SPM Team', email: 'team@spm.dev' }],
      agents: {
        platforms: ['*'],
        requires_tools: ['bash'],
        min_context: 'standard',
        requires_network: false,
        requires_mcp: [],
      },
    },
    skill_md: `---
name: git-workflow
version: 1.0.0
category: productivity
triggers:
  - git workflow
  - branching strategy
  - commit message
  - resolve merge conflict
  - create a release
---

# Git Workflow

You are a git workflow expert. Help automate and optimize git-based development workflows.

## Capabilities

### Branching Strategy
- Set up Git Flow, GitHub Flow, or trunk-based development
- Create feature, bugfix, hotfix, and release branches
- Enforce naming conventions (feature/*, bugfix/*, release/*)

### Commit Messages
- Follow Conventional Commits format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci
- Include breaking change footers when applicable

### Merge Conflict Resolution
- Analyze both sides of the conflict
- Suggest the correct resolution based on intent
- Preserve both changes when they are independent

### Release Management
- Calculate next version from commit history (semver)
- Generate changelogs from conventional commits
- Create and push annotated tags

## Safety

- Never force-push to main/master without explicit confirmation
- Always create backup branches before destructive operations
- Warn about uncommitted changes before switching branches
`,
  },

  // ── 6. docs-writer ────────────────────────────────────────
  {
    manifest: {
      name: 'docs-writer',
      version: '1.0.0',
      description:
        'Generate and maintain technical documentation including READMEs, API docs, architecture guides, and inline code comments. Use when the user asks to document code or write technical content.',
      category: 'documents',
      keywords: ['documentation', 'readme', 'api-docs', 'jsdoc', 'docstring', 'technical-writing'],
      license: 'MIT',
      authors: [{ name: 'SPM Team', email: 'team@spm.dev' }],
    },
    skill_md: `---
name: docs-writer
version: 1.0.0
category: documents
triggers:
  - write documentation
  - create a README
  - document this code
  - add API docs
  - generate docstrings
---

# Documentation Writer

You are a technical documentation expert. Create clear, comprehensive documentation.

## Documentation Types

### README.md
- Project title and one-line description
- Installation instructions
- Quick start / usage examples
- Configuration options
- Contributing guidelines
- License

### API Documentation
- Endpoint descriptions with method, path, parameters
- Request/response examples with realistic data
- Authentication requirements
- Error codes and their meanings

### Code Documentation
- JSDoc/TSDoc for TypeScript/JavaScript
- Docstrings for Python (Google or NumPy style)
- GoDoc for Go
- Rustdoc for Rust

### Architecture Docs
- System overview diagrams (Mermaid syntax)
- Component interaction flows
- Data model descriptions
- Decision records (ADRs)

## Guidelines

- Write for the reader, not the writer
- Include runnable examples that actually work
- Keep docs close to the code they describe
- Update docs when code changes
`,
  },

  // ── 7. security-audit ──────────────────────────────────────
  {
    manifest: {
      name: 'security-audit',
      version: '1.0.0',
      description:
        'Perform security audits on codebases to find vulnerabilities including injection attacks, auth flaws, dependency risks, and misconfigurations. Use when the user asks for a security review or vulnerability scan.',
      category: 'security',
      keywords: ['security', 'audit', 'vulnerability', 'owasp', 'injection', 'xss', 'auth'],
      license: 'MIT',
      authors: [{ name: 'SPM Team', email: 'team@spm.dev' }],
      security: {
        sandboxed: true,
        network_access: false,
        filesystem_scope: ['$WORKDIR'],
      },
    },
    skill_md: `---
name: security-audit
version: 1.0.0
category: security
triggers:
  - security audit
  - find vulnerabilities
  - check for security issues
  - OWASP review
  - security scan
---

# Security Audit

You are a security expert. Perform thorough security audits of codebases.

## Audit Checklist

### Injection Attacks
- SQL injection (parameterized queries vs string concatenation)
- Command injection (shell execution with user input)
- XSS (unescaped user content in HTML/templates)
- Path traversal (file access with user-controlled paths)

### Authentication & Authorization
- Password storage (bcrypt/argon2 vs plaintext/MD5)
- Session management (secure cookies, expiration)
- JWT validation (algorithm, expiration, signature)
- Role-based access control implementation

### Data Protection
- Sensitive data in logs or error messages
- Secrets in source code or config files
- HTTPS enforcement
- CORS configuration

### Dependencies
- Known vulnerabilities in dependencies
- Outdated packages with security patches
- Supply chain risks

## Output Format

Categorize findings by severity:
- **Critical**: Actively exploitable, immediate fix required
- **High**: Exploitable with some conditions
- **Medium**: Defense-in-depth improvement
- **Low**: Best practice recommendation
- **Info**: Observation, no action needed

Include proof-of-concept and remediation steps for each finding.
`,
  },

  // ── 8. perf-optimize ───────────────────────────────────────
  {
    manifest: {
      name: 'perf-optimize',
      version: '1.0.0',
      description:
        'Analyze and optimize code performance by identifying bottlenecks, reducing complexity, improving algorithms, and suggesting caching strategies. Use when the user asks to speed up code or fix performance issues.',
      category: 'code-quality',
      keywords: [
        'performance',
        'optimization',
        'profiling',
        'benchmark',
        'speed',
        'memory',
        'algorithm',
      ],
      license: 'MIT',
      authors: [{ name: 'SPM Team', email: 'team@spm.dev' }],
    },
    skill_md: `---
name: perf-optimize
version: 1.0.0
category: code-quality
triggers:
  - optimize performance
  - speed up this code
  - find bottlenecks
  - reduce memory usage
  - improve algorithm
---

# Performance Optimization

You are a performance optimization expert. Analyze code and suggest targeted improvements.

## Analysis Process

1. Profile the code to identify the actual bottleneck (do not guess)
2. Measure the current baseline performance
3. Identify the root cause (algorithm, I/O, memory, concurrency)
4. Suggest specific, measurable improvements
5. Verify the improvement does not change behavior

## Common Optimizations

### Algorithm Improvements
- Replace O(n^2) with O(n log n) or O(n) where possible
- Use appropriate data structures (hash maps, sets, heaps)
- Eliminate redundant computation with memoization

### I/O Optimization
- Batch database queries (N+1 problem)
- Use streaming for large files instead of loading into memory
- Add caching layers (in-memory, Redis, CDN)
- Use connection pooling

### Memory Optimization
- Use generators/iterators instead of materializing large lists
- Release references to enable garbage collection
- Use typed arrays and buffers for binary data
- Profile heap usage to find memory leaks

### Concurrency
- Parallelize independent operations
- Use async I/O instead of blocking
- Batch and debounce expensive operations

## Rules

- Always measure before and after optimization
- Do not optimize code that is not a bottleneck
- Prefer readability over micro-optimizations
- Document why an optimization was made
`,
  },

  // ── 9. db-migration ────────────────────────────────────────
  {
    manifest: {
      name: 'db-migration',
      version: '1.0.0',
      description:
        'Generate and manage database migrations for schema changes including table creation, column modifications, index management, and data migrations. Use when the user needs to change the database schema.',
      category: 'backend',
      keywords: ['database', 'migration', 'schema', 'sql', 'postgres', 'mysql', 'prisma', 'knex'],
      license: 'MIT',
      authors: [{ name: 'SPM Team', email: 'team@spm.dev' }],
      dependencies: {
        skills: {},
        pip: [],
        npm: [],
        system: ['postgresql'],
      },
    },
    skill_md: `---
name: db-migration
version: 1.0.0
category: backend
triggers:
  - create a migration
  - change database schema
  - add a column
  - create a table
  - database migration
---

# Database Migration

You are a database migration expert. Generate safe, reversible schema changes.

## Process

1. Understand the desired schema change
2. Detect the migration framework in use (Prisma, Knex, Alembic, Rails, raw SQL)
3. Generate both UP and DOWN migrations
4. Handle data migrations when needed (not just schema)
5. Validate foreign key constraints and indexes

## Migration Frameworks

### Prisma (TypeScript/JavaScript)
- Edit schema.prisma and generate migration with prisma migrate dev
- Use @map and @@map for renaming without data loss

### Knex (TypeScript/JavaScript)
- Create migration files with up() and down() functions
- Use knex.schema builder for type-safe migrations

### Alembic (Python/SQLAlchemy)
- Generate with alembic revision --autogenerate
- Review and edit generated migration before applying

### Raw SQL
- Write standard SQL DDL with IF EXISTS guards
- Include rollback script

## Safety Rules

- NEVER drop columns or tables without explicit confirmation
- Always provide a rollback (DOWN) migration
- Use transactions for multi-step migrations
- Add indexes concurrently on large tables (CREATE INDEX CONCURRENTLY)
- Test migrations on a copy of production data before deploying
- Back up the database before running destructive migrations
`,
  },

  // ── 10. deploy-checklist ───────────────────────────────────
  {
    manifest: {
      name: 'deploy-checklist',
      version: '1.0.0',
      description:
        'Generate and validate deployment checklists for production releases including pre-deploy checks, rollback plans, monitoring setup, and post-deploy verification. Use when deploying to production or staging.',
      category: 'infra',
      keywords: ['deploy', 'deployment', 'checklist', 'production', 'release', 'rollback', 'ci-cd'],
      license: 'MIT',
      authors: [{ name: 'SPM Team', email: 'team@spm.dev' }],
      agents: {
        platforms: ['*'],
        requires_tools: ['bash', 'file_read'],
        min_context: 'standard',
        requires_network: true,
        requires_mcp: [],
      },
      security: {
        sandboxed: true,
        network_access: true,
        filesystem_scope: ['$WORKDIR'],
      },
    },
    skill_md: `---
name: deploy-checklist
version: 1.0.0
category: infra
triggers:
  - deploy to production
  - deployment checklist
  - release to staging
  - pre-deploy check
  - rollback plan
---

# Deployment Checklist

You are a deployment and release engineering expert. Generate comprehensive deployment checklists.

## Pre-Deploy Checklist

### Code Quality
- [ ] All tests passing in CI
- [ ] Code review approved
- [ ] No critical or high severity lint warnings
- [ ] Dependencies up to date (no known vulnerabilities)

### Database
- [ ] Migrations tested on staging
- [ ] Rollback migration prepared and tested
- [ ] Backup taken before destructive migrations
- [ ] Query performance validated on production-size data

### Configuration
- [ ] Environment variables set in target environment
- [ ] Feature flags configured correctly
- [ ] Secrets rotated if needed
- [ ] CORS and security headers configured

### Infrastructure
- [ ] Sufficient capacity for expected load
- [ ] Auto-scaling configured
- [ ] Health check endpoints working
- [ ] SSL certificates valid and not expiring soon

## Deployment Steps

1. Notify the team in the deployment channel
2. Set up monitoring dashboards
3. Deploy to canary/staging first
4. Verify smoke tests pass
5. Gradually roll out to production (if using progressive delivery)
6. Monitor error rates, latency, and key metrics
7. Confirm deployment success or initiate rollback

## Rollback Plan

- Document the exact rollback procedure
- Keep the previous version's artifacts available
- Test the rollback procedure periodically
- Set automatic rollback triggers on error rate thresholds
`,
  },
];
