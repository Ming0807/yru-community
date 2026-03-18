-- ==========================================
-- Nested Comments Migration
-- Add parent_id to comments table for 2-level threading
-- ==========================================

-- 1. Add parent_id column (null = top-level comment, non-null = reply)
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- 2. Index for efficient nested comment queries
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- Done! No need for BSON. plain parent_id with a simple JOIN is the most efficient approach.
