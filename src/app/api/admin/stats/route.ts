import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true });

  const { data: users } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  const { data: comments } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true });

  const { data: reports } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

const encoder = new TextEncoder();

  let interval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = async () => {
        try {
          const [postsRes, usersRes, commentsRes, reportsRes] = await Promise.all([
            supabase.from('posts').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('comments').select('id', { count: 'exact', head: true }),
            supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          ]);

          const stats = {
            posts: postsRes.count || 0,
            users: usersRes.count || 0,
            comments: commentsRes.count || 0,
            pendingReports: reportsRes.count || 0,
            timestamp: Date.now(),
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`));
        } catch (error) {
          console.error('Stats SSE error:', error);
        }
      };

      sendUpdate();
      interval = setInterval(sendUpdate, 30000);
    },
    cancel() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}