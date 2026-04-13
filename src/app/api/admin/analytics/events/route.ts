import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

interface AnalyticsEvent {
  event_type: string;
  session_id: string | null;
  ad_id?: string | null;
  ad_position?: string | null;
  device_type?: string | null;
  page_path?: string | null;
}

interface AdStats {
  ad_id: string;
  position: string | null;
  impressions: Set<string>;
  clicks: Set<string>;
  hovers: Set<string>;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      eventTypeStatsResult,
      adStatsResult,
      recentEventsResult,
      deviceStatsResult,
      pageStatsResult
    ] = await Promise.all([
      // Event type summary
      supabase
        .from('user_analytics_events')
        .select('event_type, session_id')
        .gte('created_at', startDate.toISOString())
        .then(async ({ data, error }) => {
          if (error) return { data: [], error };
          
const typeMap: Record<string, { total: number; unique: Set<string> }> = {};
  data?.forEach((e: AnalyticsEvent) => {
    if (!typeMap[e.event_type]) {
              typeMap[e.event_type] = { total: 0, unique: new Set() };
            }
            typeMap[e.event_type].total++;
            if (e.session_id) typeMap[e.event_type].unique.add(e.session_id);
          });
          
          const result = Object.entries(typeMap).map(([type, stats]) => ({
            event_type: type,
            total_events: stats.total,
            unique_sessions: stats.unique.size
          }));
          
          return { data: result };
        }),
      
      // Ad performance (from events table)
      supabase
        .from('user_analytics_events')
        .select('ad_id, event_type, session_id, ad_position')
        .gte('created_at', startDate.toISOString())
        .not('ad_id', 'is', null)
        .then(async ({ data, error }) => {
          if (error) return { data: [], error };
          
          const adMap: Record<string, AdStats> = {};
data?.forEach((e: AnalyticsEvent) => {
  if (!adMap[e.ad_id]) {
              adMap[e.ad_id] = {
                ad_id: e.ad_id,
                position: e.ad_position,
                impressions: new Set(),
                clicks: new Set(),
                hovers: new Set()
              };
            }
            if (e.event_type === 'ad_impression' && e.session_id) {
              adMap[e.ad_id].impressions.add(e.session_id);
            } else if (e.event_type === 'ad_click' && e.session_id) {
              adMap[e.ad_id].clicks.add(e.session_id);
            } else if (e.event_type === 'ad_hover' && e.session_id) {
              adMap[e.ad_id].hovers.add(e.session_id);
            }
          });
          
          return {
            data: Object.values(adMap).map((ad) => ({
              ad_id: ad.ad_id,
              position: ad.position,
              impressions: ad.impressions.size,
              clicks: ad.clicks.size,
              hovers: ad.hovers.size,
              ctr: ad.impressions.size > 0 
                ? ((ad.clicks.size / ad.impressions.size) * 100).toFixed(2)
                : '0.00'
            }))
          };
        }),
      
      // Recent events (last 20)
      supabase
        .from('user_analytics_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data, error }) => ({ data: data || [], error })),
      
      // Device breakdown
      supabase
        .from('user_analytics_events')
        .select('device_type')
        .gte('created_at', startDate.toISOString())
        .then(async ({ data, error }) => {
          if (error) return { data: [] };
          
const deviceMap: Record<string, number> = {};
  data?.forEach((e: AnalyticsEvent) => {
    const device = e.device_type || 'unknown';
            deviceMap[device] = (deviceMap[device] || 0) + 1;
          });
          
          return {
            data: Object.entries(deviceMap)
              .map(([device, count]) => ({ device, count }))
              .sort((a, b) => b.count - a.count)
          };
        }),
      
      // Top pages by views
      supabase
        .from('user_analytics_events')
        .select('page_path, event_type, session_id')
        .gte('created_at', startDate.toISOString())
        .eq('event_type', 'page_view')
        .then(async ({ data, error }) => {
          if (error) return { data: [] };
          
const pageMap: Record<string, { views: Set<string>; total: number }> = {};
  data?.forEach((e: AnalyticsEvent) => {
    if (!pageMap[e.page_path]) {
              pageMap[e.page_path] = { views: new Set(), total: 0 };
            }
            if (e.session_id) pageMap[e.page_path].views.add(e.session_id);
            pageMap[e.page_path].total++;
          });
          
          return {
            data: Object.entries(pageMap)
              .map(([path, stats]) => ({
                page_path: path,
                page_views: stats.total,
                unique_views: stats.views.size
              }))
              .sort((a, b) => b.page_views - a.page_views)
              .slice(0, 10)
          };
        })
    ]);

    // Get summary counts
    const { count: totalEvents } = await supabase
      .from('user_analytics_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    const { count: uniqueSessions } = await supabase
      .from('user_analytics_events')
      .select('session_id', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .not('session_id', 'is', null);

    return NextResponse.json({
      period: {
        days,
        start: startDate.toISOString(),
        end: new Date().toISOString()
      },
      summary: {
        total_events: totalEvents || 0,
        unique_sessions: uniqueSessions || 0,
        avg_events_per_session: uniqueSessions > 0 
          ? ((totalEvents || 0) / uniqueSessions).toFixed(2)
          : '0.00'
      },
      event_types: eventTypeStatsResult.data || [],
      ad_performance: adStatsResult.data || [],
      recent_events: recentEventsResult.data?.slice(0, 10) || [],
      device_breakdown: deviceStatsResult.data || [],
      top_pages: pageStatsResult.data || []
    });
  } catch (error) {
    console.error('[Analytics Events] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}