-- ==========================================
-- Phase 27: Ad Tracking RPC Functions
-- ==========================================

-- Atomic increment for ad impressions (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ads SET impressions = impressions + 1 WHERE id = ad_id;
END;
$$;

-- Atomic increment for ad clicks
CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ads SET clicks = clicks + 1 WHERE id = ad_id;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION increment_ad_impressions(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_ad_clicks(UUID) TO anon, authenticated;
