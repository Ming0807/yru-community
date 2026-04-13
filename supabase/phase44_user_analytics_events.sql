-- ==========================================
-- Phase 44: User Analytics Events (Event-Driven Tracking)
-- PDPA-Compliant: No PII stored, Anonymous events only
-- ==========================================

-- User behavior events table (anonymous tracking)
CREATE TABLE IF NOT EXISTS user_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification (no user_id stored for privacy)
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}',
  
  -- Context (no PII)
  session_id VARCHAR(64),
  page_path TEXT,
  referrer TEXT,
  
  -- Anonymous user fingerprint (no personal data)
  device_type VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(50),
  os VARCHAR(50),
  
  -- Engagement metrics
  scroll_depth INTEGER, -- 0-100 percentage
  time_on_page INTEGER, -- seconds (from page load, not absolute)
  hover_duration INTEGER, -- milliseconds on specific element
  
  -- Content context (ids only, no personal data)
  post_id UUID,
  category_id INTEGER,
  
  -- Ad tracking context
  ad_id UUID,
  ad_impression_id UUID, -- separate from ad_id for impression counting
  ad_position VARCHAR(20), -- 'feed', 'sidebar', 'banner'
  ad_visibility VARCHAR(20), -- 'visible', 'hidden', '50%', '100%'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Event timestamp for deduplication
  event_timestamp TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON user_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON user_analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON user_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_post ON user_analytics_events(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_ad ON user_analytics_events(ad_id) WHERE ad_id IS NOT NULL;

-- RLS - Public can INSERT (tracking), Admins can SELECT
ALTER TABLE user_analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (anonymous tracking)
CREATE POLICY "Anyone can track events"
ON user_analytics_events FOR INSERT
WITH CHECK (true);

-- Only admins can view/manage events
CREATE POLICY "Admins can view events"
ON user_analytics_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- Admins can delete old events
CREATE POLICY "Admins can delete events"
ON user_analytics_events FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ==========================================
-- Helper view: Event summaries by type
-- ==========================================
CREATE OR REPLACE VIEW event_type_stats AS
SELECT 
  event_type,
  COUNT(*) as total_events,
  COUNT(DISTINCT session_id) as unique_sessions,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  AVG(scroll_depth) FILTER (WHERE scroll_depth IS NOT NULL) as avg_scroll_depth,
  AVG(time_on_page) FILTER (WHERE time_on_page IS NOT NULL) as avg_time_on_page
FROM user_analytics_events
GROUP BY event_type;

-- ==========================================
-- Helper view: Ad performance events
-- ==========================================
CREATE OR REPLACE VIEW ad_event_stats AS
SELECT 
  ad_id,
  COUNT(*) FILTER (WHERE event_type = 'ad_impression') as impressions,
  COUNT(*) FILTER (WHERE event_type = 'ad_click') as clicks,
  COUNT(*) FILTER (WHERE event_type = 'ad_hover') as hovers,
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'ad_impression') as unique_impressions,
  AVG(scroll_depth) FILTER (WHERE event_type = 'ad_impression' AND scroll_depth IS NOT NULL) as avg_viewport_scroll
FROM user_analytics_events
WHERE ad_id IS NOT NULL
GROUP BY ad_id;

-- ==========================================
-- Data retention: Auto-delete events older than 90 days
-- (GDPR/PDPA compliance - data minimization)
-- ==========================================
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_analytics_events
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- Grant execute to admins
GRANT EXECUTE ON FUNCTION cleanup_old_analytics_events() TO authenticated;

-- ==========================================
-- RPC function for batch event insertion (performance)
-- ==========================================
CREATE OR REPLACE FUNCTION batch_insert_events(events JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_analytics_events (event_type, event_data, session_id, page_path, referrer, device_type, browser, os, scroll_depth, time_on_page, hover_duration, post_id, category_id, ad_id, ad_impression_id, ad_position, ad_visibility, event_timestamp)
  SELECT * FROM jsonb_array_elements(events) WITH ORDINALITY AS e(
    event_type, event_data, session_id, page_path, referrer, device_type, browser, os, scroll_depth, time_on_page, hover_duration, post_id, category_id, ad_id, ad_impression_id, ad_position, ad_visibility, event_timestamp
  );
END;
$$;

GRANT EXECUTE ON FUNCTION batch_insert_events(JSONB) TO anon, authenticated;