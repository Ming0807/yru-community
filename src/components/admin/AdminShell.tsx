'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Shield, LayoutDashboard, Users, UserCog, Award, MessageSquare, MessageCircle, Tags, FolderTree, Flag, ClipboardList, ShieldAlert, Megaphone, Bell, Settings, Globe, ArrowLeft, ArrowRight, ChevronDown, BarChart3, Menu } from 'lucide-react';
import { AdminCommandPalette } from './AdminCommandPalette';
import { AdminNotifications } from './AdminNotifications';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
      { name: 'รายงานปัญหา', href: '/admin/reports' },
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['ภาพรวม']));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initial = new Set<string>();
    navGroups.forEach((group) => {
      const hasActive = group.items.some((item) => {
        if (item.href === '/admin') return pathname === '/admin';
        return pathname.startsWith(item.href);
      });
      if (hasActive) initial.add(group.title);
    });
    if (initial.size === 0) initial.add('ภาพรวม');
    setExpandedGroups(initial);
  }, [pathname]);

  const { data: pendingReportsCount } = useQuery({
    queryKey: ['admin', 'pendingReportsCount'],
    queryFn: async () => {
      const res = await fetch('/api/admin/reports?status=pending&count=true');
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count ?? 0;
    },
    refetchInterval: 60000,
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
      {/* Sidebar - Fixed position */}
      <aside
        className={cn(
          'hidden md:flex bg-background border-r border-border/50 flex-col fixed top-0 left-0 h-screen z-40 transition-all duration-300',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-border/50 flex-shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white shadow-sm shadow-red-500/20 flex-shrink-0">
              <Shield className="w-4.5 h-4.5" />
            </div>
            {!collapsed && <span>Admin Center</span>}
          </Link>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-border/60 scrollbar-track-transparent hover:scrollbar-thumb-border">
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
            {item.href === '/admin/reports' && pendingReportsCount && pendingReportsCount > 0 ? (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-yru-pink)] text-white rounded-full">
                {pendingReportsCount > 99 ? '99+' : pendingReportsCount}
              </span>
            ) : item.badge ? (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-yru-pink)] text-white rounded-full">
                {item.badge}
              </span>
            ) : null}
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

      {/* Main Wrapper - with margin for fixed sidebar */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        collapsed ? 'md:ml-20' : 'md:ml-64'
      )}>
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
        <ThemeToggle />
        <div className="md:hidden">
          <AdminCommandPalette />
        </div>
        <AdminNotifications />
        <div className="hidden md:block w-px h-6 bg-border/60 mx-1"></div>
      </div>
        </header>

        {/* Mobile Navigation - Header with Hamburger */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-red-500 to-red-600 text-white">
              <Shield className="w-4 h-4" />
            </div>
            <span>Admin</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu Dialog */}
        <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>เมนูแอดมิน</DialogTitle>
              <DialogDescription>เลือกหมวดหมู่เมนูที่ต้องการ</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto py-2">
              {navGroups.map((group) => {
                const Icon = group.icon;
                const isExpanded = expandedGroups.has(group.title);
                
                return (
                  <div key={group.title} className="space-y-1">
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors"
                    >
                      <Icon className="w-5 h-5 text-[var(--color-yru-pink)]" />
                      <span className="flex-1 font-medium">{group.title}</span>
                      <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                    
                    {isExpanded && (
                      <div className="pl-9 space-y-1">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              'block px-3 py-2 rounded-lg text-sm transition-colors',
                              isActive(item.href)
                                ? 'bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)] font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

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