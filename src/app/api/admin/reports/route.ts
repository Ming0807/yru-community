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
    const status = searchParams.get('status');
    const countOnly = searchParams.get('count') === 'true';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = await createClient();

    if (countOnly) {
      let query = supabase.from('reports').select('*', { count: 'exact', head: true });
      if (status) {
        query = query.eq('status', status);
      }
      const { count, error } = await query;
      if (error) throw error;
      return NextResponse.json({ count: count ?? 0 });
    }

    let query = supabase
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_id_fkey(display_name, avatar_url), post:posts(id, title), comment:comments(id, content)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      reports: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
