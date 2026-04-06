import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const { userId, updates } = body as { userId: string; updates: Record<string, any> };

    if (!userId || !updates) {
      return NextResponse.json({ error: 'Missing userId or updates' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;

    const actionMap: Record<string, string> = {
      banned: 'BAN_USER',
      suspended: 'SUSPEND_USER',
      active: 'ACTIVATE_USER',
    };

    if (updates.role === 'admin') {
      await logAdminAction('PROMOTE_ADMIN', {
        target_type: 'user',
        target_id: userId,
      });
    } else if (updates.role === 'user') {
      await logAdminAction('DEMOTE_ADMIN', {
        target_type: 'user',
        target_id: userId,
      });
    } else if (updates.status && actionMap[updates.status]) {
      await logAdminAction(actionMap[updates.status] as any, {
        target_type: 'user',
        target_id: userId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
