-- ==========================================
-- Phase 59: Ad Campaign Association
-- Adds campaign_id to ads table
-- ==========================================

-- Add campaign_id column to ads table
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL;

-- Add index for efficient campaign-based queries
CREATE INDEX IF NOT EXISTS idx_ads_campaign ON public.ads(campaign_id);

-- Create view for ads with campaign info
CREATE OR REPLACE VIEW ads_with_campaigns AS
SELECT
  a.*,
  ac.campaign_name as parent_campaign_name,
  ac.status as campaign_status,
  ac.advertiser_name,
  ac.package_id,
  ac.pricing_model,
  ac.budget,
  ac.daily_budget
FROM public.ads a
LEFT JOIN ad_campaigns ac ON ac.id = a.campaign_id;