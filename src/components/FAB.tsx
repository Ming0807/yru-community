'use client';

import Link from 'next/link';
import { PenSquare } from 'lucide-react';

export default function FAB() {
  return (
    <Link
      href="/post/create"
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] text-white shadow-lg shadow-[var(--color-yru-pink)]/30 transition-all hover:scale-110 hover:shadow-xl active:scale-95 sm:hidden"
      aria-label="ตั้งกระทู้ใหม่"
    >
      <PenSquare className="h-6 w-6" />
    </Link>
  );
}
