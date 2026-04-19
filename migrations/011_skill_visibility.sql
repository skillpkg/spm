-- Phase 2: Private Skills
-- Add visibility column to skills table

ALTER TABLE skills ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';
-- Values: 'public', 'private'

CREATE INDEX idx_skills_visibility ON skills(visibility);
