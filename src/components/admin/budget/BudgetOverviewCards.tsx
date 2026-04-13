'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Wallet, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { BudgetOverview } from '@/types/advertising';

interface Props {
  data: BudgetOverview;
}

export function BudgetOverviewCards({ data }: Props) {
  const cards = [
    {
      label: 'งบประจำวัน',
      value: formatCurrency(data.totalDailyBudget),
      spent: data.totalDailySpent,
      icon: Wallet,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'งบประจำเดือน',
      value: formatCurrency(data.totalMonthlyBudget),
      spent: data.totalMonthlySpent,
      icon: Wallet,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'On Track',
      value: data.campaignsOnTrack.toString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Over Budget',
      value: data.campaignsOverBudget.toString(),
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'หมดงบ',
      value: data.campaignsExhausted.toString(),
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
                {card.spent !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ใช้ไป: {formatCurrency(card.spent)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
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