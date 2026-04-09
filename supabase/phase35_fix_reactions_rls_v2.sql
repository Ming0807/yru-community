-- ==========================================
-- Phase 35: Fix post_reactions RLS - Force Reapply
-- ==========================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users can insert own reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users can update own reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.post_reactions;

-- Ensure RLS is enabled
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- SELECT - Anyone can view
CREATE POLICY "Anyone can view reactions"
  ON public.post_reactions FOR SELECT
  USING (true);

-- INSERT - Authenticated users can add their own reaction
CREATE POLICY "Users can insert own reactions"
  ON public.post_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE - Authenticated users can update their own reaction
CREATE POLICY "Users can update own reactions"
  ON public.post_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE - Authenticated users can delete their own reaction
CREATE POLICY "Users can delete own reactions"
  ON public.post_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions explicitly (fallback)
GRANT ALL ON public.post_reactions TO authenticated;
GRANT SELECT ON public.post_reactions TO anon;