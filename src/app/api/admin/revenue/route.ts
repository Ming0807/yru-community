import { NextRequest, NextResponse } from 'next/server';
import { requireModerator } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';

type AnalyticsSummary = {
  total_ad_clicks?: number;
  total_ad_impressions?: number;
};

type TierCampaignRow = {
  final_price?: number | string | null;
  ad_packages?: { name?: string | null; tier?: string | null } | null;
};

type TimelineRow = {
  period: string;
  ad_impressions: number;
  ad_clicks: number;
};

type TopCampaignRow = {
  id: string;
  campaign_id?: string | null;
  parent_campaign_name?: string | null;
  campaign_name?: string | null;
  campaign_status?: string | null;
  final_price?: number | string | null;
  impressions?: number;
  clicks?: number;
};

export async function GET(req: NextRequest) {
  try {
    const auth = await requireModerator();
    if ('error' in auth) return auth.error;

    const supabase = auth.supabase;
    const adminClient = getAdminClient();
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';

    const { from, to } = getDateRange(range);
    const startDate = from.toISOString();
    const endDate = to.toISOString();
    
    // Previous period for comparison
    const periodDurationMs = to.getTime() - from.getTime();
    const prevStartDate = new Date(from.getTime() - periodDurationMs).toISOString();

    // 1. Fetch Consolidated Analytics Summaries (Optimized via SQL RPC)
    const [currentSummary, previousSummary, timelineData, topCampaigns] = await Promise.all([
      // Current period summary
      adminClient.rpc('get_analytics_summary', { start_date: startDate }),
      // Previous period summary (for comparison)
      adminClient.rpc('get_analytics_summary', { start_date: prevStartDate }),
      // Daily timeline for charts
      adminClient.rpc('get_events_timeline', {
        start_date: startDate, 
        end_date: endDate, 
        granularity: 'day' 
      }),
      // Top performing campaigns joining ads with campaign info
      supabase
        .from('ads_with_campaigns')
        .select('*')
        .order('clicks', { ascending: false })
        .limit(10)
    ]);

    // Handle RPC errors
    if (currentSummary.error || previousSummary.error || timelineData.error) {
      console.error('[Revenue API] RPC Error:', currentSummary.error || previousSummary.error || timelineData.error);
      throw new Error('Database analytics functions failed');
    }

    const current = (currentSummary.data[0] || {}) as AnalyticsSummary;
    const previous = (previousSummary.data[0] || {}) as AnalyticsSummary;

    // 2. Fetch Additional Breakdown Stats
    const { data: byTier } = await supabase
      .from('ad_campaigns')
      .select('package_id, final_price, ad_packages(name, tier)')
      .gte('created_at', startDate)
      .not('final_price', 'is', null);

    // 3. Process Tier Breakdown
    const tierMap = new Map();
    const tierColors: Record<string, string> = {
      bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700', custom: '#7EC8A4'
    };

    ((byTier || []) as TierCampaignRow[]).forEach((c) => {
      const tier = c.ad_packages?.tier || 'custom';
      const existing = tierMap.get(tier) || { 
        tier, 
        tierName: c.ad_packages?.name || 'Custom', 
        revenue: 0, 
        count: 0,
        color: tierColors[tier] || '#888888'
      };
      existing.revenue += Number(c.final_price || 0);
      existing.count += 1;
      tierMap.set(tier, existing);
    });

    // 4. Calculate Comparison Metrics
    const comparison = {
      revenueChange: (current.total_ad_clicks || 0) * 10 - (previous.total_ad_clicks || 0) * 10, // Mock revenue calculation or adjust as needed
      revenueChangePercent: calculatePercentChange(current.total_ad_clicks || 0, previous.total_ad_clicks || 0),
      impressionsChange: (current.total_ad_impressions || 0) - (previous.total_ad_impressions || 0),
      impressionsChangePercent: calculatePercentChange(current.total_ad_impressions || 0, previous.total_ad_impressions || 0),
      clicksChange: (current.total_ad_clicks || 0) - (previous.total_ad_clicks || 0),
      clicksChangePercent: calculatePercentChange(current.total_ad_clicks || 0, previous.total_ad_clicks || 0),
      ctrChange: calculateCtr(current) - calculateCtr(previous)
    };

    const stats = {
      overview: {
        totalRevenue: (current.total_ad_clicks || 0) * 10, // Adjust based on your pricing logic
        totalImpressions: current.total_ad_impressions || 0,
        totalClicks: current.total_ad_clicks || 0,
        averageCtr: calculateCtr(current),
        activeCampaigns: topCampaigns.data?.length || 0,
        totalCampaigns: 0 // Fetch count separately if needed
      },
      periodComparison: comparison,
      daily: ((timelineData.data || []) as TimelineRow[]).map((d) => ({
        date: new Date(d.period).toISOString().split('T')[0],
        impressions: d.ad_impressions,
        clicks: d.ad_clicks,
        revenue: d.ad_clicks * 10, // Simplified revenue
        ctr: d.ad_impressions > 0 ? (d.ad_clicks / d.ad_impressions) * 100 : 0
      })),
      byTier: Array.from(tierMap.values()),
      byPosition: [], // Can be fetched via another RPC if needed
      topCampaigns: ((topCampaigns.data || []) as TopCampaignRow[]).map((c) => {
        const impressions = c.impressions || 0;
        const clicks = c.clicks || 0;

        return {
          id: c.campaign_id || c.id,
          campaignName: c.parent_campaign_name || c.campaign_name,
          packageName: '-',
          tier: '-',
          status: c.campaign_status,
          finalPrice: c.final_price,
          impressions,
          clicks,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          revenue: clicks * 10
        };
      })
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Revenue API] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function getDateRange(range: string): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  switch (range) {
    case '7d': from.setDate(from.getDate() - 7); break;
    case '30d': from.setDate(from.getDate() - 30); break;
    case '90d': from.setDate(from.getDate() - 90); break;
    case 'this_month': from.setDate(1); break;
    default: from.setDate(from.getDate() - 30);
  }
  return { from, to };
}

function calculatePercentChange(current: number, previous: number) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function calculateCtr(data: AnalyticsSummary) {
  if (!data || !data.total_ad_impressions || data.total_ad_impressions === 0) return 0;
  return ((data.total_ad_clicks || 0) / data.total_ad_impressions) * 100;
}
