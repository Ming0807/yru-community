import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_ID_PATTERN = /^[a-zA-Z0-9_.:-]{1,100}$/;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { session_id, user_id } = body as Record<string, unknown>;

    if (typeof session_id !== 'string' || typeof user_id !== 'string') {
      return NextResponse.json({ error: 'session_id and user_id required' }, { status: 400 });
    }

    if (!SESSION_ID_PATTERN.test(session_id)) {
      return NextResponse.json({ error: 'Invalid session_id' }, { status: 400 });
    }

    const rateLimit = checkRateLimit(`analytics-session:${ip}:${session_id}`, {
      limit: 20,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many session link attempts' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.id !== user_id) {
      return NextResponse.json({ error: 'Forbidden - user mismatch' }, { status: 403 });
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('user_analytics_events')
      .update({ user_id }, { count: 'exact' })
      .eq('session_id', session_id)
      .is('user_id', null)
      .gte('created_at', oneDayAgo);

    if (error) {
      console.error('[Session Link] Error:', error);
      return NextResponse.json({ error: 'Failed to link session' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session_id,
      user_id,
      events_updated: count || 0,
    }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('[Session Link] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
