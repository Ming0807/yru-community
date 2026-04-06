-- ==========================================
-- Phase 21: Comments Hierarchical Structure (3 Levels)
-- ==========================================

-- 1. Add parent_id to comments table
ALTER TABLE public.comments 
ADD COLUMN parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- 2. Create index on parent_id for faster lookups when building the threaded tree
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- Note: 3 levels (Root -> Reply -> Sub-reply) will be enforced by application logic.
-- The database schema allows infinite nesting due to the self-referencing foreign key.
