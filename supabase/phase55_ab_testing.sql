-- =====================================================
-- A/B Testing Infrastructure
-- =====================================================

-- Experiments table
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  experiment_type VARCHAR(50) DEFAULT 'feature' CHECK (experiment_type IN ('feature', 'content', 'targeting', 'pricing')),

  -- Targeting
  target_campaign_ids UUID[],
  target_user_segments VARCHAR(50)[],

  -- Variants
  variants JSONB NOT NULL DEFAULT '[]'::JSONB,
  -- Format: [{"name": "control", "weight": 50, "value": {...}}, {"name": "variant_a", "weight": 50, "value": {...}}]

  -- Metrics to track
  primary_metric VARCHAR(50),
  secondary_metrics VARCHAR(50)[],

  -- Configuration
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  min_sample_size INTEGER DEFAULT 100,

  -- Stats
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiment assignments
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  variant_name VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Track if user converted (for the primary metric)
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user ON experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_variant ON experiment_assignments(variant_name);

-- RLS
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage experiments" ON experiments;
DROP POLICY IF EXISTS "Service can read experiments" ON experiments;
DROP POLICY IF EXISTS "Service can assign experiments" ON experiment_assignments;

-- Admin full access
CREATE POLICY "Admins can manage experiments" ON experiments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

CREATE POLICY "Service can read experiments" ON experiments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service can assign experiments" ON experiment_assignments FOR INSERT TO authenticated WITH CHECK (true);

-- Function to get or create assignment
CREATE OR REPLACE FUNCTION get_experiment_assignment(
  p_experiment_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id VARCHAR(100) DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_experiment RECORD;
  v_existing RECORD;
  v_random INTEGER;
  v_selected_variant VARCHAR(50);
  v_new_assignment RECORD;
  v_variant JSONB;
  v_weight_total INTEGER := 0;
  v_weight_current INTEGER := 0;
BEGIN
  -- Get experiment
  SELECT * INTO v_experiment
  FROM experiments
  WHERE id = p_experiment_id AND status = 'running';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Experiment not found or not running');
  END IF;

  -- Check for existing assignment
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM experiment_assignments
    WHERE experiment_id = p_experiment_id AND user_id = p_user_id;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'variant_name', v_existing.variant_name,
        'assigned_at', v_existing.assigned_at,
        'is_new', false
      );
    END IF;
  ELSIF p_session_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM experiment_assignments
    WHERE experiment_id = p_experiment_id AND session_id = p_session_id;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'variant_name', v_existing.variant_name,
        'assigned_at', v_existing.assigned_at,
        'is_new', false
      );
    END IF;
  END IF;

  -- Calculate total weight
  FOR v_variant IN SELECT * FROM jsonb_array_elements(v_experiment.variants) LOOP
    v_weight_total := v_weight_total + COALESCE((v_variant->>'weight')::INTEGER, 0);
  END LOOP;

  -- Assign new variant based on weights
  v_random := FLOOR(RANDOM() * v_weight_total)::INTEGER;
  v_weight_current := 0;

  FOR v_variant IN SELECT * FROM jsonb_array_elements(v_experiment.variants) LOOP
    v_weight_current := v_weight_current + COALESCE((v_variant->>'weight')::INTEGER, 0);
    IF v_random < v_weight_current THEN
      v_selected_variant := v_variant->>'name';
      EXIT;
    END IF;
  END LOOP;

  -- Default to control if nothing selected
  IF v_selected_variant IS NULL THEN
    v_selected_variant := 'control';
  END IF;

  -- Create assignment
  INSERT INTO experiment_assignments (experiment_id, user_id, session_id, variant_name)
  VALUES (p_experiment_id, p_user_id, p_session_id, v_selected_variant)
  RETURNING * INTO v_new_assignment;

  RETURN jsonb_build_object(
    'variant_name', v_new_assignment.variant_name,
    'assigned_at', v_new_assignment.assigned_at,
    'is_new', true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to track conversion
CREATE OR REPLACE FUNCTION track_experiment_conversion(
  p_experiment_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id VARCHAR(100) DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE experiment_assignments
  SET converted = TRUE, converted_at = NOW()
  WHERE experiment_id = p_experiment_id
    AND (user_id = p_user_id OR session_id = p_session_id)
    AND converted = FALSE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Stats function
CREATE OR REPLACE FUNCTION get_experiment_stats(p_experiment_id UUID)
RETURNS TABLE (
  variant_name VARCHAR(50),
  assignment_count BIGINT,
  conversion_count BIGINT,
  conversion_rate DECIMAL,
  uplift DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      ea.variant_name,
      COUNT(*) as assignments,
      COUNT(*) FILTER (WHERE ea.converted) as conversions
    FROM experiment_assignments ea
    WHERE ea.experiment_id = p_experiment_id
    GROUP BY ea.variant_name
  )
  SELECT
    s.variant_name,
    s.assignments,
    s.conversions,
    CASE WHEN s.assignments > 0
      THEN ROUND((s.conversions::DECIMAL / s.assignments) * 100, 2)
      ELSE 0
    END as conversion_rate,
    0 as uplift
  FROM stats s;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE experiments IS 'A/B test experiments for feature and content testing';
COMMENT ON TABLE experiment_assignments IS 'Tracks which variant each user/session is assigned to';