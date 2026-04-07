'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile } from '@/types';

interface ExportDataProps {
  user: Profile;
}

export default function ExportData({ user }: ExportDataProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const supabase = createClient();

      // Fetch all user data in parallel
      const [
        { data: posts },
        { data: comments },
        { data: messages },
        { data: bookmarks },
        { data: follows },
        { data: notifications },
        { data: votes },
        { data: reactions },
      ] = await Promise.all([
        supabase.from('posts').select('*').eq('author_id', user.id).order('created_at', { ascending: true }),
        supabase.from('comments').select('*').eq('author_id', user.id).order('created_at', { ascending: true }),
        supabase.from('messages').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: true }),
        supabase.from('bookmarks').select('*, post:posts(id, title)').eq('user_id', user.id),
        supabase.from('follows').select('*').or(`follower_id.eq.${user.id},following_id.eq.${user.id}`),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('votes').select('*, post:posts(id, title)').eq('user_id', user.id),
        supabase.from('post_reactions').select('*, post:posts(id, title)').eq('user_id', user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user: {
          id: user.id,
          display_name: user.display_name,
          email: user.email,
          bio: user.bio,
          faculty: user.faculty,
          major: user.major,
          created_at: user.created_at,
        },
        posts: posts || [],
        comments: comments || [],
        messages: messages || [],
        bookmarks: bookmarks || [],
        follows: follows || [],
        notifications: notifications || [],
        votes: votes || [],
        reactions: reactions || [],
      };

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `yru-community-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('ส่งออกข้อมูลสำเร็จ');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('ไม่สามารถส่งออกข้อมูลได้');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">ส่งออกข้อมูลของฉัน</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          ดาวน์โหลดข้อมูลทั้งหมดของคุณ (โพสต์, คอมเมนต์, ข้อความ) ตามสิทธิ์ PDPA
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={exporting}
        className="gap-2 rounded-xl"
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {exporting ? 'กำลังส่งออก...' : 'ส่งออกข้อมูล'}
      </Button>
    </div>
  );
}
