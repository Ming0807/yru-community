import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const supabase = await createClient();
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
    const eventTypes = (eventTypeStatsResult.data || []).map((row: any) => ({
      event_type: row.event_type,
      total_events: parseInt(row.total_events),
      unique_sessions: parseInt(row.unique_sessions)
    }));

const adPerformance = (adStatsResult.data || []).map((row: any) => ({
  ad_id: row.ad_id,
  impressions: parseInt(row.impressions) || 0,
  clicks: parseInt(row.clicks) || 0,
  hovers: parseInt(row.hovers) || 0,
  ctr: row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : '0.00'
}));

    // Get summary counts
    const summary: any = summaryResult.data || {
      total_events: 0,
      unique_sessions: 0,
      avg_events_per_session: '0.00'
    };

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
      stats: (customEventStatsResult.data || []).map((r: any) => ({
        event_type: r.event_type,
        total_events: parseInt(r.total_events),
        unique_sessions: parseInt(r.unique_sessions),
        unique_users: parseInt(r.unique_users)
      })),
      video_engagement: (videoStatsResult.data || []).map((r: any) => ({
        video_id: r.video_id,
        video_title: r.video_title,
        total_views: parseInt(r.total_views),
        unique_viewers: parseInt(r.unique_viewers),
        avg_progress: parseFloat(r.avg_progress || 0).toFixed(1)
      })),
      form_conversions: (formStatsResult.data || []).map((r: any) => ({
        form_id: r.form_id,
        form_name: r.form_name,
        total_submissions: parseInt(r.total_submissions),
        unique_submitters: parseInt(r.unique_submitters)
      }))
    },
    recent_events: (recentEventsResult.data || []).slice(0, 10),
    device_breakdown: (deviceStatsResult.data || []).map((d: any) => ({
      device: d.device_type,
      count: parseInt(d.count)
    })),
    top_pages: (pageStatsResult.data || []).map((p: any) => ({
      page_path: p.page_path,
      page_views: parseInt(p.page_views) || 0,
      unique_views: parseInt(p.unique_sessions) || 0
    }))
  });
  } catch (error) {
    console.error('[Analytics Events] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}