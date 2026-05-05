import { getAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

type EventTypeStatRow = {
  event_type: string;
  total_events: string | number;
  unique_sessions: string | number;
};

type AdPerformanceRow = {
  ad_id: string;
  impressions: string | number;
  clicks: string | number;
  hovers: string | number;
};

type AnalyticsSummaryRow = {
  total_events?: string | number;
  unique_sessions?: string | number;
  avg_events_per_session?: string | number;
};

type CustomEventStatRow = EventTypeStatRow & {
  unique_users: string | number;
};

type VideoEngagementRow = {
  video_id: string;
  video_title: string;
  total_views: string | number;
  unique_viewers: string | number;
  avg_progress: string | number;
};

type FormConversionRow = {
  form_id: string;
  form_name: string;
  total_submissions: string | number;
  unique_submitters: string | number;
};

type DeviceStatRow = {
  device_type: string;
  count: string | number;
};

type PageStatRow = {
  page_path: string;
  page_views: string | number;
  unique_sessions: string | number;
};

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const adminClient = getAdminClient();
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

const [
  summaryResult,
  eventTypeStatsResult,
  adStatsResult,
  recentEventsResult,
  deviceStatsResult,
  pageStatsResult,
  customEventStatsResult,
  videoStatsResult,
  formStatsResult
] = await Promise.all([
  adminClient.rpc('get_analytics_summary', { start_date: startDateStr }).single(),

  adminClient.rpc('get_event_type_stats', { start_date: startDateStr }),

  adminClient
  .from('ad_performance_summary')
  .select('*'),

  adminClient
  .from('user_analytics_events')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(20),

  adminClient.rpc('get_device_stats', { start_date: startDateStr }),

  adminClient
  .from('page_performance_stats')
  .select('*')
  .order('page_views', { ascending: false })
  .limit(10),

  adminClient
  .from('custom_event_stats')
  .select('*')
  .gte('first_seen', startDateStr),

  adminClient
  .from('video_engagement_stats')
  .select('*')
  .limit(10),

  adminClient
  .from('form_conversion_stats')
  .select('*')
  .limit(10)
    ]);

    // Process event type stats
    const eventTypes = ((eventTypeStatsResult.data || []) as EventTypeStatRow[]).map((row) => ({
      event_type: row.event_type,
      total_events: parseInt(String(row.total_events)),
      unique_sessions: parseInt(String(row.unique_sessions))
    }));

const adPerformance = ((adStatsResult.data || []) as AdPerformanceRow[]).map((row) => {
  const impressions = parseInt(String(row.impressions)) || 0;
  const clicks = parseInt(String(row.clicks)) || 0;

  return {
    ad_id: row.ad_id,
    impressions,
    clicks,
    hovers: parseInt(String(row.hovers)) || 0,
    ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
  };
});

    // Get summary counts
    const summary = (summaryResult.data || {
      total_events: 0,
      unique_sessions: 0,
      avg_events_per_session: '0.00'
    }) as AnalyticsSummaryRow;

return NextResponse.json({
    period: {
      days,
      start: startDateStr,
      end: new Date().toISOString()
    },
    summary: {
      total_events: summary.total_events || 0,
      unique_sessions: summary.unique_sessions || 0,
      avg_events_per_session: summary.avg_events_per_session || '0.00'
    },
    event_types: eventTypes,
    ad_performance: adPerformance,
    custom_events: {
      stats: ((customEventStatsResult.data || []) as CustomEventStatRow[]).map((r) => ({
        event_type: r.event_type,
        total_events: parseInt(String(r.total_events)),
        unique_sessions: parseInt(String(r.unique_sessions)),
        unique_users: parseInt(String(r.unique_users))
      })),
      video_engagement: ((videoStatsResult.data || []) as VideoEngagementRow[]).map((r) => ({
        video_id: r.video_id,
        video_title: r.video_title,
        total_views: parseInt(String(r.total_views)),
        unique_viewers: parseInt(String(r.unique_viewers)),
        avg_progress: parseFloat(String(r.avg_progress || 0)).toFixed(1)
      })),
      form_conversions: ((formStatsResult.data || []) as FormConversionRow[]).map((r) => ({
        form_id: r.form_id,
        form_name: r.form_name,
        total_submissions: parseInt(String(r.total_submissions)),
        unique_submitters: parseInt(String(r.unique_submitters))
      }))
    },
    recent_events: (recentEventsResult.data || []).slice(0, 10),
    device_breakdown: ((deviceStatsResult.data || []) as DeviceStatRow[]).map((d) => ({
      device: d.device_type,
      count: parseInt(String(d.count))
    })),
    top_pages: ((pageStatsResult.data || []) as PageStatRow[]).map((p) => ({
      page_path: p.page_path,
      page_views: parseInt(String(p.page_views)) || 0,
      unique_views: parseInt(String(p.unique_sessions)) || 0
    }))
  });
  } catch (error) {
    console.error('[Analytics Events] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
