-- ==========================================
-- Phase 22: Comment Edit & Vote Toggle Fix
-- ==========================================

-- 1. Add updated_at column to comments
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Allow users to update their own comments
DROP POLICY IF EXISTS "Users can update own comment" ON public.comments;
CREATE POLICY "Users can update own comment"
  ON public.comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 3. Create trigger to auto-update updated_at on comment update
CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_updated_at ON public.comments;
CREATE TRIGGER trg_comment_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_updated_at();
