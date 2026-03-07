-- Add scan_security_level column to skills table for fast filtering
ALTER TABLE skills ADD COLUMN scan_security_level TEXT NOT NULL DEFAULT 'unscanned';

-- Add index for security filtering
CREATE INDEX idx_skills_security_level ON skills(scan_security_level);
