-- 1. สร้างตารางถ้ายังไม่มี
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. อนุญาตสิทธิ์ระดับ Database 
GRANT ALL ON TABLE push_subscriptions TO authenticated;
GRANT ALL ON TABLE push_subscriptions TO service_role;

-- 3. เปิดการใช้งาน RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. ลบ Policy เดิมถ้ามี
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON push_subscriptions;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON push_subscriptions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON push_subscriptions;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON push_subscriptions;

-- 5. สร้าง Policy แกะเป็นราย Operation (รองรับ Upsert ได้ 100%)
CREATE POLICY "Enable read for users based on user_id" 
ON push_subscriptions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users based on user_id" 
ON push_subscriptions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" 
ON push_subscriptions FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" 
ON push_subscriptions FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
