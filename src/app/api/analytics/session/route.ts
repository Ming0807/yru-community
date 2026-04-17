import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { session_id, user_id } = await request.json();

    if (!session_id || !user_id) {
      return NextResponse.json({ error: 'session_id and user_id required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.id !== user_id) {
      return NextResponse.json({ error: 'Forbidden - user mismatch' }, { status: 403 });
    }

    const { count, error } = await supabase
      .from('user_analytics_events')
      .update({ user_id })
      .eq('session_id', session_id)
      .is('user_id', null);

    if (error) {
      console.error('[Session Link] Error:', error);
      return NextResponse.json({ error: 'Failed to link session' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session_id,
      user_id,
      events_updated: count || 0,
    });
  } catch (error) {
    console.error('[Session Link] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}