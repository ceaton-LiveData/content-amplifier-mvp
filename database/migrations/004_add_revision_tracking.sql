-- Migration: Add revision tracking to generated_content
-- Run this in Supabase SQL Editor

-- Add revision_of column to track which content this was revised from
ALTER TABLE generated_content
ADD COLUMN IF NOT EXISTS revision_of UUID REFERENCES generated_content(id) ON DELETE SET NULL;

-- Add revision_number to track how many times content has been revised
ALTER TABLE generated_content
ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 0;

-- Index for finding revisions of a piece of content
CREATE INDEX IF NOT EXISTS idx_generated_content_revision_of ON generated_content(revision_of);

-- Comment for documentation
COMMENT ON COLUMN generated_content.revision_of IS 'Points to the original content this was revised from';
COMMENT ON COLUMN generated_content.revision_number IS '0 = original, 1+ = revision count';
