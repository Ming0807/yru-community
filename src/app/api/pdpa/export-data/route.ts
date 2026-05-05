'use server';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
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

    const exportData: Record<string, unknown[]> = {};

    const tablesToExport = [
      { name: 'profile', query: supabase.from('profiles').select('*').eq('id', userId) },
      { name: 'posts', query: supabase.from('posts').select('*').eq('author_id', userId) },
      { name: 'comments', query: supabase.from('comments').select('*').eq('author_id', userId) },
      { name: 'post_reactions', query: supabase.from('post_reactions').select('*').eq('user_id', userId) },
      { name: 'follows', query: supabase.from('follows').select('*').eq('follower_id', userId) },
      { name: 'following', query: supabase.from('follows').select('*').eq('following_id', userId) },
      { name: 'messages_sent', query: supabase.from('messages').select('*').eq('sender_id', userId) },
      { name: 'messages_received', query: supabase.from('messages').select('*').eq('receiver_id', userId) },
      { name: 'analytics_events', query: supabase.from('user_analytics_events').select('*').eq('user_id', userId) },
      { name: 'notifications', query: supabase.from('notifications').select('*').eq('user_id', userId) },
    ];

    for (const table of tablesToExport) {
      const { data, error } = await table.query;
      exportData[table.name] = error ? [] : (data || []);
    }

    return NextResponse.json({
      export_date: new Date().toISOString(),
      user_id: userId,
      data: exportData,
      record_counts: Object.fromEntries(
        Object.entries(exportData).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      )
    });
  } catch (error) {
    console.error('[PDPA Export] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
