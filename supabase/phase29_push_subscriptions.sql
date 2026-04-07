-- ==========================================
-- Phase 29: Push Subscriptions Table
-- ==========================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
