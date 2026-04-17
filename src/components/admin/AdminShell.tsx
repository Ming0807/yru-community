'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Shield, LayoutDashboard, Users, MessageSquare, ShieldAlert, Megaphone, BarChart3, Settings, ArrowLeft, ArrowRight, ChevronDown, Menu, Activity } from 'lucide-react';
import { AdminCommandPalette } from './AdminCommandPalette';
import { AdminNotifications } from './AdminNotifications';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
      { name: 'สถิติเหตุการณ์', href: '/admin/analytics/events' },
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
      { name: 'แพ็กเกจ', href: '/admin/packages' },
      { name: 'แคมเปญ', href: '/admin/campaigns' },
      { name: 'ประเมินราคา', href: '/admin/pricing-estimator' },
      { name: 'ประกาศระบบ', href: '/admin/announcements' },
      { name: 'Targeting Rules', href: '/admin/targeting' },
    ],
  },
  {
    title: 'รายงาน & วิเคราะห์',
    icon: BarChart3,
    items: [
      { name: 'รายงานรายได้', href: '/admin/revenue' },
      { name: 'วิเคราะห์ตามคณะ', href: '/admin/faculty' },
      { name: 'สถิติเหตุการณ์', href: '/admin/analytics/events' },
      { name: 'Cohort Analysis', href: '/admin/analytics/cohorts' },
      { name: 'Funnel Analysis', href: '/admin/analytics/funnel' },
      { name: 'Attribution Analysis', href: '/admin/analytics/attribution' },
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
    // Add default if nothing matches
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
    // Automatically uncollapse sidebar if it's collapsed and user clicked a group
    if (collapsed) {
      setCollapsed(false);
      setExpandedGroups(new Set([title]));
      return;
    }

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
    <div className="min-h-screen flex flex-col md:flex-row antialiased transition-colors duration-300">
      {/* ----------------- SIDEBAR (DESKTOP) ----------------- */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
          'bg-background border-r border-border/40 shadow-[1px_0_20px_rgba(0,0,0,0.02)]',
          collapsed ? 'w-20' : 'w-[280px]'
        )}
      >
        {/* Logo Area */}
        <div className="h-[72px] flex items-center px-5 flex-shrink-0 transition-all duration-300">
          <Link href="/admin" className={cn(
            'flex items-center gap-3.5 hover:opacity-85 transition-opacity',
            collapsed && 'justify-center w-full'
          )}>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-yru-pink)] to-rose-600 text-white shadow-lg shadow-rose-500/25 flex-shrink-0">
              <Shield className="w-5 h-5 fill-white/10" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[15px] leading-tight text-foreground truncate tracking-tight">Admin Center</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                  <Activity className="w-3 h-3 text-[var(--color-yru-pink)]" /> System Active
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 space-y-1.5 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent">
          {navGroups.map((group) => {
            const Icon = group.icon;
            const isExpanded = expandedGroups.has(group.title);
            const hasActive = group.items.some((item) => isActive(item.href));

            return (
              <div key={group.title} className="relative group/nav">
                {/* Main Group Button */}
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={cn(
                    'w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 text-left relative overflow-hidden',
                    hasActive || (!collapsed && isExpanded)
                      ? 'text-[var(--color-yru-pink)]'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    collapsed && 'justify-center mt-2'
                  )}
                >
                  {/* Subtle active background effect behind icon/text */}
                  {(hasActive || (!collapsed && isExpanded)) && (
                    <div className="absolute inset-0 bg-[var(--color-yru-pink)]/10 z-0 pointer-events-none" />
                  )}
                  
                  <Icon className={cn("w-[22px] h-[22px] flex-shrink-0 relative z-10", (hasActive || (!collapsed && isExpanded)) ? "stroke-[2.5px]" : "stroke-[2px]")} />
                  
                  {!collapsed && (
                    <>
                      <span className={cn("flex-1 text-[13.5px] relative z-10 tracking-[0.01em]", (hasActive || isExpanded) ? "font-semibold" : "font-medium")}>
                        {group.title}
                      </span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 opacity-50 relative z-10 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
                          !isExpanded && '-rotate-90'
                        )}
                      />
                    </>
                  )}
                </button>

                {/* Floating Tooltip for Collapsed Mode Nested inside button to be visible on hover */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 translate-x-2 px-3 py-2 bg-popover/95 backdrop-blur-sm text-popover-foreground text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:translate-x-3 whitespace-nowrap z-50 transition-all duration-200 border border-border/50">
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-[5px] border-transparent border-r-popover/95" />
                    {group.title}
                  </div>
                )}

                {/* Sub-items */}
                <div 
                  className={cn(
                    "grid transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                    !collapsed && isExpanded ? "grid-rows-[1fr] opacity-100 pt-1 pb-3" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      // Calculate counts/badges
                      const badgeValue = item.href === '/admin/reports' ? pendingReportsCount : item.badge;
                      
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'relative flex items-center justify-between px-4 py-[9px] ml-[18px] mr-1 rounded-lg text-[13px] transition-all duration-200 group/item leading-none',
                            active
                              ? 'text-[var(--color-yru-pink)] font-semibold bg-[var(--color-yru-pink)]/5'
                              : 'text-muted-foreground hover:text-foreground font-medium hover:bg-muted/40'
                          )}
                        >
                          {/* Active Indicator Left Border */}
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--color-yru-pink)] rounded-r-md shadow-[0_0_8px_var(--color-yru-pink)]" />
                          )}
                          {!active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[3px] bg-border/80 rounded-full transition-colors group-hover/item:bg-muted-foreground/40" />
                          )}

                          <span className={cn('pl-2.5', active && 'opacity-100')}>{item.name}</span>
                          
                          {badgeValue && Number(badgeValue) > 0 ? (
                            <Badge variant="default" className="h-5 px-1.5 text-[10px] min-w-[20px] flex justify-center bg-[var(--color-yru-pink)] text-white hover:bg-[var(--color-yru-pink)] border-none">
                              {Number(badgeValue) > 99 ? '99+' : badgeValue}
                            </Badge>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 bg-background border-t border-border/40 space-y-2.5 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'group/btn flex items-center justify-center gap-2.5 px-4 py-2.5 w-full text-[13px] font-semibold text-muted-foreground bg-muted/40 rounded-xl hover:bg-muted hover:text-foreground transition-all duration-300',
              collapsed && 'px-2'
            )}
            title={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
          >
            {collapsed ? (
               <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 transition-transform group-hover/btn:-translate-x-0.5" />
                <span>ย่อแถบเมนู</span>
              </>
            )}
          </button>
          
          <Link
            href="/"
            className={cn(
              'group/back flex items-center justify-center gap-2.5 px-4 py-2.5 w-full text-[13px] font-semibold text-muted-foreground bg-muted/40 rounded-xl hover:bg-muted hover:text-foreground transition-all duration-300',
              collapsed && 'px-2'
            )}
            title={collapsed ? "กลับสู่เว็บหลัก" : undefined}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover/back:-translate-x-0.5" />
            {!collapsed && <span>กลับสู่เว็บหลัก</span>}
          </Link>
        </div>
      </aside>

      {/* ----------------- MAIN WRAPPER ----------------- */}
      <div 
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] bg-[#FAFAFA] dark:bg-background',
          collapsed ? 'md:ml-20' : 'md:ml-[280px]'
        )}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-[72px] bg-background/80 backdrop-blur-2xl border-b border-border/40 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm">
          
          {/* Mobile Menu Trigger & Logo */}
          <div className="md:hidden flex items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetContent side="left" className="w-[85%] max-w-[320px] p-0 border-r-0 flex flex-col bg-background">
                <SheetHeader className="h-[72px] flex flex-row items-center gap-3.5 px-5 border-b border-border/40 text-left space-y-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-yru-pink)] to-rose-600 text-white shadow-lg shadow-rose-500/25">
                      <Shield className="w-5 h-5 fill-white/10" />
                    </div>
                    <div className="flex flex-col">
                      <SheetTitle className="font-bold text-[15px] leading-tight m-0">Admin Center</SheetTitle>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                        <Activity className="w-3 h-3 text-[var(--color-yru-pink)]" /> System Active
                      </span>
                    </div>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto px-4 py-5 scrollbar-none space-y-2">
                  {navGroups.map((group) => {
                    const Icon = group.icon;
                    const isExpanded = expandedGroups.has(group.title);
                    const hasActive = group.items.some((item) => isActive(item.href));
                    
                    return (
                      <div key={group.title} className="space-y-1">
                        <button
                          onClick={() => toggleGroup(group.title)}
                          className={cn(
                            "w-full flex items-center gap-3.5 px-3 py-3 rounded-xl transition-colors",
                            hasActive || isExpanded ? "bg-[var(--color-yru-pink)]/5" : "hover:bg-muted/50"
                          )}
                        >
                          <Icon className={cn("w-[22px] h-[22px]", hasActive || isExpanded ? "text-[var(--color-yru-pink)] stroke-[2.5px]" : "text-muted-foreground stroke-[2px]")} />
                          <span className={cn("flex-1 text-left text-[14px]", hasActive || isExpanded ? "font-semibold text-foreground pointer-events-none" : "font-medium text-muted-foreground")}>{group.title}</span>
                          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-300', isExpanded ? 'rotate-180' : '')} />
                        </button>
                        
                        <div className={cn(
                          "grid transition-all duration-300 ease-in-out",
                          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        )}>
                          <div className="overflow-hidden">
                            <div className="pl-11 pr-2 py-1 space-y-1">
                              {group.items.map((item) => {
                                const active = isActive(item.href);
                                const badgeValue = item.href === '/admin/reports' ? pendingReportsCount : item.badge;
                                
                                return (
                                  <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                      'flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] transition-colors',
                                      active
                                        ? 'bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)] font-bold'
                                        : 'text-muted-foreground font-medium hover:bg-muted hover:text-foreground'
                                    )}
                                  >
                                    <span>{item.name}</span>
                                    {badgeValue && Number(badgeValue) > 0 ? (
                                      <Badge variant="default" className="h-[18px] px-1.5 text-[9px] min-w-[18px] flex justify-center bg-[var(--color-yru-pink)] text-white border-none">
                                        {Number(badgeValue) > 99 ? '99+' : badgeValue}
                                      </Badge>
                                    ) : null}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-foreground transition-colors hover:bg-muted/80 focus:bg-muted focus:ring-2 focus:ring-muted"
              aria-label="Open menu"
            >
              <Menu className="w-[22px] h-[22px]" />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="font-bold text-[16px] tracking-tight text-foreground">Admin Center</span>
            </div>
          </div>

          {/* Breadcrumbs (Desktop) */}
          <div className="hidden md:flex items-center gap-2.5 text-[13px] text-muted-foreground flex-1 max-w-xl">
            {currentGroup && mounted && (
              <>
                <div className="flex items-center gap-2 text-foreground/70 justify-center">
                  <currentGroup.icon className="w-4 h-4 opacity-75" strokeWidth={2.5}/>
                  <span className="font-medium tracking-wide">{currentGroup.title}</span>
                </div>
                <span className="text-muted-foreground/30 font-medium">/</span>
                <span className="font-semibold text-foreground border-b-2 border-[var(--color-yru-pink)]/30 pb-0.5">
                  {currentGroup.items.find((i) => isActive(i.href))?.name}
                </span>
              </>
            )}
          </div>

          {/* Right Section: Command Palette & Controls */}
          <div className="flex items-center justify-end gap-3 sm:gap-5 flex-1 w-full max-w-none md:max-w-none">
            <div className="flex-1 max-w-[280px] lg:max-w-[400px] flex justify-end">
             <AdminCommandPalette />
            </div>
            
            <div className="flex items-center gap-2 pl-2 sm:pl-4 border-l border-border/50">
              <ThemeToggle />
              <AdminNotifications />
            </div>
          </div>
        </header>

        {/* ----------------- PAGE CONTENT ----------------- */}
        <main className="flex-1 overflow-y-auto relative">
          <div className="p-4 sm:p-6 lg:p-8 mx-auto max-w-[1400px] relative z-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}