'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, FileText, MessageSquare, UserPlus, AlertTriangle, Clock, Trash2, Eye, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ... (Interface และ mockNotifications เหมือนเดิม)
interface Notification {
  id: string;
  type: 'report' | 'user' | 'post' | 'comment' | 'system';
  title: string;
  description: string;
  time: string;
  read: boolean;
  link?: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'report',
    title: 'รายงานใหม่',
    description: 'มีรายงานเนื้อหาที่ไม่เหมาะสม 5 รายการ',
    time: '5 นาที',
    read: false,
    link: '/admin/reports',
  },
  {
    id: '2',
    type: 'user',
    title: 'ผู้ใช้ใหม่',
    description: 'สมัครสมาชิกใหม่ 12 คน',
    time: '15 นาที',
    read: false,
    link: '/admin/users',
  },
  {
    id: '3',
    type: 'post',
    title: 'กระทู้ใหม่',
    description: 'มีกระทู้ใหม่ 8 กระทู้รอตรวจสอบ',
    time: '1 ชั่วโมง',
    read: true,
    link: '/admin/content',
  },
  {
    id: '4',
    type: 'comment',
    title: 'ความคิดเห็นใหม่',
    description: 'มีความคิดเห็นรออนุมัติ 23 รายการ',
    time: '2 ชั่วโมง',
    read: true,
    link: '/admin/content',
  },
];

// ปรับสีให้ดูซอฟต์และพรีเมียมขึ้น
function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'report':
      return { icon: AlertTriangle, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
    case 'user':
      return { icon: UserPlus, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' };
    case 'post':
      return { icon: FileText, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    case 'comment':
      return { icon: MessageSquare, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' };
    case 'system':
      return { icon: Bell, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' };
  }
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null); // สำหรับคลิกนอกพื้นที่เพื่อปิด

  useEffect(() => {
    setNotifications(mockNotifications);
  }, []);

  // ปิด Dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setOpen(false);
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
      setOpen(false);
    }
  }, [router, markAsRead]);

  return (
    <div className="relative" aria-label="การแจ้งเตือน" ref={dropdownRef}>
      {/* 🔴 Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm',
          'hover:border-[var(--color-yru-pink)] hover:text-[var(--color-yru-pink)] transition-all duration-200',
          open && 'border-[var(--color-yru-pink)] text-[var(--color-yru-pink)] shadow-sm bg-muted/50'
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className={cn("h-5 w-5 transition-transform duration-300", open && "scale-110")} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 🔴 Dropdown Content */}
      {open && (
        // ✅ โค้ดใหม่: มือถือใช้ fixed จัดให้อยู่ตรงกลางจอ / คอมพิวเตอร์ใช้ absolute ชิดขวา
        <div className={cn(
          "fixed left-4 right-4 top-20 z-50", // สำหรับมือถือ (ห่างซ้ายขวาฝั่งละ 16px)
          "sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96", // สำหรับจอใหญ่ (Tablet/Desktop)
          "animate-in fade-in slide-in-from-top-2 duration-200"
        )}>
          <div className="rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">การแจ้งเตือน</h3>
                {unreadCount > 0 && (
                  <span className="flex h-5 items-center rounded-full bg-muted px-2 text-[10px] font-medium text-muted-foreground">
                    ใหม่ {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="group flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Check className="h-3 w-3 group-hover:text-emerald-500" />
                  อ่านทั้งหมด
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <div className="rounded-full bg-muted/50 p-3 mb-3">
                    <Bell className="h-6 w-6 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">ไม่มีการแจ้งเตือน</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">คุณจัดการทุกอย่างเรียบร้อยแล้ว</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {notifications.map((notification) => {
                    const { icon: Icon, color } = getNotificationIcon(notification.type);
                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          'group flex w-full items-start gap-4 p-4 text-left transition-all duration-200',
                          'hover:bg-muted/40 focus:outline-none focus:bg-muted/40',
                          !notification.read ? 'bg-muted/10' : 'opacity-70 hover:opacity-100'
                        )}
                      >
                        <div className={cn('shrink-0 rounded-xl p-2.5 border', color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex justify-between items-start mb-1">
                            <p className={cn(
                              "text-sm font-medium truncate pr-4",
                              !notification.read ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="h-2 w-2 mt-1.5 shrink-0 rounded-full bg-[var(--color-yru-pink)] shadow-[0_0_8px_var(--color-yru-pink)]" />
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {notification.description}
                          </p>
                          
                          <p className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/80">
                            <Clock className="h-3 w-3" />
                            {notification.time}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="grid grid-cols-2 divide-x divide-border/50 border-t border-border/50 bg-muted/10">
                <button
                  onClick={clearAll}
                  className="flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ล้างทั้งหมด
                </button>
                <button
                  onClick={() => { router.push('/admin/notifications'); setOpen(false); }}
                  className="flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-foreground hover:text-[var(--color-yru-pink)] hover:bg-[var(--color-yru-pink)]/5 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  ดูทั้งหมด
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}