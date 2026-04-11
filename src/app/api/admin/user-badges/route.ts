import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

// Award badge to user
export async function PUT(req: NextRequest) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const body = await req.json();
    const { user_id, badge_id } = body;

    if (!user_id || !badge_id) {
      return NextResponse.json({ error: 'user_id and badge_id are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_badges')
      .insert({
        user_id,
        badge_id,
        awarded_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'User already has this badge' }, { status: 400 });
      }
      console.error('[UserBadges] Insert error:', error);
      return NextResponse.json({ error: 'Failed to award badge' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[UserBadges] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Remove badge from user
export async function DELETE(req: NextRequest) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_badges')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[UserBadges] Delete error:', error);
      return NextResponse.json({ error: 'Failed to remove badge' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[UserBadges] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}