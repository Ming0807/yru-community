'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, Users, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  criteria: Record<string, any> | null;
  user_count: number;
}

export default function AdminBadgesPage() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBadge, setNewBadge] = useState({ name: '', description: '', icon: '🏆', color: 'bg-yellow-100' });

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['admin', 'badges'],
    queryFn: async () => {
      const res = await fetch('/api/admin/badges');
      if (!res.ok) throw new Error('Failed to fetch badges');
      const data = await res.json();
      return (data ?? []) as Badge[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBadge),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'badges'] });
      setNewBadge({ name: '', description: '', icon: '🏆', color: 'bg-yellow-100' });
      setIsDialogOpen(false);
      toast.success('สร้างเหรียญตราสำเร็จ');
    },
    onError: () => {
      toast.error('ไม่สามารถสร้างได้');
    },
  });

  const iconOptions = ['✓', '⭐', '🌟', '🤝', '🎖️', '🏆', '🔥', '💎', '🚀', '❤️'];
  const colorOptions = [
    { value: 'bg-blue-100 text-blue-700', label: 'ฟ้า' },
    { value: 'bg-yellow-100 text-yellow-700', label: 'เหลือง' },
    { value: 'bg-green-100 text-green-700', label: 'เขียว' },
    { value: 'bg-purple-100 text-purple-700', label: 'ม่วง' },
    { value: 'bg-orange-100 text-orange-700', label: 'ส้ม' },
    { value: 'bg-pink-100 text-pink-700', label: 'ชมพู' },
  ];

  const getUserBadgeStats = () => {
    const total = badges.reduce((sum, b) => sum + b.user_count, 0);
    return { total, badgeTypes: badges.length };
  };

  const stats = getUserBadgeStats();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-yru-pink)]/10">
            <Award className="h-5 w-5 text-[var(--color-yru-pink)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ระบบเหรียญตรา</h1>
            <p className="text-sm text-muted-foreground">จัดการเหรียญตราและการยืนยันตัวตน</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              สร้างเหรียญตราใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>สร้างเหรียญตราใหม่</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">ชื่อเหรียญ</label>
                <Input
                  placeholder="เช่น Top Contributor"
                  value={newBadge.name}
                  onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium">คำอธิบาย</label>
                <Textarea
                  placeholder="รายละเอียดเหรียญ..."
                  value={newBadge.description}
                  onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })}
                  className="mt-1 rounded-xl min-h-[80px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium">ไอคอน</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewBadge({ ...newBadge, icon })}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 ${
                        newBadge.icon === icon 
                          ? 'border-[var(--color-yru-pink)] bg-[var(--color-yru-pink)]/10' 
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                  ยกเลิก
                </Button>
                <Button 
                  onClick={() => createMutation.mutate()} 
                  disabled={createMutation.isPending || !newBadge.name}
                  className="rounded-xl gap-2"
                >
                  <Plus className="h-4 w-4" />
                  สร้าง
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Award className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{badges.length}</p>
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
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">เหรียญที่มอบไป</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{badges.filter(b => b.criteria).length}</p>
              <p className="text-sm text-muted-foreground">อัตโนมัติ</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card card-shadow overflow-hidden">
        <div className="p-4 border-b border-border/30">
          <h2 className="font-semibold">เหรียญตราที่มี</h2>
        </div>
        <div className="divide-y divide-border/30">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">กำลังโหลด...</div>
          ) : badges.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              ยังไม่มีเหรียญตรา
            </div>
          ) : (
            badges.map((badge) => (
              <div key={badge.id} className="p-4 flex items-center justify-between hover:bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${badge.color || 'bg-yellow-100'}`}>
                    <span className="text-lg">{badge.icon || '🏆'}</span>
                  </div>
                  <div>
                    <p className="font-medium">{badge.name}</p>
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    {badge.user_count} คน
                  </Badge>
                  {badge.criteria && (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      อัตโนมัติ
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}