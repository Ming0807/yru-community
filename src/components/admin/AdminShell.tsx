'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, LayoutDashboard, Users, UserCog, Award, MessageSquare, MessageCircle, Tags, FolderTree, Flag, ClipboardList, ShieldAlert, Megaphone, Bell, Settings, Globe, ArrowLeft, ArrowRight, ChevronDown, BarChart3 } from 'lucide-react';
import { AdminCommandPalette } from './AdminCommandPalette';
import { AdminNotifications } from './AdminNotifications';
import { cn } from '@/lib/utils';

type NavGroup = {
  title: string;
  icon: React.ElementType;
  items: { name: string; href: string; badge?: string }[];
};

const navGroups: NavGroup[] = [
  {
    title: 'ภาพรวม',
    icon: LayoutDashboard,
    items: [
      { name: 'Dashboard', href: '/admin' },
      { name: 'สถิติการใช้งาน', href: '/admin/analytics' },
    ],
  },
  {
    title: 'การจัดการสมาชิก',
    icon: Users,
    items: [
      { name: 'จัดการผู้ใช้', href: '/admin/users' },
      { name: 'บทบาท & สิทธิ์', href: '/admin/roles' },
      { name: 'ระบบเหรียญตรา', href: '/admin/badges' },
    ],
  },
  {
    title: 'การจัดการเนื้อหา',
    icon: MessageSquare,
    items: [
      { name: 'จัดการกระทู้', href: '/admin/content' },
      { name: 'จัดการความคิดเห็น', href: '/admin/comments' },
      { name: 'หมวดหมู่ & แท็ก', href: '/admin/categories' },
    ],
  },
  {
    title: 'ความปลอดภัย & ตรวจสอบ',
    icon: ShieldAlert,
    items: [
      { name: 'รายงานปัญหา', href: '/admin/reports', badge: 'new' },
      { name: 'ประวัติการทำงาน', href: '/admin/audit' },
      { name: 'ตัวกรองคำหยาบ', href: '/admin/word-filter' },
    ],
  },
  {
    title: 'การสื่อสาร & โฆษณา',
    icon: Megaphone,
    items: [
      { name: 'จัดการโฆษณา', href: '/admin/ads' },
      { name: 'ประกาศระบบ', href: '/admin/announcements' },
    ],
  },
  {
    title: 'การตั้งค่าระบบ',
    icon: Settings,
    items: [
      { name: 'ตั้งค่าเว็บไซต์', href: '/admin/settings' },
    ],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    navGroups.forEach((group) => {
      const hasActive = group.items.some((item) => {
        if (item.href === '/admin') return pathname === '/admin';
        return pathname.startsWith(item.href);
      });
      if (hasActive) initial.add(group.title);
    });
    if (initial.size === 0) initial.add('ภาพรวม');
    return initial;
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const currentGroup = navGroups.find((g) =>
    g.items.some((item) => isActive(item.href))
  );

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside
        className={cn(
          'hidden md:flex bg-background border-r border-border/50 flex-col min-h-screen sticky top-0 z-40 transition-all duration-300',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-border/50">
          <Link href="/admin" className="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white shadow-sm shadow-red-500/20 flex-shrink-0">
              <Shield className="w-4.5 h-4.5" />
            </div>
            {!collapsed && <span>Admin Center</span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {navGroups.map((group) => {
            const Icon = group.icon;
            const isExpanded = expandedGroups.has(group.title);
            const hasActive = group.items.some((item) => isActive(item.href));

            return (
              <div key={group.title} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left',
                    hasActive || isExpanded
                      ? 'bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)]'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    collapsed && 'justify-center'
                  )}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 font-medium text-sm">{group.title}</span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 transition-transform',
                          !isExpanded && '-rotate-90'
                        )}
                      />
                    </>
                  )}
                </button>

                {!collapsed && isExpanded && (
                  <div className="ml-4 pl-3 border-l border-border/40 space-y-1">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200',
                            active
                              ? 'bg-[var(--color-yru-pink)]/15 text-[var(--color-yru-pink)] font-medium'
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                          )}
                        >
                          <span>{item.name}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-yru-pink)] text-white rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-border/50 bg-background/50 backdrop-blur-sm space-y-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-2.5 w-full text-sm font-medium text-muted-foreground bg-muted/40 rounded-xl hover:bg-muted hover:text-foreground transition-all duration-200',
              collapsed && 'px-2'
            )}
          >
            {collapsed ? (
              <ArrowRight className="w-4 h-4" />
            ) : (
              <>
                <ArrowLeft className="w-4 h-4" />
                <span>ย่อ</span>
              </>
            )}
          </button>

          <Link
            href="/"
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-2.5 w-full text-sm font-medium text-muted-foreground bg-muted/40 rounded-xl hover:bg-muted hover:text-foreground transition-all duration-200',
              collapsed && 'px-2'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            {!collapsed && <span>กลับสู่เว็บหลัก</span>}
          </Link>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-50 h-16 bg-background/90 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center gap-2 font-bold text-lg">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-red-500 to-red-600 text-white">
              <Shield className="w-4 h-4" />
            </div>
            <span>Admin</span>
          </div>

          {/* Breadcrumb (Desktop) */}
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground flex-1 max-w-xl">
            {currentGroup && (
              <>
                <span className="flex items-center gap-1.5">
                  <currentGroup.icon className="w-4 h-4" />
                  {currentGroup.title}
                </span>
                <span>/</span>
                <span className="text-foreground font-medium">
                  {currentGroup.items.find((i) => isActive(i.href))?.name}
                </span>
              </>
            )}
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md pr-8">
            <AdminCommandPalette />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="md:hidden">
              <AdminCommandPalette />
            </div>
            <AdminNotifications />
            <div className="hidden md:block w-px h-6 bg-border/60 mx-1"></div>
          </div>
        </header>

        {/* Mobile Navigation */}
        <div className="md:hidden flex overflow-x-auto bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3 gap-2 text-sm sticky top-16 z-40 scrollbar-none">
          {navGroups.flatMap((group) =>
            group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 border ${
                    active
                      ? 'bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)] border-[var(--color-yru-pink)]/20 font-semibold shadow-sm'
                      : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })
          )}
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}