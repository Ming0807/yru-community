import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return new Response('Forbidden', { status: 403 });
  }

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (eventName: string, data: Record<string, unknown>) => {
        const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const checkAlerts = async () => {
        try {
          const { data: alerts } = await supabase
            .from('budget_alerts')
            .select('*, campaign:ad_campaigns(campaign_name)')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(5);

          if (alerts && alerts.length > 0) {
            sendEvent('budget_alert', {
              count: alerts.length,
              alerts: alerts.map((a: any) => ({
                id: a.id,
                type: a.alert_type,
                severity: a.alert_severity,
                message: a.message,
                campaign: a.campaign?.campaign_name,
                created_at: a.created_at,
              })),
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('[SSE] Error fetching budget alerts:', err);
        }
      };

      const checkCampaignChanges = async () => {
        try {
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          const { data: campaigns } = await supabase
            .from('ad_campaigns')
            .select('id, campaign_name, status, updated_at')
            .gte('updated_at', fiveMinAgo.toISOString())
            .in('status', ['active', 'paused', 'completed']);

          if (campaigns && campaigns.length > 0) {
            sendEvent('campaign_update', {
              count: campaigns.length,
              campaigns: campaigns.map((c: any) => ({
                id: c.id,
                name: c.campaign_name,
                status: c.status,
                updated_at: c.updated_at,
              })),
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('[SSE] Error fetching campaign changes:', err);
        }
      };

      const checkAdPerformance = async () => {
        try {
          const { data: ads } = await supabase
            .from('ads')
            .select('id, campaign_name, impressions, clicks, campaign_id')
            .eq('is_active', true)
            .order('impressions', { ascending: false })
            .limit(10);

          if (ads && ads.length > 0) {
            const topPerformers = ads.filter((a: any) => a.clicks > 0).slice(0, 5);
            if (topPerformers.length > 0) {
              sendEvent('ad_performance', {
                top_ads: topPerformers.map((a: any) => ({
                  id: a.id,
                  name: a.campaign_name,
                  impressions: a.impressions,
                  clicks: a.clicks,
                  ctr: a.impressions > 0 ? ((a.clicks / a.impressions) * 100).toFixed(2) : '0.00',
                })),
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (err) {
          console.error('[SSE] Error fetching ad performance:', err);
        }
      };

      const checkNewConversions = async () => {
        try {
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          const { count } = await supabase
            .from('ad_conversions')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', fiveMinAgo.toISOString());

          if (count && count > 0) {
            sendEvent('conversion', {
              count,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('[SSE] Error fetching conversions:', err);
        }
      };

      const fetchAll = async () => {
        await Promise.all([
          checkAlerts(),
          checkCampaignChanges(),
          checkAdPerformance(),
          checkNewConversions(),
        ]);
      };

      sendEvent('connected', { 
        status: 'connected', 
        channels: ['budget_alerts', 'campaigns', 'ad_performance', 'conversions'],
        timestamp: new Date().toISOString() 
      });

      await fetchAll();
      intervalId = setInterval(fetchAll, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    },

    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}