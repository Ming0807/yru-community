-- Phase 17: In-App Notification System

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- Who receives the notification
  actor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,   -- Who triggered it
  type text NOT NULL CHECK (type IN ('COMMENT', 'REPLY')),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 3. Grant Permissions to API roles
GRANT SELECT, UPDATE ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

-- 4. Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Trigger to auto-create notifications on new comments
CREATE OR REPLACE FUNCTION handle_new_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_author_id uuid;
  parent_comment_author_id uuid;
BEGIN
  -- 1. If it's a DIRECT reply to a post (parent_id is null)
  IF NEW.parent_id IS NULL THEN
    SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
    
    -- Don't notify if user comments on their own post
    IF post_author_id != NEW.author_id THEN
      INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
      VALUES (post_author_id, NEW.author_id, 'COMMENT', NEW.post_id, NEW.id);
    END IF;
    
  -- 2. If it's a REPLY to a comment (parent_id is not null)
  ELSE
    SELECT author_id INTO parent_comment_author_id FROM comments WHERE id = NEW.parent_id;
    
    -- Don't notify if user replies to their own comment
    IF parent_comment_author_id != NEW.author_id THEN
      INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
      VALUES (parent_comment_author_id, NEW.author_id, 'REPLY', NEW.post_id, NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_created_notify ON comments;
CREATE TRIGGER on_comment_created_notify
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_comment_notification();
