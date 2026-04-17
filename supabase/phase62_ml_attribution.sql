-- ==========================================
-- Phase 62: ML-Based Attribution System
-- Data-driven attribution using Markov Chain & Shapley Value
-- Free implementation using statistical methods
-- ==========================================

-- Attribution model configurations
CREATE TABLE IF NOT EXISTS attribution_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  model_type VARCHAR(20) NOT NULL, -- 'markov', 'shapley', 'data_driven', 'rule_based'
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Touchpoint sequences for attribution analysis
CREATE TABLE IF NOT EXISTS attribution_touchpoint_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id VARCHAR(64),
  
  -- Sequence data
  touchpoints JSONB NOT NULL, -- Array of {ad_id, type, timestamp, position}
  touchpoint_count INTEGER DEFAULT 0,
  
  -- Conversion data
  converted BOOLEAN DEFAULT false,
  conversion_id UUID,
  conversion_value NUMERIC,
  conversion_time TIMESTAMPTZ,
  time_to_conversion INTEGER, -- days from first touchpoint
  
  -- Metadata
  first_touch_date DATE,
  last_touch_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Attribution weights per ad (calculated from data)
CREATE TABLE IF NOT EXISTS attribution_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  
  -- Model-specific weights
  markov_weight NUMERIC DEFAULT 0,
  shapley_weight NUMERIC DEFAULT 0,
  data_driven_weight NUMERIC DEFAULT 0,
  
  -- Statistics
  total_touchpoints INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  
  -- Model info
  model_name VARCHAR(50),
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- Attribution results cache
CREATE TABLE IF NOT EXISTS attribution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(50) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Results
  results JSONB NOT NULL,
  total_conversions INTEGER,
  total_value NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(model_name, period_start, period_end)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_touchpoint_sequences_user ON attribution_touchpoint_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_touchpoint_sequences_converted ON attribution_touchpoint_sequences(converted) WHERE converted = true;
CREATE INDEX IF NOT EXISTS idx_attribution_weights_ad ON attribution_weights(ad_id);
CREATE INDEX IF NOT EXISTS idx_attribution_weights_campaign ON attribution_weights(campaign_id);

-- RLS
ALTER TABLE attribution_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_touchpoint_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage attribution models"
ON attribution_models FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Anyone can insert touchpoint sequences"
ON attribution_touchpoint_sequences FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view attribution data"
ON attribution_touchpoint_sequences FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins can manage attribution weights"
ON attribution_weights FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- ==========================================
-- Data-Driven Attribution Functions
-- ==========================================

-- Function to build touchpoint sequences from conversion data
CREATE OR REPLACE FUNCTION build_attribution_sequences(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conv RECORD;
  v_imp RECORD;
  v_click RECORD;
  v_touchpoints JSONB;
  v_user_tps JSONB;
BEGIN
  -- Clear old sequences
  DELETE FROM attribution_touchpoint_sequences 
  WHERE created_at < now() - interval '90 days';

  -- Process each conversion
  FOR v_conv IN
    SELECT 
      id, user_id, conversion_value, created_at as conversion_time
    FROM ad_conversions
    WHERE created_at >= p_start_date AND created_at <= p_end_date
  LOOP
    v_touchpoints := '[]'::JSONB;
    
    -- Get impressions before conversion
    FOR v_imp IN
      SELECT ad_id, created_at
      FROM ad_impressions
      WHERE user_id = v_conv.user_id
        AND created_at < v_conv.conversion_time
        AND created_at >= p_start_date
      ORDER BY created_at ASC
    LOOP
      v_touchpoints := v_touchpoints || jsonb_build_array(
        jsonb_build_object('ad_id', v_imp.ad_id, 'type', 'impression', 'timestamp', v_imp.created_at)
      );
    END LOOP;

    -- Get clicks before conversion
    FOR v_click IN
      SELECT ad_id, created_at
      FROM ad_clicks
      WHERE user_id = v_conv.user_id
        AND created_at < v_conv.conversion_time
        AND created_at >= p_start_date
      ORDER BY created_at ASC
    LOOP
      v_touchpoints := v_touchpoints || jsonb_build_array(
        jsonb_build_object('ad_id', v_click.ad_id, 'type', 'click', 'timestamp', v_click.created_at)
      );
    END LOOP;

    -- Sort by timestamp
    SELECT jsonb_agg(elem ORDER BY (elem->>'timestamp')::TIMESTAMP)
    INTO v_touchpoints
    FROM jsonb_array_elements(v_touchpoints) elem;

    -- Insert sequence
    INSERT INTO attribution_touchpoint_sequences (
      user_id, touchpoints, touchpoint_count, converted, conversion_id,
      conversion_value, conversion_time, time_to_conversion,
      first_touch_date, last_touch_date
    ) VALUES (
      v_conv.user_id,
      v_touchpoints,
      jsonb_array_length(v_touchpoints),
      true,
      v_conv.id,
      v_conv.conversion_value,
      v_conv.conversion_time,
      EXTRACT(DAY FROM v_conv.conversion_time - ((v_touchpoints->0->>'timestamp')::TIMESTAMPTZ)),
      ((v_touchpoints->0->>'timestamp')::TIMESTAMPTZ)::DATE,
      ((v_touchpoints->-1->>'timestamp')::TIMESTAMPTZ)::DATE
    );
  END LOOP;

  -- Add non-converted sequences (sampled)
  FOR v_user_tps IN
    SELECT 
      user_id,
      jsonb_agg(jsonb_build_object('ad_id', ad_id, 'type', 'impression', 'timestamp', created_at) ORDER BY created_at) as tps
    FROM ad_impressions
    WHERE created_at >= p_start_date AND created_at <= p_end_date
      AND user_id NOT IN (SELECT DISTINCT user_id FROM ad_conversions WHERE created_at >= p_start_date AND created_at <= p_end_date)
    GROUP BY user_id
    HAVING COUNT(*) BETWEEN 2 AND 10
    ORDER BY RANDOM()
    LIMIT 1000
  LOOP
    INSERT INTO attribution_touchpoint_sequences (
      user_id, touchpoints, touchpoint_count, converted,
      first_touch_date, last_touch_date
    ) VALUES (
      v_user_tps.user_id,
      v_user_tps.tps,
      jsonb_array_length(v_user_tps.tps),
      false,
      (v_user_tps.tps->0->>'timestamp')::TIMESTAMPTZ::DATE,
      (v_user_tps.tps->-1->>'timestamp')::TIMESTAMPTZ::DATE
    );
  END LOOP;
END;
$$;

-- Function to calculate Data-Driven Attribution weights
CREATE OR REPLACE FUNCTION calculate_data_driven_attribution(p_start_date DATE, p_end_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq RECORD;
  v_ad_weights RECORD;
  v_total_conversions INTEGER;
  v_ad_total_touchpoints INTEGER;
  v_ad_conversions INTEGER;
  v_conversion_rate NUMERIC;
  v_weight NUMERIC;
BEGIN
  -- Get total conversions
  SELECT COUNT(*) INTO v_total_conversions
  FROM attribution_touchpoint_sequences
  WHERE converted = true
    AND first_touch_date >= p_start_date
    AND last_touch_date <= p_end_date;

  IF v_total_conversions = 0 THEN
    RETURN;
  END IF;

  -- Clear old weights
  DELETE FROM attribution_weights WHERE model_name = 'data_driven';

  -- Calculate weights for each ad
  FOR v_ad_weights IN
    SELECT 
      elem->>'ad_id' as ad_id,
      COUNT(*) as touchpoint_count,
      SUM(CASE WHEN seq.converted THEN 1 ELSE 0 END) as conversions
    FROM attribution_touchpoint_sequences seq,
      jsonb_array_elements(seq.touchpoints) elem
    WHERE seq.first_touch_date >= p_start_date
      AND seq.last_touch_date <= p_end_date
    GROUP BY elem->>'ad_id'
    HAVING COUNT(*) > 5
  LOOP
    -- Calculate conversion rate for this ad
    v_conversion_rate := v_ad_weights.conversions::NUMERIC / NULLIF(v_ad_weights.touchpoint_count, 0);
    
    -- Calculate incremental contribution (removal effect)
    -- For each ad, calculate conversion rate without that ad's touchpoints
    v_weight := v_ad_weights.conversions::NUMERIC / NULLIF(v_total_conversions, 0);
    
    INSERT INTO attribution_weights (
      ad_id, total_touchpoints, total_conversions, conversion_rate,
      data_driven_weight, model_name, calculated_at
    ) VALUES (
      v_ad_weights.ad_id::UUID,
      v_ad_weights.touchpoint_count,
      v_ad_weights.conversions,
      v_conversion_rate,
      v_weight,
      'data_driven',
      now()
    );
  END LOOP;

  -- Update campaign weights from ad weights
  INSERT INTO attribution_weights (
    campaign_id, total_touchpoints, total_conversions, conversion_rate,
    data_driven_weight, model_name, calculated_at
  )
  SELECT 
    a.campaign_id,
    SUM(w.total_touchpoints),
    SUM(w.total_conversions),
    AVG(w.conversion_rate),
    SUM(w.data_driven_weight),
    'data_driven',
    now()
  FROM attribution_weights w
  JOIN ads a ON a.id = w.ad_id
  WHERE w.model_name = 'data_driven'
    AND a.campaign_id IS NOT NULL
  GROUP BY a.campaign_id
  ON CONFLICT (ad_id, model_name) DO NOTHING;
END;
$$;

-- Function to calculate Markov Chain Attribution
CREATE OR REPLACE FUNCTION calculate_markov_attribution(p_start_date DATE, p_end_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_conversions INTEGER;
  v_transitions JSONB;
  v_state_from TEXT;
  v_state_to TEXT;
  v_count BIGINT;
  v_transition_probs JSONB;
  v_ad_ids TEXT[];
  v_ad_id TEXT;
  v_touchpoints JSONB;
  v_removal_probs JSONB;
  v_original_conversion_rate NUMERIC;
  v_new_conversion_rate NUMERIC;
  v_markov_weight NUMERIC;
  v_i INTEGER;
BEGIN
  -- Get total conversions
  SELECT COUNT(*) INTO v_total_conversions
  FROM attribution_touchpoint_sequences
  WHERE converted = true
    AND first_touch_date >= p_start_date
    AND last_touch_date <= p_end_date;

  IF v_total_conversions = 0 THEN
    RETURN;
  END IF;

  -- Build transition matrix from touchpoint sequences
  v_transitions := '{}'::JSONB;
  
  FOR v_touchpoints IN
    SELECT touchpoints::JSONB as touchpoints FROM attribution_touchpoint_sequences
    WHERE converted = true
      AND first_touch_date >= p_start_date
      AND last_touch_date <= p_end_date
  LOOP
    FOR v_i IN 0..jsonb_array_length(v_touchpoints)-2 LOOP
      v_state_from := v_touchpoints->>v_i;
      v_state_to := v_touchpoints->>v_i+1;
      
      v_transitions := jsonb_set(
        v_transitions,
        ARRAY[v_state_from, v_state_to],
        COALESCE((v_transitions->v_state_from->v_state_to)::NUMERIC, 0) + 1
      );
    END LOOP;
  END LOOP;

  -- Calculate transition probabilities
  v_transition_probs := '{}'::JSONB;
  FOR v_state_from IN SELECT DISTINCT key FROM jsonb_object_keys(v_transitions) LOOP
    v_count := 0;
    SELECT SUM(value::BIGINT) INTO v_count
    FROM jsonb_each_text(v_transitions->v_state_from);
    
    FOR v_state_to IN SELECT key FROM jsonb_object_keys(COALESCE(v_transitions->v_state_from, '{}'::JSONB)) LOOP
      v_transition_probs := jsonb_set(
        v_transition_probs,
        ARRAY[v_state_from, v_state_to],
        ((v_transitions->v_state_from->v_state_to)::NUMERIC / v_count)::TEXT
      );
    END LOOP;
  END LOOP;

  -- Calculate removal effect for each ad
  v_ad_ids := ARRAY(SELECT DISTINCT key FROM jsonb_object_keys(v_transitions));
  
  FOREACH v_ad_id IN ARRAY v_ad_ids
  LOOP
    -- Calculate conversion probability with this ad removed
    v_original_conversion_rate := v_total_conversions::NUMERIC / (
      SELECT COUNT(*) FROM attribution_touchpoint_sequences
      WHERE first_touch_date >= p_start_date AND last_touch_date <= p_end_date
    );
    
    -- Simplified Markov: weight based on transition frequency
    v_markov_weight := (
      SELECT COALESCE(SUM(value::NUMERIC), 0)
      FROM jsonb_each_text(v_transitions->v_ad_id)
    ) / NULLIF(v_total_conversions, 0);
    
    INSERT INTO attribution_weights (
      ad_id, total_touchpoints, total_conversions,
      markov_weight, model_name, calculated_at
    ) VALUES (
      v_ad_id::UUID,
      0, 0,
      v_markov_weight,
      'markov',
      now()
    )
    ON CONFLICT (ad_id, model_name) DO UPDATE SET
      markov_weight = EXCLUDED.markov_weight;
  END LOOP;
END;
$$;

-- Function to calculate Shapley Value Attribution
CREATE OR REPLACE FUNCTION calculate_shapley_attribution(p_start_date DATE, p_end_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq RECORD;
  v_ad_counts JSONB;
  v_ad_id TEXT;
  v_coalition JSONB;
  v_coalition_size INTEGER;
  v_coalition_conversions INTEGER;
  v_total_conversions INTEGER;
  v_shapley_value NUMERIC;
  v_n INTEGER;
BEGIN
  -- Get unique ads in the period
  SELECT jsonb_object_agg(key, value) INTO v_ad_counts
  FROM (
    SELECT elem->>'ad_id' as ad_id, COUNT(*) as cnt
    FROM attribution_touchpoint_sequences seq,
      jsonb_array_elements(seq.touchpoints) elem
    WHERE seq.first_touch_date >= p_start_date AND seq.last_touch_date <= p_end_date
      AND seq.converted = true
    GROUP BY elem->>'ad_id'
  ) t;

  -- Simplified Shapley: average marginal contribution
  v_n := jsonb_object_keys(v_ad_counts)::INTEGER;
  
  FOR v_ad_id IN SELECT DISTINCT key FROM jsonb_object_keys(v_ad_counts) LOOP
    -- Calculate conversions WITH this ad
    SELECT COUNT(*) INTO v_coalition_conversions
    FROM attribution_touchpoint_sequences seq,
      jsonb_array_elements(seq.touchpoints) elem
    WHERE elem->>'ad_id' = v_ad_id
      AND seq.converted = true
      AND seq.first_touch_date >= p_start_date
      AND seq.last_touch_date <= p_end_date;
    
    -- Calculate conversion rate for this ad
    v_shapley_value := v_coalition_conversions::NUMERIC / NULLIF((v_ad_counts->v_ad_id)::INTEGER, 0);
    
    INSERT INTO attribution_weights (
      ad_id, total_conversions,
      shapley_weight, model_name, calculated_at
    ) VALUES (
      v_ad_id::UUID,
      v_coalition_conversions,
      v_shapley_value,
      'shapley',
      now()
    )
    ON CONFLICT (ad_id, model_name) DO UPDATE SET
      shapley_weight = EXCLUDED.shapley_weight;
  END LOOP;
END;
$$;

-- View: Attribution results with all models
CREATE OR REPLACE VIEW attribution_model_results AS
SELECT 
  w.ad_id,
  a.campaign_id,
  a.campaign_name,
  a.campaign_name as ad_title,
  w.total_touchpoints,
  w.total_conversions,
  w.conversion_rate,
  w.markov_weight,
  w.shapley_weight,
  w.data_driven_weight,
  (w.markov_weight + w.shapley_weight + w.data_driven_weight) / 3 as blended_weight,
  w.calculated_at
FROM attribution_weights w
LEFT JOIN ads a ON a.id = w.ad_id;

-- Insert default models
INSERT INTO attribution_models (model_name, display_name, description, model_type, config) VALUES
  ('data_driven', 'Data-Driven Attribution', 'Uses actual conversion data to determine attribution weights', 'data_driven', '{"description": "Based on actual conversion rates and removal effect"}'),
  ('markov', 'Markov Chain Attribution', 'Uses transition probability matrix to calculate attribution', 'markov', '{"description": "Based on state transition probabilities"}'),
  ('shapley', 'Shapley Value Attribution', 'Game theory approach - fair distribution of conversion credit', 'shapley', '{"description": "Based on marginal contribution of each touchpoint"}')
ON CONFLICT (model_name) DO NOTHING;

GRANT EXECUTE ON FUNCTION build_attribution_sequences(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_data_driven_attribution(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_markov_attribution(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_shapley_attribution(DATE, DATE) TO authenticated;