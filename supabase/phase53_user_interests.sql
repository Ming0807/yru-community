-- =====================================================
-- Phase 48: User Interests Table
-- Purpose: Track user interests based on behavior for ad targeting
-- Features: Weighted interests, decay over time, interest taxonomy
-- =====================================================

-- =====================================================
-- User Interests Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    
    -- Interest scoring
    interest_score DECIMAL(5,2) DEFAULT 0,  -- 0-100
    interaction_count INTEGER DEFAULT 0,
    positive_interactions INTEGER DEFAULT 0,  -- likes, shares
    negative_interactions INTEGER DEFAULT 0,  -- hides, dismisses
    
    -- Time factors
    last_interaction_at TIMESTAMPTZ,
    first_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    decay_factor DECIMAL(3,2) DEFAULT 1.0,  -- decays over time
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Source tracking
    interaction_sources JSONB DEFAULT '[]'::JSONB,  -- ['post_view', 'post_like', 'comment']
    
    UNIQUE(user_id, category_id)
);

-- Indexes
CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX idx_user_interests_category_id ON user_interests(category_id);
CREATE INDEX idx_user_interests_score ON user_interests(interest_score DESC);
CREATE INDEX idx_user_interests_computed ON user_interests(computed_at);

-- =====================================================
-- Interest Decay Settings Table
-- =====================================================
CREATE TABLE IF NOT EXISTS interest_decay_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    
    -- Decay configuration (per category)
    daily_decay_rate DECIMAL(5,4) DEFAULT 0.01,  -- 1% per day default
    min_score_threshold DECIMAL(5,2) DEFAULT 5.0,  -- below this, interest is removed
    max_interaction_age_days INTEGER DEFAULT 90,  -- interactions older than this are ignored
    
    -- Boost factors
    purchase_boost DECIMAL(3,2) DEFAULT 2.0,  -- multiplier for purchase actions
    share_boost DECIMAL(3,2) DEFAULT 1.5,  -- multiplier for shares
    comment_boost DECIMAL(3,2) DEFAULT 1.3,  -- multiplier for comments
    view_boost DECIMAL(3,2) DEFAULT 1.0,  -- multiplier for views
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id)
);

-- =====================================================
-- Interest Categories Hierarchy
-- =====================================================
CREATE TABLE IF NOT EXISTS interest_taxonomy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_th VARCHAR(100) NOT NULL,  -- Thai name
    name_en VARCHAR(100) NOT NULL,  -- English name
    slug VARCHAR(50) NOT NULL UNIQUE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 3),  -- 1=Broad, 2=Medium, 3=Specific
    parent_id UUID REFERENCES interest_taxonomy(id) ON DELETE SET NULL,
    icon VARCHAR(50),  -- emoji or icon name
    color VARCHAR(7),  -- hex color
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_interest_taxonomy_parent ON interest_taxonomy(parent_id);
CREATE INDEX idx_interest_taxonomy_level ON interest_taxonomy(level);
CREATE INDEX idx_interest_taxonomy_slug ON interest_taxonomy(slug);

-- =====================================================
-- Function: Update user interest from post interaction
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_interest(
    p_user_id UUID,
    p_category_id INTEGER,
    p_action VARCHAR,  -- 'view', 'like', 'comment', 'share', 'hide', 'dismiss'
    p_value DECIMAL DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
    v_current_score DECIMAL(5,2);
    v_decay_rate DECIMAL(5,4);
    v_new_score DECIMAL(5,2);
    v_action_weight DECIMAL(3,2);
    v_existing_record BOOLEAN;
BEGIN
    -- Get current score if exists
    SELECT interest_score, TRUE INTO v_current_score, v_existing_record
    FROM user_interests 
    WHERE user_id = p_user_id AND category_id = p_category_id;
    
    -- Get decay rate for category
    SELECT COALESCE(daily_decay_rate, 0.01) INTO v_decay_rate
    FROM interest_decay_settings ids
    WHERE ids.category_id = p_category_id;
    
    -- Determine action weight
    v_action_weight := CASE p_action
        WHEN 'view' THEN 1.0
        WHEN 'like' THEN 1.5
        WHEN 'comment' THEN 1.8
        WHEN 'share' THEN 2.5
        WHEN 'purchase' THEN 3.0
        WHEN 'hide' THEN -2.0
        WHEN 'dismiss' THEN -1.5
        ELSE 1.0
    END;
    
    IF v_existing_record THEN
        -- Calculate days since last interaction
        DECLARE
            v_days_since INTERVAL;
            v_decay DECIMAL(5,2);
        BEGIN
            SELECT NOW() - last_interaction_at INTO v_days_since
            FROM user_interests
            WHERE user_id = p_user_id AND category_id = p_category_id;
            
            -- Apply decay
            v_decay := v_current_score * v_decay_rate * EXTRACT(DAY FROM COALESCE(v_days_since, INTERVAL '0 days'));
            v_new_score := GREATEST(0, v_current_score - v_decay);
            
            -- Apply new interaction
            IF p_action IN ('hide', 'dismiss') THEN
                v_new_score := GREATEST(0, v_new_score - (ABS(p_value) * v_action_weight * 5));
            ELSE
                v_new_score := LEAST(100, v_new_score + (p_value * v_action_weight * 10));
            END IF;
            
            -- Update existing record
            UPDATE user_interests SET
                interest_score = v_new_score,
                interaction_count = interaction_count + 1,
                positive_interactions = positive_interactions + CASE WHEN p_action NOT IN ('hide', 'dismiss') THEN 1 ELSE 0 END,
                negative_interactions = negative_interactions + CASE WHEN p_action IN ('hide', 'dismiss') THEN 1 ELSE 0 END,
                last_interaction_at = NOW(),
                interaction_sources = array_append(interaction_sources, p_action),
                computed_at = NOW()
            WHERE user_id = p_user_id AND category_id = p_category_id;
        END;
    ELSE
        -- Create new interest record
        v_new_score := LEAST(100, p_value * v_action_weight * 10);
        
        INSERT INTO user_interests (
            user_id, category_id, interest_score, interaction_count,
            positive_interactions, last_interaction_at, first_interaction_at,
            interaction_sources
        ) VALUES (
            p_user_id, p_category_id, v_new_score, 1,
            CASE WHEN p_action NOT IN ('hide', 'dismiss') THEN 1 ELSE 0 END,
            NOW(), NOW(),
            ARRAY[p_action]
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Compute all user interests (batch)
-- =====================================================
CREATE OR REPLACE FUNCTION compute_user_interests(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_category_id INTEGER;
BEGIN
    -- Compute interest from posts viewed/liked/commented
    FOR v_category_id IN 
        SELECT DISTINCT p.category_id 
        FROM posts p
        LEFT JOIN reactions r ON r.post_id = p.id AND r.user_id = p_user_id
        LEFT JOIN comments c ON c.post_id = p.id AND c.user_id = p_user_id
        WHERE p.user_id = p_user_id 
        OR r.user_id = p_user_id 
        OR c.user_id = p_user_id
    LOOP
        -- Count interactions per category
        DECLARE
            v_view_count INTEGER;
            v_like_count INTEGER;
            v_comment_count INTEGER;
            v_share_count INTEGER;
        BEGIN
            SELECT 
                COUNT(DISTINCT CASE WHEN r.id IS NOT NULL THEN r.id END)::INTEGER,
                COUNT(DISTINCT CASE WHEN r.user_id = p_user_id THEN r.id END)::INTEGER,
                COUNT(DISTINCT CASE WHEN c.user_id = p_user_id THEN c.id END)::INTEGER,
                0
            INTO v_view_count, v_like_count, v_comment_count, v_share_count
            FROM posts p
            LEFT JOIN reactions r ON r.post_id = p.id
            LEFT JOIN comments c ON c.post_id = p.id
            WHERE p.category_id = v_category_id;
            
            -- Update interests for each action type
            IF v_view_count > 0 THEN
                PERFORM update_user_interest(p_user_id, v_category_id, 'view', v_view_count::DECIMAL);
            END IF;
            IF v_like_count > 0 THEN
                PERFORM update_user_interest(p_user_id, v_category_id, 'like', v_like_count::DECIMAL);
            END IF;
            IF v_comment_count > 0 THEN
                PERFORM update_user_interest(p_user_id, v_category_id, 'comment', v_comment_count::DECIMAL);
            END IF;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Get top interests for user
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_top_interests(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
    category_id INTEGER,
    category_name TEXT,
    interest_score DECIMAL,
    interaction_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ui.category_id,
        c.name as category_name,
        ui.interest_score,
        ui.interaction_count
    FROM user_interests ui
    JOIN categories c ON c.id = ui.category_id
    WHERE ui.user_id = p_user_id 
    AND ui.interest_score > 5
    ORDER BY ui.interest_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Get users by interest similarity
-- =====================================================
CREATE OR REPLACE FUNCTION get_similar_users_by_interest(
    p_user_id UUID, 
    p_min_overlap DECIMAL DEFAULT 0.3,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    similar_user_id UUID,
    similarity_score DECIMAL,
    shared_interests JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ui2.user_id as similar_user_id,
        ROUND(
            COUNT(DISTINCT ui2.category_id)::DECIMAL / 
            NULLIF(COUNT(DISTINCT ui1.category_id), 0) * 100, 2
        ) as similarity_score,
        jsonb_agg(jsonb_build_object(
            'category_id', ui2.category_id,
            'score', ui2.interest_score
        )) as shared_interests
    FROM user_interests ui1
    JOIN user_interests ui2 ON ui2.category_id = ui1.category_id
    WHERE ui1.user_id = p_user_id
    AND ui2.user_id != p_user_id
    AND ui1.interest_score > 10
    AND ui2.interest_score > 10
    GROUP BY ui2.user_id
    HAVING ROUND(
        COUNT(DISTINCT ui2.category_id)::DECIMAL / 
        NULLIF(COUNT(DISTINCT ui1.category_id), 0) * 100, 2
    ) >= (p_min_overlap * 100)
    ORDER BY similarity_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- View: Interest summary for admin
-- =====================================================
CREATE OR REPLACE VIEW v_interest_summary AS
SELECT 
    c.id as category_id,
    c.name as category_name,
    COUNT(ui.id) as total_users,
    AVG(ui.interest_score) as avg_interest_score,
    SUM(ui.interaction_count) as total_interactions,
    COUNT(CASE WHEN ui.interest_score >= 50 THEN 1 END) as high_interest_users,
    COUNT(CASE WHEN ui.interest_score >= 20 AND ui.interest_score < 50 THEN 1 END) as medium_interest_users,
    COUNT(CASE WHEN ui.interest_score < 20 THEN 1 END) as low_interest_users
FROM categories c
LEFT JOIN user_interests ui ON ui.category_id = c.id
GROUP BY c.id, c.name
ORDER BY total_users DESC;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

-- Users can view their own interests
CREATE POLICY "Users can view own interests"
    ON user_interests FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can update their own interests (via functions)
CREATE POLICY "Users can update own interests"
    ON user_interests FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Admin can view all
CREATE POLICY "Admin can view all interests"
    ON user_interests FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- Service can insert (for tracking)
CREATE POLICY "Service can insert interests"
    ON user_interests FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Service can update
CREATE POLICY "Service can update interests"
    ON user_interests FOR UPDATE
    TO service_role
    USING (true);

COMMENT ON TABLE user_interests IS 'User interest scores by category for ad targeting';
COMMENT ON TABLE interest_decay_settings IS 'Per-category interest decay configuration';
COMMENT ON TABLE interest_taxonomy IS 'Hierarchical interest categories for taxonomy-based targeting';