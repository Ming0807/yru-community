-- ==========================================
-- Admin Dashboard SQL Migration
-- ==========================================

-- 1. Add 'role' and 'status' columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));

-- 2. Create index on role for faster auth checks
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

-- 3. Create a SECURITY DEFINER function to check admin role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Admin RLS Policies (using is_admin() to avoid infinite recursion)

-- Profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated USING ( public.is_admin() );
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated USING ( public.is_admin() );

-- Posts
CREATE POLICY "Admins can update any post"
  ON public.posts FOR UPDATE TO authenticated USING ( public.is_admin() );
CREATE POLICY "Admins can delete any post"
  ON public.posts FOR DELETE TO authenticated USING ( public.is_admin() );

-- Comments
CREATE POLICY "Admins can update any comment"
  ON public.comments FOR UPDATE TO authenticated USING ( public.is_admin() );
CREATE POLICY "Admins can delete any comment"
  ON public.comments FOR DELETE TO authenticated USING ( public.is_admin() );

-- Reports
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT TO authenticated USING ( public.is_admin() );
CREATE POLICY "Admins can update all reports"
  ON public.reports FOR UPDATE TO authenticated USING ( public.is_admin() );
CREATE POLICY "Admins can delete all reports"
  ON public.reports FOR DELETE TO authenticated USING ( public.is_admin() );

-- Categories
CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT TO authenticated WITH CHECK ( public.is_admin() );
CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE TO authenticated USING ( public.is_admin() );
CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE TO authenticated USING ( public.is_admin() );

-- Note: To make someone an admin, run this command manually in Supabase SQL editor:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your_email@yru.ac.th';
