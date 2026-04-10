'use client';

import Link from 'next/link';
import { Users, FileText, MessageSquare, Flag, TrendingUp, TrendingDown } from 'lucide-react';
import type { Stat } from './types';

interface StatConfig {
  title: string;
  key: string;
  icon: typeof Users;
  color: string;
  iconColor: string;
}

interface StatCardsProps {
  stats: Stat[];
}

const statConfig: StatConfig[] = [
  {
    title: 'ผู้ใช้ทั้งหมด',
    key: 'users',
    icon: Users,
    color: 'bg-blue-500/10 border-blue-200 dark:border-blue-900',
    iconColor: 'text-blue-500',
  },
  {
    title: 'กระทู้ทั้งหมด',
    key: 'posts',
    icon: FileText,
    color: 'bg-green-500/10 border-green-200 dark:border-green-900',
    iconColor: 'text-green-500',
  },
  {
    title: 'ความคิดเห็น',
    key: 'comments',
    icon: MessageSquare,
    color: 'bg-purple-500/10 border-purple-200 dark:border-purple-900',
    iconColor: 'text-purple-500',
  },
  {
    title: 'แจ้งปัญหารอดำเนินการ',
    key: 'reports',
    icon: Flag,
    color: 'bg-red-500/10 border-red-200 dark:border-red-900',
    iconColor: 'text-red-500',
  },
];

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      {statConfig.map((config) => {
        const stat = stats.find((s) => s.title === config.title);
        const Icon = config.icon;
        return (
          <Link
            key={config.key}
            href={`/admin/${config.key === 'reports' ? 'reports' : config.key}`}
            className={`group rounded-xl sm:rounded-2xl border p-3 sm:p-5 flex flex-col gap-2 sm:gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 ${config.color} cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                {config.title}
              </span>
              <div className={`p-1 sm:p-1.5 rounded-lg ${config.iconColor} bg-background/50`}>
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl sm:text-3xl font-bold">
                {stat?.value.toLocaleString() || 0}
              </div>
              {stat && stat.trend !== 'neutral' && (
                <div
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {stat.trend === 'up' ? (
                    <TrendingUp className="h-2.5 w-2.5" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5" />
                  )}
                  {Math.abs(stat.change)}%
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}