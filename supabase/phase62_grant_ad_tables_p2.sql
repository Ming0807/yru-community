-- ให้สิทธิ์ในการเข้าถึงตาราง Frequency และ Viewability
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ad_frequency_cache TO service_role, authenticated;
GRANT SELECT ON TABLE public.ad_frequency_cache TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ad_viewability_settings TO service_role, authenticated;
GRANT SELECT ON TABLE public.ad_viewability_settings TO anon;
