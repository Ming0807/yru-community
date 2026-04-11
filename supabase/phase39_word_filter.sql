-- Word Filter Table for filtering inappropriate content
CREATE TABLE IF NOT EXISTS word_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(255) NOT NULL UNIQUE,
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
  action VARCHAR(20) DEFAULT 'warn', -- 'flag', 'warn', 'block'
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Index for searching
CREATE INDEX IF NOT EXISTS idx_word_filters_word ON word_filters(word);
CREATE INDEX IF NOT EXISTS idx_word_filters_active ON word_filters(is_active);

-- RLS
ALTER TABLE word_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage word filters" ON word_filters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can read word filters" ON word_filters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Add default word filters
INSERT INTO word_filters (word, severity, action) VALUES
  ('หยาบคาย', 'high', 'block'),
  ('คำหยาบ', 'high', 'block'),
  ('สปอยล์', 'medium', 'warn')
ON CONFLICT (word) DO NOTHING;

-- Add is_deleted column to comments if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'is_deleted') THEN
    ALTER TABLE comments ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
END
$$;