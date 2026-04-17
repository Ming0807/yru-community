-- =====================================================
-- Phase 49: Targeting Rules Engine
-- Purpose: Rule-based auto-targeting system for ads
-- Features: Conditions, priorities, A/B testing, evaluation history
-- =====================================================

-- =====================================================
-- Targeting Rules Table
-- =====================================================
CREATE TABLE IF NOT EXISTS targeting_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Rule conditions (JSONB for flexibility)
    conditions JSONB NOT NULL,  -- Array of condition objects
    /*
    Format:
    [
        {
            "field": "user.segment.activity",
            "operator": "in",
            "value": ["active_7d", "active_30d"],
            "weight": 1.0
        },
        {
            "field": "user.faculty",
            "operator": "eq",
            "value": "คณะวิศวกรรมศาสตร์",
            "weight": 1.5
        },
        {
            "field": "time.hour",
            "operator": "between",
            "value": [9, 17],
            "weight": 1.0
        }
    ]
    */
    
    -- Actions when rule matches
    actions JSONB DEFAULT '[]'::JSONB,
    /*
    Format:
    [
        {
            "action": "adjust_bid",
            "value": 1.5
        },
        {
            "action": "set_frequency_cap",
            "value": 3
        }
    ]
    */
    
    -- Targeting scope
    target_campaign_ids UUID[] DEFAULT NULL,  -- NULL = all campaigns
    target_ad_ids UUID[] DEFAULT NULL,  -- NULL = all ads
    excluded_user_ids UUID[] DEFAULT NULL,
    
    -- Priority and status
    priority INTEGER DEFAULT 0,  -- Higher = evaluated first
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,  -- System rules can't be deleted
    
    -- A/B Testing
    traffic_allocation DECIMAL(5,2) DEFAULT 100.0,  -- % of traffic this rule applies to
    variant VARCHAR(20) DEFAULT 'control',  -- 'control', 'variant_a', 'variant_b'
    
    -- Metadata
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_evaluated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_targeting_rules_active ON targeting_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_targeting_rules_priority ON targeting_rules(priority DESC);
CREATE INDEX idx_targeting_rules_created_at ON targeting_rules(created_at);

-- =====================================================
-- Rule Evaluation History
-- =====================================================
CREATE TABLE IF NOT EXISTS rule_evaluation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES targeting_rules(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Context at evaluation time
    user_snapshot JSONB,  -- User state at time of evaluation
    context JSONB,  -- Time, device, location, etc.
    
    -- Evaluation result
    conditions_evaluated JSONB,  -- Each condition with result
    total_score DECIMAL(5,2),
    matched BOOLEAN,
    
    -- Actions taken
    actions_taken JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rule_eval_rule_id ON rule_evaluation_history(rule_id);
CREATE INDEX idx_rule_eval_user_id ON rule_evaluation_history(user_id);
CREATE INDEX idx_rule_eval_created ON rule_evaluation_history(created_at);
CREATE INDEX idx_rule_eval_matched ON rule_evaluation_history(matched) WHERE matched = true;

-- =====================================================
-- Rule Condition Templates (predefined rules)
-- =====================================================
CREATE TABLE IF NOT EXISTS rule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_th VARCHAR(200),  -- Thai name
    description TEXT,
    description_th TEXT,
    category VARCHAR(50),  -- 'engagement', 'reengagement', 'seasonal', 'behavioral'
    
    -- Template conditions
    template_conditions JSONB NOT NULL,
    
    -- Example use cases
    use_cases TEXT[],
    
    -- Effectiveness metrics (computed over time)
    avg_match_rate DECIMAL(5,2) DEFAULT 0,
    avg_ctr DECIMAL(5,2) DEFAULT 0,
    times_used INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Function: Evaluate rule conditions
-- =====================================================
CREATE OR REPLACE FUNCTION evaluate_rule_conditions(
    p_conditions JSONB,
    p_user_data JSONB,
    p_context JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB := '{"matched": true, "score": 0, "details": []}'::JSONB;
    v_condition JSONB;
    v_field TEXT;
    v_operator TEXT;
    v_value JSONB;
    v_weight DECIMAL;
    v_actual_value JSONB;
    v_condition_score DECIMAL := 0;
    v_total_weight DECIMAL := 0;
    v_conditions_matched INTEGER := 0;
BEGIN
    -- Iterate through each condition
    FOR v_condition IN SELECT * FROM jsonb_array_elements(p_conditions)
    LOOP
        v_field := v_condition->>'field';
        v_operator := v_condition->>'operator';
        v_value := v_condition->'value';
        v_weight := COALESCE((v_condition->>'weight')::DECIMAL, 1.0);
        
        -- Get actual value from user data or context
        v_actual_value := COALESCE(
            p_user_data::jsonb->v_field,
            p_context::jsonb->v_field,
            NULL
        );
        
        -- Evaluate condition
        DECLARE
            v_matched BOOLEAN := FALSE;
        BEGIN
            CASE v_operator
                WHEN 'eq' THEN
                    v_matched := v_actual_value = v_value;
                WHEN 'ne' THEN
                    v_matched := v_actual_value != v_value;
                WHEN 'in' THEN
                    v_matched := v_actual_value = ANY(ARRAY(SELECT * FROM jsonb_array_elements_text(v_value)));
                WHEN 'not_in' THEN
                    v_matched := v_actual_value != ALL(ARRAY(SELECT * FROM jsonb_array_elements_text(v_value)));
                WHEN 'gt' THEN
                    v_matched := (v_actual_value::TEXT)::DECIMAL > (v_value->>0)::DECIMAL;
                WHEN 'gte' THEN
                    v_matched := (v_actual_value::TEXT)::DECIMAL >= (v_value->>0)::DECIMAL;
                WHEN 'lt' THEN
                    v_matched := (v_actual_value::TEXT)::DECIMAL < (v_value->>0)::DECIMAL;
                WHEN 'lte' THEN
                    v_matched := (v_actual_value::TEXT)::DECIMAL <= (v_value->>0)::DECIMAL;
                WHEN 'between' THEN
                    v_matched := (v_actual_value::TEXT)::DECIMAL BETWEEN (v_value->>0)::DECIMAL AND (v_value->>1)::DECIMAL;
                WHEN 'contains' THEN
                    v_matched := v_actual_value::TEXT LIKE '%' || v_value::TEXT || '%';
                WHEN 'starts_with' THEN
                    v_matched := v_actual_value::TEXT LIKE v_value::TEXT || '%';
                WHEN 'ends_with' THEN
                    v_matched := v_actual_value::TEXT LIKE '%' || v_value::TEXT;
                WHEN 'exists' THEN
                    v_matched := v_actual_value IS NOT NULL;
                WHEN 'not_exists' THEN
                    v_matched := v_actual_value IS NULL;
                ELSE
                    v_matched := FALSE;
            END CASE;
            
            -- Calculate score contribution
            IF v_matched THEN
                v_condition_score := v_condition_score + (v_weight * 100);
                v_conditions_matched := v_conditions_matched + 1;
            END IF;
            
            v_total_weight := v_total_weight + v_weight;
            
            -- Add to details
            v_result := v_result || jsonb_build_object(
                'field', v_field,
                'operator', v_operator,
                'expected', v_value,
                'actual', v_actual_value,
                'matched', v_matched,
                'weight', v_weight
            );
        END;
    END LOOP;
    
    -- Calculate final score (0-100)
    v_result := jsonb_build_object(
        'matched', v_conditions_matched = jsonb_array_length(p_conditions),
        'score', CASE WHEN v_total_weight > 0 THEN v_condition_score / v_total_weight ELSE 0 END,
        'conditions_matched', v_conditions_matched,
        'conditions_total', jsonb_array_length(p_conditions),
        'details', v_result->'details'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Get matching rules for user
-- =====================================================
CREATE OR REPLACE FUNCTION get_matching_rules_for_user(
    p_user_id UUID,
    p_campaign_id UUID DEFAULT NULL,
    p_ad_id UUID DEFAULT NULL,
    p_context JSONB DEFAULT NULL
)
RETURNS TABLE (
    rule_id UUID,
    rule_name VARCHAR(100),
    match_score DECIMAL(5,2),
    priority INTEGER,
    actions JSONB
) AS $$
DECLARE
    v_user_data JSONB;
    v_active_rules RECORD;
BEGIN
    -- Get user data for evaluation
    SELECT jsonb_build_object(
        'user.id', u.id,
        'user.faculty', u.faculty,
        'user.major', u.major,
        'user.created_at', u.created_at,
        'segments', COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'type', us.segment_type,
                'value', us.segment_value
            )) FROM user_segments us WHERE us.user_id = p_user_id),
            '[]'::JSONB
        ),
        'interests', COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'category_id', ui.category_id,
                'score', ui.interest_score
            )) FROM user_interests ui WHERE ui.user_id = p_user_id AND ui.interest_score > 10),
            '[]'::JSONB
        )
    ) INTO v_user_data
    FROM profiles u
    WHERE u.id = p_user_id;
    
    -- Find matching active rules
    FOR v_active_rules IN 
        SELECT tr.id, tr.name, tr.conditions, tr.priority, tr.actions, tr.traffic_allocation
        FROM targeting_rules tr
        WHERE tr.is_active = true
        AND (tr.target_campaign_ids IS NULL OR p_campaign_id = ANY(tr.target_campaign_ids))
        AND (tr.target_ad_ids IS NULL OR p_ad_id = ANY(tr.target_ad_ids))
        AND (tr.excluded_user_ids IS NULL OR p_user_id != ALL(tr.excluded_user_ids))
        -- traffic_allocation check moved inside loop for deterministic results
        ORDER BY tr.priority DESC
    LOOP
        -- Check traffic allocation using hash for consistent results
        IF v_active_rules.traffic_allocation >= 100 OR
           (hashtext(p_user_id::TEXT) % 100) < v_active_rules.traffic_allocation THEN
            DECLARE
                v_eval_result JSONB;
            BEGIN
                v_eval_result := evaluate_rule_conditions(
                    v_active_rules.conditions,
                    v_user_data,
                    p_context
                );

                IF v_eval_result->>'matched' = 'true' THEN
                    rule_id := v_active_rules.id;
                    rule_name := v_active_rules.name;
                    match_score := (v_eval_result->>'score')::DECIMAL;
                    priority := v_active_rules.priority;
                    actions := v_active_rules.actions;
                    RETURN NEXT;
                END IF;
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Apply targeting rules to ad request
-- =====================================================
CREATE OR REPLACE FUNCTION apply_targeting_rules(
    p_user_id UUID,
    p_campaign_id UUID DEFAULT NULL,
    p_ad_id UUID DEFAULT NULL,
    p_context JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_matching_rules JSONB;
    v_bid_adjustment DECIMAL := 1.0;
    v_frequency_cap INTEGER := NULL;
    v_targeting_labels TEXT[] := '{}';
    v_rule RECORD;
BEGIN
    -- Get all matching rules
    FOR v_rule IN SELECT * FROM get_matching_rules_for_user(p_user_id, p_campaign_id, p_ad_id, p_context)
    LOOP
        -- Aggregate bid adjustment (take highest)
        IF v_rule.actions IS NOT NULL THEN
            DECLARE
                v_action JSONB;
            BEGIN
                FOR v_action IN SELECT * FROM jsonb_array_elements(v_rule.actions)
                LOOP
                    IF v_action->>'action' = 'adjust_bid' THEN
                        v_bid_adjustment := GREATEST(v_bid_adjustment, (v_action->>'value')::DECIMAL);
                    ELSIF v_action->>'action' = 'set_frequency_cap' THEN
                        v_frequency_cap := COALESCE(
                            LEAST(v_frequency_cap, (v_action->>'value')::INTEGER),
                            (v_action->>'value')::INTEGER
                        );
                    ELSIF v_action->>'action' = 'add_label' THEN
                        v_targeting_labels := array_append(v_targeting_labels, v_action->>'value');
                    END IF;
                END LOOP;
            END;
        END IF;
        
        -- Log rule match
        INSERT INTO rule_evaluation_history (
            rule_id, user_id, user_snapshot, context, 
            conditions_evaluated, total_score, matched, actions_taken
        ) VALUES (
            v_rule.rule_id, p_user_id, 
            jsonb_build_object('user_id', p_user_id),
            p_context,
            jsonb_build_object('score', v_rule.match_score),
            v_rule.match_score, TRUE, v_rule.actions
        );
    END LOOP;
    
    RETURN jsonb_build_object(
        'bid_adjustment', v_bid_adjustment,
        'frequency_cap', v_frequency_cap,
        'targeting_labels', v_targeting_labels,
        'rules_matched', (SELECT COUNT(*) FROM get_matching_rules_for_user(p_user_id, p_campaign_id, p_ad_id, p_context))
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Preset Rule Templates
-- =====================================================
INSERT INTO rule_templates (name, name_th, description, description_th, category, template_conditions, use_cases) VALUES
(
    'High Engagement Re-engagement',
    'ดึงกลับผู้ใช้ที่มี engagement สูง',
    'Target high engagement users who have been dormant',
    'กลุ่มผู้ใช้ที่มีการมีส่วนร่วมสูงแต่ไม่ได้เข้ามาสักระยะ',
    'reengagement',
    '[
        {"field": "segments.engagement.level", "operator": "eq", "value": "high", "weight": 2.0},
        {"field": "segments.activity.level", "operator": "in", "value": ["dormant"], "weight": 1.5}
    ]'::JSONB,
    ARRAY['Re-engagement campaigns for valuable users', 'Win-back campaigns']
),
(
    'New User Onboarding',
    'ต้อนรับผู้ใช้ใหม่',
    'Target new users with onboarding content',
    'กลุ่มผู้ใช้ใหม่เพื่อแนะนำการใช้งาน',
    'engagement',
    '[
        {"field": "segments.activity.level", "operator": "eq", "value": "new", "weight": 2.0},
        {"field": "segments.engagement.level", "operator": "in", "value": ["ghost", "low"], "weight": 1.0}
    ]'::JSONB,
    ARRAY['Onboarding ads', 'First-time user offers']
),
(
    'Faculty-Specific Tech',
    'นักศึกษาคณะวิศวะ - เทคโนโลยี',
    'Target engineering faculty with tech products',
    'กลุ่มนักศึกษาคณะวิศวกรรมศาสตร์ที่สนใจเทคโนโลยี',
    'behavioral',
    '[
        {"field": "user.faculty", "operator": "contains", "value": "วิศว", "weight": 2.0},
        {"field": "interests.score", "operator": "gt", "value": 30, "weight": 1.5}
    ]'::JSONB,
    ARRAY['Tech product launches', 'Gadget promotions']
),
(
    'Evening Social',
    'ช่วงเย็น - สังคม',
    'Target users during evening hours with social content',
    'กลุ่มผู้ใช้ที่ออนไลน์ช่วงเย็นและสนใจเรื่องสังคม',
    'behavioral',
    '[
        {"field": "time.hour", "operator": "between", "value": [17, 22], "weight": 1.5}
    ]'::JSONB,
    ARRAY['Evening social events', 'Dinner promotions']
);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE targeting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_evaluation_history ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin can manage targeting rules"
    ON targeting_rules FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can view rule history"
    ON rule_evaluation_history FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- Service can evaluate rules
CREATE POLICY "Service can evaluate rules"
    ON rule_evaluation_history FOR INSERT
    TO service_role
    WITH CHECK (true);

COMMENT ON TABLE targeting_rules IS 'Rule-based targeting engine for ads';
COMMENT ON TABLE rule_evaluation_history IS 'History of rule evaluations for analytics';
COMMENT ON TABLE rule_templates IS 'Predefined rule templates for common use cases';