-- =====================================================
-- Phase 47: Enhanced Ad Events
-- Purpose: Track detailed ad events with viewability and segment snapshots
-- Features: Viewability tracking, segment snapshots, device info
-- =====================================================

-- =====================================================
-- Ad Impressions Enhanced Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    impression_uuid UUID UNIQUE NOT NULL,
    
    -- Segment snapshot at impression time (JSONB for flexibility)
    segment_snapshot JSONB,
    
    -- Device and context info
    device_type VARCHAR(20),  -- mobile, desktop, tablet
    browser VARCHAR(50),
    os VARCHAR(50),
    country VARCHAR(50),
    city VARCHAR(100),
    referrer TEXT,
    url_path TEXT,
    
    -- Viewability metrics
    viewable BOOLEAN,
    viewability_score DECIMAL(5,2),  -- 0-100%
    in_view_duration_ms INTEGER,
    ad_position VARCHAR(20),  -- above_fold, below_fold, sticky
    
    -- Timing
    view_start_at TIMESTAMPTZ,
    view_end_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Deduplication
    deduplication_key TEXT
);

-- Indexes for performance
CREATE INDEX idx_ad_impressions_ad_id ON ad_impressions(ad_id);
CREATE INDEX idx_ad_impressions_campaign_id ON ad_impressions(campaign_id);
CREATE INDEX idx_ad_impressions_user_id ON ad_impressions(user_id);
CREATE INDEX idx_ad_impressions_created_at ON ad_impressions(created_at);
CREATE INDEX idx_ad_impressions_impression_uuid ON ad_impressions(impression_uuid);
CREATE INDEX idx_ad_impressions_viewable ON ad_impressions(viewable) WHERE viewable IS NOT NULL;

-- =====================================================
-- Ad Clicks Enhanced Table  
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Context from impression
    impression_id UUID REFERENCES ad_impressions(id) ON DELETE SET NULL,
    segment_snapshot JSONB,
    
    -- Click location and behavior
    click_x INTEGER,
    click_y INTEGER,
    click_element TEXT,
    
    -- Device info
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    
    -- Timing
    time_to_click_ms INTEGER,  -- ms from impression to click
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Deduplication
    deduplication_key TEXT
);

-- Indexes
CREATE INDEX idx_ad_clicks_ad_id ON ad_clicks(ad_id);
CREATE INDEX idx_ad_clicks_campaign_id ON ad_clicks(campaign_id);
CREATE INDEX idx_ad_clicks_user_id ON ad_clicks(user_id);
CREATE INDEX idx_ad_clicks_impression_id ON ad_clicks(impression_id);
CREATE INDEX idx_ad_clicks_created_at ON ad_clicks(created_at);

-- =====================================================
-- Ad Conversions Table (for tracking downstream actions)
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Attribution
    click_id UUID REFERENCES ad_clicks(id) ON DELETE SET NULL,
    impression_id UUID REFERENCES ad_impressions(id) ON DELETE SET NULL,
    
    -- Conversion details
    conversion_type VARCHAR(50),  -- 'page_view', 'signup', 'purchase', 'form_submit', etc.
    conversion_value DECIMAL(10,2),  -- monetary value if applicable
    conversion_metadata JSONB,  -- additional conversion data
    
    -- Attribution model used
    attribution_model VARCHAR(20) DEFAULT 'last_click',
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ad_conversions_ad_id ON ad_conversions(ad_id);
CREATE INDEX idx_ad_conversions_campaign_id ON ad_conversions(campaign_id);
CREATE INDEX idx_ad_conversions_user_id ON ad_conversions(user_id);
CREATE INDEX idx_ad_conversions_type ON ad_conversions(conversion_type);
CREATE INDEX idx_ad_conversions_created_at ON ad_conversions(created_at);

-- =====================================================
-- Function: Track impression with segment snapshot
-- =====================================================
CREATE OR REPLACE FUNCTION track_ad_impression(
    p_ad_id UUID,
    p_campaign_id UUID,
    p_user_id UUID,
    p_segment_snapshot JSONB DEFAULT NULL,
    p_device_type VARCHAR DEFAULT NULL,
    p_viewable BOOLEAN DEFAULT NULL,
    p_viewability_score DECIMAL DEFAULT NULL,
    p_in_view_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_impression_uuid UUID;
    v_existing_impression UUID;
BEGIN
    -- Generate unique impression UUID
    v_impression_uuid := gen_random_uuid();
    
    -- Insert impression record
    INSERT INTO ad_impressions (
        ad_id, campaign_id, user_id, impression_uuid, segment_snapshot,
        device_type, viewable, viewability_score, in_view_duration_ms,
        view_start_at, created_at
    ) VALUES (
        p_ad_id, p_campaign_id, p_user_id, v_impression_uuid, p_segment_snapshot,
        p_device_type, p_viewable, p_viewability_score, p_in_view_duration_ms,
        NOW(), NOW()
    );
    
    RETURN v_impression_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Track click with attribution
-- =====================================================
CREATE OR REPLACE FUNCTION track_ad_click(
    p_ad_id UUID,
    p_campaign_id UUID,
    p_user_id UUID,
    p_impression_id UUID DEFAULT NULL,
    p_segment_snapshot JSONB DEFAULT NULL,
    p_time_to_click_ms INTEGER DEFAULT NULL,
    p_device_type VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_click_id UUID;
BEGIN
    v_click_id := gen_random_uuid();
    
    INSERT INTO ad_clicks (
        ad_id, campaign_id, user_id, impression_id, segment_snapshot,
        time_to_click_ms, device_type, created_at
    ) VALUES (
        p_ad_id, p_campaign_id, p_user_id, p_impression_id, p_segment_snapshot,
        p_time_to_click_ms, p_device_type, NOW()
    );
    
    RETURN v_click_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Track conversion with attribution
-- =====================================================
CREATE OR REPLACE FUNCTION track_ad_conversion(
    p_ad_id UUID,
    p_campaign_id UUID,
    p_user_id UUID,
    p_click_id UUID DEFAULT NULL,
    p_impression_id UUID DEFAULT NULL,
p_conversion_type VARCHAR DEFAULT 'page_view',
p_conversion_value DECIMAL DEFAULT 0,
p_conversion_metadata JSONB DEFAULT NULL,
p_attribution_model VARCHAR DEFAULT 'last_click'
)
RETURNS UUID AS $$
DECLARE
    v_conversion_id UUID;
BEGIN
    v_conversion_id := gen_random_uuid();
    
    INSERT INTO ad_conversions (
        ad_id, campaign_id, user_id, click_id, impression_id,
        conversion_type, conversion_value, conversion_metadata,
        attribution_model, created_at
    ) VALUES (
        p_ad_id, p_campaign_id, p_user_id, p_click_id, p_impression_id,
        p_conversion_type, p_conversion_value, p_conversion_metadata,
        p_attribution_model, NOW()
    );
    
    RETURN v_conversion_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- View: Ad performance metrics
-- =====================================================
CREATE OR REPLACE VIEW v_ad_performance AS
SELECT
  a.id as ad_id,
  a.campaign_name as ad_title,
  a.is_active as ad_status,
  ai.campaign_id,
  ac.campaign_name as campaign_name,

  -- Impression metrics
  COUNT(DISTINCT ai.impression_uuid) as total_impressions,
  COUNT(DISTINCT ai.user_id) as unique_impressions,
  SUM(CASE WHEN ai.viewable = true THEN 1 ELSE 0 END)::INTEGER as viewable_impressions,
  ROUND(
    SUM(CASE WHEN ai.viewable = true THEN 1 ELSE 0 END)::DECIMAL /
    NULLIF(COUNT(ai.id), 0) * 100, 2
  ) as viewability_rate,
  AVG(ai.viewability_score) as avg_viewability_score,
  AVG(ai.in_view_duration_ms) as avg_view_duration_ms,

  -- Click metrics
  COUNT(DISTINCT ac2.id) as total_clicks,
  COUNT(DISTINCT ac2.user_id) as unique_clicks,
  ROUND(
    COUNT(DISTINCT ac2.id)::DECIMAL /
    NULLIF(COUNT(DISTINCT ai.impression_uuid), 0) * 100, 4
  ) as ctr,

  -- Conversion metrics
  COUNT(DISTINCT acon.id) as total_conversions,
  SUM(acon.conversion_value) as total_conversion_value,
  ROUND(
    COUNT(DISTINCT acon.id)::DECIMAL /
    NULLIF(COUNT(DISTINCT ac2.id), 0) * 100, 4
  ) as conversion_rate,
  ROUND(
    SUM(acon.conversion_value)::DECIMAL /
    NULLIF(COUNT(DISTINCT ac2.id), 0), 2
  ) as cost_per_click_value,

  -- Engagement
  AVG(ac2.time_to_click_ms) as avg_time_to_click

FROM ads a
LEFT JOIN ad_impressions ai ON ai.ad_id = a.id
LEFT JOIN ad_clicks ac2 ON ac2.ad_id = a.id
LEFT JOIN ad_conversions acon ON acon.ad_id = a.id
LEFT JOIN ad_campaigns ac ON ac.id = ai.campaign_id
GROUP BY a.id, a.campaign_name, a.is_active, ai.campaign_id, ac.id, ac.campaign_name;

-- =====================================================
-- View: Campaign funnel analysis
-- =====================================================
CREATE OR REPLACE VIEW v_campaign_funnel AS
SELECT 
    ac.id as campaign_id,
ac.campaign_name,
    ac.status,
    ac.start_date,
    ac.end_date,
    
    -- Impressions
    COUNT(DISTINCT ai.impression_uuid) as impressions,
    COUNT(DISTINCT ai.user_id) as unique_users_reached,
    
    -- Clicks
    COUNT(DISTINCT acl.id) as clicks,
    ROUND(
        COUNT(DISTINCT acl.id)::DECIMAL / 
        NULLIF(COUNT(DISTINCT ai.impression_uuid), 0) * 100, 4
    ) as ctr,
    
    -- Viewability
    ROUND(
        SUM(CASE WHEN ai.viewable = true THEN 1 ELSE 0 END)::DECIMAL / 
        NULLIF(COUNT(ai.id), 0) * 100, 2
    ) as viewability_rate,
    
    -- Conversions
    COUNT(DISTINCT acon.id) as conversions,
    ROUND(
        COUNT(DISTINCT acon.id)::DECIMAL / 
        NULLIF(COUNT(DISTINCT acl.id), 0) * 100, 4
    ) as click_to_conversion_rate,
    ROUND(
        COUNT(DISTINCT acon.id)::DECIMAL / 
        NULLIF(COUNT(DISTINCT ai.impression_uuid), 0) * 100, 4
    ) as impression_to_conversion_rate,
    SUM(acon.conversion_value) as total_conversion_value
    
FROM ad_campaigns ac
LEFT JOIN ad_impressions ai ON ai.campaign_id = ac.id
LEFT JOIN ad_clicks acl ON acl.campaign_id = ac.id
LEFT JOIN ad_conversions acon ON acon.campaign_id = ac.id
GROUP BY ac.id, ac.campaign_name, ac.status, ac.start_date, ac.end_date;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_conversions ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin can manage ad impressions"
    ON ad_impressions FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can manage ad clicks"
    ON ad_clicks FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can manage conversions"
    ON ad_conversions FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- Service role for tracking (if using service role key)
CREATE POLICY "Service can insert impressions"
    ON ad_impressions FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service can insert clicks"
    ON ad_clicks FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service can insert conversions"
    ON ad_conversions FOR INSERT
    TO service_role
    WITH CHECK (true);

COMMENT ON TABLE ad_impressions IS 'Enhanced ad impression tracking with viewability and segment snapshots';
COMMENT ON TABLE ad_clicks IS 'Enhanced ad click tracking with attribution';
COMMENT ON TABLE ad_conversions IS 'Ad conversion tracking with multi-touch attribution';