import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Award, CheckCircle, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'ระบบเหรียญตรา - Admin | YRU Community' };

export default async function AdminBadgesPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/');

  const { data: usersWithBadges } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, badges')
    .not('badges', 'is', null)
    .limit(50);

  const sampleBadges = [
    { id: 'verified', name: 'ยืนยันตัวตน', icon: '✓', color: 'bg-blue-100 text-blue-700', description: 'ผู้ใช้ที่ยืนยันตัวตนนักศึกษา' },
    { id: 'top_contributor', name: 'Top Contributor', icon: '⭐', color: 'bg-yellow-100 text-yellow-700', description: 'ผู้ใช้ที่มีการมีส่วนร่วมสูง' },
    { id: 'early_adopter', name: 'Early Adopter', icon: '🌟', color: 'bg-purple-100 text-purple-700', description: 'ผู้ใช้รุ่นแรกของระบบ' },
    { id: 'helpful', name: 'ผู้ช่วยเหลือ', icon: '🤝', color: 'bg-green-100 text-green-700', description: 'ผู้ใช้ที่ช่วยตอบคำถามบ่อย' },
    { id: 'veteran', name: 'Veteran', icon: '🎖️', color: 'bg-orange-100 text-orange-700', description: 'ใช้งานมานานกว่า 1 ปี' },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[var(--color-yru-pink)]/10">
          <Award className="h-5 w-5 text-[var(--color-yru-pink)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ระบบเหรียญตรา</h1>
          <p className="text-sm text-muted-foreground">จัดการเหรียญตราและการยืนยันตัวตน</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{usersWithBadges?.filter(u => u.badges?.verified)?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">ยืนยันตัวตนแล้ว</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Award className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sampleBadges.length}</p>
              <p className="text-sm text-muted-foreground">ประเภทเหรียญ</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Users className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{usersWithBadges?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">มีเหรียญตรา</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card card-shadow overflow-hidden">
        <div className="p-4 border-b border-border/30">
          <h2 className="font-semibold">เหรียญตราที่มี</h2>
        </div>
        <div className="divide-y divide-border/30">
          {sampleBadges.map((badge) => (
            <div key={badge.id} className="p-4 flex items-center justify-between hover:bg-muted/20">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${badge.color}`}>
                  <span className="text-lg">{badge.icon}</span>
                </div>
                <div>
                  <p className="font-medium">{badge.name}</p>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                </div>
              </div>
              <Badge variant="outline">ใช้งาน</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-yellow-50 dark:bg-yellow-900/10 p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">ระบบเหรียญตราในการพัฒนา</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              ระบบเหรียญตราและการยืนยันตัวตนยังอยู่ระหว่างการพัฒนา ในอนาคตจะสามารถมอบเหรียญตราให้ผู้ใช้โดยอัตโนมัติหรือ手动
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}