'use client';

import { FileText, MessageSquare, Users, AlertCircle, Clock } from 'lucide-react';
import type { ActivityItem } from './types';

interface RecentActivityProps {
  items: ActivityItem[];
}

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'post':
      return <FileText className="h-4 w-4 text-green-500" />;
    case 'comment':
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case 'user':
      return <Users className="h-4 w-4 text-blue-500" />;
    case 'report':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-3 sm:p-5 w-full">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="font-semibold text-sm sm:text-lg">กิจกรรมล่าสุด</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          วันนี้
        </span>
      </div>
      <div className="space-y-2 sm:space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-muted-foreground">
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 mb-2 opacity-30" />
            <p className="text-sm">ไม่มีกิจกรรมล่าสุด</p>
          </div>
        ) : (
          items.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-muted/30 transition-colors"
            >
              <div className="mt-0.5 shrink-0">{getActivityIcon(item.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium truncate">{item.title}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {item.user} · {item.time}
                </p>
              </div>
              {item.status && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                    item.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}
                >
                  {item.status === 'pending' ? 'รอ' : 'เสร็จ'}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}