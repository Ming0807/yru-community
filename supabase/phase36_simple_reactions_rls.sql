-- ==========================================
-- Phase 36: Simple RLS fix for post_reactions
-- ==========================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Anyone can view post reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users can manage their own reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users can insert own reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users can update own reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.post_reactions;

-- Ensure RLS is enabled
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- Simple SELECT policy - everyone can view
CREATE POLICY "Anyone can view post_reactions"
  ON public.post_reactions FOR SELECT
  USING (true);

-- Simple INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert reactions"
  ON public.post_reactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Simple UPDATE policy
CREATE POLICY "Authenticated users can update reactions"
  ON public.post_reactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Simple DELETE policy
CREATE POLICY "Authenticated users can delete reactions"
  ON public.post_reactions FOR DELETE
  TO authenticated
  USING (true);

-- Grant permissions explicitly
GRANT ALL ON public.post_reactions TO authenticated;
GRANT SELECT ON public.post_reactions TO anon;