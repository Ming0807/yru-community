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
    const status = searchParams.get('status') || '';
    const role = searchParams.get('role') || '';
    const faculty = searchParams.get('faculty') || '';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = await createClient();

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (role) {
      query = query.eq('role', role);
    }
    if (faculty) {
      query = query.eq('faculty', faculty);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      users: data ?? [],
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
