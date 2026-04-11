import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserCog, Shield, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'บทบาท & สิทธิ์ - Admin | YRU Community' };

export default async function AdminRolesPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/');

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, role, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const stats = {
    admin: users?.filter(u => u.role === 'admin').length ?? 0,
    moderator: users?.filter(u => u.role === 'moderator').length ?? 0,
    user: users?.filter(u => u.role === 'user').length ?? 0,
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[var(--color-yru-pink)]/10">
          <UserCog className="h-5 w-5 text-[var(--color-yru-pink)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">บทบาท & สิทธิ์</h1>
          <p className="text-sm text-muted-foreground">จัดการบทบาทและสิทธิ์ของผู้ใช้</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.admin}</p>
              <p className="text-sm text-muted-foreground">แอดมิน</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <UserCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.moderator}</p>
              <p className="text-sm text-muted-foreground">ม็อดเดเรเตอร์</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.user}</p>
              <p className="text-sm text-muted-foreground">สมาชิก</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card card-shadow overflow-hidden">
        <div className="p-4 border-b border-border/30">
          <h2 className="font-semibold">บทบาทในระบบ</h2>
        </div>
        <div className="divide-y divide-border/30">
          <div className="p-4 flex items-center justify-between hover:bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">แอดมิน (Admin)</p>
                <p className="text-sm text-muted-foreground">จัดการทุกอย่างในระบบ</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">เต็มสิทธิ์</Badge>
          </div>
          <div className="p-4 flex items-center justify-between hover:bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <UserCog className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">ม็อดเดเรเตอร์ (Moderator)</p>
                <p className="text-sm text-muted-foreground">จัดการเนื้อหาและรายงาน</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">จำกัด</Badge>
          </div>
          <div className="p-4 flex items-center justify-between hover:bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">สมาชิก (User)</p>
                <p className="text-sm text-muted-foreground">ผู้ใช้ทั่วไป</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">พื้นฐาน</Badge>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        การจัดการบทบาท - ดูที่ <a href="/admin/users" className="text-[var(--color-yru-pink)] hover:underline">หน้าจัดการผู้ใช้</a>
      </p>
    </div>
  );
}