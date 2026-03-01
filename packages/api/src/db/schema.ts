import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  real,
  smallint,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ── Enums ──

export const skillCategoryEnum = pgEnum('skill_category', [
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
]);

export const trustTierEnum = pgEnum('trust_tier', [
  'registered',
  'scanned',
  'verified',
  'official',
]);

export const scanStatusEnum = pgEnum('scan_status', [
  'pending',
  'passed',
  'flagged',
  'blocked',
  'manual_approved',
]);

// ── Users ──

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username').unique().notNull(),
    githubId: text('github_id').unique(),
    githubLogin: text('github_login'),
    email: text('email'),
    trustTier: trustTierEnum('trust_tier').notNull().default('registered'),
    role: text('role').notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_users_github').on(table.githubId)],
);

// ── Skills ──

export const skills = pgTable(
  'skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').unique().notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    category: skillCategoryEnum('category').notNull(),
    description: text('description').notNull(),
    repository: text('repository'),
    license: text('license').default('MIT'),
    deprecated: boolean('deprecated').notNull().default(false),
    deprecatedMsg: text('deprecated_msg'),
    ratingAvg: real('rating_avg').default(0),
    ratingCount: integer('rating_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_skills_name').on(table.name),
    index('idx_skills_category').on(table.category),
    index('idx_skills_owner').on(table.ownerId),
  ],
);

// ── Versions ──

export const versions = pgTable(
  'versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id),
    version: text('version').notNull(),
    versionMajor: integer('version_major').notNull(),
    versionMinor: integer('version_minor').notNull(),
    versionPatch: integer('version_patch').notNull(),
    manifest: jsonb('manifest').notNull(),
    readmeMd: text('readme_md'),
    sizeBytes: integer('size_bytes'),
    checksumSha256: text('checksum_sha256').notNull(),
    sklStorageKey: text('skl_storage_key').notNull(),
    sigstoreBundleKey: text('sigstore_bundle_key'),
    signerIdentity: text('signer_identity'),
    yanked: boolean('yanked').notNull().default(false),
    yankReason: text('yank_reason'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_versions_skill_version').on(table.skillId, table.version),
    index('idx_versions_skill').on(table.skillId),
    index('idx_versions_published').on(table.publishedAt),
  ],
);

// ── Tags ──

export const skillTags = pgTable(
  'skill_tags',
  {
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.skillId, table.tag] }),
    index('idx_tags_tag').on(table.tag),
  ],
);

// ── Platform support ──

export const skillPlatforms = pgTable(
  'skill_platforms',
  {
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
  },
  (table) => [primaryKey({ columns: [table.skillId, table.platform] })],
);

// ── Security scans ──

export const scans = pgTable(
  'scans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => versions.id),
    layer: integer('layer').notNull(),
    status: scanStatusEnum('status').notNull(),
    confidence: real('confidence'),
    details: jsonb('details'),
    scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('idx_scans_version_layer').on(table.versionId, table.layer)],
);

// ── Download tracking ──

export const downloads = pgTable(
  'downloads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => versions.id),
    userId: uuid('user_id').references(() => users.id),
    ipHash: text('ip_hash'),
    downloadedAt: timestamp('downloaded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_downloads_version').on(table.versionId),
    index('idx_downloads_time').on(table.downloadedAt),
  ],
);

// ── Reviews ──

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    rating: smallint('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('idx_reviews_skill_user').on(table.skillId, table.userId)],
);

// ── Audit log ──

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => users.id),
    action: text('action').notNull(),
    skillId: uuid('skill_id').references(() => skills.id),
    versionId: uuid('version_id').references(() => versions.id),
    details: jsonb('details'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_skill').on(table.skillId),
    index('idx_audit_time').on(table.createdAt),
  ],
);

// ── Publish attempts ──

export const publishAttempts = pgTable(
  'publish_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    skillName: text('skill_name').notNull(),
    version: text('version').notNull(),
    status: text('status').notNull(),
    blockReasons: jsonb('block_reasons'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_publish_user').on(table.userId)],
);

// ── Reports ──

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  skillId: uuid('skill_id')
    .notNull()
    .references(() => skills.id),
  reporterId: uuid('reporter_id').references(() => users.id),
  reason: text('reason').notNull(),
  priority: text('priority').notNull().default('medium'),
  status: text('status').notNull().default('open'),
  resolution: text('resolution'),
  actionTaken: text('action_taken'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Bridge skills ──

export const bridgeSkills = pgTable(
  'bridge_skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id),
    source: text('source').notNull(),
    sourceRepo: text('source_repo').notNull(),
    sourcePath: text('source_path'),
    sourceCommit: text('source_commit'),
    sourceBranch: text('source_branch').default('main'),
    lastSynced: timestamp('last_synced', { withTimezone: true }).notNull().defaultNow(),
    syncStatus: text('sync_status').default('active'),
    claimed: boolean('claimed').notNull().default(false),
    claimedBy: uuid('claimed_by').references(() => users.id),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_bridge_source').on(table.sourceRepo),
    index('idx_bridge_skill').on(table.skillId),
  ],
);
