'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Plus, Send, Eye, Trash2, Clock, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target: string;
  created_at: string;
  is_sent: boolean;
  sent_at: string | null;
  created_by_user?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ 
    title: '', 
    content: '', 
    target: 'all' 
  });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: async () => {
      const res = await fetch('/api/admin/announcements');
      if (!res.ok) throw new Error('Failed to fetch announcements');
      const data = await res.json();
      return (data ?? []) as Announcement[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAnnouncement),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      setNewAnnouncement({ title: '', content: '', target: 'all' });
      setIsDialogOpen(false);
      toast.success('สร้างประกาศสำเร็จ');
    },
    onError: () => {
      toast.error('ไม่สามารถสร้างประกาศได้');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      toast.success('ลบประกาศสำเร็จ');
    },
    onError: () => {
      toast.error('ไม่สามารถลบได้');
    },
  });

  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'all': return 'ทุกคน';
      case 'specific_role': return 'บทบาทเฉพาะ';
      case 'specific_user': return 'ผู้ใช้เฉพาะ';
      default: return target;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-yru-pink)]/10">
            <Bell className="h-5 w-5 text-[var(--color-yru-pink)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ประกาศระบบ</h1>
            <p className="text-sm text-muted-foreground">ส่งแจ้งเตือนหาผู้ใช้ในระบบ</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              สร้างประกาศใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>สร้างประกาศใหม่</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">หัวข้อ</label>
                <Input
                  placeholder="หัวข้อประกาศ..."
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium">เนื้อหา</label>
                <Textarea
                  placeholder="เนื้อหาประกาศ..."
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  className="mt-1 rounded-xl min-h-[120px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium">กลุ่มเป้าหมาย</label>
                <Select 
                  value={newAnnouncement.target} 
                  onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, target: v })}
                >
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        ทุกคน
                      </div>
                    </SelectItem>
                    <SelectItem value="specific_role">บทบาทเฉพาะ</SelectItem>
                    <SelectItem value="specific_user">ผู้ใช้เฉพาะ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                  ยกเลิก
                </Button>
                <Button 
                  onClick={() => createMutation.mutate()} 
                  disabled={createMutation.isPending || !newAnnouncement.title || !newAnnouncement.content}
                  className="rounded-xl gap-2"
                >
                  <Send className="h-4 w-4" />
                  ส่งประกาศ
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <p className="text-2xl font-bold">{announcements.length}</p>
          <p className="text-sm text-muted-foreground">ประกาศทั้งหมด</p>
        </div>
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <p className="text-2xl font-bold text-green-500">{announcements.filter(a => a.is_sent).length}</p>
          <p className="text-sm text-muted-foreground">ส่งแล้ว</p>
        </div>
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <p className="text-2xl font-bold text-blue-500">{announcements.filter(a => a.target === 'all').length}</p>
          <p className="text-sm text-muted-foreground">ส่งถึงทุกคน</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card card-shadow overflow-hidden">
        <div className="p-4 border-b border-border/30">
          <h2 className="font-semibold">ประวัติประกาศ</h2>
        </div>
        <div className="divide-y divide-border/30">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">กำลังโหลด...</div>
          ) : announcements.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8 opacity-30" />
              <p>ยังไม่มีประกาศ</p>
            </div>
          ) : (
            announcements.map((item) => (
              <div key={item.id} className="p-4 hover:bg-muted/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{item.title}</h3>
                      {item.is_sent ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">ส่งแล้ว</Badge>
                      ) : (
                        <Badge variant="outline">รอส่ง</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{getTargetLabel(item.target)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="rounded-lg text-red-500 hover:text-red-600"
                      title="ลบ"
                      onClick={() => {
                        if (confirm('คุณแน่ใจหรือไม่ที่จะลบประกาศนี้?')) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}