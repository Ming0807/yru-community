'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PenSquare, User, Shield, Bell } from 'lucide-react';
import { useUser } from '@/components/UserProvider';

const NAV_ITEMS = [
  { href: '/', label: 'หน้าหลัก', icon: Home },
  { href: '/search', label: 'ค้นหา', icon: Search },
  { href: '/notifications', label: 'แจ้งเตือน', icon: Bell },
  { href: '/post/create', label: 'ตั้งกระทู้', icon: PenSquare },
  { href: '/profile', label: 'โปรไฟล์', icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useUser();
  
  // 1. สร้าง State สำหรับเช็กว่า Component โหลดฝั่ง Client เสร็จหรือยัง
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
                  ? 'text-(--color-yru-pink) font-medium scale-105'
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
        
        {/* 2. เอา isMounted มาดักไว้ตรงนี้! เพื่อให้ Server กับ Client เรนเดอร์ครั้งแรกตรงกัน */}
        {isMounted && user?.role === 'admin' && (
          <Link
            href="/admin"
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs transition-all ${
              pathname.startsWith('/admin')
                ? 'text-[var(--color-yru-pink)] font-medium scale-105'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield
              className={`h-5 w-5 transition-all ${
                pathname.startsWith('/admin') ? 'stroke-[2.5px]' : ''
              }`}
            />
            <span>Admin</span>
          </Link>
        )}
      </div>
    </nav>
  );
}