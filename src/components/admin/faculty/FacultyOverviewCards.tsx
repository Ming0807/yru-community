'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, Target, Award } from 'lucide-react';
import type { FacultyOverview } from '@/types/advertising';

interface Props {
  data: FacultyOverview;
}

export function FacultyOverviewCards({ data }: Props) {
  const cards = [
    {
      label: 'จำนวนคณะ',
      value: data.totalFaculties.toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'ผู้ใช้ทั้งหมด',
      value: data.totalUsers.toLocaleString('th-TH'),
      icon: Users,
      color: 'text-[var(--color-yru-pink)]',
      bgColor: 'bg-[var(--color-yru-pink)]/10',
    },
    {
      label: 'คณะที่ active มากที่สุด',
      value: data.mostActiveFaculty,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'คณะที่คลิกโฆษณามากที่สุด',
      value: data.topConvertingFaculty,
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="card-shadow border-border/40 hover:border-border/60 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-xl ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-foreground truncate" title={card.value}>
                  {card.value}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}