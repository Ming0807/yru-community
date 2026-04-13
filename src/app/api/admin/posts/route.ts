import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = await createClient();

    let query = supabase
      .from('posts')
      .select('id, title, is_pinned, is_locked, deleted_at, created_at, category_id, category:categories(name)', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (category) {
      query = query.eq('category_id', category);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      posts: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('id');

    if (!postId) {
      return NextResponse.json({ error: 'Missing post id' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId);

    if (error) throw error;

    await logAdminAction('DELETE_POST', {
      target_type: 'post',
      target_id: postId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const { postId, updates } = body as { postId: string; updates: Record<string, any> };

    if (!postId || !updates) {
      return NextResponse.json({ error: 'Missing postId or updates' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId);

    if (error) throw error;

    if (updates.is_pinned !== undefined) {
      await logAdminAction(updates.is_pinned ? 'PIN_POST' : 'UNPIN_POST' as any, {
        target_type: 'post',
        target_id: postId,
      });
    }

    if (updates.is_locked !== undefined) {
      await logAdminAction(updates.is_locked ? 'LOCK_POST' : 'UNLOCK_POST' as any, {
        target_type: 'post',
        target_id: postId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
