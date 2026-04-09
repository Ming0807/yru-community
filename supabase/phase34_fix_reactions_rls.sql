-- ==========================================
-- Phase 34: Fix post_reactions RLS Policies
-- ==========================================
-- The post_reactions table was missing INSERT, UPDATE, and DELETE policies,
-- causing 403 Forbidden errors when authenticated users tried to react to posts.

-- Ensure RLS is enabled on the table
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- ── SELECT ─────────────────────────────────────────────────────────────────
-- Anyone (including guests) can read reactions to show reaction counts
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.post_reactions;
CREATE POLICY "Anyone can view reactions"
  ON public.post_reactions FOR SELECT
  USING (true);

-- ── INSERT ─────────────────────────────────────────────────────────────────
-- Authenticated users can react, but only as themselves (user_id must match)
DROP POLICY IF EXISTS "Users can insert own reactions" ON public.post_reactions;
CREATE POLICY "Users can insert own reactions"
  ON public.post_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── UPDATE ─────────────────────────────────────────────────────────────────
-- Users can change their own reaction type
DROP POLICY IF EXISTS "Users can update own reactions" ON public.post_reactions;
CREATE POLICY "Users can update own reactions"
  ON public.post_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── DELETE ─────────────────────────────────────────────────────────────────
-- Users can remove their own reaction
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.post_reactions;
CREATE POLICY "Users can delete own reactions"
  ON public.post_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
