import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let supabase;
    try {
      supabase = getAdminClient();
    } catch (e: any) {
      console.error('[Announcements] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error (Service Role Key missing)' }, { status: 500 });
    }
    
    const { data, error } = await supabase
      .from('announcements')
      .select('*, created_by_user:profiles(display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[Announcements] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('[Announcements] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let supabase;
    try {
      supabase = getAdminClient();
    } catch (e: any) {
      console.error('[Announcements] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error (Service Role Key missing)' }, { status: 500 });
    }
    
    const { user } = auth as any;
    const body = await req.json();
    const { title, content, target = 'all', target_value, scheduled_at } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        target,
        target_value,
        scheduled_at,
        created_by: user?.id,
        is_sent: true, 
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Announcements] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
    }

    // TODO: Send push notifications to all users (Web Push)

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Announcements] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let supabase;
    try {
      supabase = getAdminClient();
    } catch (e: any) {
      console.error('[Announcements] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error (Service Role Key missing)' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Announcements] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Announcements] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}