import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireModerator } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireModerator();
    if ('error' in auth) return auth.error;

    const supabase = auth.supabase;

    const { data: campaigns } = await supabase
      .from('ad_campaigns')
      .select(`
        id,
        campaign_name,
        status,
        start_date,
        end_date,
        daily_budget,
        budget,
        final_price,
        package:ad_packages (
          name,
          tier
        )
      `)
      .in('status', ['active', 'paused', 'approved']);

    const { data: ads } = await supabase
      .from('ads')
      .select('campaign_id, impressions, clicks, revenue, created_at');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const campaignPacingMap = new Map<string, {
      dailySpent: number;
      totalSpent: number;
      dailyImpressions: number;
      totalImpressions: number;
      dailyClicks: number;
      totalClicks: number;
    }>();

    (ads || []).forEach((ad) => {
      const existing = campaignPacingMap.get(ad.campaign_id) || {
        dailySpent: 0,
        totalSpent: 0,
        dailyImpressions: 0,
        totalImpressions: 0,
        dailyClicks: 0,
        totalClicks: 0,
      };

      const adDate = new Date(ad.created_at);
      existing.totalImpressions += ad.impressions || 0;
      existing.totalClicks += ad.clicks || 0;
      existing.totalSpent += ad.revenue || 0;

      if (adDate >= today) {
        existing.dailyImpressions += ad.impressions || 0;
        existing.dailyClicks += ad.clicks || 0;
        existing.dailySpent += ad.revenue || 0;
      }

      campaignPacingMap.set(ad.campaign_id, existing);
    });

    const pacingData = (campaigns || []).map((c) => {
      const pacing = campaignPacingMap.get(c.id) || {
        dailySpent: 0,
        totalSpent: 0,
        dailyImpressions: 0,
        totalImpressions: 0,
        dailyClicks: 0,
        totalClicks: 0,
      };

      const dailyBudget = Number(c.daily_budget || 0);
      const totalBudget = Number(c.budget || c.final_price || 0);

      const expectedDailySpend = totalBudget / 30;
      const dailyPacing = dailyBudget > 0 ? (pacing.dailySpent / dailyBudget) * 100 : 0;
      const totalPacing = totalBudget > 0 ? (pacing.totalSpent / totalBudget) * 100 : 0;

      let status: 'on_track' | 'over_pacing' | 'under_pacing' | 'exhausted' = 'on_track';
      if (dailyBudget > 0 && dailyPacing >= 100) {
        status = 'exhausted';
      } else if (dailyBudget > 0 && dailyPacing >= 80) {
        status = 'over_pacing';
      } else if (dailyBudget > 0 && dailyPacing <= 50) {
        status = 'under_pacing';
      }

      return {
        campaignId: c.id,
        campaignName: c.campaign_name,
        dailyBudget,
        totalBudget,
        ...pacing,
        dailyPacing,
        totalPacing,
        status,
        startDate: c.start_date,
        endDate: c.end_date,
      };
    });

    const totalDailyBudget = pacingData.reduce((sum, c) => sum + (c.dailyBudget || 0), 0);
    const totalDailySpent = pacingData.reduce((sum, c) => sum + c.dailySpent, 0);
    const totalMonthlyBudget = pacingData.reduce((sum, c) => sum + (c.totalBudget || 0), 0);
    const totalMonthlySpent = pacingData.reduce((sum, c) => sum + c.totalSpent, 0);

    const campaignsOnTrack = pacingData.filter(c => c.status === 'on_track').length;
    const campaignsOverBudget = pacingData.filter(c => c.status === 'over_pacing').length;
    const campaignsExhausted = pacingData.filter(c => c.status === 'exhausted').length;

    const overview = {
      totalDailyBudget,
      totalDailySpent,
      totalMonthlyBudget,
      totalMonthlySpent,
      campaignsOnTrack,
      campaignsOverBudget,
      campaignsExhausted,
    };

    const alerts: Array<{
      campaignId: string;
      campaignName: string;
      type: string;
      message: string;
      severity: 'warning' | 'critical';
      suggestedAction: string;
    }> = [];

    pacingData.forEach((c) => {
      if (c.status === 'exhausted') {
        alerts.push({
          campaignId: c.campaignId,
          campaignName: c.campaignName,
          type: 'daily_exhausted',
          message: `งบประจำวันหมดแล้ว (${c.dailyPacing.toFixed(0)}%)`,
          severity: 'critical',
          suggestedAction: 'เพิ่มงบหรือหยุดชั่วคราว',
        });
      } else if (c.status === 'over_pacing') {
        alerts.push({
          campaignId: c.campaignId,
          campaignName: c.campaignName,
          type: 'over_budget',
          message: `ใช้งบเร็วกว่าแผน (${c.dailyPacing.toFixed(0)}%)`,
          severity: 'warning',
          suggestedAction: 'ลดงบหรือขยายระยะเวลา',
        });
      }
    });

    return NextResponse.json({
      overview,
      campaigns: pacingData,
      alerts,
    });
  } catch (error) {
    console.error('[Budget Pacing] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}