'use client';

import { useState } from 'react';
import { Bell, Plus, Send, Eye, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  sent: boolean;
  target: 'all' | 'specific';
}

const sampleAnnouncements: Announcement[] = [
  { id: '1', title: 'ยินดีต้อนรับนักศึกษาปีใหม่', content: 'ยินดีต้อนรับนักศึกษาชั้นปีที่ 1 ทุกคน...', created_at: '2024-01-15', sent: true, target: 'all' },
  { id: '2', title: 'ปิดระบบชั่วคราว', content: 'ระบบจะปิดเพื่อปรับปรุงในวันอาทิตย์...', created_at: '2024-01-10', sent: true, target: 'all' },
];

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(sampleAnnouncements);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });

  const handleSend = () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast.error('กรุณากรอกหัวข้อและเนื้อหา');
      return;
    }
    const newItem: Announcement = {
      id: Date.now().toString(),
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      created_at: new Date().toISOString(),
      sent: true,
      target: 'all',
    };
    setAnnouncements([newItem, ...announcements]);
    setNewAnnouncement({ title: '', content: '' });
    setIsDialogOpen(false);
    toast.success('ส่งประกาศสำเร็จ');
  };

  const handleDelete = (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบประกาศนี้?')) return;
    setAnnouncements(announcements.filter(a => a.id !== id));
    toast.success('ลบประกาศสำเร็จ');
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
            <p className="text-sm text-muted-foreground">ส่งแจ้งเตือน Push Notification หาผู้ใช้ทุกคน</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              สร้างประกาศใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
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
                  className="mt-1 rounded-xl min-h-[100px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                  ยกเลิก
                </Button>
                <Button onClick={handleSend} className="rounded-xl gap-2">
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
          <p className="text-2xl font-bold text-green-500">{announcements.filter(a => a.sent).length}</p>
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
          {announcements.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              ยังไม่มีประกาศ
            </div>
          ) : (
            announcements.map((item) => (
              <div key={item.id} className="p-4 hover:bg-muted/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{item.title}</h3>
                      {item.sent && <Badge className="bg-green-100 text-green-700">ส่งแล้ว</Badge>}
                      {item.target === 'all' && <Badge variant="outline">ทุกคน</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleDateString('th-TH')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button variant="ghost" size="icon-sm" className="rounded-lg" title="ดู">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="rounded-lg text-red-500 hover:text-red-600"
                      title="ลบ"
                      onClick={() => handleDelete(item.id)}
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