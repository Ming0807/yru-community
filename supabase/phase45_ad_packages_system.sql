-- ==========================================
-- Phase 45: Ad Packages System (Hybrid Fixed + Add-ons)
-- Bronze/Silver/Gold with targeting add-ons
-- ==========================================

-- Ad packages table
CREATE TABLE IF NOT EXISTS ad_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Package info
  name TEXT NOT NULL,
  description TEXT,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'custom')),
  
  -- Pricing (in Thai Baht)
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_per_impression NUMERIC(10, 4), -- For CPC/CPM model
  price_per_click NUMERIC(10, 4),
  price_per_day NUMERIC(10, 2), -- For time-based
  
  -- Duration
  min_duration_days INTEGER DEFAULT 7,
  max_duration_days INTEGER DEFAULT 30,
  
  -- Included features (JSON for flexibility)
  features JSONB DEFAULT '[]',
  -- Example: ["feed_placement", "sidebar", "analytics", "priority_approval"]
  
  -- Limits
  max_impressions INTEGER, -- 0 = unlimited
  max_clicks INTEGER,
  max_campaigns INTEGER DEFAULT 1,
  
  -- Targeting included
  targeting_included JSONB DEFAULT '[]',
  -- Example: ["faculty", "category", "interest"]
  
  -- Visual
  color VARCHAR(20), -- For badge display
  icon VARCHAR(10),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Order
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default packages
INSERT INTO ad_packages (name, description, tier, base_price, min_duration_days, max_duration_days, features, targeting_included, color, sort_order, is_featured)
VALUES
  (
    'Bronze Package',
    'แพ็กเกจพื้นฐานสำหรับธุรกิจขนาดเล็ก',
    'bronze',
    999.00,
    7,
    30,
    '["feed_placement", "basic_analytics", "email_support"]'::jsonb,
    '["category"]'::jsonb,
    '#CD7F32',
    1,
    false
  ),
  (
    'Silver Package',
    'แพ็กเกจมาตรฐานสำหรับธุรกิจขนาดกลาง',
    'silver',
    2999.00,
    7,
    90,
    '["feed_placement", "sidebar", "advanced_analytics", "priority_approval", "a_b_testing"]'::jsonb,
    '["category", "interest"]'::jsonb,
    '#C0C0C0',
    2,
    true
  ),
  (
    'Gold Package',
    'แพ็กเกจพรีเมียมสำหรับแบรนด์ใหญ่',
    'gold',
    9999.00,
    14,
    180,
    '["feed_placement", "sidebar", "hero_banner", "premium_analytics", "priority_approval", "a_b_testing", "dedicated_support", "monthly_report"]'::jsonb,
    '["category", "interest", "faculty", "time_of_day"]'::jsonb,
    '#FFD700',
    3,
    true
  )
ON CONFLICT DO NOTHING;

-- ==========================================
-- Ad Campaigns table (for A/B testing & better tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign identity
  campaign_name TEXT NOT NULL,
  advertiser_name TEXT, -- Can be different from campaign_name
  advertiser_contact TEXT,

  -- Package & pricing
  package_id UUID REFERENCES ad_packages(id),
  pricing_model VARCHAR(20) DEFAULT 'fixed' CHECK (pricing_model IN ('fixed', 'cpm', 'cpc', 'cpd')),

  -- Custom pricing (override)
  final_price NUMERIC(10, 2), -- What they actually pay (after discount)
  notes TEXT, -- Internal notes, discounts applied, etc.

  -- Duration
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,

  -- Targeting (expanded)
  target_faculties TEXT[] DEFAULT '{}', -- ['คณะครุศาสตร์', 'คณะวิทยาการคอมฯ']
  target_interests TEXT[] DEFAULT '{}',
  target_categories INTEGER[] DEFAULT '{}',
  target_years INTEGER[] DEFAULT '{}', -- [1, 2, 3, 4]
  target_genders TEXT[] DEFAULT '{}', -- Empty = all

  -- A/B Testing
  is_ab_test BOOLEAN DEFAULT false,
  parent_campaign_id UUID REFERENCES ad_campaigns(id),
  ab_variant VARCHAR(10), -- 'A' or 'B'

  -- Status (workflow)
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'rejected',
    'active', 'paused', 'completed', 'cancelled'
  )),
  rejection_reason TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,

  -- Budget
  budget NUMERIC(10, 2), -- Budget cap
  daily_budget NUMERIC(10, 2), -- Daily spend cap

  -- Stats (from events table - denormalized for speed)
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0, -- from post view tracking

  -- Creator tracking
  created_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_package ON ad_campaigns(package_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON ad_campaigns(start_date, end_date);

-- ==========================================
-- RLS for packages (public read, admin write)
-- ==========================================
ALTER TABLE ad_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages"
ON ad_packages FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage packages"
ON ad_packages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ==========================================
-- RLS for campaigns
-- ==========================================
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Public can view approved campaigns (for sponsors page - future)
CREATE POLICY "Anyone can view approved campaigns"
ON ad_campaigns FOR SELECT
USING (status = 'approved' OR status = 'active' OR status = 'paused');

-- Authenticated users can view their own drafts
CREATE POLICY "Users can view own campaigns"
ON ad_campaigns FOR SELECT
USING (auth.uid() = created_by);

-- Admins can view all
CREATE POLICY "Admins can view all campaigns"
ON ad_campaigns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- Anyone authenticated can create campaigns
CREATE POLICY "Users can create campaigns"
ON ad_campaigns FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can update
CREATE POLICY "Admins can update campaigns"
ON ad_campaigns FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- Trigger to auto-set created_by
CREATE OR REPLACE FUNCTION set_campaign_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_campaign_created_by
  BEFORE INSERT ON ad_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION set_campaign_created_by();

-- ==========================================
-- Ad pricing estimator function
-- ==========================================
CREATE OR REPLACE FUNCTION calculate_ad_estimate(
  p_package_id UUID,
  p_duration_days INTEGER,
  p_target_faculties TEXT[],
  p_target_premium BOOLEAN DEFAULT false
)
RETURNS TABLE(
  package_name TEXT,
  base_price NUMERIC,
  duration_days INTEGER,
  subtotal NUMERIC,
  faculty_targeting_fee NUMERIC,
  premium_placement_fee NUMERIC,
  total_estimate NUMERIC,
  breakdown JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.name,
    p.base_price,
    p_duration_days,
    p.base_price * p_duration_days,
    CASE 
      WHEN p_target_faculties IS NOT NULL AND array_length(p_target_faculties, 1) > 0
      THEN (p.base_price * p_duration_days * 0.2 * array_length(p_target_faculties, 1)) -- 20% per faculty
      ELSE 0
    END,
    CASE WHEN p_target_premium THEN p.base_price * p_duration_days * 0.15 ELSE 0 END, -- 15% premium
    0::NUMERIC,
    jsonb_build_object(
      'base_price_per_day', p.base_price,
      'duration_fee', p.base_price * p_duration_days,
      'faculty_count', array_length(p_target_faculties, 1),
      'has_premium', p_target_premium
    )
  FROM ad_packages p
  WHERE p.id = p_package_id;
  
  -- Update total
  RETURN QUERY
  SELECT
    '', '', '', '', '', '',
    (p.base_price * p_duration_days) +
    COALESCE((p.base_price * p_duration_days * 0.2 * array_length(p_target_faculties, 1)), 0) +
    COALESCE(CASE WHEN p_target_premium THEN p.base_price * p_duration_days * 0.15 ELSE 0 END, 0),
    '{}'::JSONB
  FROM ad_packages p
  WHERE p.id = p_package_id;
  
END;
$$;

-- ==========================================
-- Helper view: Campaign performance
-- ==========================================
CREATE OR REPLACE VIEW campaign_performance AS
SELECT 
  ac.id,
  ac.campaign_name,
  ac.status,
  ap.name as package_name,
  ap.tier,
  ac.start_date,
  ac.end_date,
  ac.total_impressions,
  ac.total_clicks,
  ac.total_views,
  CASE WHEN ac.total_impressions > 0 
    THEN ROUND((ac.total_clicks::NUMERIC / ac.total_impressions) * 100, 2) 
    ELSE 0 
  END as ctr,
  ac.final_price,
  ac.target_faculties,
  ac.created_at
FROM ad_campaigns ac
LEFT JOIN ad_packages ap ON ac.package_id = ap.id;


GRANT ALL ON TABLE public.ad_packages TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.ad_campaigns TO anon, authenticated, service_role;
