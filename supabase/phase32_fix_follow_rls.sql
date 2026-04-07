-- ==========================================
-- Phase 32: Fix Follow Notification RLS
-- ==========================================

-- The handle_new_follow_notification trigger needs INSERT permission on notifications
-- Since it's a trigger (not SECURITY DEFINER), it runs as the authenticated user
-- We need to add an INSERT policy for notifications

DROP POLICY IF EXISTS "System can insert notifications via triggers" ON public.notifications;
CREATE POLICY "System can insert notifications via triggers"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Also need INSERT policy for follows table
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
