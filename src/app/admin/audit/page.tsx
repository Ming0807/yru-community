import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { 
  Shield, 
  Trash2, 
  UserX, 
  CheckCircle, 
  ToggleRight,
  FileText,
  Clock,
  Filter
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/utils';

const ACTION_CONFIG: Record<string, { icon: typeof Shield; label: string; color: string }> = {
  DELETE_POST: { icon: Trash2, label: 'ลบกระทู้', color: 'text-red-500 bg-red-500/10' },
  DELETE_COMMENT: { icon: Trash2, label: 'ลบคอมเมนต์', color: 'text-red-400 bg-red-400/10' },
  BAN_USER: { icon: UserX, label: 'แบนผู้ใช้', color: 'text-red-600 bg-red-600/10' },
  SUSPEND_USER: { icon: UserX, label: 'ระงับผู้ใช้', color: 'text-amber-500 bg-amber-500/10' },
  ACTIVATE_USER: { icon: CheckCircle, label: 'เปิดใช้งานผู้ใช้', color: 'text-green-500 bg-green-500/10' },
  RESOLVE_REPORT: { icon: CheckCircle, label: 'จัดการรายงาน', color: 'text-blue-500 bg-blue-500/10' },
  TOGGLE_AD: { icon: ToggleRight, label: 'สลับโฆษณา', color: 'text-purple-500 bg-purple-500/10' },
  CREATE_AD: { icon: FileText, label: 'สร้างโฆษณา', color: 'text-emerald-500 bg-emerald-500/10' },
};

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

  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/');

  // Fetch audit logs with admin profile
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, admin:profiles!admin_id(display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(100);

  const auditLogs = (logs ?? []) as AuditLog[];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
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

      {/* Log List */}
      {auditLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-border/40 bg-card card-shadow">
          <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-1">ยังไม่มีบันทึก</h3>
          <p className="text-sm text-muted-foreground">
            การกระทำของ Admin จะถูกบันทึกที่นี่โดยอัตโนมัติ
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden card-shadow">
          <div className="divide-y divide-border/30">
            {auditLogs.map((log, idx) => {
              const config = ACTION_CONFIG[log.action] ?? { 
                icon: FileText, 
                label: log.action, 
                color: 'text-muted-foreground bg-muted' 
              };
              const Icon = config.icon;
              const details = log.details as Record<string, string>;

              return (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  {/* Action Icon */}
                  <div className={`flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm">{config.label}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {log.target_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {details.title && `"${details.title}"`}
                      {details.user_name && `ผู้ใช้: ${details.user_name}`}
                      {details.reason && ` — เหตุผล: ${details.reason}`}
                      {!details.title && !details.user_name && `ID: ${log.target_id}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/70">
                      {log.admin && (
                        <span className="flex items-center gap-1">
                          {log.admin.avatar_url ? (
                            <img src={log.admin.avatar_url} alt="" className="w-3.5 h-3.5 rounded-full" />
                          ) : null}
                          {log.admin.display_name}
                        </span>
                      )}
                      <span>•</span>
                      <span>{timeAgo(log.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
