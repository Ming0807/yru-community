import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireModerator } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireModerator();
    if ('error' in auth) return auth.error;

    const supabase = auth.supabase;
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';

    const { from, to } = getDateRange(range);

    const startDate = from.toISOString();
    const endDate = to.toISOString();
    const prevStartDate = new Date(from.getTime() - (to.getTime() - from.getTime())).toISOString();

    const [
      overviewResult,
      currentPeriodResult,
      previousPeriodResult,
      dailyResult,
      byTierResult,
      byPositionResult,
      topCampaignsResult,
    ] = await Promise.all([
      getOverview(supabase, startDate, endDate),
      getPeriodStats(supabase, startDate, endDate),
      getPeriodStats(supabase, prevStartDate, startDate),
      getDailyStats(supabase, startDate, endDate),
      getRevenueByTier(supabase, startDate, endDate),
      getRevenueByPosition(supabase, startDate, endDate),
      getTopCampaigns(supabase, startDate, endDate),
    ]);

    const periodComparison = calculateComparison(currentPeriodResult, previousPeriodResult);

    const stats = {
      overview: overviewResult,
      currentPeriod: currentPeriodResult,
      previousPeriod: previousPeriodResult,
      periodComparison,
      daily: dailyResult,
      byTier: byTierResult,
      byPosition: byPositionResult,
      topCampaigns: topCampaignsResult,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Revenue] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function getDateRange(range: string): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();

  switch (range) {
    case '7d':
      from.setDate(from.getDate() - 7);
      break;
    case '30d':
      from.setDate(from.getDate() - 30);
      break;
    case '90d':
      from.setDate(from.getDate() - 90);
      break;
    case 'this_month':
      from.setDate(1);
      break;
    case 'last_month':
      from.setMonth(from.getMonth() - 1);
      from.setDate(1);
      to.setDate(0);
      break;
    case 'this_year':
      from.setMonth(0);
      from.setDate(1);
      break;
    default:
      from.setDate(from.getDate() - 30);
  }

  return { from, to };
}

async function getOverview(supabase: Awaited<ReturnType<typeof createClient>>, startDate: string, endDate: string) {
  const { data: campaigns } = await supabase
    .from('ad_campaigns')
    .select('final_price, status, start_date, end_date')
    .in('status', ['active', 'approved', 'completed']);

  const { data: ads } = await supabase
    .from('ads')
    .select('impressions, clicks');

  const totalRevenue = (campaigns || [])
    .filter(c => c.final_price && c.final_price > 0)
    .reduce((sum, c) => sum + Number(c.final_price), 0);

  const totalImpressions = (ads || []).reduce((sum, a) => sum + (a.impressions || 0), 0);
  const totalClicks = (ads || []).reduce((sum, a) => sum + (a.clicks || 0), 0);

  const totalCampaigns = (campaigns || []).length;
  const activeCampaigns = (campaigns || []).filter(c => c.status === 'active').length;

  return {
    totalRevenue,
    totalImpressions,
    totalClicks,
    averageCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    averageCpc: totalClicks > 0 ? totalRevenue / totalClicks : 0,
    activeCampaigns,
    totalCampaigns,
  };
}

async function getPeriodStats(supabase: Awaited<ReturnType<typeof createClient>>, startDate: string, endDate: string) {
  const { data: campaigns } = await supabase
    .from('ad_campaigns')
    .select('final_price, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .not('final_price', 'is', null);

  const { data: ads } = await supabase
    .from('ads')
    .select('impressions, clicks, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const revenue = (campaigns || []).reduce((sum, c) => sum + Number(c.final_price || 0), 0);
  const impressions = (ads || []).reduce((sum, a) => sum + (a.impressions || 0), 0);
  const clicks = (ads || []).reduce((sum, a) => sum + (a.clicks || 0), 0);

  return {
    revenue,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
  };
}

function calculateComparison(
  current: { revenue: number; impressions: number; clicks: number; ctr: number },
  previous: { revenue: number; impressions: number; clicks: number; ctr: number }
) {
  const revenueChange = current.revenue - previous.revenue;
  const revenueChangePercent = previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : current.revenue > 0 ? 100 : 0;

  return {
    revenueChange,
    revenueChangePercent,
    impressionsChange: current.impressions - previous.impressions,
    impressionsChangePercent: previous.impressions > 0 ? ((current.impressions - previous.impressions) / previous.impressions) * 100 : 0,
    clicksChange: current.clicks - previous.clicks,
    clicksChangePercent: previous.clicks > 0 ? ((current.clicks - previous.clicks) / previous.clicks) * 100 : 0,
    ctrChange: current.ctr - previous.ctr,
  };
}

async function getDailyStats(supabase: Awaited<ReturnType<typeof createClient>>, startDate: string, endDate: string) {
  const { data: campaigns } = await supabase
    .from('ad_campaigns')
    .select('final_price, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .not('final_price', 'is', null);

  const { data: ads } = await supabase
    .from('ads')
    .select('impressions, clicks, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const dailyMap = new Map<string, { revenue: number; impressions: number; clicks: number }>();

  (campaigns || []).forEach(c => {
    const date = new Date(c.created_at).toISOString().split('T')[0];
    const existing = dailyMap.get(date) || { revenue: 0, impressions: 0, clicks: 0 };
    existing.revenue += Number(c.final_price || 0);
    dailyMap.set(date, existing);
  });

  (ads || []).forEach(a => {
    const date = new Date(a.created_at).toISOString().split('T')[0];
    const existing = dailyMap.get(date) || { revenue: 0, impressions: 0, clicks: 0 };
    existing.impressions += a.impressions || 0;
    existing.clicks += a.clicks || 0;
    dailyMap.set(date, existing);
  });

  const result = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({
      date,
      revenue: stats.revenue,
      impressions: stats.impressions,
      clicks: stats.clicks,
      ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

async function getRevenueByTier(supabase: Awaited<ReturnType<typeof createClient>>, startDate: string, endDate: string) {
  const { data: campaigns } = await supabase
    .from('ad_campaigns')
    .select(`
      final_price,
      package:ad_packages (
        tier,
        name
      )
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .not('final_price', 'is', null);

  const tierMap = new Map<string, { tier: string; tierName: string; revenue: number; count: number }>();

  const tierColors: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    custom: '#7EC8A4',
  };

  const tierNames: Record<string, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    custom: 'Custom',
  };

  (campaigns || []).forEach(c => {
    const tier = (c.package as { tier?: string; name?: string } | null)?.tier || 'unknown';
    const name = (c.package as { tier?: string; name?: string } | null)?.name || tier;
    const existing = tierMap.get(tier) || { tier, tierName: tierNames[tier] || name, revenue: 0, count: 0 };
    existing.revenue += Number(c.final_price || 0);
    existing.count += 1;
    tierMap.set(tier, existing);
  });

  return Array.from(tierMap.values()).map(t => ({
    ...t,
    color: tierColors[t.tier] || '#888888',
  }));
}

async function getRevenueByPosition(supabase: Awaited<ReturnType<typeof createClient>>, startDate: string, endDate: string) {
  const { data: ads } = await supabase
    .from('ads')
    .select('position, impressions, clicks, revenue')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const positionMap = new Map<string, { position: string; revenue: number; impressions: number; clicks: number }>();

  const positionNames: Record<string, string> = {
    feed: 'Feed',
    sidebar: 'Sidebar',
    banner: 'Banner',
  };

  (ads || []).forEach(a => {
    const pos = a.position || 'unknown';
    const existing = positionMap.get(pos) || { position: positionNames[pos] || pos, revenue: 0, impressions: 0, clicks: 0 };
    existing.revenue += a.revenue || 0;
    existing.impressions += a.impressions || 0;
    existing.clicks += a.clicks || 0;
    positionMap.set(pos, existing);
  });

  return Array.from(positionMap.values());
}

async function getTopCampaigns(supabase: Awaited<ReturnType<typeof createClient>>, startDate: string, endDate: string) {
  const { data: campaigns } = await supabase
    .from('ad_campaigns')
    .select(`
      id,
      campaign_name,
      final_price,
      status,
      start_date,
      end_date,
      created_at,
      package:ad_packages (
        name,
        tier
      )
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .not('final_price', 'is', null)
    .order('final_price', { ascending: false })
    .limit(10);

  const enriched = await Promise.all(
    (campaigns || []).map(async (c) => {
      const { data: adData } = await supabase
        .from('ads')
        .select('impressions, clicks')
        .eq('campaign_id', c.id)
        .single();

      const impressions = adData?.impressions || 0;
      const clicks = adData?.clicks || 0;

      return {
        id: c.id,
        campaignName: c.campaign_name,
        packageName: (c.package as { name?: string } | null)?.name || '-',
        tier: (c.package as { tier?: string } | null)?.tier || '-',
        status: c.status,
        startDate: c.start_date,
        endDate: c.end_date,
        finalPrice: Number(c.final_price || 0),
        impressions,
        clicks,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        revenue: Number(c.final_price || 0),
      };
    })
  );

  return enriched;
}