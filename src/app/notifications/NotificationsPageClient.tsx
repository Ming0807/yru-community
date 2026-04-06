'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import NotificationItem from '@/components/notifications/NotificationItem';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { useUser } from '@/components/UserProvider';
import { toast } from 'sonner';
import type { Notification } from '@/types';

const LIMIT = 20;

export default function NotificationsPageClient() {
  const { user } = useUser();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = useCallback(async (reset = false) => {
    if (!user) return;

    if (reset) {
      setLoading(true);
      setNotifications([]);
      setPage(0);
      setHasMore(true);
    } else {
      setFetchingMore(true);
    }

    const currentPage = reset ? 0 : page;

    let query = supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey(id, display_name, avatar_url),
        post:posts(id, title)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(currentPage * LIMIT, (currentPage + 1) * LIMIT - 1);

    if (filter === 'unread') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('ไม่สามารถโหลดการแจ้งเตือนได้');
      if (reset) setLoading(false);
      else setFetchingMore(false);
      return;
    }

    const items = data || [];
    if (reset) {
      setNotifications(items);
    } else {
      setNotifications((prev) => [...prev, ...items]);
    }

    setHasMore(items.length === LIMIT);
    setPage(currentPage + 1);
    if (reset) setLoading(false);
    else setFetchingMore(false);
  }, [user, filter, page, supabase]);

  useEffect(() => {
    fetchNotifications(true);
  }, [filter, user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: any }) => {
          const newNotif = payload.new as any;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      toast.error('ไม่สามารถทำเครื่องหมายได้');
      return;
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success('ทำเครื่องหมายอ่านทั้งหมดแล้ว');
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('ไม่สามารถลบได้');
      return;
    }

    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !fetchingMore && !loading) {
          fetchNotifications(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, fetchingMore, loading, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--color-yru-pink)]" />
            <h1 className="text-xl font-bold">การแจ้งเตือน</h1>
            {unreadCount > 0 && (
              <span className="flex h-5 items-center justify-center rounded-full bg-[var(--color-yru-pink)] px-2 text-xs font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="gap-1 text-xs"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              อ่านทั้งหมด
            </Button>
          )}
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="unread">ยังไม่อ่าน ({unreadCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        {notifications.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">ไม่มีการแจ้งเตือน</p>
            <p className="text-sm text-muted-foreground/70">
              {filter === 'unread'
                ? 'คุณอ่านการแจ้งเตือนทั้งหมดแล้ว'
                : 'การแจ้งเตือนจะปรากฏที่นี่เมื่อมีกิจกรรม'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => markAsRead(notification.id)}
                onDelete={() => deleteNotification(notification.id)}
              />
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <div ref={loadMoreRef} className="h-1" />

        {fetchingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!hasMore && notifications.length > 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">
            แสดงการแจ้งเตือนทั้งหมดแล้ว
          </p>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
