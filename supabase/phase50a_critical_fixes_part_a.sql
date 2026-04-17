-- =====================================================
-- Phase 50a: Critical Fixes - Part A (Run FIRST)
-- Run this BEFORE running phase51, phase52, etc.
-- =====================================================

-- 1. Add event_id column to user_analytics_events for deduplication
-- This doesn't reference any new tables, safe to run first
ALTER TABLE user_analytics_events ADD COLUMN IF NOT EXISTS event_id UUID;
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_id ON user_analytics_events(event_id) WHERE event_id IS NOT NULL;

COMMENT ON COLUMN user_analytics_events.event_id IS 'UUID for deduplication of events across retries';

-- =====================================================
-- Verification queries (run these to check)
-- =====================================================

-- Check that event_id column exists:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_analytics_events' AND column_name = 'event_id';