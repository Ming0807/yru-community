-- =====================================================
-- Phase 46: User Segments Table
-- Purpose: Pre-computed user segments for ad targeting
-- Segments: activity, engagement, faculty, interest, device, time, content
-- =====================================================

-- User Segments Table
CREATE TABLE IF NOT EXISTS user_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  segment_type VARCHAR(50) NOT NULL,
  segment_value JSONB NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 1.0,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, segment_type)
);

-- Indexes for efficient segment lookups
CREATE INDEX idx_user_segments_user_id ON user_segments(user_id);
CREATE INDEX idx_user_segments_type ON user_segments(segment_type);
CREATE INDEX idx_user_segments_computed ON user_segments(computed_at);

-- Segment Types Enum
CREATE TYPE segment_category AS ENUM (
    'activity',      -- active/dormant/new
    'engagement',    -- high/medium/low/ghost
    'faculty',       -- คณะวิทย์/วิศวะ/บริหาร/etc
    'interest',      -- ตาม categories
    'device',        -- mobile/desktop/tablet
    'time',          -- morning/afternoon/evening/night
    'content'        -- text/image/link/poll preference
);

-- Segment Values Enum
CREATE TYPE activity_level AS ENUM ('active_30d', 'active_7d', 'active_1d', 'dormant', 'new');
CREATE TYPE engagement_level AS ENUM ('high', 'medium', 'low', 'ghost');

-- =====================================================
-- Function: Compute user activity segments
-- =====================================================
CREATE OR REPLACE FUNCTION compute_user_activity_segment(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_post_count INTEGER;
  v_last_post_at TIMESTAMPTZ;
  v_account_age INTERVAL;
  v_result JSONB;
BEGIN
  -- Get user activity data from posts
  SELECT
    COUNT(*)::INTEGER,
    MAX(created_at)
  INTO v_post_count, v_last_post_at
  FROM posts
  WHERE user_id = p_user_id;

  -- Get account age from profiles
  SELECT NOW() - created_at
  INTO v_account_age
  FROM profiles
  WHERE id = p_user_id;

  -- Determine activity level based on last post or account age
  IF v_post_count = 0 THEN
    IF v_account_age < INTERVAL '7 days' THEN
      v_result := jsonb_build_object('level', 'new', 'score', 100, 'days_since_active', 0);
    ELSE
      v_result := jsonb_build_object('level', 'dormant', 'score', 0, 'days_since_active', EXTRACT(DAY FROM v_account_age)::INTEGER);
    END IF;
  ELSIF v_last_post_at < NOW() - INTERVAL '30 days' THEN
    v_result := jsonb_build_object('level', 'dormant', 'score', 10, 'days_since_active', EXTRACT(DAY FROM (NOW() - v_last_post_at))::INTEGER);
  ELSIF v_last_post_at < NOW() - INTERVAL '7 days' THEN
    v_result := jsonb_build_object('level', 'active_7d', 'score', 50, 'days_since_active', EXTRACT(DAY FROM (NOW() - v_last_post_at))::INTEGER);
  ELSIF v_last_post_at < NOW() - INTERVAL '1 day' THEN
    v_result := jsonb_build_object('level', 'active_1d', 'score', 75, 'days_since_active', EXTRACT(DAY FROM (NOW() - v_last_post_at))::INTEGER);
  ELSE
    v_result := jsonb_build_object('level', 'active_30d', 'score', 100, 'days_since_active', 0);
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Compute user engagement segments
-- =====================================================
CREATE OR REPLACE FUNCTION compute_user_engagement_segment(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_post_count INTEGER;
    v_comment_count INTEGER;
    v_reaction_count INTEGER;
    v_engagement_score DECIMAL;
    v_level VARCHAR(20);
BEGIN
    -- Get engagement counts (last 30 days)
    SELECT 
        COALESCE(COUNT(DISTINCT p.id), 0)::INTEGER,
        COALESCE(COUNT(c.id), 0)::INTEGER,
        COALESCE(COUNT(r.id), 0)::INTEGER
    INTO v_post_count, v_comment_count, v_reaction_count
    FROM users u
    LEFT JOIN posts p ON p.user_id = u.id AND p.created_at > NOW() - INTERVAL '30 days'
    LEFT JOIN comments c ON c.user_id = u.id AND c.created_at > NOW() - INTERVAL '30 days'
    LEFT JOIN reactions r ON r.user_id = u.id AND r.created_at > NOW() - INTERVAL '30 days'
    WHERE u.id = p_user_id
    GROUP BY u.id;

    -- Calculate engagement score (weighted)
    v_engagement_score := (v_post_count * 3 + v_comment_count * 2 + v_reaction_count * 1)::DECIMAL;

    -- Determine engagement level
    IF v_engagement_score > 50 THEN
        v_level := 'high';
    ELSIF v_engagement_score > 10 THEN
        v_level := 'medium';
    ELSIF v_engagement_score > 0 THEN
        v_level := 'low';
    ELSE
        v_level := 'ghost';
    END IF;

    RETURN jsonb_build_object(
        'level', v_level,
        'score', v_engagement_score,
        'posts', v_post_count,
        'comments', v_comment_count,
        'reactions', v_reaction_count
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Update user segments (all types)
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_segments(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update activity segment
    INSERT INTO user_segments (user_id, segment_type, segment_value, computed_at, expires_at)
    VALUES (p_user_id, 'activity', compute_user_activity_segment(p_user_id), NOW(), NOW() + INTERVAL '1 hour')
    ON CONFLICT (user_id, segment_type) 
    DO UPDATE SET segment_value = EXCLUDED.segment_value, computed_at = NOW();

    -- Update engagement segment
    INSERT INTO user_segments (user_id, segment_type, segment_value, computed_at, expires_at)
    VALUES (p_user_id, 'engagement', compute_user_engagement_segment(p_user_id), NOW(), NOW() + INTERVAL '1 hour')
    ON CONFLICT (user_id, segment_type) 
    DO UPDATE SET segment_value = EXCLUDED.segment_value, computed_at = NOW();

    -- Update faculty segment (from user profile)
    INSERT INTO user_segments (user_id, segment_type, segment_value, computed_at, expires_at)
    SELECT 
        p_user_id,
        'faculty',
        jsonb_build_object(
            'faculty', COALESCE(u.faculty, 'unknown'),
            'major', COALESCE(u.major, 'unknown')
        ),
        NOW(),
        NULL  -- Faculty doesn't expire
    ON CONFLICT (user_id, segment_type) 
    DO UPDATE SET segment_value = EXCLUDED.segment_value;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Trigger: Auto-compute segments on user activity
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_user_segments()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'posts' THEN
        PERFORM update_user_segments(NEW.user_id);
    ELSIF TG_TABLE_NAME = 'comments' THEN
        PERFORM update_user_segments(NEW.user_id);
    ELSIF TG_TABLE_NAME = 'reactions' THEN
        PERFORM update_user_segments(NEW.user_id);
    ELSIF TG_TABLE_NAME = 'users' THEN
        PERFORM update_user_segments(NEW.id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers (optional - comment out if causing performance issues)
-- CREATE TRIGGER trigger_post_activity
--     AFTER INSERT ON posts
--     FOR EACH ROW EXECUTE FUNCTION trigger_update_user_segments();

-- CREATE TRIGGER trigger_comment_activity
--     AFTER INSERT ON comments
--     FOR EACH ROW EXECUTE FUNCTION trigger_update_user_segments();

-- =====================================================
-- Function: Batch compute all user segments (for initial setup)
-- =====================================================
CREATE OR REPLACE FUNCTION batch_compute_user_segments()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_user_id UUID;
BEGIN
    FOR v_user_id IN SELECT id FROM users LOOP
        PERFORM update_user_segments(v_user_id);
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- View: Segment summary for analytics
-- =====================================================
CREATE OR REPLACE VIEW v_user_segment_summary AS
SELECT 
    segment_type,
    segment_value->>'level' as segment_level,
    COUNT(*) as user_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY segment_type), 2) as percentage
FROM user_segments
WHERE computed_at > NOW() - INTERVAL '24 hours'
GROUP BY segment_type, segment_value->>'level'
ORDER BY segment_type, user_count DESC;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;

-- Admin can view all segments
CREATE POLICY "Admin can view all user segments"
    ON user_segments FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator')
      )
    );

-- Users can view their own segments
CREATE POLICY "Users can view own segments"
    ON user_segments FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

COMMENT ON TABLE user_segments IS 'Pre-computed user segments for ad targeting and analytics';