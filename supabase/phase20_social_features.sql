-- Phase 20: Social & Communication Features

-- 1. Add is_pinned to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- 2. Follows Table for user following feature
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (follower_id, following_id)
);

-- RLS for follows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows" ON follows
    FOR SELECT USING (true);

CREATE POLICY "Users can follow/unfollow" ON follows
    FOR ALL USING (auth.uid() = follower_id);

-- 3. Messages (Direct Messages) Table for real-time 1-on-1 chat
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read status of received messages" ON messages
    FOR UPDATE USING (auth.uid() = receiver_id);

-- 4. Post Reactions Table (beyond simple upvotes)
CREATE TABLE IF NOT EXISTS post_reactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(post_id, user_id)
);

-- RLS for post_reactions
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post reactions" ON post_reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own reactions" ON post_reactions
    FOR ALL USING (auth.uid() = user_id);

-- 5. Comment Votes Table (Reddit-style upvote/downvote for comments)
CREATE TABLE IF NOT EXISTS comment_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type INT NOT NULL CHECK (vote_type IN (1, -1)), -- 1 for upvote, -1 for downvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, user_id)
);

-- Add vote_count to comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS vote_count INT DEFAULT 0;

-- RLS for comment_votes
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment votes" ON comment_votes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own comment votes" ON comment_votes
    FOR ALL USING (auth.uid() = user_id);

-- Trigger for comment_votes to update comments vote_count automatically
CREATE OR REPLACE FUNCTION update_comment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET vote_count = vote_count + NEW.vote_type WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET vote_count = vote_count - OLD.vote_type WHERE id = OLD.comment_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type != NEW.vote_type THEN
      UPDATE comments SET vote_count = vote_count - OLD.vote_type + NEW.vote_type WHERE id = NEW.comment_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_comment_vote_count ON comment_votes;
CREATE TRIGGER trg_update_comment_vote_count
AFTER INSERT OR UPDATE OR DELETE ON comment_votes
FOR EACH ROW EXECUTE FUNCTION update_comment_vote_count();

-- Optional: Enable replica identity for messages table for Realtime
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Grant permissions explicitly just in case
GRANT SELECT, INSERT, UPDATE, DELETE ON follows TO authenticated;
GRANT SELECT ON follows TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT ON messages TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON post_reactions TO authenticated;
GRANT SELECT ON post_reactions TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON comment_votes TO authenticated;
GRANT SELECT ON comment_votes TO anon;
