-- Function สำหรับ Posts
CREATE OR REPLACE FUNCTION process_post_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_username TEXT;
  mentioned_user_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.content_text IS NOT DISTINCT FROM NEW.content_text THEN
    RETURN NEW;
  END IF;

  FOR mentioned_username IN
    SELECT regexp_matches[1] FROM regexp_matches(
      COALESCE(NEW.content_text, ''), 
      '@([a-zA-Z0-9ก-๙_]+)', 'g'
    )
  LOOP
    SELECT id INTO mentioned_user_id FROM profiles WHERE display_name = mentioned_username LIMIT 1;
    
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.author_id THEN
      INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
      VALUES (mentioned_user_id, NEW.author_id, 'MENTION', NEW.id, NULL);
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function สำหรับ Comments
CREATE OR REPLACE FUNCTION process_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_username TEXT;
  mentioned_user_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.content IS NOT DISTINCT FROM NEW.content THEN
    RETURN NEW;
  END IF;

  FOR mentioned_username IN
    SELECT regexp_matches[1] FROM regexp_matches(
      COALESCE(NEW.content, ''), 
      '@([a-zA-Z0-9ก-๙_]+)', 'g'
    )
  LOOP
    SELECT id INTO mentioned_user_id FROM profiles WHERE display_name = mentioned_username LIMIT 1;
    
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.author_id THEN
      INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
      VALUES (mentioned_user_id, NEW.author_id, 'MENTION', NEW.post_id, NEW.id);
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers เดิม
DROP TRIGGER IF EXISTS trg_extract_mentions_posts ON posts;
DROP TRIGGER IF EXISTS trg_extract_mentions_comments ON comments;

-- Drop function เดิม
DROP FUNCTION IF EXISTS process_mentions();

-- สร้าง triggers ใหม่แยกกัน
CREATE TRIGGER trg_extract_mentions_posts
AFTER INSERT OR UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION process_post_mentions();

CREATE TRIGGER trg_extract_mentions_comments
AFTER INSERT OR UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION process_comment_mentions();