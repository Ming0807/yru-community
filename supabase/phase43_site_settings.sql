-- Site settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB,
  description VARCHAR(255),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO site_settings (key, value, description) VALUES
  ('site_name', '"YRU Community"', 'ชื่อเว็บไซต์'),
  ('site_description', '"ศูนย์กลางชุมชนนักศึกษา มรย."', 'คำอธิบายเว็บไซต์'),
  ('maintenance_mode', 'false', 'โหมดบำรุงรักษา'),
  ('registration_open', 'true', 'เปิดให้สมัครสมาชิก'),
  ('email_verification_required', 'true', 'บังคับยืนยันอีเมล'),
  ('push_notifications_enabled', 'true', 'เปิดใช้งาน Push Notification')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON site_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);