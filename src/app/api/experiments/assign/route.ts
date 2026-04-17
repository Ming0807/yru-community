import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { experiment_id, user_id, session_id } = await request.json();

    if (!experiment_id) {
      return NextResponse.json({ error: 'experiment_id required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_experiment_assignment', {
      p_experiment_id: experiment_id,
      p_user_id: user_id || null,
      p_session_id: session_id || null,
    });

    if (error) {
      console.error('[Assign] RPC error:', error);
      return NextResponse.json({ error: 'Failed to assign variant' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Assign] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}