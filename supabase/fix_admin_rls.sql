-- Fix RLS policies for admin tables
-- Run this in Supabase SQL Editor

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can manage word filters" ON word_filters;
DROP POLICY IF EXISTS "Admins can manage badges" ON badges;
DROP POLICY IF EXISTS "Admins can manage user badges" ON user_badges;
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;

-- 2. Create permissive policies for authenticated admin users
-- For site_settings
CREATE POLICY "Admins can manage settings" ON site_settings 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- For word_filters
CREATE POLICY "Admins can manage word filters" ON word_filters 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- For badges
CREATE POLICY "Admins can manage badges" ON badges 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- For user_badges
CREATE POLICY "Admins can manage user badges" ON user_badges 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- For announcements
CREATE POLICY "Admins can manage announcements" ON announcements 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );