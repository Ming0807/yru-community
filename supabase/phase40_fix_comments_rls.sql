-- Fix RLS for comments table - use author_id instead of user_id
DROP POLICY IF EXISTS "Users can read own comments" ON comments;

-- Allow read for authenticated users (posts/comments are public)
CREATE POLICY "Authenticated users can read comments" ON comments
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow insert for authenticated users
CREATE POLICY "Authenticated users can insert comments" ON comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow update for comment author or admin/moderator
CREATE POLICY "Users can update comments" ON comments
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    )
  );

-- Allow delete for comment author or admin/moderator
CREATE POLICY "Users can delete comments" ON comments
  FOR DELETE USING (
    auth.role() = 'authenticated' AND (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    )
  );

-- Add is_deleted column if not exists
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;