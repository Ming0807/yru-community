-- ==========================================
-- Phase 26: Spam Detection Basics
-- ==========================================

-- 1. Add spam_score column to posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS spam_score INTEGER DEFAULT 0;

-- 2. Add spam_score column to comments
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS spam_score INTEGER DEFAULT 0;

-- 3. Function to auto-flag content with high spam score
CREATE OR REPLACE FUNCTION check_spam_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Flag if spam_score >= 5 (adjust threshold as needed)
  IF NEW.spam_score >= 5 THEN
    -- Auto-insert a report for admin review
    INSERT INTO reports (post_id, comment_id, reporter_id, reason, status)
    VALUES (
      CASE WHEN TG_TABLE_NAME = 'posts' THEN NEW.id ELSE NULL END,
      CASE WHEN TG_TABLE_NAME = 'comments' THEN NEW.id ELSE NULL END,
      '00000000-0000-0000-0000-000000000000', -- System reporter
      'ระบบตรวจพบสแปม (คะแนน: ' || NEW.spam_score || ')',
      'pending'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Triggers to check spam score on insert
DROP TRIGGER IF EXISTS trg_check_spam_posts ON posts;
CREATE TRIGGER trg_check_spam_posts
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION check_spam_score();

DROP TRIGGER IF EXISTS trg_check_spam_comments ON comments;
CREATE TRIGGER trg_check_spam_comments
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION check_spam_score();
