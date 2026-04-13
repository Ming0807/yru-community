export interface RevenueOverview {
  totalRevenue: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  averageCpc: number;
  activeCampaigns: number;
}

export interface RevenuePeriod {
  date: string;
  revenue: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface RevenueByTier {
  tier: string;
  tierName: string;
  revenue: number;
  count: number;
  color: string;
}

export interface RevenueByPosition {
  position: string;
  revenue: number;
  impressions: number;
  clicks: number;
}

export interface CampaignPerformance {
  id: string;
  campaignName: string;
  packageName: string;
  tier: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  finalPrice: number;
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
}

export interface RevenueStats {
  overview: RevenueOverview;
  currentPeriod: {
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
  };
  previousPeriod: {
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
  };
  periodComparison: {
    revenueChange: number;
    revenueChangePercent: number;
    impressionsChange: number;
    clicksChange: number;
    ctrChange: number;
  };
  daily: RevenuePeriod[];
  byTier: RevenueByTier[];
  byPosition: RevenueByPosition[];
  topCampaigns: CampaignPerformance[];
}

export type DateRangePreset = '7d' | '30d' | '90d' | 'this_month' | 'last_month' | 'this_year' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
  preset: DateRangePreset;
}