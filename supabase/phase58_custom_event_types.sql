-- ==========================================
-- Phase 58: Custom Event Types
-- Support for form_submit, video_view, share, download events
-- ==========================================

-- Custom event definitions table
CREATE TABLE IF NOT EXISTS custom_event_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'engagement',
  event_schema JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Predefined event types
INSERT INTO custom_event_definitions (event_type, display_name, description, category, event_schema) VALUES
  ('form_submit', 'Form Submission', 'User submitted a form', 'conversion', '{"fields": ["form_id", "form_name", "form_type"]}'),
  ('video_view', 'Video View', 'User viewed a video', 'engagement', '{"fields": ["video_id", "video_title", "duration_watched", "total_duration", "progress_percent"]}'),
  ('share', 'Share', 'User shared content', 'virality', '{"fields": ["content_type", "content_id", "share_method"]}'),
  ('download', 'Download', 'User downloaded content', 'conversion', '{"fields": ["file_id", "file_name", "file_type", "file_size"]}'),
  ('search', 'Search', 'User performed a search', 'discovery', '{"fields": ["search_query", "results_count"]}'),
  ('print', 'Print', 'User printed content', 'engagement', '{"fields": ["content_type", "content_id"]}'),
  ('external_click', 'External Click', 'User clicked external link', 'navigation', '{"fields": ["url", "link_text"]}')
ON CONFLICT (event_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  event_schema = EXCLUDED.event_schema,
  updated_at = now();

-- Custom events table (structured custom event storage)
CREATE TABLE IF NOT EXISTS custom_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  session_id VARCHAR(64),

  -- Actor info (no PII)
  anonymous_id VARCHAR(64),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Context
  page_path TEXT,
  referrer TEXT,
  device_type VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50),

  -- Event-specific data (structured)
  form_id VARCHAR(100),
  form_name VARCHAR(200),
  form_type VARCHAR(50),
  video_id VARCHAR(100),
  video_title VARCHAR(200),
  duration_watched INTEGER,
  total_duration INTEGER,
  progress_percent INTEGER,
  content_type VARCHAR(50),
  content_id UUID,
  share_method VARCHAR(50),
  file_id VARCHAR(100),
  file_name VARCHAR(200),
  file_type VARCHAR(50),
  file_size BIGINT,
  search_query TEXT,
  results_count INTEGER,
  url TEXT,
  link_text VARCHAR(200),

  -- Generic event data (supplementary)
  event_data JSONB DEFAULT '{}',

  -- Timestamps
  event_timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  FOREIGN KEY (event_type) REFERENCES custom_event_definitions(event_type) ON DELETE RESTRICT
);

-- Indexes for custom events
CREATE INDEX IF NOT EXISTS idx_custom_events_type ON custom_events(event_type);
CREATE INDEX IF NOT EXISTS idx_custom_events_session ON custom_events(session_id);
CREATE INDEX IF NOT EXISTS idx_custom_events_user ON custom_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_events_timestamp ON custom_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_custom_events_page ON custom_events(page_path) WHERE page_path IS NOT NULL;

-- RLS for custom_events
ALTER TABLE custom_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert custom events (anonymous tracking)
CREATE POLICY "Anyone can insert custom events"
ON custom_events FOR INSERT
WITH CHECK (true);

-- Only admins can view custom events
CREATE POLICY "Admins can view custom events"
ON custom_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- Admins can delete custom events
CREATE POLICY "Admins can delete custom events"
ON custom_events FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Analytics view: Custom event stats by type
CREATE OR REPLACE VIEW custom_event_stats AS
SELECT
  event_type,
  COUNT(*) as total_events,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(event_timestamp) as first_seen,
  MAX(event_timestamp) as last_seen
FROM custom_events
GROUP BY event_type;

-- Analytics view: Video engagement metrics
CREATE OR REPLACE VIEW video_engagement_stats AS
SELECT
  video_id,
  video_title,
  COUNT(*) as total_views,
  COUNT(DISTINCT session_id) as unique_viewers,
  AVG(progress_percent) as avg_progress,
  AVG(duration_watched) as avg_duration_watched,
  MAX(duration_watched) as max_duration_watched
FROM custom_events
WHERE event_type = 'video_view' AND video_id IS NOT NULL
GROUP BY video_id, video_title;

-- Analytics view: Form conversion stats
CREATE OR REPLACE VIEW form_conversion_stats AS
SELECT
  form_id,
  form_name,
  form_type,
  COUNT(*) as total_submissions,
  COUNT(DISTINCT session_id) as unique_submitters,
  COUNT(DISTINCT user_id) as authenticated_submitters
FROM custom_events
WHERE event_type = 'form_submit'
GROUP BY form_id, form_name, form_type;

-- Analytics view: Share stats
CREATE OR REPLACE VIEW share_stats AS
SELECT
  content_type,
  content_id,
  share_method,
  COUNT(*) as total_shares,
  COUNT(DISTINCT session_id) as unique_shares
FROM custom_events
WHERE event_type = 'share'
GROUP BY content_type, content_id, share_method;

-- Analytics view: Download stats
CREATE OR REPLACE VIEW download_stats AS
SELECT
  file_id,
  file_name,
  file_type,
  COUNT(*) as total_downloads,
  COUNT(DISTINCT session_id) as unique_downloaders,
  SUM(file_size) as total_bytes_served
FROM custom_events
WHERE event_type = 'download'
GROUP BY file_id, file_name, file_type;

-- Function to log custom event (helper for tracking)
CREATE OR REPLACE FUNCTION log_custom_event(
  p_event_type VARCHAR(50),
  p_session_id VARCHAR(64),
  p_anonymous_id VARCHAR(64),
  p_user_id UUID,
  p_page_path TEXT,
  p_event_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO custom_events (
    event_type, session_id, anonymous_id, user_id, page_path, event_data
  ) VALUES (
    p_event_type, p_session_id, p_anonymous_id, p_user_id, p_page_path, p_event_data
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_custom_event(VARCHAR, VARCHAR, VARCHAR, UUID, TEXT, JSONB) TO anon, authenticated;