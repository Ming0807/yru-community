import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireModerator } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  try {
    const { error: authError } = await requireModerator();
    if (authError) return authError;

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1);
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? 'all';
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('comments')
      .select('id, content, created_at, post_id, author_id, is_deleted', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) {
      const escaped = search.replace(/[%'"\\]/g, '\\$&');
      query = query.or(`content.ilike.%${escaped}%`);
    }

    if (status === 'active') {
      query = query.is('is_deleted', false);
    } else if (status === 'deleted') {
      query = query.is('is_deleted', true);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[AdminComments] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    const commentIds = (data ?? []).map((c: any) => c.id);
    const postIds = [...new Set((data ?? []).map((c: any) => c.post_id).filter(Boolean))];
    const authorIds = [...new Set((data ?? []).map((c: any) => c.author_id).filter(Boolean))];

    const [postsData, profilesData, reportsData] = await Promise.all([
      postIds.length > 0 ? supabase.from('posts').select('id, title').in('id', postIds) : { data: [] },
      authorIds.length > 0 ? supabase.from('profiles').select('id, display_name, avatar_url').in('id', authorIds) : { data: [] },
      commentIds.length > 0 ? supabase.from('reports').select('comment_id').in('comment_id', commentIds) : { data: [] },
    ]);

    const postsMap = new Map((postsData.data ?? []).map((p: any) => [p.id, p]));
    const profilesMap = new Map((profilesData.data ?? []).map((p: any) => [p.id, p]));
    const reportedIds = new Set((reportsData.data ?? []).map((r: any) => r.comment_id).filter(Boolean));

    const comments = (data ?? []).map((c: any) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      post_id: c.post_id,
      author_id: c.author_id,
      is_deleted: c.is_deleted ?? false,
      post_title: postsMap.get(c.post_id)?.title,
      user: profilesMap.get(c.author_id),
      has_report: reportedIds.has(c.id),
    }));

    return NextResponse.json({
      comments,
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (error) {
    console.error('[AdminComments] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { error: authError } = await requireModerator();
    if (authError) return authError;

    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 });
    }

    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('id, content, author_id, post_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', commentId);

    if (updateError) {
      console.error('[AdminComments] Delete error:', updateError);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    const { data: post } = await supabase
      .from('posts')
      .select('title')
      .eq('id', comment.post_id)
      .single();

    await logAdminAction('DELETE_COMMENT', {
      target_type: 'comment',
      target_id: commentId,
      extra: {
        content_preview: comment.content.slice(0, 100),
        post_title: post?.title,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AdminComments] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}