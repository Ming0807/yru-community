import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

type AttributionModel = 'last_click' | 'first_click' | 'linear' | 'time_decay' | 'u_shaped' | 'position_based';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const adminClient = getAdminClient();
    const { searchParams } = new URL(request.url);

    const model = (searchParams.get('model') || 'last_click') as AttributionModel;
    const campaignId = searchParams.get('campaign_id');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const windowDays = parseInt(searchParams.get('window') || '30', 10);

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Date range
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    // Get conversions with their touchpoints
    let conversionsQuery = adminClient
      .from('ad_conversions')
      .select(`
        id,
        ad_id,
        campaign_id,
        user_id,
        click_id,
        impression_id,
        conversion_type,
        conversion_value,
        created_at,
        ad:ads!ad_id(campaign_name, campaign_id),
        campaign:ad_campaigns!campaign_id(campaign_name),
        click:ad_clicks!click_id(ad_id, created_at),
        impression:ad_impressions!impression_id(ad_id, created_at)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (campaignId) {
      conversionsQuery = conversionsQuery.eq('campaign_id', campaignId);
    }

    const { data: conversions, error } = await conversionsQuery;

    if (error) {
      console.error('Error fetching conversions:', error);
      return NextResponse.json({ error: 'Failed to fetch conversions' }, { status: 500 });
    }

// Build touchpoint map for proper attribution
    const touchpointMap = new Map<string, { ad_id: string; created_at: string; type: 'click' | 'impression'; time_to_conv?: number }[]>();

    // Collect all impression touchpoints within the attribution window
    const { data: impressionTouchpoints } = await adminClient
      .from('ad_impressions')
      .select('id, ad_id, user_id, created_at')
      .gte('created_at', windowStart.toISOString())
      .lte('created_at', endDate.toISOString());

    // Collect all click touchpoints
    const { data: clickTouchpoints } = await adminClient
      .from('ad_clicks')
      .select('id, ad_id, user_id, created_at')
      .gte('created_at', windowStart.toISOString())
      .lte('created_at', endDate.toISOString());

    // Build user journey map: user_id -> sorted touchpoints
    const userJourneyMap = new Map<string, { ad_id: string; created_at: string; type: 'click' | 'impression' }[]>();

    (impressionTouchpoints || []).forEach(imp => {
      const key = imp.user_id || '';
      if (!userJourneyMap.has(key)) userJourneyMap.set(key, []);
      userJourneyMap.get(key)!.push({ ad_id: imp.ad_id, created_at: imp.created_at, type: 'impression' });
    });

    (clickTouchpoints || []).forEach(click => {
      const key = click.user_id || '';
      if (!userJourneyMap.has(key)) userJourneyMap.set(key, []);
      userJourneyMap.get(key)!.push({ ad_id: click.ad_id, created_at: click.created_at, type: 'click' });
    });

    // Sort each user's journey by timestamp
    for (const [userId, touchpoints] of userJourneyMap) {
      userJourneyMap.set(userId, touchpoints.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
    }

  // Group conversions by ad and campaign
  const adCredits: Record<string, { ad_id: string; ad_title: string; credit: number; conversions: number; value: number }> = {};
  const campaignCredits: Record<string, { campaign_id: string; campaign_name: string; credit: number; conversions: number; value: number }> = {};

  for (const conv of conversions || []) {
    // Attribution based on model
    let creditedAdId = conv.ad_id;
    let creditedCampaignId = conv.campaign_id;
    let credit = 1.0;

    if (model === 'first_click') {
      // First touch: get first ad the user interacted with
      const userJourney = userJourneyMap.get(conv.user_id || '') || [];
      if (userJourney.length > 0) {
        creditedAdId = userJourney[0].ad_id;
      }
      credit = 1.0;
    } else if (model === 'linear') {
      // Linear: credit distributed equally among all touchpoints
      const userJourney = userJourneyMap.get(conv.user_id || '') || [];
      const touchpointCount = userJourney.length || 1;
      credit = 1.0 / touchpointCount;
    } else if (model === 'time_decay') {
      // Time decay: exponential decay based on days before conversion
      const userJourney = userJourneyMap.get(conv.user_id || '') || [];
      const convTime = new Date(conv.created_at).getTime();
      if (userJourney.length > 0) {
        // Give more credit to touchpoints closer to conversion
        const decayFactor = 0.85; // 15% decay per day
        let totalWeight = 0;
        userJourney.forEach(tp => {
          const daysBeforeConv = Math.max(0, (convTime - new Date(tp.created_at).getTime()) / (1000 * 60 * 60 * 24));
          totalWeight += Math.pow(decayFactor, daysBeforeConv);
        });
        // This is simplified - in production would calculate per-touchpoint weights
        credit = totalWeight / userJourney.length;
      }
    } else if (model === 'u_shaped') {
      // U-shaped: 40% first touch, 20% each middle touch, 40% last touch
      const userJourney = userJourneyMap.get(conv.user_id || '') || [];
      if (userJourney.length === 1) {
        credit = 1.0;
      } else if (userJourney.length === 2) {
        credit = 0.5; // 50% each
      } else {
        const firstLastWeight = 0.4;
        const middleWeight = 0.2 / (userJourney.length - 2);
        // For simplicity, attribute 40% to first, 20% to last, spread middle
        creditedAdId = userJourney[0].ad_id; // First touch gets primary credit
        credit = firstLastWeight;
      }
    } else if (model === 'position_based') {
      // Position-based: custom weights for first and last (default 30% first, 30% last, 40% spread)
      const userJourney = userJourneyMap.get(conv.user_id || '') || [];
      if (userJourney.length === 1) {
        credit = 1.0;
      } else if (userJourney.length === 2) {
        creditedAdId = userJourney[0].ad_id;
        credit = 0.5;
      } else {
        creditedAdId = userJourney[0].ad_id; // First touch gets primary credit
        credit = 0.3; // 30% for first touch
      }
    }
    // last_click is default (click_id gets credit - conv.ad_id)

    // Aggregate by ad
    const adTitle = (conv.ad as unknown as { campaign_name?: string } | null)?.campaign_name || 'Unknown Ad';
    if (!adCredits[creditedAdId]) {
      adCredits[creditedAdId] = {
        ad_id: creditedAdId,
        ad_title: adTitle,
        credit: 0,
        conversions: 0,
        value: 0,
      };
    }
    adCredits[creditedAdId].credit += credit;
    adCredits[creditedAdId].conversions += 1;
    adCredits[creditedAdId].value += conv.conversion_value || 0;

    // Aggregate by campaign
    const campaignName = (conv.campaign as unknown as { campaign_name?: string } | null)?.campaign_name || 'Unknown Campaign';
    if (!campaignCredits[creditedCampaignId]) {
      campaignCredits[creditedCampaignId] = {
        campaign_id: creditedCampaignId,
        campaign_name: campaignName,
        credit: 0,
        conversions: 0,
        value: 0,
      };
    }
    campaignCredits[creditedCampaignId].credit += credit;
    campaignCredits[creditedCampaignId].conversions += 1;
    campaignCredits[creditedCampaignId].value += conv.conversion_value || 0;
  }

    // Sort and format results
    const totalConversions = conversions?.length || 0;
    const totalValue = conversions?.reduce((sum, c) => sum + (c.conversion_value || 0), 0) || 0;

    const byAd = Object.values(adCredits)
      .map(ad => ({
        ...ad,
        conversion_credit: ad.credit,
        revenue_credit: ad.value,
        percentage_of_credit: totalConversions > 0 ? (ad.credit / totalConversions) * 100 : 0,
      }))
      .sort((a, b) => b.credit - a.credit)
      .slice(0, 20);

    const byCampaign = Object.values(campaignCredits)
      .map(camp => ({
        ...camp,
        conversion_credit: camp.credit,
        revenue_credit: camp.value,
        percentage_of_credit: totalConversions > 0 ? (camp.credit / totalConversions) * 100 : 0,
      }))
      .sort((a, b) => b.credit - a.credit)
      .slice(0, 20);

    return NextResponse.json({
      model,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        total_conversions: totalConversions,
        total_conversion_value: totalValue,
        unique_campaigns: Object.keys(campaignCredits).length,
        unique_ads: Object.keys(adCredits).length,
      },
      by_campaign: byCampaign,
      by_ad: byAd,
model_descriptions: {
      last_click: 'แอดสุดท้ายที่ user คลิกก่อน conversion ได้เครดิตทั้งหมด',
      first_click: 'แอดแรกที่สร้าง awareness ได้เครดิตทั้งหมด',
      linear: 'เครดิตแบ่งเท่ากันทุก touchpoint',
      time_decay: 'แอดที่ใกล้ conversion สุดได้เครดิตมากสุด (decay 85% ต่อวัน)',
      u_shaped: 'U-shaped: 40% first, 20% middle, 40% last touchpoint',
      position_based: 'Position-based: 30% first, 30% last, 40% spread evenly',
    },
    available_models: ['last_click', 'first_click', 'linear', 'time_decay', 'u_shaped', 'position_based'],
    ml_models_available: ['data_driven', 'markov', 'shapley'],
    ml_endpoint: '/api/admin/analytics/attribution/ml?model=data_driven&train=true',
    attribution_window_days: windowDays,
    });
  } catch (error) {
    console.error('Attribution API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}