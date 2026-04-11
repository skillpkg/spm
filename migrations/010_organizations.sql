-- SPM Database Schema
-- Migration 010: Organizations — full support
--
-- Extends the organizations and org_members tables created in 009_scoped_names.sql
-- with additional columns needed for full org management.

-- ── Extend organizations table ──

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by UUID NOT NULL REFERENCES users(id);

-- ── Extend org_members table — add indexes ──

CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
