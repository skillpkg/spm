-- SPM Database Schema
-- Migration 003: Scoped skill names (@scope/name)
--
-- Migrates from flat namespace (skill-name) to mandatory scoped names (@scope/skill-name).
-- Creates organization tables and renames all existing skills to @username/skill-name.

-- ── Organizations ──

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT UNIQUE NOT NULL,          -- slug: "mycompany"
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_name ON organizations(name);

-- ── Org members ──

CREATE TABLE org_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',   -- owner, admin, member
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- ── Rename existing skills to scoped names ──

-- "code-review" → "@alice/code-review"
UPDATE skills s
SET name = '@' || u.username || '/' || s.name
FROM users u
WHERE u.id = s.owner_id
AND s.name NOT LIKE '@%';

-- ── Update publish_attempts skill_name to scoped names ──

UPDATE publish_attempts pa
SET skill_name = '@' || u.username || '/' || pa.skill_name
FROM users u
WHERE u.id = pa.user_id
AND pa.skill_name NOT LIKE '@%';

-- ── Refresh search vectors with new scoped names ──

UPDATE skills SET search_vector =
  setweight(to_tsvector('english', name), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B');
