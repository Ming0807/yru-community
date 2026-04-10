'use client';

import Link from 'next/link';
import { AlertCircle, Flag, CheckCircle2 } from 'lucide-react';

interface ReportsAlertProps {
  count: number;
}

export function ReportsAlert({ count }: ReportsAlertProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-3 sm:p-5 w-full min-w-0">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h2 className="font-semibold text-sm sm:text-lg">รายงานที่ต้องตรวจสอบ</h2>
        <Link
          href="/admin/reports"
          className="text-xs text-muted-foreground hover:text-[var(--color-yru-pink)] flex items-center gap-1 transition-colors"
        >
          <span className="hidden sm:inline">ดูทั้งหมด</span>
        </Link>
      </div>
      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 sm:py-6 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 mb-2 text-green-500 opacity-50" />
          <p className="font-medium text-sm sm:text-base">ไม่มีรายงานรอตรวจสอบ</p>
          <p className="text-xs sm:text-sm mt-1">ทุกอย่างเรียบร้อยดี</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-3 sm:py-4">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
            <span className="text-3xl sm:text-4xl font-bold text-red-500">
              {count}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 text-center">
            รายงานที่รอการดำเนินการ
          </p>
          <Link
            href="/admin/reports"
            className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-center transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Flag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            ตรวจสอบทันที
          </Link>
        </div>
      )}
    </div>
  );
}