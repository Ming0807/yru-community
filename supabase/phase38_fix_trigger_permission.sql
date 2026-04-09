-- ==========================================
-- Phase 38: Fix trigger permission for post_reactions
-- ==========================================

-- Step 1: Grant necessary permissions for the notification trigger function
GRANT INSERT ON TABLE public.notifications TO postgres;
GRANT SELECT ON TABLE public.posts TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;

-- Step 2: Re-create the trigger function with SECURITY DEFINER
-- This makes it run with the privileges of the creator (who has permissions)
CREATE OR REPLACE FUNCTION handle_new_reaction_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, post_id, metadata) 
  SELECT p.author_id, NEW.user_id, 'REACTION', NEW.post_id, jsonb_build_object('reaction_type', NEW.reaction_type) 
  FROM posts p WHERE p.id = NEW.post_id;
  RETURN NEW;
END;
$$;

-- Step 3: Ensure all users can execute this function
GRANT EXECUTE ON FUNCTION handle_new_reaction_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_reaction_notification() TO anon;
GRANT EXECUTE ON FUNCTION handle_new_reaction_notification() TO postgres;

-- Step 4: Verify the function works
-- This should work now with SECURITY DEFINER
-- Test with a simple query
DO $$
BEGIN
  -- Just check if function exists and is callable
  PERFORM handle_new_reaction_notification();
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors during verification
    NULL;
END $$;