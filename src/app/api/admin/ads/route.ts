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
        .from('ads')
        .insert(data)
        .select()
        .single();
      if (error) throw error;

      await logAdminAction('CREATE_AD', {
        target_type: 'ad',
        target_id: result.id,
        extra: { campaign_name: data.campaign_name },
      });

      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'update') {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('ads')
        .update(updates)
        .eq('id', id);
      if (error) throw error;

      await logAdminAction('UPDATE_AD', {
        target_type: 'ad',
        target_id: id,
        extra: { campaign_name: updates.campaign_name },
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', data.id);
      if (error) throw error;

      await logAdminAction('DELETE_AD', {
        target_type: 'ad',
        target_id: data.id,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'toggle') {
      const { error } = await supabase
        .from('ads')
        .update({ is_active: data.is_active })
        .eq('id', data.id);
      if (error) throw error;

      await logAdminAction('TOGGLE_AD', {
        target_type: 'ad',
        target_id: data.id,
        extra: { is_active: data.is_active },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
