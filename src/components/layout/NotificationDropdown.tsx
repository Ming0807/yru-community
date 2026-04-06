'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Check, Loader2, MessageSquare, Reply, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';
import type { Notification } from '@/types';
import { useRouter } from 'next/navigation';

export default function NotificationDropdown({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchNotifications = async (retries = 2) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!actor_id(display_name, avatar_url),
          post:posts!post_id(title),
          comment:comments!comment_id(content)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, 600));
          return fetchNotifications(retries - 1);
        }
        console.warn('Error fetching notifications:', error.message);
        return;
      }

      if (data) {
        setNotifications(data as unknown as Notification[]);
        setUnreadCount(data.filter((n: { is_read: boolean }) => !n.is_read).length);
      }
    } catch (error) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 600));
        return fetchNotifications(retries - 1);
      }
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
    router.push(`/post/${n.post_id}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-muted/50 transition-colors">
          <Bell className="h-5 w-5 opacity-80" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-yru-pink)] text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl overflow-hidden shadow-lg border-border/40">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/40">
          <h3 className="font-semibold text-sm">การแจ้งเตือน</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
              className="h-auto p-0 text-xs text-[var(--color-yru-pink)] hover:text-[var(--color-yru-pink-dark)] hover:bg-transparent"
            >
              <Check className="mr-1 h-3 w-3" />
              อ่านทั้งหมด
            </Button>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto w-full custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 border-b border-border/30 last:border-b-0 ${
                    !n.is_read ? 'bg-[var(--color-yru-pink)]/5' : ''
                  }`}
                >
                  <Avatar className="h-10 w-10 border shadow-sm">
                    <AvatarImage src={n.actor?.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] text-white text-xs">
                      {n.actor?.display_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1 overflow-hidden">
                    <p className="text-sm leading-snug">
                      <span className="font-semibold">{n.actor?.display_name}</span>{' '}
                      <span className="text-muted-foreground">
                        {n.type === 'COMMENT' ? 'แสดงความคิดเห็นในกระทู้' : 'ตอบกลับคอมเมนต์ของคุณในกระทู้'}
                      </span>{' '}
                      <span className="font-medium truncate block sm:inline">
                        "{n.post?.title}"
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1 italic">
                      {n.comment?.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-1">
                      {n.type === 'COMMENT' ? <MessageSquare className="w-3 h-3" /> : <Reply className="w-3 h-3" />}
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="h-2 w-2 rounded-full bg-[var(--color-yru-pink)] shrink-0 self-center" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center cursor-pointer">
          <Link href="/notifications" className="text-sm text-[var(--color-yru-pink)] font-medium py-2">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5 inline" />
            ดูการแจ้งเตือนทั้งหมด
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
