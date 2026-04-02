import { createClient } from '@/lib/supabase/server';
import { Users, FileText, MessageSquare, Flag } from 'lucide-react';
export const dynamic = 'force-dynamic'; // <--- เติมบรรทัดนี้เพื่อปิดการทำ Cache

export const metadata = {
  title: 'Admin Dashboard - YRU Community',
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch counts
  const [
    { count: usersCount },
    { count: postsCount },
    { count: commentsCount },
    { count: reportsCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }),
  ]);

  const stats = [
    {
      title: 'ผู้ใช้ทั้งหมด',
      value: usersCount || 0,
      icon: <Users className="h-6 w-6 text-blue-500" />,
      color: 'bg-blue-500/10 border-blue-200 dark:border-blue-900',
    },
    {
      title: 'กระทู้ทั้งหมด',
      value: postsCount || 0,
      icon: <FileText className="h-6 w-6 text-green-500" />,
      color: 'bg-green-500/10 border-green-200 dark:border-green-900',
    },
    {
      title: 'ความคิดเห็น',
      value: commentsCount || 0,
      icon: <MessageSquare className="h-6 w-6 text-purple-500" />,
      color: 'bg-purple-500/10 border-purple-200 dark:border-purple-900',
    },
    {
      title: 'แจ้งปัญหา/รายงาน',
      value: reportsCount || 0,
      icon: <Flag className="h-6 w-6 text-red-500" />,
      color: 'bg-red-500/10 border-red-200 dark:border-red-900',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">ภาพรวมระบบ</h1>
        <p className="text-muted-foreground">
          ดูสถิติและสถานะปัจจุบันของแพลตฟอร์ม YRU Community
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className={`rounded-2xl border p-6 flex flex-col gap-2 ${stat.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </span>
              {stat.icon}
            </div>
            <div className="text-3xl font-bold">{stat.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Placeholder for future charts or recent activity log */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <div className="col-span-4 rounded-2xl border border-border/60 bg-background p-6">
          <h2 className="font-semibold mb-4">กิจกรรมล่าสุด</h2>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/30 rounded-xl">
            กราฟกิจกรรม (กำลังพัฒนา)
          </div>
        </div>
        <div className="col-span-3 rounded-2xl border border-border/60 bg-background p-6">
          <h2 className="font-semibold mb-4 text-red-500">รายงานที่ต้องตรวจสอบ</h2>
          {reportsCount === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
              <Flag className="h-8 w-8 mb-2 opacity-30" />
              <p>ไม่มีรายงานใหม่ 🎉</p>
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
              <div className="text-4xl font-bold text-red-500 mb-2">{reportsCount}</div>
              <p>รายการรอตรวจสอบ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
