import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Shield, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AuditLogTable } from '@/components/admin/tables/AuditLogTable';
import { getAdminClient } from '@/lib/supabase/admin';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
  admin?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export default async function AuditLogPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/');

  let logs: any[] | null = null;
  try {
    const adminSupabase = getAdminClient();
    const { data } = await adminSupabase
      .from('audit_logs')
      .select('*, admin:profiles!admin_id(display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(100);
    logs = data;
  } catch (err) {
    console.error('Failed to fetch initial audit logs with admin client:', err);
  }

  const auditLogs = (logs ?? []) as AuditLog[];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-(--color-yru-pink)" />
            ประวัติการทำงาน (Audit Logs)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            บันทึกการกระทำทั้งหมดของทีม Admin เพื่อความโปร่งใส
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <Clock className="h-3 w-3" />
          {auditLogs.length} รายการ
        </Badge>
      </div>

      <AuditLogTable initialLogs={auditLogs} />
    </div>
  );
}
