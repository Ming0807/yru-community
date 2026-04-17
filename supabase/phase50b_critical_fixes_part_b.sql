-- =====================================================
-- Phase 50b: Critical Fixes - Part B (Run AFTER phase51-56)
-- This file contains indexes and fixes that require tables
-- from phase51 (user_segments), phase52 (ad_* tables), etc.
-- =====================================================

-- 1. Add missing indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign_time ON ad_impressions(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_campaign_time ON ad_clicks(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_conversions_campaign_time ON ad_conversions(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_segments_type_computed ON user_segments(segment_type, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_targeting_rules_active_priority ON targeting_rules(is_active DESC, priority DESC) WHERE is_active = true;

-- 2. Fix index typo in phase52 (ad_ad_clicks -> ad_clicks)
DROP INDEX IF EXISTS idx_ad_clicks_campaign_id;
CREATE INDEX IF NOT EXISTS idx_ad_clicks_campaign_id ON ad_clicks(campaign_id);

-- 3. Grant permissions for functions that exist
GRANT EXECUTE ON FUNCTION get_matching_rules_for_user(UUID, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION evaluate_rule_conditions(JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_targeting_rules(UUID, UUID, UUID, JSONB) TO authenticated;

-- =====================================================
-- Note: 
-- - cron_update_user_segments() was supposed to be in phase51 but was skipped
-- - cron_decay_user_interests() was supposed to be in phase53 but was skipped
-- If needed, create them manually
-- =====================================================