-- ==========================================
-- Phase 18.2: Gamification System
-- Add experience points and level to profiles
-- ==========================================

-- Add gamification columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Create function to calculate level from EXP
CREATE OR REPLACE FUNCTION calculate_level(exp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF exp >= 500 THEN RETURN 5;       -- Legend
  ELSIF exp >= 200 THEN RETURN 4;    -- Expert
  ELSIF exp >= 100 THEN RETURN 3;    -- Senior
  ELSIF exp >= 30 THEN RETURN 2;     -- Active
  ELSE RETURN 1;                     -- Newcomer
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function: Award EXP when a post is created
CREATE OR REPLACE FUNCTION award_post_exp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET experience_points = experience_points + 10,
      level = calculate_level(experience_points + 10)
  WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function: Award EXP when a comment is created
CREATE OR REPLACE FUNCTION award_comment_exp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET experience_points = experience_points + 5,
      level = calculate_level(experience_points + 5)
  WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function: Award EXP when a vote is received
CREATE OR REPLACE FUNCTION award_vote_exp()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
BEGIN
  SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
  IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
    UPDATE profiles
    SET experience_points = experience_points + 2,
        level = calculate_level(experience_points + 2)
    WHERE id = post_author_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist (safe re-run)
DROP TRIGGER IF EXISTS on_post_created_exp ON posts;
DROP TRIGGER IF EXISTS on_comment_created_exp ON comments;
DROP TRIGGER IF EXISTS on_vote_created_exp ON votes;

-- Create triggers
CREATE TRIGGER on_post_created_exp
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION award_post_exp();

CREATE TRIGGER on_comment_created_exp
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION award_comment_exp();

CREATE TRIGGER on_vote_created_exp
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION award_vote_exp();

-- Retroactively calculate EXP for existing users based on their activity
-- Posts: +10 each
UPDATE profiles p
SET experience_points = COALESCE((
  SELECT COUNT(*) * 10 FROM posts WHERE author_id = p.id
), 0) + COALESCE((
  SELECT COUNT(*) * 5 FROM comments WHERE author_id = p.id  
), 0) + COALESCE((
  SELECT COUNT(*) * 2 FROM votes v 
  JOIN posts po ON po.id = v.post_id 
  WHERE po.author_id = p.id AND v.user_id != p.id
), 0);

-- Update levels based on retroactive EXP
UPDATE profiles SET level = calculate_level(experience_points);
