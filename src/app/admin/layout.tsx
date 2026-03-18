import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Shield, LayoutDashboard, Users, MessageSquare, Flag, FolderTree, ArrowLeft } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify Admin Role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/');
  }

  const navLinks = [
    { name: 'ภาพรวม', href: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'จัดการผู้ใช้', href: '/admin/users', icon: <Users className="w-4 h-4" /> },
    { name: 'จัดการเนื้อหา', href: '/admin/content', icon: <MessageSquare className="w-4 h-4" /> },
    { name: 'จัดการรายงาน', href: '/admin/reports', icon: <Flag className="w-4 h-4" /> },
    { name: 'หมวดหมู่', href: '/admin/categories', icon: <FolderTree className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-background border-r border-border/60 flex flex-col hidden md:flex min-h-screen sticky top-0">
        <div className="p-6 border-b border-border/60">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-lg text-foreground">
            <div className="p-1.5 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <Shield className="w-5 h-5" />
            </div>
            Admin Dashboard
          </Link>
        </div>
        <nav className="p-4 flex-1 space-y-1 text-sm font-medium text-muted-foreground">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted hover:text-foreground transition-colors"
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
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

      {/* Mobile Admin Nav (Simple bottom/top bar or just rely on desktop for now, but good to have) */}
      <div className="md:hidden bg-background border-b border-border/60 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Shield className="w-5 h-5 text-red-500" />
          Admin Panel
        </div>
        <Link href="/" className="text-sm text-primary">กลับเว็บหลัก</Link>
      </div>
      <div className="md:hidden flex overflow-x-auto bg-background border-b border-border/60 px-4 py-2 gap-2 text-sm">
        {navLinks.map((link) => (
          <Link
             key={link.href}
             href={link.href}
             className="px-3 py-1.5 rounded-full bg-muted whitespace-nowrap"
          >
             {link.name}
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
