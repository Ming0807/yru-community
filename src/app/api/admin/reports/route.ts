import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const { reportId, action } = body as { reportId: string; action: 'resolve' | 'delete_content' };

    if (!reportId || !action) {
      return NextResponse.json({ error: 'Missing reportId or action' }, { status: 400 });
    }

    const supabase = await createClient();

    if (action === 'resolve') {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'resolved' })
        .eq('id', reportId);

      if (error) throw error;

      await logAdminAction('RESOLVE_REPORT', {
        target_type: 'report',
        target_id: reportId,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'delete_content') {
      const { data: report } = await supabase
        .from('reports')
        .select('post_id, comment_id')
        .eq('id', reportId)
        .single();

      if (!report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      if (report.post_id) {
        const { error } = await supabase
          .from('posts')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', report.post_id);
        if (error) throw error;

        await logAdminAction('DELETE_POST', {
          target_type: 'post',
          target_id: report.post_id,
          extra: { reason: 'reported_content' },
        });
      } else if (report.comment_id) {
        const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', report.comment_id);
        if (error) throw error;

        await logAdminAction('DELETE_COMMENT', {
          target_type: 'comment',
          target_id: report.comment_id,
          extra: { reason: 'reported_content' },
        });
      }

      await supabase
        .from('reports')
        .update({ status: 'resolved' })
        .eq('id', reportId);

      await logAdminAction('DELETE_REPORT_CONTENT', {
        target_type: 'report',
        target_id: reportId,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
