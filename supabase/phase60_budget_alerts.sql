-- ==========================================
-- Phase 60: Budget Alerts System
-- Automated budget monitoring and alerts
-- ==========================================

-- Budget alert configurations table
CREATE TABLE IF NOT EXISTS budget_alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  
  -- Alert thresholds
  daily_budget_threshold NUMERIC DEFAULT 80,      -- % of daily budget
  total_budget_threshold NUMERIC DEFAULT 80,      -- % of total budget
  pacing_threshold NUMERIC DEFAULT 20,            -- % deviation from expected
  
  -- Alert settings
  enable_daily_alerts BOOLEAN DEFAULT true,
  enable_pacing_alerts BOOLEAN DEFAULT true,
  enable_exhausted_alerts BOOLEAN DEFAULT true,
  enable_under_pacing_alerts BOOLEAN DEFAULT false,
  
  -- Notification settings
  notify_advertiser BOOLEAN DEFAULT false,
  notify_admin BOOLEAN DEFAULT true,
  notify_email VARCHAR(500),
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(campaign_id)
);

-- Budget alerts history table
CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type VARCHAR(50) NOT NULL,
  alert_severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
  
  -- Budget context
  budget_type VARCHAR(20), -- 'daily', 'total'
  budget_amount NUMERIC,
  spent_amount NUMERIC,
  percentage_used NUMERIC,
  pacing_deviation NUMERIC,
  
  -- Message
  title VARCHAR(200),
  message TEXT,
  suggested_action TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_alerts_campaign ON budget_alerts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_status ON budget_alerts(status);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_created ON budget_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_severity ON budget_alerts(alert_severity);

-- RLS
ALTER TABLE budget_alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget_alert_configs
CREATE POLICY "Admins can manage alert configs"
ON budget_alert_configs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- RLS policies for budget_alerts
CREATE POLICY "Admins can view budget alerts"
ON budget_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins can manage budget alerts"
ON budget_alerts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Function to generate budget alerts
CREATE OR REPLACE FUNCTION generate_budget_alerts(p_campaign_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign RECORD;
  v_config RECORD;
  v_pacing RECORD;
  v_alert_count INTEGER;
BEGIN
  -- Get campaign and config
  SELECT * INTO v_campaign
  FROM ad_campaigns
  WHERE id = p_campaign_id;

  SELECT * INTO v_config
  FROM budget_alert_configs
  WHERE campaign_id = p_campaign_id AND is_active = true;

  IF v_config IS NULL THEN
    v_config := ROW(
      NULL, p_campaign_id, 80, 80, 20,
      true, true, true, false,
      false, true, NULL, true, now(), now()
    )::budget_alert_configs;
  END IF;

  -- Calculate current pacing from ads
  SELECT 
    COALESCE(SUM(revenue) FILTER (WHERE created_at >= CURRENT_DATE), 0) as daily_spent,
    COALESCE(SUM(revenue), 0) as total_spent,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as daily_ads
  INTO v_pacing
  FROM ads
  WHERE campaign_id = p_campaign_id;

  -- Check daily budget alert
  IF v_config.enable_daily_alerts AND v_campaign.daily_budget > 0 THEN
    IF (v_pacing.daily_spent / v_campaign.daily_budget) * 100 >= v_config.daily_budget_threshold THEN
      INSERT INTO budget_alerts (
        campaign_id, alert_type, alert_severity, budget_type,
        budget_amount, spent_amount, percentage_used,
        title, message, suggested_action
      ) VALUES (
        p_campaign_id,
        'daily_budget_exceeded',
        CASE WHEN (v_pacing.daily_spent / v_campaign.daily_budget) * 100 >= 100 THEN 'critical' ELSE 'warning' END,
        'daily',
        v_campaign.daily_budget,
        v_pacing.daily_spent,
        (v_pacing.daily_spent / v_campaign.daily_budget) * 100,
        'Daily Budget Alert',
        format('%.0f%% of daily budget used (%.2f / %.2f)', 
          (v_pacing.daily_spent / v_campaign.daily_budget) * 100,
          v_pacing.daily_spent,
          v_campaign.daily_budget),
        'Increase daily budget or pause campaign'
      );
    END IF;
  END IF;

  -- Check total budget alert
  IF v_config.enable_pacing_alerts AND v_campaign.budget > 0 THEN
    IF (v_pacing.total_spent / v_campaign.budget) * 100 >= v_config.total_budget_threshold THEN
      INSERT INTO budget_alerts (
        campaign_id, alert_type, alert_severity, budget_type,
        budget_amount, spent_amount, percentage_used,
        title, message, suggested_action
      ) VALUES (
        p_campaign_id,
        'total_budget_exceeded',
        CASE WHEN (v_pacing.total_spent / v_campaign.budget) * 100 >= 100 THEN 'critical' ELSE 'warning' END,
        'total',
        v_campaign.budget,
        v_pacing.total_spent,
        (v_pacing.total_spent / v_campaign.budget) * 100,
        'Total Budget Alert',
        format('%.0f%% of total budget used (%.2f / %.2f)', 
          (v_pacing.total_spent / v_campaign.budget) * 100,
          v_pacing.total_spent,
          v_campaign.budget),
        'Review campaign performance and budget allocation'
      );
    END IF;
  END IF;

  -- Check pacing deviation
  IF v_config.enable_pacing_alerts AND v_campaign.budget > 0 AND v_campaign.start_date IS NOT NULL AND v_campaign.end_date IS NOT NULL THEN
    DECLARE
      v_days_total INTEGER;
      v_days_elapsed INTEGER;
      v_expected_spent NUMERIC;
      v_pacing_deviation NUMERIC;
    BEGIN
      v_days_total := EXTRACT(DAY FROM v_campaign.end_date - v_campaign.start_date);
      v_days_elapsed := LEAST(EXTRACT(DAY FROM now() - v_campaign.start_date), v_days_total);
      
      IF v_days_elapsed > 0 AND v_days_total > 0 THEN
        v_expected_spent := (v_pacing.total_spent / v_campaign.budget) * 100 - (v_days_elapsed::NUMERIC / v_days_total * 100);
        v_pacing_deviation := ABS(v_expected_spent);
        
        IF v_pacing_deviation >= v_config.pacing_threshold THEN
          INSERT INTO budget_alerts (
            campaign_id, alert_type, alert_severity, budget_type,
            budget_amount, spent_amount, percentage_used, pacing_deviation,
            title, message, suggested_action
          ) VALUES (
            p_campaign_id,
            'pacing_deviation',
            CASE WHEN v_pacing_deviation >= 30 THEN 'warning' ELSE 'info' END,
            'pacing',
            v_campaign.budget,
            v_pacing.total_spent,
            (v_pacing.total_spent / v_campaign.budget) * 100,
            v_pacing_deviation,
            'Pacing Deviation Alert',
            format('Campaign is %.0f%% %s than expected', 
              v_pacing_deviation,
              CASE WHEN v_expected_spent > 0 THEN 'ahead' ELSE 'behind' END),
            CASE 
              WHEN v_expected_spent > 0 THEN 'Reduce daily budget or extend campaign'
              ELSE 'Increase daily budget or shorten campaign'
            END
          );
        END IF;
      END IF;
    END;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_budget_alerts(UUID) TO authenticated;

-- Function to acknowledge alert
CREATE OR REPLACE FUNCTION acknowledge_budget_alert(
  p_alert_id UUID,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE budget_alerts
  SET status = 'acknowledged',
      acknowledged_by = p_user_id,
      acknowledged_at = now()
  WHERE id = p_alert_id;
END;
$$;

GRANT EXECUTE ON FUNCTION acknowledge_budget_alert(UUID, UUID) TO authenticated;

-- View: Active budget alerts summary
CREATE OR REPLACE VIEW budget_alerts_summary AS
SELECT 
  ba.campaign_id,
  ac.campaign_name,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE ba.alert_severity = 'critical') as critical_alerts,
  COUNT(*) FILTER (WHERE ba.alert_severity = 'warning') as warning_alerts,
  COUNT(*) FILTER (WHERE ba.status = 'active') as active_alerts,
  MAX(ba.created_at) as latest_alert_at
FROM budget_alerts ba
JOIN ad_campaigns ac ON ac.id = ba.campaign_id
WHERE ba.status IN ('active', 'acknowledged')
GROUP BY ba.campaign_id, ac.campaign_name;

-- Default: Create alert config for all active campaigns
INSERT INTO budget_alert_configs (campaign_id)
SELECT id FROM ad_campaigns WHERE status = 'active'
ON CONFLICT (campaign_id) DO NOTHING;