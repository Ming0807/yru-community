-- ==========================================
-- Phase 25: Soft Delete for Posts
-- ==========================================

-- 1. Add deleted_at column to posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Add deleted_by column to track who deleted
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

-- 3. Add delete_reason column
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS delete_reason TEXT;

-- 4. Update RLS policy to exclude soft-deleted posts from public view
-- (Existing policies should filter out posts where deleted_at IS NOT NULL)
-- Add a helper policy for admins to see deleted posts
DROP POLICY IF EXISTS "Admins can see deleted posts" ON public.posts;
CREATE POLICY "Admins can see deleted posts"
  ON public.posts FOR SELECT
  USING (is_admin());

-- 5. Update the main posts query to exclude soft-deleted posts
-- This is handled at the application level by adding .is('deleted_at', null) to queries
