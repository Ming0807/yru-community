'use client';

import Link from 'next/link';
import { Users, FileText, Settings, Eye } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-3 sm:p-5">
      <h2 className="font-semibold text-sm sm:text-lg mb-3 sm:mb-4">ลัดเข้าถึง</h2>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Link
          href="/admin/users"
          className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg sm:rounded-xl border border-border/60 hover:bg-muted hover:border-[var(--color-yru-pink)]/50 transition-all group"
        >
          <Users className="h-5 w-5 sm:h-6 sm:w-6 mb-1.5 text-blue-500 group-hover:text-[var(--color-yru-pink)] transition-colors" />
          <span className="text-xs font-medium">ผู้ใช้</span>
        </Link>
        <Link
          href="/admin/content"
          className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg sm:rounded-xl border border-border/60 hover:bg-muted hover:border-[var(--color-yru-pink)]/50 transition-all group"
        >
          <FileText className="h-5 w-5 sm:h-6 sm:w-6 mb-1.5 text-green-500 group-hover:text-[var(--color-yru-pink)] transition-colors" />
          <span className="text-xs font-medium">เนื้อหา</span>
        </Link>
        <Link
          href="/admin/categories"
          className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg sm:rounded-xl border border-border/60 hover:bg-muted hover:border-[var(--color-yru-pink)]/50 transition-all group"
        >
          <Settings className="h-5 w-5 sm:h-6 sm:w-6 mb-1.5 text-orange-500 group-hover:text-[var(--color-yru-pink)] transition-colors" />
          <span className="text-xs font-medium">หมวดหมู่</span>
        </Link>
        <Link
          href="/admin/analytics"
          className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg sm:rounded-xl border border-border/60 hover:bg-muted hover:border-[var(--color-yru-pink)]/50 transition-all group"
        >
          <Eye className="h-5 w-5 sm:h-6 sm:w-6 mb-1.5 text-purple-500 group-hover:text-[var(--color-yru-pink)] transition-colors" />
          <span className="text-xs font-medium">สถิติ</span>
        </Link>
      </div>
    </div>
  );
}