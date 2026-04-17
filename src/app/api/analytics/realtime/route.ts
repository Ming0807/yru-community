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

      const fetchMetrics = async () => {
        try {
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          const todayStart = new Date(now.setHours(0, 0, 0, 0));

          const [
            { count: totalUsers },
            { count: newUsers },
            { count: totalPosts },
            { data: recentPosts },
            { data: recentEvents },
          ] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
            supabase.from('posts').select('*', { count: 'exact', head: true }),
            supabase.from('posts').select('created_at, user_id').gte('created_at', oneHourAgo.toISOString()),
            supabase.from('user_analytics_events').select('event_type, created_at').gte('created_at', oneHourAgo.toISOString()),
          ]);

          const postsLastHour = recentPosts?.length || 0;
          const eventsLastHour = recentEvents?.length || 0;

          const activeNow = (recentEvents || []).filter((e: { created_at: string }) => {
            const eventTime = new Date(e.created_at).getTime();
            return now.getTime() - eventTime < 5 * 60 * 1000;
          }).length;

          const payload = {
            timestamp: now.toISOString(),
            metrics: {
              total_users: totalUsers || 0,
              new_users_today: newUsers || 0,
              total_posts: totalPosts || 0,
              posts_last_hour: postsLastHour,
              events_last_hour: eventsLastHour,
              active_now: activeNow,
            },
          };

          sendEvent('metrics', payload);
        } catch (err) {
          console.error('[SSE] Error fetching metrics:', err);
        }
      };

      sendEvent('connected', { status: 'connected', timestamp: new Date().toISOString() });

      await fetchMetrics();
      intervalId = setInterval(fetchMetrics, 30000);

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