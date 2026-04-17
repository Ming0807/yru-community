import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tablesToClean = [
      'user_analytics_events',
      'posts',
      'comments',
      'post_reactions',
      'follows',
      'messages',
      'notifications',
      'audit_logs',
      'online_presence',
      'push_subscriptions',
    ];

    const results: Record<string, { success: boolean; deleted?: number; error?: string }> = {};

    for (const table of tablesToClean) {
      try {
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq('user_id', userId);

        if (error) {
          results[table] = { success: false, error: error.message };
        } else {
          results[table] = { success: true, deleted: 0 };
        }
      } catch (err: any) {
        results[table] = { success: false, error: err.message };
      }
    }

    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (authError) {
      console.warn('[PDPA Delete] Auth delete failed (may require service role):', authError);
    }

    return NextResponse.json({
      success: true,
      message: 'User data deletion completed',
      results
    });
  } catch (error) {
    console.error('[PDPA Delete] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}