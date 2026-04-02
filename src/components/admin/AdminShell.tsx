'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, LayoutDashboard, Users, MessageSquare, Flag, FolderTree, ArrowLeft, Megaphone, BarChart3, ClipboardList } from 'lucide-react';

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
    <div className="min-h-screen bg-muted/30 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-background border-r border-border/60 flex-col min-h-screen sticky top-0">
        <div className="p-6 border-b border-border/60">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-lg text-foreground">
            <div className="p-1.5 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <Shield className="w-5 h-5" />
            </div>
            Admin Dashboard
          </Link>
        </div>
        <nav className="p-4 flex-1 space-y-1 text-sm font-medium text-muted-foreground">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  active
                    ? 'bg-(--color-yru-pink)/10 text-(--color-yru-pink) font-semibold'
                    : 'hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/60">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับสู่เว็บหลัก
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-background border-b border-border/60 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Shield className="w-5 h-5 text-red-500" />
          Admin Panel
        </div>
        <Link href="/" className="text-sm text-primary">กลับเว็บหลัก</Link>
      </div>
      <div className="md:hidden flex overflow-x-auto bg-background border-b border-border/60 px-4 py-2 gap-2 text-sm">
        {navLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                active
                  ? 'bg-(--color-yru-pink)/10 text-(--color-yru-pink) font-semibold'
                  : 'bg-muted'
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
