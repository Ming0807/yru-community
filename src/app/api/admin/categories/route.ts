import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const { action, data } = body as { action: string; data: any };

    const supabase = await createClient();

    if (action === 'create') {
      const { data: result, error } = await supabase
        .from('categories')
        .insert(data)
        .select()
        .single();
      if (error) throw error;

      await logAdminAction('CREATE_CATEGORY', {
        target_type: 'category',
        target_id: String(result.id),
        extra: data,
      });

      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'update') {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);
      if (error) throw error;

      await logAdminAction('UPDATE_CATEGORY', {
        target_type: 'category',
        target_id: String(id),
        extra: updates,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', data.id);
      if (error) throw error;

      await logAdminAction('DELETE_CATEGORY', {
        target_type: 'category',
        target_id: String(data.id),
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
