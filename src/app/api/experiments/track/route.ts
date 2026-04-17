import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { experiment_id, user_id, session_id } = await request.json();

    if (!experiment_id) {
      return NextResponse.json({ error: 'experiment_id required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc('track_experiment_conversion', {
      p_experiment_id: experiment_id,
      p_user_id: user_id || null,
      p_session_id: session_id || null,
    });

    if (error) {
      console.error('[Track] RPC error:', error);
      return NextResponse.json({ error: 'Failed to track conversion' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Track] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}