-- ==========================================
-- Phase 24: Profile Enhancements
-- ==========================================

-- 1. Add bio column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Add index for activity queries
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON public.post_reactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_user ON public.votes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
