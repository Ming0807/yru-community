'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, DollarSign, Eye, MousePointer, MousePointerClick, Activity } from 'lucide-react';
import type { RevenueOverview } from '@/types/advertising';

interface Props {
  overview: RevenueOverview;
  comparison: {
    revenueChangePercent: number;
    impressionsChangePercent: number;
    clicksChangePercent: number;
  };
}

export function RevenueOverviewCards({ overview, comparison }: Props) {
  const cards = [
    {
      label: 'รายได้รวม',
      value: formatCurrency(overview.totalRevenue),
      change: comparison.revenueChangePercent,
      icon: DollarSign,
      color: 'text-[var(--color-yru-pink)]',
      bgColor: 'bg-[var(--color-yru-pink)]/10',
    },
    {
      label: 'ยอดแสดงผล',
      value: formatNumber(overview.totalImpressions),
      change: comparison.impressionsChangePercent,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'ยอดคลิก',
      value: formatNumber(overview.totalClicks),
      change: comparison.clicksChangePercent,
      icon: MousePointer,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'CTR เฉลี่ย',
      value: `${overview.averageCtr.toFixed(2)}%`,
      change: 0,
      icon: MousePointerClick,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'CPC เฉลี่ย',
      value: formatCurrency(overview.averageCpc),
      change: 0,
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'แคมเปญที่ใช้งาน',
      value: overview.activeCampaigns.toString(),
      change: 0,
      icon: Activity,
      color: 'text-[var(--color-yru-green-dark)]',
      bgColor: 'bg-[var(--color-yru-green)]/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="card-shadow border-border/40 hover:border-border/60 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-xl ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                {card.change !== 0 && (
                  <TrendBadge change={card.change} />
                )}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TrendBadge({ change }: { change: number }) {
  if (change === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;

  const isPositive = change > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-600 bg-green-500/10' : 'text-red-600 bg-red-500/10';

  return (
    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(change).toFixed(1)}%
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}