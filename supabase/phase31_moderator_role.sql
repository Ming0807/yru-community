-- ==========================================
-- Phase 31: Moderator Role
-- ==========================================

-- 1. Update profiles role check constraint to include 'moderator'
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'moderator', 'user'));

-- 2. Update is_admin function to also check for moderator
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role IN ('admin', 'moderator'), false);
END;
$$;

-- 3. Create is_moderator function (moderator OR admin)
CREATE OR REPLACE FUNCTION is_moderator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role IN ('admin', 'moderator'), false);
END;
$$;

-- 4. Update admin RLS policies to include moderators
DROP POLICY IF EXISTS "Admins can update any comment" ON public.comments;
CREATE POLICY "Moderators can update any comment"
  ON public.comments FOR UPDATE
  USING (is_moderator());

DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
CREATE POLICY "Moderators can delete any comment"
  ON public.comments FOR DELETE
  USING (is_moderator());

DROP POLICY IF EXISTS "Admins can update any post" ON public.posts;
CREATE POLICY "Moderators can update any post"
  ON public.posts FOR UPDATE
  USING (is_moderator());

DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
CREATE POLICY "Moderators can delete any post"
  ON public.posts FOR DELETE
  USING (is_moderator());

DROP POLICY IF EXISTS "Admins can view reports" ON public.reports;
CREATE POLICY "Moderators can view reports"
  ON public.reports FOR SELECT
  USING (is_moderator());

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Moderators can update reports"
  ON public.reports FOR UPDATE
  USING (is_moderator());
