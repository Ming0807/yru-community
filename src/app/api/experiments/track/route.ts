import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

const SESSION_ID_PATTERN = /^[a-zA-Z0-9_.:-]{1,100}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const ip = getClientIp(request);

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { experiment_id, session_id } = body as Record<string, unknown>;

    if (typeof experiment_id !== 'string' || !UUID_PATTERN.test(experiment_id)) {
      return NextResponse.json({ error: 'experiment_id required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const safeSessionId = typeof session_id === 'string' && SESSION_ID_PATTERN.test(session_id)
      ? session_id
      : null;

    if (!user && !safeSessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const rateLimit = checkRateLimit(`experiment-track:${ip}:${safeSessionId || user?.id || 'anonymous'}`, {
      limit: 60,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many conversion requests' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const adminClient = getAdminClient();
    const { error } = await adminClient.rpc('track_experiment_conversion', {
      p_experiment_id: experiment_id,
      p_user_id: user?.id || null,
      p_session_id: safeSessionId,
    });

    if (error) {
      console.error('[Track] RPC error:', error);
      return NextResponse.json({ error: 'Failed to track conversion' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('[Track] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
