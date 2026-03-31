-- Phase 20: Mentions Notification Trigger

-- Function to extract @mentions and notify users
CREATE OR REPLACE FUNCTION process_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_username TEXT;
  mentioned_user_id UUID;
  post_author UUID;
BEGIN
  -- We only extract mentions from content (for comments) or content_text (for posts)
  -- For posts, we need to read from content_text
  
  -- Simple regex extraction loop
  -- In PostgreSQL, regexp_matches returns a set of text arrays
  FOR mentioned_username IN
    SELECT regexp_matches[1] FROM regexp_matches(
      COALESCE(NEW.content, NEW.content_text, ''), 
      '@([a-zA-Z0-9ก-๙_]+)', 'g'
    )
  LOOP
    -- Find the user ID by display_name
    SELECT id INTO mentioned_user_id FROM profiles WHERE display_name = mentioned_username LIMIT 1;
    
    -- Insert notification if user exists and it's not self-mention
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.author_id THEN
      INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
      VALUES (
        mentioned_user_id,
        NEW.author_id,
        'MENTION',
        CASE WHEN TG_TABLE_NAME = 'posts' THEN NEW.id ELSE NEW.post_id END,
        CASE WHEN TG_TABLE_NAME = 'comments' THEN NEW.id ELSE NULL END
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for Posts
DROP TRIGGER IF EXISTS trg_extract_mentions_posts ON posts;
CREATE TRIGGER trg_extract_mentions_posts
AFTER INSERT OR UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION process_mentions();

-- Add trigger for Comments
DROP TRIGGER IF EXISTS trg_extract_mentions_comments ON comments;
CREATE TRIGGER trg_extract_mentions_comments
AFTER INSERT OR UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION process_mentions();
