'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, LayoutDashboard, Users, MessageSquare, Flag, FolderTree, ArrowLeft, Megaphone, BarChart3, ClipboardList } from 'lucide-react';
import { AdminCommandPalette } from './AdminCommandPalette';
import { AdminNotifications } from './AdminNotifications';

const navLinks = [
  { name: 'ภาพรวม', href: '/admin', icon: LayoutDashboard },
  { name: 'โฆษณา', href: '/admin/ads', icon: Megaphone },
  { name: 'จัดการผู้ใช้', href: '/admin/users', icon: Users },
  { name: 'จัดการเนื้อหา', href: '/admin/content', icon: MessageSquare },
  { name: 'จัดการรายงาน', href: '/admin/reports', icon: Flag },
  { name: 'หมวดหมู่', href: '/admin/categories', icon: FolderTree },
  { name: 'สถิติพฤติกรรมผู้ใช้', href: '/admin/analytics', icon: BarChart3 },
  { name: 'ประวัติการทำงาน', href: '/admin/audit', icon: ClipboardList },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col md:flex-row">
      {/* 🔴 Sidebar (Desktop Only) */}
      <aside className="hidden md:flex w-64 bg-background border-r border-border/50 flex-col min-h-screen sticky top-0 z-40">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <Link href="/admin" className="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white shadow-sm shadow-red-500/20">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <span>Admin Center</span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3 px-3">
            เมนูหลัก
          </div>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)] font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 transition-colors ${active ? 'text-[var(--color-yru-pink)]' : 'text-muted-foreground group-hover:text-foreground'}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-sm">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-4 py-2.5 w-full text-sm font-medium text-muted-foreground bg-muted/40 rounded-xl hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับสู่เว็บหลัก
          </Link>
        </div>
      </aside>

      {/* 🔴 Main Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 🔴 Top Header Bar (Desktop & Mobile) */}
        <header className="sticky top-0 z-50 h-16 bg-background/90 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Mobile Logo area */}
          <div className="md:hidden flex items-center gap-2 font-bold text-lg">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-red-500 to-red-600 text-white">
              <Shield className="w-4 h-4" />
            </div>
            <span>Admin</span>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-xl pr-8">
             <AdminCommandPalette />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="md:hidden">
              <AdminCommandPalette />
            </div>
            <AdminNotifications />
            
            <div className="hidden md:block w-px h-6 bg-border/60 mx-1"></div>
            
            {/* คุณสามารถเพิ่ม User Avatar ตรงนี้ได้ในอนาคต */}
          </div>
        </header>

        {/* 🔴 Mobile Navigation Menu (Scrollable horizontal) */}
        <div className="md:hidden flex overflow-x-auto bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3 gap-2 text-sm sticky top-16 z-40 scrollbar-none">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 border ${
                  active
                    ? 'bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)] border-[var(--color-yru-pink)]/20 font-semibold shadow-sm'
                    : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* 🔴 Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}