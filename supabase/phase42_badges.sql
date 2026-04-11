-- Badges table for user achievements
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50), -- emoji or icon name
  color VARCHAR(50), -- color class
  criteria JSONB, -- criteria for auto-assignment
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User badges (many-to-many)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_by UUID REFERENCES profiles(id),
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);

-- RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage badges" ON badges FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage user badges" ON user_badges FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Insert default badges
INSERT INTO badges (name, description, icon, color, criteria) VALUES
  ('verified', 'ผู้ใช้ที่ยืนยันตัวตนนักศึกษา', '✓', 'bg-blue-100 text-blue-700', '{"type": "email_verified"}'),
  ('top_contributor', 'ผู้ใช้ที่มีการมีส่วนร่วมสูง', '⭐', 'bg-yellow-100 text-yellow-700', '{"type": "high_activity", "threshold": 100}'),
  ('early_adopter', 'ผู้ใช้รุ่นแรกของระบบ', '🌟', 'bg-purple-100 text-purple-700', '{"type": "early_signup"}'),
  ('helpful', 'ผู้ช่วยเหลือ - ตอบคำถามบ่อย', '🤝', 'bg-green-100 text-green-700', '{"type": "helpful_answers", "threshold": 50}'),
  ('veteran', 'ใช้งานมานานกว่า 1 ปี', '🎖️', 'bg-orange-100 text-orange-700', '{"type": "account_age_days", "threshold": 365}')
ON CONFLICT (name) DO NOTHING;