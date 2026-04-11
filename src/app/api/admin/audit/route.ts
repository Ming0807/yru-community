import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let supabase;
    try {
      supabase = getAdminClient();
    } catch (e: any) {
      console.error('[AuditLogs] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error (Service Role Key missing)' }, { status: 500 });
    }
    
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, admin:profiles!admin_id(display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .range(0, 99);

    if (error) {
      console.error('[AuditLogs] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('[AuditLogs] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
