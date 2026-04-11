import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireModerator } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';

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
      .select('id, content, user_id, post_id')
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