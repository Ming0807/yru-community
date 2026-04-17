-- =====================================================
-- Phase 52: Frequency Capping & Viewability Tables
-- Required for Phase 2 frequency capping feature
-- =====================================================

-- Frequency cache for tracking how many times a user has seen an ad
CREATE TABLE IF NOT EXISTS ad_frequency_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  user_identifier VARCHAR(255) NOT NULL,
  impression_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_id, user_identifier)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_freq_cache_ad_user ON ad_frequency_cache(ad_id, user_identifier);
CREATE INDEX IF NOT EXISTS idx_freq_cache_last_seen ON ad_frequency_cache(last_seen_at);

-- Function to increment frequency (called when ad is shown)
CREATE OR REPLACE FUNCTION increment_ad_frequency(
  p_ad_id UUID,
  p_user_identifier VARCHAR(255)
) RETURNS VOID AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO ad_frequency_cache (ad_id, user_identifier, impression_count, first_seen_at, last_seen_at)
  VALUES (p_ad_id, p_user_identifier, 1, NOW(), NOW())
  ON CONFLICT (ad_id, user_identifier)
  DO UPDATE SET
    impression_count = ad_frequency_cache.impression_count + 1,
    last_seen_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check if ad is frequency capped (5+ views in 24h)
CREATE OR REPLACE FUNCTION check_ad_frequency_cap(
  p_ad_id UUID,
  p_user_identifier VARCHAR(255),
  p_max_views INTEGER DEFAULT 5,
  p_window_hours INTEGER DEFAULT 24
) RETURNS JSONB AS $$
DECLARE
  v_record RECORD;
  v_impression_count INTEGER := 0;
  v_capped BOOLEAN := FALSE;
BEGIN
  SELECT impression_count, last_seen_at INTO v_record
  FROM ad_frequency_cache
  WHERE ad_id = p_ad_id
    AND user_identifier = p_user_identifier
    AND last_seen_at > NOW() - (p_window_hours || ' hours')::INTERVAL;

  IF FOUND THEN
    v_impression_count := v_record.impression_count;
    v_capped := v_impression_count >= p_max_views;
  END IF;

  RETURN jsonb_build_object(
    'ad_id', p_ad_id,
    'user_identifier', p_user_identifier,
    'impression_count', v_impression_count,
    'capped', v_capped,
    'message', CASE WHEN v_capped THEN 'Frequency cap reached' ELSE 'OK' END
  );
END;
$$ LANGUAGE plpgsql;

-- Cleanup old frequency data (keep last 7 days only)
CREATE OR REPLACE FUNCTION cleanup_old_frequency_cache() RETURNS void AS $$
BEGIN
  DELETE FROM ad_frequency_cache
  WHERE last_seen_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Viewability settings
CREATE TABLE IF NOT EXISTS ad_viewability_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  min_viewability_score DECIMAL(5,2) DEFAULT 50.00,
  min_view_duration_ms INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to track viewability from an ad impression
CREATE OR REPLACE FUNCTION track_ad_viewability(
  p_ad_id UUID,
  p_viewable BOOLEAN,
  p_viewability_score DECIMAL DEFAULT NULL,
  p_in_view_duration_ms INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Log viewability metrics for analytics
  -- This could also update aggregated statistics
  RAISE NOTICE 'Viewability tracked: ad_id=%, viewable=%, score=%, duration=%',
    p_ad_id, p_viewable, p_viewability_score, p_in_view_duration_ms;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_ad_frequency(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION check_ad_frequency_cap(UUID, VARCHAR, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_frequency_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION track_ad_viewability(UUID, BOOLEAN, DECIMAL, INTEGER) TO authenticated;

COMMENT ON TABLE ad_frequency_cache IS 'Tracks how many times each user has seen each ad for frequency capping';
COMMENT ON TABLE ad_viewability_settings IS 'Per-campaign viewability thresholds following IAB standards';