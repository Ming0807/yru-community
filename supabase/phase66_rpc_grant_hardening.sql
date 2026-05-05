-- =====================================================
-- Phase 66: RPC grant hardening for admin/internal functions
-- Purpose:
-- - Revoke direct client execution for admin analytics, cache, targeting,
--   budget, and internal trigger/helper RPCs found in the remote advisors.
-- - Keep public/client-facing flows behind Next.js API routes that already
--   perform auth/role checks and use the service role where elevated access is
--   required.
-- =====================================================

-- -----------------------------------------------------
-- Admin analytics / attribution compute RPCs.
-- Used only by /api/admin/** after requireAdmin()/requireModerator().
-- -----------------------------------------------------
REVOKE ALL ON FUNCTION public.build_attribution_sequences(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_data_driven_attribution(DATE, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_markov_attribution(DATE, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_shapley_attribution(DATE, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_analytics_summary(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_device_stats(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_event_type_stats(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_events_timeline(TIMESTAMPTZ, TIMESTAMPTZ, VARCHAR) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.build_attribution_sequences(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_data_driven_attribution(DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_markov_attribution(DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_shapley_attribution(DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_analytics_summary(TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_device_stats(TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_type_stats(TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_events_timeline(TIMESTAMPTZ, TIMESTAMPTZ, VARCHAR) TO service_role;

ALTER FUNCTION public.build_attribution_sequences(TIMESTAMPTZ, TIMESTAMPTZ) SET search_path = public;
ALTER FUNCTION public.calculate_data_driven_attribution(DATE, DATE) SET search_path = public;
ALTER FUNCTION public.calculate_markov_attribution(DATE, DATE) SET search_path = public;
ALTER FUNCTION public.calculate_shapley_attribution(DATE, DATE) SET search_path = public;
ALTER FUNCTION public.get_analytics_summary(TIMESTAMPTZ) SET search_path = public;
ALTER FUNCTION public.get_device_stats(TIMESTAMPTZ) SET search_path = public;
ALTER FUNCTION public.get_event_type_stats(TIMESTAMPTZ) SET search_path = public;
ALTER FUNCTION public.get_events_timeline(TIMESTAMPTZ, TIMESTAMPTZ, VARCHAR) SET search_path = public;

-- -----------------------------------------------------
-- Cache maintenance RPCs.
-- -----------------------------------------------------
REVOKE ALL ON FUNCTION public.get_cache_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.invalidate_cache(VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.invalidate_cache_by_tags(TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.invalidate_cache_by_type(VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_or_set_cache(VARCHAR, VARCHAR, INTEGER, TEXT[], JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clean_expired_cache() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.schedule_cache_cleanup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.warmup_common_caches() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_cache_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.invalidate_cache(VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.invalidate_cache_by_tags(TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.invalidate_cache_by_type(VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_or_set_cache(VARCHAR, VARCHAR, INTEGER, TEXT[], JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.clean_expired_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.schedule_cache_cleanup() TO service_role;
GRANT EXECUTE ON FUNCTION public.warmup_common_caches() TO service_role;

ALTER FUNCTION public.get_cache_stats() SET search_path = public;
ALTER FUNCTION public.get_or_set_cache(VARCHAR, VARCHAR, INTEGER, TEXT[], JSONB) SET search_path = public;
ALTER FUNCTION public.clean_expired_cache() SET search_path = public;
ALTER FUNCTION public.schedule_cache_cleanup() SET search_path = public;
ALTER FUNCTION public.warmup_common_caches() SET search_path = public;

-- -----------------------------------------------------
-- Targeting evaluation RPCs.
-- Public access now goes through server endpoints that verify user ownership
-- or admin/moderator role before using the service role.
-- -----------------------------------------------------
REVOKE ALL ON FUNCTION public.apply_targeting_rules(UUID, UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_matching_rules_for_user(UUID, UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_rule_conditions(JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_targeting_rules(UUID, UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_matching_rules_for_user(UUID, UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_rule_conditions(JSONB, JSONB, JSONB) TO service_role;

-- -----------------------------------------------------
-- Budget alert RPCs.
-- -----------------------------------------------------
REVOKE ALL ON FUNCTION public.generate_budget_alerts(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.acknowledge_budget_alert(UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.generate_budget_alerts(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.acknowledge_budget_alert(UUID, UUID) TO service_role;

ALTER FUNCTION public.generate_budget_alerts(UUID) SET search_path = public;
ALTER FUNCTION public.acknowledge_budget_alert(UUID, UUID) SET search_path = public;

-- -----------------------------------------------------
-- Ad/internal helper RPCs not intended for direct browser RPC calls.
-- -----------------------------------------------------
REVOKE ALL ON FUNCTION public.cleanup_old_frequency_cache() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.track_ad_viewability(UUID, BOOLEAN, NUMERIC, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_custom_event(VARCHAR, VARCHAR, VARCHAR, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_reaction_notification() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cleanup_old_frequency_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.track_ad_viewability(UUID, BOOLEAN, NUMERIC, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_custom_event(VARCHAR, VARCHAR, VARCHAR, UUID, TEXT, JSONB) TO service_role;

ALTER FUNCTION public.handle_new_reaction_notification() SET search_path = public;
