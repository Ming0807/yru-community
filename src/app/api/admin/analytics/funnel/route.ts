import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { FunnelStage, FunnelData, FunnelStep } from '@/types/analytics/segments';

export async function GET(request: Request) {
try {
const auth = await requireAdmin();
if ('error' in auth) return auth.error;

const adminClient = getAdminClient();
const { searchParams } = new URL(request.url);
    
    const campaignId = searchParams.get('campaign_id');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const compareWithPrevious = searchParams.get('compare') === 'true';

    // Date range
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get campaign info if provided
    let campaignName = 'All Campaigns';
    if (campaignId) {
      const { data: campaign } = await adminClient
        .from('ad_campaigns')
        .select('name')
        .eq('id', campaignId)
        .single();
      if (campaign) campaignName = campaign.name;
    }

// Get impression data (using ad_impressions table if exists, or ads table as fallback)
  let impressionsQuery = adminClient
    .from('ad_impressions')
    .select('id, user_id, viewable, impression_uuid, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (campaignId) {
    impressionsQuery = impressionsQuery.eq('campaign_id', campaignId);
  }

  const { data: impressions, error: impressionsError } = await impressionsQuery
    .then(async ({ data, error }) => {
      if (error) {
        // Fallback to ads table for basic metrics
        let fallbackQuery = adminClient
          .from('ads')
          .select('id, campaign_id, created_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
        if (campaignId) {
          fallbackQuery = fallbackQuery.eq('campaign_id', campaignId);
        }
        return fallbackQuery;
      }
      return { data, error };
    });

  // Get click data
  let clicksQuery = adminClient
    .from('ad_clicks')
    .select('id, user_id, impression_id, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (campaignId) {
    clicksQuery = clicksQuery.eq('campaign_id', campaignId);
  }

  const { data: clicks, error: clicksError } = await clicksQuery;

  // Get conversion data
  let conversionsQuery = adminClient
    .from('ad_conversions')
    .select('id, ad_id, campaign_id, user_id, click_id, impression_id, conversion_type, conversion_value, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (campaignId) {
    conversionsQuery = conversionsQuery.eq('campaign_id', campaignId);
  }

  const { data: conversions, error: conversionsError } = await conversionsQuery;

  if (impressionsError || clicksError || conversionsError) {
    console.error('Error fetching funnel data:', { impressionsError, clicksError, conversionsError });
    return NextResponse.json({ error: 'Failed to fetch funnel data' }, { status: 500 });
  }

  // Calculate funnel metrics
  const totalImpressions = impressions?.length || 0;
  const uniqueImpressions = new Set(impressions?.map((i: { user_id?: string }) => i.user_id).filter(Boolean)).size;
  const totalClicks = clicks?.length || 0;
  const uniqueClicks = new Set(clicks?.map((c: { user_id?: string }) => c.user_id).filter(Boolean)).size;
  const totalConversions = conversions?.length || 0;
  const uniqueConversions = new Set(conversions?.map(c => c.user_id).filter(Boolean)).size;

  // Landing = users who saw ad and then clicked (from ad_clicks with impression)
  const landingsWithImpression = clicks?.filter(c => c.impression_id).length || 0;
  const uniqueLandings = new Set(clicks?.filter(c => c.impression_id).map(c => c.user_id).filter(Boolean)).size || uniqueClicks;

  // Calculate rates
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const clickToConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const impressionToConversionRate = totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0;
  const landingRate = totalClicks > 0 ? (landingsWithImpression / totalClicks) * 100 : 0;

  // Build funnel steps
  const steps: FunnelStep[] = [
    {
      stage: 'impression',
      step_name: 'แสดงผล',
      count: totalImpressions,
      unique_count: uniqueImpressions,
      dropoff_count: 0,
      dropoff_rate: 0,
      conversion_rate: 100,
    },
    {
      stage: 'click',
      step_name: 'คลิก',
      count: totalClicks,
      unique_count: uniqueClicks,
      dropoff_count: totalImpressions - totalClicks,
      dropoff_rate: totalImpressions > 0 ? ((totalImpressions - totalClicks) / totalImpressions) * 100 : 0,
      conversion_rate: ctr,
    },
    {
      stage: 'landing',
      step_name: 'เข้าหน้าเป้าหมาย',
      count: landingsWithImpression,
      unique_count: uniqueLandings,
      dropoff_count: totalClicks - landingsWithImpression,
      dropoff_rate: totalClicks > 0 ? ((totalClicks - landingsWithImpression) / totalClicks) * 100 : 0,
      conversion_rate: landingRate,
    },
    {
      stage: 'action',
      step_name: 'ดำเนินการ',
      count: totalConversions,
      unique_count: uniqueConversions,
      dropoff_count: landingsWithImpression - totalConversions,
      dropoff_rate: landingsWithImpression > 0 ? ((landingsWithImpression - totalConversions) / landingsWithImpression) * 100 : 0,
      conversion_rate: clickToConversionRate,
    },
    {
      stage: 'conversion',
      step_name: 'สำเร็จ',
      count: totalConversions,
      unique_count: uniqueConversions,
      dropoff_count: 0,
      dropoff_rate: 0,
      conversion_rate: impressionToConversionRate,
    },
  ];

  const funnelData: FunnelData = {
    campaign_id: campaignId || undefined,
    campaign_name: campaignName,
    date_range: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    steps,
    summary: {
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_landings: landingsWithImpression,
      total_actions: totalConversions,
      total_conversions: totalConversions,
      overall_ctr: Math.round(ctr * 10000) / 100,
      overall_conversion_rate: Math.round(impressionToConversionRate * 10000) / 100,
      avg_dropoff_stage: findMaxDropoffStage(steps),
    },
  };

    // Add comparison with previous period if requested
    if (compareWithPrevious) {
      // This would require another query for the previous period
      // For now, return the current data without comparison
      return NextResponse.json({
        current: funnelData,
        previous: null,
        changes: [],
        message: 'Previous period comparison requires additional queries',
      });
    }

    return NextResponse.json(funnelData);
  } catch (error) {
    console.error('Funnel API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function findMaxDropoffStage(steps: FunnelStep[]): FunnelStage | null {
  let maxDropoff = 0;
  let maxStage: FunnelStage | null = null;

  for (const step of steps) {
    if (step.dropoff_rate > maxDropoff && step.dropoff_count > 0) {
      maxDropoff = step.dropoff_rate;
      maxStage = step.stage;
    }
  }

  return maxStage;
}
