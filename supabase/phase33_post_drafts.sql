-- ==========================================
-- Phase 33: Post Drafts
-- ==========================================

-- 1. Add is_draft column to posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- 2. Add draft_limit check (max 10 drafts per user)
-- This is enforced at application level, but we add a comment for reference

-- 3. RLS Policy: Users can view their own drafts
DROP POLICY IF EXISTS "Users can view own drafts" ON public.posts;
CREATE POLICY "Users can view own drafts"
  ON public.posts FOR SELECT
  USING (auth.uid() = author_id OR is_draft = false);

-- 4. RLS Policy: Users can create drafts
DROP POLICY IF EXISTS "Users can create drafts" ON public.posts;
CREATE POLICY "Users can create drafts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- 5. RLS Policy: Users can update own drafts
DROP POLICY IF EXISTS "Users can update own drafts" ON public.posts;
CREATE POLICY "Users can update own drafts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id);

-- 6. RLS Policy: Users can delete own drafts
DROP POLICY IF EXISTS "Users can delete own drafts" ON public.posts;
CREATE POLICY "Users can delete own drafts"
  ON public.posts FOR DELETE
  USING (auth.uid() = author_id);

-- 7. Index for draft queries
CREATE INDEX IF NOT EXISTS idx_posts_is_draft ON public.posts(is_draft, author_id);
CREATE INDEX IF NOT EXISTS idx_posts_draft_created ON public.posts(is_draft, created_at DESC) WHERE is_draft = true;
