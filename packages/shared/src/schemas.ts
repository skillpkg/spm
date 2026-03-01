import { z } from 'zod';
import { CATEGORIES } from './categories.js';
import { TRUST_TIERS } from './trust.js';

// -- Skill name validation --
// kebab-case, 2-64 chars, starts with letter, optional @scope/
export const SkillNameSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(
    /^(@[a-z0-9-]+\/)?[a-z][a-z0-9-]*$/,
    'Must be kebab-case, start with a letter, optionally scoped with @org/',
  );

// -- Semver --
export const SemverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, 'Must be valid semver (e.g., 1.2.3)');

// -- Person --
export const PersonSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    url: z.string().url().optional(),
  })
  .refine((d) => d.name || d.email, { message: 'At least one of name or email is required' });

// -- URLs --
export const UrlsSchema = z
  .object({
    homepage: z.string().url().optional(),
    repository: z.string().url().optional(),
    issues: z.string().url().optional(),
    documentation: z.string().url().optional(),
    changelog: z.string().url().optional(),
    funding: z.string().url().optional(),
  })
  .optional();

// -- Agents config --
export const AgentsSchema = z
  .object({
    platforms: z.array(z.string()).default(['*']),
    requires_tools: z.array(z.string()).default([]),
    min_context: z.enum(['standard', 'large']).default('standard'),
    requires_network: z.boolean().default(false),
    requires_mcp: z.array(z.string()).default([]),
  })
  .optional();

// -- Dependencies --
export const DependenciesSchema = z
  .object({
    skills: z.record(z.string()).default({}),
    pip: z.array(z.string()).default([]),
    npm: z.array(z.string()).default([]),
    system: z.array(z.string()).default([]),
  })
  .optional();

// -- Security --
export const SecuritySchema = z
  .object({
    sandboxed: z.boolean().default(true),
    network_access: z.boolean().default(false),
    filesystem_scope: z.array(z.string()).default(['$WORKDIR', '$OUTPUTS']),
  })
  .optional();

// -- Files --
export const FilesSchema = z
  .object({
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
  })
  .optional();

// -- Full Manifest --
export const ManifestSchema = z.object({
  // Required
  name: SkillNameSchema,
  version: SemverSchema,
  description: z.string().min(30).max(1024),

  // People
  authors: z.array(PersonSchema).optional(),
  maintainers: z.array(PersonSchema).optional(),

  // Discovery
  keywords: z.array(z.string().max(50)).max(20).optional(),
  category: z.enum(CATEGORIES).default('other'),

  // Legal
  license: z.string().optional(),
  private: z.boolean().default(false),

  // Links
  urls: UrlsSchema,

  // Provenance
  forked_from: z.string().optional(),

  // Platform
  agents: AgentsSchema,

  // Dependencies
  dependencies: DependenciesSchema,

  // Security
  security: SecuritySchema,

  // Files
  files: FilesSchema,

  // SPM metadata
  $schema: z.string().optional(),
  spm: z
    .object({
      manifest_version: z.number().int().default(1),
    })
    .optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;
export type ManifestInput = z.input<typeof ManifestSchema>;

// -- Search params --
export const SearchParamsSchema = z.object({
  q: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  trust: z.enum(TRUST_TIERS).optional(),
  platform: z.string().optional(),
  sort: z.enum(['relevance', 'downloads', 'rating', 'updated', 'new']).default('relevance'),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;

// -- Publish request (metadata portion) --
export const PublishRequestSchema = z.object({
  manifest: ManifestSchema,
});

export type PublishRequest = z.infer<typeof PublishRequestSchema>;

// -- Review --
export const ReviewRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

// -- Report --
export const ReportRequestSchema = z.object({
  reason: z.string().min(10).max(2000),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export type ReportRequest = z.infer<typeof ReportRequestSchema>;

// -- Resolve request --
export const ResolveRequestSchema = z.object({
  skills: z.array(
    z.object({
      name: SkillNameSchema,
      range: z.string(),
    }),
  ),
  platform: z.string().optional(),
});

export type ResolveRequest = z.infer<typeof ResolveRequestSchema>;

// -- Skills.json --
export const SkillsJsonSchema = z.object({
  $schema: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  skills: z.record(z.string()),
  resolution: z
    .object({
      strategy: z
        .enum(['project-first', 'global-first', 'strict-project', 'merge'])
        .default('project-first'),
      overrides: z
        .record(
          z.object({
            priority: z.enum(['project', 'global']),
            reason: z.string().optional(),
            alias: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  settings: z
    .object({
      trust_level: z.enum(TRUST_TIERS).optional(),
      auto_update: z.boolean().default(false),
      allow_transient_skills: z.boolean().default(false),
      platform: z.array(z.string()).optional(),
    })
    .optional(),
});

export type SkillsJson = z.infer<typeof SkillsJsonSchema>;

// -- Lock file --
export const SkillsLockSchema = z.object({
  lockfileVersion: z.number().int().default(1),
  generated_at: z.string(),
  generated_by: z.string(),
  skills: z.record(
    z.object({
      version: z.string(),
      resolved: z.string(),
      checksum: z.string(),
      source: z.enum(['registry', 'github', 'local']),
      signer: z.string().optional(),
      commit: z.string().optional(),
      dependencies: z.record(z.string()).optional(),
    }),
  ),
  system_dependencies: z
    .object({
      python: z.string().optional(),
      pip: z.array(z.string()).default([]),
      npm: z.array(z.string()).default([]),
    })
    .optional(),
});

export type SkillsLock = z.infer<typeof SkillsLockSchema>;
