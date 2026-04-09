-- ==========================================
-- Phase 37: Complete fix for post_reactions and trigger permissions
-- ==========================================

-- Step 1: Drop ALL existing policies on post_reactions
DO $$
DECLARE
  pol_name TEXT;
BEGIN
  FOR pol_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'post_reactions'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || pol_name || ' ON post_reactions';
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- Step 2: Create simple permissive policies for authenticated users
CREATE POLICY "post_reactions_select_all"
  ON public.post_reactions FOR SELECT
  USING (true);

CREATE POLICY "post_reactions_insert_authenticated"
  ON public.post_reactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "post_reactions_update_authenticated"
  ON public.post_reactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "post_reactions_delete_authenticated"
  ON public.post_reactions FOR DELETE
  TO authenticated
  USING (true);

-- Step 3: Grant table permissions
GRANT ALL ON TABLE public.post_reactions TO authenticated;
GRANT SELECT ON TABLE public.post_reactions TO anon;

-- Step 4: Grant function execution permissions (fixes trigger permission issues)
GRANT EXECUTE ON FUNCTION process_mentions() TO authenticated;
GRANT EXECUTE ON FUNCTION process_post_mentions() TO authenticated;
GRANT EXECUTE ON FUNCTION process_comment_mentions() TO authenticated;

-- Step 5: Grant sequence permissions if any
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 6: Also fix notifications table permissions for triggers
GRANT INSERT ON TABLE public.notifications TO authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;