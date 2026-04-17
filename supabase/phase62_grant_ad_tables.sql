-- =====================================================
-- Fix: Grant permissions for Ad and Analytics tables
-- =====================================================

-- This ensures both the Admin client (service_role) and User client (authenticated/anon)
-- have the base PostgreSQL permissions to read/write to these tables.
-- The RLS policies will still be respected for authenticated/anon users.

-- Ad system tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ad_campaigns TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ads TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ad_impressions TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ad_clicks TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ad_conversions TO service_role, authenticated;

GRANT SELECT ON TABLE public.ad_campaigns TO anon;
GRANT SELECT ON TABLE public.ads TO anon;
GRANT SELECT ON TABLE public.ad_impressions TO anon;
GRANT SELECT ON TABLE public.ad_clicks TO anon;

-- Analytics tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_analytics_events TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.page_performance_stats TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.custom_event_stats TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.video_engagement_stats TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.form_conversion_stats TO service_role, authenticated;

-- Attribution tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attribution_models TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attribution_model_results TO service_role, authenticated;

-- Ensure sequence permissions if they exist
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role, authenticated;
