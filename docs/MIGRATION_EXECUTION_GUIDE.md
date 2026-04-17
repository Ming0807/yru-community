# SQL Migration Execution Guide

**Version:** 1.0
**Date:** 14 April 2026
**Status:** Ready to Execute

---

## Overview

This guide covers the execution of all pending SQL migrations for the Ads, Tracking, and Analytics system improvements.

---

## Migration Order

**IMPORTANT:** Execute migrations in the exact order listed below. Each migration may depend on objects created by previous migrations.

```
1. phase50_critical_fixes.sql    ← Run FIRST (fixes critical issues)
2. phase46_user_segments.sql     ← User segmentation system
3. phase48_user_interests.sql    ← User interest tracking
4. phase49_targeting_rules.sql   ← Targeting rules engine
5. phase51_ab_testing.sql        ← A/B testing infrastructure
6. phase52_frequency_viewability.sql ← Frequency capping & viewability
```

---

## Pre-Migration Checklist

### 1. Backup Database
```bash
# Using Supabase CLI
supabase db dump --db-url <your-database-url> --file backup_before_migrations.sql

# Or via pg_dump
pg_dump -h <host> -U <user> -d <database> -f backup_before_migrations.sql
```

### 2. Verify Staging First
All migrations should be tested on a staging environment before production.

### 3. Check for Conflicts
```sql
-- Run this to check for any existing objects that might conflict
SELECT
  'ad_impressions' as table_name,
  COUNT(*) as exists_count
FROM information_schema.tables
WHERE table_name IN (
  'ad_impressions', 'ad_clicks', 'ad_conversions',
  'targeting_rules', 'user_segments', 'user_interests',
  'experiments', 'experiment_assignments', 'ad_frequency_cache'
);
```

---

## Migration Details

### Phase 50: Critical Fixes (Run First!)

**File:** `supabase/phase50_critical_fixes.sql`

**What it does:**
- Adds `event_id` column to `user_analytics_events` for deduplication
- Creates optimized `get_matching_rules_for_user()` function (fixes RANDOM() in WHERE clause)
- Adds missing database indexes for performance
- Creates cron job functions for segment updates and interest decay
- Fixes potential index typos

**Execution time:** ~5 seconds

**Verification:**
```sql
-- Check event_id column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_analytics_events' AND column_name = 'event_id';

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('ad_impressions', 'ad_clicks', 'ad_conversions')
AND indexname LIKE '%campaign_time%';

-- Check new functions exist
SELECT proname FROM pg_proc WHERE proname IN (
  'cron_update_user_segments', 'cron_decay_user_interests',
  'get_matching_rules_for_user'
);
```

**On Error:** This migration uses `CREATE OR REPLACE` and `CREATE INDEX IF NOT EXISTS`, so it's mostly safe to re-run. If specific errors occur, check the individual statements.

---

### Phase 46: User Segments

**File:** `supabase/phase46_user_segments.sql`

**What it does:**
- Creates `user_segments` table
- Creates `update_user_segments()` function
- Creates segment computation triggers (commented, use cron instead)
- Creates `batch_compute_user_segments()` for scheduled updates

**Execution time:** ~10 seconds

**Verification:**
```sql
-- Check tables and functions exist
SELECT 'user_segments' FROM information_schema.tables
WHERE table_name = 'user_segments';

SELECT proname FROM pg_proc WHERE proname = 'update_user_segments';
```

**Triggers note:** The original triggers are commented out in favor of the cron job approach for better performance control.

---

### Phase 48: User Interests

**File:** `supabase/phase48_user_interests.sql`

**What it does:**
- Creates `user_interests` table
- Creates `interest_decay_settings` table
- Creates `update_user_interest()` function
- Creates decay calculation logic

**Execution time:** ~10 seconds

**Verification:**
```sql
SELECT 'user_interests' FROM information_schema.tables WHERE table_name = 'user_interests';
SELECT 'interest_decay_settings' FROM information_schema.tables WHERE table_name = 'interest_decay_settings';
```

---

### Phase 49: Targeting Rules

**File:** `supabase/phase49_targeting_rules.sql`

**What it does:**
- Creates `targeting_rules` table
- Creates `evaluate_rule_conditions()` function
- Creates/updates `get_matching_rules_for_user()` function
- Sets up RLS policies

**Important:** Phase 50 replaces the `get_matching_rules_for_user` function to fix the RANDOM() issue. After running this migration, Phase 50's version will override it.

**Execution time:** ~15 seconds

**Verification:**
```sql
SELECT 'targeting_rules' FROM information_schema.tables WHERE table_name = 'targeting_rules';
SELECT proname FROM pg_proc WHERE proname = 'evaluate_rule_conditions';
```

---

### Phase 51: A/B Testing

**File:** `supabase/phase51_ab_testing.sql`

**What it does:**
- Creates `experiments` table
- Creates `experiment_assignments` table
- Creates `get_experiment_assignment()` RPC function
- Creates `track_experiment_conversion()` RPC function
- Creates `get_experiment_stats()` RPC function

**Execution time:** ~10 seconds

**Verification:**
```sql
SELECT 'experiments' FROM information_schema.tables WHERE table_name = 'experiments';
SELECT 'experiment_assignments' FROM information_schema.tables WHERE table_name = 'experiment_assignments';
```

---

### Phase 52: Frequency Capping & Viewability

**File:** `supabase/phase52_frequency_viewability.sql`

**What it does:**
- Creates `ad_frequency_cache` table
- Creates `increment_ad_frequency()` function
- Creates `check_ad_frequency_cap()` function
- Creates `ad_viewability_settings` table
- Creates `track_ad_viewability()` function
- Creates cleanup functions

**Execution time:** ~10 seconds

**Verification:**
```sql
SELECT 'ad_frequency_cache' FROM information_schema.tables WHERE table_name = 'ad_frequency_cache';
SELECT 'ad_viewability_settings' FROM information_schema.tables WHERE table_name = 'ad_viewability_settings';
```

---

## Post-Migration Checklist

### 1. Verify All Objects Created
```sql
-- Run this comprehensive check
SELECT
  'Tables' as category,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'ad_impressions', 'ad_clicks', 'ad_conversions',
  'user_segments', 'user_interests', 'targeting_rules',
  'experiments', 'experiment_assignments',
  'ad_frequency_cache', 'ad_viewability_settings'
)
UNION ALL
SELECT
  'Functions' as category,
  COUNT(*) as count
FROM pg_proc
WHERE proname IN (
  'get_matching_rules_for_user', 'get_experiment_assignment',
  'track_experiment_conversion', 'increment_ad_frequency',
  'check_ad_frequency_cap', 'cron_update_user_segments'
);
```

### 2. Test Key Features

**Test Deduplication:**
```javascript
// Send same event_id twice
const response1 = await fetch('/api/track', {
  method: 'POST',
  body: JSON.stringify({ event_id: 'test-123', event_type: 'page_view' })
});
const response2 = await fetch('/api/track', {
  method: 'POST',
  body: JSON.stringify({ event_id: 'test-123', event_type: 'page_view' })
});
// Second should return { success: true, deduplicated: true }
```

**Test Frequency Capping:**
```javascript
const response = await fetch('/api/ads/track?ad_id=xxx&user_id=yyy');
// Returns { impression_count, capped, message }
```

**Test Targeting Rules:**
```javascript
const response = await fetch('/api/targeting/evaluate?user_id=xxx');
// Returns { matching_rules: [...], total_matches: N }
```

### 3. Set Up Cron Jobs (Optional)

If using cron jobs for segment updates:
```sql
-- Enable pg_cron extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule segment updates every hour
SELECT cron.schedule('update-user-segments', '0 * * * *', 'SELECT cron_update_user_segments()');

-- Schedule interest decay daily
SELECT cron.schedule('decay-user-interests', '0 3 * * *', 'SELECT cron_decay_user_interests()');

-- Schedule frequency cache cleanup daily
SELECT cron.schedule('cleanup-frequency-cache', '0 4 * * *', 'SELECT cleanup_old_frequency_cache()');
```

---

## Rollback Procedure

If critical issues occur:

### Option 1: Full Restore
```bash
psql -h <host> -U <user> -d <database> -f backup_before_migrations.sql
```

### Option 2: Selective Rollback
Individual migrations can be rolled back using DROP commands:
```sql
-- Example rollback for phase52
DROP FUNCTION IF EXISTS track_ad_viewability(UUID, BOOLEAN, DECIMAL, INTEGER);
DROP FUNCTION IF EXISTS cleanup_old_frequency_cache();
DROP FUNCTION IF EXISTS check_ad_frequency_cap(UUID, VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS increment_ad_frequency(UUID, VARCHAR);
DROP TABLE IF EXISTS ad_viewability_settings;
DROP TABLE IF EXISTS ad_frequency_cache;
```

---

## Performance Considerations

### Indexes Created
- `idx_ad_impressions_campaign_time` - Faster campaign analytics
- `idx_ad_clicks_campaign_time` - Faster click analytics
- `idx_ad_conversions_campaign_time` - Faster conversion analytics
- `idx_user_segments_type_computed` - Faster segment queries
- `idx_targeting_rules_active_priority` - Faster rule matching
- `idx_freq_cache_ad_user` - Fast frequency lookups

### Expected Performance Impact
- **Tracking API:** Minimal impact (new indexes will help reads)
- **Analytics queries:** 20-30% improvement on large datasets
- **Targeting evaluation:** Same or slightly slower due to new function logic

---

## Support

For issues:
1. Check the verification queries for each phase
2. Review Supabase logs: `supabase logs`
3. Check for constraint violations
4. Verify RLS policies allow required operations

---

**End of Migration Guide**