'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import {
  Search,
  LayoutDashboard,
  Users,
  MessageSquare,
  Flag,
  FolderTree,
  BarChart3,
  Megaphone,
  ClipboardList,
  UserPlus,
  FileText,
  Plus,
  LogOut,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  name: string;
  shortcut?: string;
  icon: React.ElementType;
  action: () => void;
  section: string;
}

export function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const navigate = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
  }, [router]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    setOpen(false);
  }, [theme, setTheme]);

  const commands = useMemo<CommandItem[]>(() => [
    { id: 'dashboard', name: 'ภาพรวมระบบ', shortcut: 'G D', icon: LayoutDashboard, action: () => navigate('/admin'), section: 'เมนูหลัก' },
    { id: 'ads', name: 'จัดการโฆษณา', shortcut: 'G A', icon: Megaphone, action: () => navigate('/admin/ads'), section: 'เมนูหลัก' },
    { id: 'users', name: 'จัดการผู้ใช้', shortcut: 'G U', icon: Users, action: () => navigate('/admin/users'), section: 'เมนูหลัก' },
    { id: 'content', name: 'จัดการเนื้อหา', shortcut: 'G C', icon: MessageSquare, action: () => navigate('/admin/content'), section: 'เมนูหลัก' },
    { id: 'reports', name: 'จัดการรายงาน', shortcut: 'G R', icon: Flag, action: () => navigate('/admin/reports'), section: 'เมนูหลัก' },
    { id: 'categories', name: 'จัดการหมวดหมู่', shortcut: 'G G', icon: FolderTree, action: () => navigate('/admin/categories'), section: 'เมนูหลัก' },
    { id: 'analytics', name: 'สถิติพฤติกรรมผู้ใช้', shortcut: 'G S', icon: BarChart3, action: () => navigate('/admin/analytics'), section: 'เมนูหลัก' },
    { id: 'audit', name: 'ประวัติการทำงาน', shortcut: 'G L', icon: ClipboardList, action: () => navigate('/admin/audit'), section: 'เมนูหลัก' },
    { id: 'add-user', name: 'เพิ่มผู้ใช้ใหม่', icon: UserPlus, action: () => { navigate('/admin/users'); setOpen(false); }, section: 'การดำเนินการ' },
    { id: 'add-post', name: 'เพิ่มกระทู้ใหม่', icon: FileText, action: () => { navigate('/admin/content'); setOpen(false); }, section: 'การดำเนินการ' },
    { id: 'add-category', name: 'เพิ่มหมวดหมู่ใหม่', icon: Plus, action: () => { navigate('/admin/categories'); setOpen(false); }, section: 'การดำเนินการ' },
    {
      id: 'theme',
      name: theme === 'dark' ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด',
      shortcut: '⇧ T', // 🟢 เปลี่ยนจาก Cmd+T เป็น Shift+T ป้องกันชนกับเบราว์เซอร์
      icon: theme === 'dark' ? Sun : Moon,
      action: toggleTheme,
      section: 'การตั้งค่า',
    },
    { id: 'home', name: 'กลับสู่เว็บหลัก', icon: LogOut, action: () => { navigate('/'); setOpen(false); }, section: 'การตั้งค่า' },
  ], [navigate, toggleTheme, theme]);

  // 🟢 พระเอกของการแก้ปัญหา Keyboard Shortcuts อยู่ตรงนี้ครับ
  useEffect(() => {
    let lastKey = '';
    let timeoutId: NodeJS.Timeout;

    const down = (e: KeyboardEvent) => {
      // 1. จัดการ Ctrl+K / Cmd+K (ใช้ toLowerCase() ป้องกันปัญหา Caps Lock)
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); // 🟢 สั่งห้ามเบราว์เซอร์แย่งไปใช้ที่ URL bar เด็ดขาด
        setOpen((open) => !open);
        return;
      }

      // 2. ถ้าหน้าต่าง Command Palette เปิดอยู่ ให้หยุดทำงานส่วนอื่น (ป้องกันกดลั่น)
      if (open) return;

      // 3. 🟢 ป้องกันบั๊ก: ห้ามคีย์ลัดทำงานเวลาผู้ใช้พิมพ์ข้อมูลอยู่ในช่อง Input/Textarea อื่นๆ
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // 4. คีย์ลัดสลับ Theme (Shift + T)
      if (key === 't' && e.shiftKey) {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // 5. 🟢 คีย์ลัดแบบต่อเนื่อง (Sequence Shortcuts) สไตล์ GitHub (G แล้วตามด้วยตัวอักษร)
      if (lastKey === 'g') {
        switch (key) {
          case 'd': navigate('/admin'); break;
          case 'a': navigate('/admin/ads'); break;
          case 'u': navigate('/admin/users'); break;
          case 'c': navigate('/admin/content'); break;
          case 'r': navigate('/admin/reports'); break;
          case 'g': navigate('/admin/categories'); break;
          case 's': navigate('/admin/analytics'); break;
          case 'l': navigate('/admin/audit'); break;
        }
        lastKey = ''; // ทำงานเสร็จ รีเซ็ตกลับ
      } else if (key === 'g') {
        lastKey = 'g';
        // ถ้ากด 'g' แล้วไม่กดตัวอะไรต่อภายใน 1 วินาที ให้ยกเลิก (ป้องกันกดค้าง)
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          lastKey = '';
        }, 1000);
      }
    };

    document.addEventListener('keydown', down);
    return () => {
      document.removeEventListener('keydown', down);
      clearTimeout(timeoutId);
    };
  }, [navigate, toggleTheme, open]); // ใส่ dependencies ให้ครบ

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    commands.forEach((cmd) => {
      if (!groups[cmd.section]) groups[cmd.section] = [];
      groups[cmd.section].push(cmd);
    });
    return groups;
  }, [commands]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground',
          'hover:border-[var(--color-yru-pink)]/50 hover:bg-muted/50 transition-colors',
          'md:hidden w-full justify-start'
        )}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">ค้นหา...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <button
        onClick={() => setOpen(true)}
        className={cn(
          'hidden md:flex items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-sm text-muted-foreground',
          'hover:border-[var(--color-yru-pink)]/50 hover:bg-muted transition-colors cursor-pointer',
          'h-9 w-48 lg:w-64'
        )}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1">ค้นหา...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="เมนูค้นหา"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]',
          'max-h-[60vh] sm:max-h-[70vh]'
        )}
      >
        <DialogTitle className="sr-only">ค้นหาเมนูจัดการระบบ</DialogTitle>
        <DialogDescription className="sr-only">
          พิมพ์ค้นหาเพื่อนำทางไปยังหน้าต่างๆ ในแผงควบคุมระบบ
        </DialogDescription>
        
        <div className="flex items-center border-b border-border/60 px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Command.Input
            placeholder="พิมพ์เพื่อค้นหาเมนู, ผู้ใช้, กระทู้..."
            className="flex h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={() => setOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2 scroll-py-1 sm:max-h-[400px]">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            ไม่พบผลลัพธ์
          </Command.Empty>

          {Object.entries(groupedCommands).map(([section, items]) => (
            <Command.Group
              key={section}
              heading={section}
              className="mb-2 px-2 pt-2 text-xs font-medium text-muted-foreground first:pt-0"
            >
              {items.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.name}
                    onSelect={cmd.action}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none',
                      'data-[selected=true]:bg-[var(--color-yru-pink)]/10 data-[selected=true]:text-[var(--color-yru-pink)]',
                      'data-[selected=false]:text-foreground data-[selected=false]:hover:bg-muted'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{cmd.name}</span>
                    {cmd.shortcut && (
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
        </Command.List>

        <div className="hidden border-t border-border/60 px-3 py-2 sm:flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 font-mono">↑↓</kbd>
              <span>นำทาง</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 font-mono">↵</kbd>
              <span>เลือก</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 font-mono">esc</kbd>
              <span>ปิด</span>
            </span>
          </div>
          <span>Ctrl+K เพื่อเปิด</span>
        </div>
      </Command.Dialog>
    </>
  );
}