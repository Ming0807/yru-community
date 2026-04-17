-- ==========================================
-- Fix: User Segments RLS Policy
-- Fix from phase51_user_segments.sql - wrong RLS policy
-- ==========================================

-- Fix: Admin can view all segments (use profiles table, not JWT)
DROP POLICY IF EXISTS "Admin can view all user segments" ON user_segments;

CREATE POLICY "Admin can view all user segments"
    ON user_segments FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator')
      )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.targeting_rules TO service_role, authenticated;
GRANT SELECT ON TABLE public.targeting_rules TO anon;

-- อนุญาตให้อ่าน Views ทั้งหมดที่เพิ่งถูกเพิ่มเข้ามาใหม่
GRANT SELECT ON public.ads_with_campaigns TO anon, authenticated, service_role;
GRANT SELECT ON public.campaign_performance TO anon, authenticated, service_role;
