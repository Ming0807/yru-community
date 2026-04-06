-- ==========================================
-- Phase 28: Online Presence
-- ==========================================

-- Add last_seen and is_online columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

-- Create a presence tracking table for real-time online status
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now()
);

-- RLS for presence table
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read presence" ON user_presence;
CREATE POLICY "Anyone can read presence"
  ON user_presence FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;
CREATE POLICY "Users can update own presence"
  ON user_presence FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update last_seen on profiles
CREATE OR REPLACE FUNCTION update_user_presence()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_presence (user_id, is_online, last_seen)
  VALUES (NEW.user_id, true, now())
  ON CONFLICT (user_id) DO UPDATE SET is_online = true, last_seen = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
