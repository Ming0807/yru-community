-- ==========================================
-- Phase 63: Query Cache System
-- In-database caching for expensive queries (Redis alternative)
-- ==========================================

-- Cache entries table
CREATE TABLE IF NOT EXISTS query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cache key (unique identifier for the cached query)
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  
  -- Cached data
  cache_data JSONB NOT NULL,
  
  -- Metadata
  cache_type VARCHAR(50) NOT NULL, -- 'analytics', 'ads', 'budget', 'attribution'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  
  -- Tags for invalidation
  tags TEXT[] DEFAULT '{}'
);

-- Cache tags for group invalidation
CREATE TABLE IF NOT EXISTS cache_tags (
  tag VARCHAR(100) NOT NULL,
  cache_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tag, cache_key)
);

-- Indexes for cache performance
CREATE INDEX IF NOT EXISTS idx_query_cache_key ON query_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_query_cache_type ON query_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_query_cache_hit_count ON query_cache(hit_count DESC);

-- RLS
ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read cache"
ON query_cache FOR SELECT
USING (expires_at > now());

CREATE POLICY "Service role can manage cache"
ON query_cache FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Anyone can read cache tags"
ON cache_tags FOR SELECT
USING (true);

CREATE POLICY "Service role can manage cache tags"
ON cache_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Function to get or set cache
CREATE OR REPLACE FUNCTION get_or_set_cache(
  p_cache_key VARCHAR,
  p_cache_type VARCHAR,
  p_ttl_seconds INTEGER,
  p_tags TEXT[],
  p_data_generator JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cached_data JSONB;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Try to get existing cache
  SELECT cache_data INTO v_cached_data
  FROM query_cache
  WHERE cache_key = p_cache_key
    AND expires_at > now();

  IF v_cached_data IS NOT NULL THEN
    -- Update hit count
    UPDATE query_cache
    SET hit_count = hit_count + 1,
        last_hit_at = now()
    WHERE cache_key = p_cache_key;
    
    RETURN jsonb_build_object(
      'cached', true,
      'data', v_cached_data,
      'cache_key', p_cache_key
    );
  END IF;

  -- Generate new data (execute the generator)
  -- Note: In production, this would call the actual query
  v_cached_data := p_data_generator;

  -- Calculate expiration
  v_expires_at := now() + (p_ttl_seconds || ' seconds')::INTERVAL;

  -- Store in cache
  INSERT INTO query_cache (cache_key, cache_type, cache_data, expires_at, tags)
  VALUES (p_cache_key, p_cache_type, v_cached_data, v_expires_at, p_tags)
  ON CONFLICT (cache_key) DO UPDATE SET
    cache_data = EXCLUDED.cache_data,
    expires_at = EXCLUDED.expires_at,
    tags = EXCLUDED.tags,
    created_at = now(),
    hit_count = 0;

  -- Update tags
  DELETE FROM cache_tags WHERE cache_key = p_cache_key;
  FOR i IN 1..array_length(p_tags, 1) LOOP
    INSERT INTO cache_tags (tag, cache_key) VALUES (p_tags[i], p_cache_key)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object(
    'cached', false,
    'data', v_cached_data,
    'cache_key', p_cache_key
  );
END;
$$;

-- Function to invalidate cache by key
CREATE OR REPLACE FUNCTION invalidate_cache(p_cache_key VARCHAR)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM query_cache WHERE cache_key = p_cache_key;
  DELETE FROM cache_tags WHERE cache_key = p_cache_key;
END;
$$;

-- Function to invalidate cache by tags
CREATE OR REPLACE FUNCTION invalidate_cache_by_tags(p_tags TEXT[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM query_cache
  WHERE cache_key IN (
    SELECT cache_key FROM cache_tags WHERE tag = ANY(p_tags)
  );
  
  DELETE FROM cache_tags WHERE tag = ANY(p_tags);
END;
$$;

-- Function to invalidate cache by type
CREATE OR REPLACE FUNCTION invalidate_cache_by_type(p_cache_type VARCHAR)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM query_cache WHERE cache_type = p_cache_type;
  DELETE FROM cache_tags WHERE cache_key IN (
    SELECT cache_key FROM query_cache WHERE cache_type = p_cache_type
  );
END;
$$;

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM query_cache WHERE expires_at < now();
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  DELETE FROM cache_tags WHERE cache_key NOT IN (SELECT cache_key FROM query_cache);
  
  RETURN v_deleted_count;
END;
$$;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
  cache_type VARCHAR,
  total_entries BIGINT,
  total_hits BIGINT,
  avg_hit_count NUMERIC,
  oldest_entry TIMESTAMPTZ,
  newest_entry TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    qc.cache_type,
    COUNT(*)::BIGINT as total_entries,
    SUM(qc.hit_count)::BIGINT as total_hits,
    AVG(qc.hit_count)::NUMERIC as avg_hit_count,
    MIN(qc.created_at) as oldest_entry,
    MAX(qc.created_at) as newest_entry
  FROM query_cache qc
  WHERE qc.expires_at > now()
  GROUP BY qc.cache_type
  ORDER BY total_hits DESC;
END;
$$;

-- View: Active cache entries
CREATE OR REPLACE VIEW active_cache_entries AS
SELECT
  cache_key,
  cache_type,
  created_at,
  expires_at,
  hit_count,
  last_hit_at,
  tags,
  jsonb_pretty(cache_data) as data_preview
FROM query_cache
WHERE expires_at > now()
ORDER BY hit_count DESC;

-- Auto-cleanup: Run daily (can be scheduled via cron)
-- Insert a job to clean expired cache
CREATE OR REPLACE FUNCTION schedule_cache_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This would be called by a cron job or webhook
  PERFORM clean_expired_cache();
END;
$$;

-- Helper: Pre-warm common caches
CREATE OR REPLACE FUNCTION warmup_common_caches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Clear old caches
  PERFORM clean_expired_cache();
  
  -- Note: Actual warmup would call get_or_set_cache with specific queries
  -- This is a placeholder for the warmup process
  RAISE NOTICE 'Cache warmup initiated at %', v_now;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_set_cache(VARCHAR, VARCHAR, INTEGER, TEXT[], JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_cache(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_cache_by_tags(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_cache_by_type(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cache_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_cache_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION warmup_common_caches() TO authenticated;