-- ==========================================
-- Phase 32b: Fix Follow Notification Trigger (SECURITY DEFINER)
-- ==========================================

-- The handle_new_follow_notification trigger must be SECURITY DEFINER
-- so it can INSERT into notifications bypassing RLS

CREATE OR REPLACE FUNCTION handle_new_follow_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, metadata)
  VALUES (NEW.following_id, NEW.follower_id, 'FOLLOW', '{}'::jsonb);
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_follow_created_notify ON follows;
CREATE TRIGGER on_follow_created_notify
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_follow_notification();

-- Also ensure the INSERT policy exists for notifications
DROP POLICY IF EXISTS "System can insert notifications via triggers" ON public.notifications;
CREATE POLICY "System can insert notifications via triggers"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Ensure follows policies exist
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow others" ON public.follows;
CREATE POLICY "Users can unfollow others"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can view follows" ON public.follows;
CREATE POLICY "Users can view follows"
  ON public.follows FOR SELECT
  USING (true);
