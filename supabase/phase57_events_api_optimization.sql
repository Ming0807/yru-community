-- ==========================================
-- Phase 57: Events API Optimization
-- Replaces JS aggregation with SQL aggregation
-- ==========================================

-- ==========================================
-- Analytics Summary RPC Function
-- Consolidated summary stats in one call
-- ==========================================
CREATE OR REPLACE FUNCTION get_analytics_summary(start_date TIMESTAMPTZ)
RETURNS TABLE (
  total_events BIGINT,
  unique_sessions BIGINT,
  avg_events_per_session NUMERIC(10,2),
  total_page_views BIGINT,
  total_ad_impressions BIGINT,
  total_ad_clicks BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_events,
    COUNT(DISTINCT session_id) AS unique_sessions,
    CASE
      WHEN COUNT(DISTINCT session_id) > 0
      THEN ROUND(COUNT(*)::NUMERIC / COUNT(DISTINCT session_id), 2)
      ELSE 0
    END AS avg_events_per_session,
    COUNT(*) FILTER (WHERE event_type = 'page_view') AS total_page_views,
    COUNT(*) FILTER (WHERE event_type = 'ad_impression') AS total_ad_impressions,
    COUNT(*) FILTER (WHERE event_type = 'ad_click') AS total_ad_clicks
  FROM user_analytics_events
  WHERE created_at >= start_date;
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_summary(TIMESTAMPTZ) TO authenticated;

-- ==========================================
-- Ad Performance Stats View (consolidated)
-- Returns one row per ad with all metrics
-- ==========================================
CREATE OR REPLACE VIEW ad_performance_summary AS
SELECT
  ad_id,
  COUNT(*) FILTER (WHERE event_type = 'ad_impression') AS impressions,
  COUNT(*) FILTER (WHERE event_type = 'ad_click') AS clicks,
  COUNT(*) FILTER (WHERE event_type = 'ad_hover') AS hovers,
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'ad_impression') AS unique_impressions,
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'ad_click') AS unique_clicks,
  AVG(scroll_depth) FILTER (WHERE event_type = 'ad_impression' AND scroll_depth IS NOT NULL) AS avg_scroll_depth,
  AVG(time_on_page) FILTER (WHERE event_type = 'ad_impression' AND time_on_page IS NOT NULL) AS avg_time_on_page,
  COUNT(DISTINCT page_path) FILTER (WHERE event_type = 'ad_impression') AS unique_pages,
  MIN(created_at) FILTER (WHERE event_type = 'ad_impression') AS first_impression,
  MAX(created_at) FILTER (WHERE event_type = 'ad_impression') AS last_impression
FROM user_analytics_events
WHERE ad_id IS NOT NULL
GROUP BY ad_id;

-- ==========================================
-- Page Performance Stats View
-- Consolidated page metrics
-- ==========================================
CREATE OR REPLACE VIEW page_performance_stats AS
SELECT
  page_path,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
  COUNT(DISTINCT session_id) AS unique_sessions,
  AVG(time_on_page) FILTER (WHERE event_type = 'page_view' AND time_on_page IS NOT NULL) AS avg_time_on_page,
  AVG(scroll_depth) FILTER (WHERE event_type = 'page_view' AND scroll_depth IS NOT NULL) AS avg_scroll_depth,
  COUNT(*) FILTER (WHERE event_type = 'scroll') AS scroll_events,
  COUNT(*) FILTER (WHERE event_type = 'click') AS click_events
FROM user_analytics_events
WHERE page_path IS NOT NULL
GROUP BY page_path;

-- ==========================================
-- Session Metrics View
-- Session-level aggregations
-- ==========================================
CREATE OR REPLACE VIEW session_metrics AS
SELECT
  session_id,
  MIN(created_at) AS session_start,
  MAX(created_at) AS session_end,
  COUNT(*) AS total_events,
  COUNT(DISTINCT page_path) AS pages_visited,
  COUNT(DISTINCT event_type) AS event_types,
  MAX(time_on_page) AS max_time_on_page,
  AVG(scroll_depth) AS avg_scroll_depth
FROM user_analytics_events
WHERE session_id IS NOT NULL
GROUP BY session_id;

-- ==========================================
-- Device Analytics View
-- Device breakdown stats
-- ==========================================
CREATE OR REPLACE VIEW device_analytics AS
SELECT
  device_type,
  browser,
  os,
  COUNT(*) AS total_events,
  COUNT(DISTINCT session_id) AS unique_sessions,
  AVG(time_on_page) FILTER (WHERE time_on_page IS NOT NULL) AS avg_time_on_page,
  AVG(scroll_depth) FILTER (WHERE scroll_depth IS NOT NULL) AS avg_scroll_depth
FROM user_analytics_events
WHERE device_type IS NOT NULL
GROUP BY device_type, browser, os;

-- ==========================================
-- Time-based Analytics (hourly/daily breakdown)
-- ==========================================
CREATE OR REPLACE FUNCTION get_events_timeline(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  granularity VARCHAR(10) DEFAULT 'hour'
)
RETURNS TABLE (
  period TIMESTAMPTZ,
  total_events BIGINT,
  unique_sessions BIGINT,
  page_views BIGINT,
  ad_impressions BIGINT,
  ad_clicks BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trunc_format TEXT;
BEGIN
  trunc_format := CASE granularity
    WHEN 'minute' THEN 'minute'
    WHEN 'hour' THEN 'hour'
    WHEN 'day' THEN 'day'
    WHEN 'week' THEN 'week'
    WHEN 'month' THEN 'month'
    ELSE 'hour'
  END;

  RETURN QUERY
  SELECT
    date_trunc(trunc_format, created_at) AS period,
    COUNT(*) AS total_events,
    COUNT(DISTINCT session_id) AS unique_sessions,
    COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
    COUNT(*) FILTER (WHERE event_type = 'ad_impression') AS ad_impressions,
    COUNT(*) FILTER (WHERE event_type = 'ad_click') AS ad_clicks
  FROM user_analytics_events
  WHERE created_at >= start_date AND created_at < end_date
  GROUP BY date_trunc(trunc_format, created_at)
  ORDER BY period;
END;
$$;

GRANT EXECUTE ON FUNCTION get_events_timeline(TIMESTAMPTZ, TIMESTAMPTZ, VARCHAR) TO authenticated;

-- ==========================================
-- Event Type Stats RPC
-- ==========================================
CREATE OR REPLACE FUNCTION get_event_type_stats(start_date TIMESTAMPTZ)
RETURNS TABLE (
  event_type VARCHAR(100),
  total_events BIGINT,
  unique_sessions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uae.event_type,
    COUNT(*)::BIGINT AS total_events,
    COUNT(DISTINCT uae.session_id)::BIGINT AS unique_sessions
  FROM user_analytics_events uae
  WHERE uae.created_at >= start_date
  GROUP BY uae.event_type;
END;
$$;

GRANT EXECUTE ON FUNCTION get_event_type_stats(TIMESTAMPTZ) TO authenticated;

-- ==========================================
-- Device Stats RPC
-- ==========================================
CREATE OR REPLACE FUNCTION get_device_stats(start_date TIMESTAMPTZ)
RETURNS TABLE (
  device_type VARCHAR(20),
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uae.device_type,
    COUNT(*)::BIGINT AS count
  FROM user_analytics_events uae
  WHERE uae.created_at >= start_date
    AND uae.device_type IS NOT NULL
  GROUP BY uae.device_type
  ORDER BY count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_device_stats(TIMESTAMPTZ) TO authenticated;