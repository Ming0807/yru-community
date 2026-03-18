'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PenSquare, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'หน้าหลัก', icon: Home },
  { href: '/search', label: 'ค้นหา', icon: Search },
  { href: '/post/create', label: 'ตั้งกระทู้', icon: PenSquare },
  { href: '/profile', label: 'โปรไฟล์', icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();

  // ซ่อนใน login page
  if (pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sm:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs transition-all ${
                isActive
                  ? 'text-[var(--color-yru-pink)] font-medium scale-105'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-all ${
                  isActive ? 'stroke-[2.5px]' : ''
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
