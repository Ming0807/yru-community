-- Phase 17: Security & Performance

-- 1. Rate Limiting for Posts (Max 5 per hour per user)
CREATE OR REPLACE FUNCTION check_post_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_posts_count integer;
BEGIN
  SELECT count(*) INTO recent_posts_count
  FROM posts
  WHERE author_id = NEW.author_id
    AND created_at > now() - interval '1 hour';
    
  IF recent_posts_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: คุณสามารถตั้งกระทู้ได้สูงสุด 5 กระทู้ต่อชั่วโมงเพื่อป้องกันสแปม';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rate_limit_posts ON posts;
CREATE TRIGGER rate_limit_posts
  BEFORE INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION check_post_rate_limit();

-- 2. Rate Limiting for Comments (Max 20 per hour per user)
CREATE OR REPLACE FUNCTION check_comment_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_comments_count integer;
BEGIN
  SELECT count(*) INTO recent_comments_count
  FROM comments
  WHERE author_id = NEW.author_id
    AND created_at > now() - interval '1 hour';
    
  IF recent_comments_count >= 20 THEN
    RAISE EXCEPTION 'Rate limit exceeded: คุณสามารถคอมเมนต์ได้สูงสุด 20 ครั้งต่อชั่วโมงเพื่อป้องกันสแปม';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rate_limit_comments ON comments;
CREATE TRIGGER rate_limit_comments
  BEFORE INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION check_comment_rate_limit();

-- 3. Database Indexes for Performance Optimization
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_vote_count ON posts(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_ads_active_position ON ads(is_active, position);
CREATE INDEX IF NOT EXISTS idx_votes_user_post ON votes(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_post ON bookmarks(user_id, post_id);
